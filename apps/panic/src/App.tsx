import { useEffect, useRef, useState } from "react";

import { getPanicStatus, isCameraServiceUp, pressPanic, type PanicStatus } from "./api";
import { playSiren, stopSiren } from "./siren";

const SIREN_SECONDS = 15;
const STATUS_POLL_MS = 1_000;
// The docket takes ~11s against hosted Supabase; give up polling well after.
const STATUS_POLL_LIMIT_MS = 60_000;
const RESET_AFTER_MS = 20_000;
const HEALTH_POLL_MS = 5_000;

type View =
  | { kind: "idle" }
  | { kind: "capturing" }
  | { kind: "sent"; status: PanicStatus }
  | { kind: "error"; message: string };

export function App() {
  const [view, setView] = useState<View>({ kind: "idle" });
  const [online, setOnline] = useState<boolean | null>(null);
  const [sirenOn, setSirenOn] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const sirenTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const up = await isCameraServiceUp();
      if (!cancelled) setOnline(up);
    };
    void check();
    const id = window.setInterval(check, HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(
    () => () => {
      for (const timer of [pollTimer, resetTimer, sirenTimer]) {
        if (timer.current !== null) window.clearTimeout(timer.current);
      }
      stopSiren();
    },
    [],
  );

  function scheduleReset() {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setView({ kind: "idle" }), RESET_AFTER_MS);
  }

  function pollUntilDocketed(eventId: string, startedAt: number) {
    pollTimer.current = window.setTimeout(async () => {
      try {
        const status = await getPanicStatus(eventId);
        setView({ kind: "sent", status });
        if (status.state === "queued" && Date.now() - startedAt < STATUS_POLL_LIMIT_MS) {
          pollUntilDocketed(eventId, startedAt);
          return;
        }
      } catch {
        // Keep the last good status on screen; the alert is already queued.
      }
      scheduleReset();
    }, STATUS_POLL_MS);
  }

  function startSiren() {
    playSiren(SIREN_SECONDS);
    setSirenOn(true);
    if (sirenTimer.current !== null) window.clearTimeout(sirenTimer.current);
    sirenTimer.current = window.setTimeout(() => setSirenOn(false), SIREN_SECONDS * 1000);
  }

  function silence() {
    stopSiren();
    setSirenOn(false);
  }

  async function onPress() {
    if (view.kind === "capturing") return;
    // Sound first: it must start inside the tap, and it shouldn't wait on
    // the network.
    startSiren();
    navigator.vibrate?.([200, 100, 200]);
    if (pollTimer.current !== null) window.clearTimeout(pollTimer.current);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    setView({ kind: "capturing" });

    try {
      const status = await pressPanic();
      setView({ kind: "sent", status });
      if (status.state === "queued") pollUntilDocketed(status.event_id, Date.now());
      else scheduleReset();
    } catch (error) {
      setView({ kind: "error", message: error instanceof Error ? error.message : "Could not reach the camera" });
      scheduleReset();
    }
  }

  return (
    <main className={`screen screen--${view.kind}`}>
      <header className="topbar">
        <span className="brand">Sentinel360</span>
        <span className={`link link--${online === null ? "unknown" : online ? "up" : "down"}`}>
          {online === null ? "Checking camera…" : online ? "Camera linked" : "Camera offline"}
        </span>
      </header>

      <button
        type="button"
        className="panic"
        onClick={onPress}
        disabled={view.kind === "capturing"}
        aria-label="Panic button — alert security"
      >
        <span className="panic__label">{view.kind === "capturing" ? "SENDING" : "PANIC"}</span>
        <span className="panic__hint">{view.kind === "capturing" ? "Capturing camera…" : "Press for help"}</span>
      </button>

      <section className="message" aria-live="assertive">
        <Message view={view} />
      </section>

      {sirenOn && (
        <button type="button" className="silence" onClick={silence}>
          Silence siren
        </button>
      )}
    </main>
  );
}

function Message({ view }: { view: View }) {
  switch (view.kind) {
    case "idle":
      return <p>Press the button and security will be alerted with what the camera sees.</p>;
    case "capturing":
      return <p>Capturing the camera view…</p>;
    case "error":
      return (
        <>
          <p className="message__title">Alert not sent</p>
          <p className="message__detail">{view.message}</p>
          <p className="message__detail">Press again, or call for help directly.</p>
        </>
      );
    case "sent": {
      const { status } = view;
      if (status.state === "failed") {
        return (
          <>
            <p className="message__title">Captured, but the docket failed</p>
            <p className="message__detail">{status.error}</p>
          </>
        );
      }
      return (
        <>
          <p className="message__title">Help has been alerted</p>
          <p className="message__detail">
            {status.state === "sent"
              ? `Docket ${status.caseNumber ?? ""} opened with the camera snapshot.`
              : "Camera captured — opening the docket…"}
          </p>
          {status.repeated && <p className="message__detail">Already reported moments ago — same docket.</p>}
        </>
      );
    }
  }
}
