import React from "react";
import { Check, Plus, AlertTriangle, Send, Pen, Inbox, Truck } from "lucide-react";
import styles from "./DashboardSurface.module.scss";

const ICON_LIB = {
  check: Check,
  plus: Plus,
  alert: AlertTriangle,
  send: Send,
  pen: Pen,
  inbox: Inbox,
  truck: Truck,
};
const TONE_LIB = {
  success: styles.aiSuccess,
  warn: styles.aiWarn,
  info: styles.aiInfo,
  violet: styles.aiViolet,
  danger: styles.aiDanger,
};

/**
 * ActivityFeed — timeline-style list of recent events.
 *
 * Props:
 *   items Array<{
 *     key?:    string,
 *     icon:    string | component  // one of ICON_LIB keys, or a Lucide component
 *     tone:    "success"|"warn"|"info"|"violet"|"danger"
 *     who:     string              // bolded actor
 *     text:    string              // verb phrase
 *     meta:    string | node       // small grey meta line
 *     metaHref: string             // optional link target for meta
 *     time:    string              // relative time
 *   }>
 */
const ActivityFeed = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <div className={styles.activityFeed}>
      {items.map((a, i) => {
        const Icon = typeof a.icon === "string" ? ICON_LIB[a.icon] || Check : a.icon || Check;
        const tone = TONE_LIB[a.tone] || "";
        return (
          <div key={a.key ?? i} className={styles.activityItem}>
            <div className={`${styles.aiIc} ${tone}`}>
              <Icon size={13} strokeWidth={2} />
            </div>
            <div className={styles.aiBody}>
              <div className={styles.aiText}>
                {a.who && <span className={styles.em}>{a.who}</span>} {a.text}
              </div>
              {a.meta && (
                <div className={styles.aiMeta}>
                  {a.metaHref ? <a href={a.metaHref}>{a.meta}</a> : a.meta}
                </div>
              )}
            </div>
            {a.time && <div className={styles.aiTime}>{a.time}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
