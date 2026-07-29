"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@Sentinel360/ui/components/logo";

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
const myDataNavItem = { label: "My Data", href: "/my-data", icon: "privacy_tip" } as const;

interface SidebarProps {
  currentPath: string;
  userRole?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ currentPath, userRole = "admin", isMobileOpen = false, onMobileClose }: SidebarProps) {
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
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[270px] flex-col bg-surface transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none lg:border-r lg:border-outline-variant/70 ${
          isMobileOpen ? "translate-x-0 shadow-[0_0_24px_rgba(0,0,0,0.12)]" : "-translate-x-full"
        }`}
      >
        <div className="px-6 pt-7 pb-6">
          <Logo className="font-headline-md text-headline-md font-bold text-primary tracking-tight" />
          <p className="text-on-surface-variant font-body-sm mt-0.5">Admin Console</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} href={item.href} isActive={isActive(item.href)} icon={item.icon} label={item.label} />
          ))}

          <div className="pt-5 mt-1">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
              Administration
            </p>
            {adminNavItems.map((item) => (
              <NavLink key={item.href} href={item.href} isActive={isActive(item.href)} icon={item.icon} label={item.label} />
            ))}
          </div>

          {isSuperAdmin && (
            <div className="pt-5 mt-1">
              <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                Super Admin
              </p>
              {superAdminNavItems.map((item) => (
                <NavLink key={item.href} href={item.href} isActive={isActive(item.href)} icon={item.icon} label={item.label} />
              ))}
            </div>
          )}
        </nav>

        <div className="px-4 pt-3 pb-1 space-y-1 border-t border-outline-variant/60">
          <NavLink href={myDataNavItem.href} isActive={currentPath === myDataNavItem.href} icon={myDataNavItem.icon} label={myDataNavItem.label} />
          <NavLink href={profileNavItem.href} isActive={currentPath === profileNavItem.href} icon={profileNavItem.icon} label={profileNavItem.label} />
        </div>

        <div className="px-4 pb-6 pt-1">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-error-container/60 hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-body-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavLink({ href, isActive, icon, label }: { href: string; isActive: boolean; icon: string; label: string }) {
  return (
    <Link
      href={href as unknown as React.ComponentProps<typeof Link>["href"]}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
        isActive
          ? "bg-primary-container text-primary font-semibold"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      }`}
    >
      <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
        {icon}
      </span>
      <span className="font-body-sm">{label}</span>
    </Link>
  );
}
