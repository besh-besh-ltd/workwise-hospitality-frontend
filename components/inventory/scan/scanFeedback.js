// Scan feedback: a short high beep + a tick of vibration for a good read, two
// low tones + a longer buzz for an unknown code or a failed lookup. Receivers
// work with their eyes on the carton, not the screen.
//
// Web Audio only plays after a user gesture, so the context is created lazily
// and resumed from the first tap/key (installUnlock) or the camera button
// (unlock). Mute is per device (localStorage `inv.scan.muted`) and silences
// the beep only: vibration is silent and still useful in a quiet store.
// Nothing touches window at module scope (next build evaluates this in Node).

export const MUTE_KEY = "inv.scan.muted";

let ctx = null;

const audioContext = () => {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
};

const resume = (c) => {
  if (c && c.state === "suspended" && typeof c.resume === "function") {
    try {
      const p = c.resume();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      // A resume outside a gesture is refused; the next gesture retries.
    }
  }
};

export const isMuted = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
};

export const setMuted = (muted) => {
  if (typeof window === "undefined") return;
  try {
    if (muted) window.localStorage.setItem(MUTE_KEY, "1");
    else window.localStorage.removeItem(MUTE_KEY);
  } catch {
    // Private mode / storage full: mute just will not persist.
  }
};

/** Create/resume the audio context. Call from a user gesture. */
export const unlock = () => resume(audioContext());

// Activation-triggering events (HTML spec): keydown, mousedown, pointerup for
// touch/pen, touchend. pointerdown from a finger does not count on iOS.
const UNLOCK_EVENTS = ["pointerup", "touchend", "keydown", "mousedown"];

/** Unlock audio on the first gesture anywhere on the page. Returns cleanup. */
export const installUnlock = () => {
  if (typeof window === "undefined") return () => {};
  const remove = () => UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, onGesture, true));
  function onGesture() {
    unlock();
    if (!ctx || ctx.state === "running") remove();
  }
  UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, onGesture, true));
  return remove;
};

const vibrate = (pattern) => {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when vibration is blocked by policy.
  }
};

const tone = (c, hz, startAt, seconds, volume) => {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(hz, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + seconds);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + seconds + 0.02);
};

const play = (notes) => {
  if (isMuted()) return;
  const c = audioContext();
  if (!c) return;
  resume(c);
  try {
    const t0 = c.currentTime;
    notes.forEach(([hz, offset, seconds, volume]) => tone(c, hz, t0 + offset, seconds, volume));
  } catch {
    // Audio is a nicety; never let it break a scan.
  }
};

export const success = () => {
  vibrate(35);
  play([[1760, 0, 0.08, 0.2]]);
};

export const error = () => {
  vibrate([90, 60, 90]);
  play([
    [220, 0, 0.12, 0.25],
    [165, 0.16, 0.16, 0.25],
  ]);
};

const scanFeedback = { success, error, unlock, installUnlock, isMuted, setMuted };

export default scanFeedback;
