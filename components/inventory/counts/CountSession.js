import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { CircleAlert, Clock3, EyeOff, Loader2, RotateCcw, Search, Send } from "lucide-react";
import { cancelCount, submitCount } from "@/services/inventory";
import ScanInput from "@/components/inventory/scan/ScanInput";
import LinkUnknownCodeSheet from "@/components/inventory/scan/LinkUnknownCodeSheet";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import { getApiErrorMessage } from "@/utils/apiError";
import AddItemSearch from "./AddItemSearch";
import CountLine from "./CountLine";
import useCountLineSaver, { COUNTED, PENDING, stripFlags } from "./useCountLineSaver";
import { byBinThenName, errorInfo, escapeHtml, plural } from "./countUtils";
import styles from "./counts.module.scss";

export { SAVE_DEBOUNCE_MS, stripFlags } from "./useCountLineSaver";

// The counting screen of an open count (mobile first, scan first).
//
// Walk the store bin by bin: scan an item (or find it in the list), type what
// is on the shelf. Saving is useCountLineSaver's job; this screen finds lines,
// filters them, and submits or cancels the count.
//
// Blind counts never show system quantities or differences here, whoever is
// counting.
//
// Props: { count, onCountChange(nextCount), onReload() → Promise<Count|null> }

// useWedgeScanner's burst gap: keys closer together than this are a scanner.
const WEDGE_GAP_MS = 35;

