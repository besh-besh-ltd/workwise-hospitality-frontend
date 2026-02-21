import React, { useEffect, useMemo, useState } from "react";
import FullLoader from "@/components/shared/FullLoader";
import LPRModal from "@/components/shared/LPRModal";
import ReadMore from "@/components/shared/ReadMore";
import ProductNegotiationBadge from "@/components/dashboard/vendor/ProductNegotiationBadge";
import { downloadQuotesDetails } from "@/services/rfq";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import {
  buildCategoryComparisonModel,
  getQuoteDetails,
  getQuoteTotal,
} from "@/utils/quoteCompareTableViewModel";
import ComparisonMatrixShell from "./ComparisonMatrixShell";
import BreakupInsightModal from "./BreakupInsightModal";
import MissingCostIndicator from "./MissingCostIndicator";
import RegretStateCell from "./RegretStateCell";
import EmptyValue from "./EmptyValue";
import styles from "./QuoteCompareTables.module.scss";

const formatCurrency = (value) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `Rs. ${addCommasToNumber(Math.round(safe))}`;
};

const getHeatClass = (row, vendorId) => {
  const band = row?.rowComparativeStats?.total?.bands?.[vendorId];
  if (band === "best") return styles.heatBest;
  if (band === "competitive") return styles.heatCompetitive;
  if (band === "high") return styles.heatHigh;
  return "";
};

const getDeliveryRange = (items = []) => {
  const valid = items.filter((day) => Number(day) > 0).map((day) => Number(day));
  if (valid.length === 0) return "--";

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) return `Within ${min} day(s)`;
  return `Within ${min}-${max} day(s)`;
};

