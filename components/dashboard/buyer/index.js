import React, { useState, useCallback, useMemo, useRef } from "react";
import Head from "next/head";
import moment from "moment";
import { useSelector } from "react-redux";
import { RefreshCw } from "lucide-react";
import HotelFilter from "@/components/shared/HotelFilter";
import { Seg, SkeletonKpiGrid } from "@/components/dashboard/shared";
import ActionCenter from "./dashboard-components/ActionCenter";
import ProcurementSnapshot from "./dashboard-components/ProcurementSnapshot";
import NegotiationSavings from "./dashboard-components/NegotiationSavings";
import CostIntelligence from "./dashboard-components/CostIntelligence";
import CategoryInsights from "./dashboard-components/CategoryInsights";
import ABCAnalysis from "./dashboard-components/ABCAnalysis";
import WorkflowEfficiency from "./dashboard-components/WorkflowEfficiency";
import SmartInsights from "./dashboard-components/SmartInsights";
import EmptyDashboard from "./EmptyDashboard";
import BuyerStatusBanner from "./BuyerStatusBanner";
import {
  DashboardPermissionsProvider,
  useVisibleDashboardWidgets,
} from "@/hooks/useDashboardWidgets";
import { COLUMN } from "./DashboardRegistry";
import styles from "../buyer/BuyerDashboard.module.scss";

// FYTD is the default per client request (Sr 304): 1 Apr → today. "Custom"
// reveals an explicit start/end date picker.
const RANGE_OPTIONS = [
  { label: "FYTD", value: "fy" },
  { label: "30D", value: "past30days" },
  { label: "All", value: "allTime" },
  { label: "Custom", value: "custom" },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

// Resolve a Seg value to an inclusive { start_date, end_date } pair (YYYY-MM-DD).
// FY = current financial year (Apr-Mar IST).
const getDateRange = (type) => {
  const today = moment().endOf("day");
  let start_date;
  switch (type) {
    case "past30days":
      start_date = moment().subtract(29, "days").startOf("day").format("YYYY-MM-DD");
      break;
    case "fy": {
      const now = moment();
      const fyStartYear = now.month() >= 3 ? now.year() : now.year() - 1; // Apr = month 3
      start_date = moment({ year: fyStartYear, month: 3, day: 1 }).format("YYYY-MM-DD");
      break;
    }
    case "allTime":
      start_date = "2025-01-01";
      break;
    default:
      start_date = moment().subtract(29, "days").startOf("day").format("YYYY-MM-DD");
  }
  return { start_date, end_date: today.format("YYYY-MM-DD") };
};

/** Feature flag: role-aware (registry-driven, permission-gated) dashboard.
 *  When false, the legacy unconditional 7-card layout renders.
 *  Set NEXT_PUBLIC_BUYER_DASHBOARD_V3=1 in the env to enable. */
const ROLE_AWARE_DASHBOARD_ENABLED =
  process.env.NEXT_PUBLIC_BUYER_DASHBOARD_V3 === "1" ||
  process.env.NEXT_PUBLIC_BUYER_DASHBOARD_V3 === "true";

const BuyerPage = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const firstName = userProfile?.name?.split(" ")?.[0] || "there";

  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [range, setRange] = useState("fy"); // FYTD default (Sr 304)
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hotelFilterRef = useRef(null);

  // Today (YYYY-MM-DD) — upper bound for the custom date inputs.
  const todayStr = useMemo(() => moment().format("YYYY-MM-DD"), []);

  const filters = useMemo(() => {
    let start_date;
    let end_date;
    if (range === "custom" && customStart && customEnd) {
      // Guard against an inverted range (swap if start > end).
      start_date = customStart <= customEnd ? customStart : customEnd;
      end_date = customStart <= customEnd ? customEnd : customStart;
    } else {
      // "custom" without both dates yet → fall back to FYTD so widgets still load.
      ({ start_date, end_date } = getDateRange(range === "custom" ? "fy" : range));
    }
    return {
      hotel_ids: selectedHotelIds.join(","),
      start_date,
      end_date,
      duration_type: range,
      _refresh: refreshKey,
    };
  }, [selectedHotelIds, range, customStart, customEnd, refreshKey]);

  // Human-readable label for the BU(s) currently in scope — used in the
  // empty-state copy and any toast that needs to reference the user's
  // current filter.
  const selectedHotelLabel = useMemo(() => {
    if (!selectedHotelIds.length) return "All Business Units";
    const mappings = userProfile?.hospitality_mappings || [];
    const names = selectedHotelIds
      .map((id) => mappings.find((m) => m.hospitality_hotel_id === id)?.hotel_name)
      .filter(Boolean);
    if (!names.length) return `${selectedHotelIds.length} business unit(s)`;
    if (names.length === 1) return names[0];
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  }, [selectedHotelIds, userProfile]);

  const handleHotelChange = useCallback((ids) => {
    setSelectedHotelIds(ids || []);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 1200);
  }, []);

  const focusBuPicker = useCallback(() => {
    // The hotel filter renders a react-select; focus its input if mounted.
    try {
      const el = hotelFilterRef.current?.querySelector("input");
      if (el) el.focus();
      hotelFilterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (_e) {
      /* noop */
    }
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard | Buyer</title>
      </Head>
      <div className={styles.dashboardContainer}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.greetingBlock}>
            <h1 className={styles.greeting}>{getGreeting()}, {firstName}! 👋</h1>
            <p className={styles.greetingSubtext}>
              Here's your procurement overview and pending actions.
            </p>
          </div>
          <div className={styles.filterBar}>
            <Seg options={RANGE_OPTIONS} value={range} onChange={setRange} />
            {range === "custom" && (
              <div className={styles.customRange}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customStart}
                  max={customEnd || todayStr}
                  onChange={(e) => setCustomStart(e.target.value)}
                  aria-label="Start date"
                />
                <span className={styles.dateSep}>→</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customEnd}
                  min={customStart || undefined}
                  max={todayStr}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  aria-label="End date"
                />
              </div>
            )}
            <div className={styles.filterItem} ref={hotelFilterRef}>
              <HotelFilter
                selectedHotelIds={selectedHotelIds}
                onSelectionChange={handleHotelChange}
                isMulti={true}
                placeholder="All Business Units"
              />
            </div>
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              title="Refresh all data"
            >
              <RefreshCw size={15} className={isRefreshing ? styles.spinning : ""} />
            </button>
          </div>
        </div>

        <BuyerStatusBanner hotelIds={selectedHotelIds} filters={filters} />

        {ROLE_AWARE_DASHBOARD_ENABLED ? (
          <DashboardPermissionsProvider hotelIds={selectedHotelIds}>
            <RoleAwareDashboard
              filters={filters}
              selectedHotelLabel={selectedHotelLabel}
              onChangeBu={focusBuPicker}
            />
          </DashboardPermissionsProvider>
        ) : (
          <LegacyDashboard filters={filters} />
        )}
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────
   Legacy dashboard — hardcoded 7-card layout. Default until
   role-aware dashboard is fully rolled out.
   ──────────────────────────────────────────────────────────── */
