// Chart.js registration for the Negotiation Command Center.
//
// Same idiom as dashboard-components/CostIntelligence.js: register only the
// controllers/elements/scales this surface actually uses, then import the
// react-chartjs-2 wrapper. Registration is idempotent, so importing this from
// several components is safe. No new charting dependency is introduced —
// chart.js v4 + react-chartjs-2 v5 are already in package.json.
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export { Bar };

// arc_v2.css tokens, resolved to literals because a canvas cannot read CSS vars.
export const CHART_COLORS = {
  requested: "#2563eb", // --primary
  requestedSoft: "rgba(37,99,235,0.16)",
  achieved: "#15803d", // --success
  achievedSoft: "rgba(21,128,61,0.16)",
  danger: "#b91c1c", // --danger
  warn: "#b45309", // --warn
  grid: "rgba(15,15,14,0.04)", // matches the arc_v2 --shadow-sm tint
  zeroLine: "#d6d6cf", // --border-strong
  axis: "#a1a1aa", // --fg-4
  tooltipBg: "#18181b", // --fg
};

// Shared tooltip skin so both charts read as one system.
export const TOOLTIP_STYLE = {
  backgroundColor: CHART_COLORS.tooltipBg,
  titleFont: { size: 12, weight: "600" },
  bodyFont: { size: 11 },
  padding: 10,
  cornerRadius: 8,
  displayColors: true,
  boxPadding: 4,
};
