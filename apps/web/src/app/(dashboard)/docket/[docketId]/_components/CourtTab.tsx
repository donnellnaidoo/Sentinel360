"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { queryClient, trpc } from "@/lib/trpc/client";

const CUSTODY_OPTIONS = [
  "IN_CUSTODY",
  "RELEASED_ON_BAIL",
  "RELEASED_NO_CHARGE",
  "ESCAPED",
] as const;

const DECISION_OPTIONS = [
  "PROCEED_TO_TRIAL",
  "DECLINE_TO_PROSECUTE",
  "DIVERSION",
  "FURTHER_INVESTIGATION",
  "PLEA_BARGAIN",
] as const;

const HEARING_TYPE_OPTIONS = [
  "FIRST_APPEARANCE",
  "BAIL_HEARING",
  "PRE_TRIAL",
  "PLEA",
  "TRIAL",
  "SENTENCING",
  "APPEAL",
  "POSTPONEMENT",
] as const;

const OUTCOME_OPTIONS = [
  "PENDING",
  "POSTPONED",
  "PROCEEDED",
  "GUILTY",
  "NOT_GUILTY",
  "SENTENCED",
  "WITHDRAWN",
  "STRUCK_OFF_ROLL",
] as const;

const BAIL_SCHEDULE_OPTIONS = ["NONE", "SCHEDULE_1", "SCHEDULE_5", "SCHEDULE_6"] as const;

function invalidateCase(caseId: string) {
  queryClient.invalidateQueries({ queryKey: trpc.cases.listArrests.queryKey({ caseId }) });
  queryClient.invalidateQueries({
    queryKey: trpc.cases.listProsecutionDecisions.queryKey({ caseId }),
  });
  queryClient.invalidateQueries({ queryKey: trpc.cases.listHearings.queryKey({ caseId }) });
  queryClient.invalidateQueries({ queryKey: trpc.cases.timeline.queryKey({ caseId }) });
  queryClient.invalidateQueries({ queryKey: trpc.cases.nextActions.queryKey({ caseId }) });
}

