import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import Dropdown from "react-bootstrap/Dropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faEnvelope, faUser } from "@fortawesome/free-regular-svg-icons";
import { faComments, faHistory, faPhone } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import ReadMore from "@/components/shared/ReadMore";
import QuoteHistoryModal from "@/components/modal/QuoteHistoryModal";
import FinalizeVendorModal from "@/components/dashboard/buyer/FinalizeVendorModal";
import FinalizeHistoryModal from "@/components/dashboard/buyer/FinalizeHistoryModal";
import HierarchySelectionModal from "@/components/dashboard/buyer/HierarchySelectionModal";
import ExistingPOModal from "@/components/dashboard/buyer/ExistingPOModal";
import RoundEndActions from "@/components/dashboard/buyer/negotiation/RoundEndActions";
import ApprovalWorkflowSection from "@/components/dashboard/buyer/approval/ApprovalWorkflowSection";
import { getExistingPOByVendor } from "@/services/rfq";
import { willBeFinalApprover as predictWillBeFinalApprover } from "@/services/approval";
import {
  approveNegotiationQuotes,
  rejectNegotiationQuotes,
} from "@/services/negotiation";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import {
  buildProductComparisonModel,
  getPaymentTermsText,
  getQuoteDetails,
  getQuoteTotal,
  getVendorDetails,
} from "@/utils/quoteCompareTableViewModel";
import ComparisonMatrixShell from "./ComparisonMatrixShell";
import VendorStatusCell from "./VendorStatusCell";
import MissingCostIndicator from "./MissingCostIndicator";
import RegretStateCell from "./RegretStateCell";
import EmptyValue from "./EmptyValue";
import styles from "./QuoteCompareTables.module.scss";

const baseMetricRows = [
  { key: "quantity", label: "Quantity" },
  { key: "basePrice", label: "Base Price" },
  { key: "subtotal", label: "Sub Total" },
  { key: "gst", label: "Tax (GST)" },
];

const afterTotalMetricRows = [
  { key: "delivery", label: "Delivery" },
  { key: "comment", label: "Comment" },
  { key: "documents", label: "Vendor Documents" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "payment", label: "Payment Terms" },
];

const highlightedMetricKeys = new Set(["total", "grandTotal", "delivery", "comment", "terms", "payment"]);

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

const formatModeValue = (value, mode) => {
  if (mode === "percentage") return `${value || 0}%`;
  return formatCurrency(value || 0);
};

const findPreviousDifferent = (previousQuotes, isDifferent) => {
  if (!Array.isArray(previousQuotes) || previousQuotes.length === 0) return null;
  for (const prev of previousQuotes) {
    if (isDifferent(prev)) return prev;
  }
  return null;
};

