// Purchase Order stage — a mini PO dashboard for this RFQ, themed + structured
// to match the ARC awarding stage (arc_v2.css): a full-width stat strip over a
// ccm-grid (prop-card PO list on the left, a sticky aside with PO approval
// progress + a "Where this sits" workflow on the right). The PO module stays
// the system of record; each card clicks through to PO Details. Status labels +
// ₹ + initials are reused from the PO module so they stay canonical.
import Link from "next/link";
import { FileText, IndianRupee, Clock3, CircleCheck, TriangleAlert } from "lucide-react";
import { statusLabel, inr, initialsOf, fmtDateOnly } from "@/components/dashboard/buyer/purchase-orders/shared";
import { removalReasonLabel } from "./StageShared";

// status → tone (pill colours + left card-accent) so each PO state reads
// distinctly: draft/grey, in-approval/amber, awaiting-vendor/blue,
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

// A coloured status pill (inline-styled so it works on the RFQ page too).
function StatusPill({ status }) {
  const t = toneOf(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: t.bg, color: t.c, border: `1px solid ${t.b}`, whiteSpace: "nowrap" }}>
      {statusLabel(status)}
    </span>
  );
}

// Approval-progress panel (right aside) from the latest PO approval instance,
// mirroring the awarding stage's member-row layout.
function ApprovalProgress({ instances }) {
  const list = Array.isArray(instances) ? instances : [];
  const inst = list.length ? list[list.length - 1] : null;
  const steps = inst && Array.isArray(inst.steps) ? inst.steps : [];

  if (!inst) {
    return (
      <div className="section-card">
        <div className="section-head">
          <div className="h-left">
            <div className="ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </div>
            <div><h2>Approval progress</h2><div className="h-sub">No approval yet</div></div>
          </div>
        </div>
        <div className="section-body">
          <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "6px 0" }}>
            Purchase orders for this RFQ have no approval instance yet.
          </div>
        </div>
      </div>
    );
  }

  const cur = Number(inst.current_step) || 1;
  const tot = Number(inst.total_steps) || steps.length || 1;
  const concluded = inst.status === "APPROVED" || inst.status === "REJECTED";

  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <div className="ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          </div>
          <div>
            <h2>Approval progress</h2>
            <div className="h-sub">{concluded ? `Concluded · ${String(inst.status).toLowerCase()}` : `Level ${Math.min(cur, tot)} of ${tot} in review`}</div>
          </div>
        </div>
      </div>
      <div className="section-body">
        {steps.map((step) => {
          const isCurrent = inst.status === "PENDING" && Number(step.step_order) === cur;
          const isStepSkipped = step.status === "SKIPPED";
          const isStepRemoved = step.status === "REMOVED";
          // REMOVED approver rows are a mid-flight reconciler's soft-tombstone
          // (role revoked while the approval was in progress) — they must not
          // read as still-live approvers, nor count toward anything. Keep them
          // visible in a separate, muted sub-group instead of dropping them.
          const allApprovers = step.approvers || [];
          const activeApprovers = allApprovers.filter((ap) => ap.status !== "REMOVED");
          const removedApprovers = allApprovers.filter((ap) => ap.status === "REMOVED");
          return (
            // rfqModel.formatApprovalInstances doesn't emit an `id` on steps —
            // `step_order` is the only stable identity a step row carries.
            <div key={step.step_order}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 2px" }}>
                <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: isCurrent ? "var(--warn)" : "var(--fg-4)", fontWeight: 700 }}>
                  Level {step.step_order}
                  {step.decision_rule ? (step.decision_rule === "ALL" ? " · all must approve" : " · any one approves") : ""}
                </span>
                <span className={`status-pill ${step.status === "APPROVED" ? "success" : step.status === "REJECTED" ? "danger" : isStepSkipped || isStepRemoved ? "neutral" : isCurrent ? "warn" : "neutral"}`} style={{ fontSize: 9.5 }}>
                  <span className="dot" />
                  {step.status === "APPROVED" ? "cleared" : step.status === "REJECTED" ? "rejected" : isStepSkipped ? "skipped" : isStepRemoved ? "removed" : isCurrent ? "reviewing now" : "waiting"}
                </span>
              </div>
              {activeApprovers.map((ap, ai) => (
                <div key={`active-${ap.user_id ?? ai}`} className={`mem-row${isCurrent && ap.status === "PENDING" ? " is-current" : ""}`}>
                  <div className="mr-av">{initialsOf(ap.user_name)}</div>
                  <div className="mr-meta">
                    <div className="mr-name">{ap.user_name || "Approver"}</div>
                    <div className="mr-role">{ap.user_designation || ap.user_department || "Approver"}</div>
                    {ap.comment && <div className="mr-comment">{ap.comment}</div>}
                  </div>
                  <div className="mr-status">
                    <span className={`status-pill ${ap.status === "APPROVED" ? "success" : ap.status === "REJECTED" ? "danger" : "neutral"}`} style={{ fontSize: 9.5 }}>
                      <span className="dot" />
                      {ap.status === "APPROVED" ? "approved" : ap.status === "REJECTED" ? "rejected" : "pending"}
                    </span>
                    {ap.acted_at && <span className="mr-time">{fmtDateOnly(ap.acted_at)}</span>}
                  </div>
                </div>
              ))}
              {removedApprovers.map((ap, ai) => {
                const reasonLabel = ap.removal_reason ? removalReasonLabel(ap.removal_reason) : null;
                return (
                  <div key={`removed-${ap.user_id ?? ai}`} className="mem-row" style={{ opacity: 0.6 }}>
                    <div className="mr-av">{initialsOf(ap.user_name)}</div>
                    <div className="mr-meta">
                      <div className="mr-name">{ap.user_name || "Approver"}</div>
                      <div className="mr-role">{ap.user_designation || ap.user_department || "Approver"}</div>
                    </div>
                    <div className="mr-status">
                      <span className="status-pill neutral" style={{ fontSize: 9.5 }}>
                        <span className="dot" />
                        Removed{reasonLabel ? ` · ${reasonLabel}` : ""}
                      </span>
                      {ap.removed_at && <span className="mr-time">{fmtDateOnly(ap.removed_at)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PurchaseOrderStage({ stage }) {
  const phase = stage?.phase || {};
  const pos = Array.isArray(phase.purchase_orders) ? phase.purchase_orders : [];

  const countOf = (...keys) => pos.filter((p) => keys.includes(p.status)).length;
  const total = pos.length;
  const totalValue = pos.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
  const inApproval = countOf("pending", "pending_approval");
  const approvedPlus = countOf("approved", "sent", "acceptance_pending", "invoice_raised", "dispatched", "GRN", "delivered", "completed");
  const attention = countOf("rejected", "rejected_by_vendor");
  const completedAll = total > 0 && countOf("completed", "delivered", "GRN") === total;
  const anyVendorStage = countOf("sent", "acceptance_pending", "invoice_raised", "dispatched", "GRN", "delivered", "completed") > 0;

  if (total === 0) {
    return (
      <div className="empty-state" style={{ padding: "48px 24px" }}>
        <div className="ic">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        </div>
        <h2>No purchase orders yet</h2>
        <p>No purchase orders have been raised for this RFQ. Once a PO is created from the finalized quotes, it appears here.</p>
        <Link href={`/dashboard/buyer/purchase-orders`} className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>Open PO dashboard</Link>
      </div>
    );
  }

  const STATS = [
    { key: "total",    cls: "s-ic indigo", icon: <FileText size={18} strokeWidth={2} />,    val: total,            label: "Purchase orders" },
    { key: "value",    cls: "s-ic green",  icon: <IndianRupee size={18} strokeWidth={2} />, val: inr(totalValue),  label: "Total value", mono: true },
    { key: "approval", cls: "s-ic amber",  icon: <Clock3 size={18} strokeWidth={2} />,      val: inApproval,       label: "In approval" },
    { key: "approved", cls: "s-ic blue",   icon: <CircleCheck size={18} strokeWidth={2} />, val: approvedPlus,     label: "Approved & beyond" },
    { key: "attention",cls: "s-ic",        icon: <TriangleAlert size={18} strokeWidth={2} />, val: attention,      label: "Needs attention", style: { background: "#fef2f2", color: "#b91c1c" } },
  ];

  // "Where this sits" — aggregate PO lifecycle.
  const approvalStep = attention > 0 ? "rejected" : inApproval > 0 ? "current" : approvedPlus > 0 ? "done" : "pending";
  const vendorStep = countOf("rejected_by_vendor") > 0 ? "rejected" : completedAll ? "done" : anyVendorStage ? "current" : "pending";

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

      <div className="ccm-grid">
        {/* LEFT — PO cards */}
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Purchase orders</h2>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, marginBottom: 12 }}>
            {total} purchase order{total === 1 ? "" : "s"} raised from this RFQ. Click any to open it in the PO dashboard.
          </div>
          <div className="prop-list">
            {pos.map((po, idx) => {
              const t = toneOf(po.status);
              const share = totalValue > 0 ? Math.round(((Number(po.total_amount) || 0) / totalValue) * 100) : 0;
              return (
                <Link
                  key={po.id || po.po_number}
                  href={`/dashboard/buyer/purchase-orders/${po.id}`}
                  className="prop-card"
                  style={{ display: "block", textDecoration: "none", color: "inherit", borderLeft: `3px solid ${t.c}` }}
                >
                  <div className="prop-head">
                    <div className="prop-id">
                      <div className="prop-num">{String(idx + 1).padStart(2, "0")}</div>
                      <div className="prop-title-row">
                        <div className="ptt">
                          <span>{po.po_number || `PO-${po.id}`}</span>
                          <span style={{ color: "var(--fg-3)", fontWeight: 450, margin: "0 6px" }}>·</span>
                          <span>{po.vendor_company || po.vendor_name || "Vendor"}</span>
                        </div>
                        <div className="ptm">
                          <StatusPill status={po.status} />
                          {po.created_at && <span>raised {fmtDateOnly(po.created_at)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="prop-body">
                    <div className="prop-metrics">
                      <div className="pm-cell">
                        <div className="pm-k">Total value</div>
                        <div className="pm-v success">{inr(po.total_amount)}</div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">Share of total</div>
                        <div className="pm-v sub">{share}%</div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">Vendor</div>
                        <div className="pm-v">{po.vendor_company || po.vendor_name || "—"}</div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">Products</div>
                        <div className="pm-v sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.product_names || "—"}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* RIGHT — approval progress + where this sits */}
        <aside className="ccm-aside">
          <ApprovalProgress instances={phase.approval_instances} />

          <div className="workflow">
            <div className="wf-head">
              <div className="t">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>{" "}
                Where this sits
              </div>
            </div>
            <div className="wf-step done">
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Purchase orders raised</div>
                <div className="meta">{total} PO{total === 1 ? "" : "s"} · {inr(totalValue)} total</div>
              </div>
            </div>
            <div className={`wf-step ${approvalStep}`}>
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Internal approval</div>
                <div className="meta">
                  {approvalStep === "rejected" ? `${attention} rejected` : approvalStep === "current" ? `${inApproval} in approval` : approvalStep === "done" ? "All approved" : "Awaiting approval"}
                </div>
              </div>
            </div>
            <div className={`wf-step ${vendorStep}`}>
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Vendor acceptance &amp; fulfilment</div>
                <div className="meta">
                  {vendorStep === "rejected" ? "Rejected by a vendor" : vendorStep === "done" ? "Completed" : vendorStep === "current" ? "With vendors" : "Not started"}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
