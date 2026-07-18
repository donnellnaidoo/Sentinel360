"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const mainNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Cases", href: "/cases", icon: "folder_open" },
  { label: "Evidence", href: "/evidence", icon: "inventory_2" },
  { label: "Sightings", href: "/sightings", icon: "visibility" },
  { label: "Alerts", href: "/alerts", icon: "notifications" },
  { label: "Wanted Feed", href: "/wanted-feed", icon: "person_search" },
] as const;

const adminNavItems = [
  { label: "Users", href: "/admin/users", icon: "group" },
  { label: "Profiles", href: "/admin/profiles", icon: "badge" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
] as const;

const superAdminNavItems = [
  { label: "Audit Logs", href: "/super-admin/audit-logs", icon: "analytics" },
  { label: "Users", href: "/super-admin/users", icon: "admin_panel_settings" },
] as const;

const profileNavItem = { label: "Profile", href: "/profile", icon: "person" } as const;

interface SidebarProps {
  currentPath: string;
  userRole?: string;
}

export default function Sidebar({ currentPath, userRole = "admin" }: SidebarProps) {
  const router = useRouter();
  const isSuperAdmin = userRole === "super_admin";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  function isActive(href: string) {
    if (href === "/dashboard") return currentPath === href;
    // /docket/[docketId] is the case detail view Cases links into — treat
    // it as part of the Cases nav item now that Docket has no nav entry of
    // its own (the bare /docket route still redirects to /cases).
    if (href === "/cases") return currentPath.startsWith(href) || currentPath.startsWith("/docket");
    return currentPath.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-outline-variant bg-surface shadow-sm">
      <div className="px-6 mb-8 pt-stack-lg">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">Sentinel360</h1>
        <p className="text-on-surface-variant font-body-sm opacity-70">Admin Console</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} href={item.href} isActive={isActive(item.href)} icon={item.icon} label={item.label} />
        ))}

        <div className="pt-4 mt-4 border-t border-outline-variant/30">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/50">
            Administration
          </p>
          {adminNavItems.map((item) => (
            <NavLink key={item.href} href={item.href} isActive={isActive(item.href)} icon={item.icon} label={item.label} />
          ))}
        </div>

        {isSuperAdmin && (
          <div className="pt-4 mt-4 border-t border-outline-variant/30">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/50">
              Super Admin
            </p>
            {superAdminNavItems.map((item) => (
              <NavLink key={item.href} href={item.href} isActive={isActive(item.href)} icon={item.icon} label={item.label} />
            ))}
          </div>
        )}
      </nav>

      <div className="px-3 mb-2">
        <NavLink href={profileNavItem.href} isActive={currentPath === profileNavItem.href} icon={profileNavItem.icon} label={profileNavItem.label} />
      </div>

      <div className="px-6 mb-stack-lg border-t border-outline-variant/30 pt-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-error transition-colors rounded-lg"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body-md">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function NavLink({ href, isActive, icon, label }: { href: string; isActive: boolean; icon: string; label: string }) {
  return (
    <Link
      href={href as unknown as React.ComponentProps<typeof Link>["href"]}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        isActive
          ? "border-l-4 border-primary bg-primary-container/10 text-primary font-medium"
          : "border-l-4 border-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
      }`}
    >
      <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
        {icon}
      </span>
      <span className="font-body-md">{label}</span>
    </Link>
  );
}
