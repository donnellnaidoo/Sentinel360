// A wailing siren synthesised with Web Audio, so there is no audio file to
// load and it plays through whatever the phone is paired with (the JBL).
// Must be started from a user gesture — the panic press is one.

let context: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;

const LOW_HZ = 650;
const HIGH_HZ = 1350;
const SWEEP_SECONDS = 0.9;

export function playSiren(durationSeconds: number): void {
  stopSiren();
  context ??= new AudioContext();
  void context.resume();

  const now = context.currentTime;
  const end = now + durationSeconds;

  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  for (let t = now; t < end; t += SWEEP_SECONDS * 2) {
    oscillator.frequency.setValueAtTime(LOW_HZ, t);
    oscillator.frequency.linearRampToValueAtTime(HIGH_HZ, t + SWEEP_SECONDS);
    oscillator.frequency.linearRampToValueAtTime(LOW_HZ, t + SWEEP_SECONDS * 2);
  }

  const gain = context.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
  gain.gain.setValueAtTime(0.8, end - 0.2);
  gain.gain.linearRampToValueAtTime(0, end);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(end);

  stopCurrent = () => {
    try {
      oscillator.stop();
    } catch {
      // already stopped
    }
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.onended = () => {
    if (stopCurrent) stopCurrent = null;
  };
}

export function stopSiren(): void {
  stopCurrent?.();
  stopCurrent = null;
}
