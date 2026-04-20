import React, { useEffect, useState, useMemo, useRef } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { getCategoryInsights } from "@/services/dashboard";
import CardLoader from "./CardLoader";
import CardError from "./CardError";
import styles from "./CategoryInsights.module.scss";

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  "#2E5BA8",
  "#428B41",
  "#ffa500",
  "#9c27b0",
  "#f44336",
  "#2196f3",
  "#ffc107",
  "#607d8b",
];

const formatCurrency = (value) => {
  if (!value || value === 0) return "\u20B90";
  if (value >= 10000000) return `\u20B9${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `\u20B9${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `\u20B9${(value / 1000).toFixed(1)}K`;
  return `\u20B9${Math.round(value).toLocaleString("en-IN")}`;
};

const chartOptions = {
  cutout: "60%",
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1a2730",
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
  const [error, setError] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getCategoryInsights(filters);
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
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
          backgroundColor: categories.map(
            (_, i) => CHART_COLORS[i % CHART_COLORS.length]
          ),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [categories]);

  return (
    <div className={styles.card}>
      {loading && <CardLoader />}
      {error && !loading && <CardError onRetry={fetchData} />}

      <h3 className={styles.sectionTitle}>Spend by Category</h3>

      {chartData ? (
        <>
          <div className={styles.chartWrapper}>
            <Pie data={chartData} options={chartOptions} />
            <div className={styles.chartCenter}>
              <span className={styles.chartCenterValue}>
                {formatCurrency(totalSpend)}
              </span>
              <span className={styles.chartCenterLabel}>Total Spend</span>
            </div>
          </div>

          <div className={styles.categoryList}>
            {categories.map((cat, idx) => (
              <div key={idx} className={styles.categoryItem}>
                <div className={styles.categoryLeft}>
                  <span
                    className={styles.categoryDot}
                    style={{
                      backgroundColor:
                        CHART_COLORS[idx % CHART_COLORS.length],
                    }}
                  />
                  <span className={styles.categoryName}>
                    {cat.category_name}
                  </span>
                </div>
                <div className={styles.categoryRight}>
                  <span className={styles.categorySpend}>
                    {formatCurrency(cat.spend_amount)}
                  </span>
                  <span className={styles.categoryPct}>
                    {(cat.percentage || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        !loading && (
          <div className={styles.emptyState}>
            No category spend data available for the selected period.
          </div>
        )
      )}
    </div>
  );
};

export default CategoryInsights;
