"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { formatDateTime, formatRelative } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage } from "@/lib/trpc-errors";

import { invalidateDocket } from "../_lib/invalidate";
import { useDeepLinkFocus } from "../_lib/nav";
import { ConfirmDialog } from "./ui/Dialog";
import { Field, inputClass, SubmitButton } from "./ui/Field";

type CaseDetails = {
  id: string;
  status: string;
  description: string | null;
  resolutionNotes: string | null;
  isSensitive: boolean;
  assignedToUserId: string | null;
  assignedToName: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  closedAt: string | Date | null;
};

const UNASSIGN = "__unassign__";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-medium text-on-surface text-right">{children}</dd>
    </div>
  );
}

export function CaseDetailsPanel({
  c,
  counts,
}: {
  c: CaseDetails;
  counts: { evidence?: number; people?: number; arrests?: number; nextHearingAt?: Date | null };
}) {
  const [assignTarget, setAssignTarget] = useState("");
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [confirmSensitive, setConfirmSensitive] = useState<boolean | null>(null);
  // Phones only: the panel starts collapsed so the case work comes first.
  const [expanded, setExpanded] = useState(false);

  const assignableQuery = useQuery(trpc.cases.listAssignableInvestigators.queryOptions());
  // On phones the panel is collapsed; open it so the field is reachable.
  useDeepLinkFocus("assign-investigator", !assignableQuery.isLoading, () => setExpanded(true));

  // An investigator is required while the case is being worked, so offer
  // "unassign" only where the API allows it.
  const canUnassign = !!c.assignedToUserId && !["UNDER_INVESTIGATION", "AWAITING_REVIEW"].includes(c.status);
  const targetName =
    assignTarget === UNASSIGN ? null : assignableQuery.data?.find((u) => u.id === assignTarget)?.name;

  const assignInvestigator = useMutation(
    trpc.cases.assignInvestigator.mutationOptions({
      onSuccess: (data) => {
        setAssignTarget("");
        setConfirmAssign(false);
        invalidateDocket(c.id, ["case", "list"]);
        toast.success(data.assignedToName ? `${data.assignedToName} is now the lead investigator` : "Investigator unassigned");
      },
    }),
  );

  const updateCase = useMutation(
    trpc.cases.update.mutationOptions({
      onSuccess: (_d, vars) => {
        setConfirmSensitive(null);
        invalidateDocket(c.id, ["case", "list"]);
        toast.success(vars.isSensitive ? "Case marked sensitive" : "Sensitive restriction removed");
      },
    }),
  );

  const saveAssignment = () => {
    if (!assignTarget) return;
    // Reassigning or unassigning changes who owns the docket — confirm it.
    if (c.assignedToUserId) {
      setConfirmAssign(true);
      return;
    }
    assignInvestigator.mutate({ caseId: c.id, userId: assignTarget });
  };

  const body = (
    <div className="space-y-5">
      <div id="assign-investigator" tabIndex={-1} className="space-y-2 scroll-mt-24 focus:outline-none">
        <Field
          label="Lead investigator"
          hint={
            assignableQuery.isError
              ? getErrorMessage(assignableQuery.error)
              : assignableQuery.data?.length === 0
                ? "No eligible investigators. An administrator needs to grant someone the investigator role."
                : c.assignedToUserId
                  ? `Currently ${c.assignedToName ?? "assigned"}. Pick someone to reassign.`
                  : "Required before the investigation can start."
          }
        >
          <select
            value={assignTarget}
            onChange={(e) => setAssignTarget(e.target.value)}
            disabled={assignableQuery.isLoading || !assignableQuery.data?.length}
            className={inputClass}
          >
            <option value="">
              {assignableQuery.isLoading
                ? "Loading investigators…"
                : c.assignedToUserId
                  ? "Reassign to…"
                  : "Choose an investigator…"}
            </option>
            {assignableQuery.data
              ?.filter((u) => u.id !== c.assignedToUserId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            {canUnassign && <option value={UNASSIGN}>Remove lead investigator</option>}
          </select>
        </Field>
        <SubmitButton
          type="button"
          onClick={saveAssignment}
          disabled={!assignTarget}
          pending={assignInvestigator.isPending && !confirmAssign}
          pendingLabel="Saving…"
        >
          {c.assignedToUserId ? "Reassign" : "Assign"}
        </SubmitButton>
        {assignInvestigator.isError && !confirmAssign && (
          <p role="alert" className="text-xs text-error">
            {getErrorMessage(assignInvestigator.error)}
          </p>
        )}
      </div>

      <dl className="space-y-2 pt-4 border-t border-outline-variant/40">
        <DetailRow label="Opened">{formatDateTime(c.createdAt)}</DetailRow>
        <DetailRow label="Last updated">
          <span title={formatDateTime(c.updatedAt)}>{formatRelative(c.updatedAt)}</span>
        </DetailRow>
        {c.closedAt && <DetailRow label="Closed">{formatDateTime(c.closedAt)}</DetailRow>}
      </dl>

      <div className="pt-4 border-t border-outline-variant/40">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={c.isSensitive}
            onChange={(e) => setConfirmSensitive(e.target.checked)}
            aria-describedby="sensitive-hint"
          />
          <span>
            <span className="text-sm font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                lock
              </span>
              Sensitive case (POPIA)
            </span>
            <span id="sensitive-hint" className="block text-xs text-on-surface-variant mt-0.5">
              Only the lead investigator and administrators can open sensitive cases.
            </span>
          </span>
        </label>
      </div>

      <div className="pt-4 border-t border-outline-variant/40">
        <h3 className="font-label-caps text-on-surface-variant mb-2">AT A GLANCE</h3>
        <dl className="grid grid-cols-2 gap-2">
          {[
            { label: "Evidence", value: counts.evidence },
            { label: "People", value: counts.people },
            { label: "Arrests", value: counts.arrests },
            {
              label: "Next hearing",
              value: counts.nextHearingAt ? formatRelative(counts.nextHearingAt) : "None",
            },
          ].map((item) => (
            <div key={item.label} className="bg-surface-container-low rounded-lg p-2 text-center">
              <dd className="text-lg font-bold text-primary">{item.value ?? "—"}</dd>
              <dt className="text-[11px] text-on-surface-variant">{item.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {c.description && (
        <div className="pt-4 border-t border-outline-variant/40">
          <h3 className="font-label-caps text-on-surface-variant mb-2">DESCRIPTION</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.description}</p>
        </div>
      )}
      {c.resolutionNotes && (
        <div className="pt-4 border-t border-outline-variant/40">
          <h3 className="font-label-caps text-on-surface-variant mb-2">RESOLUTION NOTES</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.resolutionNotes}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <section
        aria-labelledby="case-details-heading"
        className="bg-surface-container-lowest rounded-xl p-stack-md border border-outline-variant shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 id="case-details-heading" className="font-label-caps text-on-surface-variant">
            CASE DETAILS
          </h2>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="case-details-body"
            className="lg:hidden inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            {expanded ? "Hide" : "Show"}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              {expanded ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>
        <div id="case-details-body" className={`${expanded ? "block" : "hidden"} lg:block mt-4`}>
          {body}
        </div>
      </section>

      <ConfirmDialog
        open={confirmAssign}
        title={assignTarget === UNASSIGN ? "Remove lead investigator?" : "Reassign this case?"}
        body={
          assignTarget === UNASSIGN ? (
            <>
              <strong>{c.assignedToName}</strong> will no longer lead this case, and it will have no investigator.
            </>
          ) : (
            <>
              The case moves from <strong>{c.assignedToName ?? "the current investigator"}</strong> to{" "}
              <strong>{targetName}</strong>. This is recorded in the case activity.
            </>
          )
        }
        confirmLabel={assignTarget === UNASSIGN ? "Remove" : "Reassign"}
        pendingLabel="Saving…"
        destructive={assignTarget === UNASSIGN}
        pending={assignInvestigator.isPending}
        error={assignInvestigator.isError ? getErrorMessage(assignInvestigator.error) : null}
        onConfirm={() =>
          assignInvestigator.mutate({ caseId: c.id, userId: assignTarget === UNASSIGN ? null : assignTarget })
        }
        onClose={() => {
          setConfirmAssign(false);
          assignInvestigator.reset();
        }}
      />

      <ConfirmDialog
        open={confirmSensitive !== null}
        title={confirmSensitive ? "Mark this case sensitive?" : "Remove the sensitive restriction?"}
        body={
          confirmSensitive ? (
            <>
              Only <strong>{c.assignedToName ?? "the lead investigator"}</strong> and administrators will be able to
              open this case. Other officers working it will lose access immediately.
            </>
          ) : (
            <>Every officer with case access will be able to open this case and its evidence again.</>
          )
        }
        confirmLabel={confirmSensitive ? "Mark sensitive" : "Remove restriction"}
        pendingLabel="Saving…"
        destructive={!confirmSensitive}
        pending={updateCase.isPending}
        error={updateCase.isError ? getErrorMessage(updateCase.error) : null}
        onConfirm={() => updateCase.mutate({ id: c.id, isSensitive: !!confirmSensitive })}
        onClose={() => {
          setConfirmSensitive(null);
          updateCase.reset();
        }}
      />
    </>
  );
}
