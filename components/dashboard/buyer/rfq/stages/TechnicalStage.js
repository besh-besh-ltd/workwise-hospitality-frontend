// Technical Evaluation stage — Phase-1 summary panel. Renders "Skipped" when no
// technical evaluation is configured; otherwise the phase status + a deep-link
// to the full evaluation workspace (in-page embed is Phase 2).
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { StageCard } from "./StageShared";

export default function TechnicalStage({ rfq, stage }) {
  const phase = stage?.phase || {};

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
    <StageCard icon={<ClipboardCheck size={15} strokeWidth={2} />} title="Technical evaluation">
      {phase.summary
        ? <div className="guide"><div>{phase.summary}</div></div>
        : <div className="help-text">Technical evaluation is in progress.</div>}
      <div style={{ marginTop: 16 }}>
        <Link href={`/dashboard/buyer/technical-evaluation?rfq_id=${rfq?.id}`} className="btn btn-blue btn-sm">
          Open Technical Evaluation
        </Link>
      </div>
    </StageCard>
  );
}
