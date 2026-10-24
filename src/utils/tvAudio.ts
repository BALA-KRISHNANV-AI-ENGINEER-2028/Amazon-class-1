/**
 * Fire TV D-Pad Remote Audio Feedback Synthesizer
 * Produces subtle, low-latency directional focus ticks and selection earcons
 * modeled after living-room 10-foot smart TV interfaces.
 */

let audioCtx: AudioContext | null = null;
let audioEnabled = true;

function getAudioContext(): AudioContext | null {
  if (!audioEnabled || typeof window === 'undefined') {
    return null;
  }
  const AudioCtxConstructor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxConstructor) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioCtxConstructor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isTVSoundEnabled(): boolean {
  return audioEnabled;
}

export function setTVSoundEnabled(enabled: boolean): void {
  audioEnabled = enabled;
}

export function playTVFocusTick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.032);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.038);
  } catch {
    // Ignore audio context autoplay restrictions prior to first gesture
  }
}

export function playTVSelectSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.075);

    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function playTVBackSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.07);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}
