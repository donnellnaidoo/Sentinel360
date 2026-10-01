import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
const envText = readFileSync(envPath, "utf8");
const env: Record<string, string> = {};
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL ?? "").hostname.split(".")[0];
const token = env.ACCESS_TOKEN_SECRET;
if (!projectRef || !token) {
  console.error("Missing project ref or ACCESS_TOKEN_SECRET");
  process.exit(1);
}

const recoveryHtml = readFileSync(
  resolve(process.cwd(), "packages/db/supabase/templates/recovery.html"),
  "utf8",
);
const magicLinkHtml = readFileSync(
  resolve(process.cwd(), "packages/db/supabase/templates/magic_link.html"),
  "utf8",
);

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_otp_length: 6,
    mailer_subjects_recovery: "Your Sentinel360 password reset code",
    mailer_templates_recovery_content: recoveryHtml,
    mailer_subjects_magic_link: "Your Sentinel360 confirmation code",
    mailer_templates_magic_link_content: magicLinkHtml,
  }),
});

console.log("auth template update status", res.status);
if (!res.ok) {
  const body = await res.text();
  console.error("update failed:", body.slice(0, 400));
  process.exit(1);
}

const verify = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
const config = (await verify.json()) as Record<string, unknown>;
console.log("mailer_otp_length", config.mailer_otp_length);
