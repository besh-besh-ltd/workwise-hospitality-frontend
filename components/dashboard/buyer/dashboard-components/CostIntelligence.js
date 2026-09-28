import React, { useEffect, useState } from "react";
import Select from "react-select";
import { Line } from "react-chartjs-2";
import { LineChart } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { getCostIntelligence } from "@/services/dashboard";
import { formatMoney as formatCurrency, formatMoneyExact } from "@/components/dashboard/shared/format";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonChart } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./CostIntelligence.module.scss";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 30,
    fontSize: 12,
    borderColor: state.isFocused ? "#18181b" : "#e8e8e3",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(24,24,27,0.08)" : "none",
    borderRadius: 8,
    "&:hover": { borderColor: "#d6d6cf" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: 12,
    backgroundColor: state.isSelected
      ? "#18181b"
      : state.isFocused
      ? "#fafaf9"
      : "transparent",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 10,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    border: "1px solid #f0f0f0",
    zIndex: 10,
  }),
  indicatorSeparator: () => ({ display: "none" }),
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: "top",
      align: "end",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        padding: 16,
        font: { size: 11, weight: "600" },
      },
    },
    tooltip: {
      backgroundColor: "#1a2730",
      titleFont: { size: 12, weight: "600" },
      bodyFont: { size: 11 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatMoneyExact(ctx.raw)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 }, color: "#999" },
    },
    y: {
      grid: { color: "rgba(0,0,0,0.04)" },
      ticks: {
        font: { size: 10 },
        color: "#999",
        callback: (val) => formatCurrency(val),
      },
    },
  },
};

