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
