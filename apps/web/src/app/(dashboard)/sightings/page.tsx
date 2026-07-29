"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 12;

const STATUS_FILTERS = [
  { value: undefined, label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "REJECTED", label: "Rejected" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-tertiary-container/20 text-tertiary",
  APPROVED: "bg-secondary-container/20 text-secondary",
  DUPLICATE: "bg-surface-container text-on-surface-variant",
  REJECTED: "bg-error-container/20 text-error",
};

type Sighting = {
  id: string;
  referenceCode: string;
  description: string;
  moderationStatus: string;
  isAnonymous: boolean;
  visibility: string;
  mediaIds: string[];
  moderationReason: string | null;
  createdAt: string | Date;
};

export default function SightingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Sighting | null>(null);
  const [notes, setNotes] = useState("");

  const input = useMemo(
    () => ({ search: search || undefined, moderationStatus: status as never, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [search, status, page],
  );

  const { data, isLoading, isError, error } = useQuery(trpc.sightings.list.queryOptions(input));

  const verify = useMutation(
    trpc.sightings.verify.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.sightings.list.queryKey() });
        setSelected(null);
        setNotes("");
      },
    }),
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Community Sightings</h2>
          <p className="text-on-surface-variant font-body-md">Review queue for citizen-submitted sighting reports.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant flex-1 min-w-[240px]">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-body-sm w-full outline-none px-2"
            placeholder="Search by description or reference number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setStatus(f.value);
                setPage(0);
              }}
              className={`px-4 py-2 rounded-full text-body-sm font-medium transition-colors ${
                status === f.value
                  ? "bg-surface-container-high text-primary"
                  : "bg-surface hover:bg-surface-container-low text-on-surface-variant"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-on-surface-variant text-body-sm">Loading sightings...</p>}
      {isError && <p className="text-error text-body-sm">Failed to load sightings: {error?.message}</p>}
      {!isLoading && !isError && data?.items.length === 0 && (
        <p className="text-on-surface-variant text-body-md py-12 text-center">No sightings match these filters.</p>
      )}

      <div className="space-y-4">
        {data?.items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setSelected(item as Sighting);
              setNotes(item.moderationReason ?? "");
            }}
            className="w-full text-left bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all p-6 flex items-start justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-label-caps font-mono text-on-surface-variant">{item.referenceCode}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[item.moderationStatus] ?? "bg-surface-container"}`}>
                  {item.moderationStatus}
                </span>
                {item.isAnonymous && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container text-on-surface-variant">
                    Anonymous
                  </span>
                )}
                {Array.isArray(item.mediaIds) && item.mediaIds.length > 0 && (
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">photo_camera</span>
                )}
              </div>
              <p className="text-on-surface text-body-md line-clamp-2">{item.description}</p>
            </div>
            <span className="text-body-sm text-on-surface-variant whitespace-nowrap">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>

      {data && data.total > 0 && (
        <div className="mt-stack-lg flex items-center justify-between border-t border-outline-variant pt-stack-md">
          <p className="text-body-sm text-on-surface-variant">
            Showing <span className="font-bold text-on-surface">{data.items.length}</span> of{" "}
            <span className="font-bold text-on-surface">{data.total}</span> sightings
          </p>
          <div className="flex space-x-2">
            <button
              className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="px-4 py-2 text-on-surface-variant">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant disabled:opacity-30"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="bg-surface rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-outline-variant">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-semibold text-on-surface">{selected.referenceCode}</h3>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-surface-container rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-on-surface text-body-md whitespace-pre-wrap">{selected.description}</p>
              {verify.error && <p className="text-error text-body-sm">{verify.error.message}</p>}
              <div>
                <label className="text-label-caps text-on-surface-variant uppercase block mb-1.5">
                  Verification notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low min-h-[80px]"
                  placeholder="Optional notes for this decision..."
                />
              </div>
            </div>
            <div className="p-5 border-t border-outline-variant flex flex-wrap justify-end gap-2">
              <button
                disabled={verify.isPending}
                onClick={() => verify.mutate({ id: selected.id, decision: "REJECTED", notes })}
                className="px-4 py-2 text-sm font-medium text-error hover:bg-error-container/10 rounded-lg transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                disabled={verify.isPending}
                onClick={() => verify.mutate({ id: selected.id, decision: "DUPLICATE", notes })}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors disabled:opacity-50"
              >
                Mark Duplicate
              </button>
              <button
                disabled={verify.isPending}
                onClick={() => verify.mutate({ id: selected.id, decision: "APPROVED", notes })}
                className="px-5 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {verify.isPending ? "Saving..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
