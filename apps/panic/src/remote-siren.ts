import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { unlockAudio } from "./siren";

// A long press on the panic button in the mobile app sounds the siren on this
// page until it's stopped, in the app or with Silence here. Both sides join
// this Supabase Realtime broadcast channel; keep the names in sync with
// apps/native/lib/remote-siren.ts.
const CHANNEL = "panic-speaker";
const EVENT = "siren";
// After Silence here, ignore the "on"s the app sent before it heard "off".
const SILENCE_GRACE_MS = 2_000;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const remoteSirenConfigured = Boolean(supabaseUrl && supabaseKey);

// onStart fires once when the app turns the siren on, onStop when it turns it
// off. The app keeps repeating "on" while it's on; that doesn't restart it.
export function useRemoteSiren(onStart: () => void, onStop: () => void) {
  const [listening, setListening] = useState(false);
  // Browsers only play sound after a tap on the page; until then a remote
  // hold can't be heard.
  const [unlocked, setUnlocked] = useState(false);
  const handlers = useRef({ onStart, onStop });
  handlers.current = { onStart, onStop };
  const channelRef = useRef<RealtimeChannel | null>(null);
  const active = useRef(false);
  const ignoreOnUntil = useRef(0);

  useEffect(() => {
    if (unlocked) return;
    const unlock = () => {
      unlockAudio();
      setUnlocked(true);
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [unlocked]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return;
    const end = () => {
      if (!active.current) return;
      active.current = false;
      handlers.current.onStop();
    };

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const channel = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: EVENT }, ({ payload }: { payload: { action?: string } }) => {
        if (payload.action === "off") return end();
        if (payload.action !== "on" || active.current || Date.now() < ignoreOnUntil.current) return;
        active.current = true;
        handlers.current.onStart();
      })
      .subscribe((status) => {
        setListening(status === "SUBSCRIBED");
        // Lets the app show whether a panic page is open.
        if (status === "SUBSCRIBED") void channel.track({ role: "speaker" });
      });

    channelRef.current = channel;

    return () => {
      end();
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, []);

  // Silence pressed here: tell the app the siren is off, so it stops sending.
  const silenceRemote = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    ignoreOnUntil.current = Date.now() + SILENCE_GRACE_MS;
    void channelRef.current?.send({ type: "broadcast", event: EVENT, payload: { action: "off", at: Date.now() } });
  }, []);

  return { listening, unlocked, silenceRemote };
}
