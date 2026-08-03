// Approval state, on the arc_v2 `.workflow` / `.wf-step` rail.
//
// A round only reaches vendors after its NEGOTIATION approval instance clears,
// so "what is this waiting on" is one of the questions this page has to answer
// without a second click.

import { formatDateTime } from "./roundDetailModel";

function stepClass(status) {
  const s = String(status || "").toLowerCase();
  if (/reject/.test(s)) return "rejected";
  if (/approved|complete|done/.test(s)) return "done";
  if (/pending|progress|awaiting|current/.test(s)) return "current";
  return "";
}

// Human label for a step's raw status — SKIPPED/REMOVED must never render as
// their literal uppercase column value (nor be mistaken for "waiting"/current).
function stepStatusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "SKIPPED") return "Skipped";
  if (s === "REMOVED") return "Removed";
  if (/REJECT/.test(s)) return "Rejected";
  if (/APPROVED|COMPLETE|DONE/.test(s)) return "Approved";
  if (/PENDING|PROGRESS|AWAITING|CURRENT/.test(s)) return "Pending";
  return status || "—";
}

export default function ApprovalPanel({ approval }) {
  if (!approval) {
    return (
      <div className="section-body">
        <p className="help-text" style={{ margin: 0 }} data-testid="approval-none">
          No approval workflow is attached to this round.
        </p>
      </div>
    );
  }

  const summary = approval.isRejected
    ? "Rejected"
    : approval.isApproved
    ? "Approved"
    : approval.isPending
    ? "Pending"
    : approval.status || "Unknown";

  return (
    <div data-testid="approval-panel">
      <div className="section-body tight" style={{ borderBottom: approval.steps.length ? "1px solid var(--border)" : "none" }}>
        <div className="kv-grid">
          <span className="k">State</span>
          <span className="v">
            <span
              className={`status-pill ${
                approval.isRejected ? "danger" : approval.isApproved ? "active" : "committee"
              }`}
            >
              <span className="dot" />
              {summary}
            </span>
          </span>
          {approval.pendingWith && (
            <>
              <span className="k">Pending with</span>
              <span className="v">{approval.pendingWith}</span>
            </>
          )}
          {approval.level != null && (
            <>
              <span className="k">Level</span>
              <span className="v mono">
                {approval.level}
                {approval.totalLevels != null ? ` of ${approval.totalLevels}` : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {approval.steps.length > 0 && (
        <div className="workflow" style={{ border: "none", borderRadius: 0 }}>
          {approval.steps.map((s) => (
            <div key={s.key} className={`wf-step ${stepClass(s.status)}`}>
              <span className="wf-node" />
              <div className="body">
                <div className="nm">{s.label}</div>
                <div className="meta">
                  {stepStatusLabel(s.status)}
                  {s.actedAt ? ` · ${formatDateTime(s.actedAt)}` : ""}
                </div>
                {s.remarks && <div className="comment">{s.remarks}</div>}
              </div>
              <div className="right-stat">{stepClass(s.status) || ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
