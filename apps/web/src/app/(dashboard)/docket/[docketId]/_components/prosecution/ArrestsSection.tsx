"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  ARRESTABLE_ROLES,
  CUSTODY_LABELS,
  CUSTODY_OPTIONS,
  label,
  type CustodyStatus,
  type PersonRole,
} from "@/lib/case-labels";
import { formatDateTime, formatRelative, fromDateTimeLocal, toDateTimeLocalValue } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage, getFieldErrors } from "@/lib/trpc-errors";

import { invalidateDocket } from "../../_lib/invalidate";
import { useDeepLinkFocus, useDocketNav } from "../../_lib/nav";
import { Field, FormCard, FormError, inputClass, SubmitButton } from "../ui/Field";
import { QueryState, SectionEmpty } from "../ui/SectionState";

const FIRST_APPEARANCE_MS = 48 * 60 * 60 * 1000;

export function ArrestsSection({ caseId }: { caseId: string }) {
  const nav = useDocketNav();
  const peopleQuery = useQuery(trpc.cases.listCriminals.queryOptions({ caseId }));
  const arrestsQuery = useQuery(trpc.cases.listArrests.queryOptions({ caseId }));

  // Only suspects / persons of interest can be arrested — never a witness
  // or victim — and each profile once, even if linked under two roles.
  const eligible = [
    ...new Map(
      (peopleQuery.data ?? [])
        .filter((p) => ARRESTABLE_ROLES.includes(p.role as PersonRole))
        .map((p) => [p.entityProfileId, p]),
    ).values(),
  ];

  const [entityProfileId, setEntityProfileId] = useState("");
  const [arrestedAt, setArrestedAt] = useState("");
  const [rightsAt, setRightsAt] = useState("");
  const [custodyStatus, setCustodyStatus] = useState<CustodyStatus>("IN_CUSTODY");
  const [withWarrant, setWithWarrant] = useState(false);
  const [warrantNumber, setWarrantNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [justRecorded, setJustRecorded] = useState<{ name: string; dueBy: Date } | null>(null);

  useDeepLinkFocus("arrest-form", !peopleQuery.isLoading, () => {
    if (eligible.length === 1) setEntityProfileId(eligible[0]!.entityProfileId);
  });

  const record = useMutation(
    trpc.cases.recordArrest.mutationOptions({
      onSuccess: (_d, vars) => {
        const name = eligible.find((p) => p.entityProfileId === vars.entityProfileId)?.entityDisplayName ?? "Suspect";
        setJustRecorded({ name, dueBy: new Date(new Date(vars.arrestedAt as Date).getTime() + FIRST_APPEARANCE_MS) });
        toast.success(`Arrest of ${name} recorded`);
        setEntityProfileId("");
        setArrestedAt("");
        setRightsAt("");
        setWithWarrant(false);
        setWarrantNumber("");
        setAddress("");
        setNotes("");
        setSubmitted(false);
        invalidateDocket(caseId, ["judicial"]);
      },
    }),
  );
  const fieldErrors = getFieldErrors(record.error);

  const nowLocal = toDateTimeLocalValue(Date.now());
  const errors = {
    person: !entityProfileId ? "Choose who was arrested." : null,
    arrestedAt: !arrestedAt
      ? "Enter when the arrest took place."
      : arrestedAt > nowLocal
        ? "The arrest time can't be in the future."
        : null,
    rightsAt: rightsAt && arrestedAt && rightsAt < arrestedAt ? "Rights can't be explained before the arrest." : null,
  };
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    record.mutate({
      caseId,
      entityProfileId,
      arrestedAt: fromDateTimeLocal(arrestedAt),
      rightsInformedAt: rightsAt ? fromDateTimeLocal(rightsAt) : undefined,
      custodyStatus,
      withWarrant,
      warrantNumber: withWarrant && warrantNumber.trim() ? warrantNumber.trim() : undefined,
      location: address.trim() ? { address: address.trim() } : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <section id="court-arrests" aria-labelledby="court-arrests-heading" className="space-y-4 scroll-mt-24">
      <h3 id="court-arrests-heading" className="font-label-caps text-on-surface-variant">
        ARRESTS
      </h3>

      {justRecorded && (
        <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-tertiary/40 bg-tertiary/5">
          <p className="text-sm flex-1">
            <strong>{justRecorded.name}</strong> must appear in court by{" "}
            <strong>{formatDateTime(justRecorded.dueBy)}</strong> ({formatRelative(justRecorded.dueBy)}) — CPA s50.
          </p>
          <button
            type="button"
            onClick={() => {
              setJustRecorded(null);
              nav.navigate({ tab: "prosecution", focus: "hearing-form", params: { hearingType: "FIRST_APPEARANCE" } });
            }}
            className="shrink-0 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
          >
            Schedule first appearance
          </button>
        </div>
      )}

      {!peopleQuery.isLoading && eligible.length === 0 ? (
        <SectionEmpty
          icon="person_search"
          title="No suspect linked yet"
          body="An arrest can only be recorded for someone linked to this case as a suspect or person of interest."
          action={
            <button
              type="button"
              onClick={() => nav.navigate({ tab: "people", focus: "person-form" })}
              className="px-4 py-2 rounded-xl border border-outline-variant text-sm font-semibold text-primary hover:bg-surface-container"
            >
              Link a suspect
            </button>
          }
        />
      ) : (
        <form onSubmit={submit} noValidate>
          <FormCard
            id="arrest-form"
            title="Record an arrest"
            description="Recording an arrest starts the 48-hour first-appearance clock."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Person arrested" required error={show("person")} hint="Suspects and persons of interest on this case.">
                <select value={entityProfileId} onChange={(e) => setEntityProfileId(e.target.value)} className={inputClass}>
                  <option value="">Choose…</option>
                  {eligible.map((p) => (
                    <option key={p.entityProfileId} value={p.entityProfileId}>
                      {p.entityDisplayName ?? "Unnamed profile"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Custody status" required>
                <select
                  value={custodyStatus}
                  onChange={(e) => setCustodyStatus(e.target.value as CustodyStatus)}
                  className={inputClass}
                >
                  {CUSTODY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Arrested at" required error={show("arrestedAt") ?? fieldErrors.arrestedAt} hint="South African time.">
                <input
                  type="datetime-local"
                  value={arrestedAt}
                  max={nowLocal}
                  onChange={(e) => {
                    setArrestedAt(e.target.value);
                    if (!rightsAt) setRightsAt(e.target.value);
                  }}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Rights explained at"
                error={show("rightsAt") ?? fieldErrors.rightsInformedAt}
                hint="When the reason for arrest and the right to silence were explained (Constitution s35). Defaults to the arrest time."
              >
                <input
                  type="datetime-local"
                  value={rightsAt}
                  min={arrestedAt || undefined}
                  onChange={(e) => setRightsAt(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={withWarrant} onChange={(e) => setWithWarrant(e.target.checked)} />
                Arrested with a warrant
              </label>
              {withWarrant && (
                <Field label="Warrant number" className="sm:max-w-xs">
                  <input value={warrantNumber} maxLength={100} onChange={(e) => setWarrantNumber(e.target.value)} className={inputClass} />
                </Field>
              )}
            </div>

            <Field label="Place of arrest">
              <input value={address} maxLength={500} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Notes" count={{ value: notes.length, max: 2000 }}>
              <textarea rows={2} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
            </Field>

            <FormError message={record.isError ? getErrorMessage(record.error) : null} />
            <div>
              <SubmitButton pending={record.isPending} pendingLabel="Recording…">
                Record arrest
              </SubmitButton>
            </div>
          </FormCard>
        </form>
      )}

      <QueryState
        query={arrestsQuery}
        loadingRows={1}
        isEmpty={(a) => a.length === 0}
        empty={<p className="text-sm text-on-surface-variant">No arrests recorded.</p>}
      >
        {(arrests) => (
          <ul className="space-y-2">
            {arrests.map((a) => (
              <li key={a.id} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 text-sm">
                <p className="font-bold">
                  {a.entityDisplayName ?? "Suspect"} · {label(CUSTODY_LABELS, a.custodyStatus)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Arrested {formatDateTime(a.arrestedAt)} · {a.withWarrant ? `with warrant${a.warrantNumber ? ` ${a.warrantNumber}` : ""}` : "without warrant"}
                  {a.rightsInformedAt ? ` · rights explained ${formatDateTime(a.rightsInformedAt)}` : ""}
                </p>
                {a.notes && <p className="text-xs mt-1">{a.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}
