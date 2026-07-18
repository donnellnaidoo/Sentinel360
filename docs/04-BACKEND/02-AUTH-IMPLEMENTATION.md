# 02 — Authentication Implementation

> **Sentinel360 Backend — Authentication & Authorization System**
> Version: 1.0 | Last Updated: June 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [JWT Access + Refresh Token Implementation](#2-jwt-access--refresh-token-implementation)
3. [Email Verification Flow](#3-email-verification-flow)
4. [Password Reset Flow](#4-password-reset-flow)
5. [Two-Factor Authentication (2FA)](#5-two-factor-authentication-2fa)
6. [RBAC Middleware Implementation](#6-rbac-middleware-implementation)
7. [Session Management](#7-session-management)
8. [Security Hardening](#8-security-hardening)

---

## 1. Architecture Overview

### Auth Flow Diagram

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│  Client  │────▶│  Rate Limiter│────▶│  Auth    │────▶│  Service  │────▶│  Database │
│ (Web/App)│     │  Middleware  │     │Middleware│     │  Layer    │     │(Postgres) │
└─────────┘     └─────────────┘     └──────────┘     └──────────┘     └───────────┘
     │                                  │                                  │
     │                                  │                                  │
     ▼                                  ▼                                  ▼
┌─────────┐                     ┌──────────────┐                  ┌───────────┐
│  Redis   │                     │  JWT Module   │                  │  Refresh  │
│ (Blacklist)                   │  (sign/verify)│                  │  Tokens   │
└─────────┘                     └──────────────┘                  │  Table    │
                                                                  └───────────┘
```

### Token Strategy Summary

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| **Access Token** | 15 minutes | Memory (client) | API authentication |
| **Refresh Token** | 7 days | HTTP-Only Cookie + DB | Obtain new access tokens |
| **Email Verification Token** | 24 hours | JWT (in email link) | Verify email ownership |
| **Password Reset Token** | 1 hour | JWT (in email link) | Reset forgotten password |
| **2FA OTP** | 30 seconds | TOTP (generated) | Second factor verification |

---

## 2. JWT Access + Refresh Token Implementation

### 2.1 Token Service

```typescript
// src/services/auth/token.service.ts

import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "@config/env";
import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";
import { TokenExpiredError, InvalidTokenError } from "@errors/auth-errors";

export interface AccessTokenPayload {
  sub: string;        // User ID
  role: string;       // User role
  type: "access";
  jti: string;        // Token ID (for revocation)
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
  jti: string;
  parentJti?: string; // For token rotation tracking
  iat: number;
  exp: number;
}

export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;
  private readonly issuer: string;

  constructor() {
    this.accessSecret = config.JWT_ACCESS_SECRET;
    this.refreshSecret = config.JWT_REFRESH_SECRET;
    this.accessExpiry = config.JWT_ACCESS_EXPIRY;  // "15m"
    this.refreshExpiry = config.JWT_REFRESH_EXPIRY; // "7d"
    this.issuer = config.JWT_ISSUER;
  }

  /**
   * Generate an access token (short-lived, 15 min)
   */
  generateAccessToken(userId: string, role: string): string {
    const jti = uuidv4();
    return jwt.sign(
      { sub: userId, role, type: "access", jti },
      this.accessSecret,
      { expiresIn: this.accessExpiry, issuer: this.issuer },
    );
  }

  /**
   * Generate a refresh token (long-lived, 7 days)
   * Stores hashed version in database for rotation
   */
  async generateRefreshToken(
    userId: string,
    parentTokenId?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const jti = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = jwt.sign(
      { sub: userId, type: "refresh", jti, parentJti: parentTokenId },
      this.refreshSecret,
      { expiresIn: this.refreshExpiry, issuer: this.issuer },
    );

    // Store hashed token in database (never store raw JWT)
    const tokenHash = this.hashToken(token);
    await getPrisma().refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        expiresAt,
        replacedBy: parentTokenId,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Verify an access token and return payload
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        issuer: this.issuer,
      }) as AccessTokenPayload;

      if (payload.type !== "access") {
        throw new InvalidTokenError("Invalid token type");
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError("Access token expired");
      }
      throw new InvalidTokenError("Invalid access token");
    }
  }

  /**
   * Verify a refresh token and return payload
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = jwt.verify(token, this.refreshSecret, {
        issuer: this.issuer,
      }) as RefreshTokenPayload;

      if (payload.type !== "refresh") {
        throw new InvalidTokenError("Invalid token type");
      }

      // Check if token exists in database (not revoked)
      const tokenHash = this.hashToken(token);
      const stored = await getPrisma().refreshToken.findUnique({
        where: { token: tokenHash },
      });

      if (!stored) {
        throw new InvalidTokenError("Refresh token not found");
      }

      if (stored.revokedAt) {
        // Token was revoked — possible token theft
        // Revoke entire token family
        await this.revokeTokenFamily(stored.userId, stored.id);
        throw new InvalidTokenError("Refresh token revoked");
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError("Refresh token expired");
      }
      if (
        error instanceof InvalidTokenError ||
        error instanceof TokenExpiredError
      ) {
        throw error;
      }
      throw new InvalidTokenError("Invalid refresh token");
    }
  }

  /**
   * Refresh token rotation: issue new tokens, revoke old ones
   */
  async rotateRefreshToken(oldToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const payload = await this.verifyRefreshToken(oldToken);

    // Generate new tokens
    const accessToken = this.generateAccessToken(payload.sub, payload.role);
    const { token: newRefreshToken, expiresAt } =
      await this.generateRefreshToken(payload.sub, payload.jti);

    // Revoke old refresh token
    const tokenHash = this.hashToken(oldToken);
    await getPrisma().refreshToken.update({
      where: { token: tokenHash },
      data: { revokedAt: new Date(), replacedBy: payload.jti },
    });

    return { accessToken, refreshToken: newRefreshToken, expiresAt };
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await getPrisma().refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke token family (detected token theft)
   */
  private async revokeTokenFamily(
    userId: string,
    tokenId: string,
  ): Promise<void> {
    // Revoke all tokens for this user (family rotation attack detected)
    await getPrisma().refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        metadata: {
          reason: "TOKEN_THEFT_DETECTED",
          familyHeadRevoked: tokenId,
          revokedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Hash a token for database storage
   */
  private hashToken(token: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export const tokenService = new TokenService();
```

### 2.2 Auth Controller

```typescript
// src/controllers/auth/auth.controller.ts

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "@services/auth/auth.service";
import { tokenService } from "@services/auth/token.service";
import { asyncHandler } from "@utils/async-handler";
import { AppError } from "@errors/app-error";
import { config } from "@config/env";

const authService = new AuthService();

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  role: z.enum(["COMMUNITY", "SECURITY"]).optional().default("COMMUNITY"),
});

export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);

    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      data: {
        user: result.user,
        requiresEmailVerification: true,
      },
    });
  });

  /**
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const data = loginSchema.parse(req.body);

    const result = await authService.login(data.email, data.password, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);

    // If 2FA is enabled, require OTP
    if (result.requiresTwoFactor) {
      return res.json({
        success: true,
        message: "2FA verification required",
        data: {
          requiresTwoFactor: true,
          sessionId: result.sessionId,
        },
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: 900, // 15 minutes in seconds
      },
    });
  });

  /**
   * POST /api/v1/auth/refresh
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    const oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      throw new AppError("Refresh token not provided", 401, "NO_REFRESH_TOKEN");
    }

    const tokens = await tokenService.rotateRefreshToken(oldRefreshToken);

    this.setRefreshTokenCookie(res, tokens.refreshToken, tokens.expiresAt);

    // Clear old cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: 900,
      },
    });
  });

  /**
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });

  /**
   * POST /api/v1/auth/verify-email
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = z
      .object({ token: z.string().min(1) })
      .parse(req.body);

    await authService.verifyEmail(token);

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  });

  /**
   * POST /api/v1/auth/forgot-password
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // Always return success to prevent email enumeration
    await authService.sendPasswordResetEmail(email);

    res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  });

  /**
   * POST /api/v1/auth/reset-password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = z
      .object({
        token: z.string().min(1),
        password: z
          .string()
          .min(8)
          .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          ),
      })
      .parse(req.body);

    await authService.resetPassword(token, password);

    res.json({
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    });
  });

  /**
   * POST /api/v1/auth/verify-2fa
   */
  verifyTwoFactor = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, otp } = z
      .object({
        sessionId: z.string().uuid(),
        otp: z.string().length(6),
      })
      .parse(req.body);

    const result = await authService.verifyTwoFactor(sessionId, otp);

    this.setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);

    res.json({
      success: true,
      message: "2FA verification successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: 900,
      },
    });
  });

  private setRefreshTokenCookie(
    res: Response,
    token: string,
    expiresAt: Date,
  ): void {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
      expires: expiresAt,
    });
  }
}
```

### 2.3 Auth Routes

```typescript
// src/routes/auth.routes.ts

