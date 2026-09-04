// Routed wizard page — create ARC negotiation round.
// Thin wrapper: reads contractId from query, renders ArcCreateRoundPanel.
// DashboardShell (sidebar + topbar) is provided by pages/_app.js.
import { useRouter } from "next/router";
import ArcCreateRoundPanel from "@/components/dashboard/rate-contracts/buyer/negotiation/ArcCreateRoundPanel";

export default function ArcCreateRoundPage() {
  const router = useRouter();
  const { contractId } = router.query;

  if (!router.isReady || !contractId) {
    return (
      <main className="main-body">
        <div className="empty-state">
          <p style={{ fontSize: 13, color: "var(--fg-3)" }}>Loading…</p>
        </div>
      </main>
    );
  }

  return <ArcCreateRoundPanel arcId={contractId} />;
}
