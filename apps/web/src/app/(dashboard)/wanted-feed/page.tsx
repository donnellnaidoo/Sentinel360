"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const PRIORITY_STYLES: Record<string, { badge: string; match: string }> = {
  CRITICAL: { badge: "bg-error text-on-error", match: "text-primary" },
  HIGH: { badge: "bg-tertiary text-on-tertiary", match: "text-tertiary" },
  MEDIUM: { badge: "bg-primary text-on-primary", match: "text-primary" },
  LOW: { badge: "bg-surface text-on-surface border border-outline", match: "text-on-surface-variant" },
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=900&q=70";

function chargesOf(attributes: unknown): string[] {
  const attrs = (attributes && typeof attributes === "object" ? attributes : {}) as Record<string, unknown>;
  return Array.isArray(attrs.charges) ? attrs.charges.filter((c): c is string => typeof c === "string") : [];
}

function physicalDescriptionOf(attributes: unknown): string | undefined {
  const attrs = (attributes && typeof attributes === "object" ? attributes : {}) as Record<string, unknown>;
  return typeof attrs.physicalDescription === "string" ? attrs.physicalDescription : undefined;
}

export default function WantedFeedPage() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery(trpc.profiles.list.queryOptions({ limit: 100, offset: 0 }));
  const { data: watchlist } = useQuery(trpc.profiles.listWatchlist.queryOptions());

  const watchlistByProfile = useMemo(() => {
    const map = new Map<string, NonNullable<typeof watchlist>[number]>();
    for (const entry of watchlist ?? []) map.set(entry.entityProfileId, entry);
    return map;
  }, [watchlist]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.profiles.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.profiles.listWatchlist.queryKey() });
  };

  const updateProfile = useMutation(trpc.profiles.update.mutationOptions({ onSuccess: invalidate }));
  const removeFromWatchlist = useMutation(
    trpc.profiles.removeFromWatchlist.mutationOptions({ onSuccess: invalidate }),
  );

  const watchlisted = useMemo(() => {
    const items = (data?.items ?? []).filter((p) => p.watchlistStatus !== "NONE");
    return items.filter((p) => {
      if (priorityFilter && p.watchlistStatus !== priorityFilter) return false;
      if (search && !(p.displayName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, priorityFilter, search]);

  return (
    <div className="flex flex-col gap-stack-md">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Wanted Feed</h2>
          <p className="text-on-surface-variant text-body-md">Active watchlist entries across all monitored profiles.</p>
        </div>
        <Link
          href="/admin/profiles"
          className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:brightness-110 transition-all shadow-md"
        >
          <span className="material-symbols-outlined">person_add</span>
          Add Subject
        </Link>
      </div>

      <div className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant/30 flex flex-wrap gap-4 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="px-3 py-1.5 bg-surface rounded-lg border border-outline-variant text-body-sm flex-1 min-w-[200px] outline-none"
        />
        {[undefined, "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
          <button
            key={p ?? "all"}
            onClick={() => setPriorityFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors ${
              priorityFilter === p ? "bg-primary text-on-primary" : "bg-surface border border-outline-variant text-on-surface-variant"
            }`}
          >
            {p ?? "All"}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-on-surface-variant text-body-sm">Loading watchlist...</p>}
      {!isLoading && watchlisted.length === 0 && (
        <p className="text-on-surface-variant text-body-md py-12 text-center">
          No active watchlist entries match these filters.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
        {watchlisted.map((subject) => {
          const style = PRIORITY_STYLES[subject.watchlistStatus] ?? PRIORITY_STYLES.MEDIUM;
          const entry = watchlistByProfile.get(subject.id);
          const apprehended = subject.status === "INACTIVE";

          return (
            <div
              key={subject.id}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              <div className={`relative h-64 ${apprehended ? "grayscale" : ""}`}>
                <img
                  className="w-full h-full object-cover"
                  src={subject.primaryFaceImageUrl ?? FALLBACK_IMAGE}
                  alt={subject.displayName ?? "Unidentified subject"}
                />
                {apprehended ? (
                  <div className="absolute inset-0 bg-on-surface/40 flex items-center justify-center">
                    <span className="bg-surface text-on-surface font-label-caps px-3 py-1.5 rounded-full border border-outline shadow-xl">
                      RESOLVED
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`${style.badge} font-label-caps px-2 py-1 rounded`}>
                      {subject.watchlistStatus}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-white font-headline-md">{subject.displayName ?? "Unidentified subject"}</h3>
                  <p className="text-white/80 text-body-sm">{subject.entityType}</p>
                </div>
              </div>
              <div className="p-stack-md space-y-3">
                {entry && <p className="text-body-sm text-on-surface-variant">{entry.reason}</p>}
                {physicalDescriptionOf(subject.attributes) && (
                  <p className="text-body-sm text-on-surface-variant line-clamp-2">{physicalDescriptionOf(subject.attributes)}</p>
                )}
                {chargesOf(subject.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {chargesOf(subject.attributes).map((charge) => (
                      <span key={charge} className="bg-error/10 text-error text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        {charge}
                      </span>
                    ))}
                  </div>
                )}
                {!apprehended && (
                  <div className="pt-2 flex gap-3">
                    <button
                      disabled={updateProfile.isPending}
                      onClick={() => updateProfile.mutate({ id: subject.id, status: "INACTIVE" })}
                      className="flex-1 py-2 bg-primary-container text-on-primary-container rounded-lg font-medium hover:brightness-95 transition-all text-body-sm disabled:opacity-50"
                    >
                      Mark Resolved
                    </button>
                    <button
                      disabled={removeFromWatchlist.isPending}
                      onClick={() => {
                        if (entry) removeFromWatchlist.mutate({ id: entry.id });
                      }}
                      className="px-3 py-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-all"
                      title="Remove from watchlist"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant">flag</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
