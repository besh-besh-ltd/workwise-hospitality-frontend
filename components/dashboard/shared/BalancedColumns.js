/* ────────────────────────────────────────────────────────────
   BalancedColumns — two dashboard columns whose bottoms line up.

   Cards keep a single grid parent and only change their grid column, so
   moving a card never remounts it (no refetch, no lost state). Heights are
   measured with ResizeObserver; each card spans ROW-px grid rows in its
   column (dense masonry), and placement is re-planned only when the measured
   imbalance is worse than THRESHOLD and the plan actually improves it.

   Heights depend on the column (the left column is twice as wide), so a card's
   height is remembered per column; an unknown height in the other column is
   assumed equal to the known one, and corrected after the move is measured.
   A layout epoch (the set of cards + narrow/wide mode) allows at most
   MAX_REPLANS moves, so a card can never ping-pong between columns.

   Without ResizeObserver (SSR, tests) or below the one-column breakpoint the
   registry's own left/right assignment is used unchanged.
   ──────────────────────────────────────────────────────────── */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./BalancedColumns.module.scss";

export const ROW = 8;
export const GAP = 24;
export const THRESHOLD = 250;
export const MAX_REPLANS = 3;
const NARROW_QUERY = "(max-width: 992px)";

const sumOf = (items, cols, heightOf) => {
  let left = 0;
  let right = 0;
  items.forEach((it) => {
    const col = cols[it.key];
    const h = heightOf(it.key, col) + GAP;
    if (col === "left") left += h;
    else right += h;
  });
  return { left, right, diff: Math.abs(left - right) };
};

/**
 * Pick the left/right split of `items` that minimises the difference between
 * column heights. Both columns stay non-empty; ties go to the split that moves
 * the fewest cards away from their `defaultColumn`. Pure — exported for tests.
 *   items:    [{ key, defaultColumn: "left" | "right" }]
 *   heightOf: (key, column) => px
 */
export const planColumns = (items, heightOf) => {
  const n = items.length;
  const defaults = {};
  items.forEach((it) => { defaults[it.key] = it.defaultColumn === "right" ? "right" : "left"; });
  if (n < 2 || n > 12) return defaults;

  let best = null;
  for (let mask = 1; mask < (1 << n) - 1; mask += 1) {
    const cols = {};
    let moves = 0;
    items.forEach((it, i) => {
      cols[it.key] = mask & (1 << i) ? "right" : "left";
      if (cols[it.key] !== defaults[it.key]) moves += 1;
    });
    const { diff } = sumOf(items, cols, heightOf);
    if (!best || diff < best.diff - 0.5 || (Math.abs(diff - best.diff) <= 0.5 && moves < best.moves)) {
      best = { cols, diff, moves };
    }
  }
  return best ? best.cols : defaults;
};

/** Current imbalance of a placement. Exported for tests. */
export const imbalance = (items, cols, heightOf) => sumOf(items, cols, heightOf).diff;

const useNarrow = () => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrow(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else if (mq.addListener) mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else if (mq.removeListener) mq.removeListener(update);
    };
  }, []);
  return narrow;
};

/**
 * items: [{ key, node, defaultColumn: "left" | "right" }] in registry order.
 */
