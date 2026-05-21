"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@Sentinel360/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { supabase } from "@/lib/supabase";
import CommandCenterShell, {
  MaterialIcon,
  headlineStyle,
} from "./command-center-shell";

type InvestigationWorkspaceProps = {
  agentName: string;
};

type CaseRow = {
  id: string;
  caseNumber: string;
  caseType: string;
  title: string;
  priority: string;
  status: string;
  assignedToName: string | null;
  assignedToImage: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type CaseStats = {
  total: number;
  open: number;
  critical: number;
  closed: number;
};

export default function InvestigationWorkspace({
  agentName,
}: InvestigationWorkspaceProps) {
  const resolvedAgentName = agentName.trim() || "Det. James Miller";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["investigations", "list"],
    queryFn: async () => {
      const { data: casesData, error } = await supabase
        .from("case")
        .select(`
          id,
          case_number,
          case_type,
          title,
          priority,
          status,
          description,
          created_at,
          updated_at,
          assigned_to_user_id
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userMap = new Map<string, { name: string; image: string | null }>();

      const userIds = casesData
        .map((c) => c.assigned_to_user_id)
        .filter(Boolean) as string[];

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("user")
          .select("id, name, image")
          .in("id", userIds);

        if (users) {
          for (const u of users) {
            userMap.set(u.id, { name: u.name, image: u.image });
          }
        }
      }

      return casesData.map((c) => {
        const assignedUser = c.assigned_to_user_id
          ? userMap.get(c.assigned_to_user_id)
          : null;

        return {
          id: c.id,
          caseNumber: c.case_number,
          caseType: c.case_type,
          title: c.title,
          priority: c.priority,
          status: c.status,
          description: c.description,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          assignedToName: assignedUser?.name ?? null,
          assignedToImage: assignedUser?.image ?? null,
        } satisfies CaseRow;
      });
    },
  });

  const { data: stats }: { data: CaseStats | undefined } = useQuery({
    queryKey: ["investigations", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("case").select("status, priority");

      if (error) throw error;

      return {
        total: data.length,
        open: data.filter((c) => c.status === "OPEN").length,
        critical: data.filter((c) => c.priority === "CRITICAL").length,
        closed: data.filter((c) => c.status === "CLOSED").length,
      } satisfies CaseStats;
    },
  });

  const filteredCases = cases.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.caseNumber.toLowerCase().includes(q) &&
        !c.title.toLowerCase().includes(q) &&
        !c.caseType.toLowerCase().includes(q) &&
        !(c.assignedToName ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter && c.status !== statusFilter) return false;
    if (priorityFilter && c.priority !== priorityFilter) return false;
    return true;
  });

  const priorityColor = (p: string) => {
    switch (p) {
      case "CRITICAL":
        return "bg-[#ffdad6] text-[#93000a]";
      case "HIGH":
        return "bg-[#ffedd5] text-[#9a5b00]";
      case "MEDIUM":
        return "bg-[#dbeafe] text-[#1e40af]";
      default:
        return "bg-[#f3f4f5] text-[#45474d]";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "OPEN":
        return "bg-[#dbeafe] text-[#1e40af]";
      case "CLOSED":
        return "bg-[#dcfce7] text-[#166534]";
      case "PENDING":
        return "bg-[#fef9c3] text-[#854d0e]";
      default:
        return "bg-[#f3f4f5] text-[#45474d]";
    }
  };

  return (
    <CommandCenterShell
      activeSidebarLabel="Investigations"
      activeTopNavTab="Analytics"
      agentName={agentName}
      brandIcon="search_check"
      profileTitle={resolvedAgentName}
      profileSubtitle="Level 4 Investigator"
      searchPlaceholder="Search cases, case IDs, officers..."
    >
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Total Cases", value: stats?.total ?? 0, color: "border-[#051125]" },
          { label: "Open", value: stats?.open ?? 0, color: "border-[#1e40af]" },
          { label: "Critical", value: stats?.critical ?? 0, color: "border-[#ba1a1a]" },
          { label: "Closed", value: stats?.closed ?? 0, color: "border-[#166534]" },
        ].map((s) => (
          <article
            key={s.label}
            className={cn(
              "rounded-xl border-l-4 bg-white p-5 transition-transform hover:scale-[1.02]",
              s.color,
            )}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#45474d]">
              {s.label}
            </p>
            <p className="text-3xl font-extrabold text-[#051125]">{s.value}</p>
          </article>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#45474d]"
          />
          <input
            className="w-full rounded-lg border border-[#c5c6cd]/50 bg-white py-2.5 pl-9 pr-4 text-sm text-[#191c1d] outline-none transition-all placeholder:text-[#45474d]/50 focus:ring-2 focus:ring-[#051125]/20"
            placeholder="Search by case number, title, or officer..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="rounded-lg border border-[#c5c6cd]/50 bg-white px-3 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20"
          value={statusFilter ?? ""}
          onChange={(e) => setStatusFilter(e.target.value || null)}
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="PENDING">Pending</option>
        </select>

        <select
          className="rounded-lg border border-[#c5c6cd]/50 bg-white px-3 py-2.5 text-sm text-[#191c1d] outline-none focus:ring-2 focus:ring-[#051125]/20"
          value={priorityFilter ?? ""}
          onChange={(e) => setPriorityFilter(e.target.value || null)}
        >
          <option value="">All Priority</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm shadow-[#051125]/5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#051125] border-t-transparent" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#45474d]">
            <MaterialIcon name="folder_off" className="mb-2 text-4xl" />
            <p className="text-sm font-medium">No investigations found</p>
            {search && (
              <p className="mt-1 text-xs">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c5c6cd]/20 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[#45474d]">
                <th className="px-5 py-3">Case</th>
                <th className="px-5 py-3">Title / Type</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#c5c6cd]/10 transition-colors last:border-b-0 hover:bg-[#f8f9fa]"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/investigations/${c.id}` as Route}
                      className="font-mono text-xs font-bold text-[#051125] underline-offset-2 hover:underline"
                    >
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs font-semibold text-[#051125]">
                      {c.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#45474d]">
                      {c.caseType}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                        priorityColor(c.priority),
                      )}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                        statusColor(c.status),
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {c.assignedToImage ? (
                        <img
                          alt={c.assignedToName ?? ""}
                          className="h-6 w-6 rounded-full object-cover"
                          src={c.assignedToImage}
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edeeef]">
                          <MaterialIcon
                            name="person"
                            className="text-xs text-[#45474d]"
                          />
                        </div>
                      )}
                      <span className="text-xs text-[#191c1d]">
                        {c.assignedToName ?? "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[10px] text-[#45474d]">
                    {formatDate(c.updatedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/investigations/${c.id}` as Route}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#45474d] transition-colors hover:text-[#051125]"
                    >
                      <span>Open</span>
                      <MaterialIcon name="chevron_right" className="text-sm" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </CommandCenterShell>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