import { Router } from "express";
import { AuthController } from "@controllers/auth/auth.controller";
import { rateLimitMiddleware } from "@middleware/rate-limit";
import { validateBody } from "@middleware/validate";

const router = Router();
const controller = new AuthController();

// Rate limiting: stricter for auth endpoints
const authLimiter = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: "Too many authentication attempts. Please try again later.",
});

// Public routes (no auth required)
router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.post("/verify-email", controller.verifyEmail);
router.post("/forgot-password", authLimiter, controller.forgotPassword);
router.post("/reset-password", authLimiter, controller.resetPassword);
router.post("/verify-2fa", authLimiter, controller.verifyTwoFactor);

export default router;
```

---

## 3. Email Verification Flow

### 3.1 Flow Diagram

```
User                    Backend                 Email Service           Database
 │                        │                         │                     │
 ├─ POST /register ──────▶│                         │                     │
 │                        ├─ Create user ────────────┼─────▶ PENDING ─────┤
 │                        ├─ Generate verify token ──┤                     │
 │                        ├─ Send verification email─▶│                     │
 │◄─── "Check email" ─────┤                         │                     │
 │                        │                         │                     │
 │  (User clicks link)    │                         │                     │
 ├─ GET /verify-email ────▶│                         │                     │
 │  ?token=xxx            ├─ Verify JWT ─────────────┤                     │
 │                        ├─ Update user ────────────┼─────▶ ACTIVE ──────┤
 │◄─── "Email verified" ──┤                         │                     │
 │                        │                         │                     │
