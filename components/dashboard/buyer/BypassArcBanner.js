import React from "react";

// BypassArcBanner — striking amber-themed alert that fires whenever an
// RFQ contains one or more products that bypass an active Annual Rate
// Contract (Phase 8 override). Used uniformly across:
//   - rfq-management-details (read-only view)
//   - Edit RFQ wizard
//   - Create RFQ wizard (live, as products are added)
// so reviewers see the override in every context.
//
// Props:
//   - count        : number of products on the RFQ that carry a
//                    bypass reason. When omitted/0 the banner falls
//                    back to a generic message; show counts whenever
//                    the BE / wizard knows them, since "2 of 5" reads
//                    sharper than "this RFQ has overrides".
//   - entityLabel  : "RFQ" or "Tender" — keeps copy correct on tenders.
//   - className    : optional override for outer wrapper margin.
//
// Bespoke inline styles, no Bootstrap — matches the rest of the
// Phase 7/8 surfaces (ContractedItemModal, contracted-PO indicators).

const BypassArcBanner = ({ count = 0, entityLabel = "RFQ", className }) => (
  <div
    role="alert"
    className={className}
    style={{
      marginBottom: 16,
      borderRadius: 10,
      border: "1px solid #fcd34d",
      borderLeft: "5px solid #f59e0b",
      background: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
      padding: "14px 18px",
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
    }}
  >
    <span
      aria-hidden
      style={{
        flex: "0 0 auto",
        marginTop: 2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: 999,
        background: "#f59e0b",
        color: "#fff",
        fontSize: 15,
        fontWeight: 800,
      }}
    >
      !
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            background: "#b45309",
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          Open Market — ARC Override
        </span>
        <strong style={{ color: "#7c2d12", fontSize: 14 }}>
          {count > 0
            ? `${count} product${count === 1 ? "" : "s"} on this ${entityLabel} bypass an active rate contract.`
            : `This ${entityLabel} contains products that bypass an active rate contract.`}
        </strong>
      </div>
      <p style={{ margin: "6px 0 0", color: "#92400e", fontSize: 12.5, lineHeight: 1.5 }}>
        The buyer chose to float an open-market quote for these products despite an Annual Rate
        Contract being in force. Each affected product carries a documented reason inline on its
        row below — review before approving.
      </p>
    </div>
  </div>
);

export default BypassArcBanner;
