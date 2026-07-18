import { createClient } from "@supabase/supabase-js";
import { env } from "@Sentinel360/env/server";

export { recordAuditEvent, AuditEvents } from "./audit";
export { sendEmail, sendVerificationEmail, sendPasswordResetEmail } from "./email";

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
