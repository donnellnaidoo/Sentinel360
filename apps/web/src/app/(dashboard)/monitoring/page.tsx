"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { formatDateTime } from "@/lib/format";
import { queryClient } from "@/lib/trpc/client";

// Shape of apps/ai GET /stream/status (relayed by /api/ai/status).
interface AiEventSummary {
  event_id: string;
  event_type: string;
  confidence: number;
  summary: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

interface AiStatus {
  running: boolean;
  camera_id: string;
  source: string;
  frame_count: number;
  fps: number;
  started_at: number | null;
  error: string | null;
  knife_streaks: Record<string, number>;
  anomaly:
    | { enabled: false; reason: string | null }
    | {
        enabled: true;
        device: string;
        threshold: number;
        last_probability: number | null;
        streak: number;
        event_active: boolean;
        last_error: string | null;
      };
  events: { queued: number; dropped: number; recent: AiEventSummary[] };
  publisher: {
    running: boolean;
    sent: number;
    duplicates: number;
    failed: number;
    last_error: string | null;
    last_result: { event_id: string; caseId?: string; caseNumber?: string } | null;
  };
}

const STATUS_KEY = ["ai-monitor", "status"];

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
    (error as Error & { offline?: boolean }).offline = Boolean((body as { offline?: boolean }).offline);
    throw error;
  }
  return body as T;
}

