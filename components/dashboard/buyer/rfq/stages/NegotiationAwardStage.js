// Negotiation & Award stage — in-page surface over the interconnected
// commercial flow (quote comparison → negotiation rounds → finalize/award).
// Shows per-product award/finalization status + round count + the quote
// approval chain, with deep-links into the working pages. Full in-page editing
// of those surfaces is Phase 2.
import Link from "next/link";
import { BarChart2, CheckCircle2, Circle } from "lucide-react";
import { StageCard, ApprovalChain } from "./StageShared";

const fmtMoney = (n) => (n == null ? null : `₹${Number(n).toLocaleString("en-IN")}`);

export default function NegotiationAwardStage({ rfq, stage }) {
  const phase = stage?.phase || {};
  const products = Array.isArray(phase.products) ? phase.products : [];

  return (
    <StageCard icon={<BarChart2 size={15} strokeWidth={2} />} title="Negotiation &amp; Award">
      {phase.summary
        ? <div className="guide"><div>{phase.summary}</div></div>
        : <div className="help-text">Commercial evaluation in progress.</div>}

      {products.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {products.map((p) => {
            const fin = p.finalization || null;
            const rounds = Array.isArray(p.negotiation_rounds) ? p.negotiation_rounds.length : 0;
            const price = fin ? fmtMoney(fin.total_price ?? fin.finalized_price) : null;
            return (
              <div key={p.product_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 14px", border: "1px solid #ebebe6", borderRadius: 9 }}>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#18181b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name || `Product ${p.product_id}`}</span>
                  <span style={{ fontSize: 11, color: "#a1a1aa" }}>
                    {rounds > 0 ? `${rounds} negotiation round${rounds === 1 ? "" : "s"}` : "No negotiation rounds"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {fin ? (
                    <>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#15803d", fontWeight: 600 }}>
                        <CheckCircle2 size={14} strokeWidth={2.2} />
                        {fin.vendor_company || fin.vendor_name || "Awarded"}
                      </span>
                      {price && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#18181b" }}>{price}</span>}
                    </>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#a1a1aa" }}>
                      <Circle size={13} strokeWidth={2} />
                      Not finalized
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ApprovalChain instances={phase.approval_instances} title="Quote approval" />

      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
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
    </StageCard>
  );
}
