import { createBrowserClient } from "@supabase/ssr";
import { env } from "@Sentinel360/env/web";

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
