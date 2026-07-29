// Technical Evaluation stage — Phase 2: the real evaluation workspace embedded
// in-page, locked to this RFQ. The heavy evaluation component is lazy-loaded
// (only when this stage is opened) and rendered in `embedded` mode, which drops
// its RFQ-list sidebar / page chrome / RFQ hero so it sits cleanly under the
// lifecycle header. Renders "Skipped" when no technical evaluation applies.
import dynamic from "next/dynamic";
import { ClipboardCheck } from "lucide-react";
import { StageCard, StageSkeleton } from "./StageShared";

const BuyerTechnicalEvaluation = dynamic(
  () => import("@/components/dashboard/buyer/technical-evaluation"),
  { ssr: false, loading: () => <StageSkeleton /> }
);

export default function TechnicalStage({ rfq, stage }) {
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

  if (!rfq?.id) return <StageSkeleton />;

  return (
    <div className="rfq-stage-embed">
      <BuyerTechnicalEvaluation rfqId={String(rfq.id)} embedded />
    </div>
  );
}
