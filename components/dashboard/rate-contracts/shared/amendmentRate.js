// Shared helpers for surfacing a live price/qty amendment overlay on a
// contract line — used by both the buyer (ActiveStage consumption matrix) and
// vendor (contract-detail consumption) views so the rate display + the (i)
// hover tooltip read identically.

const fmtD = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  return Number.isNaN(x.getTime())
    ? "—"
    : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Full amendment details for the (i) hover tooltip (native title — newlines OK).
// Reads the canonical overlay fields present on both surfaces' line objects.
export function amendmentTooltip(line, uom = "") {
  const u = uom ? `/${uom}` : "";
  if (line.amendment_type === "qty") {
    const oldQ = Number(line.committed_qty ?? 0);
    const newQ = Number(line.effective_committed_qty ?? oldQ);
    return `Amendment AMD-${line.amendment_id} · quantity revision\n`
      + `Committed ${oldQ.toLocaleString("en-IN")} → ${newQ.toLocaleString("en-IN")} ${uom}\n`
      + `Effective ${fmtD(line.amendment_effective_from)} → ${fmtD(line.amendment_effective_to)}`;
  }
  const oldR = Number(line.unit_rate ?? 0);
  const newR = Number(line.effective_unit_rate ?? oldR);
  const pct = oldR > 0 ? Math.round(((newR - oldR) / oldR) * 1000) / 10 : 0;
  return `Amendment AMD-${line.amendment_id} · price revision\n`
    + `₹${oldR} → ₹${newR}${u} (${pct >= 0 ? "+" : ""}${pct}%)\n`
    + `Effective ${fmtD(line.amendment_effective_from)} → ${fmtD(line.amendment_effective_to)}`;
}

// Subtle (i) glyph carrying a native hover tooltip.
export function InfoDot({ title, size = 12 }) {
  return (
    <span title={title} style={{ cursor: "help", display: "inline-flex", alignItems: "center", color: "var(--fg-4)" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
  );
}
