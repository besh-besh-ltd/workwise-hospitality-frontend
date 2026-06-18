// Negotiation & Award stage — Phase 2: the real Quote Comparison workspace
// embedded in-page, locked to this RFQ. Lazy-loaded (only when this stage is
// opened) and rendered in `embedded` mode, which drops its Switch-RFQ control /
// full-bleed page chrome. The workspace keeps its own deep-links into the
// `/dashboard/buyer/negotiation` module (create round / review & approve) —
// the user wants the negotiation module reused, not reimplemented here.
import dynamic from "next/dynamic";
import { StageSkeleton } from "./StageShared";

const QuoteComparison = dynamic(
  () => import("@/components/dashboard/buyer/quoteComparison/QuoteComparison"),
  { ssr: false, loading: () => <StageSkeleton /> }
);

export default function NegotiationAwardStage({ rfq }) {
  if (!rfq?.id) return <StageSkeleton />;

  return (
    <div className="rfq-stage-embed">
      <QuoteComparison rfqId={String(rfq.id)} embedded />
    </div>
  );
}