const BalancedColumns = ({ items, testId, className }) => {
  const narrow = useNarrow();
  const canMeasure = typeof window !== "undefined" && typeof window.ResizeObserver === "function";

  // `items` is rebuilt by the parent on every render; everything stable below
  // keys off the card set (defaultsKey / epochKey) and reads items via a ref.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const defaultsKey = items.map((it) => `${it.key}:${it.defaultColumn}`).join(",");
  const defaults = useMemo(() => {
    const d = {};
    itemsRef.current.forEach((it) => { d[it.key] = it.defaultColumn === "right" ? "right" : "left"; });
    return d;
  }, [defaultsKey]);

  const [cols, setCols] = useState(defaults);
  const [spans, setSpans] = useState({});
  const heights = useRef({}); // key → { left?: px, right?: px }
  const nodes = useRef({}); // key → inner element
  const replans = useRef(0);
  const timer = useRef(null);
  const colsRef = useRef(cols);
  colsRef.current = cols;

  // A new card set or a layout-mode switch starts a new epoch.
  const epochKey = `${items.map((it) => it.key).join(",")}|${narrow ? "n" : "w"}`;
  useEffect(() => {
    replans.current = 0;
    setCols((prev) => {
      const next = {};
      itemsRef.current.forEach((it) => { next[it.key] = prev[it.key] || defaults[it.key]; });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epochKey]);

  const heightOf = useCallback((key, col) => {
    const h = heights.current[key] || {};
    if (h[col] != null) return h[col];
    const other = col === "left" ? "right" : "left";
    return h[other] != null ? h[other] : 0;
  }, []);

  const replan = useCallback(() => {
    timer.current = null;
    const items = itemsRef.current;
    const current = colsRef.current;
    const measured = items.every((it) => heights.current[it.key]);
    if (!measured) return;
    const now = imbalance(items, current, heightOf);
    if (now <= THRESHOLD || replans.current >= MAX_REPLANS) return;
    const next = planColumns(items, heightOf);
    const changed = items.some((it) => next[it.key] !== current[it.key]);
    if (!changed) return;
    if (imbalance(items, next, heightOf) >= now - GAP) return; // not a real improvement
    replans.current += 1;
    setCols(next);
  }, [heightOf]);

  useEffect(() => {
    if (!canMeasure || narrow) return undefined;
    const ro = new window.ResizeObserver((entries) => {
      const nextSpans = {};
      entries.forEach((entry) => {
        const key = entry.target.getAttribute("data-balance-key");
        if (!key) return;
        const h = Math.ceil(entry.target.getBoundingClientRect().height);
        const col = colsRef.current[key] || "left";
        heights.current[key] = { ...(heights.current[key] || {}), [col]: h };
        nextSpans[key] = Math.max(1, Math.ceil((h + GAP) / ROW));
      });
      setSpans((prev) => {
        const changed = Object.keys(nextSpans).some((k) => prev[k] !== nextSpans[k]);
        return changed ? { ...prev, ...nextSpans } : prev;
      });
      // Debounced: a polling refresh that nudges heights doesn't re-plan per frame.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(replan, 150);
    });
    Object.values(nodes.current).forEach((el) => el && ro.observe(el));
    return () => {
      ro.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [canMeasure, narrow, epochKey, replan]);

  const balancing = canMeasure && !narrow;
  const measuredAll = balancing && items.every((it) => spans[it.key]);

  // DOM order follows the visual columns (left top→bottom, then right) so
  // keyboard and screen-reader order match what is on screen. Keys are stable,
  // so reordering siblings never remounts a card. Narrow: registry order.
  const ordered = narrow
    ? items
    : [...items].sort((a, b) => {
        const ca = (balancing ? cols[a.key] : defaults[a.key]) === "left" ? 0 : 1;
        const cb = (balancing ? cols[b.key] : defaults[b.key]) === "left" ? 0 : 1;
        return ca - cb || items.indexOf(a) - items.indexOf(b);
      });

  return (
    <div
      className={`${styles.grid} ${measuredAll ? styles.masonry : ""} ${className || ""}`}
      data-testid={testId}
    >
      {ordered.map((it) => {
        const col = balancing ? cols[it.key] : defaults[it.key];
        return (
          <div
            key={it.key}
            className={col === "right" ? styles.right : styles.left}
            data-column={col}
            data-testid={`balanced-${it.key}`}
            style={measuredAll ? { gridRowEnd: `span ${spans[it.key]}` } : undefined}
          >
            <div
              className={styles.inner}
              data-balance-key={it.key}
              ref={(el) => { nodes.current[it.key] = el; }}
            >
              {it.node}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BalancedColumns;
