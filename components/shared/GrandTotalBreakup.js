const GrandTotalBreakup = ({
  totalBase = 0,
  totalFreight = 0,
  totalPackaging = 0,
  totalTax = 0,
  grandTotal = 0,
  formatPrice,
  align = "end",
}) => {
  const fmt = (val) => (formatPrice ? formatPrice(val) : `₹${val.toFixed(2)}`);

  const lineItems = [
    { label: "Base Amount", value: totalBase },
    { label: "Freight", value: totalFreight },
    { label: "Packaging", value: totalPackaging },
    { label: "Tax (GST)", value: totalTax },
  ].filter((item) => item.value > 0);

  const hasBreakup = lineItems.length > 0;

  const containerStyle = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: align === "end" ? "flex-end" : "flex-start",
    gap: "1px",
  };

  const lineStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    fontSize: "0.78rem",
    color: "#6c757d",
    lineHeight: "1.6",
    width: "100%",
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

  return (
    <div style={containerStyle}>
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
