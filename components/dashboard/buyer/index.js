import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import moment from "moment";
import { useSelector } from "react-redux";
import { RefreshCw, FileBarChart, AlertCircle } from "lucide-react";
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
import BalancedColumns from "@/components/dashboard/shared/BalancedColumns";
import BuyerStatusBanner from "./BuyerStatusBanner";
import {
  DashboardPermissionsProvider,
  useVisibleDashboardWidgets,
} from "@/hooks/useDashboardWidgets";
import { COLUMN, PERSONAS, PERSONA_LABELS } from "./DashboardRegistry";
import { getDashboardConfig } from "@/services/dashboard";
import { DashboardActivityContext, useDashboardActivity } from "@/hooks/useDashboardQuery";
import styles from "../buyer/BuyerDashboard.module.scss";

// FYTD is the default per client request (Sr 304): 1 Apr → today. "Custom"
// reveals an explicit start/end date picker.
const RANGE_OPTIONS = [
  { label: "FYTD", value: "fy" },
  { label: "30D", value: "past30days" },
  { label: "All", value: "allTime" },
  { label: "Custom", value: "custom" },
];

// Resolve a Seg value to an inclusive { start_date, end_date } pair (YYYY-MM-DD,
// IST calendar dates). FY = current financial year (Apr-Mar IST). "All" sends
// no start date at all — the backend treats a missing bound as unbounded.
export const getDateRange = (type) => {
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
      start_date = undefined;
      break;
    default:
      start_date = moment().subtract(29, "days").startOf("day").format("YYYY-MM-DD");
  }
  return { start_date, end_date: today.format("YYYY-MM-DD") };
};

/* ── Filters in the URL ─────────────────────────────────────
 * The range, custom dates and business units live in the query string
 * (`range`, `from`, `to`, `bu`) so Back from a drill-down returns the user to
 * the view they left rather than resetting to FYTD / all BUs. Defaults are
 * left out of the URL; anything malformed is ignored. */
const RANGE_VALUES = new Set(RANGE_OPTIONS.map((o) => o.value));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DASHBOARD_QUERY_KEYS = ["range", "from", "to", "bu"];

const firstValue = (v) => (Array.isArray(v) ? v[0] : v);
const validDate = (v, todayStr) =>
  typeof v === "string" && ISO_DATE.test(v) && moment(v, "YYYY-MM-DD", true).isValid() && v <= todayStr
    ? v
    : "";

export const parseDashboardQuery = (query = {}, todayStr = moment().format("YYYY-MM-DD")) => {
  const rawRange = firstValue(query.range);
  const range = RANGE_VALUES.has(rawRange) ? rawRange : "fy";
  const customStart = range === "custom" ? validDate(firstValue(query.from), todayStr) : "";
  const customEnd = range === "custom" ? validDate(firstValue(query.to), todayStr) : "";
  const rawBu = firstValue(query.bu);
  const hotelIds =
    typeof rawBu === "string"
      ? [...new Set(rawBu.split(",").map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))]
      : [];
  return { range, customStart, customEnd, hotelIds };
};

export const buildDashboardQuery = ({ range, customStart, customEnd, hotelIds }, existing = {}) => {
  const query = { ...existing };
  DASHBOARD_QUERY_KEYS.forEach((k) => delete query[k]);
  if (range && range !== "fy") query.range = range;
  if (range === "custom") {
    if (customStart) query.from = customStart;
    if (customEnd) query.to = customEnd;
  }
  if (hotelIds && hotelIds.length) query.bu = hotelIds.join(",");
  return query;
};

/** Rollout switch for the role-aware (registry-driven, permission-gated)
 *  dashboard. Read at runtime from GET /dashboard-v2/config — a per-buyer-
 *  company flag — so a client can be switched on, or back off, without a
 *  rebuild. Any failure falls back to the legacy layout, which is the kill
 *  switch. Returns { state: "loading" | "on" | "off", config }. `config` may
 *  also carry `admin_contact_email` for the empty-state "Contact admin" link. */