```

### 3.2 Verification Token

```typescript
// src/services/auth/verification.service.ts

import jwt from "jsonwebtoken";
import { config } from "@config/env";
import { getPrisma } from "@config/database";
import { AppError } from "@errors/app-error";

interface EmailVerificationPayload {
  sub: string; // User ID
  email: string;
  type: "email_verification";
  iat: number;
  exp: number;
}

export class VerificationService {
  private readonly secret: string;

  constructor() {
    // Use a separate secret for email tokens
    this.secret = config.JWT_ACCESS_SECRET + ":email-verify";
  }

  /**
   * Generate email verification token (24 hours expiry)
   */
  generateVerificationToken(userId: string, email: string): string {
    return jwt.sign(
      { sub: userId, email, type: "email_verification" },
      this.secret,
      { expiresIn: "24h" },
    );
  }

  /**
   * Verify email token and activate user
   */
  async verifyEmail(token: string): Promise<void> {
    let payload: EmailVerificationPayload;

    try {
      payload = jwt.verify(token, this.secret) as EmailVerificationPayload;
    } catch {
      throw new AppError(
        "Invalid or expired verification token",
        400,
        "INVALID_VERIFICATION_TOKEN",
      );
    }

    if (payload.type !== "email_verification") {
      throw new AppError("Invalid token type", 400, "INVALID_TOKEN_TYPE");
    }

    const user = await getPrisma().user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.emailVerifiedAt) {
      throw new AppError("Email already verified", 400, "ALREADY_VERIFIED");
    }

