import { useEffect, useRef } from "react";

// Keyboard-wedge scanners (USB, Bluetooth, the trigger on a rugged Android
// handheld) "type" a whole code in a few milliseconds and end it with Enter
// or Tab. People type an order of magnitude slower, so a burst of printable
// keys with every gap under `maxInterKeyMs`, ended by Enter/Tab, is a scan.
//
// The listener is on window in the capture phase, so a scan is caught with
// nothing focused. Keys typed into another field (a quantity box, a search)
// belong to that field and are ignored; a field marked `data-scan-input` (the
// ScanInput box) is the exception. When a burst is claimed the terminator's
// default is prevented, so it neither submits a form nor moves focus; that is
// how ScanInput tells a wedge scan from a hand-typed Enter.
//
// Mount one scanner per screen: two would each claim the same burst.

const isEditable = (el) => {
  if (!el || el.nodeType !== 1) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const claimsScans = (el) => el?.closest?.("[data-scan-input]") != null;

export function useWedgeScanner({ onCode, minLength = 4, maxInterKeyMs = 35, enabled = true } = {}) {
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    // A terminator may lag the last character a little (Bluetooth batching).
    const terminatorGraceMs = Math.max(100, maxInterKeyMs * 3);
    let buffer = "";
    let lastAt = 0;

    const reset = () => {
      buffer = "";
      lastAt = 0;
    };

    const onKeyDown = (e) => {
      const target = e.target;
      if (isEditable(target) && !claimsScans(target)) {
        reset();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        reset();
        return;
      }
      const now = Date.now();
      const { key } = e;
      if (key === "Enter" || key === "Tab") {
        const fresh = lastAt > 0 && now - lastAt <= terminatorGraceMs;
        const code = buffer;
        reset();
        if (fresh && code.length >= minLength) {
          e.preventDefault();
          onCodeRef.current?.(code);
        }
        return;
      }
      // Shift, CapsLock and other named keys do not break a burst.
      if (typeof key !== "string" || key.length !== 1) return;
      if (now - lastAt > maxInterKeyMs) buffer = "";
      buffer += key;
      lastAt = now;
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, minLength, maxInterKeyMs]);
}

export default useWedgeScanner;
