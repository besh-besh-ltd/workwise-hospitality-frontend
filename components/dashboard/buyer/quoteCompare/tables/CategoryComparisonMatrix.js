import React, { useEffect, useMemo, useState } from "react";
import FullLoader from "@/components/shared/FullLoader";
import LPRModal from "@/components/shared/LPRModal";
import { downloadQuotesDetails } from "@/services/rfq";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import {
  buildCategoryComparisonModel,
  getQuoteDetails,
  getQuoteTotal,
} from "@/utils/quoteCompareTableViewModel";
import ComparisonMatrixShell from "./ComparisonMatrixShell";
import BreakupInsightModal from "./BreakupInsightModal";
import RegretStateCell from "./RegretStateCell";
import EmptyValue from "./EmptyValue";
import styles from "./QuoteCompareTables.module.scss";

const formatCurrency = (value) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `Rs. ${addCommasToNumber(Math.round(safe))}`;
};

const formatRoundStatus = (status) => {
  if (status === "ACTIVE") return "Active";
  if (status === "PENDING_APPROVAL") return "Pending Approval";
  if (status === "ENDED") return "Ended";
  if (status === "CLOSED") return "Closed";
  if (status === "COMPLETED") return "Completed";
  return status || "";
};

const formatRoundEnd = (endDate) => {
  if (!endDate) return null;
  // Backend stores TIMESTAMP WITHOUT TIME ZONE but values are UTC.
  // pg-promise returns raw string (no Z), so explicitly mark as UTC before parsing.
  let utcStr = endDate;
  if (typeof endDate === "string") {
    utcStr = endDate.replace(" ", "T");
    if (!/Z$|[+-]\d{2}:?\d{2}$/.test(utcStr)) {
      utcStr += "Z";
    }
  }
  const end = new Date(utcStr);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  // Always format in IST regardless of browser timezone
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).formatToParts(end);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const formatted = `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
  return end < now ? `Ended ${formatted}` : `Ends ${formatted}`;
};

const getHeatBand = (row, vendorId) => {
  return row?.rowComparativeStats?.total?.bands?.[vendorId] || "";
};

const getHeatClass = (band) => {
  if (band === "best") return styles.catLowestCell;
  if (band === "competitive") return styles.heatCompetitive;
  if (band === "high") return styles.heatHigh;
  return "";
};

const CategoryComparisonMatrix = ({
  rfq_id,
  TA_Filter,
  freightFilter,
  normalizeFilter,
  rfq_product_id,
  source,
  productNegotiationData = {},
}) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [originalProducts, setOriginalProducts] = useState([]);
  const [openLpr, setOpenLpr] = useState({});
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
    downloadQuotesDetails(rfq_id, TA_Filter, freightFilter, rfq_product_id, source)
      .then((res) => {
        setOriginalProducts(res.data || []);
        setProducts(res.data || []);
      })
      .catch(() => {
        setProducts([]);
        setOriginalProducts([]);
      })
      .finally(() => setLoading(false));
  }, [rfq_id, TA_Filter, freightFilter, rfq_product_id, source]);

  const model = useMemo(
    () => buildCategoryComparisonModel(products, originalProducts, normalizeFilter, freightFilter),
    [products, originalProducts, normalizeFilter, freightFilter]
  );
  const isSingleVendor = model.vendors.length <= 1;

  const rowsByCategory = useMemo(() => {
    return model.rows.reduce((acc, row) => {
      if (!acc[row.category]) acc[row.category] = [];
      acc[row.category].push(row);
      return acc;
    }, {});
  }, [model.rows]);

  const toggleLpr = (key) => {
    setOpenLpr((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openBreakupModal = (payload) => {
    setBreakupModal({ show: true, ...payload });
  };

  const closeBreakupModal = () => {
    setBreakupModal((prev) => ({ ...prev, show: false }));
  };

  if (loading) return <FullLoader />;
  if (!model.rows.length) return <h4 className="mt-4 text-center">No Technically Accepted Quotes Yet!</h4>;

  return (
    <ComparisonMatrixShell>
      <div className={`${styles.matrixScroller} ${isSingleVendor ? styles.matrixScrollerNoScroll : ""}`}>
        <table className={`${styles.matrixTable} ${isSingleVendor ? styles.singleVendorTable : ""}`}>
          <thead>
            <tr>
              <th
                className={`${styles.metricHead} ${styles.productPrimaryHead} ${styles.headerSticky} ${styles.stickyLeft} ${styles.cornerCell} ${styles.headerCenter}`}
              >
                Product
              </th>
              {model.vendors.map((vendor, index) => (
                <th className={`${styles.vendorHead} ${styles.headerSticky} ${styles.headerCenter}`} key={`vh_${vendor.id}`}>
                  <div className={styles.rankChip}>L{index + 1}</div>
                  <div className={styles.vendorName}>{vendor.displayName}</div>
                  <div className={styles.vendorTotalHeader}>
                    {vendor.total > 0 ? formatCurrency(vendor.total) : "No quote"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Object.entries(rowsByCategory).map(([category, rows]) => (
              <React.Fragment key={category}>
                {category !== "Uncategorized" ? (
                  <tr>
                    <td className={styles.sectionDivider} colSpan={1 + model.vendors.length}>
                      {category}
                    </td>
                  </tr>
                ) : null}

                {rows.map((row, idx) => {
                  const rowKey = `${row.product.product_variant_id}_${row.product.variant}_${idx}`;
                  const lpr = row.lastPurchaseRate || row.lastQuoteRate;
                  const lprTotal = lpr ? getQuoteTotal(row.product, lpr, normalizeFilter) : 0;
                  const negotiation = productNegotiationData?.[row.product.id];
                  const rowPeerTotals = row.vendorCells
                    .filter((cell) => cell.quote && !cell.isRegret && cell.total > 0)
                    .map((cell) => cell.total);

                  return (
                    <tr key={rowKey}>
                      <td className={`${styles.stickyLeft} ${styles.productPrimaryCell} ${styles.catCompactProductCell}`}>
                        <div className={styles.catCompactProduct}>
                          <div className={styles.catProductName}>{row.productName}</div>

                          <div className={styles.catProductMeta}>
                            {row.quantity || "--"} {row.unit || ""}
                            {row.size ? <span className={styles.catMetaSep}>|</span> : null}
                            {row.size ? <span>Size: {row.size}</span> : null}
                          </div>

                          {row.spec ? (
                            <div className={styles.catProductSpec} title={row.spec}>
                              {row.spec}
                            </div>
                          ) : null}

                          {(() => {
                            const negoTarget = Number(negotiation?.activeRound?.target_price || 0);
                            const effectiveTarget = negoTarget > 0 ? negoTarget : row.targetPrice;
                            return (
                              <div className={styles.catPriceRow}>
                                <span className={styles.catPriceItem}>
                                  <span className={styles.catPriceLabel}>Target</span>
                                  <span className={styles.catPriceValue}>
                                    {effectiveTarget > 0 ? formatCurrency(effectiveTarget) : "--"}
                                  </span>
                                </span>
                                <span className={styles.catPriceDivider}>/</span>
                                <span className={styles.catPriceItem}>
                                  <span className={styles.catPriceLabel}>LPR</span>
                                  <span className={styles.catPriceValue}>
                                    {lpr ? formatCurrency(lprTotal) : "--"}
                                  </span>
                                </span>
                              </div>
                            );
                          })()}

                          {negotiation?.activeRound ? (() => {
                            const round = negotiation.activeRound;
                            const statusLabel = formatRoundStatus(round.status);
                            const endLabel = formatRoundEnd(round.end_date);
                            return (
                              <div className={styles.catNegoInfo}>
                                Round {round.round_number}
                                {statusLabel ? ` · ${statusLabel}` : ""}
                                {endLabel ? ` · ${endLabel}` : ""}
                              </div>
                            );
                          })() : null}

                          {lpr ? (
                            <div className={styles.catActionLinks}>
                              <button
                                type="button"
                                className={styles.catActionLink}
                                onClick={() =>
                                  openBreakupModal({
                                    title: "LPR / Last Quote Breakup",
                                    vendorName: row.productName,
                                    details: getQuoteDetails(lpr) || {},
                                    quantity: row.quantity,
                                    total: lprTotal,
                                    peerTotals: rowPeerTotals,
                                  })
                                }
                              >
                                LPR Breakup
                              </button>
                              <button type="button" className={styles.catActionLink} onClick={() => toggleLpr(rowKey)}>
                                LPR History
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <LPRModal
                          show={openLpr[rowKey] || false}
                          onHide={() => toggleLpr(rowKey)}
                          variantId={row.product.product_variant_id}
                          RFQ_no={-1}
                        />
                      </td>

                      {row.vendorCells.map((cell) => {
                        const key = `${rowKey}_${cell.vendor.id}`;

                        if (!cell.quote) {
                          return (
                            <td key={key} className={`${styles.catVendorCell} ${styles.textCenter}`}>
                              <EmptyValue />
                            </td>
                          );
                        }

                        if (cell.isRegret) {
                          return (
                            <td key={key} className={`${styles.catVendorCell} ${styles.regretCell}`}>
                              <RegretStateCell reason={cell.quote?.regret_reason || "Vendor declined"} />
                            </td>
                          );
                        }

                        if (cell.total <= 0) {
                          return (
                            <td key={key} className={`${styles.catVendorCell} ${styles.textCenter}`}>
                              <EmptyValue />
                            </td>
                          );
                        }

                        const details = cell.details || {};
                        const band = getHeatBand(row, cell.vendor.id);
                        const heatClass = getHeatClass(band);
                        const isLowest = band === "best";
                        const cellClasses = [styles.catVendorCell, heatClass];
                        if (cell.isFinalized) cellClasses.push(styles.catFinalizedCell);
                        if (cell.missingParts.length > 0) cellClasses.push(styles.riskCell);
                        const vendorName =
                          cell.vendor?.displayName || cell.vendor?.organization_name || "Vendor";

                        return (
                          <td
                            key={key}
                            className={cellClasses.join(" ").trim()}
                            onClick={() =>
                              openBreakupModal({
                                title: "Vendor Quote Breakup",
                                vendorName,
                                details,
                                quantity: row.quantity,
                                total: cell.total,
                                peerTotals: rowPeerTotals,
                              })
                            }
                            style={{ cursor: "pointer" }}
                            title="Click to view breakup"
                          >
                            <div className={styles.catPriceDisplay}>
                              <span className={`${styles.catTotalPrice} ${isLowest ? styles.catLowestPrice : ""} ${cell.isFinalized ? styles.catFinalizedPrice : ""}`}>
                                {formatCurrency(cell.total)}
                              </span>
                              {cell.missingParts.length > 0 ? (
                                <div className={styles.missing}>
                                  {cell.missingParts.map((part) => (
                                    <span key={part} className={styles.missingLabel}>Missing {part}</span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>

          <tfoot>
            <tr className={styles.totalBandStrong}>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Vendor Total</th>
              {model.vendors.map((vendor) => (
                <th
                  key={`v_total_${vendor.id}`}
                  className={`${styles.footerValueCell} ${styles.totalRowValue} ${styles.totalRowValueVendor}`}
                >
                  {vendor.total > 0 ? formatCurrency(vendor.total) : "--"}
                </th>
              ))}
            </tr>

            <tr className={styles.totalBandFinalized}>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Finalized Vendor Total</th>
              <th
                className={`${styles.footerValueCell} ${styles.totalRowValue} ${styles.totalRowValueFinalized}`}
                colSpan={model.vendors.length}
              >
                {model.finalizedTotal > 0 ? formatCurrency(model.finalizedTotal) : "--"}
              </th>
            </tr>

            <tr className={styles.totalBandL1}>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Lowest Total (L1)</th>
              <th
                className={`${styles.footerValueCell} ${styles.totalRowValue} ${styles.totalRowValueL1}`}
                colSpan={model.vendors.length}
              >
                {formatCurrency(model.l1Total)}
              </th>
            </tr>

            <tr className={styles.highlightMetricLabel}>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Delivery</th>
              {model.vendors.map((vendor) => {
                const days = vendor.deliveryDays || [];
                if (days.length === 0) return <th key={`v_delivery_${vendor.id}`} className={`${styles.footerValueCell} ${styles.catFooterVendorMeta}`}>--</th>;
                const min = Math.min(...days);
                const max = Math.max(...days);
                return (
                  <th key={`v_delivery_${vendor.id}`} className={`${styles.footerValueCell} ${styles.catFooterVendorMeta}`}>
                    {min === max ? `${min} day(s)` : `${min}–${max} day(s)`}
                  </th>
                );
              })}
            </tr>

            <tr className={styles.highlightMetricLabel}>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Payment Terms</th>
              {model.vendors.map((vendor) => {
                const raw = vendor.global_payment_term;
                const paymentTerm = Array.isArray(raw)
                  ? (raw[0]?.details || "")
                  : (typeof raw === "string" ? raw : "");
                return (
                  <th key={`v_payment_${vendor.id}`} className={`${styles.footerValueCell} ${styles.catFooterVendorMeta}`}>
                    {paymentTerm || "--"}
                  </th>
                );
              })}
            </tr>

            <tr className={styles.highlightMetricLabel}>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Comments</th>
              {model.vendors.map((vendor) => {
                const raw = vendor.global_comment || vendor.comment;
                const comment = typeof raw === "string" ? raw : "";
                return (
                  <th key={`v_comment_${vendor.id}`} className={`${styles.footerValueCell} ${styles.catFooterVendorMeta}`}>
                    {comment || "--"}
                  </th>
                );
              })}
            </tr>

            <tr className={styles.highlightMetricLabel}>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Attached Files</th>
              {model.vendors.map((vendor) => {
                const files = vendor.global_document_files;
                return (
                  <th key={`v_files_${vendor.id}`} className={`${styles.footerValueCell} ${styles.catFooterVendorMeta}`}>
                    {Array.isArray(files) && files.length > 0 ? (
                      files.map((file, idx) => {
                        const fileUrl = typeof file === "string" ? file : file?.file_url;
                        if (!fileUrl) return null;
                        return (
                          <a
                            key={`${vendor.id}_file_${idx}`}
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="page-link p-0"
                            style={{ display: "block", marginBottom: 2 }}
                          >
                            View File
                          </a>
                        );
                      })
                    ) : "--"}
                  </th>
                );
              })}
            </tr>
          </tfoot>
        </table>
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

export default CategoryComparisonMatrix;