    if (user.email !== payload.email) {
      throw new AppError("Email mismatch", 400, "EMAIL_MISMATCH");
    }

    await getPrisma().user.update({
      where: { id: payload.sub },
      data: {
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
      },
    });
  }

  /**
   * Resend verification email
   */
  async resendVerification(userId: string): Promise<string> {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.emailVerifiedAt) {
      throw new AppError("Email already verified", 400, "ALREADY_VERIFIED");
    }

    return this.generateVerificationToken(user.id, user.email);
  }
}

export const verificationService = new VerificationService();
```

### 3.3 Email Templates

```handlebars
{{! src/services/email/templates/email-verification.hbs }}
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', sans-serif; background: #f5f5f5; }
    .container { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; padding: 40px; }
    .button { display: inline-block; background: #1a56db; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Sentinel360</h1>
    <p>Hi {{name}},</p>
    <p>Please verify your email address to activate your account.</p>
    <a href="{{verificationUrl}}" class="button">Verify Email</a>
    <p style="margin-top: 32px; color: #666; font-size: 14px;">
      This link expires in 24 hours.<br>
      If you didn't create an account, ignore this email.
    </p>
  </div>
</body>
</html>
```

---

## 4. Password Reset Flow

### 4.1 Reset Token Service

```typescript
// src/services/auth/password-reset.service.ts

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "@config/env";
import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";
import { AppError } from "@errors/app-error";

interface PasswordResetPayload {
  sub: string;  // User ID
  jti: string;  // Token ID (prevent replay)
  type: "password_reset";
  iat: number;
  exp: number;
}

export class PasswordResetService {
  private readonly secret: string = config.JWT_ACCESS_SECRET + ":password-reset";
  private readonly tokenExpiry = "1h";

  /**
   * Generate password reset token
   */
  async generateResetToken(email: string): Promise<string | null> {
    // Prevent email enumeration: always return null
    const user = await getPrisma().user.findUnique({
      where: { email },
    });

    if (!user || !user.emailVerifiedAt) {
      return null; // Don't reveal whether account exists
    }

    const jti = crypto.randomUUID();

    // Store token hash in Redis for single-use enforcement
    const token = jwt.sign(
      { sub: user.id, jti, type: "password_reset" },
      this.secret,
      { expiresIn: this.tokenExpiry },
    );

    const tokenHash = this.hashToken(token);
    await getRedis().setex(
      `password-reset:${tokenHash}`,
      3600, // 1 hour
      user.id,
    );

    return token;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: PasswordResetPayload;

    try {
      payload = jwt.verify(token, this.secret) as PasswordResetPayload;
    } catch {
      throw new AppError(
        "Invalid or expired reset token",
        400,
        "INVALID_RESET_TOKEN",
      );
    }

    // Check if token was already used
    const tokenHash = this.hashToken(token);
    const used = await getRedis().get(`password-reset:used:${tokenHash}`);
    if (used) {
      throw new AppError(
        "Reset token has already been used",
        400,
        "TOKEN_ALREADY_USED",
      );
    }

    // Verify token exists in Redis
    const userId = await getRedis().get(`password-reset:${tokenHash}`);
    if (!userId) {
      throw new AppError(
        "Invalid or expired reset token",
        400,
        "INVALID_RESET_TOKEN",
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_SALT_ROUNDS);

    // Update password
    await getPrisma().user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0, // Reset lockout
        lockedUntil: null,
      },
    });

    // Mark token as used
    await getRedis().setex(`password-reset:used:${tokenHash}`, 86400, "1");
    await getRedis().del(`password-reset:${tokenHash}`);

    // Revoke all existing refresh tokens (force re-login)
    await getPrisma().refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export const passwordResetService = new PasswordResetService();
```

---

## 5. Two-Factor Authentication (2FA)

### 5.1 TOTP Implementation

```typescript
// src/services/auth/two-factor.service.ts

import { authenticator } from "otplib";
import QRCode from "qrcode";
import { config } from "@config/env";
import { getPrisma } from "@config/database";
import { getRedis } from "@config/redis";
import { AppError } from "@errors/app-error";

export class TwoFactorService {
  private readonly issuer: string;

  constructor() {
    this.issuer = config.OTP_ISSUER;
    authenticator.options = {
      step: 30,       // 30-second window
      window: 1,      // Allow 1 step before/after for clock drift
      digits: 6,      // 6-digit OTP
    };
  }

  /**
   * Generate 2FA secret and QR code for initial setup
   */
  async setupTwoFactor(
    userId: string,
    email: string,
  ): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri(email, this.issuer, secret);

    const qrCodeUrl = await QRCode.toDataURL(uri);

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase(),
    );

    // Store encrypted secret and hashed backup codes
    const encryptedSecret = this.encryptSecret(secret);
    const hashedBackupCodes = backupCodes.map((code) =>
      crypto.createHash("sha256").update(code).digest("hex"),
    );

    await getPrisma().user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: false, // Not yet confirmed
        metadata: {
          backupCodes: hashedBackupCodes,
          setupStartedAt: new Date().toISOString(),
        },
      },
    });

    return { secret, qrCodeUrl, backupCodes };
  }

  /**
   * Verify and enable 2FA after confirming setup
   */
  async confirmTwoFactor(
    userId: string,
    otp: string,
  ): Promise<void> {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
    });

    if (!user?.twoFactorSecret) {
      throw new AppError("2FA not set up", 400, "2FA_NOT_SETUP");
    }

    const secret = this.decryptSecret(user.twoFactorSecret);
    const isValid = authenticator.verify({ token: otp, secret });

    if (!isValid) {
      throw new AppError("Invalid OTP", 400, "INVALID_OTP");
    }

    await getPrisma().user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  /**
   * Verify 2FA OTP during login
   */
  verifyOTP(secret: string, otp: string): boolean {
    return authenticator.verify({ token: otp, secret });
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
    });

    if (!user?.metadata || !Array.isArray(user.metadata.backupCodes)) {
      return false;
    }

    const hashedCode = crypto
      .createHash("sha256")
      .update(code.toUpperCase())
      .digest("hex");

    const codes: string[] = user.metadata.backupCodes;
    const index = codes.indexOf(hashedCode);

    if (index === -1) {
      return false;
    }

    // Remove used backup code
    codes.splice(index, 1);
    await getPrisma().user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...(user.metadata as Record<string, unknown>),
          backupCodes: codes,
        },
      },
    });

    return true;
  }

  /**
   * Disable 2FA
   */
  async disableTwoFactor(userId: string, password: string): Promise<void> {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError("Invalid password", 401, "INVALID_PASSWORD");
    }

    await getPrisma().user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        metadata: {
          ...(user.metadata as Record<string, unknown>),
          backupCodes: [],
        },
      },
    });
  }

  private encryptSecret(secret: string): string {
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      config.OTP_ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32),
      crypto.randomBytes(12),
    );
    const encrypted = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${encrypted.toString("base64")}.${authTag.toString("base64")}`;
  }

  private decryptSecret(encrypted: string): string {
    const [encData, authTag] = encrypted.split(".");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      config.OTP_ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32),
      crypto.randomBytes(12),
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encData, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}

export const twoFactorService = new TwoFactorService();
```

