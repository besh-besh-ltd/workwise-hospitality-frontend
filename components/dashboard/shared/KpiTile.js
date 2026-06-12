import React from "react";
import styles from "./DashboardSurface.module.scss";

/**
 * KpiTile — accent-edged metric tile used at the top of dashboards.
 *
 * Props:
 *   label    string                    — UPPERCASE label
 *   value    string | number | node    — big mono value (use <Cur>X</Cur> spans inline if needed)
 *   sub      node                      — supporting line below
 *   icon     component                 — Lucide icon (rendered in soft chip)
 *   accent   "accent"|"success"|"violet"|"warn"|"info"|"danger" (default "accent")
 *   currency string                    — wrap value with currency symbol (e.g. "₹") + suffix
 *   suffix   string                    — e.g. " Cr"
 */
const ACCENT_CLASS = {
  accent: styles.kpiAccent,
  success: styles.kpiSuccess,
  violet: styles.kpiViolet,
  warn: styles.kpiWarn,
  info: styles.kpiInfo,
  danger: styles.kpiDanger,
};

const KpiTile = ({ label, value, sub, icon: Icon, accent = "accent", currency, suffix }) => {
  const accentCls = ACCENT_CLASS[accent] || ACCENT_CLASS.accent;
  return (
    <div className={`${styles.kpiTile} ${accentCls}`}>
      <div className={styles.ktRow}>
        <div className={styles.ktLabel}>{label}</div>
        {Icon && (
          <div className={styles.ktIc}>
            <Icon size={14} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className={styles.ktVal}>
        {currency && <span className={styles.cur}>{currency}</span>}
        <span>{value}</span>
        {suffix && <span className={styles.cur}>{suffix}</span>}
      </div>
      {sub != null && <div className={styles.ktSub}>{sub}</div>}
    </div>
  );
};

export default KpiTile;
