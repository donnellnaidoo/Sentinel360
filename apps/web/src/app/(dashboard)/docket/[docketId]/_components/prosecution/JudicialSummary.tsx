"use client";

import { useQuery } from "@tanstack/react-query";

import {
  BAIL_SCHEDULE_LABELS,
  CUSTODY_LABELS,
  DECISION_LABELS,
  HEARING_TYPE_LABELS,
  label,
  OUTCOME_LABELS,
} from "@/lib/case-labels";
import { formatDateTime } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";

import { SectionError, SectionLoading } from "../ui/SectionState";

type JudicialEvent = {
  id: string;
  at: Date;
  icon: string;
  title: string;
  detail?: string;
  citation: string;
  warning?: string;
};

const FIRST_APPEARANCE_HOURS = 48;

/**
 * Arrests, hearings and NPA decisions merged into one chronological record
 * with the legal provision each maps to, plus the two compliance checks the
 * data supports: rights explained on arrest, and the s50 first-appearance
 * window.
 */
export function JudicialSummary({ caseId }: { caseId: string }) {
  const arrestsQuery = useQuery(trpc.cases.listArrests.queryOptions({ caseId }));
  const hearingsQuery = useQuery(trpc.cases.listHearings.queryOptions({ caseId }));
  const decisionsQuery = useQuery(trpc.cases.listProsecutionDecisions.queryOptions({ caseId }));
  const queries = [arrestsQuery, hearingsQuery, decisionsQuery];

  const body = (() => {
    if (queries.some((q) => q.isLoading)) return <SectionLoading rows={2} label="Loading the judicial record…" />;
    const failed = queries.find((q) => q.isError);
    if (failed) return <SectionError error={failed.error} onRetry={() => queries.forEach((q) => void q.refetch())} />;

    const earliestArrestAt = (arrestsQuery.data ?? [])
      .map((a) => new Date(a.arrestedAt).getTime())
      .sort((a, b) => a - b)[0];

    const events: JudicialEvent[] = [
      ...(arrestsQuery.data ?? []).map((a) => ({
        id: `arrest-${a.id}`,
        at: new Date(a.arrestedAt),
        icon: "local_police",
        title: `Arrest — ${a.entityDisplayName ?? "Suspect"}`,
        detail: `${label(CUSTODY_LABELS, a.custodyStatus)} · ${a.withWarrant ? `with warrant${a.warrantNumber ? ` ${a.warrantNumber}` : ""}` : "without warrant"}`,
        citation: "Constitution s35(1) — right to be informed of the reason for arrest and right to silence",
        warning: a.rightsInformedAt ? undefined : "No time recorded for when rights were explained",
      })),
      ...(hearingsQuery.data ?? []).map((h) => {
        const isFirstAppearance = h.hearingType === "FIRST_APPEARANCE";
        let warning: string | undefined;
        if (isFirstAppearance && earliestArrestAt !== undefined) {
          const hours = (new Date(h.scheduledAt).getTime() - earliestArrestAt) / 3_600_000;
          if (hours > FIRST_APPEARANCE_HOURS) {
            warning = `Set ${Math.round(hours)} hours after arrest — check it falls within s50 (48 hours, or the next court day)`;
          }
        }
        return {
          id: `hearing-${h.id}`,
          at: new Date(h.scheduledAt),
          icon: "account_balance",
          title: `${label(HEARING_TYPE_LABELS, h.hearingType)} — ${label(OUTCOME_LABELS, h.outcomeType)}`,
          detail: h.courtName ?? undefined,
          citation:
            h.hearingType === "BAIL_HEARING"
              ? `Bail: ${label(BAIL_SCHEDULE_LABELS, h.bailScheduleClassification ?? "NONE")}`
              : isFirstAppearance
                ? "CPA s50 — first appearance within 48 hours of arrest"
                : "Criminal Procedure Act 51 of 1977",
          warning,
        };
      }),
      ...(decisionsQuery.data ?? []).map((d) => ({
        id: `decision-${d.id}`,
        at: new Date(d.decidedAt),
        icon: "policy",
        title: `NPA decision — ${label(DECISION_LABELS, d.decision)}`,
        detail: d.prosecutorName ?? undefined,
        citation: "National Prosecuting Authority Act 32 of 1998",
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    if (events.length === 0) {
      return (
        <p className="text-sm text-on-surface-variant">
          Nothing recorded yet. Recording an arrest starts the 48-hour clock for the first court appearance.
        </p>
      );
    }

    return (
      <ol className="relative border-l-2 border-outline-variant/40 ml-3 space-y-5">
        {events.map((e) => (
          <li key={e.id} className="relative ml-6">
            <span className="absolute -left-[37px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                {e.icon}
              </span>
            </span>
            <p className="text-sm font-bold">{e.title}</p>
            <p className="text-xs text-on-surface-variant">
              {formatDateTime(e.at)}
              {e.detail ? ` · ${e.detail}` : ""}
            </p>
            <p className="text-[11px] text-primary/80 italic mt-0.5">{e.citation}</p>
            {e.warning && (
              <p className="text-xs text-error font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  warning
                </span>
                <span className="sr-only">Warning: </span>
                {e.warning}
              </p>
            )}
          </li>
        ))}
      </ol>
    );
  })();

  return (
    <section id="court-summary" aria-labelledby="court-summary-heading" className="scroll-mt-24">
      <h3 id="court-summary-heading" className="font-label-caps text-on-surface-variant mb-4">
        JUDICIAL RECORD
      </h3>
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant">{body}</div>
    </section>
  );
}
