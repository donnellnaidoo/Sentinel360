"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { type CaseStatus, STATUS_STYLES } from "@/lib/case-status";
import { queryClient, trpc } from "@/lib/trpc/client";

import { CourtTab } from "./_components/CourtTab";
import { EvidenceTab } from "./_components/EvidenceTab";
import { NextStepsPanel } from "./_components/NextStepsPanel";
import { NotesTab } from "./_components/NotesTab";
import { StatusStepper } from "./_components/StatusStepper";
import { SuspectsTab } from "./_components/SuspectsTab";
import { TimelineTab } from "./_components/TimelineTab";

// Mirrors packages/api/src/services/case-status.ts#ALLOWED_TRANSITIONS.
// Keep these two in sync — this only controls which buttons render; the
// backend transition guard is still the actual source of truth and will
// reject anything this misses.
const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  OPEN: ["UNDER_INVESTIGATION"],
  UNDER_INVESTIGATION: ["AWAITING_REVIEW"],
  AWAITING_REVIEW: ["CLOSED", "UNDER_INVESTIGATION"],
  CLOSED: ["UNDER_INVESTIGATION", "ARCHIVED"],
  ARCHIVED: ["UNDER_INVESTIGATION"],
};

const TRANSITION_BUTTON_LABELS: Record<CaseStatus, string> = {
  OPEN: "Reopen",
  UNDER_INVESTIGATION: "Start investigating",
  AWAITING_REVIEW: "Submit for review",
  CLOSED: "Close case",
  ARCHIVED: "Archive",
};

// Mirrors case-status.ts#getCaseStatusTransitionError's reason checks: a
// reason is mandatory closing (unless resolutionNotes already exist) or
// reopening from AWAITING_REVIEW/CLOSED/ARCHIVED. Kept here rather than
// just trusting the backend 400 because the placeholder text already
// promises this is required — the button should actually enforce it.
function isReasonRequired(from: CaseStatus, to: CaseStatus, hasResolutionNotes: boolean): boolean {
  if (to === "CLOSED") {
    return !hasResolutionNotes;
  }
  if (to === "UNDER_INVESTIGATION") {
    return from === "AWAITING_REVIEW" || from === "CLOSED" || from === "ARCHIVED";
  }
  return false;
}

