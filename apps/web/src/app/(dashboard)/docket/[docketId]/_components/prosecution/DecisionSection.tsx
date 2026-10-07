"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DECISION_LABELS, DECISION_OPTIONS, label, type ProsecutionDecision } from "@/lib/case-labels";
import { formatDateTime, fromDateTimeLocal, toDateTimeLocalValue } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage } from "@/lib/trpc-errors";

import { invalidateDocket } from "../../_lib/invalidate";
import { useDeepLinkFocus } from "../../_lib/nav";
import { Field, FormCard, FormError, inputClass, SubmitButton } from "../ui/Field";
import { QueryState } from "../ui/SectionState";

// What a decision usually means for the docket's status — offered as a
// pointer to the status buttons, never applied automatically.
function followUpFor(decision: ProsecutionDecision, caseStatus: string): string | null {
  if (decision === "FURTHER_INVESTIGATION" && caseStatus === "AWAITING_REVIEW") {
    return "The prosecutor wants more work done — use “Return to investigation” at the top of the case.";
  }
  if (decision === "DECLINE_TO_PROSECUTE" && caseStatus === "AWAITING_REVIEW") {
    return "With no prosecution, the case can usually be closed — use “Close case” at the top and record the reason.";
  }
  return null;
}

export function DecisionSection({ caseId, caseStatus }: { caseId: string; caseStatus: string }) {
  const decisionsQuery = useQuery(trpc.cases.listProsecutionDecisions.queryOptions({ caseId }));
  const [decision, setDecision] = useState<ProsecutionDecision | "">("");
  const [decidedAt, setDecidedAt] = useState(() => toDateTimeLocalValue(Date.now()));
  const [prosecutor, setProsecutor] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);

  useDeepLinkFocus("decision-form", true);

  const record = useMutation(
    trpc.cases.recordProsecutionDecision.mutationOptions({
      onSuccess: (_d, vars) => {
        toast.success(`NPA decision recorded: ${DECISION_LABELS[vars.decision]}`);
        setFollowUp(followUpFor(vars.decision, caseStatus));
        setDecision("");
        setProsecutor("");
        setReason("");
        setDecidedAt(toDateTimeLocalValue(Date.now()));
        setSubmitted(false);
        invalidateDocket(caseId, ["judicial"]);
      },
    }),
  );

  const nowLocal = toDateTimeLocalValue(Date.now());
  const errors = {
    decision: !decision ? "Choose the prosecutor's decision." : null,
    decidedAt: decidedAt && decidedAt > nowLocal ? "The decision date can't be in the future." : null,
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!decision || errors.decidedAt) return;
    record.mutate({
      caseId,
      decision,
      decidedAt: decidedAt ? fromDateTimeLocal(decidedAt) : undefined,
      prosecutorName: prosecutor.trim() || undefined,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <section id="court-decision" aria-labelledby="court-decision-heading" className="space-y-4 scroll-mt-24">
      <h3 id="court-decision-heading" className="font-label-caps text-on-surface-variant">
        PROSECUTION (NPA) DECISION
      </h3>

      {followUp && (
        <div role="status" className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 text-sm">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">
            lightbulb
          </span>
          <p className="flex-1">{followUp}</p>
          <button
            type="button"
            onClick={() => {
              setFollowUp(null);
              const actions = document.getElementById("status-actions");
              actions?.scrollIntoView({ behavior: "smooth", block: "center" });
              actions?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
            }}
            className="shrink-0 text-primary font-semibold hover:underline"
          >
            Go to status
          </button>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <FormCard
          id="decision-form"
          title="Record the prosecutor's decision"
          description="The charge decision the NPA took on the docket."
        >
          <fieldset aria-describedby={submitted && errors.decision ? "decision-error" : undefined}>
            <legend className="text-xs font-semibold text-on-surface-variant mb-1">
              Decision<span className="text-error ml-0.5" aria-hidden="true">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DECISION_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer ${
                    decision === o.value ? "border-primary bg-primary/5" : "border-outline-variant/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="npa-decision"
                    value={o.value}
                    checked={decision === o.value}
                    onChange={() => setDecision(o.value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className="block text-[11px] text-on-surface-variant">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {submitted && errors.decision && (
              <p id="decision-error" className="text-xs text-error mt-1">
                {errors.decision}
              </p>
            )}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Decided on" error={submitted ? errors.decidedAt : null} hint="South African time.">
              <input
                type="datetime-local"
                value={decidedAt}
                max={nowLocal}
                onChange={(e) => setDecidedAt(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Prosecutor">
              <input value={prosecutor} maxLength={200} onChange={(e) => setProsecutor(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Reasons given" count={{ value: reason.length, max: 2000 }}>
            <textarea rows={2} value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} className={inputClass} />
          </Field>

          <FormError message={record.isError ? getErrorMessage(record.error) : null} />
          <div>
            <SubmitButton pending={record.isPending} pendingLabel="Saving…">
              Record decision
            </SubmitButton>
          </div>
        </FormCard>
      </form>

      <QueryState
        query={decisionsQuery}
        loadingRows={1}
        isEmpty={(d) => d.length === 0}
        empty={<p className="text-sm text-on-surface-variant">No charge decision recorded yet.</p>}
      >
        {(decisions) => (
          <ul className="space-y-2">
            {decisions.map((d) => (
              <li key={d.id} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 text-sm">
                <p className="font-bold">{label(DECISION_LABELS, d.decision)}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {formatDateTime(d.decidedAt)}
                  {d.prosecutorName ? ` · ${d.prosecutorName}` : ""}
                </p>
                {d.reason && <p className="text-xs mt-1">{d.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  );
}
