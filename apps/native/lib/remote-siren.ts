import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/auth-client";

// A long press on the panic button sounds the siren on the panic website
// (apps/panic) until it's stopped, here or with Silence on the website. Both
// sides join this Supabase Realtime broadcast channel; keep the names in
// sync with apps/panic/src/remote-siren.ts.
const CHANNEL = "panic-speaker";
const EVENT = "siren";
// While on, "on" repeats so a panic page opened or reconnected mid-alarm
// picks it up.
const HEARTBEAT_MS = 1_000;

type Action = "on" | "off";

export function useRemoteSiren() {
  const channel = useRef<RealtimeChannel | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected, setConnected] = useState(false);
  // Open panic pages announce themselves with Realtime presence.
  const [speakers, setSpeakers] = useState(0);
  const [sounding, setSounding] = useState(false);

  const send = useCallback((action: Action) => {
    void channel.current?.send({ type: "broadcast", event: EVENT, payload: { action, at: Date.now() } });
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeat.current === null) return false;
    clearInterval(heartbeat.current);
    heartbeat.current = null;
    setSounding(false);
    return true;
  }, []);

  const stop = useCallback(() => {
    if (clearHeartbeat()) send("off");
  }, [clearHeartbeat, send]);

  const start = useCallback(() => {
    if (heartbeat.current !== null) return;
    send("on");
    heartbeat.current = setInterval(() => send("on"), HEARTBEAT_MS);
    setSounding(true);
  }, [send]);

  useEffect(() => {
    const ch = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => {
      const present = Object.values(ch.presenceState<{ role?: string }>()).flat();
      setSpeakers(present.filter((p) => p.role === "speaker").length);
    });
    // Silenced on the website.
    ch.on("broadcast", { event: EVENT }, ({ payload }) => {
      if (payload?.action === "off") clearHeartbeat();
    });
    ch.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    channel.current = ch;
    return () => {
      // Leaving the screen doesn't silence it; the heartbeat just stops.
      if (heartbeat.current !== null) clearInterval(heartbeat.current);
      heartbeat.current = null;
      channel.current = null;
      void supabase.removeChannel(ch);
    };
  }, [clearHeartbeat]);

  return { connected, speakers, sounding, start, stop };
}
