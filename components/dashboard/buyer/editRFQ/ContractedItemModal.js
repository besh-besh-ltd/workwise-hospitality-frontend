import React from "react";

// ContractedItemModal — surfaces every active Group/Single ARC that
// already covers the (hotel, product) pair when a buyer tries to add
// a contracted item to a fresh RFQ draft.
//
// Three actions:
//   1. Create PO directly  → opens the ARC release flow (Phase 7).
//   2. Continue with RFQ    → flags the RFQ as a bypass-ARC override
//                             (Phase 8). Reason capture happens there.
//   3. Cancel               → close the modal, do not add the product.
//
// Bespoke styling: no Bootstrap. Brand-blue accent matches the
// "GROUP ARC · GLOBAL" indicator used elsewhere.

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const ContractedItemModal = ({
  isOpen,
  onClose,
  product,
  arcs = [],
  onCreatePoDirectly,
  onContinueWithRfq,
}) => {
  if (!isOpen) return null;

  const productName = product?.variant_name || product?.product_name || "this item";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.55)",
          zIndex: 2000,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contracted-item-modal-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(640px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.25)",
          zIndex: 2001,
          padding: "24px 26px",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "linear-gradient(90deg, #2E5BA8 0%, #3b82f6 100%)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            Contracted item
          </span>
        </div>

        <h3 id="contracted-item-modal-title" style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
          {productName} is already under an active ARC
        </h3>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 16 }}>
          A rate contract is already in place with the vendor(s) below for this item across one or more of the selected hotels.
          You can release a Purchase Order directly against the contract, or continue with an open-market RFQ if you have a
          documented reason to bypass the ARC.
        </p>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#f8fafc",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#eef2f7" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#334155" }}>Vendor</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#334155" }}>Tender</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#334155" }}>Validity</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: "#334155" }}>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {arcs.map((arc) => (
                <tr key={`${arc.arc_id}-${arc.hotel_id}`} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 10px", color: "#0f172a" }}>{arc.vendor_name || `Vendor #${arc.vendor_id}`}</td>
                  <td style={{ padding: "8px 10px", color: "#475569" }}>
                    #{arc.source_rfq_no}
                    {arc.source_rfq_title ? (
                      <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>{arc.source_rfq_title}</span>
                    ) : null}
                  </td>
                  <td style={{ padding: "8px 10px", color: "#475569" }}>
                    {formatDate(arc.period_from)} → {formatDate(arc.period_to)}
                    <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>
                      {arc.tender_scope === "GROUP" ? "Group ARC" : "Single ARC"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>
                    ₹{Number(arc.unit_price || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              padding: "9px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinueWithRfq}
            style={{
              border: "1px solid #f59e0b",
              background: "#fff",
              color: "#b45309",
              padding: "9px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Continue with an open-market RFQ. Reason will be captured as a bypass-ARC override."
          >
            Continue with RFQ
          </button>
          <button
            type="button"
            onClick={onCreatePoDirectly}
            style={{
              border: "none",
              background: "linear-gradient(90deg, #2E5BA8 0%, #3b82f6 100%)",
              color: "#fff",
              padding: "9px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Create PO directly
          </button>
        </div>
      </div>
    </>
  );
};

export default ContractedItemModal;
