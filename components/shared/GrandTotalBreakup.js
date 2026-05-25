const GrandTotalBreakup = ({
  totalBase = 0,
  totalFreight = 0,
  totalPackaging = 0,
  totalTax = 0,
  totalOtherCharges = 0,
  totalBaseTax = 0,
  grandTotal = 0,
  formatPrice,
  align = "end",
  chargeBreakdown = [],
  taxBreakdown = [],
  globalChargeBreakdown = [],
  layout,
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

  // 3-column layout (vendor send-quote): line costs | taxes | globals.
  // Opt-in via layout="3col". Empty columns are suppressed.
  if (layout === "3col") {
    const col1Items = [
      { label: "Base Amount", value: Number(totalBase) || 0 },
      ...chargeBreakdown,
    ].filter((item) => item.value > 0);
    const col1Subtotal = col1Items.reduce((acc, item) => acc + Number(item.value || 0), 0);

    const col2Items = [
      { label: "GST", value: Number(totalBaseTax) || 0 },
      ...taxBreakdown,
    ].filter((item) => item.value > 0);
    const col2Subtotal = col2Items.reduce((acc, item) => acc + Number(item.value || 0), 0);

    const col3Items = visibleGlobals;
    const hasCol2 = col2Items.length > 0;
    const hasGlobalCol = col3Items.length > 0;
    const subTotal3 = col1Subtotal + col2Subtotal;

    if (!hasCol2 && !hasGlobalCol) {
      // Falls through to the existing single-column Grand Total layout below.
    } else {
      // 2×2 grid: row 1 = Line costs | Taxes ; row 2 = Sub Total | Globals.
      // Each cell is a fixed-width grid track so the four cells are
      // symmetric and their footer rows align across columns.
      const wrapperStyle = {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        alignItems: "stretch",
        columnGap: "32px",
        rowGap: "20px",
        width: "100%",
      };

      const gridColumnStyle = {
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: "1px",
        minWidth: 0,
      };

      const gridLabelStyle = { whiteSpace: "nowrap" };

      return (
        <div style={wrapperStyle}>
          {/* Row 1, Col 1 — Line costs */}
          <div style={gridColumnStyle}>
            {col1Items.map((item) => (
              <div key={item.label} style={lineStyle}>
                <span style={gridLabelStyle}>{item.label}:</span>
                <span style={valueStyle}>{fmt(item.value)}</span>
              </div>
            ))}
            <div style={separatorStyle} />
            <div style={subTotalLineStyle}>
              <span style={gridLabelStyle}>Total Charges:</span>
              <span style={{ ...valueStyle, fontWeight: "600" }}>{fmt(col1Subtotal)}</span>
            </div>
          </div>

          {/* Row 1, Col 2 — Taxes (empty placeholder keeps grid alignment when col2 is hidden) */}
          {hasCol2 ? (
            <div style={gridColumnStyle}>
              {col2Items.map((item) => (
                <div key={item.label} style={lineStyle}>
                  <span style={gridLabelStyle}>{item.label}:</span>
                  <span style={valueStyle}>{fmt(item.value)}</span>
                </div>
              ))}
              <div style={separatorStyle} />
              <div style={subTotalLineStyle}>
                <span style={gridLabelStyle}>Total Taxes:</span>
                <span style={{ ...valueStyle, fontWeight: "600" }}>{fmt(col2Subtotal)}</span>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Row 2, Col 1 — Sub Total roll-up */}
          <div style={gridColumnStyle}>
            <div style={lineStyle}>
              <span style={gridLabelStyle}>Total Charges:</span>
              <span style={valueStyle}>{fmt(col1Subtotal)}</span>
            </div>
            {hasCol2 && (
              <div style={lineStyle}>
                <span style={gridLabelStyle}>Total Taxes:</span>
                <span style={valueStyle}>{fmt(col2Subtotal)}</span>
              </div>
            )}
            <div style={separatorStyle} />
            <div style={subTotalLineStyle}>
              <span style={gridLabelStyle}>Sub Total:</span>
              <span style={{ ...valueStyle, fontWeight: "600" }}>{fmt(subTotal3)}</span>
            </div>
          </div>

          {/* Row 2, Col 2 — Globals → Grand Total */}
          {hasGlobalCol ? (
            <div style={gridColumnStyle}>
              {col3Items.map((item) => (
                <div key={item.label} style={lineStyle}>
                  <span style={gridLabelStyle}>{item.label}:</span>
                  <span style={valueStyle}>{fmt(item.value)}</span>
                </div>
              ))}
              <div style={separatorStyle} />
              <div style={totalLineStyle}>
                <span style={gridLabelStyle}>Grand Total <span style={{ fontSize: "0.72rem", color: "#6c757d", fontWeight: 400 }}>(incl. GST)</span>:</span>
                <span style={{ ...valueStyle, fontWeight: "700", minWidth: "100px" }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          ) : (
            <div style={gridColumnStyle}>
              <div style={totalLineStyle}>
                <span style={gridLabelStyle}>Grand Total <span style={{ fontSize: "0.72rem", color: "#6c757d", fontWeight: 400 }}>(incl. GST)</span>:</span>
                <span style={{ ...valueStyle, fontWeight: "700", minWidth: "100px" }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
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
