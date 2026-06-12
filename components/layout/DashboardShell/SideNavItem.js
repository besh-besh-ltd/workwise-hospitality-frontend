import React, { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Lock } from "lucide-react";
import styles from "./DashboardShell.module.css";

/**
 * Nav item — two modes:
 *  - expanded (compact=false): icon + label row
 *  - compact  (compact=true):  icon-only button with portal tooltip
 */
const SideNavItem = ({
  href,
  label,
  Icon,
  active,
  compact,
  locked,
  hasPending,
  isNew,
  isLegacy,
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const itemRef = useRef(null);

  const showTooltip = useCallback(() => {
    if (!itemRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    setTooltipPos({
      left: rect.right + 10,
      top: rect.top + rect.height / 2,
    });
    setTooltipVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  // Portal tooltip — rendered at document.body to escape all overflow clipping
  const tooltip = compact && typeof document !== "undefined"
    ? createPortal(
        <span
          className={styles.navTooltip}
          style={{
            left: tooltipPos.left,
            top: tooltipPos.top,
            transform: "translateY(-50%)",
            opacity: tooltipVisible ? 1 : 0,
          }}
        >
          {label}{locked ? " (locked)" : ""}
        </span>,
        document.body
      )
    : null;

  if (compact) {
    const dotEl = hasPending ? (
      <span className={`${styles.approvalDot} ${styles.approvalDotCompact}`} />
    ) : isNew ? (
      <span className={styles.newDotCompact} />
    ) : null;

    if (locked) {
      return (
        <>
          <div
            ref={itemRef}
            className={`${styles.navItemCompact} ${styles.navItemCompactDisabled}`}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            <Lock size={16} strokeWidth={2} />
          </div>
          {tooltip}
        </>
      );
    }

    return (
      <>
        <Link
          href={href}
          ref={itemRef}
          className={`${styles.navItemCompact} ${active ? styles.navItemCompactActive : ""}`}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
        >
          {Icon && <Icon size={16} strokeWidth={2} />}
          {dotEl}
        </Link>
        {tooltip}
      </>
    );
  }

  /* ── Expanded mode ── */
  const iconEl = (
    <span className={styles.navIcon}>
      {Icon ? <Icon size={16} strokeWidth={2} /> : null}
    </span>
  );

  if (locked) {
    return (
      <div className={`${styles.navItem} ${styles.navItemDisabled}`} title="Subscription required">
        {iconEl}
        <span className={styles.navLabel}>{label}</span>
        <Lock className={styles.lockIcon} size={14} strokeWidth={2} />
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
      title={isLegacy ? "Legacy page — use the new Purchase Orders section" : undefined}
    >
      {iconEl}
      <span className={styles.navLabel}>{label}</span>
      {isNew && <span className={styles.newBadge}>NEW</span>}
      {isLegacy && <span className={styles.legacyBadge}>LEGACY</span>}
      {hasPending && <span className={styles.approvalDot} />}
    </Link>
  );
};

export default SideNavItem;
