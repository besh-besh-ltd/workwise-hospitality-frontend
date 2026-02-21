import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Dropdown from "react-bootstrap/Dropdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faEnvelope, faUser } from "@fortawesome/free-regular-svg-icons";
import { faComments, faHistory, faPhone } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import ReadMore from "@/components/shared/ReadMore";
import QuoteHistoryModal from "@/components/modal/QuoteHistoryModal";
import FinalizeVendorModal from "@/components/dashboard/buyer/FinalizeVendorModal";
import FinalizeHistoryModal from "@/components/dashboard/buyer/FinalizeHistoryModal";
import HierarchySelectionModal from "@/components/dashboard/buyer/HierarchySelectionModal";
import RoundEndActions from "@/components/dashboard/buyer/negotiation/RoundEndActions";
import ApprovalWorkflowSection from "@/components/dashboard/buyer/approval/ApprovalWorkflowSection";
import {
  approveNegotiationQuotes,
  getQuoteApprovalStatus,
  rejectNegotiationQuotes,
} from "@/services/negotiation";
import { getAvailableHierarchies } from "@/services/general";
import { addCommasToNumber, calculateTotal } from "@/utils/sharedFunctions";
import {
  buildProductComparisonModel,
  getPaymentTermsText,
  getQuoteDetails,
  getQuotePrice,
  getQuoteTotal,
  getVendorDetails,
} from "@/utils/quoteCompareTableViewModel";
import ComparisonMatrixShell from "./ComparisonMatrixShell";
import VendorStatusCell from "./VendorStatusCell";
import MissingCostIndicator from "./MissingCostIndicator";
import RegretStateCell from "./RegretStateCell";
import EmptyValue from "./EmptyValue";
import styles from "./QuoteCompareTables.module.scss";

const metricRows = [
  { key: "quantity", label: "Quantity" },
  { key: "basePrice", label: "Base Price" },
  { key: "subtotal", label: "Sub Total" },
  { key: "packaging", label: "Packaging" },
  { key: "freight", label: "Freight" },
  { key: "gst", label: "GST" },
  { key: "total", label: "Total" },
  { key: "target", label: "Target Price" },
  { key: "delivery", label: "Delivery" },
  { key: "comment", label: "Comment" },
  { key: "documents", label: "Vendor Documents" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "payment", label: "Payment Terms" },
];

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return `Rs. ${addCommasToNumber(Math.round(num))}`;
};

const getNumericValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const getDeltaTone = (delta) => {
  if (delta < 0) return styles.deltaGood;
  if (delta > 0) return styles.deltaBad;
  return styles.deltaNeutral;
};

const getHeatToneClass = (model, rowKey, vendorId) => {
  const band = model?.rowComparativeStats?.[rowKey]?.bands?.[vendorId];
  if (band === "best") return styles.heatBest;
  if (band === "competitive") return styles.heatCompetitive;
  if (band === "high") return styles.heatHigh;
  if (band === "neutral") return styles.heatNeutral;
  return "";
};

const renderFileLinks = (files = [], label = "View File") => {
  if (!Array.isArray(files) || files.length === 0) {
    return <EmptyValue />;
  }

  return (
    <div className={styles.innerScrollTall}>
      {files.map((file, index) => {
        const fileUrl = typeof file === "string" ? file : file?.file_url;
        if (!fileUrl) return null;

        return (
          <a
            key={`${fileUrl}_${index}`}
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="page-link p-0"
          >
            {label}
          </a>
        );
      })}
    </div>
  );
};

const getPaymentTone = (term = "") => {
  const normalized = String(term || "").toLowerCase();
  if (!normalized) return "neutral";

  if (
    normalized.includes("advance") ||
    normalized.includes("prepaid") ||
    normalized.includes("proforma")
  ) {
    return "danger";
  }

  if (
    normalized.includes("credit") ||
    normalized.includes("net") ||
    /\b\d+\s*days?\b/.test(normalized)
  ) {
    return "success";
  }

  return "neutral";
};

