"use client";

const STATUS_FLOW = ["OPEN", "UNDER_INVESTIGATION", "AWAITING_REVIEW", "CLOSED", "ARCHIVED"] as const;

const STEP_LABELS: Record<(typeof STATUS_FLOW)[number], string> = {
  OPEN: "Open",
  UNDER_INVESTIGATION: "Under Investigation",
  AWAITING_REVIEW: "Awaiting Review",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

// Purely visual — reads case-status.ts's forward flow as a linear progress
// bar. Reopen transitions (e.g. CLOSED -> UNDER_INVESTIGATION) still work
// via the buttons below this; the stepper just doesn't attempt to depict
// that as a "step back" since it renders the same 5 stops either way.
export function StatusStepper({ status }: { status: string }) {
  const currentIndex = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);

  return (
    <div className="flex items-start w-full">
      {STATUS_FLOW.map((step, i) => {
        const isCompleted = currentIndex > i;
        const isCurrent = currentIndex === i;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none last:w-auto">
            <div className="flex flex-col items-center gap-1.5 w-20">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold border-2 transition-all ${
                  isCurrent
                    ? "bg-primary text-on-primary border-primary shadow-md scale-110"
                    : isCompleted
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant"
                }`}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-base">check</span>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide text-center leading-tight ${
                  isCurrent ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${
                  isCompleted ? "bg-primary/40" : "bg-outline-variant"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
