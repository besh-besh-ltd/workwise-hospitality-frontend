// Purchase Order stage — a mini PO dashboard for this RFQ (the PO module stays
// the system of record). A compact stat strip + status-distinct PO rows that
// click through to PO Details, styled after the ARC awarding stage. Status
// labels + ₹ formatting are reused from the PO module so they stay canonical.
import Link from "next/link";
import { FileText, IndianRupee, Clock3, CircleCheck, TriangleAlert } from "lucide-react";
import { StageCard, ApprovalChain } from "./StageShared";
import { statusLabel, inr } from "@/components/dashboard/buyer/purchase-orders/shared";

// status → tone (pill colours + the left row-accent) so every PO state reads
// distinctly at a glance: draft/grey, in-approval/amber, awaiting-vendor/blue,
// approved/green, dispatched/violet, rejected (internal or vendor)/red.
const TONE = {
  draft:              { c: "#71717a", bg: "#f4f4f5", b: "#e4e4e7" },
  pending:            { c: "#b45309", bg: "#fffbeb", b: "#fde68a" },
  pending_approval:   { c: "#b45309", bg: "#fffbeb", b: "#fde68a" },
  acceptance_pending: { c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" },
  sent:               { c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" },
  approved:           { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  invoice_raised:     { c: "#7c3aed", bg: "#f5f3ff", b: "#ddd6fe" },
  dispatched:         { c: "#7c3aed", bg: "#f5f3ff", b: "#ddd6fe" },
  GRN:                { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  delivered:          { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  completed:          { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  rejected:           { c: "#b91c1c", bg: "#fef2f2", b: "#fecaca" },
  rejected_by_vendor: { c: "#b91c1c", bg: "#fef2f2", b: "#fecaca" },
  cancelled:          { c: "#71717a", bg: "#f4f4f5", b: "#e4e4e7" },
};
const toneOf = (s) => TONE[s] || TONE.draft;

export default function PurchaseOrderStage({ stage }) {
  const phase = stage?.phase || {};
  const pos = Array.isArray(phase.purchase_orders) ? phase.purchase_orders : [];

  const countOf = (...keys) => pos.filter((p) => keys.includes(p.status)).length;
  const total = pos.length;
  const totalValue = pos.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
  const inApproval = countOf("pending", "pending_approval");
  const approvedPlus = countOf("approved", "sent", "acceptance_pending", "invoice_raised", "dispatched", "GRN", "delivered", "completed");
  const attention = countOf("rejected", "rejected_by_vendor");

  const dashboardLink = (
    <Link href={`/dashboard/buyer/purchase-orders`} className="btn btn-secondary btn-sm">PO dashboard</Link>
  );

  const approvalChain = <ApprovalChain instances={phase.approval_instances} title="PO approval" />;

  if (total === 0) {
    return (
      <StageCard icon={<FileText size={15} strokeWidth={2} />} title="Purchase orders" right={dashboardLink}>
        {phase.summary && <div className="guide" style={{ marginBottom: 12 }}><div>{phase.summary}</div></div>}
        <div className="help-text">No purchase orders raised yet for this RFQ.</div>
        {approvalChain}
      </StageCard>
    );
  }

  const STATS = [
    { key: "total",    cls: "s-ic indigo", icon: <FileText size={18} strokeWidth={2} />,    val: total,            label: "Purchase orders" },
    { key: "value",    cls: "s-ic green",  icon: <IndianRupee size={18} strokeWidth={2} />, val: inr(totalValue),  label: "Total value", mono: true },
    { key: "approval", cls: "s-ic amber",  icon: <Clock3 size={18} strokeWidth={2} />,      val: inApproval,       label: "In approval" },
    { key: "approved", cls: "s-ic blue",   icon: <CircleCheck size={18} strokeWidth={2} />, val: approvedPlus,     label: "Approved" },
    { key: "attention",cls: "s-ic",        icon: <TriangleAlert size={18} strokeWidth={2} />, val: attention,      label: "Needs attention", style: { background: "#fef2f2", color: "#b91c1c" } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="stat-strip">
        {STATS.map((s) => (
          <div className="stat-card" key={s.key}>
            <div className={s.cls} style={s.style}>{s.icon}</div>
            <div>
              <div className={`s-val${s.mono ? " mono" : ""}`}>{s.val}</div>
              <div className="s-label">{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      <StageCard icon={<FileText size={15} strokeWidth={2} />} title="Purchase orders" right={dashboardLink}>
        {phase.summary && <div className="guide" style={{ marginBottom: 12 }}><div>{phase.summary}</div></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {pos.map((po) => {
            const t = toneOf(po.status);
            return (
              <Link
                key={po.id || po.po_number}
                href={`/dashboard/buyer/purchase-orders/${po.id}`}
                style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 14px 12px 13px", border: "1px solid #ebebe6", borderLeft: `3px solid ${t.c}`, borderRadius: 9, textDecoration: "none", color: "#18181b", background: "#ffffff" }}
              >
                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{po.po_number || `PO-${po.id}`}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: t.bg, color: t.c, border: `1px solid ${t.b}`, whiteSpace: "nowrap" }}>
                      {statusLabel(po.status)}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(po.vendor_company || po.vendor_name) || "—"}{po.product_names ? ` · ${po.product_names}` : ""}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{inr(po.total_amount)}</span>
              </Link>
            );
          })}
        </div>
        {approvalChain}
      </StageCard>
    </div>
  );
}