### 5.2 2FA Login Flow

```
User                    Backend                             2FA Authenticator
 │                        │                                      │
 ├─ POST /login ──────────▶                                      │
 │   (email + password)   │                                      │
 │◄── "2FA required" ─────┤                                      │
 │                        │                                      │
 ├─ POST /verify-2fa ─────▶                                      │
 │   (sessionId + otp)    ├─ Verify session in Redis ────────┤   │
 │                        ├─ Verify OTP ──────────────────────┼───┤
 │◄── "Access token" ─────┤                                      │
 │                        │                                      │
```

---

## 6. RBAC Middleware Implementation

### 6.1 Auth Middleware

```typescript
// src/middleware/auth.ts

import { Request, Response, NextFunction } from "express";
import { tokenService } from "@services/auth/token.service";
import { getRedis } from "@config/redis";
import { AppError } from "@errors/app-error";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        tokenId: string;
      };
    }
  }
}

/**
 * Required authentication — blocks unauthenticated requests
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    throw new AppError(
      "Authentication required",
      401,
      "AUTH_REQUIRED",
    );
  }

  const payload = tokenService.verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    role: payload.role,
    tokenId: payload.jti,
  };

  next();
}

/**
 * Optional authentication — attaches user if token present, continues regardless
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        role: payload.role,
        tokenId: payload.jti,
      };
    } catch {
      // Token invalid — continue without user
    }
  }

  next();
}

/**
 * Role-based access control
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(
        "Authentication required",
        401,
        "AUTH_REQUIRED",
      );
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        "Insufficient permissions",
        403,
        "FORBIDDEN",
      );
    }

    next();
  };
}

/**
 * Permission-based access control (finer-grained than roles)
 */
export function requirePermission(permission: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(
        "Authentication required",
        401,
        "AUTH_REQUIRED",
      );
    }

    const hasPermission = await checkPermission(req.user.role, permission);
    if (!hasPermission) {
      throw new AppError(
        "Insufficient permissions",
        403,
        "FORBIDDEN",
      );
    }

    next();
  };
}

/**
 * Extract JWT from Authorization header or cookie
 */
function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Try cookie (for refresh token flows)
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

/**
 * Check if a role has a specific permission
 */
async function checkPermission(
  role: string,
  permission: string,
): Promise<boolean> {
  const permissions = await getRolePermissions(role);
  return permissions.includes(permission) || permissions.includes("*");
}

/**
 * Role-to-permission mapping (could be stored in DB for dynamic permissions)
 */
async function getRolePermissions(role: string): Promise<string[]> {
  const rolePermissions: Record<string, string[]> = {
    SUPER_ADMIN: ["*"], // Super Admin has all permissions

    ADMIN: [
      "users:read", "users:create", "users:update", "users:delete",
      "cases:read", "cases:create", "cases:update", "cases:delete",
      "profiles:read", "profiles:create", "profiles:update", "profiles:delete",
      "evidence:read", "evidence:create", "evidence:update",
      "alerts:create", "alerts:send",
      "audit:read",
    ],

    LAW_ENFORCEMENT: [
      "cases:read", "cases:create", "cases:update",
      "profiles:read",
      "evidence:read", "evidence:create", "evidence:update",
      "sightings:read", "sightings:update",
      "alerts:read",
    ],

    SECURITY: [
      "cases:read",
      "profiles:read",
      "evidence:read", "evidence:create",
      "sightings:create", "sightings:read",
      "alerts:read",
    ],

    COMMUNITY: [
      "profiles:read",
      "sightings:create",
      "alerts:read",
    ],
  };

  return rolePermissions[role] ?? [];
}

// Owner check middleware (users can only access their own resources)
export function requireOwnership(resourceParam: string = "userId") {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    }

    // Super Admin bypasses ownership check
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    const resourceId = req.params[resourceParam];
    if (resourceId && resourceId !== req.user.id) {
      throw new AppError(
        "You can only access your own resources",
        403,
        "NOT_OWNER",
      );
    }

    next();
  };
}
```