export const CONFIG_RETRY_BASE_MS = 5000;
export const CONFIG_RETRY_MAX_MS = 5 * 60 * 1000;

/** A failed /config is worth retrying only when the server did not answer
 *  (network, timeout) or failed (5xx). A 4xx is a definitive answer. */
const isTransientConfigError = (err) => {
  const status = err?.status;
  if (err?.canceled) return false;
  return !status || status >= 500;
};

export const useRoleAwareDashboardFlag = () => {
  const [state, setState] = useState("loading");
  const [config, setConfig] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let attempt = 0;
    let inFlight = false;
    let settled = false; // a definitive answer arrived — stop retrying

    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const load = () => {
      if (cancelled || settled || inFlight) return;
      clearTimer();
      inFlight = true;
      getDashboardConfig()
        .then((res) => {
          if (cancelled) return;
          settled = true;
          setConfig(res?.data || null);
          setState(res?.data?.v3_enabled === true ? "on" : "off");
        })
        .catch((err) => {
          if (cancelled) return;
          // Legacy is the safe fallback while the config is unknown…
          setState((prev) => (prev === "on" ? prev : "off"));
          if (!isTransientConfigError(err)) {
            settled = true;
            return;
          }
          // …but keep asking, so a cold load during an outage switches to the
          // role-aware layout on its own once the server is back.
          const delay = Math.min(CONFIG_RETRY_BASE_MS * 2 ** attempt, CONFIG_RETRY_MAX_MS);
          attempt += 1;
          timer = setTimeout(load, delay);
        })
        .finally(() => {
          inFlight = false;
        });
    };
    const retryNow = () => {
      if (settled || cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      load();
    };

    load();
    if (typeof window !== "undefined") window.addEventListener("online", retryNow);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", retryNow);
    return () => {
      cancelled = true;
      clearTimer();
      if (typeof window !== "undefined") window.removeEventListener("online", retryNow);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", retryNow);
    };
  }, []);
  return { state, config };
};

