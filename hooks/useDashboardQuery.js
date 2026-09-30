/* ────────────────────────────────────────────────────────────
   useDashboardQuery — the one data lifecycle every buyer-dashboard
   widget shares.
   ──────────────────────────────────────────────────────────── */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { dashboardErrorMessage } from "@/components/dashboard/shared/errorCopy";

/** Queue widgets (approvals, drafts, closing soon…) refresh on this cadence.
 *  Analytics widgets never poll — they refetch on filter change or on the
 *  page-level refresh button only. */
export const DASHBOARD_QUEUE_POLL_MS = 60000;

// Error backoff: 5s → 10s → 20s … capped at 5 min. Analytics widgets give up
// after MAX_ANALYTICS_RETRIES automatic attempts (the Retry button still works);
// queue widgets keep retrying on the capped backoff because they are live.
const BACKOFF_BASE_MS = 5000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;
const MAX_ANALYTICS_RETRIES = 3;

export const backoffDelay = (failures) =>
  Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, failures - 1), BACKOFF_MAX_MS);

// Page-state keys that ride along in `filters` but are not API parameters.
// `_refresh` is the page refresh counter; `duration_type` is the Seg value.
const NON_API_KEYS = new Set(["duration_type"]);

/** Strip page-only keys and empty values so the query string is exactly what
 *  the backend reads (and stays cache-friendly). */
export const toApiParams = (filters) => {
  const out = {};
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (key.startsWith("_") || NON_API_KEYS.has(key)) return;
    if (value === undefined || value === null || value === "") return;
    out[key] = value;
  });
  return out;
};

export const isCancelError = (err) => {
  const e = err?.message && typeof err.message === "object" ? err.message : err;
  return Boolean(
    err?.canceled ||
      e?.name === "CanceledError" ||
      e?.name === "AbortError" ||
      e?.code === "ERR_CANCELED"
  );
};

// Services resolve with the backend envelope `{ status, data }`.
const unwrapEnvelope = (response) => {
  if (response && typeof response === "object" && "status" in response && "data" in response) {
    return response.data ?? null;
  }
  return response?.data?.data ?? response?.data ?? response ?? null;
};

/* Page-level activity tracker — lets the header refresh button spin for
   exactly as long as any widget request is in flight. */
export const DashboardActivityContext = createContext(null);

export const useDashboardActivity = () => {
  const [inFlight, setInFlight] = useState(0);
  const tracker = useMemo(
    () => ({
      begin: () => setInFlight((n) => n + 1),
      end: () => setInFlight((n) => Math.max(0, n - 1)),
    }),
    []
  );
  return { inFlight, tracker };
};

const isDocumentHidden = () =>
  typeof document !== "undefined" && document.visibilityState === "hidden";

/**
 * @param {(params, opts:{signal}) => Promise} fetcher  service function
 * @param {object} filters   page filters (hotel_ids, start_date, end_date, _refresh…)
 * @param {object} options
 *   poll         boolean  queue widget → poll every DASHBOARD_QUEUE_POLL_MS while visible
 *   pollMs       number   override the cadence (tests)
 *   extraParams  object   widget-local params (dimension, metric, product…)
 *   enabled      boolean  skip fetching entirely when false
 *   errorMessage string   fallback error copy
 *
 * Returns { data, loading, refreshing, error, stale, refetch }
 *   loading     true while the first result for the CURRENT params is pending
 *   refreshing  a background refetch (refresh button, poll, retry) is running
 *   stale       last refetch failed but `data` from the same params is still shown
 */
