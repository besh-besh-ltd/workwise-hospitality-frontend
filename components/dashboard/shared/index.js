/* Barrel export for the dashboard surface primitives.
 * Used by both buyer and vendor dashboards.
 */
export { default as DashPanel } from "./DashPanel";
export { default as KpiTile } from "./KpiTile";
export { default as RankList } from "./RankList";
export { default as ActionBanner } from "./ActionBanner";
export { default as ActivityFeed } from "./ActivityFeed";
export { default as LifecycleDonut } from "./LifecycleDonut";
export { default as Seg } from "./Seg";
export { default as StatusPill } from "./StatusPill";
export {
  SkeletonKpiGrid,
  SkeletonRankList,
  SkeletonHeadline,
  SkeletonChart,
  SkeletonActivityFeed,
  SkeletonStat2Up,
  SkeletonBarWithLegend,
  SkeletonLabeledRows,
} from "./Skeletons";

export { default as surfaceStyles } from "./DashboardSurface.module.scss";

/* Dashboard background-refresh cadence. Single source of truth so every widget
 * + PersonaCard stay in sync.
 *
 * Was 10s (Sr 232). With 8 widgets that came to 48 aggregate queries/min per
 * open dashboard tab, hidden tabs included, and these numbers move over days.
 * Freshness now comes from usePolling: an immediate refetch whenever the tab
 * becomes visible again, the manual refresh button (`_refresh`), and filter
 * changes. Polls are paused while the tab is hidden. 5 min is only the
 * background floor for a dashboard left open on screen.
 * Policy: hooks/usePolling.js. */
export const DASHBOARD_POLL_MS = 5 * 60 * 1000;
