import React from "react";
import moment from "moment";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import styles from "./ArcCommittee.module.scss";

// Compact INR formatter with the Indian crore/lakh convention. Falls
// back to the existing comma formatter for sub-lakh amounts so the
// rest of the page reads consistently.
const formatMoney = (amt) => {
  const n = Number(amt) || 0;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${addCommasToNumber(Math.round(n))}`;
};

const formatPeriod = (from, to) => {
  if (!from && !to) return null;
  const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
  return `${fmt(from)} → ${fmt(to)}`;
};

/**
 * Decision Brief — top card. Goal: a CXO can decide here without
 * scrolling. Header strip → recommendation banner → 4-up KPI strip.
 *
 * The banner verdict is auto-derived from the metrics: any product
 * pricing above its baseline OR a vendor with a prior PO rejection
 * downgrades to "Review carefully"; net-savings + clean history yields
 * "Approve". The component is purely presentational; the upstream
 * orchestrator computes the metrics + verdict and passes them in.
 */
const DecisionBrief = ({ rfq, metrics, recommendation, hotelCount }) => {
  if (!rfq) return null;

  const isGroupArc = (rfq.tender_scope || "").toUpperCase() === "GROUP";
  const periodLabel = formatPeriod(rfq.arc_period_from, rfq.arc_period_to);
  const totalCommitment = Number(metrics?.totalCommitment || 0);
  const savings = Number(metrics?.totalSaved || 0);
  const savingsPct = Number(metrics?.savingsPercent || 0);
  const productCount = Number(metrics?.productCount || 0);
  const vendorCount = Number(metrics?.vendorCount || 0);
  const riskFlagCount = Number(metrics?.riskFlagCount || 0);

  const deltaClass =
    savings > 0 ? styles.deltaPositive : savings < 0 ? styles.deltaNegative : styles.deltaNeutral;
  const deltaArrow = savings > 0 ? "↓" : savings < 0 ? "↑" : "·";

  const bannerVariantClass =
    recommendation?.verdict === "caution"
      ? styles.bannerCaution
      : recommendation?.verdict === "review"
      ? styles.bannerReview
      : styles.bannerApprove;
  const bannerTitle =
    recommendation?.verdict === "caution"
      ? "⚠ Caution required"
      : recommendation?.verdict === "review"
      ? "Review carefully"
      : "✓ Recommended: Approve";

  return (
    <section className={styles.card}>
      <div className={styles.cardBody}>
        <div className={styles.briefHeaderRow}>
          <div className={styles.briefMeta}>
            <span className={styles.briefKicker}>
              Tender #{rfq.rfq_no}
              <span className={`${styles.briefScope} ${isGroupArc ? "" : styles.briefScopeSingle}`}>
                {isGroupArc ? "Group ARC" : "Single ARC"}
              </span>
            </span>
            <h3 className={styles.briefTitle}>
              {rfq.title || rfq.company_name || "Tender"}
            </h3>
            <p className={styles.briefSub}>
              {rfq.company_name && <>{rfq.company_name} · </>}
              {hotelCount > 0 && (
                <>
                  {hotelCount} {hotelCount === 1 ? "hotel" : "hotels"} covered
                  {periodLabel && " · "}
                </>
              )}
              {periodLabel && <>ARC period {periodLabel}</>}
            </p>
          </div>
          <div className={styles.briefMoney}>
            <div className={styles.briefMoneyLabel}>Total commitment</div>
            <div className={styles.briefMoneyValue}>{formatMoney(totalCommitment)}</div>
            {savingsPct !== 0 && (
              <div className={`${styles.briefMoneyDelta} ${deltaClass}`}>
                {deltaArrow} {Math.abs(savingsPct).toFixed(1)}%
                {savings >= 0 ? " saved" : " above"} vs last purchase
              </div>
            )}
          </div>
        </div>

        {recommendation?.summary && (
          <div className={`${styles.banner} ${bannerVariantClass}`}>
            <div className={styles.bannerTitle}>{bannerTitle}</div>
            <div className={styles.bannerBody}>{recommendation.summary}</div>
          </div>
        )}

        <div className={styles.kpiGrid}>
          <div className={styles.kpiTile}>
            <div className={styles.kpiLabel}>Products</div>
            <div className={styles.kpiValue}>{productCount}</div>
          </div>
          <div className={styles.kpiTile}>
            <div className={styles.kpiLabel}>Vendors finalized</div>
            <div className={styles.kpiValue}>{vendorCount}</div>
          </div>
          <div
            className={`${styles.kpiTile} ${
              savings > 0 ? styles.kpiTileHi : savings < 0 ? styles.kpiTileBad : ""
            }`}
          >
            <div className={styles.kpiLabel}>
              {savings >= 0 ? "Savings" : "Above baseline"}
            </div>
            <div className={styles.kpiValue}>{formatMoney(Math.abs(savings))}</div>
            {savingsPct !== 0 && (
              <div className={styles.kpiSub}>
                {deltaArrow} {Math.abs(savingsPct).toFixed(1)}% vs last
              </div>
            )}
          </div>
          <div
            className={`${styles.kpiTile} ${
              riskFlagCount > 0 ? styles.kpiTileWarn : ""
            }`}
          >
            <div className={styles.kpiLabel}>Risk flags</div>
            <div className={styles.kpiValue}>{riskFlagCount}</div>
            {riskFlagCount > 0 && (
              <div className={styles.kpiSub}>see matrix below</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DecisionBrief;