const LegacyDashboard = ({ filters }) => (
  <>
    <ActionCenter filters={filters} />
    <ProcurementSnapshot filters={filters} />
    <div className={styles.mainContent}>
      <div className={styles.leftColumn}>
        <NegotiationSavings filters={filters} />
        <CostIntelligence filters={filters} />
      </div>
      <div className={styles.rightColumn}>
        <CategoryInsights filters={filters} />
        <ABCAnalysis filters={filters} />
        <WorkflowEfficiency filters={filters} />
        <SmartInsights filters={filters} />
      </div>
    </div>
  </>
);

/* ────────────────────────────────────────────────────────────
   Role-aware dashboard — iterates the widget registry, renders
   only entries the user has permission for in the selected BU(s).
   ──────────────────────────────────────────────────────────── */
const RoleAwareDashboard = ({ filters, selectedHotelLabel, onChangeBu }) => {
  const { widgets, isLoading } = useVisibleDashboardWidgets();

  if (isLoading) {
    // First-load only — show a soft page-level skeleton so the surface area
    // isn't blank. BU changes after the first load don't blank: `isLoading`
    // stays false and `isRefetching` runs silently, while each widget shows
    // its own skeleton during data refresh.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SkeletonKpiGrid count={5} />
        <SkeletonKpiGrid count={5} />
      </div>
    );
  }

  if (!widgets.length) {
    return (
      <EmptyDashboard
        selectedHotelLabel={selectedHotelLabel}
        onChangeBu={onChangeBu}
      />
    );
  }

  // Partition by column with original registry ordering preserved.
  const sortedByOrder = [...widgets].sort((a, b) => (a.order || 0) - (b.order || 0));
  const fullWidth = sortedByOrder.filter((w) => w.column === COLUMN.FULL);
  const left = sortedByOrder.filter((w) => w.column === COLUMN.LEFT);
  const right = sortedByOrder.filter((w) => w.column === COLUMN.RIGHT);

  const renderWidget = (w) => {
    const Component = w.component;
    return <Component key={w.code} filters={filters} />;
  };

  return (
    <>
      {fullWidth.map(renderWidget)}
      {(left.length > 0 || right.length > 0) && (
        <div className={styles.mainContent}>
          <div className={styles.leftColumn}>{left.map(renderWidget)}</div>
          <div className={styles.rightColumn}>{right.map(renderWidget)}</div>
        </div>
      )}
    </>
  );
};

export default BuyerPage;