### 6.2 Permission Matrix

| Resource \ Role | Community | Security | Law Enforcement | Admin | Super Admin |
|----------------|-----------|----------|-----------------|-------|-------------|
| **Public Wanted Feed** | Read | Read | Read | Read | Read |
| **Full Wanted Feed** | - | Read | Read | Read | Read |
| **Cases** | - | Read | CRUD | CRUD | CRUD |
| **Evidence** | - | Create, Read | Create, Read, Update* | Create, Read, Update* | Full |
| **Criminal Profiles** | Read (public) | Read | Read | CRUD | Full (incl. delete) |
| **Sightings** | Create | Create, Read | Read, Verify | Read, Verify | Full |
| **Alerts** | Read (targeted) | Read | Read | Create, Send | Full |
| **Users** | - | - | - | Manage | Full (incl. delete) |
| **Audit Logs** | - | - | - | Read | Read, Export |
| **AI Analysis** | - | Trigger | Trigger | Trigger | Manage |
| **System Config** | - | - | - | - | Full |

### 6.3 Middleware Composition Examples

```typescript
// Public route (no auth needed)
router.get("/wanted", controller.listWantedFeed);

// Authenticated users only
router.get("/cases", requireAuth, controller.listCases);

// Specific role required
router.post("/cases", requireAuth, requireRole("ADMIN", "LAW_ENFORCEMENT"), controller.createCase);

// Multiple permissions
router.patch("/evidence/:id/verify",
  requireAuth,
  requireRole("ADMIN", "LAW_ENFORCEMENT"),
  requirePermission("evidence:update"),
  controller.verifyEvidence,
);

// Ownership + role
router.get("/users/:userId/sightings",
  requireAuth,
  requireOwnership("userId"),
  controller.listUserSightings,
);

// Super Admin only
router.delete("/profiles/:id/permanent",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  controller.permanentDeleteProfile,
);
```

