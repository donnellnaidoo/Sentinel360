"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc/client";

const EVENT_ICON: Record<string, string> = {
  CASE_CREATED: "folder_open",
  STATUS_CHANGE: "sync_alt",
  NOTE_ADDED: "notes",
  INCIDENT_LINKED: "link",
  EVIDENCE_LINKED: "upload_file",
  CRIMINAL_LINKED: "person_add",
  CRIMINAL_UNLINKED: "person_remove",
  ARREST_RECORDED: "local_police",
  PROSECUTION_DECISION: "gavel",
  HEARING_SCHEDULED: "event",
  HEARING_OUTCOME_RECORDED: "event_available",
};

export function TimelineTab({ caseId, active }: { caseId: string; active: boolean }) {
  const timelineQuery = useQuery({
    ...trpc.cases.timeline.queryOptions({ caseId }),
    enabled: active,
  });

  return (
    <div className="space-y-3">
      {timelineQuery.isLoading && (
        <p className="text-sm text-on-surface-variant">Loading timeline...</p>
      )}
      {timelineQuery.data?.length === 0 && (
        <p className="text-sm text-on-surface-variant">No activity recorded yet.</p>
      )}
      {timelineQuery.data?.map((event) => (
        <div key={event.id} className="flex gap-3 items-start">
          <span className="material-symbols-outlined text-primary text-lg mt-0.5">
            {EVENT_ICON[event.eventType] ?? "circle"}
          </span>
          <div>
            <p className="text-xs text-on-surface-variant">
              {new Date(event.occurredAt).toLocaleString()} ·{" "}
              {event.eventType.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-on-surface leading-relaxed">{event.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
