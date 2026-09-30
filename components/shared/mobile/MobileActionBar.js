import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./MobileActionBar.module.css";

// How many bars are mounted right now. A page can briefly hold two (a route
// transition, or a list page with a nested detail), and the body flag must
// only drop when the last one unmounts.
let mountedBars = 0;
const BODY_FLAG = "has-mobile-action-bar";

/**
 * The phone-only decision bar: pinned to the bottom of the screen at
 * <=768px, invisible (display:none) above that, so desktop keeps its own
 * in-page buttons untouched.
 *
 * Why a shared component: an approver deciding from a phone should never
 * have to scroll past a 20-row items table to find Approve. Every decision
 * surface (PO, commercial evaluation, negotiation round, vendor quote / PO
 * acceptance) renders one of these with the same primary action it already
 * shows on desktop.
 *
 * While mounted it sets `body.has-mobile-action-bar`, which is what lifts
 * the floating assistant button and hides the push-permission card — both
 * otherwise sit exactly on top of the bar's right-hand (usually primary)
 * button.
 *
 * Props:
 *   summary   optional node shown above the buttons (e.g. "₹15,55,004 · 3 items")
 *   children  the buttons — use <MobileActionButton>
 *   label     accessible name for the region
 */
export default function MobileActionBar({ summary, children, label = "Actions" }) {
  const [host, setHost] = useState(null);

  useEffect(() => {
    setHost(document.body);
    mountedBars += 1;
    document.body.classList.add(BODY_FLAG);
    return () => {
      mountedBars = Math.max(0, mountedBars - 1);
      if (mountedBars === 0) document.body.classList.remove(BODY_FLAG);
    };
  }, []);

  const bar = (
    <div className={styles.bar} role="region" aria-label={label} data-mobile-action-bar="">
      {summary ? <div className={styles.summary}>{summary}</div> : null}
      <div className={styles.actions}>{children}</div>
    </div>
  );

  return (
    <>
      {/* In-flow spacer so the fixed bar never covers the last section. */}
      <div className={styles.spacer} aria-hidden="true" />
      {host ? createPortal(bar, host) : null}
    </>
  );
}

/**
 * A 44px-tall touch target. Deliberately not `.btn`: the dashboard's
 * `body.dashboard-route .btn` overrides shrink every .btn to ~26px on
 * phones with !important.
 */
export function MobileActionButton({
  variant = "secondary",
  className = "",
  type = "button",
  children,
  ...rest
}) {
  const v = styles[variant] || styles.secondary;
  return (
    <button type={type} className={`${styles.btn} ${v} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
