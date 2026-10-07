import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getConsoleRole, type ConsoleRole } from "@/lib/auth/console-role";

// Reachable without a session. Signed-in users are bounced off GUEST_ONLY.
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/privacy", "/auth/callback"];
const GUEST_ONLY_ROUTES = ["/login", "/forgot-password"];
// Needs a session (the recovery link signs the user in) but no console role,
// so a password can be reset before access is re-checked on next sign-in.
const SESSION_ONLY_ROUTES = ["/reset-password"];

// Route prefixes each console role may open. Anything not listed is denied.
const CONSOLE_ROUTES: Record<ConsoleRole, string[]> = {
  admin: [
    "/dashboard", "/cases", "/docket", "/evidence",
    "/sightings", "/alerts", "/monitoring", "/wanted-feed",
    "/admin", "/profile", "/my-data",
  ],
  super_admin: [
    "/dashboard", "/cases", "/docket", "/evidence",
    "/sightings", "/alerts", "/monitoring", "/wanted-feed",
    "/admin", "/super-admin", "/profile", "/my-data",
  ],
};

function matches(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Carry refreshed/cleared auth cookies onto redirects too.
  const redirectTo = (path: string, params: Record<string, string> = {}) => {
    const url = new URL(path, request.url);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  };

  const { data: { user } } = await supabase.auth.getUser();

  // API route handlers authorise themselves (and must answer with JSON, not
  // a redirect); middleware only keeps the session cookie fresh for them.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  if (!user) {
    if (pathname === "/" || matches(pathname, PUBLIC_ROUTES)) {
      return supabaseResponse;
    }
    return redirectTo("/login", { redirect: pathname });
  }

  if (matches(pathname, SESSION_ONLY_ROUTES) || matches(pathname, ["/privacy", "/auth/callback"])) {
    return supabaseResponse;
  }

  const consoleRole = await getConsoleRole(user.id);

  if (!consoleRole) {
    // Signed in, but not an active admin (e.g. a community user from the
    // mobile app). End this browser's session so /login doesn't bounce them
    // back here — "local" so their other devices stay signed in.
    await supabase.auth.signOut({ scope: "local" });
    return redirectTo("/login", { error: "unauthorized" });
  }

  if (pathname === "/" || matches(pathname, GUEST_ONLY_ROUTES)) {
    return redirectTo("/dashboard");
  }

  if (!matches(pathname, CONSOLE_ROUTES[consoleRole])) {
    return redirectTo("/dashboard", { error: "unauthorized" });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|icons|images|manifest.json|sw.js|robots.txt).*)",
  ],
};
