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
import styles from "../buyer/BuyerDashboard.module.scss";

const DURATION_OPTIONS = [
  { label: "Last 7 Days", value: "past7days" },
  { label: "Last 15 Days", value: "past15days" },
  { label: "This Month", value: "currentMonth" },
  { label: "Last 6 Months", value: "past6months" },
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

const BuyerPage = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const firstName = userProfile?.name?.split(" ")?.[0] || "there";

  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [duration, setDuration] = useState(DURATION_OPTIONS[0]);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
            <div className={styles.filterItem}>
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

        {/* Action Center */}
        <ActionCenter filters={filters} />

        {/* Procurement Snapshot */}
        <ProcurementSnapshot filters={filters} />

        {/* 2-Column Layout */}
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
      </div>
    </>
  );
};

export default BuyerPage;
