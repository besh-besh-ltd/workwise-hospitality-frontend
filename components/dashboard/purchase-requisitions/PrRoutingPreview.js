// Live "who will review and approve this" panel for the PR form.
// Purely presentational: the page owns the debounced request and passes
// `state` = { status: "idle" | "loading" | "ready" | "error", data, error }.

import { ERROR_COPY, formatINR } from "./prFormat";

const SKIP_COPY = {
  sod_self: () => "Skipped — you raised this PR",
  below_threshold: (s) => `Not required below ${formatINR(s.min_amount)}`,
};

/** Plain-language text for one preview problem. */
export function problemCopy(p) {
  const base = ERROR_COPY[p.code] || p.message || "This requisition can't be routed yet.";
  if (p.code === "PR_NO_REVIEWER" && p.department_title) return `${base} (${p.department_title})`;
  return base;
}

const names = (list) => (list || []).map((x) => x.name).filter(Boolean).join(", ");

export default function PrRoutingPreview({ state, onRetry }) {
  const { status, data } = state;
  const problems = data?.problems || [];

  return (
    <div className="workflow" data-testid="pr-routing-preview">
      <div className="wf-head">
        <div className="t">Review and approval</div>
        {status === "loading" && <span className="fs-12 text-fg-3">Checking…</span>}
      </div>

      {status === "idle" && (
        <div className="wf-step pending">
          <div className="wf-node"></div>
          <div className="body">
            <div className="nm">Add an item to see who will review and approve</div>
            <div className="meta">Pick a hotel and department, then add at least one priced item.</div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="wf-step pending" role="alert">
          <div className="wf-node"></div>
          <div className="body">
            <div className="nm">Couldn't work out who will approve this</div>
            <div className="meta">{state.error || "Try again in a moment."}</div>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      )}

      {status === "ready" && data && (
        <>
          {problems.length > 0 && (
            <div className="guide danger" role="alert" style={{ margin: 12 }}>
              <div>
                <strong>Fix before you can submit</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {problems.map((p, i) => (
                    <li key={`${p.code}-${i}`}>{problemCopy(p)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {(data.reviews || []).map((r) => (
            <div key={r.department_id} className="wf-step current">
              <div className="wf-node"></div>
              <div className="body">
                <div className="nm">Technical review · {r.department_title}</div>
                <div className="meta">
                  {r.line_nos?.length ? <span>{`Item${r.line_nos.length === 1 ? "" : "s"} ${r.line_nos.join(", ")} · `}</span> : null}
                  <span>{r.reviewers?.length ? names(r.reviewers) : "No reviewer found"}</span>
                </div>
              </div>
            </div>
          ))}

          {(data.approval?.steps || []).map((s) => {
            const skipped = s.applies === false;
            const note = skipped ? (SKIP_COPY[s.skipped_reason] || (() => "Not required"))(s) : null;
            return (
              <div key={s.step_order} className={`wf-step ${skipped ? "done" : "pending"}`}>
                <div className="wf-node"></div>
                <div className="body">
                  <div className="nm">{s.label || `Approval step ${s.step_order}`}</div>
                  <div className="meta">
                    <span>{skipped ? note : s.approvers?.length ? names(s.approvers) : "No approver found"}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {!data.reviews?.length && !data.approval?.steps?.length && problems.length === 0 && (
            <div className="wf-step pending">
              <div className="wf-node"></div>
              <div className="body"><div className="nm">No review or approval needed</div></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