const PriceWithPrevious = ({ currentDisplay, previousDisplay, previousExists, hasChanged }) => {
  if (!previousExists || !hasChanged) {
    return <span className={styles.value}>{currentDisplay}</span>;
  }
  return (
    <div className={styles.priceCompareStack}>
      <span className={styles.previousValue}>{previousDisplay}</span>
      <span className={styles.value}>{currentDisplay}</span>
    </div>
  );
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
  finalizeLoading = false,
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
  preloadedHierarchies = null,
  preloadedQuoteApprovalStatus = null,
  preloadedInstances = null,
  vendorRejections = [],
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
  // Merge-PO check at finalize time. Auto-approving NEGOTIATION_QUOTE
  // instances bypass the approval-time merge prompt in
  // ApprovalWorkflowSection, so we also probe for existing draft POs here
  // so the user can merge in every flow (including initiator==approver).
  const [mergeExistingPos, setMergeExistingPos] = useState([]);
  const [mergeSelectedPo, setMergeSelectedPo] = useState(null);
  const [mergeProbeLoading, setMergeProbeLoading] = useState(false);
  const [quoteApprovalStatus, setQuoteApprovalStatus] = useState(preloadedQuoteApprovalStatus);
  const [otherChargesExpanded, setOtherChargesExpanded] = useState(false);
  const [globalTaxesExpanded, setGlobalTaxesExpanded] = useState(false);

  // Sync quoteApprovalStatus when parent refetches quotes (preloaded prop updates)
  useEffect(() => { setQuoteApprovalStatus(preloadedQuoteApprovalStatus); }, [preloadedQuoteApprovalStatus]);

  // Read hierarchies from parent prop (lifted to quote-compare.js to avoid N duplicate calls)
  const availableHierarchies = preloadedHierarchies?.hierarchies || [];
  const useLegacyHierarchy = preloadedHierarchies?.useLegacy ?? false;

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

  const handleApprovalActionComplete = () => {
    if (onRoundEnded) onRoundEnded(proditem?.id);
  };

  const handleCustomQuoteApprove = async (comment, handlerContext = {}) => {
    try {
      await approveNegotiationQuotes(proditem.id, comment, departmentId, handlerContext.existing_po_id || null);
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

  const getCellContent = (column, rowKey, rowMeta = {}) => {
    const details = column.details || {};

    if (column.isRegret) {
      if (rowKey === "total") {
        return <RegretStateCell reason={details.regret_reason || "Vendor declined this RFQ"} />;
      }
      return <EmptyValue />;
    }

    const previousQuotes = column.quote?.previous_quotes;

    switch (rowKey) {
      case "quantity":
        return <span className={styles.value}>{quantity || column.quantity || "--"}</span>;
      case "basePrice": {
        const current = getNumericValue(details.unit_price, column.quote?.unit_price, column.price);
        const prevQuote = findPreviousDifferent(
          previousQuotes,
          (prev) => getNumericValue(prev.unit_price) !== current
        );
        return (
          <PriceWithPrevious
            currentDisplay={formatCurrency(current)}
            previousDisplay={prevQuote ? formatCurrency(getNumericValue(prevQuote.unit_price)) : ""}
            previousExists={!!prevQuote}
            hasChanged={!!prevQuote}
          />
        );
      }
      case "subtotal": {
        const unitPrice = getNumericValue(details.unit_price, column.quote?.unit_price, column.price);
        const subtotal = getNumericValue(quantity, column.quantity, 0) * unitPrice;
        return <span className={styles.value}>{formatCurrency(subtotal)}</span>;
      }
      case "gst": {
        const currentMode = details.tax_mode;
        const currentValue = Number(details.tax || 0);
        const prevQuote = findPreviousDifferent(
          previousQuotes,
          (prev) => Number(prev.tax || 0) !== currentValue || prev.tax_mode !== currentMode
        );
        return (
          <PriceWithPrevious
            currentDisplay={formatModeValue(currentValue, currentMode)}
            previousDisplay={prevQuote ? formatModeValue(prevQuote.tax || 0, prevQuote.tax_mode) : ""}
            previousExists={!!prevQuote}
            hasChanged={!!prevQuote}
          />
        );
      }
      case "total": {
        const currentTotal = Math.round(column.total);
        const prevQuote = findPreviousDifferent(
          previousQuotes,
          (prev) => {
            const prevTotal = Math.round(getNumericValue(prev.total_price));
            return prevTotal > 0 && prevTotal !== currentTotal;
          }
        );
        return (
          <>
            <PriceWithPrevious
              currentDisplay={formatCurrency(currentTotal)}
              previousDisplay={prevQuote ? formatCurrency(getNumericValue(prevQuote.total_price)) : ""}
              previousExists={!!prevQuote}
              hasChanged={!!prevQuote}
            />
            <MissingCostIndicator parts={column.missingParts} />
          </>
        );
      }
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
      default: {
        // Accordion summary rows — read from engine output. The engine
        // applied the correct tax-inheritance rule, so this matches what
        // the line `total` reflects (and what gets persisted on save).
        if (rowMeta.type === "otherChargesSummary") {
          const otherCharges = details.other_charges || [];
          if (otherCharges.length === 0) return <span className={styles.value}>--</span>;
          const total = Number(details.engine?.charges_total || 0);
          return <span className={styles.value}>{formatCurrency(total)} <small className="text-muted">({otherCharges.length} charge{otherCharges.length > 1 ? "s" : ""})</small></span>;
        }
        if (rowMeta.type === "globalTaxesSummary") {
          const globalCharges = details.global_charges || column.quote?.global_charges || [];
          if (globalCharges.length === 0) return <span className={styles.value}>--</span>;
          const productTotal = Math.round(column.total);
          let total = 0;
          globalCharges.forEach(c => {
            const tax = Number(c.tax || 0);
            total += c.tax_mode === "percentage" ? (productTotal * tax) / 100 : tax;
          });
          return <span className={styles.value}>{formatCurrency(total)} <small className="text-muted">({globalCharges.length} tax{globalCharges.length > 1 ? "es" : ""})</small></span>;
        }
        // Handle dynamic other_charges and global_charges detail rows
        if (rowMeta.type === "otherCharge") {
          const otherCharges = details.other_charges || [];
          const charge = otherCharges.find(c => c.name === rowMeta.chargeName);
          if (!charge) return <span className={styles.value}>--</span>;
          const amountVal = Number(charge.amount || 0);
          const taxVal = Number(charge.tax || 0);
          const amountDisplay = charge.amount_mode === "percentage" ? `${amountVal}%` : formatCurrency(amountVal);
          const commentText = charge.comment ? ` (${charge.comment})` : "";
          let taxDisplay = "";
          if (taxVal > 0) {
            const taxUnit = charge.tax_mode === "percentage" ? `${taxVal}%` : formatCurrency(taxVal);
            taxDisplay = ` + ${taxUnit} tax${commentText}`;
          } else if (amountVal > 0) {
            // Check if base tax is auto-applied
            const baseTaxRate = (details.tax_mode ?? "percentage") === "percentage" ? (parseFloat(details.tax) || 0) : 0;
            if (baseTaxRate > 0) {
              taxDisplay = ` + ${baseTaxRate}% tax (auto-applied)`;
            }
          }
          return <span className={styles.value}>{amountDisplay}<small className="text-muted">{taxDisplay}</small></span>;
        }
        if (rowMeta.type === "globalCharge") {
          const globalCharges = details.global_charges || column.quote?.global_charges || [];
          const charge = globalCharges.find(c => c.name === rowMeta.chargeName);
          if (!charge) return <span className={styles.value}>--</span>;
          const taxVal = Number(charge.tax || 0);
          const taxDisplay = charge.tax_mode === "percentage" ? `${taxVal}%` : formatCurrency(taxVal);
          const commentText = charge.comment ? ` (${charge.comment})` : "";
          return <span className={styles.value}>{taxDisplay}{commentText && <small className="text-muted">{commentText}</small>}</span>;
        }
        if (rowKey === "grandTotal") {
          const globalCharges = details.global_charges || column.quote?.global_charges || [];
          const productTotal = Math.round(column.total);
          let globalTotal = 0;
          globalCharges.forEach(c => {
            const tax = Number(c.tax || 0);
            globalTotal += c.tax_mode === "percentage" ? (productTotal * tax) / 100 : tax;
          });
          return <span className={`${styles.value} fw-bold`}>{formatCurrency(productTotal + globalTotal)}</span>;
        }
        return <EmptyValue />;
      }
    }
  };

  const getCellClassName = (column, rowKey) => {
    if (column.isRegret) return styles.regretCell;

    const classes = [styles.productValueCell];

    if (highlightedMetricKeys.has(rowKey)) {
      classes.push(styles.highlightMetricCell);
    }

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

  // Effective lowest quote excludes vendors whose POs have been rejected
  // (either by the vendor themselves or by an internal approver). This is
  // what we surface to the buyer in the Lowest Bid card and use as the
  // default for the Finalize CTA — re-finalizing a rejected vendor would
  // just restart the same approval round we already know fails.
  const rejectedVendorIdSet = new Set(
    (vendorRejections || []).map((r) => String(r.vendor_id))
  );
  const effectiveLowestColumn = (model.columns || []).find(
    (col) => !col.isRegret && col.total > 0 && !rejectedVendorIdSet.has(String(col.vendorId))
  );
  const effectiveLowestQuote = effectiveLowestColumn
    ? effectiveLowestColumn.quote
    : lowestQuote;
  const lowestWasRejected =
    !!lowestQuote &&
    rejectedVendorIdSet.size > 0 &&
    (() => {
      const lowestVendorId = String(
        getVendorDetails(lowestQuote, proditem)?.id ||
          lowestQuote?.created_by ||
          ''
      );
      return lowestVendorId && rejectedVendorIdSet.has(lowestVendorId);
    })();

  return (
    <>
      {activeRound ? (
        <RoundEndActions
          activeRound={activeRound}
          roundQuotes={effectiveRoundQuotes.quotes}
          quoteApprovalStatus={quoteApprovalStatus}
        />
      ) : null}

      {quoteApprovalStatus?.approval_instance?.status ? (
        <div className="mb-3">
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
            preloadedInstances={preloadedInstances}
          />
        </div>
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
                  {
                    const colRejection = vendorRejections.find(
                      (r) => String(r.vendor_id) === String(column.vendorId)
                    );
                    if (colRejection) {
                      statuses.push({
                        label: colRejection.rejection_type === 'approver'
                          ? 'PO Rejected by Approver'
                          : 'PO Rejected by Vendor',
                        tone: 'danger',
                      });
                    }
                  }

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
                                href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${column.vendorId}&showContact=true`}
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
                                  activeRound && activeRound.status === 'ACTIVE' ? (
                                    <OverlayTrigger
                                      placement="left"
                                      overlay={<Tooltip>Negotiation round is ongoing, vendor finalization is restricted</Tooltip>}
                                    >
                                      <div
                                        style={{ cursor: 'not-allowed' }}
                                        id={`finalize_vendor_${column.vendorId}-vendor_actions-quote_compare_table`}
                                      >
                                        <Dropdown.Item
                                          href="#"
                                          disabled
                                          style={{ opacity: 0.5, pointerEvents: 'none' }}
                                        >
                                          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                          Finalize
                                        </Dropdown.Item>
                                      </div>
                                    </OverlayTrigger>
                                  ) : (
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
                                  )
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
              {(() => {
                const hasOtherCharges = (model.otherChargeNames || []).length > 0;
                const hasGlobalCharges = (model.globalChargeNames || []).length > 0;
                const otherChargeDetailRows = (model.otherChargeNames || []).map(name => ({ key: `otherCharge__${name}`, label: name, type: "otherCharge", chargeName: name }));
                const globalChargeDetailRows = (model.globalChargeNames || []).map(name => ({ key: `globalCharge__${name}`, label: name, type: "globalCharge", chargeName: name }));

                const renderRow = (row) => (
                  <tr key={`${proditem?.id}_${row.key}`} className={styles.productMetricRow}>
                    <th
                      className={`${styles.metricCell} ${styles.metricCellCompact} ${styles.stickyLeft} ${styles.productMetricLabelCell} ${highlightedMetricKeys.has(row.key) ? styles.highlightMetricLabel : ""}`}
                    >
                      {row.label}
                    </th>
                    {model.columns.map((column) => (
                      <td
                        className={getCellClassName(column, row.key)}
                        key={`${proditem?.id}_${row.key}_${column.vendorId}_${column.quote?.quote_id || "x"}`}
                      >
                        {getCellContent(column, row.key, row)}
                      </td>
                    ))}
                  </tr>
                );

                const renderAccordionRow = (label, isExpanded, onToggle, summaryKey) => (
                  <tr key={`${proditem?.id}_${summaryKey}`} className={styles.productMetricRow} style={{ cursor: "pointer" }} onClick={onToggle}>
                    <th
                      className={`${styles.metricCell} ${styles.metricCellCompact} ${styles.stickyLeft} ${styles.productMetricLabelCell}`}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {label}
                        <span style={{ fontSize: "0.7rem", color: "#6c757d" }}>{isExpanded ? "▲" : "▼"}</span>
                      </span>
                    </th>
                    {model.columns.map((column) => (
                      <td
                        className={getCellClassName(column, summaryKey)}
                        key={`${proditem?.id}_${summaryKey}_${column.vendorId}_${column.quote?.quote_id || "x"}`}
                      >
                        {getCellContent(column, summaryKey, { type: summaryKey })}
                      </td>
                    ))}
                  </tr>
                );

                return (
                  <>
                    {baseMetricRows.map(renderRow)}

                    {hasOtherCharges && renderAccordionRow("Other Charges", otherChargesExpanded, () => setOtherChargesExpanded(p => !p), "otherChargesSummary")}
                    {hasOtherCharges && otherChargesExpanded && otherChargeDetailRows.map(renderRow)}

                    {renderRow({ key: "total", label: "Total" })}

                    {hasGlobalCharges && renderAccordionRow("Global Taxes", globalTaxesExpanded, () => setGlobalTaxesExpanded(p => !p), "globalTaxesSummary")}
                    {hasGlobalCharges && globalTaxesExpanded && globalChargeDetailRows.map(renderRow)}

                    {hasGlobalCharges && renderRow({ key: "grandTotal", label: "Grand Total" })}

                    {afterTotalMetricRows.map(renderRow)}
                  </>
                );
              })()}
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

      {/* PO Rejection Alert — shown above the Lowest Bid section.
          Distinguishes vendor-rejection vs internal approver-rejection so the
          buyer immediately understands what happened, who did it and why. */}
      {vendorRejections.length > 0 && alreadyFinalized?.length == 0 && (() => {
        const eligible = model.columns.filter(c => !c.isRegret && c.total > 0);
        const rejectedVendorIds = new Set(vendorRejections.map(r => String(r.vendor_id)));
        const otherVendors = eligible.filter(c => !rejectedVendorIds.has(String(c.vendorId)));
        // vendorRejections arrives ordered by rejected_at DESC NULLS LAST from
        // the backend, so the freshest rejection is index 0. Pick that as the
        // headline source — earlier wording used [length - 1] which surfaced
        // the OLDEST event when multiple rejections existed for one product.
        const latestRejection = vendorRejections[0];
        const rejectedVendorName = latestRejection.vendor_organization || latestRejection.vendor_name;
        const isApproverRejection = latestRejection.rejection_type === 'approver';

        // Was the rejected vendor L1?
        const rejectedColumn = eligible.find(c => String(c.vendorId) === String(latestRejection.vendor_id));
        const wasL1 = rejectedColumn?.rank === 'L1';
        const noAlternatives = otherVendors.length === 0;

        const formatRejectedAt = (raw) => {
          if (!raw) return null;
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) return null;
          return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
          });
        };
        const rejectedAtDisplay = formatRejectedAt(latestRejection.rejected_at);

        const palette = noAlternatives
          ? { bg: '#FEF2F2', border: '#FECACA', titleColor: '#991B1B', subColor: '#7F1D1D', metaBg: '#FEE2E2', metaColor: '#7F1D1D', chipBg: '#FECACA', chipColor: '#7F1D1D' }
          : { bg: '#FFF7ED', border: '#FED7AA', titleColor: '#9A3412', subColor: '#7C2D12', metaBg: '#FFEDD5', metaColor: '#7C2D12', chipBg: '#FED7AA', chipColor: '#7C2D12' };

        const headline = isApproverRejection
          ? `Awarding approver rejected the PO for ${rejectedVendorName}`
          : `${rejectedVendorName} rejected the PO`;

        const chipLabel = isApproverRejection ? 'Approver rejection' : 'Vendor rejection';

        return (
          <div
            style={{
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              borderRadius: 12,
              padding: '14px 18px',
              marginTop: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  background: palette.chipBg,
                  color: palette.chipColor,
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                {chipLabel}
              </span>
              {latestRejection.po_number && (
                <span style={{ fontSize: 12, color: palette.subColor, opacity: 0.85 }}>
                  PO #{latestRejection.po_number}
                </span>
              )}
              {rejectedAtDisplay && (
                <span style={{ fontSize: 12, color: palette.subColor, opacity: 0.85, marginLeft: 'auto' }}>
                  {rejectedAtDisplay}
                </span>
              )}
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: palette.titleColor, marginBottom: 4 }}>
              {headline}
            </div>

            {(latestRejection.rejected_by_name || latestRejection.rejection_reason) && (
              <div
                style={{
                  marginTop: 6,
                  padding: '8px 10px',
                  background: palette.metaBg,
                  borderRadius: 8,
                  fontSize: 12.5,
                  color: palette.metaColor,
                  display: 'grid',
                  rowGap: 4,
                }}
              >
                {latestRejection.rejected_by_name && (
                  <div>
                    <strong>Rejected by:</strong>{' '}
                    {latestRejection.rejected_by_name}
                    {isApproverRejection && latestRejection.rejected_by_email
                      ? ` (${latestRejection.rejected_by_email})`
                      : ''}
                  </div>
                )}
                {latestRejection.rejection_reason && (
                  <div>
                    <strong>Reason:</strong> {latestRejection.rejection_reason}
                  </div>
                )}
              </div>
            )}

            {(() => {
              if (noAlternatives) {
                return (
                  <div style={{ fontSize: 12.5, color: palette.subColor, marginTop: 8, lineHeight: 1.55 }}>
                    {isApproverRejection
                      ? 'The vendor was de-finalized. No other vendor has a valid quote for this product. You can re-finalize this vendor or extend the quote submission date.'
                      : 'No other vendor has quoted for this product. You may wait for additional quotes or finalize this vendor again below.'}
                  </div>
                );
              }
              const suggested = wasL1 ? otherVendors[0] : eligible[0];
              const suggestLabel = wasL1
                ? `Recommended next: L2 — ${suggested?.vendorName}`
                : `Recommended next: L1 — ${suggested?.vendorName}`;
              return (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: palette.metaBg,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: palette.titleColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 15 }}>→</span>
                  {suggestLabel}
                  {suggested && (
                    <span style={{ fontWeight: 400, marginLeft: 4, opacity: 0.85 }}>
                      (Rs. {addCommasToNumber(suggested.total)})
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {alreadyFinalized?.length == 0 ? (
        <div className={styles.footerCards}>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>
              {lowestWasRejected ? 'Next Best Bid' : 'Lowest Bid'}
            </p>
            <p className={styles.footerValue}>
              {effectiveLowestQuote
                ? getVendorDetails(effectiveLowestQuote, proditem)?.organization_name ||
                  getVendorDetails(effectiveLowestQuote, proditem)?.name ||
                  getVendorDetails(effectiveLowestQuote, proditem)?.email ||
                  "Unknown Vendor"
                : "--"}
            </p>
            {lowestWasRejected && effectiveLowestQuote && (
              <p
                style={{
                  fontSize: 11.5,
                  color: '#9A3412',
                  margin: '4px 0 0',
                  fontWeight: 500,
                }}
              >
                L1 was rejected - showing next eligible vendor.
              </p>
            )}
            {effectiveLowestQuote ? (
              <div className={styles.footerContactRow}>
                <Link href={`mailto:${getVendorDetails(effectiveLowestQuote, proditem)?.email || ""}`} className={styles.footerContactLink}>
                  <FontAwesomeIcon icon={faEnvelope} />
                </Link>
                <Link
                  href={`tel:${getVendorDetails(effectiveLowestQuote, proditem)?.mobile || ""}`}
                  className={styles.footerContactLink}
                  id="call_lowest_bidder-quote_actions-quote_compare_table"
                >
                  <FontAwesomeIcon icon={faPhone} />
                </Link>
              </div>
            ) : null}
          </div>
          <div className={styles.footerCard}>
            <p className={styles.footerLabel}>
              {lowestWasRejected ? 'Next Best Total' : 'Lowest Total'}
            </p>
            <p className={styles.footerValue}>
              {effectiveLowestQuote ? formatCurrency(getQuoteTotal(proditem, effectiveLowestQuote, normalizeFilter)) : "--"}
            </p>
          </div>
          <div className={`${styles.footerCard} ${styles.footerCardAction}`}>
            <p className={styles.footerLabel}>Finalize</p>
            {!is_tender ? (
              isRfqClosed ? (
                <>
                  <p className={styles.footerValueMuted}>This RFQ has been closed and no further actions can be taken.</p>
                </>
              ) : (
                <>
                  <p className={styles.footerValueMuted}>
                    {activeRound && activeRound.status === 'ACTIVE'
                      ? 'Vendor finalization is restricted while a negotiation round is active for this product.'
                      : 'Select and confirm the winning vendor for this product to proceed with Purchase Order creation.'}
                  </p>
                  {(() => {
                    const isActiveRoundBlocking = activeRound && activeRound.status === 'ACTIVE';
                    const noPermission = !canWrite || permissionsLoading;
                    const notInHierarchy = useLegacyHierarchy && availableHierarchies.length <= 0;
                    const isDisabled = isActiveRoundBlocking || noPermission || notInHierarchy || !effectiveLowestQuote;

                    const tooltipText = isActiveRoundBlocking
                      ? 'Negotiation round is ongoing, vendor finalization is restricted'
                      : noPermission
                      ? 'Required permission is missing'
                      : notInHierarchy
                      ? 'You are not part of the approval hierarchy'
                      : null;

                    const btn = (
                      <button
                        type="button"
                        className={`${styles.footerBtn} ${styles.footerBtnPrimary}`}
                        onClick={() => {
                          setCurrentItem(effectiveLowestQuote);
                          setActiveModal("finalize");
                        }}
                        disabled={isDisabled}
                        style={isDisabled ? { pointerEvents: 'none' } : undefined}
                        id="finalize_vendor-quote_actions-quote_compare_table"
                      >
                        Finalize Vendor
                      </button>
                    );

                    return tooltipText ? (
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>{tooltipText}</Tooltip>}
                      >
                        <span style={{ display: 'block', width: '100%', cursor: 'not-allowed' }}>
                          {btn}
                        </span>
                      </OverlayTrigger>
                    ) : btn;
                  })()}
                </>
              )
            ) : (
              <p className={styles.footerValueMuted}>Vendor finalization is handled via the tender workflow.</p>
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
              <>
                <p className={styles.footerValueMuted}>
                  {finalizedHistory.length} finalization record{finalizedHistory.length > 1 ? "s" : ""} found.
                </p>
                <button
                  className={`${styles.footerBtn} ${styles.footerBtnOutline}`}
                  onClick={() => setActiveModal("finalize_history")}
                  id="view_finalization_history-finalization_actions-quote_compare_table"
                >
                  View History
                </button>
              </>
            ) : (
              <p className={styles.footerValueMuted}>No finalization history available.</p>
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
        onHide={() => { if (!finalizeLoading && !mergeProbeLoading) setActiveModal(null); }}
        loading={finalizeLoading || mergeProbeLoading}
        onConfirm={async () => {
          const isTender = proditem?.rfq?.[0]?.is_tender === 1 || proditem?.rfq?.[0]?.is_tender === true;
          const routeType = isTender ? "ARC" : "PO";
          setSelectedRouteType(routeType);

          // Helper that runs the actual finalize call (after merge selection,
          // hierarchy selection, or directly when neither applies).
          const runFinalize = async (poIdForMerge) => {
            if (routeType === "ARC") {
              const result = await handleFinalize(currentItem, proditem, poIdForMerge, null, "ARC");
              if (result?.success !== false) setActiveModal(null);
            } else if (!useLegacyHierarchy) {
              const result = await handleFinalize(currentItem, proditem, poIdForMerge, null, "PO");
              if (result?.success !== false) setActiveModal(null);
            } else if (availableHierarchies.length <= 0) {
              toast.error(
                "You cannot finalize a vendor, as you don't belong to the PO approval hierarchy"
              );
              setActiveModal(null);
            } else {
              setActiveModal("hierarchy");
            }
          };

          // ARC has no PO concept — no merge probe needed.
          if (routeType === "ARC") {
            await runFinalize(null);
            return;
          }

          const vendorIdForProbe =
            getVendorDetails(currentItem, proditem)?.id ||
            currentItem?.quote_details?.created_by;
          if (!vendorIdForProbe || !activeRfqId) {
            await runFinalize(null);
            return;
          }

          // Probe for existing draft POs AND check whether the calling user
          // will be the final NEGOTIATION_QUOTE approver. Only the final
          // approver gets the merge prompt — for everyone else the question
          // naturally rolls up to whoever closes the chain (handled by
          // ApprovalWorkflowSection's approval-time merge check). Both
          // probes run in parallel and either failing is non-fatal.
          try {
            setMergeProbeLoading(true);
            const [posResponse, finalApproverResponse] = await Promise.all([
              getExistingPOByVendor(vendorIdForProbe, activeRfqId).catch((e) => {
                console.error("Existing-PO probe failed:", e);
                return null;
              }),
              predictWillBeFinalApprover({
                entity_type: 'NEGOTIATION_QUOTE',
                // rfq_id lets the BE derive process_id (and the rest of the
                // hospitality scope) directly from tbl_rfq, matching exactly
                // what createApprovalInstance will use at submit time. Without
                // this, process-scoped policies wouldn't be found and the
                // probe would falsely return false for sole-approver cases.
                rfq_id: activeRfqId,
                hospitality_company_id: hospitalityCompanyId,
                hotel_id: hotelId,
                department_id: departmentId,
              }).catch((e) => {
                console.error("Final-approver probe failed:", e);
                return null;
              }),
            ]);
            const pos = posResponse?.existingPOS ?? [];
            const willBeFinal = !!(finalApproverResponse?.data?.willBeFinal);
            if (pos.length > 0 && willBeFinal) {
              setMergeExistingPos(pos);
              setMergeSelectedPo(null);
              setExistingPOId(null);
              setActiveModal("merge_po");
            } else {
              await runFinalize(null);
            }
          } catch (err) {
            console.error("Merge-PO gate failed, finalizing without merge:", err);
            await runFinalize(null);
          } finally {
            setMergeProbeLoading(false);
          }
        }}
        vendorName={
          getVendorDetails(currentItem, proditem)?.organization_name ||
          getVendorDetails(currentItem, proditem)?.name ||
          "Vendor"
        }
        vendorDetails={getVendorDetails(currentItem, proditem)}
        vendorId={getVendorDetails(currentItem, proditem)?.id || currentItem?.quote_details?.created_by}
        rfqId={activeRfqId}
        quotedPrice={currentItem?.engine_grand_total ?? currentItem?.total_price}
        productDetails={proditem?.product_details}
        alreadyFinalized={alreadyFinalized}
        availableBudget={availableBudget}
        vendorRejections={vendorRejections}
        finalizationHistory={finalizedHistory}
      />

      <HierarchySelectionModal
        show={activeModal === "hierarchy"}
        onHide={() => { if (!finalizeLoading) setActiveModal(null); }}
        hierarchies={availableHierarchies}
        onConfirm={async (selectedHierarchy) => {
          const result = await handleFinalize(currentItem, proditem, existingPOId, selectedHierarchy, selectedRouteType || "PO");
          if (result?.success !== false) setActiveModal(null);
        }}
      />

      <ExistingPOModal
        show={activeModal === "merge_po"}
        onHide={() => { if (!finalizeLoading) setActiveModal(null); }}
        loading={finalizeLoading}
        existingPos={mergeExistingPos}
        selectedPo={mergeSelectedPo}
        setSelectedPo={setMergeSelectedPo}
        onConfirm={async (selectedPOId) => {
          const poIdForMerge = selectedPOId || null;
          setExistingPOId(poIdForMerge);
          const route = selectedRouteType || "PO";
          if (!useLegacyHierarchy) {
            const result = await handleFinalize(currentItem, proditem, poIdForMerge, null, route);
            if (result?.success !== false) setActiveModal(null);
          } else if (availableHierarchies.length <= 0) {
            toast.error(
              "You cannot finalize a vendor, as you don't belong to the PO approval hierarchy"
            );
            setActiveModal(null);
          } else {
            setActiveModal("hierarchy");
          }
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
      />
    </>
  );
};

export default ProductComparisonMatrix;
