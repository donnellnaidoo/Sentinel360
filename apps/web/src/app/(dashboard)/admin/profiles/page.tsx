"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const ENTITY_TYPES = ["PERSON", "VEHICLE", "OBJECT"] as const;
const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const watchlistStyles: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-600",
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

interface Profile {
  id: string;
  entityType: string;
  displayName: string | null;
  status: string;
  watchlistStatus: string;
  notes: string | null;
  updatedAt: string | Date;
}

export default function AdminProfilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [addForm, setAddForm] = useState({ entityType: ENTITY_TYPES[0] as string, displayName: "", notes: "" });
  const [watchlistForm, setWatchlistForm] = useState({ priorityLevel: PRIORITY_LEVELS[1] as string, reason: "" });

  const input = useMemo(
    () => ({ search: searchQuery || undefined, entityType: entityType as never, limit: 50, offset: 0 }),
    [searchQuery, entityType],
  );

  const { data, isLoading } = useQuery(trpc.profiles.list.queryOptions(input));
  const { data: watchlist } = useQuery(trpc.profiles.listWatchlist.queryOptions());

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.profiles.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.profiles.listWatchlist.queryKey() });
  };

  const createProfile = useMutation(
    trpc.profiles.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        setShowAddModal(false);
        setAddForm({ entityType: ENTITY_TYPES[0], displayName: "", notes: "" });
      },
    }),
  );

  const updateProfile = useMutation(
    trpc.profiles.update.mutationOptions({
      onSuccess: () => {
        invalidate();
        setSelected(null);
      },
    }),
  );

  const addToWatchlist = useMutation(
    trpc.profiles.addToWatchlist.mutationOptions({
      onSuccess: () => {
        invalidate();
        setSelected(null);
        setWatchlistForm({ priorityLevel: PRIORITY_LEVELS[1], reason: "" });
      },
    }),
  );

  const removeFromWatchlist = useMutation(
    trpc.profiles.removeFromWatchlist.mutationOptions({
      onSuccess: () => {
        invalidate();
        setSelected(null);
      },
    }),
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Suspect / Entity Profiles</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage criminal profiles, vehicles, and watchlist entries.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add Profile
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {[undefined, ...ENTITY_TYPES].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => setEntityType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                entityType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t ?? "All"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading profiles...</p>}
      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No profiles found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p as Profile)}
            className="text-left border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{p.displayName ?? "Unnamed profile"}</h3>
                <span className="inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted">{p.entityType}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${watchlistStyles[p.watchlistStatus] ?? watchlistStyles.NONE}`}>
                {p.watchlistStatus === "NONE" ? "Not watchlisted" : p.watchlistStatus}
              </span>
            </div>
            {p.notes && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.notes}</p>}
          </button>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="bg-background rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProfile.mutate({
                  entityType: addForm.entityType as never,
                  displayName: addForm.displayName || undefined,
                  notes: addForm.notes || undefined,
                });
              }}
            >
              <div className="p-6 space-y-4">
                {createProfile.error && <p className="text-sm text-destructive">{createProfile.error.message}</p>}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity Type</label>
                  <select
                    value={addForm.entityType}
                    onChange={(e) => setAddForm((f) => ({ ...f, entityType: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <input
                    value={addForm.displayName}
                    onChange={(e) => setAddForm((f) => ({ ...f, displayName: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
                  <textarea
                    value={addForm.notes}
                    onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProfile.isPending}
                  className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {createProfile.isPending ? "Creating..." : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="bg-background rounded-xl w-full max-w-lg shadow-2xl relative z-10 border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-semibold">{selected.displayName ?? "Unnamed profile"}</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                updateProfile.mutate({
                  id: selected.id,
                  displayName: (fd.get("displayName") as string) || undefined,
                  notes: (fd.get("notes") as string) || undefined,
                  status: fd.get("status") as never,
                });
              }}
            >
              <div className="p-6 space-y-4">
                {(updateProfile.error || addToWatchlist.error || removeFromWatchlist.error) && (
                  <p className="text-sm text-destructive">
                    {updateProfile.error?.message ?? addToWatchlist.error?.message ?? removeFromWatchlist.error?.message}
                  </p>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <input name="displayName" defaultValue={selected.displayName ?? ""} className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                  <select name="status" defaultValue={selected.status} className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm">
                    {(["ACTIVE", "INACTIVE", "MERGED"] as const).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
                  <textarea name="notes" defaultValue={selected.notes ?? ""} className="w-full border border-input bg-background rounded-lg px-3 py-2 text-sm min-h-[80px]" />
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Watchlist</p>
                  {selected.watchlistStatus === "NONE" ? (
                    <div className="flex gap-2">
                      <select
                        value={watchlistForm.priorityLevel}
                        onChange={(e) => setWatchlistForm((f) => ({ ...f, priorityLevel: e.target.value }))}
                        className="border border-input bg-background rounded-lg px-2 py-1.5 text-sm"
                      >
                        {PRIORITY_LEVELS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <input
                        placeholder="Reason"
                        value={watchlistForm.reason}
                        onChange={(e) => setWatchlistForm((f) => ({ ...f, reason: e.target.value }))}
                        className="flex-1 border border-input bg-background rounded-lg px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!watchlistForm.reason || addToWatchlist.isPending}
                        onClick={() =>
                          addToWatchlist.mutate({
                            entityProfileId: selected.id,
                            priorityLevel: watchlistForm.priorityLevel as never,
                            reason: watchlistForm.reason,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={removeFromWatchlist.isPending}
                      onClick={() => {
                        const entry = watchlist?.find((w) => w.entityProfileId === selected.id);
                        if (entry) removeFromWatchlist.mutate({ id: entry.id });
                      }}
                      className="text-xs text-destructive hover:underline font-medium"
                    >
                      Remove from watchlist ({selected.watchlistStatus})
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/30">
                <button type="button" onClick={() => setSelected(null)} className="px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
