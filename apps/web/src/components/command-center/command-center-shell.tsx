"use client";

import { cn } from "@Sentinel360/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import { agentProfile, navTabs, sidebarItems } from "./data";

type CommandCenterShellProps = {
  agentName: string;
  activeSidebarLabel: string;
  activeTopNavTab: string;
  searchPlaceholder: string;
  variant?: "dashboard" | "surveillance" | "analysis" | "investigation";
  children: ReactNode;
  profileTitle?: string;
  profileSubtitle?: string;
  profileMode?: "full" | "avatar-only";
  brandIcon?: string;
  contentClassName?: string;
  floatingHud?: ReactNode;
};

const headlineStyle = {
  fontFamily: '"Manrope", var(--font-sans), sans-serif',
} satisfies CSSProperties;

const bodyStyle = {
  fontFamily: '"Inter", var(--font-sans), sans-serif',
} satisfies CSSProperties;

export default function CommandCenterShell({
  agentName,
  activeSidebarLabel,
  activeTopNavTab,
  searchPlaceholder,
  variant = "dashboard",
  children,
  profileTitle,
  profileSubtitle,
  profileMode = "full",
  brandIcon,
  contentClassName,
  floatingHud,
}: CommandCenterShellProps) {
  const resolvedAgentName = agentName.trim() || "Agent K. Miller";
  const isDashboard = variant === "dashboard";
  const isAnalysis = variant === "analysis";
  const isInvestigation = variant === "investigation";

  return (
    <div
      className="sentinel-dashboard relative h-full overflow-y-auto bg-[#f8f9fa] text-[#191c1d]"
      style={bodyStyle}
    >
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap");
        @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");

        .sentinel-dashboard .material-symbols-outlined {
          font-variation-settings:
            "FILL" 0,
            "wght" 400,
            "GRAD" 0,
            "opsz" 24;
          font-size: inherit;
          line-height: 1;
        }

        .sentinel-dashboard .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
        }

        .sentinel-dashboard .sentinel-no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .sentinel-dashboard .sentinel-no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .sentinel-dashboard .no-line-shadow {
          box-shadow: 0 4px 20px -5px rgba(5, 17, 37, 0.04);
        }

        .sentinel-dashboard .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .sentinel-dashboard .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .sentinel-dashboard .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d9dadb;
          border-radius: 10px;
        }

        .sentinel-dashboard .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #bbc6e2;
        }
      `}</style>

      <CommandCenterSidebar activeSidebarLabel={activeSidebarLabel} />

      <main className="min-h-full bg-[#f8f9fa] lg:ml-64">
        <header
          className={cn(
            "sticky top-0 z-30 flex flex-col gap-4 bg-[#f8f9fa]/80 px-4 backdrop-blur-xl sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8",
            isDashboard ? "py-4" : "py-4 lg:h-16 lg:py-0",
          )}
        >
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
            <div className="relative w-full max-w-sm">
              <MaterialIcon
                name="search"
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 text-[#45474d]",
                  isDashboard ? "text-sm" : "text-xl",
                )}
              />
              <input
                className={cn(
                  "w-full border-none py-2 pl-10 pr-4 text-sm text-[#191c1d] outline-none transition-all placeholder:text-[#45474d] focus:bg-white focus:ring-2 focus:ring-[#051125]/20",
                  isDashboard
                    ? "rounded-full bg-[#f3f4f5]"
                    : isInvestigation
                      ? "rounded-full bg-[#f3f4f5]"
                    : isAnalysis
                      ? "rounded-xl bg-[#edeeef]"
                      : "rounded-lg bg-[#f3f4f5]",
                )}
                placeholder={searchPlaceholder}
                type="text"
              />
            </div>

            <nav className="flex gap-6 overflow-x-auto pb-1 lg:pb-0">
              {navTabs.map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    "whitespace-nowrap text-sm font-medium transition-colors",
                    tab === activeTopNavTab
                      ? isAnalysis || isInvestigation
                        ? "flex h-16 items-center border-b-2 border-[#051125] font-bold text-[#051125]"
                        : "border-b-2 border-[#051125] pb-1 font-bold text-[#051125]"
                      : cn(
                          "text-[#45474d] hover:text-[#1b263b]",
                          isAnalysis || isInvestigation
                            ? "flex h-16 items-center"
                            : "pb-1",
                        ),
                  )}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div
            className={cn(
              "flex items-center justify-between lg:justify-end",
              isDashboard ? "gap-6" : "gap-5",
            )}
          >
            <button
              aria-label="Help"
              className="text-[#45474d] transition-colors hover:text-[#051125]"
              type="button"
            >
              <MaterialIcon name="help" className="text-xl" />
            </button>

            <div className="relative">
              <button
                aria-label="Notifications"
                className="text-[#45474d] transition-colors hover:text-[#051125]"
                type="button"
              >
                <MaterialIcon name="notifications" className="text-xl" />
              </button>
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-[#f8f9fa] bg-[#ba1a1a]" />
            </div>

            {profileMode === "avatar-only" ? (
              <img
                alt={agentProfile.avatarAlt}
                className="h-8 w-8 rounded-full border border-[#c5c6cd] object-cover"
                src={agentProfile.avatarUrl}
              />
            ) : (
              <div
                className={cn(
                  "flex items-center gap-3 border-l border-[#c5c6cd]/20",
                  isDashboard ? "pl-6" : "pl-4",
                )}
              >
                <div className="text-right">
                  <p
                    className={cn(
                      "text-xs font-bold leading-none",
                      isDashboard ? "text-[#051125]" : "text-[#191c1d]",
                    )}
                    style={isDashboard ? headlineStyle : undefined}
                  >
                    {profileTitle ?? resolvedAgentName}
                  </p>
                  <p className="text-[10px] text-[#45474d]">
                    {profileSubtitle ?? "Lead Investigator"}
                  </p>
                </div>
                <img
                  alt={agentProfile.avatarAlt}
                  className={cn(
                    "rounded-full object-cover",
                    isDashboard
                      ? "h-10 w-10 ring-2 ring-white"
                      : isInvestigation
                        ? "h-10 w-10 shadow-sm ring-2 ring-white"
                      : "h-8 w-8 border-2 border-[#e7e8e9]",
                  )}
                  src={agentProfile.avatarUrl}
                />
              </div>
            )}
          </div>
        </header>

        <div className={cn("p-4 sm:p-6 lg:p-8", contentClassName)}>
          {children}
        </div>
      </main>

      {floatingHud}
    </div>
  );
}

export function CommandCenterSidebar({
  activeSidebarLabel,
}: {
  activeSidebarLabel: string;
}) {
  const router = useRouter();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    caseType: "",
    description: "",
    priority: "MEDIUM",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!formData.title.trim() || !formData.caseType.trim()) return;
    setSubmitting(true);
    setError("");

    const { data: session } = await supabase.auth.getSession();
    const authUserId = session.session?.user?.id;

    let userId: string | null = null;
    if (authUserId) {
      const { data: existing } = await supabase
        .from("user")
        .select("id")
        .eq("id", authUserId)
        .single();
      if (existing) {
        userId = authUserId;
      }
    }

    const caseNumber = `SR-${Date.now().toString(36).toUpperCase()}`;

    const { data, error: insertError } = await supabase
      .from("case")
      .insert({
        case_number: caseNumber,
        case_type: formData.caseType,
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        status: "OPEN",
        created_by_user_id: userId,
        assigned_to_user_id: userId,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setShowNewDialog(false);
    setFormData({ title: "", caseType: "", description: "", priority: "MEDIUM" });
    router.push(`/dashboard/investigations/${data.id}` as unknown as Route);
  }

  return (
    <aside className="w-full bg-[#051125] lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex lg:flex-col">
      <div className="p-6">
        <h1
          className="text-xl font-bold tracking-tight text-white"
          style={headlineStyle}
        >
          Sentinel360
        </h1>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.3em] text-[#828da7]">
          Enterprise Intelligence
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:mt-4 lg:flex-1 lg:flex-col lg:overflow-visible">
        {sidebarItems.map((item) => {
          const itemClassName = cn(
            "flex min-w-fit items-center gap-3 px-4 py-3 text-left text-sm transition-all duration-200 lg:min-w-0",
            item.label === activeSidebarLabel
              ? "border-l-4 border-white bg-gradient-to-r from-[#051125] to-[#1b263b] text-white"
              : "text-slate-400 hover:text-white",
          );

          if (item.href) {
            return (
              <Link
                key={item.label}
                className={itemClassName}
                href={item.href as Route}
              >
                <MaterialIcon name={item.icon} className="text-lg" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          }

          return (
            <button key={item.label} className={itemClassName} type="button">
              <MaterialIcon name={item.icon} className="text-lg" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-6 py-6">
        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-gradient-to-r from-[#051125] to-[#1b263b] py-3 text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-95"
          onClick={() => setShowNewDialog(true)}
          type="button"
        >
          <MaterialIcon name="add" className="text-base" />
          <span>New Investigation</span>
        </button>
      </div>

      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight text-[#051125]">
                New Investigation
              </h2>
              <button
                className="rounded-lg p-2 text-[#45474d] transition-colors hover:bg-[#f3f4f5]"
                onClick={() => setShowNewDialog(false)}
                type="button"
              >
                <MaterialIcon name="close" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">
                  Case Title *
                </label>
                <input
                  className="w-full rounded-lg border border-[#c5c6cd]/50 px-4 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20"
                  placeholder="e.g. Downtown Transit Incursion"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  type="text"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">
                  Case Type *
                </label>
                <input
                  className="w-full rounded-lg border border-[#c5c6cd]/50 px-4 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20"
                  placeholder="e.g. Perimeter Breach"
                  value={formData.caseType}
                  onChange={(e) =>
                    setFormData({ ...formData, caseType: e.target.value })
                  }
                  type="text"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">
                  Description
                </label>
                <textarea
                  className="h-24 w-full resize-none rounded-lg border border-[#c5c6cd]/50 px-4 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20"
                  placeholder="Brief description of the investigation..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">
                  Priority
                </label>
                <select
                  className="w-full rounded-lg border border-[#c5c6cd]/50 px-4 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              {error && (
                <p className="rounded-lg bg-[#ffdad6] px-3 py-2 text-xs font-medium text-[#93000a]">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                className="rounded-lg border border-[#c5c6cd]/50 px-5 py-2.5 text-sm font-semibold text-[#45474d] transition-colors hover:bg-[#f3f4f5]"
                onClick={() => setShowNewDialog(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#051125] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1b263b] active:scale-95 disabled:opacity-50"
                disabled={
                  !formData.title.trim() ||
                  !formData.caseType.trim() ||
                  submitting
                }
                onClick={handleCreate}
                type="button"
              >
                {submitting ? "Creating..." : "Create Investigation"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-white/5 p-4 lg:mt-auto">
        <button
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-xs text-slate-400 transition-colors hover:text-white"
          type="button"
        >
          <MaterialIcon
            name="settings_input_component"
            className="text-sm"
          />
          <span>System Status</span>
        </button>
        <button
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-xs text-slate-400 transition-colors hover:text-white"
          type="button"
        >
          <MaterialIcon name="settings" className="text-sm" />
          <span>Settings</span>
        </button>
        <button
          className="flex w-full items-center gap-3 px-4 py-2 text-left text-xs text-error transition-colors hover:text-[#ff6b6b]"
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/login");
                },
              },
            });
          }}
          type="button"
        >
          <MaterialIcon name="logout" className="text-sm" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export function MaterialIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined inline-flex leading-none", className)}
    >
      {name}
    </span>
  );
}

export { headlineStyle };
