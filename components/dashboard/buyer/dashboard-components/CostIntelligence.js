import React, { useEffect, useState, useRef } from "react";
import Select from "react-select";
import { Line } from "react-chartjs-2";
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
import CardLoader from "./CardLoader";
import CardError from "./CardError";
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

const formatCurrency = (value) => {
  if (!value || value === 0) return "\u20B90";
  if (value >= 10000000) return `\u20B9${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `\u20B9${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `\u20B9${(value / 1000).toFixed(0)}K`;
  return `\u20B9${Math.round(value).toLocaleString("en-IN")}`;
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    fontSize: 13,
    borderColor: state.isFocused ? "#2E5BA8" : "#e2e2e2",
    boxShadow: state.isFocused ? "0 0 0 1px #2E5BA8" : "none",
    borderRadius: 8,
    "&:hover": { borderColor: "#ccc" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    backgroundColor: state.isSelected
      ? "#2E5BA8"
      : state.isFocused
      ? "#f5f7fa"
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
        label: (ctx) => `${ctx.dataset.label}: \u20B9${ctx.raw?.toLocaleString("en-IN") ?? ctx.raw}`,
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const intervalRef = useRef(null);
  const currentProductRef = useRef(null);

  const fetchData = async (productId) => {
    setLoading(true);
    setError(false);
    try {
      const params = { ...filters };
      if (productId) params.product_variant_id = productId;
      const res = await getCostIntelligence(params);
      setData(res.data);

      // Auto-select first product on initial load only
      if (!currentProductRef.current && res.data?.top_products?.length > 0) {
        const first = {
          label: res.data.top_products[0].product_name,
          value: res.data.top_products[0].product_variant_id,
        };
        setSelectedProduct(first);
        currentProductRef.current = first.value;
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    currentProductRef.current = null;
    setSelectedProduct(null);
    fetchData();
    intervalRef.current = setInterval(() => {
      fetchData(currentProductRef.current);
    }, 20000);
    return () => clearInterval(intervalRef.current);
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  const handleProductChange = (option) => {
    setSelectedProduct(option);
    currentProductRef.current = option?.value || null;
    if (option?.value) {
      fetchData(option.value);
    }
  };

  const productOptions = (data?.top_products || []).map((p) => ({
    label: p.product_name,
    value: p.product_variant_id,
  }));

  const priceTrend = data?.price_trend;
  const durationVal = filters.duration_type || "past7days";
  const chartLabels = (priceTrend?.labels || []).map((l) => {
    const d = new Date(l);
    if (durationVal === "past6months") {
      return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    }
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  });
  const hasData = priceTrend?.avg?.some((v) => v > 0);
  const chartData = priceTrend && hasData
    ? {
        labels: chartLabels,
        datasets: [
          {
            label: "Max Price",
            data: priceTrend.max,
            borderColor: "#e04444",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#e04444",
            tension: 0.3,
            spanGaps: false,
          },
          {
            label: "Avg. Price",
            data: priceTrend.avg,
            borderColor: "#2E5BA8",
            backgroundColor: "rgba(46, 91, 168, 0.04)",
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#2E5BA8",
            tension: 0.3,
            fill: true,
            spanGaps: false,
          },
          {
            label: "Min Price",
            data: priceTrend.min,
            borderColor: "#428B41",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: "#428B41",
            tension: 0.3,
            spanGaps: false,
          },
        ],
      }
    : null;

  const vendors = data?.vendor_comparison || [];
  const maxPrice = Math.max(...vendors.map((v) => v.avg_price || 0), 1);

  return (
    <div className={styles.card}>
      {loading && <CardLoader />}
      {error && !loading && <CardError onRetry={() => fetchData(currentProductRef.current)} />}

      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.sectionTitle}>Price Benchmarking</h3>
          <p className={styles.sectionSubtitle}>Compare vendor pricing trends for your most ordered products</p>
        </div>
        <div className={styles.productSelector}>
          <Select
            value={selectedProduct}
            onChange={handleProductChange}
            options={productOptions}
            placeholder="Select product..."
            styles={selectStyles}
            isClearable={false}
            isSearchable
          />
        </div>
      </div>

      {chartData ? (
        <>
          <div className={styles.chartContainer}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {vendors.length > 0 && (
            <>
              <p className={styles.vendorSectionLabel}>Top {vendors.length} Vendors by Avg. Price</p>
              <div className={styles.vendorGrid}>
                {vendors.map((vendor, idx) => (
                  <div
                    key={idx}
                    className={`${styles.vendorCard} ${vendor.is_best ? styles.best : ""}`}
                  >
                    <p className={styles.vendorName}>
                      {vendor.company_name || vendor.vendor_name}
                    </p>
                    <div className={styles.vendorPriceRow}>
                      <span className={styles.vendorPrice}>
                        {formatCurrency(vendor.avg_price)}
                      </span>
                      {vendor.is_best && (
                        <span className={styles.bestBadge}>Best</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        !loading && (
          <div className={styles.emptyState}>
            No price benchmarking data available for the selected period.
          </div>
        )
      )}
    </div>
  );
};

export default CostIntelligence;
