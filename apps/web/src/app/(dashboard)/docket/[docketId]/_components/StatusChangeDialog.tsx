"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/case/StatusBadge";
import { statusLabel, type AvailableTransition } from "@/lib/case-status";
import { trpc } from "@/lib/trpc/client";
import { getErrorMessage } from "@/lib/trpc-errors";

import { invalidateDocket } from "../_lib/invalidate";
import { Dialog } from "./ui/Dialog";
import { Field, inputClass, SubmitButton } from "./ui/Field";

const REASON_MAX = 2000;

export function StatusChangeDialog({
  caseId,
  fromStatus,
  existingResolutionNotes,
  transition,
  onClose,
}: {
  caseId: string;
  fromStatus: string;
  existingResolutionNotes: string | null;
  transition: AvailableTransition | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  // Closing reuses resolution notes if a previous close wrote them.
  useEffect(() => {
    setReason(transition?.to === "CLOSED" ? (existingResolutionNotes ?? "") : "");
    setTouched(false);
  }, [transition, existingResolutionNotes]);

  const updateStatus = useMutation(
    trpc.cases.updateStatus.mutationOptions({
      onSuccess: (_data, vars) => {
        invalidateDocket(caseId, ["case", "notes", "list"]);
        toast.success(`Case is now ${statusLabel(vars.status).toLowerCase()}`);
        onClose();
      },
    }),
  );

  useEffect(() => {
    if (transition) updateStatus.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition]);

  if (!transition) return <Dialog open={false} onClose={onClose} title="" footer={null}>{null}</Dialog>;

  const missingReason = transition.reasonRequired && !reason.trim();
  const tooLong = reason.length > REASON_MAX;

  const submit = () => {
    setTouched(true);
    if (missingReason || tooLong) return;
    updateStatus.mutate({ id: caseId, status: transition.to, reason: reason.trim() || undefined });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={transition.label}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            onClick={submit}
            pending={updateStatus.isPending}
            pendingLabel="Saving…"
            variant={transition.kind === "destructive" ? "destructive" : "primary"}
          >
            {transition.label}
          </SubmitButton>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={fromStatus} />
        <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">
          arrow_forward
        </span>
        <span className="sr-only">to</span>
        <StatusBadge status={transition.to} />
      </div>
      {transition.consequence && <p className="text-sm text-on-surface-variant">{transition.consequence}</p>}

      <Field
        label={transition.reasonLabel.replace(" (optional)", "")}
        required={transition.reasonRequired}
        hint={transition.reasonRequired ? undefined : "Optional"}
        count={{ value: reason.length, max: REASON_MAX }}
        error={
          touched && missingReason
            ? `${transition.reasonLabel} is required for this change.`
            : tooLong
              ? `Keep this under ${REASON_MAX} characters.`
              : null
        }
      >
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          className={inputClass}
        />
      </Field>

      {updateStatus.isError && (
        <p role="alert" className="p-3 bg-error-container text-on-error-container rounded-xl text-sm">
          {getErrorMessage(updateStatus.error)}
        </p>
      )}
    </Dialog>
  );
}
