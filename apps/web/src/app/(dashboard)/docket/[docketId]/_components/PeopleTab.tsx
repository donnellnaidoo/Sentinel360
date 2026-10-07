"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  ENTITY_TYPE_LABELS,
  label,
  LINKABLE_PERSON_ROLES,
  PERSON_ROLE_LABELS,
  type PersonRole,
} from "@/lib/case-labels";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage } from "@/lib/trpc-errors";

import { invalidateDocket } from "../_lib/invalidate";
import { useDeepLinkFocus } from "../_lib/nav";
import { ConfirmDialog } from "./ui/Dialog";
import { Field, FormCard, FormError, inputClass, SubmitButton } from "./ui/Field";
import { QueryState, SectionEmpty, SectionError } from "./ui/SectionState";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

type Linked = { id: string; entityProfileId: string; role: string; entityDisplayName: string | null };

function LinkPersonForm({ caseId, linked }: { caseId: string; linked: Linked[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [role, setRole] = useState<Exclude<PersonRole, "ARRESTED">>("SUSPECT");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const debounced = useDebounced(search.trim(), 250);

  useDeepLinkFocus("person-form", true);

  const searchQuery = useQuery({
    ...trpc.profiles.list.queryOptions({ search: debounced, limit: 8, offset: 0 }),
    enabled: debounced.length >= 2 && !selected,
  });

  const link = useMutation(
    trpc.cases.linkCriminal.mutationOptions({
      onSuccess: () => {
        toast.success(`${selected?.name ?? "Profile"} linked as ${PERSON_ROLE_LABELS[role].toLowerCase()}`);
        setSearch("");
        setSelected(null);
        setNotes("");
        setSubmitted(false);
        invalidateDocket(caseId, ["people"]);
      },
    }),
  );

  const duplicate = selected && linked.some((l) => l.entityProfileId === selected.id && l.role === role);
  const alsoLinkedAs = selected
    ? linked.filter((l) => l.entityProfileId === selected.id && l.role !== role).map((l) => label(PERSON_ROLE_LABELS, l.role))
    : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!selected || duplicate) return;
    link.mutate({ caseId, entityProfileId: selected.id, role, notes: notes.trim() || undefined });
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormCard
        id="person-form"
        title="Link a person"
        description="Add a suspect, person of interest, witness or victim from the profile register."
      >
        <Field
          label="Profile"
          required
          error={submitted && !selected ? "Search for and choose a profile." : null}
          hint={
            selected ? undefined : search.trim().length < 2 ? "Type at least 2 letters of a name to search." : undefined
          }
        >
          {selected ? (
            <div className="flex items-center justify-between gap-2 border border-primary rounded-xl px-3 py-2 bg-primary/5">
              <span className="text-sm font-semibold">{selected.name}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              aria-autocomplete="list"
              aria-controls="profile-results"
              className={inputClass}
            />
          )}
        </Field>

        {!selected && debounced.length >= 2 && (
          <div id="profile-results" aria-live="polite">
            {searchQuery.isLoading && <p className="text-xs text-on-surface-variant">Searching…</p>}
            {searchQuery.isError && <SectionError error={searchQuery.error} onRetry={() => void searchQuery.refetch()} />}
            {searchQuery.data?.items.length === 0 && (
              <p className="text-xs text-on-surface-variant">
                No profiles match “{debounced}”.{" "}
                <Link href="/admin/profiles" className="text-primary font-semibold hover:underline">
                  Create a profile
                </Link>{" "}
                first, then link it here.
              </p>
            )}
            {!!searchQuery.data?.items.length && (
              <ul role="listbox" aria-label="Matching profiles" className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                {searchQuery.data.items.map((p) => (
                  <li key={p.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => setSelected({ id: p.id, name: p.displayName ?? "Unnamed profile" })}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm border border-outline-variant/40 hover:bg-surface-container-lowest"
                    >
                      {p.displayName ?? "Unnamed profile"}
                      <span className="text-on-surface-variant"> · {label(ENTITY_TYPE_LABELS, p.entityType)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <fieldset>
          <legend className="text-xs font-semibold text-on-surface-variant mb-1">
            Role on this case<span className="text-error ml-0.5" aria-hidden="true">*</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LINKABLE_PERSON_ROLES.map((r) => (
              <label
                key={r.value}
                className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer ${
                  role === r.value ? "border-primary bg-primary/5" : "border-outline-variant/60"
                }`}
              >
                <input
                  type="radio"
                  name="person-role"
                  value={r.value}
                  checked={role === r.value}
                  onChange={() => setRole(r.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-[11px] text-on-surface-variant">{r.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {duplicate && (
          <p role="alert" className="text-xs text-error">
            {selected?.name} is already linked to this case as {PERSON_ROLE_LABELS[role].toLowerCase()}.
          </p>
        )}
        {!duplicate && alsoLinkedAs.length > 0 && (
          <p className="text-xs text-on-surface-variant">
            Note: {selected?.name} is already linked as {alsoLinkedAs.join(", ").toLowerCase()}.
          </p>
        )}

        <Field label="Notes" count={{ value: notes.length, max: 2000 }}>
          <textarea rows={2} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>

        <FormError message={link.isError ? getErrorMessage(link.error) : null} />
        <div>
          <SubmitButton pending={link.isPending} pendingLabel="Linking…" disabled={!!duplicate}>
            Link to case
          </SubmitButton>
        </div>
      </FormCard>
    </form>
  );
}

export function PeopleTab({ caseId }: { caseId: string }) {
  const peopleQuery = useQuery(trpc.cases.listCriminals.queryOptions({ caseId }));
  const arrestsQuery = useQuery(trpc.cases.listArrests.queryOptions({ caseId }));
  const [unlinkTarget, setUnlinkTarget] = useState<Linked | null>(null);

  const unlink = useMutation(
    trpc.cases.unlinkCriminal.mutationOptions({
      onSuccess: () => {
        toast.success(`${unlinkTarget?.entityDisplayName ?? "Profile"} unlinked`);
        setUnlinkTarget(null);
        invalidateDocket(caseId, ["people"]);
      },
    }),
  );

  const arrestCount = (profileId: string) => arrestsQuery.data?.filter((a) => a.entityProfileId === profileId).length ?? 0;

  return (
    <div className="space-y-6">
      <LinkPersonForm caseId={caseId} linked={peopleQuery.data ?? []} />

      <section aria-label="People linked to this case">
        <QueryState
          query={peopleQuery}
          isEmpty={(people) => people.length === 0}
          empty={
            <SectionEmpty
              icon="group"
              title="No one linked yet"
              body="Link suspects, witnesses and victims as they're identified. A linked suspect is needed before an arrest can be recorded."
            />
          }
        >
          {(people) => (
            <ul className="space-y-3">
              {people.map((p) => {
                const arrests = arrestCount(p.entityProfileId);
                return (
                  <li
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface">
                        {p.entityDisplayName ?? "Unnamed profile"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-high">
                          {label(PERSON_ROLE_LABELS, p.role)}
                        </span>
                        {arrests > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
                            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                              local_police
                            </span>
                            Arrested{arrests > 1 ? ` ×${arrests}` : ""}
                          </span>
                        )}
                        <span className="text-[11px] text-on-surface-variant">Linked {formatDateTime(p.linkedAt)}</span>
                      </div>
                      {p.notes && <p className="text-xs text-on-surface-variant mt-1">{p.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setUnlinkTarget(p)}
                      className="shrink-0 px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold hover:bg-surface transition-colors"
                    >
                      Unlink
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryState>
      </section>

      <ConfirmDialog
        open={!!unlinkTarget}
        title="Unlink this person?"
        body={
          <>
            <strong>{unlinkTarget?.entityDisplayName ?? "This profile"}</strong> will be removed from the case as{" "}
            {label(PERSON_ROLE_LABELS, unlinkTarget?.role).toLowerCase()}. The removal is recorded in the case activity.
            {unlinkTarget && arrestCount(unlinkTarget.entityProfileId) > 0 && (
              <span className="block mt-2 text-error font-semibold">
                This person has an arrest recorded on this case. The arrest record stays, but they will no longer
                appear as linked.
              </span>
            )}
          </>
        }
        confirmLabel="Unlink"
        pendingLabel="Unlinking…"
        destructive
        pending={unlink.isPending}
        error={unlink.isError ? getErrorMessage(unlink.error) : null}
        onConfirm={() => unlinkTarget && unlink.mutate({ id: unlinkTarget.id })}
        onClose={() => {
          setUnlinkTarget(null);
          unlink.reset();
        }}
      />
    </div>
  );
}
