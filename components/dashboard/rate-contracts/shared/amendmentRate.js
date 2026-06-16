// Shared helpers for surfacing a live price/qty amendment overlay on a
// contract line — used by both the buyer (ActiveStage consumption matrix) and
// vendor (contract-detail consumption) views so the rate display + the (i)
// hover tooltip read identically.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const fmtD = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? "—"
    : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Structured amendment detail from the canonical overlay fields present on both
// surfaces' line objects. Returns null when there's no live overlay.
export function amendmentRateInfo(line, uom = "") {
  if (!line || !line.amendment_id) return null;
  const u = uom ? ` / ${uom}` : "";
  if (line.amendment_type === "qty") {
    const oldQ = Number(line.committed_qty ?? 0);
    const newQ = Number(line.effective_committed_qty ?? oldQ);
    if (newQ === oldQ) return null;
    const pct = oldQ > 0 ? Math.round(((newQ - oldQ) / oldQ) * 1000) / 10 : null;
    return {
      amdId: line.amendment_id, kindLabel: "Quantity revision",
      oldText: `${oldQ.toLocaleString("en-IN")} ${uom}`.trim(),
      newText: `${newQ.toLocaleString("en-IN")} ${uom}`.trim(),
      pct, from: line.amendment_effective_from, to: line.amendment_effective_to,
    };
  }
  const oldR = Number(line.unit_rate ?? 0);
  const newR = Number(line.effective_unit_rate ?? oldR);
  if (newR === oldR) return null;
  const pct = oldR > 0 ? Math.round(((newR - oldR) / oldR) * 1000) / 10 : null;
  return {
    amdId: line.amendment_id, kindLabel: "Price revision",
    oldText: `₹${oldR}${u}`, newText: `₹${newR}${u}`,
    pct, from: line.amendment_effective_from, to: line.amendment_effective_to,
  };
}

// Subtle (i) glyph + a custom, portal-positioned hover card with full
// amendment detail. Portaled to <body> so a table's overflow never clips it.
export function AmendmentTooltip({ line, uom = "" }) {
  const info = amendmentRateInfo(line, uom);
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(null); // {left, top} or null (hidden)

  useEffect(() => setMounted(true), []);

  if (!info) return null;

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.min(Math.max(r.left + r.width / 2, 150), (typeof window !== "undefined" ? window.innerWidth : 1024) - 150);
    setPos({ left, top: r.top });
  };
  const hide = () => setPos(null);

  const up = info.pct != null && info.pct >= 0;

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      style={{ cursor: "help", display: "inline-flex", alignItems: "center", color: "var(--fg-4)", outline: "none" }}
      aria-label="Amendment details"
    >
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      {mounted && pos && createPortal(
        <div
          role="tooltip"
          style={{
            position: "fixed", left: pos.left, top: pos.top,
            transform: "translate(-50%, calc(-100% - 10px))",
            width: 268, zIndex: 5000, pointerEvents: "none",
            background: "var(--surface)", color: "var(--fg)",
            border: "1px solid var(--border-strong)", borderRadius: 10,
            boxShadow: "var(--shadow-md)", padding: "12px 14px",
            fontFamily: "'Geist', sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-2)" }}>AMD-{info.amdId}</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a16207", background: "rgba(234,179,8,0.16)", padding: "2px 7px", borderRadius: 999 }}>{info.kindLabel}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 5, columnGap: 12, fontSize: 12 }}>
            <span style={{ color: "var(--fg-4)" }}>Original</span>
            <span className="mono" style={{ textAlign: "right", color: "var(--fg-3)", textDecoration: "line-through" }}>{info.oldText}</span>
            <span style={{ color: "var(--fg-4)" }}>Amended</span>
            <span className="mono" style={{ textAlign: "right", fontWeight: 700, color: "var(--warn)" }}>
              {info.newText}{info.pct != null ? <span style={{ marginLeft: 6, color: up ? "var(--danger)" : "var(--success)", fontWeight: 600 }}>({up ? "+" : ""}{info.pct}%)</span> : null}
            </span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-4)", fontWeight: 600 }}>Effective period</div>
            <div className="mono" style={{ marginTop: 3, fontSize: 12, color: "var(--fg-2)" }}>{fmtD(info.from)} → {fmtD(info.to)}</div>
          </div>
          <div style={{ marginTop: 9, fontSize: 10.5, color: "var(--fg-4)", lineHeight: 1.45 }}>
            Applies to call-off POs released within this window. The committed contract rate is unchanged.
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}
