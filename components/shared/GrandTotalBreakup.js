const GrandTotalBreakup = ({
  totalBase = 0,
  totalFreight = 0,
  totalPackaging = 0,
  totalTax = 0,
  totalOtherCharges = 0,
  grandTotal = 0,
  formatPrice,
  align = "end",
  chargeBreakdown = [],
  globalChargeBreakdown = [],
  // When provided, switches to the row-aligned 3-column layout used on the
  // send-quote page: col 1 = pre-tax amount per row, col 2 = GST on that row,
  // col 3 = globals + Grand Total. Each entry: { label, amount, tax }.
  taxedRows = null,
}) => {
  const fmt = (val) => (formatPrice ? formatPrice(val) : `₹${val.toFixed(2)}`);

  const lineItems = [
    { label: "Base Amount", value: totalBase },
    { label: "Freight", value: totalFreight },
    { label: "Packaging", value: totalPackaging },
    { label: "Tax (GST)", value: totalTax },
    ...(chargeBreakdown.length > 0
      ? chargeBreakdown
      : [{ label: "Other Charges", value: totalOtherCharges }]),
  ].filter((item) => item.value > 0);

  const visibleGlobals = globalChargeBreakdown.filter((item) => item.value > 0);
  const hasGlobals = visibleGlobals.length > 0;
  const subTotal = lineItems.reduce((acc, item) => acc + Number(item.value || 0), 0);

  const lineStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    fontSize: "0.78rem",
    color: "#6c757d",
    lineHeight: "1.6",
    width: "100%",
  };

  const subTotalLineStyle = {
    ...lineStyle,
    fontSize: "0.85rem",
    color: "#212529",
    fontWeight: "600",
  };

  const totalLineStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    fontSize: "0.9rem",
    color: "#212529",
    fontWeight: "700",
    lineHeight: "1.6",
    width: "100%",
  };

  const valueStyle = {
    fontWeight: "500",
    whiteSpace: "nowrap",
    minWidth: "90px",
    textAlign: "right",
  };

  const separatorStyle = {
    width: "100%",
    borderTop: "1px dashed #ced4da",
    margin: "3px 0 4px 0",
  };

  const columnStyle = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: align === "end" ? "flex-end" : "flex-start",
    justifyContent: "flex-end",
    gap: "1px",
    minWidth: "240px",
  };

  // ─── 3-column row-aligned layout (send-quote) ──────────────────────────
  // Activated by `taxedRows`. Col 1: pre-tax amount per row. Col 2: GST on
  // that row. Col 3: globals + Grand Total (only rendered when there are any
  // globals; otherwise Grand Total sits at the bottom of col 2).
  if (Array.isArray(taxedRows) && taxedRows.length > 0) {
    const amountRows = taxedRows.filter((r) => Number(r.amount || 0) > 0);
    const taxRows = taxedRows.filter((r) => Number(r.tax || 0) > 0);
    const subTotalAmount = amountRows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const subTotalTax = taxRows.reduce((a, r) => a + (Number(r.tax) || 0), 0);

    // Label = muted; value = darker (per UX request). Totals row uses the same
    // darker value tone in bold.
    const labelStyle = { whiteSpace: "nowrap", color: "#6c757d", fontSize: "0.78rem", lineHeight: "1.6" };
    const valueStyle = { fontWeight: "500", whiteSpace: "nowrap", textAlign: "right", color: "#212529", fontSize: "0.78rem", lineHeight: "1.6", paddingLeft: "12px" };
    const subLabelStyle = { whiteSpace: "nowrap", color: "#212529", fontWeight: "600", fontSize: "0.85rem", lineHeight: "1.6" };
    const subValueStyle = { fontWeight: "600", whiteSpace: "nowrap", textAlign: "right", color: "#212529", fontSize: "0.85rem", lineHeight: "1.6", paddingLeft: "12px" };
    const grandLabelStyle = { whiteSpace: "nowrap", color: "#212529", fontWeight: "700", fontSize: "0.9rem", lineHeight: "1.6" };
    const grandValueStyle = { fontWeight: "700", whiteSpace: "nowrap", textAlign: "right", color: "#212529", fontSize: "0.9rem", lineHeight: "1.6", paddingLeft: "12px", minWidth: "110px" };
    const dashStyle = { borderTop: "1px dashed #ced4da", margin: "3px 0 4px 0", width: "100%" };

    // Bottom-aligned flex: each column's totals row sits at the same baseline
    // so the dotted separators line up across all 3 columns regardless of how
    // many entries each column carries.
    const wrapperStyle = { display: "flex", flexDirection: "row", alignItems: "flex-end", gap: "40px", justifyContent: align === "end" ? "flex-end" : "flex-start" };
    const colStyle = { display: "flex", flexDirection: "column", justifyContent: "flex-end" };
    const tableStyle = { borderCollapse: "collapse" };

    const renderRows = (entries, side) => (
      <table style={tableStyle}><tbody>
        {entries.map((r) => (
          <tr key={`${side}-${r.label}`}>
            <td style={labelStyle}>{side === "tax" ? `Tax on ${r.label}` : r.label}:</td>
            <td style={valueStyle}>{fmt(Number(side === "tax" ? r.tax : r.amount) || 0)}</td>
          </tr>
        ))}
      </tbody></table>
    );

    const renderTotalRow = (label, value, bold = "sub") => {
      const ls = bold === "grand" ? grandLabelStyle : subLabelStyle;
      const vs = bold === "grand" ? grandValueStyle : subValueStyle;
      return (
        <table style={tableStyle}><tbody>
          <tr>
            <td style={ls}>{label}</td>
            <td style={vs}>{value}</td>
          </tr>
        </tbody></table>
      );
    };

    return (
      <div style={wrapperStyle}>
        {/* Col 1: pre-tax amounts */}
        <div style={colStyle}>
          {renderRows(amountRows, "amount")}
          <div style={dashStyle} />
          {renderTotalRow(hasGlobals ? "Sub Total:" : "Total:", fmt(subTotalAmount))}
        </div>

        {/* Col 2: GST per row (no empty padding rows — list grows up to the dotted line) */}
        {taxRows.length > 0 && (
          <div style={colStyle}>
            {renderRows(taxRows, "tax")}
            <div style={dashStyle} />
            {renderTotalRow("Total Tax:", fmt(subTotalTax))}
          </div>
        )}

        {/* Col 3: globals + Grand Total. When no globals, Grand Total stands alone here. */}
        <div style={colStyle}>
          {hasGlobals && (
            <table style={tableStyle}><tbody>
              {visibleGlobals.map((g) => (
                <tr key={`global-${g.label}`}>
                  <td style={labelStyle}>{g.label}:</td>
                  <td style={valueStyle}>{fmt(Number(g.value) || 0)}</td>
                </tr>
              ))}
            </tbody></table>
          )}
          <div style={dashStyle} />
          {renderTotalRow(
            <>Grand Total <span style={{ fontSize: "0.72rem", color: "#6c757d", fontWeight: 400 }}>(incl. GST)</span>:</>,
            fmt(grandTotal),
            "grand"
          )}
        </div>
      </div>
    );
  }

  // Two-column layout when globals exist: left = per-line breakdown ending in
  // Sub Total, right = globals ending in Grand Total. Single-column fallback
  // otherwise — Sub Total would equal Grand Total without globals.
  if (hasGlobals) {
    const wrapperStyle = {
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch",
      gap: "32px",
      justifyContent: align === "end" ? "flex-end" : "flex-start",
    };

    return (
      <div style={wrapperStyle}>
        <div style={columnStyle}>
          {lineItems.map((item) => (
            <div key={item.label} style={lineStyle}>
              <span style={{ whiteSpace: "nowrap" }}>{item.label}:</span>
              <span style={valueStyle}>{fmt(item.value)}</span>
            </div>
          ))}
          <div style={separatorStyle} />
          <div style={subTotalLineStyle}>
            <span style={{ whiteSpace: "nowrap" }}>Sub Total:</span>
            <span style={{ ...valueStyle, fontWeight: "600" }}>{fmt(subTotal)}</span>
          </div>
        </div>
        <div style={columnStyle}>
          {visibleGlobals.map((item) => (
            <div key={item.label} style={lineStyle}>
              <span style={{ whiteSpace: "nowrap" }}>{item.label}:</span>
              <span style={valueStyle}>{fmt(item.value)}</span>
            </div>
          ))}
          <div style={separatorStyle} />
          <div style={totalLineStyle}>
            <span style={{ whiteSpace: "nowrap" }}>Grand Total <span style={{ fontSize: "0.72rem", color: "#6c757d", fontWeight: 400 }}>(incl. GST)</span>:</span>
            <span style={{ ...valueStyle, fontWeight: "700", minWidth: "100px" }}>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>
    );
  }

  const hasBreakup = lineItems.length > 0;

  return (
    <div style={columnStyle}>
      {hasBreakup && (
        <>
          {lineItems.map((item) => (
            <div key={item.label} style={lineStyle}>
              <span style={{ whiteSpace: "nowrap" }}>{item.label}:</span>
              <span style={valueStyle}>{fmt(item.value)}</span>
            </div>
          ))}
          <div style={separatorStyle} />
        </>
      )}
      <div style={totalLineStyle}>
        <span style={{ whiteSpace: "nowrap" }}>Grand Total (incl. GST):</span>
        <span style={{ ...valueStyle, fontWeight: "700", minWidth: "100px" }}>{fmt(grandTotal)}</span>
      </div>
    </div>
  );
};

export default GrandTotalBreakup;
