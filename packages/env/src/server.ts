import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Shared secret the apps/ai CCTV pipeline sends as X-Internal-Api-Key when
    // posting detection events to POST /internal/ai/events. Not a user
    // credential — there is no Supabase session on that request path.
    AI_SERVICE_API_KEY: z.string().min(1),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().email().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
