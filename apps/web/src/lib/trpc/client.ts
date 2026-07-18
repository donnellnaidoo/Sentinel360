import type { AppRouter } from "@Sentinel360/api/routers/index";
import { env } from "@Sentinel360/env/web";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { createClient } from "@/lib/supabase/client";

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.NEXT_PUBLIC_SERVER_URL}/trpc`,
      fetch: async (url, options) => {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers = new Headers(options?.headers);
        if (session?.access_token) {
          headers.set("Authorization", `Bearer ${session.access_token}`);
        }

        return fetch(url, { ...options, headers, credentials: "include" });
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
