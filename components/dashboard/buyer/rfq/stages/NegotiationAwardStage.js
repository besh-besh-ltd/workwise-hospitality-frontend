// Negotiation & Award stage — Phase-1 summary panel over the interconnected
// commercial surfaces (quote comparison → negotiation rounds → finalize/award).
// In-page embedding of these surfaces is Phase 2; here we surface status + the
// deep-links into the existing working pages.
import Link from "next/link";

export default function NegotiationAwardStage({ rfq, stage }) {
  const phase = stage?.phase || {};
  return (
    <section className="section-card">
      <div className="section-head">
        <div className="h-left">
          <div><h2>Negotiation &amp; Award</h2><div className="h-sub">Compare quotes, run negotiation rounds, finalize and award.</div></div>
        </div>
      </div>
      <div className="section-body">
        {phase.summary
          ? <div className="guide"><div>{phase.summary}</div></div>
          : <div className="help-text">Commercial evaluation in progress.</div>}
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/dashboard/buyer/quote-comparison?rfq=${rfq?.id}`} className="btn btn-blue btn-sm">
            Open Quote Comparison
          </Link>
          <Link href={`/dashboard/buyer/negotiation/${rfq?.id}/create`} className="btn btn-secondary btn-sm">
            Start / manage negotiation
          </Link>
          <Link href={`/dashboard/buyer/negotiation/${rfq?.id}/approve`} className="btn btn-secondary btn-sm">
            Review &amp; finalize quotes
          </Link>
        </div>
      </div>
    </section>
  );
}
