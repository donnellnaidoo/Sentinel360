import { queryClient, trpc } from "@/lib/trpc/client";

// Shared by the page (counts, status rules) and EvidenceTab so react-query
// serves both from one request.
export const EVIDENCE_LIST_INPUT = { limit: 50, offset: 0 } as const;

type Scope = "case" | "notes" | "evidence" | "people" | "judicial" | "timeline" | "nextActions" | "list";

/**
 * One place that knows which docket queries a mutation can affect. Every
 * mutation refreshes "timeline" and "nextActions" too, because nearly all of
 * them write a timeline entry and change what the next step is.
 */
export function invalidateDocket(caseId: string, scopes: Scope[]) {
  const all = new Set<Scope>([...scopes, "timeline", "nextActions"]);
  const keys = {
    case: [trpc.cases.getById.queryKey({ id: caseId })],
    notes: [trpc.cases.listNotes.queryKey({ caseId })],
    evidence: [trpc.evidence.list.queryKey()],
    people: [trpc.cases.listCriminals.queryKey({ caseId })],
    judicial: [
      trpc.cases.listArrests.queryKey({ caseId }),
      trpc.cases.listHearings.queryKey({ caseId }),
      trpc.cases.listProsecutionDecisions.queryKey({ caseId }),
    ],
    timeline: [trpc.cases.timeline.queryKey({ caseId })],
    nextActions: [trpc.cases.nextActions.queryKey({ caseId })],
    list: [trpc.cases.list.queryKey()],
  } satisfies Record<Scope, unknown[]>;

  for (const scope of all) {
    for (const queryKey of keys[scope]) {
      void queryClient.invalidateQueries({ queryKey: queryKey as readonly unknown[] });
    }
  }
}