const BuyerPage = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);
  const { state: dashboardFlag, config: dashboardConfig } = useRoleAwareDashboardFlag();
  const { inFlight, tracker } = useDashboardActivity();

  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [range, setRange] = useState("fy"); // FYTD default (Sr 304)
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const hotelFilterRef = useRef(null);
  const lastAppliedRangeRef = useRef(null);
  // Filters are read from the URL once the router is ready; widgets wait for
  // that so a restored view doesn't first fetch FYTD and then refetch.
  const routerReady = router ? router.isReady !== false : true;
  const [filtersHydrated, setFiltersHydrated] = useState(!router);

  // A custom range only applies once BOTH dates are picked. Until then the
  // widgets keep the previously applied range and the header says so.
  const customIncomplete = range === "custom" && !(customStart && customEnd);

  // Today (YYYY-MM-DD) — upper bound for the custom date inputs.
  const todayStr = useMemo(() => moment().format("YYYY-MM-DD"), []);

  useEffect(() => {
    if (filtersHydrated || !routerReady) return;
    const parsed = parseDashboardQuery(router?.query || {}, todayStr);
    setRange(parsed.range);
    setCustomStart(parsed.customStart);
    setCustomEnd(parsed.customEnd);
    setSelectedHotelIds(parsed.hotelIds);
    setFiltersHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerReady, filtersHydrated]);

  useEffect(() => {
    if (!filtersHydrated || !router || typeof router.replace !== "function") return;
    const current = router.query || {};
    const next = buildDashboardQuery(
      { range, customStart, customEnd, hotelIds: selectedHotelIds },
      current
    );
    const same =
      DASHBOARD_QUERY_KEYS.every((k) => (firstValue(current[k]) || "") === (next[k] || ""));
    if (same) return;
    router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true, scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersHydrated, range, customStart, customEnd, selectedHotelIds]);

  const filters = useMemo(() => {
    let start_date;
    let end_date;
    let duration_type = range;
    if (range === "custom" && customStart && customEnd) {
      // Guard against an inverted range (swap if start > end).
      start_date = customStart <= customEnd ? customStart : customEnd;
      end_date = customStart <= customEnd ? customEnd : customStart;
    } else if (range === "custom") {
      // Incomplete custom range → keep whatever was applied last (FYTD on
      // first load) rather than silently fetching FYTD under a Custom label.
      const prev = lastAppliedRangeRef.current || { ...getDateRange("fy"), duration_type: "fy" };
      ({ start_date, end_date, duration_type } = prev);
    } else {
      ({ start_date, end_date } = getDateRange(range));
    }
    lastAppliedRangeRef.current = { start_date, end_date, duration_type };
    return {
      hotel_ids: selectedHotelIds.join(","),
      start_date,
      end_date,
      duration_type,
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

  // Every widget (and the banner) refetches when `_refresh` changes; the
  // spinner runs for exactly as long as any of those requests is in flight.
  const handleRefresh = useCallback(() => {
    setRefreshRequested(true);
    setRefreshKey((k) => k + 1);
  }, []);
  useEffect(() => {
    if (refreshRequested && inFlight === 0) {
      // Let the refetches register before deciding they are done.
      const t = setTimeout(() => setRefreshRequested(false), 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [refreshRequested, inFlight]);
  const isRefreshing = refreshRequested && inFlight > 0;

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
    <DashboardActivityContext.Provider value={tracker}>
      <Head>
        <title>Dashboard | Buyer</title>
      </Head>
      <div className={styles.dashboardContainer}>
        {/* Header — the personal greeting lives in the status banner below. */}
        <div className={styles.pageHeader}>
          <div className={styles.greetingBlock}>
            <h1 className={styles.greeting}>Procurement dashboard</h1>
            <p className={styles.greetingSubtext}>
              Your procurement overview and pending actions.
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
                {customIncomplete && (
                  <span className={styles.rangeHint} role="status">
                    Pick both dates to apply — showing the previous range until then.
                  </span>
                )}
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
            {/* Reports sits beside the refresh control rather than in a widget:
                it is a destination, not a metric, and the dashboard is where
                people look first when they want to take something away. */}
            <Link
              href="/dashboard/buyer/reports"
              className={styles.refreshBtn}
              title="Download reports"
              aria-label="Reports"
            >
              <FileBarChart size={15} />
            </Link>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={handleRefresh}
              title="Refresh all data"
              aria-label="Refresh all data"
              aria-busy={isRefreshing}
            >
              <RefreshCw size={15} className={isRefreshing ? styles.spinning : ""} />
            </button>
          </div>
        </div>

        {filtersHydrated && <BuyerStatusBanner filters={filters} />}

        {dashboardFlag === "loading" || !filtersHydrated ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-busy="true">
            <SkeletonKpiGrid count={5} />
            <SkeletonKpiGrid count={5} />
          </div>
        ) : dashboardFlag === "on" ? (
          <DashboardPermissionsProvider hotelIds={selectedHotelIds}>
            <RoleAwareDashboard
              filters={filters}
              selectedHotelLabel={selectedHotelLabel}
              onChangeBu={focusBuPicker}
              contactAdminEmail={dashboardConfig?.admin_contact_email}
            />
          </DashboardPermissionsProvider>
        ) : (
          <LegacyDashboard filters={filters} />
        )}
      </div>
    </DashboardActivityContext.Provider>
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
    <BalancedColumns
      testId="legacy-two-col"
      items={[
        { key: "negotiation_savings", defaultColumn: "left", node: <NegotiationSavings filters={filters} /> },
        { key: "cost_intelligence", defaultColumn: "left", node: <CostIntelligence filters={filters} /> },
        { key: "workflow_efficiency", defaultColumn: "left", node: <WorkflowEfficiency filters={filters} /> },
        { key: "category_insights", defaultColumn: "right", node: <CategoryInsights filters={filters} /> },
        { key: "abc_analysis", defaultColumn: "right", node: <ABCAnalysis filters={filters} /> },
        { key: "smart_insights", defaultColumn: "right", node: <SmartInsights filters={filters} /> },
      ]}
    />
  </>
);

/* ────────────────────────────────────────────────────────────
   Role-aware dashboard — iterates the widget registry, renders
   only entries the user has permission for in the selected BU(s).
   Layout adapts to what is actually visible:
     • full-width cross-role cards first;
     • cross-role left/right cards in the 2-col grid, collapsing to
       one column when a side is empty (no dead two-thirds column);
     • persona widgets grouped under their persona heading in a
       responsive grid, so sparse and dense grant sets both read well.
   ──────────────────────────────────────────────────────────── */
export const planLayout = (widgets) => {
  const sorted = [...widgets].sort((a, b) => (a.order || 0) - (b.order || 0));
  const isCross = (w) => !w.persona || w.persona === PERSONAS.CROSS_ROLE;
  const cross = sorted.filter(isCross);
  const full = cross.filter((w) => w.column === COLUMN.FULL);
  const left = cross.filter((w) => w.column === COLUMN.LEFT);
  const right = cross.filter((w) => w.column === COLUMN.RIGHT);

  const groups = [];
  sorted.filter((w) => !isCross(w)).forEach((w) => {
    let g = groups.find((x) => x.persona === w.persona);
    if (!g) {
      g = { persona: w.persona, label: PERSONA_LABELS[w.persona] || w.persona, widgets: [] };
      groups.push(g);
    }
    g.widgets.push(w);
  });
  return { full, left, right, groups };
};

const RoleAwareDashboard = ({ filters, selectedHotelLabel, onChangeBu, contactAdminEmail }) => {
  const { widgets, isLoading, error, refetch } = useVisibleDashboardWidgets();

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

  // Could not load the grants at all — that is an outage, not "no access".
  if (error && !widgets.length) {
    return (
      <div className={styles.permissionError} role="alert">
        <AlertCircle size={16} />
        <div>
          <div className={styles.permissionErrorTitle}>We couldn't load your dashboard</div>
          <div className={styles.permissionErrorText}>{error}</div>
        </div>
        {refetch && (
          <button type="button" className={styles.permissionErrorBtn} onClick={() => refetch()}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!widgets.length) {
    return (
      <EmptyDashboard
        selectedHotelLabel={selectedHotelLabel}
        onChangeBu={onChangeBu}
        contactAdminEmail={contactAdminEmail}
      />
    );
  }

  const { full, left, right, groups } = planLayout(widgets);

  const renderWidget = (w) => {
    const Component = w.component;
    return <Component key={w.code} filters={filters} />;
  };

  const twoColumns = left.length > 0 && right.length > 0;
  const single = [...left, ...right];

  return (
    <>
      {full.map(renderWidget)}
      {twoColumns && (
        <BalancedColumns
          testId="cross-two-col"
          items={[
            ...left.map((w) => ({ key: w.code, defaultColumn: "left", node: renderWidget(w) })),
            ...right.map((w) => ({ key: w.code, defaultColumn: "right", node: renderWidget(w) })),
          ]}
        />
      )}
      {!twoColumns && single.length > 0 && (
        <div className={styles.singleColumn} data-testid="cross-one-col">
          {single.map(renderWidget)}
        </div>
      )}
      {groups.map((g) => (
        <section key={g.persona} className={styles.personaSection} aria-label={g.label}>
          <h2 className={styles.personaHeading}>{g.label}</h2>
          <div className={styles.personaGrid}>{g.widgets.map(renderWidget)}</div>
        </section>
      ))}
    </>
  );
};

export default BuyerPage;
