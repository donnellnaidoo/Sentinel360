import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/forgot-password"];
const authRoutes = ["/login", "/forgot-password"];

const adminRoleRouteMap: Record<string, string[]> = {
  admin: [
    "/dashboard", "/cases", "/docket", "/evidence",
    "/sightings", "/alerts", "/wanted-feed",
    "/admin", "/profile",
  ],
  super_admin: [
    "/dashboard", "/cases", "/docket", "/evidence",
    "/sightings", "/alerts", "/wanted-feed",
    "/admin", "/super-admin", "/profile",
  ],
};

const allowedRoles = ["admin", "super_admin"];

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Allow the root landing page (exact match)
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // 2. Allow other public routes (login, forgot-password)
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // 3. Require authentication for all other routes
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Check role from Supabase user app_metadata
  const userRole: string = user.app_metadata?.role ?? "admin";

  if (!allowedRoles.includes(userRole)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(loginUrl);
  }

  const userRoutes = adminRoleRouteMap[userRole] || [];
  const hasAccess = userRoutes.some((route) => pathname.startsWith(route));
  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|icons|images|manifest.json|sw.js|robots.txt).*)",
  ],
};
