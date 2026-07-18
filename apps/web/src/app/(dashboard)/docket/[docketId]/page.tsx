"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

import { CourtTab } from "./_components/CourtTab";
import { EvidenceTab } from "./_components/EvidenceTab";
import { NextStepsPanel } from "./_components/NextStepsPanel";
import { NotesTab } from "./_components/NotesTab";
import { SuspectsTab } from "./_components/SuspectsTab";
import { TimelineTab } from "./_components/TimelineTab";

const STATUS_OPTIONS = [
  "OPEN",
  "UNDER_INVESTIGATION",
  "AWAITING_REVIEW",
  "CLOSED",
  "ARCHIVED",
] as const;

type CaseStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLES: Record<CaseStatus, string> = {
  OPEN: "bg-primary/10 text-primary",
  UNDER_INVESTIGATION: "bg-tertiary/10 text-tertiary",
  AWAITING_REVIEW: "bg-secondary/10 text-secondary",
  CLOSED: "bg-on-surface-variant/10 text-on-surface-variant",
  ARCHIVED: "bg-on-surface-variant/10 text-on-surface-variant",
};

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

  const caseQuery = useQuery(trpc.cases.getById.queryOptions({ id: caseId }));
  const evidenceQuery = useQuery(trpc.evidence.list.queryOptions({ caseId, limit: 50, offset: 0 }));

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

  return (
    <div className="flex flex-col gap-gutter">
      <section className="flex justify-between items-end">
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
        <div className="flex items-center gap-stack-md">
          <select
            className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            value={statusTarget}
            onChange={(e) => setStatusTarget(e.target.value as CaseStatus | "")}
          >
            <option value="">Change status...</option>
            {STATUS_OPTIONS.filter((s) => s !== c.status).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {statusTarget && (
            <>
              <input
                className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
                placeholder="Reason (required to close/reopen)"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
              <button
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    id: caseId,
                    status: statusTarget,
                    reason: statusReason || undefined,
                  })
                }
                className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateStatus.isPending ? "Saving..." : "Confirm"}
              </button>
            </>
          )}
        </div>
      </section>

      {updateStatus.isError && (
        <div className="p-3 bg-error-container text-on-error-container rounded-xl text-sm">
          {updateStatus.error.message}
        </div>
      )}

      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-3 flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm">
            <h3 className="font-label-caps text-on-surface-variant mb-4">CASE INFO</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-on-surface-variant">Assigned</span>
                <span className="text-sm font-semibold">{c.assignedToUserId ?? "Unassigned"}</span>
              </div>
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

        <div className="col-span-9 flex flex-col gap-gutter">
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
