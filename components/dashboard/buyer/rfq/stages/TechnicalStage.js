// Technical Evaluation stage — in-page surface. Shows per-product pass/fail
// against vendors, the evaluators, the technical approval chain, and any stuck
// state, with a deep-link into the full evaluation workspace. Renders "Skipped"
// when no technical evaluation is configured.
import Link from "next/link";
import { ClipboardCheck, Users, AlertTriangle } from "lucide-react";
import { StageCard, ApprovalChain } from "./StageShared";

// sub_status values that warrant a warning banner (from rfqModel.getLifecycleSummary).
const WARN_SUBSTATUS = {
  all_vendors_failed: "All evaluated vendors failed technical evaluation. Extend the bid deadline and refresh vendors to proceed.",
  no_vendors_participated: "No vendors participated in the technical round yet.",
  partially_stuck: "Some products cleared, but others are stuck — all their vendors failed technical evaluation.",
  rejected: "Technical evaluation was rejected by the approver.",
};

function Metric({ value, label, tone }) {
  const fg = tone === "ok" ? "#15803d" : tone === "bad" ? "#b91c1c" : "#52525b";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 46 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: fg, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a1a1aa" }}>{label}</span>
    </div>
  );
}

export default function TechnicalStage({ rfq, stage }) {
  const phase = stage?.phase || {};
  const products = Array.isArray(phase.products) ? phase.products : [];
  const evaluators = Array.isArray(phase.evaluators) ? phase.evaluators : [];
  const warn = phase.sub_status ? WARN_SUBSTATUS[phase.sub_status] : null;

  const openBtn = (
    <Link href={`/dashboard/buyer/technical-evaluation?rfq_id=${rfq?.id}`} className="btn btn-blue btn-sm">
      Open evaluation
    </Link>
  );

  if (stage?.state === "skipped") {
    return (
      <StageCard icon={<ClipboardCheck size={15} strokeWidth={2} />} title="Technical evaluation">
        <div className="empty-state" style={{ padding: "20px 0" }}>
          <h2>Technical evaluation skipped</h2>
          <p>No technical evaluation was configured for this RFQ — vendors proceed straight to commercial evaluation.</p>
        </div>
      </StageCard>
    );
  }

  return (
    <StageCard icon={<ClipboardCheck size={15} strokeWidth={2} />} title="Technical evaluation" right={openBtn}>
      {phase.summary
        ? <div className="guide"><div>{phase.summary}</div></div>
        : <div className="help-text">Technical evaluation is in progress.</div>}

      {warn && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 12, padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, color: "#92400e", fontSize: 12.5 }}>
          <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{warn}</span>
        </div>
      )}

      {products.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {products.map((p) => (
            <div key={p.product_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 14px", border: "1px solid #ebebe6", borderRadius: 9 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#18181b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name || `Product ${p.product_id}`}</span>
              <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                <Metric value={p.passed ?? 0} label="passed" tone="ok" />
                <Metric value={p.failed ?? 0} label="failed" tone="bad" />
                <Metric value={p.total_vendors ?? 0} label="vendors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {evaluators.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <Users size={13} strokeWidth={2} style={{ color: "#a1a1aa" }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a1a1aa" }}>Evaluators</span>
          {evaluators.map((e) => (
            <span key={e.id} style={{ fontSize: 11.5, color: "#3f3f46", background: "#f7f7f5", border: "1px solid #ececec", borderRadius: 7, padding: "3px 9px" }}>{e.name}</span>
          ))}
        </div>
      )}

      <ApprovalChain instances={phase.approval_instances} title="Technical approval" />
    </StageCard>
  );
}
