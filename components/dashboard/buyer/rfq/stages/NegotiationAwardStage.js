// Negotiation & Award stage. A subtle in-page negotiation summary (rounds +
// finalization per product, from the lifecycle phase data) sits above the real
// Quote Comparison workspace — so the negotiation status is visible here without
// having to leave for the Negotiations page. The workspace itself is the
// embedded QuoteComparison (lazy-loaded, `embedded` mode), which keeps its own
// deep-links into the /dashboard/buyer/negotiation module.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { Handshake, CheckCircle2, Circle } from "lucide-react";
import { StageSkeleton, StageCard } from "./StageShared";

const QuoteComparison = dynamic(
  () => import("@/components/dashboard/buyer/quoteComparison/QuoteComparison"),
  { ssr: false, loading: () => <StageSkeleton /> }
);

const fmtMoney = (n) => (n == null ? null : `₹${Number(n).toLocaleString("en-IN")}`);
const prettyStatus = (s) => String(s || "").replace(/_/g, " ").toLowerCase();

function NegotiationSummary({ rfqId, products }) {
  const router = useRouter();
  const createHref = `/dashboard/buyer/negotiation/${rfqId}/create?returnTo=${encodeURIComponent(router.asPath)}`;
  return (
    <StageCard
      collapsible
      icon={<Handshake size={15} strokeWidth={2} />}
      title="Negotiation status"
      right={<Link href={createHref} className="btn btn-secondary btn-sm">View/Create Rounds</Link>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((p) => {
          const fin = p.finalization || null;
          const rounds = Array.isArray(p.negotiation_rounds) ? p.negotiation_rounds : [];
          const latest = rounds.length ? rounds[rounds.length - 1] : null;
          const quoted = latest && Array.isArray(latest.vendors) ? latest.vendors.length : 0;
          const price = fin ? fmtMoney(fin.total_price ?? fin.finalized_price) : null;
          return (
            <div key={p.product_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 14px", border: "1px solid #ebebe6", borderRadius: 9 }}>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#18181b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_name || `Product ${p.product_id}`}</span>
                <span style={{ fontSize: 11.5, color: "#a1a1aa" }}>
                  {latest
                    ? <>Round {latest.round_number} · {prettyStatus(latest.status)}{latest.target_price ? ` · target ${fmtMoney(latest.target_price)}` : ""} · {quoted} quoted</>
                    : "No negotiation rounds yet"}
                </span>
              </div>
              <div style={{ flexShrink: 0 }}>
                {fin ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle2 size={14} strokeWidth={2.2} style={{ color: "#15803d" }} />
                    <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>{fin.vendor_company || fin.vendor_name || "Awarded"}</span>
                    {price && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#18181b" }}>{price}</span>}
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#a1a1aa" }}>
                    <Circle size={13} strokeWidth={2} /> Not finalized
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </StageCard>
  );
}

// `focusAwardToken` is a pass-through from ViewRFQ's award banner: a counter
// that the embedded sheet turns into "scroll to the first product × vendor cell
// where this user's approval is pending, and mark it". 0 = never asked.
export default function NegotiationAwardStage({ rfq, stage, focusAwardToken = 0 }) {
  if (!rfq?.id) return <StageSkeleton />;
  const phase = stage?.phase || {};
  const products = Array.isArray(phase.products) ? phase.products : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {products.length > 0 && <NegotiationSummary rfqId={rfq.id} products={products} />}
      <div className="rfq-stage-embed">
        <QuoteComparison rfqId={String(rfq.id)} embedded focusAwardToken={focusAwardToken} />
      </div>
    </div>
  );
}