const TABS = [
  { id: "notes", icon: "notes", label: "Notes" },
  { id: "evidence", icon: "upload_file", label: "Evidence" },
  { id: "suspects", icon: "person_search", label: "Suspects" },
  { id: "court", icon: "gavel", label: "Court & Prosecution" },
  { id: "timeline", icon: "timeline", label: "Timeline" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DocketPage() {
  const params = useParams();
  const caseId = params.docketId as string;
  const [activeTab, setActiveTab] = useState<TabId>("notes");
  const [statusTarget, setStatusTarget] = useState<CaseStatus | "">("");
  const [statusReason, setStatusReason] = useState("");
  const [assignTarget, setAssignTarget] = useState("");

  const caseQuery = useQuery(trpc.cases.getById.queryOptions({ id: caseId }));
  const evidenceQuery = useQuery(trpc.evidence.list.queryOptions({ caseId, limit: 50, offset: 0 }));
  const assignableQuery = useQuery(trpc.cases.listAssignableInvestigators.queryOptions());

  const updateStatus = useMutation(
    trpc.cases.updateStatus.mutationOptions({
      onSuccess: () => {
        setStatusTarget("");
        setStatusReason("");
        queryClient.invalidateQueries({ queryKey: trpc.cases.getById.queryKey({ id: caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.timeline.queryKey({ caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.nextActions.queryKey({ caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.list.queryKey() });
      },
    }),
  );

  const assignInvestigator = useMutation(
    trpc.cases.assignInvestigator.mutationOptions({
      onSuccess: () => {
        setAssignTarget("");
        queryClient.invalidateQueries({ queryKey: trpc.cases.getById.queryKey({ id: caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.timeline.queryKey({ caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.list.queryKey() });
      },
    }),
  );

  const toggleSensitive = useMutation(
    trpc.cases.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.cases.getById.queryKey({ id: caseId }) });
        queryClient.invalidateQueries({ queryKey: trpc.cases.list.queryKey() });
      },
    }),
  );

  if (caseQuery.isLoading) {
    return <div className="p-8 text-center text-on-surface-variant">Loading case...</div>;
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <div className="p-8 text-center text-error">
        Failed to load case: {caseQuery.error?.message ?? "Not found"}
      </div>
    );
  }

  const c = caseQuery.data;
  const reasonRequired = statusTarget
    ? isReasonRequired(c.status as CaseStatus, statusTarget, !!c.resolutionNotes)
    : false;

  return (
    <div className="flex flex-col gap-gutter">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors w-fit"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to Cases
      </Link>

      <section>
        <div>
          <span className="font-label-caps text-primary uppercase">{c.caseType}</span>
          <h2 className="font-headline-xl text-headline-xl">
            {c.caseNumber}: {c.title}
          </h2>
          <p className="text-on-surface-variant mt-1 flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLES[c.status as CaseStatus] ?? ""}`}
            >
              {c.status.replace(/_/g, " ")}
            </span>
            <span>Priority: {c.priority}</span>
            <span>· Opened {new Date(c.createdAt).toLocaleDateString()}</span>
          </p>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl p-stack-lg border border-outline-variant shadow-sm">
        <StatusStepper status={c.status} />

        <div className="flex flex-wrap items-center gap-3 mt-stack-lg pt-stack-md border-t border-outline-variant/30">
          {(ALLOWED_TRANSITIONS[c.status as CaseStatus] ?? []).map((next) => (
            <button
              key={next}
              onClick={() => setStatusTarget(statusTarget === next ? "" : next)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                statusTarget === next
                  ? "bg-primary text-on-primary border-primary"
                  : "border-outline-variant text-on-surface hover:bg-surface-container"
              }`}
            >
              {TRANSITION_BUTTON_LABELS[next]}
            </button>
          ))}

          {statusTarget && (
            <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <div className="flex items-center gap-3">
                <input
                  className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest flex-1"
                  placeholder={reasonRequired ? "Reason (required)" : "Reason (optional)"}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
                <button
                  disabled={updateStatus.isPending || (reasonRequired && !statusReason.trim())}
                  onClick={() =>
                    updateStatus.mutate({
                      id: caseId,
                      status: statusTarget,
                      reason: statusReason || undefined,
                    })
                  }
                  className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                >
                  {updateStatus.isPending ? "Saving..." : "Confirm"}
                </button>
              </div>
              {reasonRequired && !statusReason.trim() && (
                <p className="text-xs text-error">A reason is required for this transition.</p>
              )}
            </div>
          )}
        </div>

        {updateStatus.isError && (
          <div className="mt-3 p-3 bg-error-container text-on-error-container rounded-xl text-sm">
            {updateStatus.error.message}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-3 flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm">
            <h3 className="font-label-caps text-on-surface-variant mb-4">CASE INFO</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-on-surface-variant">Assigned</span>
                <span className="text-sm font-semibold">{c.assignedToName ?? "Unassigned"}</span>
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 min-w-0 border border-outline-variant rounded-lg px-2 py-1.5 text-xs bg-surface-container-low"
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                >
                  <option value="">{c.assignedToUserId ? "Reassign to..." : "Assign to..."}</option>
                  {assignableQuery.data?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                  {c.assignedToUserId && <option value="__unassign__">Unassign</option>}
                </select>
                <button
                  disabled={!assignTarget || assignInvestigator.isPending}
                  onClick={() =>
                    assignInvestigator.mutate({
                      caseId,
                      userId: assignTarget === "__unassign__" ? null : assignTarget,
                    })
                  }
                  className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold shrink-0 disabled:opacity-50"
                >
                  {assignInvestigator.isPending ? "..." : "Save"}
                </button>
              </div>
              {assignInvestigator.isError && (
                <p className="text-xs text-error">{assignInvestigator.error.message}</p>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-on-surface-variant">Last Updated</span>
                <span className="text-sm font-semibold">
                  {new Date(c.updatedAt).toLocaleString()}
                </span>
              </div>
              {c.closedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-on-surface-variant">Closed</span>
                  <span className="text-sm font-semibold">
                    {new Date(c.closedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <label className="flex items-center gap-2.5 pt-2 border-t border-outline-variant/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={c.isSensitive}
                  disabled={toggleSensitive.isPending}
                  onChange={(e) =>
                    toggleSensitive.mutate({ id: caseId, isSensitive: e.target.checked })
                  }
                />
                <span className="material-symbols-outlined text-base text-on-surface-variant">
                  lock
                </span>
                <span className="text-sm">Sensitive case</span>
              </label>
            </div>
          </div>

          <NextStepsPanel caseId={caseId} />

          <div className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm">
            <h3 className="font-label-caps text-on-surface-variant mb-4">EVIDENCE SUMMARY</h3>
            <div className="bg-surface-container-low p-2 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{evidenceQuery.data?.total ?? 0}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold">
                Files Linked
              </p>
            </div>
          </div>

          {c.description && (
            <div className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm flex-1">
              <h3 className="font-label-caps text-on-surface-variant mb-4">DESCRIPTION</h3>
              <p className="text-sm leading-relaxed">{c.description}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-9 flex flex-col gap-gutter">
          <section className="bg-surface-container-lowest rounded-2xl flex flex-col border border-outline-variant shadow-sm overflow-hidden">
            <div className="flex border-b border-outline-variant">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-8 py-4 flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "text-primary font-bold border-b-2 border-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  <span className="font-label-caps uppercase">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-stack-lg min-h-[300px]">
              {activeTab === "notes" && <NotesTab caseId={caseId} />}
              {activeTab === "evidence" && <EvidenceTab caseId={caseId} />}
              {activeTab === "suspects" && <SuspectsTab caseId={caseId} />}
              {activeTab === "court" && <CourtTab caseId={caseId} />}
              <div className={activeTab === "timeline" ? "" : "hidden"}>
                <TimelineTab caseId={caseId} active={activeTab === "timeline"} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
