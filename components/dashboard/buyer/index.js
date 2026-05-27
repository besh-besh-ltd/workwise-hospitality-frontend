import React, { useState, useCallback, useMemo, useRef } from "react";
import Head from "next/head";
import moment from "moment";
import Select from "react-select";
import { useSelector } from "react-redux";
import { RefreshCw } from "lucide-react";
import HotelFilter from "@/components/shared/HotelFilter";
import ActionCenter from "./dashboard-components/ActionCenter";
import ProcurementSnapshot from "./dashboard-components/ProcurementSnapshot";
import NegotiationSavings from "./dashboard-components/NegotiationSavings";
import CostIntelligence from "./dashboard-components/CostIntelligence";
import CategoryInsights from "./dashboard-components/CategoryInsights";
import WorkflowEfficiency from "./dashboard-components/WorkflowEfficiency";
import SmartInsights from "./dashboard-components/SmartInsights";
import EmptyDashboard from "./EmptyDashboard";
import {
  DashboardPermissionsProvider,
  useVisibleDashboardWidgets,
} from "@/hooks/useDashboardWidgets";
import { COLUMN } from "./DashboardRegistry";
import styles from "../buyer/BuyerDashboard.module.scss";

const DURATION_OPTIONS = [
  { label: "Last 7 Days", value: "past7days" },
  { label: "Last 15 Days", value: "past15days" },
  { label: "This Month", value: "currentMonth" },
  { label: "Last 6 Months", value: "past6months" },
  { label: "All Time", value: "allTime" },
  { label: "Custom", value: "custom" },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getDateRange = (type, customStart, customEnd) => {
  const today = moment().endOf("day");
  let start_date, end_date;

  switch (type) {
    case "past7days":
      start_date = moment().subtract(6, "days").startOf("day").format("YYYY-MM-DD");
      end_date = today.format("YYYY-MM-DD");
      break;
    case "past15days":
      start_date = moment().subtract(14, "days").startOf("day").format("YYYY-MM-DD");
      end_date = today.format("YYYY-MM-DD");
      break;
    case "currentMonth":
      start_date = moment().startOf("month").format("YYYY-MM-DD");
      end_date = today.format("YYYY-MM-DD");
      break;
    case "past6months":
      start_date = moment().subtract(5, "months").startOf("month").format("YYYY-MM-DD");
      end_date = today.format("YYYY-MM-DD");
      break;
    case "allTime":
      start_date = "2025-01-01";
      end_date = today.format("YYYY-MM-DD");
      break;
    case "custom":
      start_date = customStart || moment().subtract(30, "days").format("YYYY-MM-DD");
      end_date = customEnd || today.format("YYYY-MM-DD");
      break;
    default:
      start_date = moment().subtract(6, "days").startOf("day").format("YYYY-MM-DD");
      end_date = today.format("YYYY-MM-DD");
  }

  return { start_date, end_date };
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
  const [duration, setDuration] = useState(DURATION_OPTIONS[0]);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hotelFilterRef = useRef(null);

  const filters = useMemo(() => {
    const { start_date, end_date } = getDateRange(
      duration.value,
      customStartDate,
      customEndDate
    );
    return {
      hotel_ids: selectedHotelIds.join(","),
      start_date,
      end_date,
      duration_type: duration.value,
      _refresh: refreshKey,
    };
  }, [selectedHotelIds, duration, customStartDate, customEndDate, refreshKey]);

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

  const handleDurationChange = useCallback((option) => {
    setDuration(option);
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
            <div className={styles.filterItem} ref={hotelFilterRef}>
              <HotelFilter
                selectedHotelIds={selectedHotelIds}
                onSelectionChange={handleHotelChange}
                isMulti={true}
                placeholder="All Business Units"
              />
            </div>
            <div className={styles.filterItem}>
              <Select
                options={DURATION_OPTIONS}
                value={duration}
                onChange={handleDurationChange}
                placeholder="Duration"
                isClearable={false}
                isSearchable={false}
                classNamePrefix="react-select"
              />
            </div>
            <button
              className={styles.refreshBtn}
              onClick={handleRefresh}
              title="Refresh all data"
            >
              <RefreshCw size={15} className={isRefreshing ? styles.spinning : ""} />
            </button>
            {duration.value === "custom" && (
              <>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || undefined}
                />
                <input
                  type="date"
                  className={styles.dateInput}
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate || undefined}
                />
              </>
            )}
          </div>
        </div>

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
    // Render nothing during the initial permission load — the page header
    // is already visible above, no need for a skeleton on the empty area.
    return null;
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
