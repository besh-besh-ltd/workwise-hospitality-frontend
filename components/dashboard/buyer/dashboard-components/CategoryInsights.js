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

// Vibrant blue-led palette — restores visual identity while keeping the
// minimal card chrome from PersonaCardShell.
const CHART_COLORS = [
  "#2563eb",
  "#3b82f6",
  "#15803d",
  "#b45309",
  "#b91c1c",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

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
          const value = ctx.raw || 0;
          return `${label}: ${value.toFixed(1)}%`;
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
  const totalSpend = useMemo(
    () => categories.reduce((sum, cat) => sum + (cat.spend_amount || 0), 0),
    [categories]
  );
  const chartData = useMemo(() => {
    if (categories.length === 0) return null;
    return {
      labels: categories.map((c) => c.category_name),
      datasets: [
        {
          data: categories.map((c) => c.percentage || 0),
          backgroundColor: categories.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [categories]);

  return (
    <PersonaCardShell
      title="Spend by category"
      icon={PieChart}
      tooltip="Procurement spend split across product categories in this period."
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
        <Pie data={chartData} options={chartOptions} />
        <div className={styles.chartCenter}>
          <span className={styles.chartCenterValue}>{formatCurrency(totalSpend)}</span>
          <span className={styles.chartCenterLabel}>Total spend</span>
        </div>
      </div>
      <div className={styles.categoryList}>
        {categories.map((cat, idx) => (
          <div key={idx} className={styles.categoryItem}>
            <div className={styles.categoryLeft}>
              <span
                className={styles.categoryDot}
                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              <span className={styles.categoryName}>{cat.category_name}</span>
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
