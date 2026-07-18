"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const ROLE_OPTIONS = ["SUSPECT", "PERSON_OF_INTEREST", "WITNESS", "VICTIM", "ARRESTED"] as const;

function invalidateCaseCriminals(caseId: string) {
  queryClient.invalidateQueries({ queryKey: trpc.cases.listCriminals.queryKey({ caseId }) });
  queryClient.invalidateQueries({ queryKey: trpc.cases.timeline.queryKey({ caseId }) });
  queryClient.invalidateQueries({ queryKey: trpc.cases.nextActions.queryKey({ caseId }) });
}

export function SuspectsTab({ caseId }: { caseId: string }) {
  const [search, setSearch] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("SUSPECT");
  const [notes, setNotes] = useState("");

  const criminalsQuery = useQuery(trpc.cases.listCriminals.queryOptions({ caseId }));
  const profileSearchQuery = useQuery({
    ...trpc.profiles.list.queryOptions({ search, limit: 10, offset: 0 }),
    enabled: search.length > 1,
  });

  const linkCriminal = useMutation(
    trpc.cases.linkCriminal.mutationOptions({
      onSuccess: () => {
        setSearch("");
        setSelectedProfileId("");
        setNotes("");
        invalidateCaseCriminals(caseId);
      },
    }),
  );

  const unlinkCriminal = useMutation(
    trpc.cases.unlinkCriminal.mutationOptions({
      onSuccess: () => invalidateCaseCriminals(caseId),
    }),
  );

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline flex flex-col gap-3">
        <h5 className="text-body-lg font-bold">Link a suspect, witness, or victim</h5>
        <input
          className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
          placeholder="Search profiles by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedProfileId("");
          }}
        />
        {profileSearchQuery.data?.items.length ? (
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {profileSearchQuery.data.items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProfileId(p.id)}
                className={`text-left px-3 py-2 rounded-lg text-sm border ${
                  selectedProfileId === p.id
                    ? "border-primary bg-primary/10"
                    : "border-outline-variant/30 hover:bg-surface-container-lowest"
                }`}
              >
                {p.displayName ?? "Unnamed profile"} · {p.entityType}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <select
            className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLE_OPTIONS)[number])}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={!selectedProfileId || linkCriminal.isPending}
          onClick={() =>
            linkCriminal.mutate({
              caseId,
              entityProfileId: selectedProfileId,
              role,
              notes: notes || undefined,
            })
          }
          className="self-start px-8 py-2 bg-primary text-on-primary rounded-full text-sm font-bold disabled:opacity-50"
        >
          {linkCriminal.isPending ? "Linking..." : "Link to case"}
        </button>
      </div>

      {criminalsQuery.isLoading && (
        <p className="text-sm text-on-surface-variant">Loading linked profiles...</p>
      )}
      {criminalsQuery.data?.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          No suspects, witnesses, or victims linked to this case yet.
        </p>
      )}
      <div className="space-y-3">
        {criminalsQuery.data?.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between bg-surface-container-low p-4 rounded-xl border border-outline-variant/30"
          >
            <div>
              <p className="text-sm font-bold">
                {c.entityDisplayName ?? "Unnamed profile"}{" "}
                <span className="text-xs font-normal text-on-surface-variant">
                  · {c.role.replace(/_/g, " ")}
                </span>
              </p>
              {c.notes && <p className="text-xs text-on-surface-variant mt-1">{c.notes}</p>}
            </div>
            <button
              onClick={() => unlinkCriminal.mutate({ id: c.id })}
              disabled={unlinkCriminal.isPending}
              className="px-4 py-2 border border-outline rounded-xl text-sm font-semibold hover:bg-surface transition-colors disabled:opacity-50"
            >
              Unlink
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
