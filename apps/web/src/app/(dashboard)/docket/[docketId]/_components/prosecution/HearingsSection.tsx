"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  BAIL_DECISION_LABELS,
  BAIL_SCHEDULE_LABELS,
  BAIL_SCHEDULE_OPTIONS,
  HEARING_TYPE_LABELS,
  HEARING_TYPE_OPTIONS,
  label,
  OUTCOME_LABELS,
  OUTCOME_OPTIONS,
  RESULT_OUTCOMES,
  type BailDecision,
  type BailSchedule,
  type HearingOutcome,
  type HearingType,
} from "@/lib/case-labels";
import { formatDateTime, formatRand, formatRelative, fromDateTimeLocal, toDateTimeLocalValue } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage, getFieldErrors } from "@/lib/trpc-errors";

import { invalidateDocket } from "../../_lib/invalidate";
import { useDeepLinkFocus } from "../../_lib/nav";
import { Field, FormCard, FormError, inputClass, SubmitButton } from "../ui/Field";
import { QueryState } from "../ui/SectionState";

type Hearing = {
  id: string;
  hearingType: string;
  scheduledAt: string | Date;
  courtName: string | null;
  caseRollNumber: string | null;
  presidingOfficer: string | null;
  outcomeType: string;
  outcomeNotes: string | null;
  nextHearingAt: string | Date | null;
  bailScheduleClassification: string | null;
  bailAmount: string | null;
  bailConditions: string | null;
  bailDecision: string | null;
};