const getInitials = (name = "") => {
  const safe = String(name || "").trim();
  if (!safe) return "V";
  return safe
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const renderFiles = (files = []) => {
  if (!Array.isArray(files) || files.length === 0) return <EmptyValue />;

  return (
    <div className={styles.innerScrollTall}>
      {files.map((file, index) => {
        const fileUrl = typeof file === "string" ? file : file?.file_url;
        if (!fileUrl) return null;
        return (
          <a key={`${fileUrl}_${index}`} href={fileUrl} target="_blank" rel="noreferrer" className="page-link p-0">
            View File
          </a>
        );
      })}
    </div>
  );
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
                <tr>
                  <td className={styles.sectionDivider} colSpan={1 + model.vendors.length}>
                    {category}
                  </td>
                </tr>

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
                      <td className={`${styles.stickyLeft} ${styles.productPrimaryCell}`}>
                        <div className={styles.productCellCard}>
                          <div className={styles.productCardHead}>
                            <div>
                              <div className={styles.productLabel}>Product</div>
                              <div className={styles.productNamePrimary}>{row.productName}</div>
                            </div>
                            <span className={styles.productMetaPill}>Qty {row.quantity || "--"} {row.unit || ""}</span>
                          </div>

                          <div className={styles.productSpecBlock}>
                            <div className={styles.productLabel}>Specification</div>
                            {row.spec ? (
                              <div className={styles.innerScroll}>
                                <ReadMore content={row.spec} maxLines={3} />
                              </div>
                            ) : (
                              <div className={styles.valueMuted}>No specification added</div>
                            )}
                            <div className={styles.productMetaInline}>Size: {row.size || "--"}</div>
                          </div>

                          <div className={styles.productInfoGrid}>
                            <div className={styles.productInfoCard}>
                              <span className={styles.productInfoLabel}>Selling</span>
                              <span className={styles.productInfoValue}>
                                {row.sellingPrice > 0 ? formatCurrency(row.sellingPrice) : "--"}
                              </span>
                            </div>
                            <div className={styles.productInfoCard}>
                              <span className={styles.productInfoLabel}>Target</span>
                              <span className={styles.productInfoValue}>
                                {row.targetPrice > 0 ? formatCurrency(row.targetPrice) : "--"}
                              </span>
                            </div>
                            <div className={styles.productInfoCard}>
                              <span className={styles.productInfoLabel}>LPR / Last</span>
                              <span className={styles.productInfoValue}>{lpr ? formatCurrency(lprTotal) : "--"}</span>
                            </div>
                          </div>

                          {lpr ? (
                            <div className={styles.productActionRow}>
                              <button
                                type="button"
                                className={styles.breakupActionButton}
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
                                View LPR breakup
                              </button>
                              <button type="button" className={styles.breakupActionButton} onClick={() => toggleLpr(rowKey)}>
                                View LPR history
                              </button>
                            </div>
                          ) : null}

                          <div className={styles.productStatusRow}>
                            <ProductNegotiationBadge rfq_id={rfq_id} rfq_product_id={row.product.id} />
                            <span className={styles.productMetaDivider}>|</span>
                            <span>
                              {negotiation?.activeRound
                                ? `Round ${negotiation.activeRound.round_number} active`
                                : "No active round"}
                            </span>
                          </div>
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
                            <td key={key} className={styles.textCenter}>
                              <EmptyValue />
                            </td>
                          );
                        }

                        if (cell.isRegret) {
                          return (
                            <td key={key} className={styles.regretCell}>
                              <RegretStateCell reason={cell.quote?.regret_reason || "Vendor declined"} />
                            </td>
                          );
                        }

                        const details = cell.details || {};
                        const heatClass = getHeatClass(row, cell.vendor.id);
                        const cellClasses = [heatClass];
                        if (cell.isFinalized) cellClasses.push(styles.finalizedCell);
                        if (cell.missingParts.length > 0) cellClasses.push(styles.riskCell);
                        const vendorName =
                          cell.vendor?.displayName || cell.vendor?.organization_name || "Vendor";

                        return (
                          <td key={key} className={`${cellClasses.join(" ").trim()} ${styles.textCenter}`}>
                            <div className={styles.vendorRowCard}>
                              <div className={styles.vendorRowHead}>
                                <span className={styles.vendorAvatar}>{getInitials(vendorName)}</span>
                                <div>
                                  <div className={styles.vendorRowName}>{vendorName}</div>
                                  <div className={styles.vendorRowTotal}>{formatCurrency(cell.total)}</div>
                                </div>
                              </div>

                              <div className={styles.vendorMetaGrid}>
                                <div className={styles.vendorMetaItem}>
                                  <span className={styles.vendorMetaLabel}>Base</span>
                                  <span className={styles.vendorMetaValue}>
                                    {details.unit_price ? formatCurrency(details.unit_price) : "--"}
                                  </span>
                                </div>
                                <div className={styles.vendorMetaItem}>
                                  <span className={styles.vendorMetaLabel}>Delivery</span>
                                  <span className={styles.vendorMetaValue}>
                                    {details.delivery_period ? `${details.delivery_period} day(s)` : "--"}
                                  </span>
                                </div>
                              </div>

                              <div className={styles.statusRow}>
                                <span className={`${styles.statusChip} ${styles.statusInfo}`}>{cell.rank}</span>
                                {row?.rowComparativeStats?.total?.bands?.[cell.vendor.id] === "best" ? (
                                  <span className={`${styles.statusChip} ${styles.statusSuccess}`}>Best</span>
                                ) : null}
                                {cell.isFinalized ? (
                                  <span className={`${styles.statusChip} ${styles.statusSuccess}`}>Finalized</span>
                                ) : null}
                              </div>

                              <div className={styles.cellActions}>
                                <button
                                  type="button"
                                  className={styles.breakupActionButton}
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
                                >
                                  View breakup
                                </button>
                              </div>

                              <MissingCostIndicator parts={cell.missingParts} />

                              <div className={styles.vendorCommentBlock}>
                                <span className={styles.vendorMetaLabel}>Comment</span>
                                {details.comment ? (
                                  <div className={styles.innerScroll}>
                                    <ReadMore content={details.comment} maxLines={2} />
                                  </div>
                                ) : (
                                  <span className={styles.valueMuted}>No comment</span>
                                )}
                              </div>

                              <div className={styles.vendorCommentBlock}>
                                <span className={styles.vendorMetaLabel}>Documents</span>
                                <div className={styles.valueSub}>{renderFiles(details.document_files)}</div>
                              </div>
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

            <tr>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Delivery</th>
              {model.vendors.map((vendor) => (
                <td key={`delivery_${vendor.id}`} className={`${styles.footerValueCell} ${styles.textCenter}`}>
                  {getDeliveryRange(vendor.deliveryDays)}
                </td>
              ))}
            </tr>

            <tr>
              <th className={`${styles.footerBandLabel} ${styles.textCenter}`}>Payment Terms</th>
              {model.vendors.map((vendor) => (
                <td key={`payment_${vendor.id}`} className={styles.footerValueCell}>
                  {vendor.global_payment_term?.[0]?.details ? (
                    <div className={styles.innerScrollTall}>
                      <ReadMore content={vendor.global_payment_term?.[0]?.details} maxLines={4} />
                    </div>
                  ) : (
                    <EmptyValue />
                  )}
                </td>
              ))}
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
