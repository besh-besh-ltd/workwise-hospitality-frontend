/* ═══════════════════════════════════════════════════════════
   Negotiation rendering for the Quote Comparison table.

   Split out of QuoteComparison.js (3,115 lines) rather than growing it.

   This replaces the separate "Negotiation status" panel that used to sit above
   the table, fed by a DIFFERENT endpoint (GET /rfq/:id/lifecycle) than the
   table itself — so a buyer had to read two disconnected surfaces to answer
   "what is happening with this product".

   State labels come from the negotiation module's own presentation table. That
   file's header states the labels are sentence case and must not be
   Title-Cased back; this codebase already carries five disagreeing field-label
   maps, so we add none.
   ═══════════════════════════════════════════════════════════ */
import { Globe, Handshake } from "lucide-react";
import { negStatePresentation } from "@/components/dashboard/buyer/negotiation/round-detail/negotiationStates";
import styles from "./QuoteComparison.module.scss";

// The three states a buyer should read as "still moving". Everything else is
// over: concluded, no_vendor_response, lapsed, cancelled.
const LIVE_STATES = new Set(["awaiting_approval", "open_with_vendors", "ready_for_decision"]);

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/**
 * One buyer ask, as text. Handles all four production shapes:
 *   { name, target }                          text ask (payment terms)
 *   { name, target, mode }                    numeric ask, ₹ or %
 *   { name, target: [], demand }              documents — no target at all
 *   { name, target } where target won't parse demoted to text, never guessed
 */
export const askText = (a) => {
  if (!a) return "";
  if (a.demand) return `${a.label}: ${a.demand}`;
  if (a.is_text || a.target == null || a.target === "" ||
      (Array.isArray(a.target) && a.target.length === 0)) {
    return a.target && !Array.isArray(a.target) ? `${a.label}: ${a.target}` : a.label;
  }
  const n = Number(a.target);
  if (!Number.isFinite(n)) return `${a.label}: ${a.target}`;
  return a.mode === "percentage" ? `${a.label} ${n}%` : `${a.label} ${inr(n)}`;
};

/** Negotiation state for one product row. Null when no round covers it. */
export function ProductNegotiation({ product }) {
  const n = product?.negotiation;
  if (!n) return null;

  const meta = negStatePresentation(n.state);
  const live = LIVE_STATES.has(n.state);

  return (
    <div className={styles.negBlock}>
      <div
        className={`${styles.negState} ${live ? styles.isLive : ""}`}
        data-testid="neg-state"
        title={meta?.description || undefined}
      >
        <span className={styles.negDot} />
        <span>{meta?.label || n.state}</span>
        {n.round_position != null && <span className={styles.rBadge}>R{n.round_position}</span>}
        {/* Only render a ratio when the denominator is real. 71 legacy rounds
            (Mar–Apr 2026) have a NULL vendor_ids array and empty
            vendor_approvals, so invited resolves to 0 while responses exist —
            which rendered the literal nonsense "1 of 0 replied" on 23 product
            rows. Show the bare count of replies instead. */}
        {n.invited_count > 0 ? (
          <span className={styles.negCount}>
            {n.responded_count} of {n.invited_count} replied
          </span>
        ) : n.responded_count > 0 ? (
          <span className={styles.negCount}>
            {n.responded_count} {n.responded_count === 1 ? "reply" : "replies"}
          </span>
        ) : null}
      </div>

      {n.asks?.length > 0 && (
        <div className={styles.askRow}>
          {n.asks.map((a) => (
            <span key={a.field} className={styles.askChip} data-testid={`ask-${a.field}`}>
              {askText(a)}
            </span>
          ))}
        </div>
      )}

      {/* Repeated on every product row by design — an RFQ-level round targets
          payment terms / documents / global charges across the whole RFQ, so
          there is no single product row that owns it. Dashed outline + globe
          so it never reads as a product-specific ask.

          Grouped into one wrapping row (not siblings of the column-direction
          .negBlock) so short asks share a line. A round with five RFQ-level
          targets used to spend five lines of the narrow product column. */}
      {n.rfq_level_asks?.length > 0 && (
        <div className={styles.askRow}>
          {n.rfq_level_asks.map((a) => (
            <div key={a.field} className={styles.rfqWideAsk} data-testid="rfq-wide-ask">
              <Globe size={10} strokeWidth={2.2} />
              <span>RFQ-wide: {askText(a)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** One vendor's position in the current round. Null when no round covers it. */
export function VendorNegotiation({ product, vendorId }) {
  const n = product?.quotes?.[String(vendorId)]?.negotiation;
  if (!n) return null;

  return (
    <div className={styles.vendorRoundTag} data-testid={`vendor-neg-${vendorId}`}>
      <Handshake size={10} strokeWidth={2.2} />
      {n.responded ? <span>replied</span> : <span>awaiting reply</span>}
      {/* Show what they were asked only while they have not answered — once a
          reply is in, the price above IS the answer. Note quoted_price is a
          LINE TOTAL (amount_basis) while a base_price target is per UNIT, so
          the two are deliberately never shown as a subtraction. */}
      {!n.responded && n.asks?.length > 0 && (
        <span className={styles.askInline}>· asked {askText(n.asks[0])}</span>
      )}
    </div>
  );
}

export default { ProductNegotiation, VendorNegotiation, askText };
