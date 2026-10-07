"use client";

import { useQuery } from "@tanstack/react-query";

import type { AvailableTransition } from "@/lib/case-status";
import { formatDateTime, formatRelative } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";

import { nextActionTarget } from "../_lib/next-action-targets";
import { useDocketNav } from "../_lib/nav";
import { SectionError, SectionLoading } from "./ui/SectionState";

const SEVERITY = {
  overdue: {
    label: "Overdue",
    icon: "priority_high",
    row: "border-error/40 bg-error-container/40",
    badge: "bg-error text-on-error",
    rank: 0,
  },
  attention: {
    label: "Needs attention",
    icon: "schedule",
    row: "border-tertiary/30 bg-tertiary/5",
    badge: "bg-tertiary/15 text-tertiary",
    rank: 1,
  },
  info: {
    label: "Suggested",
    icon: "lightbulb",
    row: "border-outline-variant bg-surface-container-low",
    badge: "bg-surface-container-high text-on-surface-variant",
    rank: 2,
  },
} as const;

function dueText(dueAt: Date | string, severity: keyof typeof SEVERITY): string {
  const relative = formatRelative(dueAt);
  const when = formatDateTime(dueAt);
  if (severity === "overdue") return `Overdue — was due ${relative} (${when})`;
  return `Due ${relative} (${when})`;
}

export function NextStepsPanel({
  caseId,
  status,
  readyTransition,
  onStartTransition,
}: {
  caseId: string;
  status: string;
  /** The forward status move, if every precondition for it is met. */
  readyTransition: AvailableTransition | null;
  onStartTransition: (t: AvailableTransition) => void;
}) {
  const nav = useDocketNav();
  const query = useQuery(trpc.cases.nextActions.queryOptions({ caseId }));

  const actions = [...(query.data ?? [])].sort((a, b) => {
    const bySeverity = SEVERITY[a.severity].rank - SEVERITY[b.severity].rank;
    if (bySeverity !== 0) return bySeverity;
    return (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);
  });
  const total = actions.length + (readyTransition ? 1 : 0);

  return (
    <section
      aria-labelledby="next-steps-heading"
      className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 id="next-steps-heading" className="font-label-caps text-on-surface-variant">
          WHAT&apos;S NEXT
        </h2>
        {!query.isLoading && !query.isError && (
          <span className="text-xs text-on-surface-variant">
            {total === 0 ? "All clear" : `${total} open`}
          </span>
        )}
      </div>

      {query.isLoading && <SectionLoading rows={2} label="Loading next steps…" />}
      {query.isError && <SectionError error={query.error} onRetry={() => void query.refetch()} />}

      {!query.isLoading && !query.isError && total === 0 && (
        <p className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">
            check_circle
          </span>
          {status === "ARCHIVED"
            ? "Archived cases have no outstanding steps."
            : "Nothing outstanding right now."}
        </p>
      )}

      <ul className="space-y-2">
        {readyTransition && (
          <li className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">
                task_alt
              </span>
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                  Ready
                </span>
                <p className="text-sm font-medium text-on-surface mt-1">
                  Everything needed is in place — {readyTransition.label.toLowerCase()}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onStartTransition(readyTransition)}
              className="shrink-0 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
            >
              {readyTransition.label}
            </button>
          </li>
        )}

        {actions.map((action) => {
          const sev = SEVERITY[action.severity];
          const { cta, link } = nextActionTarget(action);
          return (
            <li
              key={`${action.code}-${action.targetId ?? ""}`}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border ${sev.row}`}
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="material-symbols-outlined text-lg text-on-surface-variant" aria-hidden="true">
                  {sev.icon}
                </span>
                <div className="min-w-0">
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${sev.badge}`}>
                    {sev.label}
                  </span>
                  <p className="text-sm font-medium text-on-surface mt-1 leading-snug">{action.label}</p>
                  {action.dueAt && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{dueText(action.dueAt, action.severity)}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => nav.navigate(link)}
                aria-label={`${cta}: ${action.label}`}
                className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-primary hover:bg-surface-container"
              >
                {cta}
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
