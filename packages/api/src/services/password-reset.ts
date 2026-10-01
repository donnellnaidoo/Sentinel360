import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import { sendPasswordResetCode, supabaseAdmin } from "@Sentinel360/auth";
import { db } from "@Sentinel360/db";
import { user, verification } from "@Sentinel360/db/schema/auth";
import { env } from "@Sentinel360/env/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";

import { recordAuditEvent } from "./audit-log";

const RESET_TTL_MS = 15 * 60 * 1000;
const RESET_REQUESTS_PER_HOUR = 3;
const MAX_VERIFY_ATTEMPTS = 5;

export const GENERIC_RESET_MESSAGE =
  "If an account with that email exists, a reset code has been sent.";

type StoredResetPayload = {
  hash: string;
  attempts: number;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resetIdentifier(email: string): string {
  return `password_reset:${normalizeEmail(email)}`;
}

export function generateResetCode(): string {
  return String(randomInt(100000, 1_000_000));
}

export function hashResetCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function hashesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function serializeResetPayload(payload: StoredResetPayload): string {
  return JSON.stringify(payload);
}

export function parseResetPayload(value: string): StoredResetPayload | null {
  try {
    const parsed = JSON.parse(value) as StoredResetPayload;
    if (typeof parsed.hash !== "string" || typeof parsed.attempts !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function findLocalUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const [found] = await db
    .select()
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1);
  return found ?? null;
}

async function resolveAuthUserId(email: string): Promise<string | null> {
  const local = await findLocalUserByEmail(email);
  if (local) return local.id;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: normalizeEmail(email),
  });
  if (error || !data.user?.id) return null;
  return data.user.id;
}

async function loadActiveReset(email: string) {
  const identifier = resetIdentifier(email);
  const [row] = await db
    .select()
    .from(verification)
    .where(and(eq(verification.identifier, identifier), gt(verification.expiresAt, new Date())))
    .orderBy(desc(verification.createdAt))
    .limit(1);
  return row ?? null;
}

async function consumeReset(email: string) {
  const normalized = normalizeEmail(email);
  await db.delete(verification).where(eq(verification.identifier, resetIdentifier(normalized)));
  await db.delete(verification).where(eq(verification.identifier, resetTicketIdentifier(normalized)));
}

function resetTicketIdentifier(email: string): string {
  return `password_reset_ticket:${normalizeEmail(email)}`;
}

type RecoveryEmailResult = "sent" | "rate_limited" | "failed";

async function sendSupabaseRecoveryEmail(email: string): Promise<RecoveryEmailResult> {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  const recoverResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });
  if (recoverResponse.ok) {
    console.log("[auth] Supabase recovery OTP email dispatched");
    return "sent";
  }

  const body = await recoverResponse.text();
  if (recoverResponse.status === 429) {
    console.warn("[auth] Supabase email rate limit reached. Use the last code in the inbox.");
    return "rate_limited";
  }

  console.warn("[auth] Supabase recovery email not sent", recoverResponse.status, body.slice(0, 200));
  return "failed";
}

async function verifySupabaseOtp(email: string, code: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  for (const type of ["recovery", "email", "magiclink"] as const) {
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email: normalized,
      token: code,
      type,
    });
    if (!error && data.user?.id) return data.user.id;
  }
  return null;
}

async function storeResetTicket(email: string, userId: string) {
  const identifier = resetTicketIdentifier(email);
  const now = new Date();
  await db.delete(verification).where(eq(verification.identifier, identifier));
  await db.insert(verification).values({
    id: randomUUID(),
    identifier,
    value: userId,
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
    createdAt: now,
    updatedAt: now,
  });
}

async function loadResetTicket(email: string) {
  const [row] = await db
    .select()
    .from(verification)
    .where(
      and(eq(verification.identifier, resetTicketIdentifier(email)), gt(verification.expiresAt, new Date())),
    )
    .limit(1);
  return row ?? null;
}

async function bumpAttempts(row: typeof verification.$inferSelect, attempts: number) {
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    await db.delete(verification).where(eq(verification.id, row.id));
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many incorrect codes. Request a new reset code.",
    });
  }

  const payload = parseResetPayload(row.value);
  if (!payload) {
    await db.delete(verification).where(eq(verification.id, row.id));
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code." });
  }

  await db
    .update(verification)
    .set({
      value: serializeResetPayload({ ...payload, attempts }),
      updatedAt: new Date(),
    })
    .where(eq(verification.id, row.id));
}

