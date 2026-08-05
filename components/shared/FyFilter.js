// FyFilter — shared presentational control for the Indian Financial Year filter.
// Used by RfqListPage, ContractsListPage, and MrAllPage. Pure UI: no filter
// state of its own; lifts mode/fy/from/to to the parent via onChange(next).
// The parent maps the mode → dateFrom/dateTo and folds them into its filters.
//
// Props:
//   value:    { mode: "none" | "fy" | "custom", fy: string, from: string, to: string }
//   onChange(next)   // next has the same shape

import { fyOptions } from "@/utils/financialYear";

const OPTIONS = fyOptions(); // evaluated once at module load (stable list for the session)

export default function FyFilter({ value, onChange }) {
  const { mode, fy, from, to } = value || { mode: "none", fy: "", from: "", to: "" };

  // Derive the <select> display value from the current mode.
  const selectVal = mode === "fy" ? fy : mode === "custom" ? "__custom" : "";

  function handleSelect(e) {
    const v = e.target.value;
    if (v === "") {
      onChange({ mode: "none", fy: "", from: "", to: "" });
    } else if (v === "__custom") {
      onChange({ mode: "custom", fy: "", from: from || "", to: to || "" });
    } else {
      // Named FY selected.
      onChange({ mode: "fy", fy: v, from: "", to: "" });
    }
  }

  function handleFrom(e) {
    onChange({ mode: "custom", fy: "", from: e.target.value, to });
  }

  function handleTo(e) {
    onChange({ mode: "custom", fy: "", from, to: e.target.value });
  }

  return (
    <div className="filter-group">
      <div className="fg-label">Financial year</div>
      <div className="fg-options">
        <select className="select" value={selectVal} onChange={handleSelect} style={{ width: "100%" }}>
          <option value="">All financial years</option>
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          <option value="__custom">Custom range…</option>
        </select>
        {mode === "custom" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 11.5, color: "#71717a" }}>From</label>
              <input type="date" className="input" value={from} onChange={handleFrom} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 11.5, color: "#71717a" }}>To</label>
              <input type="date" className="input" value={to} onChange={handleTo} style={{ width: "100%" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