function ScheduleHearingForm({ caseId, earliestArrestAt }: { caseId: string; earliestArrestAt: number | null }) {
  const [hearingType, setHearingType] = useState<HearingType>("FIRST_APPEARANCE");
  const [scheduledAt, setScheduledAt] = useState("");
  const [courtName, setCourtName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [presidingOfficer, setPresidingOfficer] = useState("");
  const [bailSchedule, setBailSchedule] = useState<BailSchedule>("NONE");
  const [bailAmount, setBailAmount] = useState("");
  const [bailConditions, setBailConditions] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // "What's next" links can preset the hearing type and date.
  useDeepLinkFocus("hearing-form", true, (nav) => {
    const type = nav.param("hearingType");
    if (type && type in HEARING_TYPE_LABELS) setHearingType(type as HearingType);
    const at = nav.param("scheduledAt");
    if (at) setScheduledAt(at);
  });

  const schedule = useMutation(
    trpc.cases.scheduleHearing.mutationOptions({
      onSuccess: (_d, vars) => {
        toast.success(`${HEARING_TYPE_LABELS[vars.hearingType]} scheduled for ${formatDateTime(vars.scheduledAt as Date)}`);
        setScheduledAt("");
        setCourtName("");
        setRollNumber("");
        setPresidingOfficer("");
        setBailAmount("");
        setBailConditions("");
        setSubmitted(false);
        invalidateDocket(caseId, ["judicial"]);
      },
    }),
  );
  const fieldErrors = getFieldErrors(schedule.error);
  const isBail = hearingType === "BAIL_HEARING";

  const dateError = submitted && !scheduledAt ? "Enter the hearing date and time." : null;
  const amountError = bailAmount && Number(bailAmount) < 0 ? "Bail can't be negative." : null;
  const lateFirstAppearance =
    hearingType === "FIRST_APPEARANCE" && scheduledAt && earliestArrestAt
      ? (fromDateTimeLocal(scheduledAt).getTime() - earliestArrestAt) / 3_600_000
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!scheduledAt || amountError) return;
    schedule.mutate({
      caseId,
      hearingType,
      scheduledAt: fromDateTimeLocal(scheduledAt),
      courtName: courtName.trim() || undefined,
      caseRollNumber: rollNumber.trim() || undefined,
      presidingOfficer: presidingOfficer.trim() || undefined,
      bailScheduleClassification: isBail ? bailSchedule : undefined,
      bailAmount: isBail && bailAmount ? Number(bailAmount) : undefined,
      bailConditions: isBail && bailConditions.trim() ? bailConditions.trim() : undefined,
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormCard id="hearing-form" title="Schedule a hearing">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Hearing type" required>
            <select value={hearingType} onChange={(e) => setHearingType(e.target.value as HearingType)} className={inputClass}>
              {HEARING_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date and time" required error={dateError ?? fieldErrors.scheduledAt} hint="South African time.">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Court">
            <input value={courtName} maxLength={300} onChange={(e) => setCourtName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Case roll number">
            <input value={rollNumber} maxLength={100} onChange={(e) => setRollNumber(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Presiding officer" className="sm:col-span-2">
            <input
              value={presidingOfficer}
              maxLength={200}
              onChange={(e) => setPresidingOfficer(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {lateFirstAppearance !== null && lateFirstAppearance > 48 && (
          <p className="flex items-start gap-1.5 text-xs text-tertiary font-semibold">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              warning
            </span>
            This is {Math.round(lateFirstAppearance)} hours after the arrest. s50 requires a first appearance within 48
            hours, or the next court day if that falls outside court hours.
          </p>
        )}

        {isBail && (
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-outline-variant/60">
            <legend className="text-xs font-semibold text-on-surface-variant px-1">Bail</legend>
            <Field
              label="Offence schedule"
              hint={BAIL_SCHEDULE_OPTIONS.find((o) => o.value === bailSchedule)?.hint}
            >
              <select value={bailSchedule} onChange={(e) => setBailSchedule(e.target.value as BailSchedule)} className={inputClass}>
                {BAIL_SCHEDULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bail amount (R)" error={amountError ?? fieldErrors.bailAmount}>
              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={bailAmount}
                onChange={(e) => setBailAmount(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Bail conditions" className="sm:col-span-2" count={{ value: bailConditions.length, max: 2000 }}>
              <textarea
                rows={2}
                value={bailConditions}
                maxLength={2000}
                onChange={(e) => setBailConditions(e.target.value)}
                className={inputClass}
              />
            </Field>
          </fieldset>
        )}

        <FormError message={schedule.isError ? getErrorMessage(schedule.error) : null} />
        <div>
          <SubmitButton pending={schedule.isPending} pendingLabel="Scheduling…">
            Schedule hearing
          </SubmitButton>
        </div>
      </FormCard>
    </form>
  );
}

function OutcomeEditor({ caseId, hearing, onDone }: { caseId: string; hearing: Hearing; onDone: () => void }) {
  const isPast = new Date(hearing.scheduledAt).getTime() <= Date.now();
  const [outcome, setOutcome] = useState<HearingOutcome>(
    hearing.outcomeType !== "PENDING" ? (hearing.outcomeType as HearingOutcome) : isPast ? "PROCEEDED" : "POSTPONED",
  );
  const [notes, setNotes] = useState(hearing.outcomeNotes ?? "");
  const [nextAt, setNextAt] = useState(hearing.nextHearingAt ? toDateTimeLocalValue(hearing.nextHearingAt) : "");
  const [bailDecision, setBailDecision] = useState<BailDecision | "">((hearing.bailDecision as BailDecision | null) ?? "");
  const [alsoSchedule, setAlsoSchedule] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const scheduleNext = useMutation(trpc.cases.scheduleHearing.mutationOptions());
  const save = useMutation(
    trpc.cases.recordHearingOutcome.mutationOptions({
      onSuccess: async (_d, vars) => {
        // Postponing means there is a next court date; create that hearing
        // now so it isn't left as an overdue "schedule the next hearing" step.
        if (vars.nextHearingAt && alsoSchedule) {
          try {
            await scheduleNext.mutateAsync({
              caseId,
              hearingType: hearing.hearingType as HearingType,
              scheduledAt: vars.nextHearingAt,
              courtName: hearing.courtName ?? undefined,
              caseRollNumber: hearing.caseRollNumber ?? undefined,
            });
          } catch (err) {
            toast.error(`Outcome saved, but the next hearing couldn't be scheduled: ${getErrorMessage(err)}`);
          }
        }
        toast.success(`Outcome recorded: ${OUTCOME_LABELS[vars.outcomeType]}`);
        invalidateDocket(caseId, ["judicial"]);
        onDone();
      },
    }),
  );

  const needsNext = outcome === "POSTPONED";
  const scheduledLocal = toDateTimeLocalValue(hearing.scheduledAt);
  const nextError = !needsNext
    ? null
    : !nextAt
      ? "A postponed hearing needs the next court date."
      : nextAt <= scheduledLocal
        ? "The next court date must be after this hearing."
        : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (nextError) return;
    save.mutate({
      id: hearing.id,
      outcomeType: outcome,
      outcomeNotes: notes.trim() || undefined,
      nextHearingAt: nextAt ? fromDateTimeLocal(nextAt) : undefined,
      bailDecision: hearing.hearingType === "BAIL_HEARING" && bailDecision ? bailDecision : undefined,
    });
  };

  return (
    <form
      id="hearing-outcome"
      tabIndex={-1}
      onSubmit={submit}
      noValidate
      className="mt-3 pt-3 border-t border-outline-variant/40 flex flex-col gap-3 focus:outline-none"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Outcome"
          required
          hint={
            !isPast
              ? "This hearing hasn't happened yet — only a postponement or withdrawal can be recorded now."
              : OUTCOME_OPTIONS.find((o) => o.value === outcome)?.hint
          }
        >
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as HearingOutcome)} className={inputClass}>
            {OUTCOME_OPTIONS.filter((o) => o.value !== "PENDING").map((o) => (
              <option key={o.value} value={o.value} disabled={!isPast && RESULT_OUTCOMES.includes(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Next court date"
          required={needsNext}
          error={submitted ? nextError : null}
          hint={needsNext ? undefined : "Only if the matter was remanded to another date."}
        >
          <input
            type="datetime-local"
            value={nextAt}
            min={scheduledLocal}
            onChange={(e) => setNextAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        {hearing.hearingType === "BAIL_HEARING" && (
          <Field label="Bail decision">
            <select value={bailDecision} onChange={(e) => setBailDecision(e.target.value as BailDecision | "")} className={inputClass}>
              <option value="">Not decided</option>
              {(Object.keys(BAIL_DECISION_LABELS) as BailDecision[]).map((d) => (
                <option key={d} value={d}>
                  {BAIL_DECISION_LABELS[d]}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {nextAt && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={alsoSchedule} onChange={(e) => setAlsoSchedule(e.target.checked)} />
          Also schedule the next {label(HEARING_TYPE_LABELS, hearing.hearingType).toLowerCase()} on that date
        </label>
      )}
      <Field label="Outcome notes" count={{ value: notes.length, max: 2000 }}>
        <textarea rows={2} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>
      <FormError message={save.isError ? getErrorMessage(save.error) : null} />
      <div className="flex gap-2">
        <SubmitButton pending={save.isPending || scheduleNext.isPending} pendingLabel="Saving…">
          Save outcome
        </SubmitButton>
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function HearingsSection({ caseId }: { caseId: string }) {
  const hearingsQuery = useQuery(trpc.cases.listHearings.queryOptions({ caseId }));
  const arrestsQuery = useQuery(trpc.cases.listArrests.queryOptions({ caseId }));
  const [editingId, setEditingId] = useState<string | null>(null);

  // "Record outcome" links open that hearing's editor directly.
  useDeepLinkFocus("hearing-outcome", !hearingsQuery.isLoading, (nav) => {
    const id = nav.param("hearingId");
    if (id) setEditingId(id);
  });

  const earliestArrestAt =
    (arrestsQuery.data ?? []).map((a) => new Date(a.arrestedAt).getTime()).sort((a, b) => a - b)[0] ?? null;

  return (
    <section id="court-hearings" aria-labelledby="court-hearings-heading" className="space-y-4 scroll-mt-24">
      <h3 id="court-hearings-heading" className="font-label-caps text-on-surface-variant">
        COURT HEARINGS
      </h3>
      <ScheduleHearingForm caseId={caseId} earliestArrestAt={earliestArrestAt} />

      <QueryState
        query={hearingsQuery}
        loadingRows={1}
        isEmpty={(h) => h.length === 0}
        empty={<p className="text-sm text-on-surface-variant">No hearings scheduled.</p>}
      >
        {(hearings) => (
          <ul className="space-y-2">
            {hearings.map((h) => {
              const isPast = new Date(h.scheduledAt).getTime() <= Date.now();
              const awaitingOutcome = h.outcomeType === "PENDING" && isPast;
              return (
                <li
                  key={h.id}
                  className={`p-4 rounded-xl border text-sm ${
                    awaitingOutcome ? "border-error/40 bg-error-container/20" : "border-outline-variant/40 bg-surface-container-low"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">
                        {label(HEARING_TYPE_LABELS, h.hearingType)}
                        <span className="font-normal text-on-surface-variant"> · {label(OUTCOME_LABELS, h.outcomeType)}</span>
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {formatDateTime(h.scheduledAt)} ({formatRelative(h.scheduledAt)})
                        {h.courtName ? ` · ${h.courtName}` : ""}
                        {h.caseRollNumber ? ` · roll ${h.caseRollNumber}` : ""}
                      </p>
                      {h.hearingType === "BAIL_HEARING" && (
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {label(BAIL_SCHEDULE_LABELS, h.bailScheduleClassification ?? "NONE")}
                          {h.bailAmount ? ` · ${formatRand(h.bailAmount)}` : ""}
                          {h.bailDecision ? ` · ${label(BAIL_DECISION_LABELS, h.bailDecision)}` : ""}
                        </p>
                      )}
                      {h.nextHearingAt && (
                        <p className="text-xs text-on-surface-variant mt-0.5">Next date: {formatDateTime(h.nextHearingAt)}</p>
                      )}
                      {h.outcomeNotes && <p className="text-xs mt-1">{h.outcomeNotes}</p>}
                      {awaitingOutcome && (
                        <p className="text-xs text-error font-semibold mt-1">This hearing has passed — record what happened.</p>
                      )}
                    </div>
                    {editingId !== h.id && (
                      <button
                        type="button"
                        onClick={() => setEditingId(h.id)}
                        className="shrink-0 px-3 py-1.5 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface transition-colors"
                      >
                        {h.outcomeType === "PENDING" ? "Record outcome" : "Update outcome"}
                      </button>
                    )}
                  </div>
                  {editingId === h.id && (
                    <OutcomeEditor key={h.id} caseId={caseId} hearing={h} onDone={() => setEditingId(null)} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </section>
  );
}
