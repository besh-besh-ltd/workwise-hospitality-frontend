/* Shape-accurate skeleton loaders for dashboard widgets.
 * Each component mirrors the layout of the real content so the load
 * feels natural (no big-3-bar generic). Used by widgets via the
 * `skeleton` prop on PersonaCard / PersonaCardShell.
 */
import React from "react";
import styles from "./DashboardSurface.module.scss";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* ── KPI grid (Action centre / Procurement snapshot / Opportunities / Performance funnel) */
export const SkeletonKpiGrid = ({ count = 4 }) => {
  const cols = clamp(count, 2, 6);
  return (
    <div className={`${styles.skKpiGrid} ${styles[`cols${cols}`]}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div className={styles.skKpiTile} key={i}>
          <div className={styles.skKpiHead}>
            <span className={styles.skBar} />
            <span className={styles.skIcon} />
          </div>
          <span className={`${styles.skBar} ${styles.skVal}`} />
          <span className={`${styles.skBar} ${styles.skSm}`} style={{ width: "62%" }} />
        </div>
      ))}
    </div>
  );
};

/* ── Rank list (Spend by category / Top products / Top BUs / oldest-pending) */
export const SkeletonRankList = ({ rows = 5 }) => (
  <div className={styles.skRankList}>
    {Array.from({ length: rows }).map((_, i) => (
      <div className={styles.skRankRow} key={i}>
        <span className={`${styles.skBar} ${styles.skRk}`} />
        <div className={styles.skMain}>
          <span className={styles.skBar} />
          <span className={`${styles.skBar} ${styles.skBarTrack}`} />
        </div>
        <span className={`${styles.skBar} ${styles.skRv}`} />
      </div>
    ))}
  </div>
);

/* ── Headline number + sparkline (throughput widgets) */
export const SkeletonHeadline = ({ withSpark = true }) => (
  <div className={styles.skHeadline}>
    <span className={`${styles.skBar} ${styles.skHl}`} />
    <span className={`${styles.skBar} ${styles.skSub}`} />
    {withSpark && <span className={`${styles.skBar} ${styles.skSpark}`} />}
  </div>
);

/* ── Chart (line / bar with legend) */
export const SkeletonChart = ({ legendCount = 2 }) => (
  <div className={styles.skChart}>
    <span className={`${styles.skBar} ${styles.skChartArea}`} />
    {legendCount > 0 && (
      <div className={styles.skChartLegend}>
        {Array.from({ length: legendCount }).map((_, i) => (
          <div key={i}>
            <span className={styles.skCircle} />
            <span className={styles.skBar} />
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ── Activity feed (Recent activity) */
export const SkeletonActivityFeed = ({ rows = 4 }) => (
  <div className={styles.skActivityFeed}>
    {Array.from({ length: rows }).map((_, i) => (
      <div className={styles.skActivityItem} key={i}>
        <span className={styles.skIcon} />
        <div className={styles.skMain}>
          <span className={styles.skBar} />
          <span className={styles.skBar} />
        </div>
        <span className={`${styles.skBar} ${styles.skTime}`} />
      </div>
    ))}
  </div>
);

/* ── 2-up labeled stat block (Completed / Ongoing pipeline) */
export const SkeletonStat2Up = () => (
  <div className={styles.skStat2Up}>
    {[0, 1].map((i) => (
      <div className={styles.skStatCell} key={i}>
        <span className={styles.skBar} />
        <span className={styles.skBar} />
        <span className={styles.skBar} />
      </div>
    ))}
  </div>
);

/* ── Bar with legend (win/loss breakdown) */
export const SkeletonBarWithLegend = ({ legendCount = 3 }) => (
  <div className={styles.skBarLegend}>
    <span className={`${styles.skBar} ${styles.skBarTrack}`} />
    <div className={styles.skLegendRow}>
      {Array.from({ length: legendCount }).map((_, i) => (
        <div key={i}>
          <span className={styles.skCircle} />
          <span className={styles.skBar} />
        </div>
      ))}
    </div>
  </div>
);

/* ── Headline + N dot-labeled rows (response efficiency) */
export const SkeletonLabeledRows = ({ rows = 4 }) => (
  <div className={styles.skLabeledRows}>
    <div className={styles.skHeadRow}>
      <span className={styles.skBar} />
      <span className={styles.skBar} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div className={styles.skLabeledRow} key={i}>
        <span className={styles.skCircle} />
        <span className={styles.skBar} />
        <span className={styles.skBar} />
      </div>
    ))}
  </div>
);
