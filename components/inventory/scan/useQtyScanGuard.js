import { useCallback, useEffect, useRef } from "react";
import { WEDGE_MAX_INTER_KEY_MS, WEDGE_SCAN_EVENT } from "./useWedgeScanner";

// A quantity box that a keyboard-mode scanner may "type" into: the receiver
// still has a qty box focused when they pull the trigger on the next item.
// The box is marked `data-scan-input`, so useWedgeScanner reads the burst as a
// scan; this hook puts back what the box (and its line) held before the burst
// started, so the code never lands in the qty. The scanner tells the box first
// (WEDGE_SCAN_EVENT, before it hands the code on), so a scan that is applied
// at once to this same line counts on top of the restored qty, not the code.
//
//   const qtyKeyDown = useQtyScanGuard(entry, restore);
//   <input data-scan-input="true" onKeyDown={qtyKeyDown()} ... />
//
// `entry` is the line's state now; `restore(entry)` writes a snapshot back.
// qtyKeyDown(onText) also hands the box's own text back, for a box that keeps
// its text locally. A person's Enter (no scan) finishes the edit: the box
// loses focus, so a scan that follows lands in no field at all.

export function useQtyScanGuard(entry, restore) {
  const entryRef = useRef(entry);
  const restoreRef = useRef(restore);
  const burstRef = useRef(null);
  useEffect(() => {
    entryRef.current = entry;
    restoreRef.current = restore;
  });

  const putBack = useCallback(() => {
    const b = burstRef.current;
    burstRef.current = null;
    if (!b) return;
    restoreRef.current?.(b.snapshot);
    b.onText?.(b.text);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onScan = (e) => {
      if (burstRef.current && burstRef.current.el === e.target) putBack();
    };
    window.addEventListener(WEDGE_SCAN_EVENT, onScan, true);
    return () => window.removeEventListener(WEDGE_SCAN_EVENT, onScan, true);
  }, [putBack]);

  return useCallback((onText) => (e) => {
    const now = Date.now();
    const { key } = e;
    const el = e.currentTarget;
    const b = burstRef.current;
    if (typeof key === "string" && key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!b || b.el !== el || now - b.lastAt > WEDGE_MAX_INTER_KEY_MS) {
        burstRef.current = { el, lastAt: now, snapshot: entryRef.current, text: el.value, onText };
      } else {
        b.lastAt = now;
      }
      return;
    }
    if (key !== "Enter" && key !== "Tab") return;
    // Claimed as a scan: normally already put back when the scanner said so.
    if (e.nativeEvent?.defaultPrevented) {
      if (b && b.el === el) putBack();
      return;
    }
    burstRef.current = null;
    if (key === "Enter") {
      e.preventDefault();
      el.blur();
    }
  }, [putBack]);
}

export default useQtyScanGuard;
