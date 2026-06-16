// Purchase Order stage — PO status for this RFQ + deep-links into the PO module
// (the system-of-record). If the lifecycle phase carries PO rows, list them
// with a click-through to PO Details; otherwise show the phase status + a link
// to the PO dashboard.
import Link from "next/link";
import { FileText } from "lucide-react";
import { StageCard } from "./StageShared";

const fmtMoney = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

export default function PurchaseOrderStage({ rfq, stage }) {
  const phase = stage?.phase || {};
  const pos = Array.isArray(phase.purchase_orders) ? phase.purchase_orders
    : Array.isArray(phase.pos) ? phase.pos
    : Array.isArray(phase.po_data) ? phase.po_data
    : [];

  const dashboardLink = (
    <Link href={`/dashboard/buyer/purchase-orders`} className="btn btn-secondary btn-sm">PO dashboard</Link>
  );

  return (
    <StageCard icon={<FileText size={15} strokeWidth={2} />} title="Purchase orders" right={dashboardLink}>
      {phase.summary && <div className="guide" style={{ marginBottom: 12 }}><div>{phase.summary}</div></div>}

      {pos.length === 0 ? (
        <div className="help-text">No purchase orders raised yet for this RFQ.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pos.map((po) => (
            <Link
              key={po.id || po.po_id || po.po_number}
              href={`/dashboard/buyer/purchase-orders/${po.id || po.po_id}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 13px", border: "1px solid var(--border)", borderRadius: 8, textDecoration: "none", color: "var(--fg)" }}
            >
              <span className="mono fw-600">{po.po_number || `PO-${po.id || po.po_id}`}</span>
              <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{po.vendor_name || po.vendor || ""}</span>
              <span className="status-pill" style={{ fontSize: 10.5 }}>{po.status || "—"}</span>
              <span className="mono">{fmtMoney(po.total_value ?? po.total_amount)}</span>
            </Link>
          ))}
        </div>
      )}
    </StageCard>
  );
}
