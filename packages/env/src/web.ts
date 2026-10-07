import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // apps/ai, reached only through the /api/ai/* proxy routes. The key is
    // the same shared secret as AI_SERVICE_API_KEY in apps/server/.env.
    // Optional so the console still runs without the AI service configured.
    AI_SERVICE_URL: z.url().default("http://localhost:8001"),
    AI_SERVICE_API_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AI_SERVICE_URL: process.env.AI_SERVICE_URL,
    AI_SERVICE_API_KEY: process.env.AI_SERVICE_API_KEY,
  },
  emptyStringAsUndefined: true,
});
