"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { cn } from "@Sentinel360/ui/lib/utils";
import { SearchBar } from "@Sentinel360/ui/components/search-bar";
import type { SearchFilter } from "@Sentinel360/ui/components/search-bar";
import { StatusBadge } from "@Sentinel360/ui/components/status-badge";

import { trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 50;

interface AuditEntry {
  id: string;
  createdAt: string | Date;
  eventType: string;
  domain: string;
  actorId: string | null;
  actorName: string | null;
  targetEntityType: string | null;
  targetEntityId: string | null;
  action: string;
  ipAddress: string | null;
  status: string;
}

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function getFullTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").substring(0, 23);
}

const searchFilters: SearchFilter[] = [
  {
    key: "domain",
    label: "Domain",
    options: [
      { value: "SIGHTINGS", label: "Sightings" },
      { value: "ALERTS", label: "Alerts" },
    ],
  },
];

export default function SuperAdminAuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const { data, isLoading, isError, error } = useQuery(
    trpc.audit.list.queryOptions({ limit: PAGE_SIZE, offset: 0, domain: activeFilters.domain || undefined }),
  );

  const entries = useMemo(() => data?.items ?? [], [data]);

  const domainFilter = activeFilters.domain || "All Events";

  const filteredEntries = entries.filter((entry) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !(entry.actorName ?? entry.actorId ?? "").toLowerCase().includes(q) &&
        !entry.eventType.toLowerCase().includes(q) &&
        !(entry.targetEntityId ?? "").toLowerCase().includes(q) &&
        !(entry.ipAddress ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalLogs = data?.total ?? 0;
  const criticalEvents = entries.filter((e) => e.status !== "COMPLETE").length;
  const activeUsers = [...new Set(entries.map((e) => e.actorName ?? e.actorId).filter(Boolean))].length;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/20 rounded-full">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
          </span>
          <span className="text-[11px] font-bold text-secondary uppercase tracking-tighter">Recording</span>
        </div>
      </div>

      {/* Immutability Warning */}
      <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-start gap-4 mb-6">
        <span className="material-symbols-outlined text-destructive mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
        <div className="flex-1">
          <h3 className="font-semibold text-destructive text-sm">IMMUTABLE COMPLIANCE ENVIRONMENT</h3>
          <p className="text-destructive/80 text-xs mt-1">
            This audit trail is governed by cryptographic integrity protocols. All entries are write-once, read-only and cannot be modified or deleted.
          </p>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border/30 p-4 rounded-lg shadow-sm">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total Logs</p>
          <p className="text-2xl font-bold text-primary">{totalLogs.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border/30 p-4 rounded-lg shadow-sm">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Non-Complete Events</p>
          <p className="text-2xl font-bold text-destructive">{criticalEvents}</p>
        </div>
        <div className="bg-card border border-border/30 p-4 rounded-lg shadow-sm">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Distinct Actors</p>
          <p className="text-2xl font-bold text-secondary">{activeUsers}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by actor, event type, target, or IP..."
          filters={searchFilters}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
          onClear={() => setSearchQuery("")}
        />
      </div>

      {/* Domain Filter Chips */}
      <div className="flex gap-2 mb-4">
        {["All Events", "SIGHTINGS", "ALERTS"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilters((prev) => ({ ...prev, domain: filter === "All Events" ? "" : filter }))}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
              domainFilter === filter || (domainFilter === "" && filter === "All Events")
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Audit Table */}
      <div className="bg-card border border-border/30 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-5 py-3 flex justify-between items-center border-b border-border/50">
          <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            System Activity Stream
          </h2>
        </div>

        {isLoading && <p className="p-5 text-sm text-muted-foreground">Loading audit log...</p>}
        {isError && <p className="p-5 text-sm text-destructive">Failed to load audit log: {error?.message}</p>}
        {!isLoading && !isError && filteredEntries.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">No audit events recorded yet.</p>
        )}

        {!isLoading && !isError && filteredEntries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Timestamp</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Event Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Actor</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Target</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Domain</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0 cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-primary" title={getFullTimestamp(new Date(entry.createdAt))}>
                      {getRelativeTime(new Date(entry.createdAt))}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted">{entry.eventType}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm">{entry.actorName ?? entry.actorId ?? "System"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {entry.targetEntityType ? `${entry.targetEntityType}:${entry.targetEntityId}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{entry.domain}</td>
                    <td className="px-5 py-3.5">
                      {entry.status === "COMPLETE" ? (
                        <StatusBadge status="active">Complete</StatusBadge>
                      ) : (
                        <StatusBadge status="critical">{entry.status}</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-muted/30 flex justify-between px-5 py-3 items-center border-t border-border">
          <span className="text-xs text-muted-foreground">
            Showing {filteredEntries.length} of {totalLogs} entries
          </span>
          <span className="text-[10px] text-muted-foreground">
            Sentinel360 Audit Ledger
          </span>
        </div>
      </div>

      {/* Log Detail Dialog */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEntry(null)} />
          <div className="bg-background rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-border">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold">Log Entry Details</h3>
              <button onClick={() => setSelectedEntry(null)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Event ID</p>
                  <p className="text-sm font-mono">{selectedEntry.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                  <p className="text-sm">{selectedEntry.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Timestamp</p>
                  <p className="text-sm font-mono">{getFullTimestamp(new Date(selectedEntry.createdAt))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Domain</p>
                  <p className="text-sm">{selectedEntry.domain}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Event Type</p>
                  <p className="text-sm">{selectedEntry.eventType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Actor</p>
                  <p className="text-sm">{selectedEntry.actorName ?? selectedEntry.actorId ?? "System"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Target</p>
                  <p className="text-sm font-mono break-all">
                    {selectedEntry.targetEntityType ? `${selectedEntry.targetEntityType}:${selectedEntry.targetEntityId}` : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex justify-end">
              <button onClick={() => setSelectedEntry(null)} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
