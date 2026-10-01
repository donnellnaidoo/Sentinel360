import { env } from "@Sentinel360/env/server";

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

function logDevEmail(options: SendEmailOptions) {
  if (env.NODE_ENV === "production") return;
  console.log("\n========== EMAIL (DEV) ==========");
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Body: ${options.text ?? options.html ?? ""}`);
  console.log("=================================\n");
}

async function sendWithResend(options: SendEmailOptions): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = env.SMTP_FROM ?? "Sentinel360 <noreply@sentinel360.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    }),
  });

  if (!response.ok) {
    console.error("Resend email failed:", response.status, await response.text());
    return false;
  }
  return true;
}

async function sendWithSmtp(options: SendEmailOptions): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = env;
  if (!SMTP_HOST) return false;

  try {
    // @ts-expect-error - nodemailer is an optional runtime dependency
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ?? 587,
      secure: (SMTP_PORT ?? 587) === 465,
      auth: SMTP_USER
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
    });

    await transporter.sendMail({
      from: SMTP_FROM ?? "noreply@sentinel360.com",
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send SMTP email:", error);
    return false;
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  logDevEmail(options);

  try {
    if (await sendWithResend(options)) return true;
    if (await sendWithSmtp(options)) return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }

  if (env.NODE_ENV === "production") {
    console.warn("SMTP/Resend not configured. Skipping email send.");
  }
  return false;
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${env.CORS_ORIGIN}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your email - Sentinel360",
    text: `Please verify your email by clicking: ${url}`,
    html: `<p>Please verify your email by clicking: <a href="${url}">Verify Email</a></p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${env.CORS_ORIGIN}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset your password - Sentinel360",
    text: `Reset your password by clicking: ${url}`,
    html: `<p>Reset your password by clicking: <a href="${url}">Reset Password</a></p>`,
  });
}

export async function sendPasswordResetCode(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: "Your Sentinel360 password reset code",
    text: `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your password reset code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
<p>This code expires in 15 minutes. If you did not request a password reset, you can ignore this email.</p>`,
  });
}
