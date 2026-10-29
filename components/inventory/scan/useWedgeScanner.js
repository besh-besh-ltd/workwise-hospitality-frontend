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
// how ScanInput tells a wedge scan from a hand-typed Enter. Before the code is
// handed on, the field the burst was typed into gets WEDGE_SCAN_EVENT (it
// does not bubble; listen on window in the capture phase): a qty box marked
// `data-scan-input` puts back what it held (useQtyScanGuard), so a scan that
// is applied at once never counts on top of its own digits.
//
// GS1-128 and GS1 DataMatrix reads carry GS (FNC1) separators, a control
// character no keyboard key types. Scanners send it as Ctrl+] (or Alt+029 on
// the numeric keypad, or a bare "\x1D" key). Inside a burst those are the GS,
// not a shortcut: without it a GS1 read loses everything before the first
// separator. A lone modifier press (Shift, Ctrl, Alt) neither ends nor
// extends a burst; any other Ctrl / Alt / Meta chord still ends it.
//
// Mount one scanner per screen: two would each claim the same burst.

/** The default gap between a scanner's keystrokes (a person types far slower). */
export const WEDGE_MAX_INTER_KEY_MS = 35;
/** Sent to the burst's field when its burst is claimed as a scan. */
export const WEDGE_SCAN_EVENT = "inventory:wedge-scan";
const GS = "\x1d";
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock"]);

const isGsChord = (e) =>
  e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "]" || e.code === "BracketRight" || e.key === GS);

/** The digit of a numeric-keypad key (Alt codes are typed there), else null. */
const keypadDigit = (e) => {
  const m = /^Numpad([0-9])$/.exec(e.code || "");
  return m ? m[1] : null;
};

const isEditable = (el) => {
  if (!el || el.nodeType !== 1) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const claimsScans = (el) => el?.closest?.("[data-scan-input]") != null;

export function useWedgeScanner({ onCode, minLength = 4, maxInterKeyMs = WEDGE_MAX_INTER_KEY_MS, enabled = true } = {}) {
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
    // Keypad digits typed while Alt is held (an Alt code), or null.
    let altDigits = null;

    const reset = () => {
      buffer = "";
      lastAt = 0;
    };
    const live = (now) => lastAt > 0 && now - lastAt <= maxInterKeyMs;
    const push = (ch, now) => {
      if (!live(now)) buffer = "";
      buffer += ch;
      lastAt = now;
    };
    const ignored = (target) => isEditable(target) && !claimsScans(target);

    const onKeyDown = (e) => {
      const target = e.target;
      if (ignored(target)) {
        reset();
        altDigits = null;
        return;
      }
      const now = Date.now();
      const { key } = e;
      if (MODIFIER_KEYS.has(key)) {
        if (key === "Alt") altDigits = "";
        return;
      }
      if (isGsChord(e)) {
        push(GS, now);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && altDigits !== null && keypadDigit(e) !== null) {
        altDigits += keypadDigit(e);
        if (live(now)) lastAt = now; // the Alt code is part of a running burst
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        reset();
        return;
      }
      if (key === "Enter" || key === "Tab") {
        const fresh = lastAt > 0 && now - lastAt <= terminatorGraceMs;
        const code = buffer;
        reset();
        if (fresh && code.length >= minLength) {
          e.preventDefault();
          if (typeof target?.dispatchEvent === "function" && typeof Event === "function") {
            target.dispatchEvent(new Event(WEDGE_SCAN_EVENT));
          }
          onCodeRef.current?.(code);
        }
        return;
      }
      // CapsLock and other named keys do not break a burst.
      if (typeof key !== "string" || key.length !== 1) return;
      push(key, now);
    };

    // An Alt code is typed when Alt comes up: 29 (or 029, 0029) is GS.
    const onKeyUp = (e) => {
      if (e.key !== "Alt" || altDigits === null) return;
      const digits = altDigits;
      altDigits = null;
      if (!digits || ignored(e.target)) return;
      if (Number(digits) === 29) push(GS, Date.now());
      else reset();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [enabled, minLength, maxInterKeyMs]);
}

export default useWedgeScanner;
