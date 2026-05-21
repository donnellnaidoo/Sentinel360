"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@Sentinel360/ui/lib/utils";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  CommandCenterSidebar,
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";

type SuspectDatabaseProps = {
  agentName: string;
};

type EntityProfile = {
  id: string;
  displayName: string | null;
  entityType: string;
  primaryFaceImageUrl: string | null;
  status: string;
  watchlistStatus: string;
  notes: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
};

const topNav = ["Global View", "Analytics", "Reports"] as const;

export default function SuspectDatabase({ agentName }: SuspectDatabaseProps) {
  const resolvedAgentName = agentName.trim() || "Agent K. Miller";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: suspects = [], isLoading } = useQuery({
    queryKey: ["suspect-database", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_profile")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EntityProfile[];
    },
  });

  const filtered = suspects.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !(s.displayName ?? "").toLowerCase().includes(q) &&
        !s.entityType.toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter && s.status !== statusFilter) return false;
    if (typeFilter && s.entityType !== typeFilter) return false;
    return true;
  });

  const statusDot = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-[#ba1a1a]";
      case "INACTIVE":
        return "bg-[#47607e]";
      default:
        return "bg-[#a28963]";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-[#ba1a1a]";
      case "INACTIVE":
        return "text-[#47607e]";
      default:
        return "text-[#a28963]";
    }
  };

  const classificationBadge = (watchlist: string) => {
    switch (watchlist) {
      case "WANTED":
        return "bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20";
      case "MONITORING":
        return "bg-[#a28963]/10 text-[#a28963] border border-[#a28963]/20";
      case "PERSON_OF_INTEREST":
        return "bg-[#47607e]/10 text-[#47607e] border border-[#47607e]/20";
      default:
        return "bg-[#051125]/10 text-[#051125] border border-[#051125]/20";
    }
  };

  const uniqueTypes = [...new Set(suspects.map((s) => s.entityType))];
  const uniqueStatuses = [...new Set(suspects.map((s) => s.status))];

  return (
    <div className="sentinel-dashboard min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap");
        @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
      `}</style>

      <CommandCenterSidebar activeSidebarLabel="Suspect Database" />

      <header className="fixed right-0 top-0 z-30 ml-64 flex h-16 w-[calc(100%-16rem)] items-center justify-between bg-[#f8f9fa]/80 px-8 backdrop-blur-xl">
        <div className="flex flex-1 items-center gap-8">
          <div className="relative w-full max-w-md">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#45474d]" />
            <input
              className="w-full rounded-lg border-none bg-[#f3f4f5] py-2 pl-10 pr-4 text-sm text-[#191c1d] placeholder:text-[#45474d]/60 focus:ring-2 focus:ring-[#051125]/20"
              placeholder="Search suspect identities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
          </div>

          <nav className="hidden items-center gap-6 lg:flex">
            {topNav.map((tab) => (
              <button
                key={tab}
                className={cn(
                  "text-sm font-medium transition-colors",
                  tab === "Reports"
                    ? "border-b-2 border-[#051125] py-1 text-[#191c1d]"
                    : "text-[#45474d] hover:text-[#051125]",
                )}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="rounded-full p-2 text-[#45474d] transition-colors hover:bg-[#e7e8e9]" type="button">
            <MaterialIcon name="help" />
          </button>
          <button className="relative rounded-full p-2 text-[#45474d] transition-colors hover:bg-[#e7e8e9]" type="button">
            <MaterialIcon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#f8f9fa] bg-[#ba1a1a]" />
          </button>

          <div className="ml-2 flex items-center gap-3 border-l border-[#c5c6cd]/20 pl-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-[#191c1d]">{resolvedAgentName}</p>
              <p className="text-[10px] text-[#45474d]">Level 4 Clearance</p>
            </div>
            <img
              alt="Officer avatar"
              className="h-8 w-8 rounded-full bg-[#e7e8e9] object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0gR66Q_OWZ_ZmAIEweR-8ggci8D4Y6Xse2rqFmokc9L5HY_h37pOo5GYvAwn1IrkIj8phi3l_ps4Qawx7jyV4MQEvW1fJa9BNPHtFEHwZ1lJ3s6HQrCsOmy4QC_3BJKmbiAEFL39CGA8LU8vBSuW5SpETu0sfOVa8p_74ieiRW3umdEZlB6uJdG_g9ynFYVsUK4oncYT52FX725KvsNElfChSO6oXY4bEIq6MX9oB6d4HKhNEwka12Il-BC8D9eXWoeLROP5SaZU"
            />
          </div>
        </div>
      </header>

      <main className="ml-64 min-h-screen bg-[#f8f9fa] px-8 pb-8 pt-20">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#051125]" style={headlineStyle}>
                Suspect Database
              </h1>
              <p className="mt-1 font-medium text-[#45474d]">
                Monitoring {suspects.length} intelligence profiles.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-[#f3f4f5] p-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#45474d]">
              Filters:
            </span>

            <select
              className="cursor-pointer appearance-none rounded-lg border-none bg-white py-2 pl-4 pr-10 text-xs font-semibold text-[#45474d] focus:ring-2 focus:ring-[#051125]/10"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {uniqueTypes.map((t) => (
                <option key={t ?? ""} value={t ?? ""}>{t ?? "Unknown"}</option>
              ))}
            </select>

            <select
              className="cursor-pointer appearance-none rounded-lg border-none bg-white py-2 pl-4 pr-10 text-xs font-semibold text-[#45474d] focus:ring-2 focus:ring-[#051125]/10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map((s) => (
                <option key={s ?? ""} value={s ?? ""}>{s ?? "Unknown"}</option>
              ))}
            </select>

            <button
              className="ml-auto text-xs font-bold text-[#051125] hover:underline"
              onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); }}
              type="button"
            >
              Clear all filters
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#051125] border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#45474d]">
                <MaterialIcon name="person_off" className="mb-2 text-4xl" />
                <p className="text-sm font-medium">No profiles found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f3f4f5]/50">
                      {["Identity", "Classification", "Status", "Watchlist", "Notes", ""].map((h) => (
                        <th key={h} className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#45474d]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y-8 divide-white">
                    {filtered.map((s) => (
                      <tr key={s.id} className="group transition-colors hover:bg-[#e7e8e9]/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              {s.primaryFaceImageUrl ? (
                                <img
                                  alt={s.displayName ?? ""}
                                  className="h-12 w-12 rounded-xl object-cover"
                                  src={s.primaryFaceImageUrl}
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edeeef]">
                                  <MaterialIcon name="person" className="text-lg text-[#45474d]" />
                                </div>
                              )}
                              <span className={cn("absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#f8f9fa]", statusDot(s.status))} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#191c1d]">
                                {s.displayName ?? (s.entityType ? s.entityType.charAt(0).toUpperCase() + s.entityType.slice(1) : "Unknown")}
                              </p>
                              <p className="font-mono text-[10px] text-[#45474d]">
                                ID: {s.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold", classificationBadge(s.watchlistStatus))}>
                            {s.watchlistStatus === "NONE" ? s.entityType : s.watchlistStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full", statusDot(s.status))} />
                            <span className={cn("text-xs font-bold", statusColor(s.status))}>
                              {s.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-[#45474d]">
                          {s.watchlistStatus}
                        </td>
                        <td className="px-6 py-4 text-xs text-[#45474d] max-w-[200px] truncate">
                          {s.notes ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="rounded-lg bg-[#051125] px-3 py-1.5 text-[10px] font-bold text-white transition-opacity hover:opacity-90" type="button">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#c5c6cd]/10 p-6">
              <p className="text-xs font-medium text-[#45474d]">
                Showing {filtered.length} of {suspects.length} intelligence profiles
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { label: "Total Profiles", value: String(suspects.length), card: "bg-[#f3f4f5]", icon: "person_search", iconWrap: "bg-[#051125]/10", iconCls: "text-[#051125]", labelCls: "text-[#45474d]", valueCls: "text-[#051125]" },
              { label: "Active", value: String(suspects.filter((s) => s.status === "ACTIVE").length), card: "bg-[#f3f4f5]", icon: "warning", iconWrap: "bg-[#ba1a1a]/10", iconCls: "text-[#ba1a1a]", labelCls: "text-[#45474d]", valueCls: "text-[#051125]" },
              { label: "Watchlisted", value: String(suspects.filter((s) => s.watchlistStatus !== "NONE").length), card: "bg-[#051125] relative overflow-hidden", icon: "visibility", iconWrap: "bg-white/10", iconCls: "text-white", labelCls: "text-white/60", valueCls: "text-white", glow: true },
            ].map((stat) => (
              <article key={stat.label} className={cn("flex flex-col gap-4 rounded-3xl p-6", stat.card)}>
                <div className={cn("z-10 flex h-10 w-10 items-center justify-center rounded-xl", stat.iconWrap)}>
                  <MaterialIcon name={stat.icon} className={stat.iconCls} />
                </div>
                <div className="z-10">
                  <h3 className={cn("text-[11px] font-bold uppercase tracking-[0.16em]", stat.labelCls)}>
                    {stat.label}
                  </h3>
                  <p className={cn("mt-1 text-3xl font-extrabold", stat.valueCls)} style={headlineStyle}>
                    {stat.value}
                  </p>
                </div>
                {stat.glow ? <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/5 blur-3xl" /> : null}
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