---

## 7. Session Management

### 7.1 Session Store (Redis)

```typescript
// src/config/session.ts

import { getRedis } from "@config/redis";
import { config } from "@config/env";

interface SessionData {
  userId: string;
  role: string;
  ip: string;
  userAgent: string;
  loginAt: Date;
  lastActivity: Date;
  twoFactorVerified: boolean;
}

export class SessionManager {
  private readonly prefix = "session:";
  private readonly ttl = config.SESSION_EXPIRY_HOURS * 3600; // seconds

  /**
   * Create a new session
   */
  async createSession(
    sessionId: string,
    data: Omit<SessionData, "lastActivity" | "loginAt">,
  ): Promise<void> {
    const session: SessionData = {
      ...data,
      loginAt: new Date(),
      lastActivity: new Date(),
    };

    await getRedis().setex(
      `${this.prefix}${sessionId}`,
      this.ttl,
      JSON.stringify(session),
    );
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await getRedis().get(`${this.prefix}${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update session activity timestamp
   */
  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date();
      await getRedis().setex(
        `${this.prefix}${sessionId}`,
        this.ttl,
        JSON.stringify(session),
      );
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    await getRedis().del(`${this.prefix}${sessionId}`);
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const keys = await getRedis().keys(`${this.prefix}*`);
    const pipeline = getRedis().pipeline();

    for (const key of keys) {
      const session = await getRedis().get(key);
      if (session) {
        const data: SessionData = JSON.parse(session);
        if (data.userId === userId) {
          pipeline.del(key);
        }
      }
    }

    await pipeline.exec();
  }
}

export const sessionManager = new SessionManager();
```

### 7.2 Session Security Middleware

```typescript
// src/middleware/session-security.ts

import { Request, Response, NextFunction } from "express";
import { sessionManager } from "@config/session";
import { AppError } from "@errors/app-error";

/**
 * Track and validate user sessions
 */
export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const sessionId = req.headers["x-session-id"] as string;

  if (sessionId && req.user) {
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      throw new AppError("Session expired", 401, "SESSION_EXPIRED");
    }

    // Verify session belongs to user
    if (session.userId !== req.user.id) {
      throw new AppError("Invalid session", 401, "INVALID_SESSION");
    }

    // Verify IP address hasn't changed dramatically
    if (
      session.ip !== req.ip &&
      req.user.role !== "SUPER_ADMIN"
    ) {
      // IP changed — flag as suspicious but don't block
      console.warn(
        `IP change detected for user ${req.user.id}: ${session.ip} -> ${req.ip}`,
      );
    }

    // Update last activity
    await sessionManager.touchSession(sessionId);
  }

  next();
}
```

---

## 8. Security Hardening

### 8.1 Security Headers

```typescript
// src/middleware/security.ts

import helmet from "helmet";
import { config } from "@config/env";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", config.AI_SERVICE_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});
```

### 8.2 Rate Limiting

```typescript
// src/middleware/rate-limit.ts

import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedis } from "@config/redis";
import { config } from "@config/env";

