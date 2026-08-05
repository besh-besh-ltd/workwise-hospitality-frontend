import React from "react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import styles from "./DashboardSurface.module.scss";

const TONE_MAP = {
  urgent: { cls: "", Icon: AlertTriangle },
  allClear: { cls: styles.acAllClear, Icon: CheckCircle },
  info: { cls: styles.acInfo, Icon: Info },
};

/**
 * ActionBanner — prominent top banner. Pick a tone:
 *   "urgent"   — amber, used for "Your turn", pending action
 *   "allClear" — green, "All caught up"
 *   "info"     — blue, neutral notice
 *
 * Props:
 *   tone     "urgent"|"allClear"|"info"  (default "urgent")
 *   icon     component                   — override the default tone icon
 *   title    string | node
 *   sub      string | node
 *   actions  node                        — right-side buttons / links
 */
const ActionBanner = ({ tone = "urgent", icon: IconOverride, title, sub, actions }) => {
  const meta = TONE_MAP[tone] || TONE_MAP.urgent;
  const Icon = IconOverride || meta.Icon;
  return (
    <section className={`${styles.actionCenter} ${meta.cls}`}>
      <div className={styles.acIcon}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className={styles.acBody}>
        <div className={styles.acTitle}>{title}</div>
        {sub && <div className={styles.acSub}>{sub}</div>}
      </div>
      {actions && <div className={styles.acActions}>{actions}</div>}
    </section>
  );
};

export default ActionBanner;
