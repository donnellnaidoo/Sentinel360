"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

// AI detections wait for an officer to open a docket or dismiss them
// (packages/api/src/services/ai-review.ts). Repeats on the same camera are
// grouped into one incident, so the alert carries a detection count.
export type AiReviewDecision = "PENDING" | "DOCKETED" | "DISMISSED" | "AUTO";

export interface AiAlertInfo {
  incidentId: string | null;
  caseId: string | null;
  caseNumber: string | null;
  cameraId: string | null;
  confidence: number | null;
  view: string | null;
  experimental: boolean;
  detectionCount: number;
  lastDetectedAt: Date | null;
  decision: AiReviewDecision;
  dismissReason: string | null;
}

// Alerts raised by apps/ai via packages/api/src/services/ai-ingest.ts.
export function readAiAlert(alert: { sourceDomain: string | null; metadata?: unknown }): AiAlertInfo | null {
  if (alert.sourceDomain !== "ai_pipeline") return null;
  const metadata = (alert.metadata ?? {}) as Record<string, unknown>;
  const review = (metadata.review ?? {}) as Record<string, unknown>;
  const caseId = typeof metadata.caseId === "string" ? metadata.caseId : null;
  const decision =
    review.decision === "PENDING" || review.decision === "DOCKETED" || review.decision === "DISMISSED"
      ? review.decision
      : // Alerts from before review existed were docketed automatically.
        caseId
        ? "AUTO"
        : "PENDING";
  return {
    incidentId: typeof metadata.incidentId === "string" ? metadata.incidentId : null,
    caseId,
    caseNumber: typeof metadata.caseNumber === "string" ? metadata.caseNumber : null,
    cameraId: typeof metadata.cameraId === "string" ? metadata.cameraId : null,
    confidence:
      typeof metadata.maxConfidence === "number"
        ? metadata.maxConfidence
        : typeof metadata.confidence === "number"
          ? metadata.confidence
          : null,
    view: typeof metadata.view === "string" && metadata.view !== "Main" ? metadata.view : null,
    experimental: metadata.modelStatus === "experimental",
    detectionCount: typeof metadata.detectionCount === "number" ? metadata.detectionCount : 1,
    lastDetectedAt: typeof metadata.lastDetectedAt === "string" ? new Date(metadata.lastDetectedAt) : null,
    decision,
    dismissReason: typeof review.reason === "string" ? review.reason : null,
  };
}

const MAX_THUMBNAILS = 12;

// One image, fetched through a signed URL: each view is logged to the
// evidence's chain of custody.
function EvidenceThumbnail({ id, title }: { id: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const getUrl = useMutation(trpc.evidence.getDownloadUrl.mutationOptions({ onSuccess: (r) => setUrl(r.url) }));
  const { mutate } = getUrl;

  useEffect(() => {
    mutate({ id, purpose: "AI_REVIEW" });
  }, [id, mutate]);

  return (
    <figure className="w-28 shrink-0">
      <div className="h-28 w-28 rounded-lg bg-surface-container overflow-hidden flex items-center justify-center">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" title="Open full size">
            <img src={url} alt={title} className="h-28 w-28 object-cover" />
          </a>
        ) : (
          <span className="text-[10px] text-on-surface-variant">{getUrl.isError ? "Unavailable" : "Loading…"}</span>
        )}
      </div>
      <figcaption className="mt-1 text-[10px] text-on-surface-variant line-clamp-2">{title}</figcaption>
    </figure>
  );
}

export function AiReviewPanel({ ai }: { ai: AiAlertInfo }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");
  const incidentId = ai.incidentId;

  const review = useQuery({
    ...trpc.alerts.aiIncident.queryOptions({ incidentId: incidentId ?? "" }),
    enabled: open && incidentId !== null,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.alerts.list.queryKey() });
  const openDocket = useMutation(
    trpc.alerts.openAiDocket.mutationOptions({
      onSuccess: (result) => {
        refresh();
        router.push(`/docket/${result.case.id}`);
      },
    }),
  );
  const dismiss = useMutation(
    trpc.alerts.dismissAiIncident.mutationOptions({
      onSuccess: () => {
        setDismissing(false);
        refresh();
      },
    }),
  );

  if (ai.decision === "DOCKETED" || ai.decision === "AUTO") {
    return ai.caseId ? (
      <Link
        href={`/docket/${ai.caseId}`}
        className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
      >
        Open docket{ai.caseNumber && ` ${ai.caseNumber}`}
        <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_forward</span>
      </Link>
    ) : null;
  }

  if (ai.decision === "DISMISSED") {
    return (
      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-surface-container text-on-surface-variant">
        Dismissed as false alarm{ai.dismissReason && ` · ${ai.dismissReason}`}
      </span>
    );
  }

  if (!incidentId) return null;
  const evidence = review.data?.evidence ?? [];
  const shown = evidence.slice(-MAX_THUMBNAILS).reverse();
  const error = openDocket.error ?? dismiss.error;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3">
        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-tertiary-container/30 text-tertiary">
          Needs review
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
          aria-expanded={open}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            {open ? "expand_less" : "photo_library"}
          </span>
          {open ? "Hide captures" : "Review captures"}
        </button>
        <button
          type="button"
          disabled={openDocket.isPending}
          onClick={() => openDocket.mutate({ incidentId })}
          className="px-4 py-1.5 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {openDocket.isPending ? "Opening…" : "Open docket"}
        </button>
        <button
          type="button"
          onClick={() => setDismissing((v) => !v)}
          className="px-4 py-1.5 text-sm font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-surface-container"
        >
          Dismiss
        </button>
      </div>

      {dismissing && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            dismiss.mutate({ incidentId, reason: reason.trim() || undefined });
          }}
        >
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Why is this a false alarm? (optional, e.g. phone, not a knife)"
            className="flex-1 min-w-[220px] border border-outline-variant rounded-lg px-3 py-1.5 text-sm bg-surface-container-low"
          />
          <button
            type="submit"
            disabled={dismiss.isPending}
            className="px-4 py-1.5 text-sm font-medium bg-error text-on-error rounded-lg hover:bg-error/90 disabled:opacity-50"
          >
            {dismiss.isPending ? "Dismissing…" : "Confirm dismiss"}
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-error text-body-sm">{error.message}</p>}

      {open && (
        <div className="mt-4">
          {review.isLoading && <p className="text-body-sm text-on-surface-variant">Loading captures…</p>}
          {review.isError && <p className="text-body-sm text-error">Could not load captures: {review.error.message}</p>}
          {review.data && evidence.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">No images were captured for this detection.</p>
          )}
          {shown.length > 0 && (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {shown.map((item) => (
                  <EvidenceThumbnail key={item.id} id={item.id} title={item.title ?? "AI capture"} />
                ))}
              </div>
              {evidence.length > shown.length && (
                <p className="text-[11px] text-on-surface-variant">
                  Showing the latest {shown.length} of {evidence.length} captures. Open a docket to see them all.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
