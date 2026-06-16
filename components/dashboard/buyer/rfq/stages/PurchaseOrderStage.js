// Purchase Order stage — PO status for this RFQ + deep-links into the PO module
// (the system-of-record). Lists each PO with status, vendor and value, the PO
// approval chain, and click-through to PO Details; the right-rail links to the
// cross-RFQ PO dashboard.
import Link from "next/link";
import { FileText } from "lucide-react";
import { StageCard, ApprovalChain, StatusPill } from "./StageShared";

const fmtMoney = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

export default function PurchaseOrderStage({ rfq, stage }) {
  const phase = stage?.phase || {};
  const pos = Array.isArray(phase.purchase_orders) ? phase.purchase_orders : [];
  const total = pos.reduce((s, po) => s + (Number(po.total_amount) || 0), 0);

  const dashboardLink = (
    <Link href={`/dashboard/buyer/purchase-orders`} className="btn btn-secondary btn-sm">PO dashboard</Link>
  );

  return (
    <StageCard icon={<FileText size={15} strokeWidth={2} />} title="Purchase orders" right={dashboardLink}>
      {phase.summary && <div className="guide" style={{ marginBottom: 12 }}><div>{phase.summary}</div></div>}

      {pos.length === 0 ? (
        <div className="help-text">No purchase orders raised yet for this RFQ.</div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pos.map((po) => (
              <Link
                key={po.id || po.po_number}
                href={`/dashboard/buyer/purchase-orders/${po.id}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 14px", border: "1px solid #ebebe6", borderRadius: 9, textDecoration: "none", color: "#18181b" }}
              >
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{po.po_number || `PO-${po.id}`}</span>
                  {(po.vendor_company || po.vendor_name) && (
                    <span style={{ fontSize: 11, color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.vendor_company || po.vendor_name}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <StatusPill status={po.status} label={po.status ? String(po.status).replace(/_/g, " ") : "—"} />
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{fmtMoney(po.total_amount)}</span>
                </div>
              </Link>
            ))}
          </div>
          {total > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #ebebe6" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a1a1aa" }}>Total</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#18181b" }}>{fmtMoney(total)}</span>
            </div>
          )}
        </>
      )}

      <ApprovalChain instances={phase.approval_instances} title="PO approval" />
    </StageCard>
  );
}