const renderPaymentPills = (content) => {
  if (!content || content === "--") return <EmptyValue />;

  const terms = String(content)
    .split(/\n|,/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (!terms.length) return <EmptyValue />;

  return (
    <div className={styles.paymentPillRow}>
      {terms.map((term, index) => {
        const tone = getPaymentTone(term);
        const toneClass =
          tone === "danger"
            ? styles.paymentPillDanger
            : tone === "success"
            ? styles.paymentPillSuccess
            : styles.paymentPillNeutral;

        return (
          <span key={`${term}_${index}`} className={`${styles.paymentPill} ${toneClass}`}>
            {term}
          </span>
        );
      })}
    </div>
  );
};

const ProductComparisonMatrix = ({
  rfqId = null,
  quotations,
  originalQuotations,
  quantity,
  handleFinalize,
  proditem,
  alreadyFinalized,
  isRfqClosed = false,
  projectId,
  availableBudget,
  normalizeFilter,
  freightFilter,
  negotiationRoundQuotes = [],
  activeRound = null,
  onRoundEnded,
  canWrite = true,
  permissionsLoading = false,
  is_tender = false,
  hospitalityCompanyId = null,
  hotelId = null,
  departmentId = null,
}) => {
  const router = useRouter();
  const activeRfqId = rfqId || router.query?.rfq;

  const [activeModal, setActiveModal] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [quotehistorydata, setQuotehistorydata] = useState({
    product_details: [],
    previous_quotes: [],
  });
  const [existingPOId, setExistingPOId] = useState(null);
  const [selectedRouteType, setSelectedRouteType] = useState(null);
  const [availableHierarchies, setAvailableHierarchies] = useState([]);
  const [useLegacyHierarchy, setUseLegacyHierarchy] = useState(true);
  const [quoteApprovalStatus, setQuoteApprovalStatus] = useState(null);
  const [approvalRefreshKey, setApprovalRefreshKey] = useState(0);

  const model = useMemo(
    () =>
      buildProductComparisonModel({
        product: proditem,
        quotations,
        originalQuotations,
        normalizeFilter,
        freightFilter,
        negotiationRoundQuotes,
        activeRound,
        quoteApprovalStatus,
        is_tender,
      }),
    [
      proditem,
      quotations,
      originalQuotations,
      normalizeFilter,
      freightFilter,
      negotiationRoundQuotes,
      activeRound,
      quoteApprovalStatus,
      is_tender,
    ]
  );

  useEffect(() => {
    getAvailableHierarchies("po", projectId)
      .then((result) => {
        setAvailableHierarchies(result.data || []);
        setUseLegacyHierarchy(result.use_legacy_hierarchy !== false);
      })
      .catch(() => {
        setAvailableHierarchies([]);
      });
  }, [projectId]);

  useEffect(() => {
    if (!is_tender || !proditem?.id) return;

    getQuoteApprovalStatus(proditem.id)
      .then((response) => {
        if (response?.status === 1 && response?.data) {
          setQuoteApprovalStatus(response.data);
        } else {
          setQuoteApprovalStatus(null);
        }
      })
      .catch(() => setQuoteApprovalStatus(null));
  }, [is_tender, proditem?.id, approvalRefreshKey]);

  const handleApprovalActionComplete = () => {
    setApprovalRefreshKey((prev) => prev + 1);
    if (onRoundEnded) onRoundEnded();
  };

  const handleCustomQuoteApprove = async (comment) => {
    try {
      await approveNegotiationQuotes(proditem.id, comment, departmentId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "Failed to approve quotes" };
    }
  };

  const handleCustomQuoteReject = async (comment) => {
    try {
      await rejectNegotiationQuotes(proditem.id, comment, departmentId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "Failed to reject quotes" };
    }
  };

  const effectiveRoundQuotes = useMemo(() => {
    if (negotiationRoundQuotes && negotiationRoundQuotes.length > 0) {
      return { quotes: negotiationRoundQuotes, source: "negotiation" };
    }

    if (quotations && quotations.length > 0) {
      const regularQuotes = quotations
        .filter((quote) => {
          const details = getQuoteDetails(quote) || {};
          return details?.is_regret != 1 && Number(details.unit_price || quote.unit_price || 0) > 0;
        })
        .map((quote) => {
          const details = getQuoteDetails(quote) || {};
          const vendor = getVendorDetails(quote, proditem) || {};
          return {
            id: quote.quote_id,
            quote_id: quote.quote_id,
            vendor_id: vendor.id || details.created_by,
            vendor_name: vendor.name || vendor.organization_name || "Unknown",
            organization_name: vendor.organization_name,
            quoted_price: quote.total_price || details.total_price || quote.unit_price,
            previous_price: null,
            rfq_product_id: proditem?.id,
            is_regular_quote: true,
          };
        });

      return { quotes: regularQuotes, source: "regular" };
    }

    return { quotes: [], source: "none" };
  }, [negotiationRoundQuotes, quotations, proditem]);

  const getCellContent = (column, rowKey) => {
    const details = column.details || {};

    if (column.isRegret) {
      if (rowKey === "total") {
        return <RegretStateCell reason={details.regret_reason || "Vendor declined this RFQ"} />;
      }
      return <EmptyValue />;
    }

    const previous = column.previous;
    const previousDetails = previous ? getQuoteDetails(previous) || {} : null;

    switch (rowKey) {
      case "quantity":
        return <span className={styles.value}>{quantity || column.quantity || "--"}</span>;
      case "basePrice": {
        const current = getNumericValue(details.unit_price, column.quote?.unit_price, column.price);
        const previousValue = getNumericValue(
          previousDetails?.unit_price,
          previous?.unit_price,
          getQuotePrice(previous)
        );
        const delta = previousDetails ? current - previousValue : 0;

        return (
          <>
            <span className={styles.value}>{formatCurrency(current)}</span>
            {previousDetails && previousValue !== current ? (
              <span className={`${styles.valueDelta} ${getDeltaTone(delta)}`}>
                {delta > 0 ? "+" : ""}
                {formatCurrency(delta)} vs previous
              </span>
            ) : null}
          </>
        );
      }
      case "subtotal": {
        const unitPrice = getNumericValue(details.unit_price, column.quote?.unit_price, column.price);
        const subtotal = getNumericValue(quantity, column.quantity, 0) * unitPrice;
        return <span className={styles.value}>{formatCurrency(subtotal)}</span>;
      }
      case "packaging":
        return (
          <span className={styles.value}>
            {details.package_mode === "percentage"
              ? `${details.package_price || 0}%`
              : formatCurrency(details.package_price || 0)}
          </span>
        );
      case "freight":
        return (
          <>
            <span className={styles.value}>
              {details.freight_mode === "percentage"
                ? `${details.freight_price || 0}%`
                : formatCurrency(details.freight_price || 0)}
            </span>
            {model.freightAdvantageVendorIds.includes(column.vendorId) ? (
              <div className={styles.statusRow}>
                <span className={`${styles.statusChip} ${styles.statusInfo}`}>Freight Advantage</span>
              </div>
            ) : null}
          </>
        );
      case "gst":
        return (
          <span className={styles.value}>
            {details.tax_mode === "percentage"
              ? `${details.tax || 0}%`
              : formatCurrency(details.tax || 0)}
          </span>
        );
      case "total": {
        const previousTotal = previous ? getQuoteTotal(proditem, previous, normalizeFilter) : 0;
        const delta = previous ? column.total - previousTotal : 0;

        return (
          <>
            <span className={styles.value}>{formatCurrency(column.total)}</span>
            {previous && previousTotal !== column.total ? (
              <span className={`${styles.valueDelta} ${getDeltaTone(delta)}`}>
                {delta > 0 ? "+" : ""}
                {formatCurrency(delta)} vs previous
              </span>
            ) : null}
            <MissingCostIndicator parts={column.missingParts} />
          </>
        );
      }
      case "target":
        return (
          <span className={styles.value}>
            {column.targetPrice ? formatCurrency(column.targetPrice) : "--"}
          </span>
        );
      case "delivery":
        return (
          <span className={styles.value}>{column.delivery ? `${column.delivery} day(s)` : "--"}</span>
        );
      case "comment":
        return column.comment ? (
          <div className={styles.innerScrollTall}>
            <ReadMore content={column.comment} maxLines={5} />
          </div>
        ) : (
          <EmptyValue />
        );
      case "documents":
        return renderFileLinks(column.documentFiles, "View File");
      case "terms":
        return renderFileLinks(column.termsFiles, "View File");
      case "payment": {
        const content = getPaymentTermsText({ ...column.quote, ...details });
        return renderPaymentPills(content);
      }
      default:
        return <EmptyValue />;
    }
  };

  const getCellClassName = (column, rowKey) => {
    if (column.isRegret) return styles.regretCell;

    const classes = [styles.productValueCell];

    if (rowKey === "total") {
      classes.push(styles.productValueCellStrong);
      classes.push(getHeatToneClass(model, rowKey, column.vendorId));
    }

    if (rowKey === "freight" && model.freightAdvantageVendorIds.includes(column.vendorId)) {
      classes.push(styles.freightAdvantageCell);
    }

    if (rowKey === "total" && column.isFinalized) {
      classes.push(styles.finalizedCell);
    } else if (rowKey === "total" && column.isLowest) {
      classes.push(styles.lowestCell);
    }

    if (column.missingParts.length > 0 && (rowKey === "total" || rowKey === "freight" || rowKey === "packaging")) {
      classes.push(styles.riskCell);
    }

    return classes.join(" ").trim();
  };

  const lowestQuote = model.lowestQuote;
  const finalizedHistory = Array.isArray(proditem?.finalization_history) ? proditem.finalization_history : [];

  return (
    <>
      {activeRound ? (
        <RoundEndActions
          activeRound={activeRound}
          roundQuotes={effectiveRoundQuotes.quotes}
          roundQuotesSource={effectiveRoundQuotes.source}
          rfq_id={activeRfqId}
          rfq_product_id={proditem.id}
          productName={proditem?.product_details?.[0]?.product_name || "Product"}
          onRoundCreated={onRoundEnded}
          onQuotesApproved={handleApprovalActionComplete}
          canWrite={canWrite}
          permissionsLoading={permissionsLoading}
          is_tender={is_tender}
          fullProduct={proditem}
          quoteApprovalStatus={quoteApprovalStatus}
          department_id={departmentId}
        />
      ) : null}

      {is_tender && quoteApprovalStatus?.approval_instance?.status ? (
        <ApprovalWorkflowSection
          entityType="NEGOTIATION_QUOTE"
          entityId={proditem.id}
          entityLabel={`Quote Approval - ${proditem?.product_details?.[0]?.product_name || "Product"}`}
          hospitalityCompanyId={hospitalityCompanyId}
          hotelId={hotelId}
          departmentId={departmentId}
          onCustomApprove={handleCustomQuoteApprove}
          onCustomReject={handleCustomQuoteReject}
          onActionComplete={handleApprovalActionComplete}
        />
      ) : null}

      <ComparisonMatrixShell className={model.columns.length <= 1 ? styles.matrixSurfaceCompact : ""}>
        <div
          className={`${styles.matrixScroller} ${styles.productMatrixScroller} ${
            model.columns.length <= 1
              ? `${styles.matrixScrollerNoScroll} ${styles.singleVendorProductScroller}`
              : ""
          }`}
        >
          <table
            className={`${styles.matrixTable} ${
              model.columns.length <= 1
                ? `${styles.singleVendorTable} ${styles.singleVendorProductTable}`
                : ""
            }`}
          >
            <thead>
              <tr>
                <th
                  className={`${styles.metricHeadCompact} ${styles.productMetricHead} ${styles.headerSticky} ${styles.stickyLeft} ${styles.cornerCell}`}
                >
                  Metric
                </th>
                {model.columns.map((column) => {
                  const statuses = [];

                  if (column.isFinalized) statuses.push({ label: "Finalized", tone: "success" });
                  if (column.isLowest) statuses.push({ label: "Lowest", tone: "info" });
                  if (column.isArcSelected) statuses.push({ label: "ARC Selected", tone: "success" });
                  if (column.isQuoteSelectedForApproval) {
                    statuses.push({
                      label:
                        column.approvalStatus === "APPROVED"
                          ? "Approved"
                          : column.approvalStatus === "REJECTED"
                          ? "Rejected"
                          : "Pending Approval",
                      tone:
                        column.approvalStatus === "APPROVED"
                          ? "success"
                          : column.approvalStatus === "REJECTED"
                          ? "danger"
                          : "warning",
                    });
                  }
                  if (column.roundQuote && activeRound && !column.isArcSelected) {
                    statuses.push({ label: `Round ${activeRound.round_number}`, tone: "warning" });
                  }
                  if (model.freightAdvantageVendorIds.includes(column.vendorId)) {
                    statuses.push({ label: "Freight Adv.", tone: "info" });
                  }
                  if (column.missingParts.length > 0) {
                    statuses.push({ label: "Missing", tone: "warning" });
                  }
                  if (column.isRegret) statuses.push({ label: "Regret", tone: "danger" });

                  return (
                    <th
                      className={`${styles.vendorHead} ${styles.headerSticky}`}
                      key={`h_${column.vendorId}_${column.quote?.quote_id}`}
                      title={column.titleText}
                    >
                      <VendorStatusCell
                        rank={column.rank}
                        vendorName={column.vendorName}
                        vendorSubText={column.total > 0 ? `Total ${formatCurrency(column.total)}` : "No valid quote"}
                        centered
                        emphasizeName
                        statuses={statuses}
                        actionSlot={
                          <Dropdown className="dots-nav-anchor" align="end">
                            <Dropdown.Toggle as="button" className="dots-nav p-0 border-0 bg-transparent" style={{ cursor: "pointer" }}>
                              <Image src="/assets/images/3-dots-nav.svg" width={4} height={18} alt="Actions" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item
                                target="_blank"
                                href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${column.vendorId}`}
                                id={`view_vendor_profile_${column.vendorId}-vendor_actions-quote_compare_table`}
                              >
                                <FontAwesomeIcon icon={faUser} className="me-2" />
                                Vendor profile
                              </Dropdown.Item>
                              <Dropdown.Item
                                href={`/dashboard/buyer/query?rfq_id=${activeRfqId}&role=buyer&vendor_id=${column.vendorId}`}
                                id={`talk_with_vendor_${column.vendorId}-vendor_actions-quote_compare_table`}
                              >
                                <FontAwesomeIcon icon={faComments} className="me-2" />
                                Talk with vendor
                              </Dropdown.Item>
                              {!is_tender &&
                                !column.isRegret &&
                                (!column.quote.finalization ||
                                  column.quote?.finalization?.winning_vendor?.id != column.vendorId) &&
                                canWrite &&
                                !permissionsLoading ? (
                                  <Dropdown.Item
                                    href="#"
                                    onClick={() => {
                                      setCurrentItem(column.quote);
                                      setActiveModal("finalize");
                                    }}
                                    id={`finalize_vendor_${column.vendorId}-vendor_actions-quote_compare_table`}
                                  >
                                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                    Finalize
                                  </Dropdown.Item>
                                ) : null}
                              {Array.isArray(column.quote.previous_quotes) && column.quote.previous_quotes.length > 0 ? (
                                <Dropdown.Item
                                  href="#"
                                  onClick={() => {
                                    setActiveModal("quote_history");
                                    setQuotehistorydata({
                                      product_details: proditem.product_details,
                                      previous_quotes: column.quote.previous_quotes,
                                    });
                                  }}
                                  id={`view_quote_history_${column.vendorId}-vendor_actions-quote_compare_table`}
                                >
                                  <FontAwesomeIcon icon={faHistory} className="me-2" />
                                  Quote History
                                </Dropdown.Item>
                              ) : null}
                            </Dropdown.Menu>
                          </Dropdown>
                        }
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {metricRows.map((row) => (
                <tr key={`${proditem?.id}_${row.key}`} className={styles.productMetricRow}>
                  <th
                    className={`${styles.metricCell} ${styles.metricCellCompact} ${styles.stickyLeft} ${styles.productMetricLabelCell}`}
                  >
                    {row.label}
                  </th>
                  {model.columns.map((column) => (
                    <td
                      className={getCellClassName(column, row.key)}
                      key={`${proditem?.id}_${row.key}_${column.vendorId}_${column.quote?.quote_id || "x"}`}
                    >
                      {getCellContent(column, row.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.mobileCards}>
          {model.columns.slice(0, 2).map((column) => (
            <article className={styles.mobileCard} key={`mobile_${column.vendorId}_${column.quote?.quote_id}`}>
              <p className={styles.summaryKey}>{column.rank || "Vendor"}</p>
              <p className={styles.summaryVal}>{column.vendorName}</p>
              <p className={styles.valueSub}>Total: {formatCurrency(column.total)}</p>
            </article>
          ))}
        </div>
      </ComparisonMatrixShell>

      {alreadyFinalized?.length == 0 ? (
        <div className={styles.footerCards}>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>Lowest Bid</p>
            <p className={styles.footerValue}>
              {lowestQuote
                ? getVendorDetails(lowestQuote, proditem)?.organization_name ||
                  getVendorDetails(lowestQuote, proditem)?.name ||
                  getVendorDetails(lowestQuote, proditem)?.email ||
                  "Unknown Vendor"
                : "--"}
            </p>
            {lowestQuote ? (
              <div className="d-flex gap-3 align-items-center">
                <Link href={`mailto:${getVendorDetails(lowestQuote, proditem)?.email || ""}`}>
                  <FontAwesomeIcon icon={faEnvelope} />
                </Link>
                <Link
                  href={`tel:${getVendorDetails(lowestQuote, proditem)?.mobile || ""}`}
                  id="call_lowest_bidder-quote_actions-quote_compare_table"
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Link>
              </div>
            ) : null}
          </div>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>Lowest Total</p>
            <p className={styles.footerValue}>
              {lowestQuote ? formatCurrency(getQuoteTotal(proditem, lowestQuote, normalizeFilter)) : "--"}
            </p>
          </div>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>Actions</p>
            {!is_tender ? (
              isRfqClosed ? (
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
                  RFQ has been closed
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setCurrentItem(lowestQuote);
                    setActiveModal("finalize");
                  }}
                  title={
                    !canWrite || permissionsLoading
                      ? "You don't have permission to finalize vendors"
                      : useLegacyHierarchy && availableHierarchies.length <= 0
                      ? "You cannot finalize as you are not in the hierarchy"
                      : ""
                  }
                  disabled={
                    (useLegacyHierarchy && availableHierarchies.length <= 0) ||
                    !canWrite ||
                    permissionsLoading ||
                    !lowestQuote
                  }
                  id="finalize_vendor-quote_actions-quote_compare_table"
                >
                  Finalize
                </button>
              )
            ) : (
              <EmptyValue>Finalization from tender workflow</EmptyValue>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.footerCards}>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>Finalized Vendor</p>
            <p className={styles.footerValue}>
              {alreadyFinalized[0]?.finalization?.winning_vendor?.organization_name ||
                alreadyFinalized[0]?.finalization?.winning_vendor?.company_name ||
                "--"}
            </p>
          </div>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>Finalized By</p>
            <p className={styles.footerValue}>
              {alreadyFinalized[0]?.finalization?.finilized_by?.name || "--"}
            </p>
          </div>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>History</p>
            {finalizedHistory.length > 0 ? (
              <button
                className="btn btn-outline-success btn-sm"
                onClick={() => setActiveModal("finalize_history")}
                id="view_finalization_history-finalization_actions-quote_compare_table"
              >
                View Finalization History
              </button>
            ) : (
              <EmptyValue />
            )}
          </div>
        </div>
      )}

      {activeModal === "quote_history" ? (
        <QuoteHistoryModal
          showModal={activeModal === "quote_history"}
          closeModal={() => setActiveModal(null)}
          quotehistorydata={quotehistorydata}
        />
      ) : null}

      <FinalizeVendorModal
        show={activeModal === "finalize"}
        onHide={() => setActiveModal(null)}
        onConfirm={(selectedPOId) => {
          setExistingPOId(selectedPOId);
          const isTender = proditem?.rfq?.[0]?.is_tender === 1 || proditem?.rfq?.[0]?.is_tender === true;
          const routeType = isTender ? "ARC" : "PO";
          setSelectedRouteType(routeType);

          if (routeType === "ARC") {
            handleFinalize(currentItem, proditem, selectedPOId, null, "ARC");
            setActiveModal(null);
          } else if (!useLegacyHierarchy) {
            handleFinalize(currentItem, proditem, selectedPOId, null, "PO");
            setActiveModal(null);
          } else if (availableHierarchies.length <= 0) {
            toast.error(
              "You cannot finalize a vendor, as you don't belong to the PO approval hierarchy"
            );
            setActiveModal(null);
          } else {
            setActiveModal("hierarchy");
          }
        }}
        vendorName={
          getVendorDetails(currentItem, proditem)?.organization_name ||
          getVendorDetails(currentItem, proditem)?.name ||
          "Vendor"
        }
        vendorDetails={getVendorDetails(currentItem, proditem)}
        rfqId={activeRfqId}
        quotedPrice={currentItem?.total_price}
        productDetails={proditem?.product_details}
        alreadyFinalized={alreadyFinalized}
        availableBudget={availableBudget}
      />

      <HierarchySelectionModal
        show={activeModal === "hierarchy"}
        onHide={() => setActiveModal(null)}
        hierarchies={availableHierarchies}
        onConfirm={(selectedHierarchy) => {
          handleFinalize(currentItem, proditem, existingPOId, selectedHierarchy, selectedRouteType || "PO");
          setActiveModal(null);
        }}
      />

      <FinalizeHistoryModal
        show={finalizedHistory.length > 0 && activeModal === "finalize_history"}
        onHide={() => setActiveModal(null)}
        history={finalizedHistory}
        quantity={
          proditem?.product_details?.[0]?.rfq_details?.find((spec) => spec.title === "Quantity")
            ?.value
        }
        calculateTotal={calculateTotal}
      />
    </>
  );
};

export default ProductComparisonMatrix;
