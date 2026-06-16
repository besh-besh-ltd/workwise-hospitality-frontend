// Technical Evaluation stage — Phase-1 summary panel. Renders "Skipped" when no
// technical evaluation is configured; otherwise the phase status + a deep-link
// to the full evaluation workspace (in-page embed is Phase 2).
import Link from "next/link";

export default function TechnicalStage({ rfq, stage }) {
  const phase = stage?.phase || {};

  if (stage?.state === "skipped") {
    return (
      <div className="empty-state" style={{ padding: "44px 24px" }}>
        <div className="ic">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 6 11 12 5 18" /><polyline points="13 6 19 12 13 18" /></svg>
        </div>
        <h2>Technical evaluation skipped</h2>
        <p>No technical evaluation was configured for this RFQ — vendors proceed straight to commercial evaluation.</p>
      </div>
    );
  }

  return (
    <section className="section-card">
      <div className="section-head">
        <div className="h-left">
          <div><h2>Technical evaluation</h2><div className="h-sub">Clause scoring + qualification for this RFQ.</div></div>
        </div>
      </div>
      <div className="section-body">
        {phase.summary
          ? <div className="guide"><div>{phase.summary}</div></div>
          : <div className="help-text">Technical evaluation is in progress.</div>}
        <div style={{ marginTop: 16 }}>
          <Link href={`/dashboard/buyer/technical-evaluation?rfq_id=${rfq?.id}`} className="btn btn-blue btn-sm">
            Open Technical Evaluation
          </Link>
        </div>
      </div>
    </section>
  );
}
