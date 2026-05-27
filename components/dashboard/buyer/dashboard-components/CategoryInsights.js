import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { PieChart } from "lucide-react";
import { getCategoryInsights } from "@/services/dashboard";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
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

const formatCurrency = (value) => {
  if (!value || value === 0) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

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

const CategoryInsights = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await getCategoryInsights(filters);
      setData(res.data);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

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
      loading={loading}
      error={error}
      isEmpty={!chartData}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No category spend data available for the selected period.
        </div>
      )}
      onRefresh={() => {
        setLoading(true);
        fetchData();
      }}
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