export default function useDashboardQuery(fetcher, filters, options = {}) {
  const {
    poll = false,
    pollMs = DASHBOARD_QUEUE_POLL_MS,
    extraParams,
    enabled = true,
    errorMessage = "Failed to load",
  } = options;

  const activity = useContext(DashboardActivityContext);

  const params = useMemo(
    () => ({ ...toApiParams(filters), ...toApiParams(extraParams) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(toApiParams(filters)), JSON.stringify(toApiParams(extraParams))]
  );
  const paramsKey = JSON.stringify(params);
  const refreshKey = filters?._refresh;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stale, setStale] = useState(false);

  const fetchIdRef = useRef(0);
  const controllerRef = useRef(null);
  const timerRef = useRef(null);
  const failuresRef = useRef(0);
  const lastSuccessAtRef = useRef(0);
  const dueWhileHiddenRef = useRef(false);
  const hasDataRef = useRef(false);
  const loadedKeyRef = useRef(null);
  const runRef = useRef(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = useCallback((delay) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // Never fetch for a tab nobody is looking at — catch up on return.
      if (isDocumentHidden()) {
        dueWhileHiddenRef.current = true;
        return;
      }
      runRef.current?.({ background: true });
    }, delay);
  }, []);

  const run = useCallback(
    async ({ background }) => {
      clearTimer();
      dueWhileHiddenRef.current = false;
      if (controllerRef.current) controllerRef.current.abort();
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      controllerRef.current = controller;
      const id = ++fetchIdRef.current;

      if (background) setRefreshing(true);
      else setLoading(true);

      activity?.begin();
      try {
        const response = await fetcher(params, controller ? { signal: controller.signal } : {});
        if (id !== fetchIdRef.current) return; // a newer request owns the state
        const payload = unwrapEnvelope(response);
        hasDataRef.current = true;
        loadedKeyRef.current = paramsKey;
        failuresRef.current = 0;
        lastSuccessAtRef.current = Date.now();
        setData(payload);
        setError(null);
        setStale(false);
        if (poll) schedule(pollMs);
      } catch (err) {
        if (id !== fetchIdRef.current || isCancelError(err)) return;
        failuresRef.current += 1;
        setError(dashboardErrorMessage(err, errorMessage));
        // Keep the last good result only when it answers the SAME question.
        // Data for the previous BU / date range would be silently wrong.
        const sameParams = hasDataRef.current && loadedKeyRef.current === paramsKey;
        if (sameParams) {
          setStale(true);
        } else {
          hasDataRef.current = false;
          setData(null);
          setStale(false);
        }
        if (poll || failuresRef.current <= MAX_ANALYTICS_RETRIES) {
          schedule(backoffDelay(failuresRef.current));
        }
      } finally {
        if (id === fetchIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        activity?.end();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher, paramsKey, poll, pollMs, errorMessage, activity, schedule]
  );
  runRef.current = run;

  // Params change → fresh load (skeleton). Refresh key change with unchanged
  // params → background refetch that keeps the current numbers on screen.
  useEffect(() => {
    if (!enabled) {
      // Disabled mid-flight: nothing scheduled may fire later, and a late
      // response must not land in state.
      clearTimer();
      dueWhileHiddenRef.current = false;
      fetchIdRef.current += 1;
      if (controllerRef.current) controllerRef.current.abort();
      setLoading(false);
      setRefreshing(false);
      return undefined;
    }
    const sameParams = hasDataRef.current && loadedKeyRef.current === paramsKey;
    failuresRef.current = 0;
    run({ background: sameParams });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, refreshKey, enabled]);

  // Resume a paused poll / retry as soon as the tab is visible again.
  useEffect(() => {
    if (!poll || typeof document === "undefined") return undefined;
    const onVisibility = () => {
      if (isDocumentHidden() || !enabledRef.current) return;
      const overdue = Date.now() - lastSuccessAtRef.current >= pollMs;
      if (dueWhileHiddenRef.current || overdue) runRef.current?.({ background: true });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [poll, pollMs]);

  // Unmount: drop timers, cancel the request, orphan any late response.
  useEffect(
    () => () => {
      clearTimer();
      fetchIdRef.current += 1;
      if (controllerRef.current) controllerRef.current.abort();
    },
    []
  );

  const refetch = useCallback(() => {
    failuresRef.current = 0;
    const sameParams = hasDataRef.current && loadedKeyRef.current === paramsKey;
    return run({ background: sameParams });
  }, [run, paramsKey]);

  return { data, loading, refreshing, error, stale, refetch };
}
