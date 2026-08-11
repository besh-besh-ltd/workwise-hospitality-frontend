// FilterMenus — the Vendor and Date filter controls on the PO Dashboard and PO
// Tracking pages.
//
// Both pages previously rendered these as decorative buttons with no onClick.
// They are lifted into one file because the two pages must behave identically:
// a user who learns the Date menu on the dashboard should not meet a different
// one on tracking.
//
// Neither control holds filter state — the parent owns it and pushes it to the
// server on the next fetch, because the PO lists are server-side faceted and
// paginated. Filtering in the browser would only ever filter the visible page.
//
// Styling follows the surrounding pages: CSS-module classes for the button
// (so it matches the tabs beside it) and inline styles for the popover, the
// same mix VendorPoOrders.js already uses for its Type menu.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Calendar, ChevronDown, Check } from "lucide-react";
import { fyOptions, fyToRange } from "@/utils/financialYear";

const FY_OPTIONS = fyOptions(); // stable for the session

const menuStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 50,
  minWidth: 220,
  maxHeight: 320,
  overflowY: "auto",
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  boxShadow: "0 10px 30px -10px rgba(15,15,14,0.22), 0 2px 8px rgba(15,15,14,0.06)",
  padding: 5,
};

const Option = ({ label, meta, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      textAlign: "left",
      padding: "7px 10px",
      borderRadius: 7,
      border: "none",
      background: active ? "var(--surface-3)" : "transparent",
      color: active ? "var(--fg)" : "var(--fg-2)",
      fontSize: "12.5px",
      fontWeight: active ? 600 : 500,
      cursor: "pointer",
    }}
  >
    <span style={{ width: 12, flexShrink: 0 }}>{active ? <Check size={12} /> : null}</span>
    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {label}
    </span>
    {meta != null && <span style={{ color: "var(--fg-4)", fontSize: 11 }}>{meta}</span>}
  </button>
);

/** Closes the menu on an outside click. */
function useDismiss(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

/**
 * Vendor filter.
 *
 * `vendors` is the server-supplied facet ([{ id, label, count }]) — never a
 * list derived from the rows on screen, which would only ever offer the vendors
 * on the current page.
 *
 * value: vendor id (number) or null.  onChange(id|null)
 */
export function VendorFilter({ styles, vendors = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const active = useMemo(
    () => vendors.find((v) => String(v.id) === String(value)),
    [vendors, value]
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={value ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
        title={active ? active.label : "Filter by vendor"}
      >
        <Filter size={12} />
        <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active ? active.label : "Vendor"}
        </span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={menuStyle}>
          <Option
            label="All vendors"
            active={!value}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          />
          {vendors.length === 0 && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--fg-4)" }}>
              No vendors on your purchase orders yet.
            </div>
          )}
          {vendors.map((v) => (
            <Option
              key={v.id}
              label={v.label}
              meta={v.count}
              active={String(v.id) === String(value)}
              onClick={() => {
                onChange(v.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Date filter over the PO creation date.
 *
 * Presets are Indian financial years, from the same `utils/financialYear`
 * helper the RFQ / ARC / MR listings use, so "FY 2026-27" means the identical
 * window on every listing in the product. `Custom range` falls back to two
 * date inputs.
 *
 * value: { mode: "none"|"fy"|"custom", fy, from, to }
 * onChange(next) — the parent derives dateFrom/dateTo via rangeOf(next).
 */
export const EMPTY_DATE_FILTER = { mode: "none", fy: "", from: "", to: "" };

/** { mode, fy, from, to } → { from, to } ISO calendar days for the API. */
export function rangeOf(value) {
  if (!value || value.mode === "none") return { from: "", to: "" };
  if (value.mode === "fy") return fyToRange(value.fy);
  return { from: value.from || "", to: value.to || "" };
}

export function DateFilter({ styles, value = EMPTY_DATE_FILTER, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const { mode, fy, from, to } = value;

  const label =
    mode === "fy" ? `FY ${fy}`
      : mode === "custom" && (from || to) ? `${from || "…"} → ${to || "…"}`
        : "Date";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={mode !== "none" ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
        title="Filter by creation date"
      >
        <Calendar size={12} />
        <span style={{ maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={menuStyle}>
          <Option
            label="All time"
            active={mode === "none"}
            onClick={() => {
              onChange(EMPTY_DATE_FILTER);
              setOpen(false);
            }}
          />
          {FY_OPTIONS.map((opt) => (
            <Option
              key={opt.value}
              label={opt.label}
              active={mode === "fy" && fy === opt.value}
              onClick={() => {
                onChange({ mode: "fy", fy: opt.value, from: "", to: "" });
                setOpen(false);
              }}
            />
          ))}
          <Option
            label="Custom range…"
            active={mode === "custom"}
            onClick={() => onChange({ mode: "custom", fy: "", from, to })}
          />
          {mode === "custom" && (
            // The menu stays open while a custom range is being typed: closing
            // on the first field would make the second unreachable.
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 10px 8px" }}>
              <label style={{ fontSize: 11, color: "var(--fg-4)" }}>
                From
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => onChange({ mode: "custom", fy: "", from: e.target.value, to })}
                  style={{
                    display: "block", width: "100%", marginTop: 3, padding: "5px 7px",
                    fontSize: 12, borderRadius: 6, border: "1px solid var(--border-strong)",
                    background: "var(--surface)", color: "var(--fg)",
                  }}
                />
              </label>
              <label style={{ fontSize: 11, color: "var(--fg-4)" }}>
                To
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => onChange({ mode: "custom", fy: "", from, to: e.target.value })}
                  style={{
                    display: "block", width: "100%", marginTop: 3, padding: "5px 7px",
                    fontSize: 12, borderRadius: 6, border: "1px solid var(--border-strong)",
                    background: "var(--surface)", color: "var(--fg)",
                  }}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default { VendorFilter, DateFilter, EMPTY_DATE_FILTER, rangeOf };
