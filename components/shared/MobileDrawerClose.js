import React, { useEffect } from "react";
import { PanelLeftClose } from "lucide-react";
import styles from "./MobileDrawerClose.module.css";

/**
 * Escape closes an open mobile drawer. The drawer sits above the top bar
 * (z-index 1050), so the top bar's own "Close Sidebar" button is covered while
 * it is open — the drawer must be closable from inside itself.
 */
export const useEscapeToClose = (open, onClose) => {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
};

/** Visible close control rendered at the top of an open mobile drawer. */
const MobileDrawerClose = ({ onClose, label = "Close sidebar" }) => (
  <div className={styles.bar}>
    <button type="button" className={styles.btn} onClick={onClose} aria-label={label}>
      <PanelLeftClose size={15} strokeWidth={1.75} aria-hidden="true" />
      <span>Close</span>
    </button>
  </div>
);

export default MobileDrawerClose;