export async function requestPasswordReset(email: string) {
  const normalized = normalizeEmail(email);
  const identifier = resetIdentifier(normalized);
  const authUserId = await resolveAuthUserId(normalized);

  if (!authUserId) {
    return { message: GENERIC_RESET_MESSAGE, rateLimited: false };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ id: verification.id, createdAt: verification.createdAt })
    .from(verification)
    .where(eq(verification.identifier, identifier));
  const recentCount = recent.filter((row) => row.createdAt >= oneHourAgo).length;
  if (recentCount >= RESET_REQUESTS_PER_HOUR) {
    return { message: GENERIC_RESET_MESSAGE, rateLimited: true };
  }

  const sendResult = await sendSupabaseRecoveryEmail(normalized);
  if (sendResult === "sent") {
    await db.insert(verification).values({
      id: randomUUID(),
      identifier,
      value: serializeResetPayload({ hash: "supabase-email", attempts: 0 }),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { message: GENERIC_RESET_MESSAGE, rateLimited: false };
  }
  if (sendResult === "rate_limited") {
    return {
      message:
        "Check your inbox for the latest 6-digit code. A new email could not be sent yet because too many reset emails were requested. Wait a few minutes and try again, or use the last code you received.",
      rateLimited: true,
    };
  }

  const code = generateResetCode();
  const now = new Date();

  await db.insert(verification).values({
    id: randomUUID(),
    identifier,
    value: serializeResetPayload({ hash: hashResetCode(code), attempts: 0 }),
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
    createdAt: now,
    updatedAt: now,
  });

  await sendPasswordResetCode(normalized, code);

  return { message: GENERIC_RESET_MESSAGE, rateLimited: false };
}

export async function verifyPasswordResetCode(email: string, code: string) {
  const row = await loadActiveReset(email);
  const payload = row ? parseResetPayload(row.value) : null;
  if (payload && hashesMatch(payload.hash, hashResetCode(code))) {
    return { valid: true as const };
  }

  const supabaseUserId = await verifySupabaseOtp(email, code);
  if (supabaseUserId) {
    await storeResetTicket(email, supabaseUserId);
    return { valid: true as const };
  }

  if (row) {
    await bumpAttempts(row, (payload?.attempts ?? 0) + 1);
  }
  throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code." });
}

async function applyNewPassword(userId: string, password: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not update password. Please try again.",
    });
  }

  try {
    await supabaseAdmin.auth.admin.signOut(userId, "global");
  } catch {
    // Older GoTrue builds may not expose admin.signOut; password is still updated.
  }
}

export async function resetPasswordWithCode(email: string, code: string, password: string) {
  const row = await loadActiveReset(email);
  const payload = row ? parseResetPayload(row.value) : null;
  const ourCodeValid = !!(payload && hashesMatch(payload.hash, hashResetCode(code)));

  let authUserId: string | null = null;
  if (ourCodeValid) {
    authUserId = await resolveAuthUserId(email);
  } else {
    const ticket = await loadResetTicket(email);
    authUserId = ticket?.value ?? (await verifySupabaseOtp(email, code));
  }

  if (!authUserId) {
    if (row) {
      await bumpAttempts(row, (payload?.attempts ?? 0) + 1);
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired code." });
  }

  await applyNewPassword(authUserId, password);
  await consumeReset(email);

  await recordAuditEvent({
    eventType: "user.password_reset",
    domain: "auth",
    actorId: authUserId,
    targetEntityType: "user",
    targetEntityId: authUserId,
    action: "PASSWORD_RESET",
  });

  return { message: "Password reset successful. Please sign in with your new password." };
}

export async function changePassword(userId: string, userEmail: string, currentPassword: string, newPassword: string) {
  const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  });
  if (verifyError) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
  }

  await applyNewPassword(userId, newPassword);

  await recordAuditEvent({
    eventType: "user.password_changed",
    domain: "auth",
    actorId: userId,
    targetEntityType: "user",
    targetEntityId: userId,
    action: "PASSWORD_CHANGED",
  });

  return { message: "Password updated. Please sign in with your new password." };
}
