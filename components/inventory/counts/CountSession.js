import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Check, CircleAlert, Clock3, EyeOff, Loader2, PackagePlus, RotateCcw, Search, Send } from "lucide-react";
import { cancelCount, listItems, saveCountLines, submitCount } from "@/services/inventory";
import { submitOrQueue } from "@/components/inventory/offline/outbox";
import ScanInput from "@/components/inventory/scan/ScanInput";
import LinkUnknownCodeSheet from "@/components/inventory/scan/LinkUnknownCodeSheet";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import { getApiErrorMessage } from "@/utils/apiError";
import {
  byBinThenName,
  countPath,
  errorInfo,
  escapeHtml,
  fmtDateTime,
  fmtQty,
  fmtSignedQty,
  newClientEventId,
  plural,
} from "./countUtils";
import styles from "./counts.module.scss";

// The counting screen of an open count (mobile first, scan first).
//
// Walk the store bin by bin: scan an item (or find it in the list), type what
// is on the shelf. Each figure is saved a moment after the last keystroke via
// the outbox (kind `count_lines`), one clientEventId per line save: a retry of
// the same figure reuses it (the server answers a replay as success), a new
// figure gets a new one. A line shows a check once the server has it.
//
// Blind counts never show system quantities or differences here, whoever is
// counting; approvers read them on the review screen after submit.
//
// Props: { count, onCountChange(nextCount), onReload() }

export const SAVE_DEBOUNCE_MS = 700;
// useWedgeScanner's burst gap: keys closer together than this are a scanner.
const WEDGE_GAP_MS = 35;
const MAX_LINES_PER_SAVE = 500;
const QTY_RE = /^(\d+(\.\d{0,4})?|\.\d{1,4})$/;

