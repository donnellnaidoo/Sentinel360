// A wailing siren synthesised with Web Audio, so there is no audio file to
// load and it plays through whatever the phone is paired with (the JBL).
// The AudioContext must first be unlocked from a user gesture: the panic
// press does it, and so does the first tap anywhere on the page.

let context: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;

const LOW_HZ = 650;
const HIGH_HZ = 1350;
const SWEEP_SECONDS = 0.9;
const VOLUME = 0.8;

function audio(): AudioContext {
  context ??= new AudioContext();
  void context.resume();
  return context;
}

// Call from a user gesture so later, gesture-less playSiren() calls are allowed.
export function unlockAudio(): void {
  // iOS 17+: play through the mute switch, like a media app.
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = "playback";
  const ctx = audio();
  // A silent blip is what actually unlocks playback on iOS Safari.
  const source = ctx.createBufferSource();
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  source.connect(ctx.destination);
  source.start();
}

// Plays for durationSeconds, or until stopSiren() when it's omitted.
export function playSiren(durationSeconds?: number): void {
  stopSiren();
  const ctx = audio();
  const now = ctx.currentTime;

  // The pitch sweeps LOW_HZ..HIGH_HZ, driven by a slow triangle LFO.
  const oscillator = ctx.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = (LOW_HZ + HIGH_HZ) / 2;
  const lfo = ctx.createOscillator();
  lfo.type = "triangle";
  lfo.frequency.value = 1 / (SWEEP_SECONDS * 2);
  const depth = ctx.createGain();
  depth.gain.value = (HIGH_HZ - LOW_HZ) / 2;
  lfo.connect(depth).connect(oscillator.frequency);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(VOLUME, now + 0.05);
  if (durationSeconds !== undefined) {
    const end = now + durationSeconds;
    gain.gain.setValueAtTime(VOLUME, end - 0.2);
    gain.gain.linearRampToValueAtTime(0, end);
    oscillator.stop(end);
    lfo.stop(end);
  }

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  lfo.start(now);

  const stop = () => {
    for (const node of [oscillator, lfo]) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
      node.disconnect();
    }
    depth.disconnect();
    gain.disconnect();
  };
  stopCurrent = stop;
  oscillator.onended = () => {
    if (stopCurrent === stop) stopCurrent = null;
  };
}

export function stopSiren(): void {
  stopCurrent?.();
  stopCurrent = null;
}