function ArrestsSection({ caseId }: { caseId: string }) {
  const [entityProfileId, setEntityProfileId] = useState("");
  const [arrestedAt, setArrestedAt] = useState("");
  const [withWarrant, setWithWarrant] = useState(false);
  const [custodyStatus, setCustodyStatus] =
    useState<(typeof CUSTODY_OPTIONS)[number]>("IN_CUSTODY");

  const criminalsQuery = useQuery(trpc.cases.listCriminals.queryOptions({ caseId }));
  const arrestsQuery = useQuery(trpc.cases.listArrests.queryOptions({ caseId }));

  const recordArrest = useMutation(
    trpc.cases.recordArrest.mutationOptions({
      onSuccess: () => {
        setEntityProfileId("");
        setArrestedAt("");
        setWithWarrant(false);
        invalidateCase(caseId);
      },
    }),
  );

  return (
    <div className="space-y-4">
      <h4 className="font-label-caps text-on-surface-variant">Arrests</h4>
      <div className="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline flex flex-col gap-3">
        <select
          className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
          value={entityProfileId}
          onChange={(e) => setEntityProfileId(e.target.value)}
        >
          <option value="">Select suspect (link on Suspects tab first)...</option>
          {criminalsQuery.data?.map((c) => (
            <option key={c.entityProfileId} value={c.entityProfileId}>
              {c.entityDisplayName ?? "Unnamed profile"}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            value={arrestedAt}
            onChange={(e) => setArrestedAt(e.target.value)}
          />
          <select
            className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            value={custodyStatus}
            onChange={(e) => setCustodyStatus(e.target.value as (typeof CUSTODY_OPTIONS)[number])}
          >
            {CUSTODY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withWarrant}
            onChange={(e) => setWithWarrant(e.target.checked)}
          />
          Arrested with warrant
        </label>
        <button
          type="button"
          disabled={!entityProfileId || !arrestedAt || recordArrest.isPending}
          onClick={() =>
            recordArrest.mutate({
              caseId,
              entityProfileId,
              arrestedAt: new Date(arrestedAt),
              withWarrant,
              custodyStatus,
            })
          }
          className="self-start px-8 py-2 bg-primary text-on-primary rounded-full text-sm font-bold disabled:opacity-50"
        >
          {recordArrest.isPending ? "Recording..." : "Record arrest"}
        </button>
      </div>

      {arrestsQuery.data?.length === 0 && (
        <p className="text-sm text-on-surface-variant">No arrests recorded yet.</p>
      )}
      <div className="space-y-2">
        {arrestsQuery.data?.map((a) => (
          <div
            key={a.id}
            className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-sm"
          >
            <p className="font-bold">
              {a.entityDisplayName ?? "Suspect"} · {a.custodyStatus.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Arrested {new Date(a.arrestedAt).toLocaleString()}
              {a.withWarrant ? " · with warrant" : " · without warrant"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProsecutionSection({ caseId }: { caseId: string }) {
  const [decision, setDecision] = useState<(typeof DECISION_OPTIONS)[number]>("PROCEED_TO_TRIAL");
  const [prosecutorName, setProsecutorName] = useState("");
  const [reason, setReason] = useState("");

  const decisionsQuery = useQuery(trpc.cases.listProsecutionDecisions.queryOptions({ caseId }));

  const recordDecision = useMutation(
    trpc.cases.recordProsecutionDecision.mutationOptions({
      onSuccess: () => {
        setProsecutorName("");
        setReason("");
        invalidateCase(caseId);
      },
    }),
  );

  return (
    <div className="space-y-4">
      <h4 className="font-label-caps text-on-surface-variant">Prosecution (NPA) decision</h4>
      <div className="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline flex flex-col gap-3">
        <select
          className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
          value={decision}
          onChange={(e) => setDecision(e.target.value as (typeof DECISION_OPTIONS)[number])}
        >
          {DECISION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
          placeholder="Prosecutor name (optional)"
          value={prosecutorName}
          onChange={(e) => setProsecutorName(e.target.value)}
        />
        <input
          className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          type="button"
          disabled={recordDecision.isPending}
          onClick={() =>
            recordDecision.mutate({
              caseId,
              decision,
              prosecutorName: prosecutorName || undefined,
              reason: reason || undefined,
            })
          }
          className="self-start px-8 py-2 bg-primary text-on-primary rounded-full text-sm font-bold disabled:opacity-50"
        >
          {recordDecision.isPending ? "Saving..." : "Record decision"}
        </button>
      </div>

      {decisionsQuery.data?.length === 0 && (
        <p className="text-sm text-on-surface-variant">No prosecution decision recorded yet.</p>
      )}
      <div className="space-y-2">
        {decisionsQuery.data?.map((d) => (
          <div
            key={d.id}
            className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-sm"
          >
            <p className="font-bold">{d.decision.replace(/_/g, " ")}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              {new Date(d.decidedAt).toLocaleString()}
              {d.prosecutorName ? ` · ${d.prosecutorName}` : ""}
            </p>
            {d.reason && <p className="text-xs mt-1">{d.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function HearingsSection({ caseId }: { caseId: string }) {
  const [hearingType, setHearingType] =
    useState<(typeof HEARING_TYPE_OPTIONS)[number]>("FIRST_APPEARANCE");
  const [scheduledAt, setScheduledAt] = useState("");
  const [courtName, setCourtName] = useState("");
  const [caseRollNumber, setCaseRollNumber] = useState("");
  const [bailScheduleClassification, setBailScheduleClassification] =
    useState<(typeof BAIL_SCHEDULE_OPTIONS)[number]>("NONE");
  const [bailAmount, setBailAmount] = useState("");

  const [outcomeTargetId, setOutcomeTargetId] = useState<string | null>(null);
  const [outcomeType, setOutcomeType] = useState<(typeof OUTCOME_OPTIONS)[number]>("PROCEEDED");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [nextHearingAt, setNextHearingAt] = useState("");

  const hearingsQuery = useQuery(trpc.cases.listHearings.queryOptions({ caseId }));

  const scheduleHearing = useMutation(
    trpc.cases.scheduleHearing.mutationOptions({
      onSuccess: () => {
        setScheduledAt("");
        setCourtName("");
        setCaseRollNumber("");
        setBailAmount("");
        invalidateCase(caseId);
      },
    }),
  );

  const recordOutcome = useMutation(
    trpc.cases.recordHearingOutcome.mutationOptions({
      onSuccess: () => {
        setOutcomeTargetId(null);
        setOutcomeNotes("");
        setNextHearingAt("");
        invalidateCase(caseId);
      },
    }),
  );

  return (
    <div className="space-y-4">
      <h4 className="font-label-caps text-on-surface-variant">Court hearings</h4>
      <div className="bg-surface-container-low rounded-2xl p-6 border border-dashed border-outline flex flex-col gap-3">
        <div className="flex gap-2">
          <select
            className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            value={hearingType}
            onChange={(e) =>
              setHearingType(e.target.value as (typeof HEARING_TYPE_OPTIONS)[number])
            }
          >
            {HEARING_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            placeholder="Court name"
            value={courtName}
            onChange={(e) => setCourtName(e.target.value)}
          />
          <input
            className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
            placeholder="Case roll number"
            value={caseRollNumber}
            onChange={(e) => setCaseRollNumber(e.target.value)}
          />
        </div>
        {hearingType === "BAIL_HEARING" && (
          <div className="flex gap-2">
            <select
              className="border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
              value={bailScheduleClassification}
              onChange={(e) =>
                setBailScheduleClassification(
                  e.target.value as (typeof BAIL_SCHEDULE_OPTIONS)[number],
                )
              }
            >
              {BAIL_SCHEDULE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-sm bg-surface-container-lowest"
              placeholder="Bail amount (R)"
              value={bailAmount}
              onChange={(e) => setBailAmount(e.target.value)}
            />
          </div>
        )}
        <button
          type="button"
          disabled={!scheduledAt || scheduleHearing.isPending}
          onClick={() =>
            scheduleHearing.mutate({
              caseId,
              hearingType,
              scheduledAt: new Date(scheduledAt),
              courtName: courtName || undefined,
              caseRollNumber: caseRollNumber || undefined,
              bailScheduleClassification:
                hearingType === "BAIL_HEARING" ? bailScheduleClassification : undefined,
              bailAmount:
                hearingType === "BAIL_HEARING" && bailAmount ? Number(bailAmount) : undefined,
            })
          }
          className="self-start px-8 py-2 bg-primary text-on-primary rounded-full text-sm font-bold disabled:opacity-50"
        >
          {scheduleHearing.isPending ? "Scheduling..." : "Schedule hearing"}
        </button>
      </div>

      {hearingsQuery.data?.length === 0 && (
        <p className="text-sm text-on-surface-variant">No hearings scheduled yet.</p>
      )}
      <div className="space-y-2">
        {hearingsQuery.data?.map((h) => (
          <div
            key={h.id}
            className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-bold">
                {h.hearingType.replace(/_/g, " ")} · {h.outcomeType.replace(/_/g, " ")}
              </p>
              <button
                onClick={() => setOutcomeTargetId(outcomeTargetId === h.id ? null : h.id)}
                className="px-3 py-1 border border-outline rounded-lg text-xs font-semibold hover:bg-surface transition-colors"
              >
                Record outcome
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {new Date(h.scheduledAt).toLocaleString()}
              {h.courtName ? ` · ${h.courtName}` : ""}
            </p>
            {h.outcomeNotes && <p className="text-xs mt-1">{h.outcomeNotes}</p>}

            {outcomeTargetId === h.id && (
              <div className="mt-3 pt-3 border-t border-outline-variant/30 flex flex-col gap-2">
                <div className="flex gap-2">
                  <select
                    className="border border-outline-variant rounded-lg px-2 py-1 text-xs bg-surface-container-lowest"
                    value={outcomeType}
                    onChange={(e) =>
                      setOutcomeType(e.target.value as (typeof OUTCOME_OPTIONS)[number])
                    }
                  >
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    className="flex-1 border border-outline-variant rounded-lg px-2 py-1 text-xs bg-surface-container-lowest"
                    value={nextHearingAt}
                    onChange={(e) => setNextHearingAt(e.target.value)}
                    placeholder="Next hearing date"
                  />
                </div>
                <input
                  className="border border-outline-variant rounded-lg px-2 py-1 text-xs bg-surface-container-lowest"
                  placeholder="Outcome notes"
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                />
                <button
                  type="button"
                  disabled={recordOutcome.isPending}
                  onClick={() =>
                    recordOutcome.mutate({
                      id: h.id,
                      outcomeType,
                      outcomeNotes: outcomeNotes || undefined,
                      nextHearingAt: nextHearingAt ? new Date(nextHearingAt) : undefined,
                    })
                  }
                  className="self-start px-4 py-1.5 bg-primary text-on-primary rounded-full text-xs font-bold disabled:opacity-50"
                >
                  {recordOutcome.isPending ? "Saving..." : "Save outcome"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourtTab({ caseId }: { caseId: string }) {
  return (
    <div className="space-y-10">
      <ArrestsSection caseId={caseId} />
      <ProsecutionSection caseId={caseId} />
      <HearingsSection caseId={caseId} />
    </div>
  );
}
