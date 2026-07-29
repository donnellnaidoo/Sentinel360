"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { STATUS_OPTIONS, STATUS_STYLES } from "@/lib/case-status";
import { trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 20;

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CasesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number] | "">("");
  const [page, setPage] = useState(0);

  const input = useMemo(
    () => ({
      search: search || undefined,
      status: status || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [search, status, page],
  );

  const { data, isLoading, isError, error } = useQuery(trpc.cases.list.queryOptions(input));

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="max-w-container-max mx-auto w-full min-h-full flex flex-col">
      <div className="flex justify-between items-end mb-stack-lg">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Cases</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Manage and track ongoing investigations across all sectors.
          </p>
        </div>
        <Link
          href="/cases/new"
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-body-md text-body-md font-bold flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          New Case
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-gutter mb-stack-lg">
        <div className="col-span-12 bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant/30 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">
              SEARCH
            </label>
            <div className="flex items-center bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">
                search
              </span>
              <input
                className="bg-transparent border-none focus:ring-0 text-body-sm w-full outline-none"
                placeholder="Case title or number..."
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
          <div className="w-56">
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1 block">
              STATUS
            </label>
            <select
              className="w-full bg-surface-container-low border-outline-variant rounded-lg text-body-sm focus:ring-primary focus:border-primary"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(0);
              }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end self-end h-10">
            <button
              className="h-full px-4 text-on-surface-variant hover:text-primary font-bold flex items-center gap-1 transition-colors"
              onClick={() => {
                setSearch("");
                setStatus("");
                setPage(0);
              }}
            >
              <span className="material-symbols-outlined">filter_list</span>
              <span className="text-body-sm">Reset</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-surface-container-low z-10 border-b border-outline-variant/50">
            <tr>
              <th className="p-4 font-label-caps text-label-caps text-on-surface-variant">CASE #</th>
              <th className="p-4 font-label-caps text-label-caps text-on-surface-variant">TITLE / TYPE</th>
              <th className="p-4 font-label-caps text-label-caps text-on-surface-variant">PRIORITY</th>
              <th className="p-4 font-label-caps text-label-caps text-on-surface-variant">STATUS</th>
              <th className="p-4 font-label-caps text-label-caps text-on-surface-variant">ASSIGNED TO</th>
              <th className="p-4 font-label-caps text-label-caps text-on-surface-variant">LAST UPDATED</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-body-sm text-on-surface-variant">
                  Loading cases...
                </td>
              </tr>
            )}

            {isError && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-body-sm text-error">
                  Failed to load cases: {error?.message}
                </td>
              </tr>
            )}

            {!isLoading && !isError && data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-body-sm text-on-surface-variant">
                  No cases match your filters.
                </td>
              </tr>
            )}

            {data?.items.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-background transition-colors group cursor-pointer"
              >
                <td className="p-0">
                  <Link href={`/docket/${c.id}`} className="block p-4 font-mono text-xs font-bold text-primary">
                    {c.caseNumber}
                  </Link>
                </td>
                <td className="p-4">
                  <div className="font-bold text-on-surface">{c.title}</div>
                  <div className="text-xs text-on-surface-variant">{c.caseType}</div>
                </td>
                <td className="p-4 text-body-sm">{c.priority}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${STATUS_STYLES[c.status as (typeof STATUS_OPTIONS)[number]] ?? "bg-on-surface-variant/10 text-on-surface-variant"}`}
                  >
                    {c.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-4 text-body-sm">{c.assignedToName ?? "Unassigned"}</td>
                <td className="p-4 text-body-sm">{formatRelativeTime(new Date(c.updatedAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center px-6 py-4 bg-surface-container-low border-t border-outline-variant/30">
          <span className="text-body-sm text-on-surface-variant">
            Showing <span className="font-bold">{data?.items.length ?? 0}</span> of{" "}
            <span className="font-bold">{data?.total ?? 0}</span> cases
          </span>
          <div className="flex gap-2">
            <button
              className="p-2 rounded-lg border border-outline-variant hover:bg-surface transition-colors disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="px-3 py-1 text-sm text-on-surface-variant">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="p-2 rounded-lg border border-outline-variant hover:bg-surface transition-colors disabled:opacity-40"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
