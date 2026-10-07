import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard + focus behaviour for a hand-rolled modal dialog:
 *   • focus moves into the dialog on open (first focusable, else the dialog)
 *   • Tab / Shift+Tab stay inside the dialog
 *   • Escape calls onClose
 *   • focus returns to whatever opened the dialog when it closes
 *
 * Attach the returned ref to the element carrying role="dialog" (give it
 * tabIndex={-1} so it can take focus when it has no focusable children).
 */
export default function useDialogA11y(onClose) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previouslyFocused = document.activeElement;
    const node = dialogRef.current;
    const focusables = () =>
      node ? Array.from(node.querySelectorAll(FOCUSABLE)).filter((el) => el.getAttribute("aria-hidden") !== "true") : [];

    const first = focusables()[0];
    (first || node)?.focus?.();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const els = focusables();
      if (!els.length) {
        e.preventDefault();
        node.focus();
        return;
      }
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === node)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, []);

  return dialogRef;
}
