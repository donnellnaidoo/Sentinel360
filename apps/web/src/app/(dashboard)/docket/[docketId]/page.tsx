"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";

import { getAvailableTransitions, type AvailableTransition } from "@/lib/case-status";
import { trpc } from "@/lib/trpc/client";
import { getErrorCode, getErrorMessage, isRestrictedCase } from "@/lib/trpc-errors";

import { ActivityTab } from "./_components/ActivityTab";
import { CaseDetailsPanel } from "./_components/CaseDetailsPanel";
import { CaseHeader } from "./_components/CaseHeader";
import { DocketTabs } from "./_components/DocketTabs";
import { EvidenceTab } from "./_components/EvidenceTab";
import { NextStepsPanel } from "./_components/NextStepsPanel";
import { NotesTab } from "./_components/NotesTab";
import { PeopleTab } from "./_components/PeopleTab";
import { ProsecutionTab } from "./_components/ProsecutionTab";
import { StatusChangeDialog } from "./_components/StatusChangeDialog";
import { EVIDENCE_LIST_INPUT } from "./_lib/invalidate";
import { DocketNavProvider } from "./_lib/nav";

export default function DocketPage() {
  // useSearchParams (tab state) needs a Suspense boundary in a client page.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocketNavProvider>
        <Docket />
      </DocketNavProvider>
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-gutter animate-pulse">
      <span className="sr-only">Loading case…</span>
      <div className="h-4 w-40 bg-surface-container-high rounded" />
      <div className="h-10 w-2/3 bg-surface-container-high rounded" />
      <div className="h-6 w-1/2 bg-surface-container-high rounded" />
      <div className="h-24 bg-surface-container-low rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 h-80 bg-surface-container-low rounded-xl" />
        <div className="lg:col-span-4 h-80 bg-surface-container-low rounded-xl" />
      </div>
    </div>
  );
}

function PageProblem({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="max-w-lg mx-auto mt-16 text-center flex flex-col items-center gap-3">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant" aria-hidden="true">
        {icon}
      </span>
      <h1 className="text-xl font-bold text-on-surface">{title}</h1>
      <p className="text-sm text-on-surface-variant">{body}</p>
      <Link
        href="/cases"
        className="mt-2 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">
          arrow_back
        </span>
        Back to cases
      </Link>
    </div>
  );
}

function Docket() {
  const caseId = useParams().docketId as string;
  const [pendingTransition, setPendingTransition] = useState<AvailableTransition | null>(null);

  const caseQuery = useQuery(trpc.cases.getById.queryOptions({ id: caseId }));
  const evidenceQuery = useQuery(trpc.evidence.list.queryOptions({ caseId, ...EVIDENCE_LIST_INPUT }));
  const peopleQuery = useQuery(trpc.cases.listCriminals.queryOptions({ caseId }));
  const arrestsQuery = useQuery(trpc.cases.listArrests.queryOptions({ caseId }));
  const hearingsQuery = useQuery(trpc.cases.listHearings.queryOptions({ caseId }));
  const nextActionsQuery = useQuery(trpc.cases.nextActions.queryOptions({ caseId }));

  if (caseQuery.isLoading) return <PageSkeleton />;

  if (caseQuery.isError || !caseQuery.data) {
    if (isRestrictedCase(caseQuery.error)) {
      return (
        <PageProblem
          icon="lock"
          title="This case is restricted"
          body="It's marked sensitive, so only its lead investigator and administrators can open it."
        />
      );
    }
    if (getErrorCode(caseQuery.error) === "NOT_FOUND") {
      return (
        <PageProblem
          icon="folder_off"
          title="Case not found"
          body="It may have been mistyped, or the link is out of date."
        />
      );
    }
    return (
      <PageProblem icon="error" title="This case couldn't be loaded" body={getErrorMessage(caseQuery.error)} />
    );
  }

  const c = caseQuery.data;
  const transitions = getAvailableTransitions(c, { evidenceCount: evidenceQuery.data?.total ?? 0 });
  const readyTransition = transitions.find((t) => t.kind === "primary" && !t.blockedReason) ?? null;

  const now = Date.now();
  const nextHearingAt =
    hearingsQuery.data
      ?.map((h) => new Date(h.scheduledAt))
      .filter((d) => d.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  const prosecutionCodes = new Set([
    "CONSIDER_ARREST",
    "SCHEDULE_FIRST_APPEARANCE",
    "AWAIT_PROSECUTION_DECISION",
    "REFER_TO_PROSECUTOR",
    "RECORD_HEARING_OUTCOME",
    "SCHEDULE_NEXT_HEARING",
  ]);
  const courtOverdue =
    nextActionsQuery.data?.filter((a) => a.severity === "overdue" && prosecutionCodes.has(a.code)).length ?? 0;

  return (
    <div className="flex flex-col gap-gutter max-w-container-max mx-auto w-full">
      <CaseHeader c={c} transitions={transitions} onStartTransition={setPendingTransition} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-gutter min-w-0">
          <NextStepsPanel
            caseId={caseId}
            status={c.status}
            readyTransition={readyTransition}
            onStartTransition={setPendingTransition}
          />
          <DocketTabs
            badges={{
              evidence: { count: evidenceQuery.data?.total ?? 0, srLabel: "evidence items" },
              people: { count: peopleQuery.data?.length ?? 0, srLabel: "linked people" },
              prosecution: { count: courtOverdue, tone: "alert", srLabel: "overdue items" },
            }}
            panels={{
              notes: <NotesTab caseId={caseId} />,
              evidence: <EvidenceTab caseId={caseId} />,
              people: <PeopleTab caseId={caseId} />,
              prosecution: <ProsecutionTab caseId={caseId} caseStatus={c.status} />,
              activity: <ActivityTab caseId={caseId} />,
            }}
          />
        </div>

        <aside className="lg:col-span-4 xl:col-span-3 order-first lg:order-none" aria-label="Case details">
          <CaseDetailsPanel
            c={c}
            counts={{
              evidence: evidenceQuery.data?.total,
              people: peopleQuery.data?.length,
              arrests: arrestsQuery.data?.length,
              nextHearingAt,
            }}
          />
        </aside>
      </div>

      <StatusChangeDialog
        caseId={caseId}
        fromStatus={c.status}
        existingResolutionNotes={c.resolutionNotes}
        transition={pendingTransition}
        onClose={() => {
          setPendingTransition(null);
          document.getElementById("case-status-chip")?.focus();
        }}
      />
    </div>
  );
}
