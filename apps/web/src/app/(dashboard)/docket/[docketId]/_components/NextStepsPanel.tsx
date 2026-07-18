"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc/client";

const SEVERITY_STYLES: Record<string, string> = {
  overdue: "bg-error-container text-on-error-container",
  attention: "bg-secondary/10 text-secondary",
  info: "bg-surface-container-low text-on-surface-variant",
};

const SEVERITY_ICON: Record<string, string> = {
  overdue: "priority_high",
  attention: "schedule",
  info: "info",
};

export function NextStepsPanel({ caseId }: { caseId: string }) {
  const nextActionsQuery = useQuery(trpc.cases.nextActions.queryOptions({ caseId }));

  return (
    <div className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm">
      <h3 className="font-label-caps text-on-surface-variant mb-4">NEXT STEPS</h3>
      {nextActionsQuery.isLoading && (
        <p className="text-sm text-on-surface-variant">Loading...</p>
      )}
      {nextActionsQuery.data?.length === 0 && (
        <p className="text-sm text-on-surface-variant">Nothing outstanding right now.</p>
      )}
      <div className="space-y-2">
        {nextActionsQuery.data?.map((action, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
              SEVERITY_STYLES[action.severity] ?? SEVERITY_STYLES.info
            }`}
          >
            <span className="material-symbols-outlined text-sm mt-0.5">
              {SEVERITY_ICON[action.severity] ?? "info"}
            </span>
            <div>
              <p className="font-medium leading-snug">{action.label}</p>
              {action.dueAt && (
                <p className="opacity-80 mt-0.5">
                  {new Date(action.dueAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
