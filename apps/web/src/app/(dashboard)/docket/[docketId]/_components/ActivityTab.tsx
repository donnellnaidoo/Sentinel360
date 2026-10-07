"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { TIMELINE_EVENTS } from "@/lib/case-labels";
import { formatDateTime, formatRelative, humanizeEnum } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";

import { QueryState, SectionEmpty } from "./ui/SectionState";

const FILTERS: Array<{ id: string; label: string; events: string[] | null }> = [
  { id: "all", label: "All", events: null },
  { id: "status", label: "Status & assignment", events: ["CASE_CREATED", "STATUS_CHANGE", "INVESTIGATOR_ASSIGNED", "INVESTIGATOR_UNASSIGNED", "SENSITIVITY_CHANGED"] },
  { id: "investigation", label: "Investigation", events: ["NOTE_ADDED", "EVIDENCE_LINKED", "INCIDENT_LINKED", "CRIMINAL_LINKED", "CRIMINAL_UNLINKED"] },
  { id: "court", label: "Court", events: ["ARREST_RECORDED", "PROSECUTION_DECISION", "HEARING_SCHEDULED", "HEARING_OUTCOME_RECORDED"] },
];

export function ActivityTab({ caseId }: { caseId: string }) {
  const [filter, setFilter] = useState("all");
  const timelineQuery = useQuery(trpc.cases.timeline.queryOptions({ caseId }));
  const active = FILTERS.find((f) => f.id === filter)!;

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter activity" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <QueryState
        query={timelineQuery}
        loadingRows={5}
        isEmpty={(events) => events.length === 0}
        empty={<SectionEmpty icon="history" title="No activity recorded yet" />}
      >
        {(events) => {
          const shown = active.events ? events.filter((e) => active.events!.includes(e.eventType)) : events;
          if (shown.length === 0) {
            return <p className="text-sm text-on-surface-variant">Nothing in this category yet.</p>;
          }
          return (
            <ol className="relative border-l-2 border-outline-variant/40 ml-3 space-y-5">
              {shown.map((event) => {
                const meta = TIMELINE_EVENTS[event.eventType] ?? { label: humanizeEnum(event.eventType), icon: "circle" };
                return (
                  <li key={event.id} className="relative ml-6">
                    <span className="absolute -left-[37px] top-0 flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-high text-primary">
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                        {meta.icon}
                      </span>
                    </span>
                    <p className="text-sm font-semibold text-on-surface">{meta.label}</p>
                    <p className="text-sm text-on-surface leading-relaxed">{event.summary}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {event.actorName ?? "System"} ·{" "}
                      <time dateTime={new Date(event.occurredAt).toISOString()} title={formatDateTime(event.occurredAt)}>
                        {formatRelative(event.occurredAt)} · {formatDateTime(event.occurredAt)}
                      </time>
                    </p>
                  </li>
                );
              })}
            </ol>
          );
        }}
      </QueryState>
    </div>
  );
}