/** A counted quantity typed by hand, or null when it is not one. */
const parseQty = (text) => {
  const s = String(text ?? "").trim();
  if (!QTY_RE.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// Line entry states (only for lines touched in this session):
//   blank    field cleared; nothing to send, the saved figure stands
//   invalid  not a quantity; nothing to send
//   dirty    waiting for the debounce
//   saving   in flight with `eventId`
//   queued   kept by the outbox until the connection is back
//   error    refused or not delivered; `retry` when re-sending can help
// A line save that lands after the count left `open` is final (PUT lines answers CONFLICT {status}).
const CLOSED_MESSAGE = {
  submitted: "This count was already submitted",
  approved: "This count was already approved",
  cancelled: "This count was cancelled",
};
const PENDING = new Set(["dirty", "saving", "queued", "error", "invalid"]);
const COUNTED = new Set(["saved", "dirty", "saving", "queued"]);

/** A replayed save answers `{...Count, replayed:true, no_op:true}`: keep the Count. */
export const stripFlags = (c) => {
  if (!c || typeof c !== "object") return c;
  const out = { ...c };
  delete out.replayed;
  delete out.no_op;
  return out;
};

const CountSession = ({ count, onCountChange, onReload }) => {
  const canCount = count?.can?.count === true && count?.status === "open";
  const canCancel = count?.can?.approve === true && (count?.status === "open" || count?.status === "submitted");
  const showFigures = count?.isBlind !== true;

  const [entries, setEntries] = useState({});
  const entriesRef = useRef(entries);
  const [added, setAdded] = useState([]);
  const addedRef = useRef(added);
  const countRef = useRef(count);
  useEffect(() => {
    countRef.current = count;
    // A figure the outbox kept offline and synced later: once the server's
    // count carries it, the line is simply saved.
    const server = new Map((count?.lines || []).map((l) => [Number(l.invItemId), l.countedQty]));
    const synced = Object.entries(entriesRef.current).filter(
      ([id, e]) => e.status === "queued" && server.get(Number(id)) != null && Number(server.get(Number(id))) === parseQty(e.draft)
    );
    if (synced.length) {
      update((cur) => {
        const out = { ...cur };
        for (const [id] of synced) if (out[id]?.status === "queued") delete out[id];
        return out;
      });
    }
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pinned, setPinned] = useState(null); // ids shown under "To count" until the filter changes
  const [uncounted, setUncounted] = useState(null); // {ids:Set, total}
  const [focusReq, setFocusReq] = useState(null); // {id, n}
  const [unknownCode, setUnknownCode] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'submit' | 'cancel'
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const inputRefs = useRef(new Map());
  const timerRef = useRef(null);
  const inFlightRef = useRef(null);
  const againRef = useRef(false);
  const closedRef = useRef(false); // the server said this count is no longer open: nothing more to save
  const burstRef = useRef(null);
  const flushRef = useRef(() => Promise.resolve());

  const update = useCallback((fn) => {
    entriesRef.current = fn(entriesRef.current);
    setEntries(entriesRef.current);
  }, []);

  // ── Rows ───────────────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    const server = count?.lines || [];
    const ids = new Set(server.map((l) => Number(l.invItemId)));
    const extra = added.filter((a) => !ids.has(a.invItemId));
    return [...server, ...extra].sort(byBinThenName);
  }, [count, added]);

  const stateOf = (row, entry) => (entry ? entry.status : row.countedQty != null ? "saved" : "todo");

  const counted = rows.filter((r) => COUNTED.has(stateOf(r, entries[r.invItemId]))).length;
  const pendingCount = Object.values(entries).filter((e) => PENDING.has(e.status)).length;

  // ── Saving ─────────────────────────────────────────────────────────────────
  const settleSaved = (batch, next) => {
    if (next && typeof next === "object" && Array.isArray(next.lines)) {
      const clean = stripFlags(next);
      countRef.current = clean;
      onCountChange?.(clean);
    }
    update((cur) => {
      const out = { ...cur };
      for (const l of batch) {
        const e = out[l.invItemId];
        if (e && e.status === "saving" && e.eventId === l.clientEventId) delete out[l.invItemId];
      }
      return out;
    });
  };

  const markBatch = (batch, patchFor) =>
    update((cur) => {
      const out = { ...cur };
      batch.forEach((l, index) => {
        const e = out[l.invItemId];
        if (!e || e.eventId !== l.clientEventId || e.status !== "saving") return; // edited since
        const patch = patchFor(l, index);
        if (patch) out[l.invItemId] = { ...e, ...patch };
      });
      return out;
    });

  const failBatch = (batch, err) => {
    const { httpStatus, code, details } = errorInfo(err);
    const message = getApiErrorMessage(err, "Not saved. Try again.");
    let resend = false;

    if (httpStatus === null) {
      markBatch(batch, () => ({ status: "error", error: "Not saved: no connection", retry: true }));
    } else if (code === "VALIDATION" && details.index != null && batch[details.index]) {
      // One bad line sinks the whole save; send the others again on their own.
      markBatch(batch, (l, i) =>
        i === Number(details.index) ? { status: "error", error: message, retry: false } : { status: "dirty" }
      );
      resend = true;
    } else if (code === "CONFLICT" && details.countId != null) {
      const clash = new Set((details.invItemIds || []).map(Number));
      const named = batch.some((l) => clash.has(l.invItemId));
      const other = { id: details.countId, number: details.countNumber };
      markBatch(batch, (l) =>
        !named || clash.has(l.invItemId)
          ? { status: "error", error: "Already being counted in", other, retry: false }
          : { status: "dirty" }
      );
      resend = named;
    } else if (code === "CONFLICT") {
      // The count left `open` (submitted, approved or cancelled) before this save landed. That is
      // final: drop every unsaved figure (none can be saved now), say so once, and reload.
      if (!closedRef.current) toast.error(CLOSED_MESSAGE[details.status] || message);
      closedRef.current = true;
      clearTimeout(timerRef.current);
      update(() => ({}));
      onReload?.();
    } else {
      markBatch(batch, () => ({ status: "error", error: message, retry: httpStatus >= 500 }));
    }
    if (resend) againRef.current = true;
  };

  const flush = () => {
    clearTimeout(timerRef.current);
    if (closedRef.current) return Promise.resolve();
    if (inFlightRef.current) {
      againRef.current = true;
      return inFlightRef.current;
    }
    const countId = countRef.current?.id;
    const batch = [];
    for (const [key, e] of Object.entries(entriesRef.current)) {
      if (e.status !== "dirty") continue;
      const qty = parseQty(e.draft);
      if (qty === null) continue;
      if (batch.length >= MAX_LINES_PER_SAVE) {
        againRef.current = true;
        break;
      }
      batch.push({ invItemId: Number(key), countedQty: qty, clientEventId: e.eventId || newClientEventId() });
    }
    if (!batch.length || !countId) return Promise.resolve();

    update((cur) => {
      const out = { ...cur };
      for (const l of batch) out[l.invItemId] = { ...out[l.invItemId], status: "saving", eventId: l.clientEventId, error: null };
      return out;
    });

    const run = (async () => {
      try {
        const res = await submitOrQueue({
          kind: "count_lines",
          clientEventId: newClientEventId(),
          payload: { countId, lines: batch },
          send: (p) => saveCountLines(p.countId, p.lines),
        });
        if (res?.queued) markBatch(batch, () => ({ status: "queued" }));
        else settleSaved(batch, res?.result);
      } catch (err) {
        failBatch(batch, err);
      } finally {
        inFlightRef.current = null;
        if (againRef.current) {
          againRef.current = false;
          flushRef.current();
        }
      }
    })();
    inFlightRef.current = run;
    return run;
  };
  flushRef.current = flush;

  const schedule = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), SAVE_DEBOUNCE_MS);
  };

  /** Send everything typed so far and wait until nothing is in flight. */
  const settleAll = async () => {
    clearTimeout(timerRef.current);
    for (let i = 0; i < 6; i += 1) {
      if (inFlightRef.current) await inFlightRef.current;
      const dirty = Object.values(entriesRef.current).some((e) => e.status === "dirty");
      if (!dirty && !inFlightRef.current) return;
      await flushRef.current();
    }
  };

  // Leaving the screen sends what is typed; closing the tab with unsaved
  // figures asks first.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      if (Object.values(entriesRef.current).some((e) => e.status === "dirty")) flushRef.current();
    },
    []
  );
  const hasUnsaved = Object.values(entries).some((e) => ["dirty", "saving", "error", "invalid"].includes(e.status));
  useEffect(() => {
    if (!hasUnsaved || typeof window === "undefined") return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  // ── Typing ─────────────────────────────────────────────────────────────────
  const onQtyChange = (id, text) => {
    const blank = String(text).trim() === "";
    const qty = parseQty(text);
    update((cur) => ({
      ...cur,
      [id]: {
        draft: text,
        eventId: null,
        status: blank ? "blank" : qty === null ? "invalid" : "dirty",
        error: !blank && qty === null ? "Enter 0 or more" : null,
        retry: false,
      },
    }));
    schedule();
  };

  const restoreEntry = (id, snapshot) =>
    update((cur) => {
      const out = { ...cur };
      if (!snapshot) delete out[id];
      else out[id] = snapshot.status === "saving" ? { ...snapshot, status: "dirty" } : snapshot;
      return out;
    });

  const onQtyKeyDown = (id, e) => {
    const now = Date.now();
    const { key } = e;
    if (typeof key === "string" && key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const b = burstRef.current;
      if (!b || b.id !== id || now - b.lastAt > WEDGE_GAP_MS) {
        burstRef.current = { id, lastAt: now, snapshot: entriesRef.current[id] };
      } else {
        b.lastAt = now;
      }
      return;
    }
    if (key !== "Enter" && key !== "Tab") return;
    // The wedge listener (window, capture phase) claimed this burst as a scan
    // and prevented its terminator: the code typed into this box is not a
    // quantity. Put the box back as it was; the scan itself is resolving.
    if (e.nativeEvent?.defaultPrevented) {
      restoreEntry(id, burstRef.current?.id === id ? burstRef.current.snapshot : entriesRef.current[id]);
      burstRef.current = null;
      return;
    }
    burstRef.current = null;
    if (key === "Enter") {
      e.preventDefault();
      flushRef.current();
      e.currentTarget.blur();
    }
  };

  const onQtyBlur = (id) => {
    const e = entriesRef.current[id];
    if (e?.status === "blank") restoreEntry(id, null);
    if (Object.values(entriesRef.current).some((x) => x.status === "dirty")) flushRef.current();
  };

  const retry = (id) => {
    update((cur) => (cur[id] ? { ...cur, [id]: { ...cur[id], status: "dirty", error: null } } : cur));
    flushRef.current();
  };
  const retryAll = () => {
    update((cur) => {
      const out = { ...cur };
      for (const [k, e] of Object.entries(out)) if (e.status === "error" && e.retry) out[k] = { ...e, status: "dirty", error: null };
      return out;
    });
    flushRef.current();
  };

  // ── Finding a line ─────────────────────────────────────────────────────────
  const focusItem = (item) => {
    const id = Number(item?.invItemId);
    if (!id) return;
    const onCount = (countRef.current?.lines || []).some((l) => Number(l.invItemId) === id);
    if (!onCount && !addedRef.current.some((a) => a.invItemId === id)) {
      // Found while counting: it joins the count when its figure is saved.
      const next = [
        ...addedRef.current,
        {
          id: `new-${id}`,
          invItemId: id,
          displayName: item.displayName || `Item ${id}`,
          itemCode: item.itemCode ?? null,
          stockUom: item.stockUom || "",
          binLabel: null,
          countedQty: null,
          systemQtyAtCount: null,
          varianceQty: null,
          isNew: true,
        },
      ];
      addedRef.current = next;
      setAdded(next);
    }
    setQuery("");
    if (filter === "done") {
      setFilter("all");
      setPinned(null);
    } else {
      setPinned((p) => (p ? new Set([...p, id]) : p));
    }
    setFocusReq((r) => ({ id, n: (r?.n || 0) + 1 }));
  };

  // Focus each request once, as soon as its line is on screen (a line found
  // while counting renders a tick later). Later saves must not pull focus
  // back to it.
  const focusedReq = useRef(0);
  useEffect(() => {
    if (!focusReq || focusedReq.current === focusReq.n) return;
    const el = inputRefs.current.get(focusReq.id);
    if (!el) return;
    focusedReq.current = focusReq.n;
    el.focus();
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusReq, rows]);

  const onResolved = (result) => {
    if (result?.kind === "item" && result.item) {
      focusItem(result.item);
      return;
    }
    toast.info("That is a document label. Scan an item to count it.");
  };

  // ── Filters ────────────────────────────────────────────────────────────────
  const chooseFilter = (next) => {
    setFilter(next);
    setPinned(
      next === "todo"
        ? new Set(rows.filter((r) => !COUNTED.has(stateOf(r, entriesRef.current[r.invItemId]))).map((r) => r.invItemId))
        : null
    );
  };

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter === "todo" && !(pinned?.has(r.invItemId) || uncounted?.ids.has(r.invItemId))) return false;
    if (filter === "done" && !COUNTED.has(stateOf(r, entries[r.invItemId]))) return false;
    if (!q) return true;
    return [r.displayName, r.itemCode, r.binLabel].some((v) => v && String(v).toLowerCase().includes(q));
  });

  const groups = [];
  for (const r of visible) {
    const bin = r.binLabel || null;
    const last = groups[groups.length - 1];
    if (last && last.bin === bin) last.rows.push(r);
    else groups.push({ bin, rows: [r] });
  }

  // ── Submit and cancel ──────────────────────────────────────────────────────
  const showUncounted = (ids, total) => {
    setUncounted({ ids: new Set(ids.map(Number)), total });
    setQuery("");
    setFilter("todo");
    setPinned(new Set(ids.map(Number)));
    if (ids.length) setFocusReq((r) => ({ id: Number(ids[0]), n: (r?.n || 0) + 1 }));
  };

  const onSubmitClick = async () => {
    setBusy(true);
    try {
      await settleAll();
    } finally {
      setBusy(false);
    }
    const stuck = Object.values(entriesRef.current).filter((e) => PENDING.has(e.status)).length;
    if (stuck) {
      toast.error(`${plural(stuck, "quantity", "quantities")} not saved yet. Fix or retry them, then submit.`);
      return;
    }
    const latest = countRef.current;
    const ids = new Set((latest?.lines || []).map((l) => Number(l.invItemId)));
    const all = [...(latest?.lines || []), ...addedRef.current.filter((a) => !ids.has(a.invItemId))];
    const left = all.filter((l) => l.countedQty == null).sort(byBinThenName);
    const done = all.length - left.length;
    if (!done) {
      toast.error("Count at least one item before submitting.");
      return;
    }
    if (latest?.scope === "FULL" && left.length) {
      showUncounted(left.map((l) => l.invItemId), left.length);
      return;
    }
    setUncounted(null);
    setConfirmText(
      `${escapeHtml(plural(done, "item"))} counted.` +
        (left.length ? ` ${escapeHtml(plural(left.length, "item"))} not counted will be left out.` : "") +
        " Once submitted the figures can no longer be changed; an approver reviews the differences."
    );
    setConfirm("submit");
  };

  const doSubmit = async () => {
    try {
      const next = await submitCount(count.id);
      setConfirm(null);
      toast.success("Count submitted for approval");
      onCountChange?.(stripFlags(next));
    } catch (err) {
      setConfirm(null);
      const { code, details } = errorInfo(err);
      if (code === "VALIDATION" && Array.isArray(details.uncounted)) {
        const ids = details.uncounted.map((u) => u.invItemId);
        showUncounted(ids, Number(details.uncountedTotal) || ids.length);
        onReload?.();
        return;
      }
      toast.error(getApiErrorMessage(err, "Could not submit the count"));
      if (code === "CONFLICT" || code === "NOT_FOUND") onReload?.();
    }
  };

  const doCancel = async () => {
    try {
      const next = await cancelCount(count.id);
      setConfirm(null);
      toast.success("Count cancelled");
      onCountChange?.(stripFlags(next));
    } catch (err) {
      setConfirm(null);
      toast.error(getApiErrorMessage(err, "Could not cancel the count"));
      const { code } = errorInfo(err);
      if (code === "CONFLICT" || code === "NOT_FOUND") onReload?.();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const total = rows.length;
  const pct = total ? Math.round((counted / total) * 100) : 0;
  const retryable = Object.values(entries).filter((e) => e.status === "error" && e.retry).length;
  const queued = Object.values(entries).filter((e) => e.status === "queued").length;

  const renderState = (state, entry) => {
    switch (state) {
      case "saved":
        return (
          <span className={`${styles.lineState} ${styles.stateSaved}`} title="Saved">
            <Check size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Saved</span>
          </span>
        );
      case "saving":
        return (
          <span className={`${styles.lineState} ${styles.stateBusy}`} title="Saving">
            <Loader2 size={16} className={styles.spin} aria-hidden="true" />
            <span className={styles.srOnly}>Saving</span>
          </span>
        );
      case "dirty":
        return (
          <span className={`${styles.lineState} ${styles.stateDirty}`} title="Waiting to save">
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.srOnly}>Waiting to save</span>
          </span>
        );
      case "queued":
        return (
          <span className={`${styles.lineState} ${styles.stateQueued}`} title="Kept on this device until the connection is back">
            <Clock3 size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Waiting for connection</span>
          </span>
        );
      case "error":
      case "invalid":
        // The line's error text (below) says what went wrong.
        return (
          <span className={`${styles.lineState} ${styles.stateError}`} title={entry?.error || "Not saved"} aria-hidden="true">
            <CircleAlert size={16} />
          </span>
        );
      default:
        return <span className={styles.lineState} aria-hidden="true" />;
    }
  };

  const renderLine = (row) => {
    const entry = entries[row.invItemId];
    const state = stateOf(row, entry);
    const value = entry ? entry.draft : row.countedQty == null ? "" : String(row.countedQty);
    const sys = showFigures && row.systemQtyAtCount != null ? row.systemQtyAtCount : null;
    const diff = showFigures && state === "saved" && row.varianceQty != null ? row.varianceQty : null;
    const needsCount = uncounted?.ids.has(row.invItemId) && !COUNTED.has(state);
    const lineCls = [
      styles.line,
      focusReq?.id === row.invItemId ? styles.lineActive : "",
      needsCount ? styles.lineNeedsCount : "",
      state === "error" || state === "invalid" ? styles.lineHasError : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <li key={row.invItemId} className={lineCls} data-state={state}>
        <div className={styles.lineMain}>
          <div className={styles.lineName}>{row.displayName}</div>
          <div className={styles.lineMeta}>
            {row.itemCode && <span className={styles.mono}>{row.itemCode}</span>}
            {row.isNew && <span className={styles.tag}>Found while counting</span>}
            {needsCount && <span className={`${styles.tag} ${styles.tagWarn}`}>Not counted yet</span>}
            {state === "saved" && row.countedByName && (
              <span className={styles.faint}>
                {[row.countedByName, fmtDateTime(row.countedAt)].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          {sys !== null && (
            <div className={styles.lineFigures}>
              <span className={styles.figLabel}>System</span>
              <span className={styles.num}>{fmtQty(sys)}</span>
              {diff !== null && (
                <>
                  <span className={styles.figLabel}>Diff</span>
                  <span className={`${styles.num} ${diff < 0 ? styles.neg : diff > 0 ? styles.pos : styles.muted}`}>
                    {fmtSignedQty(diff)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.lineQty}>
          {canCount ? (
            <input
              ref={(el) => {
                if (el) inputRefs.current.set(row.invItemId, el);
                else inputRefs.current.delete(row.invItemId);
              }}
              className={styles.qtyInput}
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              // A scanner trigger pulled while this box has focus is a scan:
              // the wedge claims it (see onQtyKeyDown), not a quantity.
              data-scan-input="true"
              aria-label={`Counted qty for ${row.displayName}`}
              aria-invalid={state === "error" || state === "invalid" ? true : undefined}
              placeholder="Qty"
              value={value}
              onChange={(e) => onQtyChange(row.invItemId, e.target.value)}
              onKeyDown={(e) => onQtyKeyDown(row.invItemId, e)}
              onBlur={() => onQtyBlur(row.invItemId)}
            />
          ) : (
            <span className={`${styles.num} ${styles.qtyRead}`}>{fmtQty(row.countedQty)}</span>
          )}
          <span className={styles.uom}>{row.stockUom}</span>
        </div>

        {renderState(state, entry)}

        {(state === "error" || state === "invalid") && entry?.error && (
          <div className={styles.lineError} role="alert">
            <span>
              {entry.error}
              {entry.other && (
                <>
                  {" "}
                  <Link href={countPath(entry.other.id)} className={styles.inlineLink}>
                    {entry.other.number || `count #${entry.other.id}`}
                  </Link>
                </>
              )}
            </span>
            {entry.retry && (
              <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={() => retry(row.invItemId)}>
                <RotateCcw size={14} aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={styles.session}>
      {count?.isBlind && (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          <EyeOff size={16} aria-hidden="true" />
          <span>Blind count: count what is on the shelf. Expected quantities stay hidden until the count is submitted.</span>
        </div>
      )}

      {canCount ? (
        <section className={styles.card}>
          <ScanInput
            context={`hotel:${count.hotelId}`}
            placeholder="Scan an item to count it"
            onResolved={onResolved}
            onUnknown={(code) => setUnknownCode(code || null)}
            disabled={!!unknownCode || busy || !!confirm}
          />
        </section>
      ) : (
        <div className={`${styles.notice} ${styles.noticeNeutral}`}>
          <span>You can follow this count but not enter quantities.</span>
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.progressWrap}>
            <div className={styles.progressText}>
              <span>{`${counted} of ${total} counted`}</span>
              {pendingCount > 0 && <span className={styles.faint}>{`${pendingCount} saving`}</span>}
            </div>
            <div
              className={styles.progress}
              role="progressbar"
              aria-label="Items counted"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={counted}
            >
              <span style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          </div>

          <div className={styles.filterRow}>
            <div className={styles.segmented} role="group" aria-label="Show">
              {[
                ["all", `All ${total}`],
                ["todo", `To count ${total - counted}`],
                ["done", `Counted ${counted}`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.segment} ${filter === key ? styles.segmentOn : ""}`}
                  aria-pressed={filter === key}
                  onClick={() => chooseFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className={styles.searchField}>
              <Search size={15} aria-hidden="true" className={styles.searchIcon} />
              <span className={styles.srOnly}>Find an item, code or bin</span>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Find an item, code or bin"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
        </div>

        {uncounted && (
          <div className={`${styles.notice} ${styles.noticeWarn}`} role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <strong>{`${plural(uncounted.total, "item")} not counted yet`}</strong>
            <span>A full count needs every item counted (0 when the shelf is empty) before it can be submitted.</span>
          </div>
        )}

        {(retryable > 0 || queued > 0) && (
          <div className={`${styles.notice} ${retryable ? styles.noticeDanger : styles.noticeNeutral}`}>
            {retryable > 0 ? (
              <>
                <CircleAlert size={16} aria-hidden="true" />
                <span>{`${plural(retryable, "figure")} not saved.`}</span>
                <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={retryAll}>
                  <RotateCcw size={14} aria-hidden="true" />
                  Retry all
                </button>
              </>
            ) : (
              <>
                <Clock3 size={16} aria-hidden="true" />
                <span>{`${plural(queued, "figure")} kept on this device; they sync when the connection is back.`}</span>
              </>
            )}
          </div>
        )}

        {groups.length ? (
          <div className={styles.bins}>
            {groups.map((g) => (
              <div key={g.bin ?? "__none"} className={styles.binGroup}>
                <h3 className={styles.binHead}>
                  <span>{g.bin ? `Bin ${g.bin}` : "No bin"}</span>
                  <span className={styles.binCount}>{plural(g.rows.length, "item")}</span>
                </h3>
                <ul className={styles.lines}>{g.rows.map(renderLine)}</ul>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyLines}>
            {q ? (
              canCount ? (
                <AddItemSearch query={query.trim()} hotelId={count.hotelId} onPick={focusItem} />
              ) : (
                <p>No item on this count matches “{query.trim()}”.</p>
              )
            ) : filter === "todo" ? (
              <p>Everything on this count has a figure.</p>
            ) : filter === "done" ? (
              <p>Nothing counted yet.</p>
            ) : (
              <p>This count has no items yet. Scan an item to add it.</p>
            )}
          </div>
        )}
      </section>

      {(canCount || canCancel) && (
        <div className={styles.actionRow}>
          {canCancel && (
            <button type="button" className={`${styles.btn} ${styles.btnGhostDanger}`} onClick={() => setConfirm("cancel")}>
              Cancel count
            </button>
          )}
          {canCount && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onSubmitClick}
              disabled={busy || !counted}
            >
              {busy ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
              Submit for approval
            </button>
          )}
        </div>
      )}

      {canCount && (
        <MobileActionBar label="Count actions" summary={<span>{`${counted} of ${total} counted`}</span>}>
          <MobileActionButton variant="primary" onClick={onSubmitClick} disabled={busy || !counted}>
            Submit for approval
          </MobileActionButton>
        </MobileActionBar>
      )}

      {canCount && (
        <LinkUnknownCodeSheet
          show={!!unknownCode}
          code={unknownCode || ""}
          hotelId={count.hotelId}
          onHide={() => setUnknownCode(null)}
          onLinked={(item) => {
            setUnknownCode(null);
            focusItem(item);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirm === "submit"}
        onClose={() => setConfirm(null)}
        onConfirm={doSubmit}
        title="Submit this count?"
        description={confirmText}
        confirmButtonColor="primary"
        confirmButtonText="Submit count"
        cancelButtonText="Keep counting"
      />
      <ConfirmationModal
        isOpen={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        onConfirm={doCancel}
        title="Cancel this count?"
        description="Nothing is posted to stock. The quantities saved so far are kept on the cancelled count for reference."
        confirmButtonColor="danger"
        confirmButtonText="Yes, cancel it"
        cancelButtonText="Keep it"
      />
    </div>
  );
};

/**
 * Manual fallback for an item that is not on the count (and has no barcode):
 * search the item master and add it.
 */
const AddItemSearch = ({ query, hotelId, onPick }) => {
  const [state, setState] = useState({ loading: false, rows: null, error: null });
  const seq = useRef(0);

  useEffect(() => {
    setState({ loading: false, rows: null, error: null });
  }, [query]);

  const search = async () => {
    const n = ++seq.current;
    setState({ loading: true, rows: null, error: null });
    try {
      const res = await listItems({ search: query, hotelId });
      if (n !== seq.current) return;
      setState({ loading: false, rows: res?.rows || [], error: null });
    } catch (err) {
      if (n !== seq.current) return;
      setState({ loading: false, rows: null, error: getApiErrorMessage(err, "Could not search items") });
    }
  };

  return (
    <div className={styles.addSearch}>
      <p>No item on this count matches “{query}”.</p>
      {state.rows === null ? (
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={search} disabled={state.loading}>
          {state.loading ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
          Search all items
        </button>
      ) : state.rows.length ? (
        <ul className={styles.pickList}>
          {state.rows.slice(0, 20).map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={styles.pickRow}
                onClick={() => onPick({ invItemId: it.id, displayName: it.displayName, itemCode: it.itemCode, stockUom: it.stockUom })}
              >
                <PackagePlus size={16} aria-hidden="true" />
                <span className={styles.pickName}>{it.displayName}</span>
                {it.itemCode && <span className={styles.mono}>{it.itemCode}</span>}
                <span className={styles.uom}>{it.stockUom}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.faint}>No item in the item master matches either.</p>
      )}
      {state.error && <p className={styles.errorText}>{state.error}</p>}
    </div>
  );
};

export default CountSession;
