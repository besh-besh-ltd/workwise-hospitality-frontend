import React, { useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import styles from "./QuoteCompareTables.module.scss";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => `Rs. ${addCommasToNumber(Math.round(toNumber(value)))}`;

// Peer-comparison narrative: how this quote stacks up against averages and the
// lowest priced quote (display-only — no money math, just simple ratios on
// already-engine-computed totals).
const getVsPeers = (current, peers = []) => {
  const valid = peers.filter((value) => toNumber(value) > 0).map((value) => toNumber(value));
  if (!valid.length || toNumber(current) <= 0) {
    return {
      avgText: "Not enough quotes to compare yet",
      bestText: "Add more vendor quotes for a comparison",
      tone: "neutral",
    };
  }

  const avg = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const best = Math.min(...valid);
  const currentVal = toNumber(current);

  const avgDiff = avg > 0 ? ((avg - currentVal) / avg) * 100 : 0;
  const bestDiff = best > 0 ? ((best - currentVal) / best) * 100 : 0;

  let tone = "neutral";
  if (avgDiff > 0) tone = "positive";
  if (avgDiff < 0) tone = "negative";

  const avgText =
    avgDiff > 0
      ? `${Math.round(avgDiff)}% lower than average quote`
      : avgDiff < 0
      ? `${Math.round(Math.abs(avgDiff))}% higher than average quote`
      : "Same as average quote";

  const bestText =
    bestDiff >= 0
      ? "This is the lowest quote in this comparison"
      : `${Math.round(Math.abs(bestDiff))}% higher than the lowest quote`;

  return { avgText, bestText, tone };
};

const BreakupInsightModal = ({
  show = false,
  onHide,
  title = "Cost Breakup",
  vendorName = "",
  quantity = 0,
  total = 0,
  details = {},
  peerTotals = [],
}) => {
  const qty = toNumber(quantity || details.quantity || 0);
  const unitPrice = toNumber(details.unit_price);
  const engine = details.engine || {};
  const subtotal = toNumber(engine.base) || unitPrice * qty;
  const baseTax = toNumber(engine.base_tax);
  const peerSignal = useMemo(() => getVsPeers(total, peerTotals), [total, peerTotals]);

  // Build dynamic rows from the engine's per-charge breakdown. Vendor-defined
  // charge names (Freight, Packaging, Insurance, Setup, anything) appear in
  // the same shape, with their amount + tax already included in `subtotal`.
  // The sum of these rows + Base + Base GST exactly reconciles to Total.
  const chargeRows = (engine.charges || [])
    .filter((c) => toNumber(c.subtotal) > 0)
    .map((charge) => ({
      label: charge.name || "Other Charge",
      value: formatCurrency(charge.subtotal),
    }));

  const rows = [
    { label: "Base Price", value: formatCurrency(unitPrice) },
    { label: "Quantity", value: qty || "--" },
    { label: "Subtotal", value: formatCurrency(subtotal) },
    ...chargeRows,
    { label: "GST (on base)", value: formatCurrency(baseTax) },
    { label: "Delivery", value: details.delivery_period ? `${details.delivery_period} day(s)` : "--", highlight: true },
    { label: "Total", value: formatCurrency(total), highlight: true },
  ];

  return (
    <Modal show={show} onHide={onHide} centered className={styles.breakupModal} size="lg">
      <Modal.Header className={styles.breakupModalHeader}>
        <Modal.Title className={styles.breakupModalTitleWrap}>
          <span className={styles.breakupModalBadge}>Cost Intelligence</span>
          <div className={styles.breakupModalTitle}>{title}</div>
          <div className={styles.breakupModalSub}>
            {vendorName || "Vendor Quote"}
          </div>
        </Modal.Title>
        <button
          type="button"
          className={styles.breakupModalCloseBtn}
          onClick={onHide}
          aria-label="Close"
        >
          ✕
        </button>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.breakupInsightStrip}>
          <div className={`${styles.breakupInsightCard} ${styles[`breakupInsight_${peerSignal.tone}`]}`}>
            <p className={styles.breakupInsightLabel}>How This Quote Compares</p>
            <p className={styles.breakupInsightText}>{peerSignal.avgText}</p>
            <p className={styles.breakupInsightMeta}>{peerSignal.bestText}</p>
          </div>
        </div>

        <div className={styles.breakupGrid}>
          {rows.map((row) => (
            <div key={row.label} className={`${styles.breakupRow} ${row.highlight ? styles.breakupRowHighlight : ""}`}>
              <span className={styles.breakupRowLabel}>{row.label}</span>
              <span className={styles.breakupRowValue}>{row.value}</span>
            </div>
          ))}
        </div>

        {details.comment ? (
          <div className={`${styles.breakupComment} ${styles.breakupRowHighlight}`}>
            <p className={styles.breakupCommentLabel}>Vendor Comment</p>
            <p className={styles.breakupCommentText}>{details.comment}</p>
          </div>
        ) : null}

        {details.global_payment_term ? (
          <div className={styles.breakupComment}>
            <p className={styles.breakupCommentLabel}>Payment Terms</p>
            <p className={styles.breakupCommentText}>
              {Array.isArray(details.global_payment_term)
                ? (details.global_payment_term[0]?.details || "--")
                : details.global_payment_term}
            </p>
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

export default BreakupInsightModal;