const CostIntelligence = ({ filters }) => {
  // `requestedProductId` is only set when the user picks an item. Until then
  // the backend benchmarks its own top item, which the selector mirrors, so
  // the auto-selection never costs a second request.
  const [requestedProductId, setRequestedProductId] = useState(null);
  const [pickedOption, setPickedOption] = useState(null);
  const filterKey = `${filters.hotel_ids}|${filters.start_date || ""}|${filters.end_date || ""}`;

  // A different BU / period has a different top-item list — drop the pick.
  useEffect(() => {
    setRequestedProductId(null);
    setPickedOption(null);
  }, [filterKey]);

  const { data, loading, error, stale, refetch } = useDashboardQuery(getCostIntelligence, filters, {
    extraParams: { product_variant_id: requestedProductId },
  });

  const handleProductChange = (option) => {
    setPickedOption(option);
    setRequestedProductId(option?.value || null);
  };

  const productOptions = (data?.top_products || []).map((p) => ({
    label: p.product_name,
    value: p.product_variant_id,
  }));
  const selectedProduct = pickedOption || productOptions[0] || null;

  const priceTrend = data?.price_trend;
  // Backend resolves day/month granularity (Sr 301 "month-wise" for long ranges).
  const granularity = data?.granularity || (filters.duration_type === "past6months" ? "month" : "day");
  const chartLabels = (priceTrend?.labels || []).map((l) => {
    const d = new Date(l);
    if (granularity === "month") {
      return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    }
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  });

  // Benchmark = best unit price previously paid for the selected item.
  const bench = data?.benchmark && data.benchmark.benchmark_price != null ? data.benchmark : null;

  const hasData = priceTrend?.avg?.some((v) => v > 0);
  const chartData = priceTrend && hasData
    ? {
        labels: chartLabels,
        datasets: [
          {
            label: "Max",
            data: priceTrend.max,
            borderColor: "#b91c1c",
            backgroundColor: "transparent",
            borderWidth: 1.25,
            borderDash: [3, 3],
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#b91c1c",
            tension: 0.3,
            spanGaps: false,
          },
          {
            label: "Avg",
            data: priceTrend.avg,
            borderColor: "#18181b",
            backgroundColor: "rgba(24, 24, 27, 0.04)",
            borderWidth: 1.75,
            pointRadius: 2.5,
            pointHoverRadius: 4.5,
            pointBackgroundColor: "#18181b",
            tension: 0.3,
            fill: true,
            spanGaps: false,
          },
          {
            label: "Min",
            data: priceTrend.min,
            borderColor: "#15803d",
            backgroundColor: "transparent",
            borderWidth: 1.25,
            borderDash: [3, 3],
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#15803d",
            tension: 0.3,
            spanGaps: false,
          },
          // Flat reference line at the benchmark (best price paid) so it's
          // obvious where the trend sits above/below it (Sr 302 demand flow).
          ...(bench
            ? [{
                label: "Benchmark",
                data: priceTrend.avg.map(() => bench.benchmark_price),
                borderColor: "#2563eb",
                backgroundColor: "transparent",
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0,
                pointHoverRadius: 0,
                tension: 0,
                spanGaps: true,
              }]
            : []),
        ],
      }
    : null;

  const vendors = data?.vendor_comparison || [];

  return (
    <PersonaCardShell
      title="Price benchmarking"
      icon={LineChart}
      tooltip="High-value (A-class) items benchmarked against the best unit price you've previously paid. The dashed blue line marks that benchmark; the trend above/below it shows where you're over- or under-paying."
      actions={
        <div className={styles.productSelector}>
          <Select
            value={selectedProduct}
            onChange={handleProductChange}
            options={productOptions}
            placeholder="Select product…"
            styles={selectStyles}
            isClearable={false}
            isSearchable
            menuPortalTarget={typeof window !== "undefined" ? document.body : null}
            menuPosition="fixed"
          />
        </div>
      }
      loading={loading}
      error={error}
      stale={stale}
      isEmpty={!chartData}
      skeleton={<SkeletonChart legendCount={3} />}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No price benchmarking data available for the selected period.
        </div>
      )}
      onRefresh={refetch}
    >
      {bench && (
        <div className={styles.benchmarkBar}>
          <div className={styles.benchItem}>
            <span className={styles.benchLabel}>Best price paid</span>
            <span className={styles.benchValue}>{formatCurrency(bench.benchmark_price)}</span>
          </div>
          {bench.current_price != null && (
            <div className={styles.benchItem}>
              <span className={styles.benchLabel}>Latest avg</span>
              <span className={styles.benchValue}>{formatCurrency(bench.current_price)}</span>
            </div>
          )}
          {bench.vs_benchmark_pct != null && (
            <span
              className={`${styles.benchDelta} ${
                bench.vs_benchmark_pct > 0 ? styles.over : bench.vs_benchmark_pct < 0 ? styles.under : styles.even
              }`}
            >
              {bench.vs_benchmark_pct > 0 ? "▲ " : bench.vs_benchmark_pct < 0 ? "▼ " : "● "}
              {Math.abs(bench.vs_benchmark_pct)}%{" "}
              {bench.vs_benchmark_pct > 0 ? "above" : bench.vs_benchmark_pct < 0 ? "below" : "at"} benchmark
            </span>
          )}
        </div>
      )}
      {bench && (
        <p className={styles.benchNote}>
          Benchmark = best unit price previously paid for this item (value-based).
        </p>
      )}
      <div className={styles.chartContainer}>
        <Line data={chartData} options={chartOptions} />
      </div>
      {vendors.length > 0 && (
        <>
          <div className={styles.vendorSectionLabel}>
            Top {vendors.length} vendors by avg price
          </div>
          <div className={styles.vendorGrid}>
            {vendors.map((vendor, idx) => {
              const rank = idx + 1;
              const rankClass = rank === 1 ? styles.rankGold : rank === 2 ? styles.rankSilver : styles.rankBase;
              return (
                <div
                  key={idx}
                  className={`${styles.vendorCard} ${vendor.is_best ? styles.best : ""}`}
                >
                  <div className={styles.vendorNameRow}>
                    <span className={`${styles.rankChip} ${rankClass}`}>#{rank}</span>
                    <div className={styles.vendorName}>
                      {vendor.company_name || vendor.vendor_name}
                    </div>
                  </div>
                  <div className={styles.vendorPriceRow}>
                    <span className={styles.vendorPrice}>
                      {formatCurrency(vendor.avg_price)}
                    </span>
                    {vendor.is_best && <span className={styles.bestBadge}>Best</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PersonaCardShell>
  );
};

export default CostIntelligence;
