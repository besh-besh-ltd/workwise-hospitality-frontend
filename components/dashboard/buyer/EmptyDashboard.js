/* ────────────────────────────────────────────────────────────
   EmptyDashboard — shown when the user has no dashboard.* grants
   for the currently-selected business unit(s).
   ──────────────────────────────────────────────────────────── */

import React from "react";
import { LayoutDashboard, Building2, ArrowRight } from "lucide-react";
import styles from "./EmptyDashboard.module.scss";

/**
 * Friendly empty state. We deliberately do NOT auto-redirect —
 * users need to understand why the dashboard is empty (admin
 * hasn't granted them widgets for this BU) rather than be
 * silently bounced elsewhere.
 *
 * Props:
 *   selectedHotelLabel  string  — "Hotel A" / "All Business Units" etc.
 *   onChangeBu          fn      — opens BU picker (focuses HotelFilter).
 *   contactAdminEmail   string  — optional, surfaces a mailto link.
 */
const EmptyDashboard = ({
  selectedHotelLabel,
  onChangeBu,
  contactAdminEmail,
}) => {
  const buLabel = selectedHotelLabel || "the selected business unit";

  return (
    <div className={styles.empty} role="status" aria-live="polite">
      <div className={styles.icon}>
        <LayoutDashboard size={28} strokeWidth={1.6} />
      </div>

      <h2 className={styles.title}>No dashboards assigned</h2>

      <p className={styles.subtitle}>
        You don't have any dashboard widgets configured for{" "}
        <strong className={styles.buName}>
          <Building2 size={13} />
          {buLabel}
        </strong>
        .
      </p>

      <p className={styles.help}>
        Your administrator decides which widgets each role can see in a
        business unit. Ask them to grant you the relevant{" "}
        <code className={styles.code}>dashboard.*</code> permissions for
        this business unit.
      </p>

      <div className={styles.actions}>
        {onChangeBu && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onChangeBu}
          >
            Switch business unit
            <ArrowRight size={14} />
          </button>
        )}
        {contactAdminEmail && (
          <a
            href={`mailto:${contactAdminEmail}?subject=${encodeURIComponent(
              "Dashboard access request"
            )}&body=${encodeURIComponent(
              `Hi, please grant me dashboard access for ${buLabel}.`
            )}`}
            className={styles.secondaryBtn}
          >
            Contact admin
          </a>
        )}
      </div>
    </div>
  );
};

export default EmptyDashboard;
