"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-center">
      <p className="text-2xl font-bold text-primary">{count}</p>
      <p className="text-[10px] text-on-surface-variant uppercase font-bold mt-1">{label}</p>
    </div>
  );
}

const DELETION_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-secondary/10 text-secondary",
  APPROVED: "bg-primary/10 text-primary",
  COMPLETED: "bg-primary/10 text-primary",
  REJECTED: "bg-error-container text-on-error-container",
};

export default function MyDataPage() {
  const [deletionReason, setDeletionReason] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const myDataQuery = useQuery(trpc.popia.myData.queryOptions());

  const giveConsent = useMutation(
    trpc.popia.giveConsent.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.popia.myData.queryKey() }),
    }),
  );

  const requestDeletion = useMutation(
    trpc.popia.requestDeletion.mutationOptions({
      onSuccess: () => {
        setDeletionReason("");
        queryClient.invalidateQueries({ queryKey: trpc.popia.myData.queryKey() });
      },
    }),
  );

  if (myDataQuery.isLoading) {
    return <p className="text-sm text-on-surface-variant">Loading your data...</p>;
  }

  if (myDataQuery.isError || !myDataQuery.data) {
    return (
      <div className="p-8 text-center text-error">
        Failed to load your data: {myDataQuery.error?.message ?? "Unknown error"}
      </div>
    );
  }

  const d = myDataQuery.data;
  const pendingDeletion = d.deletionRequests.some((r) => r.status === "PENDING");

  return (
    <div className="max-w-3xl mx-auto w-full space-y-gutter">
      <div>
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">My Data</h2>
        <p className="text-on-surface-variant font-body-md text-body-md">
          Everything Sentinel360 holds about your account — a POPIA Subject Access Request (s23),
          self-service.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-stack-lg border border-outline-variant shadow-sm">
        <h3 className="font-label-caps text-on-surface-variant mb-4">Consent (POPIA s11)</h3>
        {d.popiaConsentAt ? (
          <p className="text-sm">
            Consent recorded on{" "}
            <span className="font-bold">{new Date(d.popiaConsentAt).toLocaleString()}</span>.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-error">
              No consent on record — your account predates consent capture at registration.
            </p>
            <button
              onClick={() => giveConsent.mutate()}
              disabled={giveConsent.isPending}
              className="px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {giveConsent.isPending ? "Recording..." : "Give Consent Now"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-stack-lg border border-outline-variant shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-label-caps text-on-surface-variant">Data Summary</h3>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs font-bold text-primary hover:underline"
          >
            {showRaw ? "Hide raw export" : "View raw export"}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Cases Reported" count={d.casesReported.length} />
          <StatCard label="Cases Assigned" count={d.casesAssigned.length} />
          <StatCard label="Notes Authored" count={d.notesAuthored.length} />
          <StatCard label="Sightings Submitted" count={d.sightingsSubmitted.length} />
          <StatCard label="Timeline Actions" count={d.timelineActions.length} />
          <StatCard label="Deletion Requests" count={d.deletionRequests.length} />
        </div>
        {showRaw && (
          <pre className="mt-4 p-4 bg-surface-container-low rounded-lg text-[11px] overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(d, null, 2)}
          </pre>
        )}
        <p className="text-xs text-on-surface-variant mt-4">
          Exported {new Date(d.exportedAt).toLocaleString()}
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-stack-lg border border-outline-variant shadow-sm">
        <h3 className="font-label-caps text-on-surface-variant mb-4">
          Request Deletion (POPIA s24)
        </h3>
        <p className="text-xs text-on-surface-variant mb-3">
          A request is reviewed by an administrator, not applied automatically — cases, evidence,
          and audit records you're linked to are retained where required by law (CPA 51/1977
          evidentiary retention), even if your account is anonymized.
        </p>
        {pendingDeletion ? (
          <p className="text-sm text-secondary font-semibold">
            You already have a pending deletion request awaiting review.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Reason (optional)"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
            />
            <button
              onClick={() =>
                requestDeletion.mutate({ reason: deletionReason || undefined })
              }
              disabled={requestDeletion.isPending}
              className="self-start px-6 py-2.5 bg-error text-on-error rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {requestDeletion.isPending ? "Submitting..." : "Request Deletion"}
            </button>
          </div>
        )}

        {d.deletionRequests.length > 0 && (
          <div className="mt-5 space-y-2">
            {d.deletionRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 text-xs"
              >
                <span>{new Date(r.createdAt).toLocaleString()}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${DELETION_STATUS_STYLES[r.status] ?? ""}`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
