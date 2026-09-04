import React, { useMemo } from "react";
import Modal from "react-bootstrap/Modal";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import styles from "./QuoteCompareTables.module.scss";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => `Rs. ${addCommasToNumber(toNumber(value))}`;

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

const hasExplicitTax = (rawCharge) =>
  rawCharge?.tax !== null &&
  rawCharge?.tax !== undefined &&
  rawCharge?.tax !== "";

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
  const lineSubtotal = toNumber(engine.total) || toNumber(total);
  const basePrice = toNumber(engine.base) || unitPrice * qty;
  const baseTax = toNumber(engine.base_tax);
  const baseTaxRate = toNumber(details.tax);
  const baseTaxMode = details.tax_mode || "percentage";

  // Other-charges rows: marry the engine's resolved amount/tax/subtotal with
  // the raw vendor input (tbl_quote_items.other_charges JSONB) so we can
  // surface comments + the "tax: as base" affordance for charges that didn't
  // declare an explicit tax. Match raw rows by name (engine output preserves
  // the user-typed name 1:1).
  const rawOtherByName = new Map(
    (Array.isArray(details.other_charges) ? details.other_charges : []).map((c) => [c?.name || "", c])
  );
  const otherChargeRows = (engine.charges || [])
    .filter((c) => toNumber(c.subtotal) > 0)
    .map((charge) => {
      const raw = rawOtherByName.get(charge.name || "") || {};
      const amountVal = toNumber(charge.amount);
      const chargeTaxVal = toNumber(charge.tax);
      const amountText = raw.amount_mode === "percentage"
        ? `${toNumber(raw.amount)}%`
        : formatCurrency(amountVal);
      let taxText = "";
      if (hasExplicitTax(raw)) {
        if (chargeTaxVal > 0) {
          const taxUnit = raw.tax_mode === "percentage"
            ? `${toNumber(raw.tax)}%`
            : formatCurrency(chargeTaxVal);
          taxText = ` + ${taxUnit} tax`;
        }
      } else if (amountVal > 0 && baseTaxMode === "percentage" && baseTaxRate > 0) {
        // Tax was left blank — engine inherited the base GST rate.
        taxText = ` + ${baseTaxRate}% tax (apply base)`;
      }
      const detail = `${amountText}${taxText}`;
      return {
        label: charge.name || "Other Charge",
        value: formatCurrency(charge.subtotal),
        subText: raw.comment ? `${detail} · ${raw.comment}` : detail,
      };
    });

  // Global charges (e.g. TCS) sit at the quote level. Raw shape carries the
  // comment + tax/tax_mode; the engine has already resolved a fixed amount in
  // engine_global_charges, indexed by name. Use raw for display, engine for
  // the resolved currency value (so the math reconciles to engine_grand_total).
  const rawGlobalCharges = Array.isArray(details.global_charges) ? details.global_charges : [];
  const resolvedGlobalByName = new Map(
    (Array.isArray(details.engine_global_charges) ? details.engine_global_charges : [])
      .map((c) => [c?.name || "", c])
  );
  const globalChargeRows = rawGlobalCharges
    .filter((c) => toNumber(c.tax) > 0 || toNumber(resolvedGlobalByName.get(c?.name || "")?.amount) > 0)
    .map((charge) => {
      const resolved = resolvedGlobalByName.get(charge?.name || "");
      const taxVal = toNumber(charge.tax);
      const taxUnit = charge.tax_mode === "percentage" ? `${taxVal}%` : formatCurrency(taxVal);
      const extraTaxVal = toNumber(charge.additional_tax);
      const extraTaxUnit = extraTaxVal > 0
        ? (charge.additional_tax_mode === "percentage" ? `${extraTaxVal}%` : formatCurrency(extraTaxVal))
        : "";
      const taxLabel = extraTaxUnit ? `${taxUnit} + ${extraTaxUnit} tax` : taxUnit;
      const subText = charge.comment ? `${taxLabel} · ${charge.comment}` : taxLabel;
      const chargeBase = charge.tax_mode === "percentage" ? (lineSubtotal * taxVal) / 100 : taxVal;
      const extraTaxAmt = extraTaxVal > 0
        ? (charge.additional_tax_mode === "percentage" ? (chargeBase * extraTaxVal) / 100 : extraTaxVal)
        : 0;
      const resolvedAmount = resolved
        ? toNumber(resolved.amount)
        : (chargeBase + extraTaxAmt);
      return {
        label: charge.name || "Global Charge",
        value: formatCurrency(resolvedAmount),
        subText,
      };
    });

  const globalChargesTotal = toNumber(details.engine_global_charges_total)
    || globalChargeRows.reduce((sum, r) => {
      const num = Number(String(r.value).replace(/[^0-9.-]/g, ""));
      return sum + (Number.isFinite(num) ? num : 0);
    }, 0);
  const grandTotal = toNumber(details.engine_grand_total) || (lineSubtotal + globalChargesTotal);

  const peerSignal = useMemo(() => getVsPeers(grandTotal || total, peerTotals), [grandTotal, total, peerTotals]);

  const rows = [
    { label: "Base Price", value: formatCurrency(unitPrice) },
    { label: "Quantity", value: qty || "--" },
    { label: "Base Total", value: formatCurrency(basePrice) },
    { label: "GST (on base)", value: formatCurrency(baseTax) },
    ...(otherChargeRows.length ? [{ section: "Other Charges" }, ...otherChargeRows] : []),
    { label: "Subtotal", value: formatCurrency(lineSubtotal), highlight: true },
    ...(globalChargeRows.length ? [{ section: "Global Charges" }, ...globalChargeRows] : []),
    { label: "Grand Total", value: formatCurrency(grandTotal), highlight: true },
    { label: "Delivery", value: details.delivery_period ? `${details.delivery_period} day(s)` : "--" },
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
          {rows.map((row, idx) => {
            if (row.section) {
              return (
                <div key={`section_${idx}`} className={styles.breakupSectionLabel}>
                  {row.section}
                </div>
              );
            }
            return (
              <div
                key={`${row.label}_${idx}`}
                className={`${styles.breakupRow} ${row.highlight ? styles.breakupRowHighlight : ""}`}
              >
                <span className={styles.breakupRowLabel}>
                  {row.label}
                  {row.subText ? (
                    <small style={{ display: "block", fontWeight: 500, color: "#6d829a", marginTop: 2 }}>
                      {row.subText}
                    </small>
                  ) : null}
                </span>
                <span className={styles.breakupRowValue}>{row.value}</span>
              </div>
            );
          })}
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
