// Negotiation & Award stage. The workspace is the embedded Quote Comparison
// (lazy-loaded, `embedded` mode), which keeps its own deep-links into the
// /dashboard/buyer/negotiation module.
//
// A separate "Negotiation status" summary used to sit above the table, drawn
// from the lifecycle phase data. It was removed: it read from a DIFFERENT
// endpoint than the table below it, so users had to reconcile two disconnected
// surfaces to answer "what is happening with this product". Round state, round
// position, reply counts and the buyer's asks now render on the product rows
// themselves — see quoteComparison/NegotiationRowCells.js.
import dynamic from "next/dynamic";
import { StageSkeleton } from "./StageShared";

const QuoteComparison = dynamic(
  () => import("@/components/dashboard/buyer/quoteComparison/QuoteComparison"),
  { ssr: false, loading: () => <StageSkeleton /> }
);

// `focusAwardToken` is a pass-through from ViewRFQ's award banner: a counter
// that the embedded sheet turns into "scroll to the first product × vendor cell
// where this user's approval is pending, and mark it". 0 = never asked.
export default function NegotiationAwardStage({ rfq, stage, focusAwardToken = 0 }) {
  if (!rfq?.id) return <StageSkeleton />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="rfq-stage-embed">
        <QuoteComparison rfqId={String(rfq.id)} embedded focusAwardToken={focusAwardToken} />
      </div>
    </div>
  );
}
