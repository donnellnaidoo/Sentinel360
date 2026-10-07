import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getConsoleRole } from "@/lib/auth/console-role";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Middleware already gates this, but the layout must not trust a role it
  // didn't resolve itself — deny rather than default to "admin".
  const userRole = await getConsoleRole(user.id);
  if (!userRole) {
    redirect("/login?error=unauthorized");
  }

  const userName: string = user.email ?? "Officer";

  return (
    <DashboardShell userRole={userRole} userName={userName}>
      {children}
    </DashboardShell>
  );
}