export function rateLimitMiddleware(options?: Partial<rateLimit.Options>) {
  return rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => getRedis().call(...args),
    }),
    message: {
      success: false,
      error: "Too many requests. Please try again later.",
    },
    ...options,
  });
}

// Specific rate limiters
export const authRateLimit = rateLimitMiddleware({ max: 20 });
export const apiRateLimit = rateLimitMiddleware({ max: 100 });
export const uploadRateLimit = rateLimitMiddleware({
  max: 10,
  windowMs: 60 * 1000, // 10 uploads per minute
});
```

### 8.3 Brute Force Protection

```typescript
// src/services/auth/brute-force.service.ts

import { getRedis } from "@config/redis";

export class BruteForceService {
  private readonly prefix = "bruteforce:";
  private readonly maxAttempts = 5;
  private readonly lockoutDuration = 15 * 60; // 15 minutes in seconds

  /**
   * Record a failed login attempt
   */
  async recordFailedAttempt(email: string, ip: string): Promise<number> {
    const key = `${this.prefix}${email}:${ip}`;
    const attempts = await getRedis().incr(key);

    if (attempts === 1) {
      // First attempt — set TTL
      await getRedis().expire(key, this.lockoutDuration);
    }

    // Update user's failed login count in DB
    await getPrisma().user.updateMany({
      where: { email },
      data: {
        failedLoginAttempts: { increment: 1 },
        lockedUntil:
          attempts >= this.maxAttempts
            ? new Date(Date.now() + this.lockoutDuration * 1000)
            : undefined,
      },
    });

    return attempts;
  }

  /**
   * Check if IP/email is currently locked out
   */
  async isLockedOut(email: string, ip: string): Promise<boolean> {
    const key = `${this.prefix}${email}:${ip}`;
    const attempts = await getRedis().get(key);
    return attempts !== null && parseInt(attempts) >= this.maxAttempts;
  }

  /**
   * Clear failed attempts on successful login
   */
  async clearAttempts(email: string, ip: string): Promise<void> {
    const key = `${this.prefix}${email}:${ip}`;
    await getRedis().del(key);
  }

  /**
   * Get remaining attempts before lockout
   */
  async getRemainingAttempts(email: string, ip: string): Promise<number> {
    const key = `${this.prefix}${email}:${ip}`;
    const attempts = await getRedis().get(key);
    return Math.max(0, this.maxAttempts - (parseInt(attempts ?? "0")));
  }
}

export const bruteForceService = new BruteForceService();
```

### 8.4 Password Policy

| Policy | Requirement |
|--------|------------|
| **Minimum length** | 8 characters |
| **Complexity** | At least 1 uppercase, 1 lowercase, 1 number, 1 special character |
| **Maximum age** | 90 days (Law Enforcement & Admin roles) |
| **History** | Last 5 passwords remembered (prevents reuse) |
| **Hashing algorithm** | bcrypt with 12 salt rounds |
| **Lockout** | 5 failed attempts → 15-minute lockout |
| **Session timeout** | 24 hours of inactivity |
| **Concurrent sessions** | Unlimited (each has own refresh token) |

### 8.5 Password History Implementation

```typescript
// prisma/schema addition
model PasswordHistory {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@map("password_history")
}
```

---

## Summary

- **JWT-based authentication** with 15-minute access tokens and 7-day refresh tokens with rotation
- **Refresh token rotation** detects token theft by revoking entire token families
- **Email verification** via JWT tokens with 24-hour expiry, preventing unverified account access
- **Password reset** with single-use tokens stored in Redis, invalidating all existing sessions on reset
- **TOTP-based 2FA** for Super Admin accounts (optional for others) with encrypted secrets and backup codes
- **RBAC middleware** with hierarchical roles (Community → Security → Law Enforcement → Admin → Super Admin)
- **Permission system** with fine-grained resource-level access control
- **Session management** via Redis with IP tracking and inactivity timeouts
- **Security hardening** with Helmet headers, rate limiting, brute force protection, and strict password policies
- **Audit logging** for all authentication events (login, logout, failed attempts, role changes)
