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

/* Dashboard live-refresh cadence lives with the shared data hook: queue
 * widgets poll every 60s while the tab is visible; analytics never poll. */
export { DASHBOARD_QUEUE_POLL_MS } from "@/hooks/useDashboardQuery";
