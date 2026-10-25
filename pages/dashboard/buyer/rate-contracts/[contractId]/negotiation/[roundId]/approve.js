// Routed approve page — review & approve/reject an ARC negotiation round.
// Thin wrapper: reads contractId + roundId from query, renders ArcApproveRoundPage
// (the RFQ negotiation approval page, fed from the ARC approval bundle). This is
// the URL the ARC approval notification links to.
// DashboardShell (sidebar + topbar) is provided by pages/_app.js.
import { useRouter } from "next/router";
import ArcApproveRoundPageView from "@/components/dashboard/rate-contracts/buyer/negotiation/ArcApproveRoundPage";

export default function ArcApproveRoundPage() {
  const router = useRouter();
  const { contractId, roundId } = router.query;

  if (!router.isReady || !contractId || !roundId) {
    return (
      <main className="main-body">
        <div className="empty-state">
          <p style={{ fontSize: 13, color: "var(--fg-3)" }}>Loading…</p>
        </div>
      </main>
    );
  }

  return <ArcApproveRoundPageView arcId={contractId} roundId={roundId} />;
}
