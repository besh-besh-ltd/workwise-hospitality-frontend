// Shared pieces of the purchase queue and its dialogs: which refusals mean the
// queue on screen is stale, the department-list parser, the guarded submit
// hook every dialog uses, and how a refetch reconciles the buyer's selection.

import { useCallback, useRef, useState } from "react";
import { errorCopy, errorStatus } from "./prFormat";

// Refusals that mean the queue on screen is out of date (the line or PR is
// gone, or changed state): refetch it.
const STALE_STATUSES = new Set([404, 409]);
export const isStaleRefusal = (err) => STALE_STATUSES.has(errorStatus(err));

/** GET /rbac/departments, either envelope → [{ id: "4", title }]. */
export const departmentOptions = (res) => {
  const rows = res?.data?.data || res?.data || [];
  return (Array.isArray(rows) ? rows : []).map((d) => ({ id: String(d.id), title: d.title || d.name }));
};

/**
 * One guarded submit for a queue dialog. `run(call, { onSuccess, keepBusy })`
 * ignores re-entry while a call is in flight (double click), clears and sets
 * `error` (via `describe`, default errorCopy), and on a stale refusal calls
 * `onStale` so the queue behind the dialog refreshes. `keepBusy` leaves the
 * dialog busy after success (the page is navigating away).
 */
export function useGuardedSubmit({ describe = errorCopy, onStale } = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const busyRef = useRef(false);

  const run = useCallback(async (call, { onSuccess, keepBusy = false } = {}) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await call();
      if (!keepBusy) {
        busyRef.current = false;
        setBusy(false);
      }
      onSuccess?.(res);
    } catch (e) {
      setError(describe(e));
      busyRef.current = false;
      setBusy(false);
      if (isStaleRefusal(e)) onStale?.();
    }
  }, [describe, onStale]);

  const reset = useCallback(() => setError(null), []);
  return { busy, error, run, reset };
}

/** "PR-2026-0011 line 1" */
export const lineRef = (l) => `${l.pr_number} line ${l.line_no}`;

/**
 * Does this fetch show EVERY in-queue line that matches the snapshot? Only
 * then does a selected line's absence prove it left the queue: no search, no
 * category / assignment filter (those can change under the line), first page
 * holding the whole result, and hotel / department filters (fixed per line)
 * that the line matches.
 */
function viewWouldShow(line, { filters, q, page, total, shown }) {
  if (q || page !== 1 || shown < total) return false;
  if (filters.category_id || (filters.assigned && filters.assigned !== "any")) return false;
  if (filters.progress && filters.progress !== "in_pool") return false;
  if (filters.hotel_id && String(filters.hotel_id) !== String(line.hotel_id)) return false;
  if (filters.department_id && String(filters.department_id) !== String(line.department_id)) return false;
  return true;
}

/**
 * Reconcile the selection (line_id → row snapshot, possibly off-screen) with
 * a fresh page of the pool. A line on the page is refreshed, or dropped when
 * it is no longer in_pool; an off-screen line is kept unless this fetch would
 * have shown it (then it has left the queue). → { next, dropped[] }.
 */
export function reconcileSelection(selected, rows, view) {
  const fresh = new Map(rows.map((r) => [String(r.line_id), r]));
  const ctx = { ...view, shown: rows.length };
  const next = {};
  const dropped = [];
  Object.entries(selected).forEach(([k, snap]) => {
    const r = fresh.get(k);
    if (r) {
      if (r.progress === "in_pool") next[k] = r;
      else dropped.push(r);
    } else if (viewWouldShow(snap, ctx)) {
      dropped.push(snap);
    } else {
      next[k] = snap;
    }
  });
  return { next, dropped };
}
