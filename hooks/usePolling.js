import { useCallback, useEffect, useRef } from "react";

/**
 * usePolling: the one polling primitive for the portal.
 *
 * WHY THIS EXISTS
 *
 * In Oct 2026 prod measurements, polling made up most of the backend's
 * traffic. `approval/pending/counts` alone was 32.7k calls/day, 45% of all
 * backend time, from a 5 s interval that kept running in hidden tabs and was
 * mounted twice on every dashboard page. Each hand-written `setInterval` in the
 * app had its own bugs: no pause when hidden, a double fetch on tab switch
 * (`focus` and `visibilitychange` both fire), overlapping requests when the
 * server was slow, and a timer that restarted whenever a callback's identity
 * changed. This hook fixes those once.
 *
 * WHAT IT GUARANTEES
 *
 * - Runs `fn` on mount (unless `immediate: false`), then every `interval` ms,
 *   with +/- `jitter` randomisation so 30 open tabs don't fire together.
 * - PAUSES while `document.hidden`. No timer runs in a background tab. When
 *   the tab becomes visible again it fetches ONCE (if the last run is older
 *   than `minGapMs`), then resumes the interval.
 * - Listens only to `visibilitychange`, not `focus`. Focus without a
 *   visibility change means the tab was already visible and polling.
 * - Never overlaps: if a run is in flight, a new trigger (refetch, socket
 *   signal) is queued as ONE trailing run, so a change that lands mid-request
 *   is still picked up. Interval ticks that land mid-request are dropped.
 *   The next tick is scheduled only after the current run settles.
 * - Stable: `fn` is read through a ref, so a new callback identity on every
 *   render does not restart the timer. A new `interval` value applies from
 *   the next tick, with no restart and no extra fetch. Only `enabled`,
 *   `resetKey` (compared by value) and the pause/jitter options restart it.
 * - `resetKey` change (for example dashboard filters, `_refresh`) runs
 *   immediately and restarts the cadence.
 * - Returns `refetch()`, which runs now and resets the interval.
 *
 * CADENCE POLICY (keep new pollers inside these bands)
 *
 * - 60 s: approval nav badges (`ApprovalIndicatorsProvider`). The socket
 *   event `approval:changed` refetches immediately, so the poll only covers a
 *   dropped socket or a missed event. 60 s is the most a badge can lag when
 *   the socket is down.
 * - 120 s: notification unread count while the socket is connected
 *   (`notification:new` drives it live). 60 s when the socket is
 *   disconnected, because the poll is then the only signal.
 * - 120 s: vendor dashboard, admin activity feed (the activity feed has its
 *   own socket).
 * - 5 min: buyer dashboard widgets (`DASHBOARD_POLL_MS`). These are
 *   aggregates over days or months. Refetching on tab return plus the manual
 *   refresh button is what users actually see. Ten seconds across 8 widgets
 *   was 48 calls/min per open tab, with no visible difference.
 * - Anything faster than 60 s needs a reason in a comment and, ideally, a
 *   socket event instead.
 *
 * @param {() => any|Promise<any>} fn
 * @param {object}  [opts]
 * @param {number}  opts.interval              ms between runs (<=0 disables the timer)
 * @param {boolean} [opts.enabled=true]        false stops everything
 * @param {boolean} [opts.immediate=true]      run on mount / when (re)enabled
 * @param {number}  [opts.jitter=0.1]          fraction of interval (0.1 = +/-10%)
 * @param {boolean} [opts.pauseWhenHidden=true]
 * @param {boolean} [opts.refetchOnVisible=true]
 * @param {number}  [opts.minGapMs=5000]       visible-refetch throttle
 * @param {any}     [opts.resetKey]            value-compared; change => run now + restart
 * @returns {{ refetch: () => void }}
 */
export const usePolling = (
  fn,
  {
    interval,
    enabled = true,
    immediate = true,
    jitter = 0.1,
    pauseWhenHidden = true,
    refetchOnVisible = true,
    minGapMs = 5000,
    resetKey,
  } = {}
) => {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  // Read at schedule time, so a cadence change (socket connected vs not)
  // applies from the next tick without restarting and refetching.
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const timerEnabled = interval > 0;

  // The live controller for the current effect. refetch() talks to it so it
  // stays a stable function across renders and effect restarts.
  const controllerRef = useRef(null);

  let keyString;
  try {
    keyString = JSON.stringify(resetKey === undefined ? null : resetKey);
  } catch (_) {
    keyString = String(resetKey);
  }

  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let timer = null;
    let inFlight = false;
    let rerunQueued = false;
    let lastRunAt = 0;

    const isHidden = () =>
      pauseWhenHidden && typeof document !== "undefined" && document.hidden === true;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const nextDelay = () => {
      const spread = Math.max(0, Math.min(jitter || 0, 0.5));
      const factor = 1 + (Math.random() * 2 - 1) * spread;
      return Math.max(1, Math.round(intervalRef.current * factor));
    };

    const schedule = (delay) => {
      clearTimer();
      if (disposed || !(intervalRef.current > 0) || isHidden()) return;
      timer = setTimeout(() => {
        timer = null;
        run({ fromTimer: true });
      }, delay === undefined ? nextDelay() : delay);
    };

    const run = ({ fromTimer = false } = {}) => {
      if (disposed) return;
      if (inFlight) {
        // A timer tick that lands mid-request is redundant. An explicit
        // trigger is not: the data may have changed after the in-flight
        // request read it.
        if (!fromTimer) rerunQueued = true;
        return;
      }
      clearTimer();
      inFlight = true;
      lastRunAt = Date.now();

      let result;
      try {
        result = fnRef.current?.();
      } catch (err) {
        result = undefined;
        // Swallow: a poller must not crash the tree. Callers handle their own errors.
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV !== "test") console.error("usePolling: fn threw", err);
      }

      const settle = () => {
        inFlight = false;
        if (disposed) return;
        if (rerunQueued) {
          rerunQueued = false;
          run();
          return;
        }
        schedule();
      };

      if (result && typeof result.then === "function") {
        result.then(settle, settle);
      } else {
        settle();
      }
    };

    const onVisibilityChange = () => {
      if (disposed) return;
      if (isHidden()) {
        clearTimer();
        return;
      }
      if (!pauseWhenHidden) return;
      if (inFlight) return; // settle() will schedule the next tick
      const elapsed = Date.now() - lastRunAt;
      if (refetchOnVisible && elapsed >= minGapMs) {
        run();
      } else if (intervalRef.current > 0) {
        // Just back from a very short hide: resume the remaining time.
        schedule(Math.max(1, intervalRef.current - elapsed));
      }
    };

    const controller = { refetch: () => run() };
    controllerRef.current = controller;

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    if (immediate && !isHidden()) {
      run();
    } else {
      // Not running now (immediate:false, or mounted in a background tab).
      // A hidden mount gets its first fetch from onVisibilityChange.
      schedule();
    }

    return () => {
      disposed = true;
      clearTimer();
      if (controllerRef.current === controller) controllerRef.current = null;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [enabled, timerEnabled, immediate, jitter, pauseWhenHidden, refetchOnVisible, minGapMs, keyString]);

  const refetch = useCallback(() => {
    if (controllerRef.current) controllerRef.current.refetch();
  }, []);

  return { refetch };
};

export default usePolling;
