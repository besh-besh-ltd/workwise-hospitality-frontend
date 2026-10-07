/**
 * Run `cb` once the page has finished loading and the main thread is idle.
 *
 * Used to start third-party telemetry (PostHog, OpenTelemetry) AFTER the page
 * is interactive instead of during hydration. Waits for `load` first so the
 * work never competes with the page's own scripts, then `requestIdleCallback`
 * with a timeout so a permanently busy tab still gets telemetry eventually.
 * Safari has no requestIdleCallback; it falls back to a short timeout.
 *
 * Returns a cancel function.
 */
export function runWhenIdle(cb, { timeout = 4000, fallbackDelay = 1500 } = {}) {
  if (typeof window === "undefined") return () => {};
  let cancelled = false;
  let idleHandle = null;
  let timer = null;

  const schedule = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(() => { if (!cancelled) cb(); }, { timeout });
    } else {
      timer = setTimeout(() => { if (!cancelled) cb(); }, fallbackDelay);
    }
  };

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }

  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idleHandle != null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle);
    if (timer != null) clearTimeout(timer);
  };
}
