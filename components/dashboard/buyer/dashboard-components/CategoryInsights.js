import React, { useState, useMemo } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { PieChart } from "lucide-react";
import { getCategoryInsights } from "@/services/dashboard";
import { formatMoney as formatCurrency } from "@/components/dashboard/shared/format";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonChart } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./CategoryInsights.module.scss";

ChartJS.register(ArcElement, Tooltip, Legend);

// Twelve distinct hues — the backend returns up to 12 named buckets plus
// "Others", so no two slices share a colour. "Others" is always neutral grey.
export const CHART_COLORS = [
  "#2563eb",
  "#15803d",
  "#b45309",
  "#b91c1c",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#4f46e5",
  "#0d9488",
  "#a16207",
];
export const OTHERS_COLOR = "#a1a1aa";

export const sliceColor = (cat, idx) =>
  cat?.category_name === "Others" && cat?.bucket_count != null
    ? OTHERS_COLOR
    : CHART_COLORS[idx % CHART_COLORS.length];

const chartOptions = {
  cutout: "62%",
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#18181b",
      titleFont: { size: 12, weight: "600" },
      bodyFont: { size: 11 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => {
          const label = ctx.label || "";
          const total = ctx.dataset.data.reduce((sum, v) => sum + (v || 0), 0);
          const pct = total > 0 ? ((ctx.raw || 0) / total) * 100 : 0;
          return `${label}: ${formatCurrency(ctx.raw)} (${pct.toFixed(1)}%)`;
        },
      },
    },
  },
};

const DIMENSION_OPTIONS = [
  { value: "category", label: "Category" },
  { value: "subcategory", label: "Sub-category" },
  { value: "item", label: "Item" },
];

const CategoryInsights = ({ filters }) => {
  const [dimension, setDimension] = useState("category");
  const { data, loading, error, stale, refetch } = useDashboardQuery(getCategoryInsights, filters, { extraParams: { dimension } });

  const categories = data?.categories || [];
  // The backend's committed-spend total (reconciles with Procurement snapshot).
  const totalSpend = useMemo(
    () => (data?.total_spend != null
      ? data.total_spend
      : categories.reduce((sum, cat) => sum + (cat.spend_amount || 0), 0)),
    [data, categories]
  );
  const chartData = useMemo(() => {
    if (categories.length === 0) return null;
    return {
      labels: categories.map((c) => c.category_name),
      datasets: [
        {
          // Plot rupees (the centre shows the rupee total); % is in the tooltip.
          data: categories.map((c) => c.spend_amount || 0),
          backgroundColor: categories.map((c, i) => sliceColor(c, i)),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [categories]);

  // Screen-reader summary of the doughnut; the visible legend below carries
  // the same figures as text.
  const chartSummary = categories.length
    ? `Spend by ${dimension}, total ${formatCurrency(totalSpend)}: ` +
      categories.map((c) => `${c.category_name} ${(c.percentage || 0).toFixed(1)}%`).join(", ")
    : "";

  return (
    <PersonaCardShell
      title="Spend by category"
      icon={PieChart}
      tooltip="Committed spend (approved POs onwards, incl. GST) split by category, sub-category or item for the period. Sub-category is the most specific category each product is filed under."
      actions={
        <select
          className={styles.dimSelect}
          value={dimension}
          onChange={(e) => setDimension(e.target.value)}
          aria-label="Group spend by"
        >
          {DIMENSION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      }
      loading={loading}
      error={error}
      stale={stale}
      skeleton={<SkeletonChart legendCount={4} />}
      isEmpty={!chartData}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No category spend data available for the selected period.
        </div>
      )}
      onRefresh={refetch}
    >
      <div className={styles.chartWrapper}>
        <Pie data={chartData} options={chartOptions} role="img" aria-label={chartSummary} />
        <div className={styles.chartCenter}>
          <span className={styles.chartCenterValue}>{formatCurrency(totalSpend)}</span>
          <span className={styles.chartCenterLabel}>Committed spend</span>
        </div>
      </div>
      <div className={styles.categoryList}>
        {categories.map((cat, idx) => (
          <div key={idx} className={styles.categoryItem}>
            <div className={styles.categoryLeft}>
              <span
                className={styles.categoryDot}
                style={{ backgroundColor: sliceColor(cat, idx) }}
              />
              <span className={styles.categoryName}>
                {cat.category_name}
                {cat.bucket_count != null ? ` (${cat.bucket_count} more)` : ""}
              </span>
            </div>
            <div className={styles.categoryRight}>
              <span className={styles.categorySpend}>{formatCurrency(cat.spend_amount)}</span>
              <span className={styles.categoryPct}>{(cat.percentage || 0).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </PersonaCardShell>
  );
};

export default CategoryInsights;
