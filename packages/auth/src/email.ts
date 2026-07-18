import { env } from "@Sentinel360/env/server";

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (env.NODE_ENV === "development") {
    console.log("\n========== EMAIL (DEV) ==========");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.text ?? options.html ?? ""}`);
    console.log("=================================\n");
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = env;

  if (!SMTP_HOST) {
    console.warn("SMTP not configured. Skipping email send.");
    return;
  }

  try {
    // @ts-expect-error - nodemailer is an optional runtime dependency
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ?? 587,
      secure: (SMTP_PORT ?? 587) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: SMTP_FROM ?? "noreply@sentinel360.com",
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
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
