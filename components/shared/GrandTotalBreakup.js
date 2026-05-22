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
      { label: "Tax on Base", value: Number(totalBaseTax) || 0 },
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
      const wrapperStyle = {
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: "32px",
        justifyContent: align === "end" ? "flex-end" : "flex-start",
        flexWrap: "wrap",
      };

      return (
        <div style={wrapperStyle}>
          <div style={columnStyle}>
            {col1Items.map((item) => (
              <div key={item.label} style={lineStyle}>
                <span style={{ whiteSpace: "nowrap" }}>{item.label}:</span>
                <span style={valueStyle}>{fmt(item.value)}</span>
              </div>
            ))}
            <div style={separatorStyle} />
            <div style={subTotalLineStyle}>
              <span style={{ whiteSpace: "nowrap" }}>Total Charges:</span>
              <span style={{ ...valueStyle, fontWeight: "600" }}>{fmt(col1Subtotal)}</span>
            </div>
          </div>

          {hasCol2 && (
            <div style={columnStyle}>
              {col2Items.map((item) => (
                <div key={item.label} style={lineStyle}>
                  <span style={{ whiteSpace: "nowrap" }}>{item.label}:</span>
                  <span style={valueStyle}>{fmt(item.value)}</span>
                </div>
              ))}
              <div style={separatorStyle} />
              <div style={subTotalLineStyle}>
                <span style={{ whiteSpace: "nowrap" }}>Total Taxes:</span>
                <span style={{ ...valueStyle, fontWeight: "600" }}>{fmt(col2Subtotal)}</span>
              </div>
            </div>
          )}

          <div style={columnStyle}>
            <div style={lineStyle}>
              <span style={{ whiteSpace: "nowrap" }}>Total Charges:</span>
              <span style={valueStyle}>{fmt(col1Subtotal)}</span>
            </div>
            {hasCol2 && (
              <div style={lineStyle}>
                <span style={{ whiteSpace: "nowrap" }}>Total Taxes:</span>
                <span style={valueStyle}>{fmt(col2Subtotal)}</span>
              </div>
            )}
            <div style={separatorStyle} />
            <div style={subTotalLineStyle}>
              <span style={{ whiteSpace: "nowrap" }}>Sub Total:</span>
              <span style={{ ...valueStyle, fontWeight: "600" }}>{fmt(subTotal3)}</span>
            </div>
          </div>

          {hasGlobalCol && (
            <div style={columnStyle}>
              {col3Items.map((item) => (
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
          )}

          {!hasGlobalCol && (
            <div style={columnStyle}>
              <div style={totalLineStyle}>
                <span style={{ whiteSpace: "nowrap" }}>Grand Total <span style={{ fontSize: "0.72rem", color: "#6c757d", fontWeight: 400 }}>(incl. GST)</span>:</span>
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