function sourceLabel(source: string): string {
  if (source.startsWith("x3tcp://")) return "Insta360 X3 (360°)";
  if (/^(rtsp|https?):\/\//.test(source)) return "Network camera";
  return `File: ${source.split("/").pop()}`;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">{label}</p>
      <p className="text-body-md font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-5">
      <h3 className="flex items-center gap-2 font-semibold text-on-surface mb-4">
        <span className="material-symbols-outlined text-primary" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function MonitoringPage() {
  const [feedError, setFeedError] = useState(false);

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => readJson<AiStatus>(await fetch("/api/ai/status", { cache: "no-store" })),
    refetchInterval: 2000,
    retry: false,
  });

  const control = useMutation({
    mutationFn: async (action: "start" | "stop") =>
      readJson<AiStatus>(await fetch(`/api/ai/control/${action}`, { method: "POST" })),
    onSuccess: (status) => {
      setFeedError(false);
      queryClient.setQueryData(STATUS_KEY, status);
    },
  });

  const status = statusQuery.data;
  const offline = (statusQuery.error as (Error & { offline?: boolean }) | null)?.offline;
  const running = status?.running ?? false;
  const lastCase = status?.publisher.last_result;

  return (
    <div className="max-w-container-max mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Live Monitor</h2>
          <p className="text-on-surface-variant font-body-md">
            AI weapon and anomaly detection. Confirmed detections open a docket automatically.
          </p>
        </div>
        <button
          type="button"
          disabled={!status || control.isPending}
          onClick={() => control.mutate(running ? "stop" : "start")}
          className={`px-6 py-3 rounded-xl font-medium flex items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${
            running ? "bg-error text-on-error hover:bg-error/90" : "bg-primary text-on-primary hover:bg-primary/90"
          }`}
        >
          <span className="material-symbols-outlined mr-2" aria-hidden="true">
            {running ? "stop_circle" : "play_circle"}
          </span>
          {control.isPending ? "Working…" : running ? "Stop monitoring" : "Start monitoring"}
        </button>
      </div>

      {statusQuery.isError && (
        <div role="alert" className="mb-6 rounded-xl border border-error/40 bg-error-container/20 p-4 text-body-sm text-error">
          {offline
            ? "The AI service is offline. Start it with `bun run dev:ai` and check AI_SERVICE_URL / AI_SERVICE_API_KEY in apps/web/.env."
            : `Could not load monitor status: ${statusQuery.error.message}`}
        </div>
      )}
      {control.isError && (
        <p role="alert" className="mb-6 text-body-sm text-error">
          {control.error.message}
        </p>
      )}
      {status?.error && (
        <p role="alert" className="mb-6 rounded-xl border border-error/40 bg-error-container/20 p-4 text-body-sm text-error">
          Pipeline stopped with an error: {status.error}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
        <div className="xl:col-span-2">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black shadow-sm border border-outline-variant">
            {running && !feedError ? (
              // Plain <img>: next/image can't render a multipart MJPEG stream.
              <img
                key={status?.started_at ?? "feed"}
                src="/api/ai/feed"
                alt={`Live feed from camera ${status?.camera_id ?? ""}`}
                className="h-full w-full object-contain"
                onError={() => setFeedError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                <span className="material-symbols-outlined text-5xl" aria-hidden="true">
                  {feedError ? "videocam_off" : "videocam"}
                </span>
                <p className="text-body-sm">
                  {feedError ? "Feed interrupted — stop and start monitoring to reconnect." : "Monitoring is stopped."}
                </p>
              </div>
            )}
            {running && (
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-error px-3 py-1 text-[11px] font-bold uppercase text-on-error">
                <span className="h-2 w-2 animate-pulse rounded-full bg-on-error" aria-hidden="true" />
                Live
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">
            Weapon detection uses stock COCO weights: knives only, no firearms. Boxes are drawn on the feed only; evidence
            images are taken from the clean frame.
          </p>
        </div>

        <div className="space-y-gutter">
          <Panel title="Pipeline" icon="memory">
            {status ? (
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Camera" value={status.camera_id} />
                <Stat label="Source" value={sourceLabel(status.source)} />
                <Stat label="Frame rate" value={running ? `${status.fps.toFixed(1)} fps` : "—"} />
                <Stat label="Frames" value={status.frame_count.toLocaleString()} />
                {Object.keys(status.knife_streaks).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">
                      Knife streak per view
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(status.knife_streaks).map(([view, streak]) => (
                        <span
                          key={view}
                          className={`rounded px-2 py-1 text-xs font-semibold ${streak > 0 ? "bg-error-container/30 text-error" : "bg-surface-container text-on-surface-variant"}`}
                        >
                          {view}: {streak}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant">{statusQuery.isLoading ? "Connecting…" : "Unavailable"}</p>
            )}
          </Panel>

          <Panel title="Anomaly detection" icon="psychology_alt">
            <span className="mb-3 inline-block rounded bg-tertiary-container/30 px-2 py-0.5 text-[10px] font-bold uppercase text-tertiary">
              Experimental — not calibrated for this camera
            </span>
            {status?.anomaly.enabled ? (
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Last score"
                  value={
                    status.anomaly.last_probability === null ? (
                      "warming up…"
                    ) : (
                      <span className={status.anomaly.last_probability >= status.anomaly.threshold ? "text-error" : undefined}>
                        {status.anomaly.last_probability.toFixed(2)}
                      </span>
                    )
                  }
                />
                <Stat label="Threshold" value={status.anomaly.threshold.toFixed(2)} />
                <Stat label="Streak" value={`${status.anomaly.streak} / 3`} />
                <Stat label="Device" value={status.anomaly.device.toUpperCase()} />
                {status.anomaly.last_error && (
                  <p className="col-span-2 text-xs text-error">Last inference error: {status.anomaly.last_error}</p>
                )}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                {status?.anomaly.enabled === false && status.anomaly.reason
                  ? `Off — ${status.anomaly.reason}.`
                  : "Starts with monitoring."}
              </p>
            )}
          </Panel>

          <Panel title="Backend delivery" icon="cloud_upload">
            {status ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Sent" value={status.publisher.sent} />
                  <Stat label="Queued" value={status.events.queued} />
                  <Stat
                    label="Failed"
                    value={<span className={status.publisher.failed ? "text-error" : undefined}>{status.publisher.failed}</span>}
                  />
                </div>
                {lastCase?.caseId && (
                  <Link
                    href={`/docket/${lastCase.caseId}`}
                    className="mt-4 inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
                  >
                    Latest auto-docket {lastCase.caseNumber}
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                )}
                {status.publisher.last_error && (
                  <p className="mt-3 text-xs text-error">Last delivery error: {status.publisher.last_error}</p>
                )}
                {status.events.dropped > 0 && (
                  <p className="mt-2 text-xs text-error">
                    {status.events.dropped} event(s) dropped while the backend was unreachable.
                  </p>
                )}
              </>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Unavailable</p>
            )}
          </Panel>
        </div>
      </div>

      <section className="mt-8">
        <h3 className="font-semibold text-on-surface mb-3">Recent detections</h3>
        {!status || status.events.recent.length === 0 ? (
          <p className="text-on-surface-variant text-body-sm py-6 text-center bg-surface-container-lowest rounded-xl border border-outline-variant">
            No confirmed detections yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {status.events.recent.map((event) => {
              const weapon = event.event_type === "WEAPON_DETECTED";
              return (
                <li
                  key={event.event_id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 bg-surface-container-lowest p-4 shadow-sm ${weapon ? "border-l-error" : "border-l-tertiary-container"}`}
                >
                  <div className="min-w-0">
                    <p className={`text-label-caps uppercase ${weapon ? "text-error" : "text-tertiary"}`}>
                      {event.event_type.replace(/_/g, " ")}
                      {event.metadata.modelStatus === "experimental" && " · experimental"}
                    </p>
                    <p className="text-body-sm font-semibold text-on-surface break-words">{event.summary}</p>
                  </div>
                  <div className="text-right text-xs text-on-surface-variant">
                    <p className="font-semibold">{Math.round(event.confidence * 100)}% confidence</p>
                    <p>{formatDateTime(event.occurred_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
