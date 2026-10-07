"use client";

import Link from "next/link";

import { PriorityBadge, StatusBadge } from "@/components/case/StatusBadge";
import type { AvailableTransition } from "@/lib/case-status";
import { formatDateTime, formatRelative } from "@/lib/format";

import { useDocketNav, type DocketLink } from "../_lib/nav";
import { StatusStepper } from "./StatusStepper";

type CaseSummary = {
  caseNumber: string;
  title: string;
  caseType: string;
  status: string;
  priority: string;
  isSensitive: boolean;
  assignedToName: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Where to go to clear each blocking precondition.
function fixLinkFor(blockedReason: string): { label: string; link: DocketLink } | null {
  if (/investigator/i.test(blockedReason)) return { label: "Assign an investigator", link: { focus: "assign-investigator" } };
  if (/evidence/i.test(blockedReason)) return { label: "Upload evidence", link: { tab: "evidence", focus: "evidence-form" } };
  return null;
}

const BUTTON_STYLES = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "border border-outline-variant text-on-surface hover:bg-surface-container",
  destructive: "border border-error/50 text-error hover:bg-error-container/40",
} as const;

export function CaseHeader({
  c,
  transitions,
  onStartTransition,
}: {
  c: CaseSummary;
  transitions: AvailableTransition[];
  onStartTransition: (t: AvailableTransition) => void;
}) {
  const nav = useDocketNav();

  return (
    <header className="flex flex-col gap-stack-md">
      <nav aria-label="Breadcrumb">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          Cases
          <span aria-hidden="true" className="mx-1">/</span>
          <span className="text-on-surface font-medium">{c.caseNumber}</span>
        </Link>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <p className="font-label-caps text-primary uppercase">{c.caseType}</p>
          <h1 className="font-headline-xl text-headline-xl text-on-surface break-words">
            <span className="text-on-surface-variant font-semibold">{c.caseNumber}</span> · {c.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span id="case-status-chip" tabIndex={-1} className="focus:outline-none">
              <StatusBadge status={c.status} />
            </span>
            <PriorityBadge priority={c.priority} />
            {c.isSensitive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-error-container/60 text-on-error-container">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  lock
                </span>
                Sensitive
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant mt-2">
            Lead investigator:{" "}
            <span className="font-semibold text-on-surface">{c.assignedToName ?? "Not assigned"}</span>
            <span aria-hidden="true"> · </span>
            <span title={formatDateTime(c.createdAt)}>Opened {formatRelative(c.createdAt)}</span>
            <span aria-hidden="true"> · </span>
            <span title={formatDateTime(c.updatedAt)}>Updated {formatRelative(c.updatedAt)}</span>
          </p>
        </div>

        {transitions.length > 0 && (
          <div id="status-actions" className="flex flex-col gap-2 lg:items-end shrink-0">
            <div className="flex flex-wrap gap-2">
              {transitions.map((t) => (
                <button
                  key={t.to}
                  type="button"
                  aria-disabled={t.blockedReason ? true : undefined}
                  aria-describedby={t.blockedReason ? `blocked-${t.to}` : undefined}
                  onClick={() => {
                    if (!t.blockedReason) onStartTransition(t);
                  }}
                  className={`px-4 py-2 min-h-10 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    BUTTON_STYLES[t.kind]
                  } ${t.blockedReason ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {transitions
              .filter((t) => t.blockedReason)
              .map((t) => {
                const fix = fixLinkFor(t.blockedReason!);
                return (
                  <p key={t.to} id={`blocked-${t.to}`} className="text-xs text-on-surface-variant lg:text-right">
                    <span className="font-semibold">{t.label}:</span> {t.blockedReason}.{" "}
                    {fix && (
                      <button
                        type="button"
                        onClick={() => nav.navigate(fix.link)}
                        className="text-primary font-semibold hover:underline"
                      >
                        {fix.label}
                      </button>
                    )}
                  </p>
                );
              })}
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm">
        <StatusStepper status={c.status} />
      </div>
    </header>
  );
}
