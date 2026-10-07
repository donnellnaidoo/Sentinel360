"use client";

import { LIFECYCLE_STEPS, STATUS_LABELS, type CaseStatus } from "@/lib/case-status";

// Archived is an end state after Closed (retention), not a step every case
// must reach, so it's shown as a marker rather than a fifth circle.
export function StatusStepper({ status }: { status: string }) {
  const isArchived = status === "ARCHIVED";
  const effective = (isArchived ? "CLOSED" : status) as CaseStatus;
  const currentIndex = LIFECYCLE_STEPS.indexOf(effective);

  return (
    <div>
      {/* Phones: one line of text instead of a cramped row of circles. */}
      <p className="sm:hidden text-sm text-on-surface-variant">
        Step {currentIndex + 1} of {LIFECYCLE_STEPS.length}:{" "}
        <span className="font-semibold text-on-surface">{STATUS_LABELS[status as CaseStatus] ?? status}</span>
      </p>

      <ol aria-label="Case lifecycle" className="hidden sm:flex items-start w-full">
        {LIFECYCLE_STEPS.map((step, i) => {
          const isCompleted = currentIndex > i || (isArchived && i === currentIndex);
          const isCurrent = !isArchived && currentIndex === i;
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center gap-1.5 w-28">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold border-2 ${
                    isCurrent
                      ? "bg-primary text-on-primary border-primary shadow-md"
                      : isCompleted
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-surface-container-low text-on-surface-variant border-outline-variant"
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      check
                    </span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs text-center leading-tight ${
                    isCurrent ? "text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  {STATUS_LABELS[step]}
                  {isCompleted && <span className="sr-only"> (completed)</span>}
                  {isCurrent && <span className="sr-only"> (current step)</span>}
                </span>
              </div>
              {i < LIFECYCLE_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`flex-1 h-0.5 mx-1 mb-6 ${isCompleted ? "bg-primary/40" : "bg-outline-variant"}`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {isArchived && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full">
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            inventory_2
          </span>
          Archived — in long-term retention
        </p>
      )}
    </div>
  );
}