const CountSession = ({ count, onCountChange, onReload }) => {
  const canCount = count?.can?.count === true && count?.status === "open";
  const canCancel = count?.can?.approve === true && (count?.status === "open" || count?.status === "submitted");
  const showFigures = count?.isBlind !== true;

  const [added, setAdded] = useState([]); // items found while counting that the count does not hold yet
  const addedRef = useRef(added);
  const inputRefs = useRef(new Map());
  const saverRef = useRef(null);

  /** After a reload: a found item the count does not hold and nothing was typed for is stale. */
  const pruneAdded = (fresh) => {
    const latest = fresh || saverRef.current?.countRef.current;
    const onCount = new Set((latest?.lines || []).map((l) => Number(l.invItemId)));
    const live = saverRef.current?.entriesRef.current || {};
    const focused = typeof document === "undefined" ? null : document.activeElement;
    const keep = addedRef.current.filter((a) => {
      if (onCount.has(a.invItemId)) return false;
      const e = live[a.invItemId];
      return (e && e.status !== "blank") || (focused && inputRefs.current.get(a.invItemId) === focused);
    });
    if (keep.length !== addedRef.current.length) {
      addedRef.current = keep;
      setAdded(keep);
    }
  };

  const saver = useCountLineSaver({ count, onCountChange, onReload, onReloaded: pruneAdded, guard: canCount });
  saverRef.current = saver;
  const { entries, entriesRef } = saver;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pinned, setPinned] = useState(null); // ids shown under "To count" until the filter changes
  const [uncounted, setUncounted] = useState(null); // {ids:Set, total}
  const [focusReq, setFocusReq] = useState(null); // {id, n}
  const [unknownCode, setUnknownCode] = useState(null);
  const [confirm, setConfirm] = useState(null); // 'submit' | 'cancel'
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const burstRef = useRef(null);

  // ── Rows ───────────────────────────────────────────────────────────────────
  const onCountIds = useMemo(() => new Set((count?.lines || []).map((l) => Number(l.invItemId))), [count]);
  const rows = useMemo(
    () => [...(count?.lines || []), ...added.filter((a) => !onCountIds.has(a.invItemId))].sort(byBinThenName),
    [count, added, onCountIds]
  );

  const stateOf = (row, entry) => (entry ? entry.status : row.countedQty != null ? "saved" : "todo");

  const counted = rows.filter((r) => COUNTED.has(stateOf(r, entries[r.invItemId]))).length;
  const pendingCount = Object.values(entries).filter((e) => PENDING.has(e.status)).length;

  // ── Typing ─────────────────────────────────────────────────────────────────
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
      saver.restoreEntry(id, burstRef.current?.id === id ? burstRef.current.snapshot : entriesRef.current[id]);
      burstRef.current = null;
      return;
    }
    burstRef.current = null;
    if (key === "Enter") {
      // Save, then go on to the next line on screen (walking order); the last one closes the keyboard.
      e.preventDefault();
      saver.flush();
      const order = visible.map((r) => r.invItemId);
      const next = inputRefs.current.get(order[order.indexOf(id) + 1]);
      if (next) {
        next.focus();
        if (typeof next.scrollIntoView === "function") next.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        e.currentTarget.blur();
      }
    }
  };

  // ── Finding a line ─────────────────────────────────────────────────────────
  const focusItem = (item) => {
    const id = Number(item?.invItemId);
    if (!id) return;
    const onCount = (saver.countRef.current?.lines || []).some((l) => Number(l.invItemId) === id);
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

  /** Take a found item off again before its figure is saved. */
  const removeAdded = (id) => {
    saver.drop(id);
    const next = addedRef.current.filter((a) => a.invItemId !== id);
    addedRef.current = next;
    setAdded(next);
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

  /** The lines of a count still without a figure, in walking order. */
  const uncountedOf = (c) => (c?.lines || []).filter((l) => l.countedQty == null).sort(byBinThenName);

  /** Why the count can't be submitted yet (and say so), or null when it can. */
  const submitBlocker = async () => {
    await saver.settleAll();
    // Figures the outbox kept may have synced since: ask the server first.
    if (Object.values(entriesRef.current).some((e) => e.status === "queued")) await saver.recheckQueued();
    if (saver.countRef.current?.status !== "open") return "closed"; // submitted or cancelled meanwhile

    // Count saves still in the outbox (from this visit or an earlier one) would
    // reach the server after the submit and be refused: their figures lost.
    const waitingSaves = saver.pendingRef.current;
    if (waitingSaves > 0) {
      toast.error(`${plural(waitingSaves, "save")} still waiting to sync. Sync them, then submit.`);
      return "waiting";
    }
    const open = Object.values(entriesRef.current);
    const waiting = open.filter((e) => e.status === "queued").length;
    const stuck = open.filter((e) => PENDING.has(e.status)).length;
    if (waiting && waiting === stuck) {
      toast.error(`${plural(waiting, "quantity", "quantities")} still waiting to sync. Sync them, then submit.`);
      return "waiting";
    }
    if (stuck) {
      toast.error(`${plural(stuck, "quantity", "quantities")} not saved yet. Fix or retry them, then submit.`);
      return "unsaved";
    }
    return null;
  };

  const onSubmitClick = async () => {
    setBusy(true);
    let latest;
    let left;
    try {
      if (await submitBlocker()) return;
      // Only what the count holds decides: a found item with no figure yet is not on it.
      latest = saver.countRef.current;
      left = uncountedOf(latest);
      if (latest?.scope === "FULL" && left.length) {
        // Another device may have counted these since this page loaded: look
        // again before asking for them here, so its figures aren't counted over.
        const fresh = await saver.reload();
        if (fresh) {
          latest = fresh;
          left = uncountedOf(fresh);
        }
      }
    } finally {
      setBusy(false);
    }
    const done = (latest?.lines || []).length - left.length;
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
        // The server lists at most 50; the reloaded count names them all.
        const fresh = await saver.reload();
        const left = fresh ? uncountedOf(fresh).map((l) => l.invItemId) : [];
        if (left.length) showUncounted(left, left.length);
        else {
          const ids = details.uncounted.map((u) => u.invItemId);
          showUncounted(ids, Number(details.uncountedTotal) || ids.length);
        }
        return;
      }
      toast.error(getApiErrorMessage(err, "Could not submit the count"));
      if (code === "CONFLICT" || code === "NOT_FOUND") saver.reload();
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
      if (code === "CONFLICT" || code === "NOT_FOUND") saver.reload();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const total = rows.length;
  const pct = total ? Math.round((counted / total) * 100) : 0;
  const retryable = Object.values(entries).filter((e) => e.status === "error" && e.retry).length;
  const queued = Object.values(entries).filter((e) => e.status === "queued").length;

  const lastVisibleId = visible.length ? visible[visible.length - 1].invItemId : null;
  const renderLine = (row) => {
    const entry = entries[row.invItemId];
    const state = stateOf(row, entry);
    const id = row.invItemId;
    const found = row.isNew && !onCountIds.has(id) && state !== "saving" && state !== "queued";
    return (
      <CountLine
        key={id}
        row={row}
        entry={entry}
        state={state}
        showFigures={showFigures}
        canCount={canCount}
        active={focusReq?.id === id}
        needsCount={uncounted?.ids.has(id) && !COUNTED.has(state)}
        inputRef={(el) => {
          if (el) inputRefs.current.set(id, el);
          else inputRefs.current.delete(id);
        }}
        onChange={(text) => saver.setDraft(id, text)}
        onKeyDown={(e) => onQtyKeyDown(id, e)}
        onBlur={() => saver.leaveLine(id)}
        onRetry={() => saver.retry(id)}
        onRemove={canCount && found ? () => removeAdded(id) : undefined}
        last={id === lastVisibleId}
      />
    );
  };

  return (
    <div className={styles.session}>
      {count?.isBlind && (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          <EyeOff size={16} aria-hidden="true" />
          <span>
            {count?.can?.approve === true
              ? "Blind count: count what is on the shelf. Expected quantities stay hidden while counting; you see them on the review once the count is submitted."
              : "Blind count: count what is on the shelf. Expected quantities stay hidden from counters."}
          </span>
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
                <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={saver.retryAll}>
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

export default CountSession;
