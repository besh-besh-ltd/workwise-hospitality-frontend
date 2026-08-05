import React from "react";
import styles from "./DashboardSurface.module.scss";

/**
 * DashPanel — card shell with iconified head + body + optional foot.
 *
 * Props:
 *   title       string | node             — h3
 *   subtitle    string | node             — small grey "h-sub" on the right of the head
 *   icon        component                 — Lucide icon, rendered in a soft chip in front of the title
 *   actions     node                      — alternative to subtitle, placed on the right
 *   foot        node                      — optional foot row
 *   noPad       boolean                   — render body with no padding (for full-bleed lists)
 *   className   string                    — extra class on root
 */
const DashPanel = ({ title, subtitle, icon: Icon, actions, foot, noPad, children, className }) => {
  return (
    <section className={`${styles.dashPanel} ${className || ""}`}>
      {(title || subtitle || actions) && (
        <div className={styles.dashPanelHead}>
          <h3>
            {Icon && (
              <span className={styles.ic}>
                <Icon size={13} strokeWidth={2} />
              </span>
            )}
            {title}
          </h3>
          {actions ?? (subtitle && <div className={styles.hSub}>{subtitle}</div>)}
        </div>
      )}
      <div className={`${styles.dashPanelBody} ${noPad ? styles.noPad : ""}`}>{children}</div>
      {foot && <div className={styles.dashPanelFoot}>{foot}</div>}
    </section>
  );
};

export default DashPanel;
