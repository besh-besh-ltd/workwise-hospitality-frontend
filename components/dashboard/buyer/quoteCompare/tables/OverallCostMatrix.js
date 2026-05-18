import React, { useEffect, useMemo, useState } from "react";
import FullLoader from "@/components/shared/FullLoader";
import ReadMore from "@/components/shared/ReadMore";
import { downloadQuotesDetails } from "@/services/rfq";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import {
  buildOverallCostModel,
  getQuoteDetails,
  getSpecValue,
} from "@/utils/quoteCompareTableViewModel";
import ComparisonMatrixShell from "./ComparisonMatrixShell";
import BreakupInsightModal from "./BreakupInsightModal";
import MissingCostIndicator from "./MissingCostIndicator";
import EmptyValue from "./EmptyValue";
import styles from "./QuoteCompareTables.module.scss";

const formatCurrency = (value) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `Rs. ${addCommasToNumber(safe)}`;
};

const getHeatClass = (row, vendorId) => {
  const band = row?.rowComparativeStats?.total?.bands?.[vendorId];
  if (band === "best") return styles.heatBest;
  if (band === "competitive") return styles.heatCompetitive;
  if (band === "high") return styles.heatHigh;
  return "";
};

const OverallCostMatrix = ({
  rfq_id,
  freightFilter,
  normalizeFilter,
  rfq_product_id,
  source,
  metrics = {},
}) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [originalProducts, setOriginalProducts] = useState([]);
  const [breakupModal, setBreakupModal] = useState({
    show: false,
    title: "",
    vendorName: "",
    details: {},
    quantity: 0,
    total: 0,
    peerTotals: [],
  });

  useEffect(() => {
    setLoading(true);
    downloadQuotesDetails(rfq_id, "TA", freightFilter, rfq_product_id, source)
      .then((res) => {
        setProducts(res.data || []);
        setOriginalProducts(res.data || []);
      })
      .catch(() => {
        setProducts([]);
        setOriginalProducts([]);
      })
      .finally(() => setLoading(false));
  }, [rfq_id, freightFilter, rfq_product_id, source]);

  const model = useMemo(
    () => buildOverallCostModel(products, originalProducts, normalizeFilter, freightFilter),
    [products, originalProducts, normalizeFilter, freightFilter]
  );
  const isSingleRank = model.maxRanks <= 1;
  const hasRankColumns = model.maxRanks > 0;

  const baselineDelta = Math.round(((Number(metrics?.baselineTotal || 0) - Number(model.l1Total || 0))) * 100) / 100;

  const openBreakupModal = (payload) => {
    setBreakupModal({ show: true, ...payload });
  };

  const closeBreakupModal = () => {
    setBreakupModal((prev) => ({ ...prev, show: false }));
  };

  if (loading) return <FullLoader />;
  if (!model.rows.length) return <h4 className="mt-4 text-center">No Quotes Yet!</h4>;

  return (
    <ComparisonMatrixShell borderless>
      <div className={`${styles.matrixScroller} ${isSingleRank ? styles.matrixScrollerNoScroll : ""}`}>
        <table
          className={`${styles.matrixTable} ${isSingleRank ? styles.singleVendorTable : ""} ${
            !hasRankColumns ? styles.overallNoRankTable : ""
          }`}
        >
          <thead>
            <tr>
              <th
                className={`${styles.metricHead} ${styles.srHead} ${
                  !hasRankColumns ? styles.srNoRankColumn : ""
                } ${styles.headerSticky} ${styles.headerCenter}`}
              >
                Sr
              </th>
              <th
                className={`${styles.metricHead} ${styles.productPrimaryHead} ${
                  !hasRankColumns ? styles.productPrimaryHeadNoRank : ""
                } ${styles.headerSticky} ${styles.stickyLeft} ${styles.cornerCell} ${styles.headerCenter}`}
              >
                Product
              </th>

              {Array.from({ length: model.maxRanks }).map((_, rank) => (
                <th key={`rank_head_${rank}`} className={`${styles.vendorHead} ${styles.headerSticky} ${styles.headerCenter}`}>
                  <div className={styles.rankChip}>L{rank + 1}</div>
                  <div className={styles.vendorName}>Ranked Vendor</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {model.rows.map((row, rowIndex) => {
              const rowPeerTotals = row.rankedQuotes.map((entry) => entry.total).filter((value) => Number(value) > 0);

              return (
                <tr key={`${row.product.product_variant_id}_${row.product.variant}_${rowIndex}`}>
                  <td
                    className={`${styles.textCenter} ${styles.srCell} ${
                      !hasRankColumns ? styles.srNoRankColumn : ""
                    }`}
                  >
                    {rowIndex + 1}
                  </td>

                  <td
                    className={`${styles.stickyLeft} ${styles.productPrimaryCell} ${
                      !hasRankColumns ? styles.productPrimaryCellNoRank : ""
                    }`}
                  >
                    <div className={styles.productNamePrimary}>{row.productName}</div>
                    <div className={styles.valueSub}>
                      <span className={styles.productMetaPill}>Qty: {row.quantity || "--"} {row.unit || ""}</span>
                      <span className={styles.productMetaPill}>Size: {row.size || "--"}</span>
                    </div>
                    <div className={styles.valueSub}>
                      <strong>Spec:</strong>{" "}
                      {row.spec ? (
                        <div className={styles.innerScroll}>
                          <ReadMore content={row.spec} maxLines={3} />
                        </div>
                      ) : (
                        "--"
                      )}
                    </div>
                    {getSpecValue(row.product, "total_price") ? (
                      <div className={styles.valueSub}>
                        Selling: {formatCurrency(getSpecValue(row.product, "total_price"))}
                      </div>
                    ) : null}
                  </td>

                  {Array.from({ length: model.maxRanks }).map((_, rank) => {
                    const quote = row.rankedQuotes[rank];
                    const cellKey = `${rowIndex}_${rank}_${quote?.vendorId || "empty"}`;

                    if (!quote) {
                      return (
                        <td key={cellKey} className={styles.textCenter}>
                          <EmptyValue />
                        </td>
                      );
                    }

                    const details = getQuoteDetails(quote.quote) || {};
                    const heatClass = getHeatClass(row, quote.vendorId);

                    const cellClasses = [heatClass];
                    if (quote.isFinalized) cellClasses.push(styles.finalizedCell);
                    if (quote.isLowest) cellClasses.push(styles.lowestCell);
                    if (quote.missingParts.length > 0) cellClasses.push(styles.riskCell);

                    return (
                      <td
                        key={cellKey}
                        className={`${cellClasses.join(" ").trim()} ${styles.textCenter}`}
                        onClick={() =>
                          openBreakupModal({
                            title: "Ranked Quote Breakup",
                            vendorName: quote.vendorName,
                            details,
                            quantity: row.quantity,
                            total: quote.total,
                            peerTotals: rowPeerTotals,
                          })
                        }
                        style={{ cursor: "pointer" }}
                        title="Click to view breakup"
                      >
                        <div className={styles.value}>{formatCurrency(quote.total)}</div>
                        <div className={styles.valueSub}>{quote.vendorName}</div>

                        <MissingCostIndicator parts={quote.missingParts} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className={styles.totalBandStrong}>
              <th colSpan={2} className={`${styles.footerBandLabel} ${styles.textCenter}`}>
                Total by Rank
              </th>
              {model.columnSums.map((sum, rank) => (
                <th key={`sum_${rank}`} className={`${styles.footerValueCell} ${styles.totalRowValue}`}>
                  {formatCurrency(sum)}
                </th>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.footerCards}>
        <div className={styles.footerCard}>
          <p className={styles.footerLabel}>L1 Total</p>
          <p className={styles.footerValue}>{formatCurrency(model.l1Total)}</p>
        </div>
        <div className={styles.footerCard}>
          <p className={styles.footerLabel}>Finalized Total</p>
          <p className={styles.footerValue}>
            {Number(metrics?.finalizedTotal || model.finalizedTotal) > 0
              ? formatCurrency(metrics?.finalizedTotal || model.finalizedTotal)
              : "--"}
          </p>
        </div>
        <div className={styles.footerCard}>
          <p className={styles.footerLabel}>Baseline Delta</p>
          <p className={styles.footerValue}>{formatCurrency(baselineDelta)}</p>
          <p className={styles.valueSub}>{baselineDelta >= 0 ? "Savings vs baseline" : "Above baseline"}</p>
        </div>
      </div>

      <BreakupInsightModal
        show={breakupModal.show}
        onHide={closeBreakupModal}
        title={breakupModal.title}
        vendorName={breakupModal.vendorName}
        details={breakupModal.details}
        quantity={breakupModal.quantity}
        total={breakupModal.total}
        peerTotals={breakupModal.peerTotals}
      />
    </ComparisonMatrixShell>
  );
};

export default OverallCostMatrix;
