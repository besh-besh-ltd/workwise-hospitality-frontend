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
import { BsInfoCircle } from "react-icons/bs";
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

// Map matrix row keys → negotiation field slugs in
// tbl_negotiation_rounds.vendor_approvals[].negotiation_fields[].name.
// Used to overlay an "approved target" badge on a vendor's cell when an
// ACTIVE negotiation round is running on that field. Charge-detail rows
// (otherCharge__<name>, globalCharge__<name>) match dynamically by chargeName.
const FIELD_SLUG_FOR_ROW_KEY = {
  basePrice: "base_price",
  delivery: "delivery_period",
  payment: "payment_terms",
  terms: "vendor_tc",
  comment: "comment",
  documents: "documents",
};

// Return the vendor's approved negotiation target for a given matrix row,
// or null when the round isn't ACTIVE, the vendor has no targets in the
// round, or the row isn't a negotiable field.
const getActiveRoundTargetForCell = (activeRound, vendorId, rowKey, rowMeta) => {
  if (!activeRound || activeRound.status !== "ACTIVE") return null;
  if (vendorId == null) return null;

  const va = (activeRound.vendor_approvals || []).find(
    (v) => String(v?.vendor_id) === String(vendorId)
  );
  if (!va || !Array.isArray(va.negotiation_fields)) return null;

  // Skip system entries that don't represent a target field (e.g. trailing
  // `_mode` markers stored alongside the actual value).
  const usable = va.negotiation_fields.filter(
    (f) => f && f.name && !/_mode$/.test(f.name) && f.target !== "" && f.target != null
  );
  if (usable.length === 0) return null;

  let match = null;
  if (FIELD_SLUG_FOR_ROW_KEY[rowKey]) {
    match = usable.find((f) => f.name === FIELD_SLUG_FOR_ROW_KEY[rowKey]);
  } else if (rowMeta?.type === "otherCharge" || rowMeta?.type === "globalCharge") {
    const target = String(rowMeta.chargeName || "").toLowerCase();
    match = usable.find((f) => String(f.name || "").toLowerCase() === target);
  }
  if (!match) return null;

  // Mode lives on the field object itself (`mode: 'percentage' | 'absolute'`),
  // written by the negotiation creation flow alongside the value. Legacy rows
  // may also carry a sibling `<slug>_mode` entry — read it as a fallback.
  const fallbackModeEntry = va.negotiation_fields.find(
    (f) => f?.name === `${match.name}_mode`
  );
  return {
    value: match.target,
    mode: match.mode || fallbackModeEntry?.target || null,
    slug: match.name,
  };
};

const TargetBadge = ({ target, rowKey }) => {
  if (!target || target.value === "" || target.value == null) return null;

  const isNumeric = !Number.isNaN(Number(target.value));
  // Negotiation mode values from BE: 'percentage' | 'absolute' (NegotiationModal
  // remaps the UI's 'amount' to 'absolute' before posting). Accept both spellings
  // so legacy rounds still render correctly.
  const isAbsoluteMode = target.mode === "absolute" || target.mode === "amount";
  const isPercentMode = target.mode === "percentage";
  let display;
  if (rowKey === "basePrice" && isNumeric) {
    display = `Rs. ${addCommasToNumber(Number(target.value))}`;
  } else if (rowKey === "delivery" && isNumeric) {
    display = `${Number(target.value)} day(s)`;
  } else if (isPercentMode && isNumeric) {
    display = `${Number(target.value)}%`;
  } else if (isAbsoluteMode && isNumeric) {
    display = `Rs. ${addCommasToNumber(Number(target.value))}`;
  } else {
    display = String(target.value);
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
        padding: "2px 8px",
        fontSize: 10.5,
        fontWeight: 600,
        color: "#854D0E",
        background: "#FEF3C7",
        border: "1px solid #FDE68A",
        borderRadius: 999,
        lineHeight: 1.3,
      }}
      title="Approved negotiation target for this vendor on this field"
    >
      <span aria-hidden="true">◎</span>
      Target: {display}
    </div>
  );
};

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
  return `Rs. ${addCommasToNumber(num)}`;
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

const fileToUrl = (file) => (typeof file === "string" ? file : file?.file_url);
const fileReplaces = (file) => (file && typeof file === "object" ? file.replaces : null);

// Diff prev vs current files for strikethrough rendering:
// - `replaced` pairs `{old, new}` when a current file's `replaces` matches a prev URL
// - `removed` are prev URLs absent from current and not part of any replacement
const fileDiffSince = (currentFiles, previousQuotes, prevFilesKey) => {
  if (!Array.isArray(previousQuotes) || previousQuotes.length === 0) {
    return { removed: [], replaced: [] };
  }
  const current = Array.isArray(currentFiles) ? currentFiles : [];
  const prevFiles = previousQuotes[0]?.[prevFilesKey] || [];
  const prevByUrl = new Map();
  prevFiles.forEach((f) => {
    const url = fileToUrl(f);
    if (url) prevByUrl.set(url, f);
  });
  const currentSet = new Set(current.map(fileToUrl).filter(Boolean));

  const replaced = [];
  const replacedOldUrls = new Set();
  current.forEach((cf) => {
    const oldUrl = fileReplaces(cf);
    if (oldUrl && prevByUrl.has(oldUrl)) {
      replaced.push({ old: prevByUrl.get(oldUrl), new: cf });
      replacedOldUrls.add(oldUrl);
    }
  });

  const removed = prevFiles.filter((f) => {
    const url = fileToUrl(f);
    return url && !currentSet.has(url) && !replacedOldUrls.has(url);
  });

  return { removed, replaced };
};

const renderFileLinks = (files = [], label = "View File", diff = { removed: [], replaced: [] }) => {
  const currentFiles = Array.isArray(files) ? files.filter((f) => fileToUrl(f)) : [];
  const removed = Array.isArray(diff?.removed) ? diff.removed.filter((f) => fileToUrl(f)) : [];
  const replaced = Array.isArray(diff?.replaced) ? diff.replaced : [];
  const replacedNewUrls = new Set(replaced.map((p) => fileToUrl(p.new)).filter(Boolean));
  const standalone = currentFiles.filter((f) => !replacedNewUrls.has(fileToUrl(f)));

  if (standalone.length === 0 && removed.length === 0 && replaced.length === 0) {
    return <EmptyValue />;
  }

  return (
    <div className={styles.innerScrollTall}>
      {standalone.map((file, index) => {
        const fileUrl = fileToUrl(file);
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
      {replaced.map((pair, index) => {
        const oldUrl = fileToUrl(pair.old);
        const newUrl = fileToUrl(pair.new);
        return (
          <div key={`replaced_${oldUrl}_${index}`} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <a
              href={oldUrl}
              target="_blank"
              rel="noreferrer"
              className="page-link p-0"
              style={{ textDecoration: "line-through", color: "#9aa0a6" }}
              title="Replaced in current round"
            >
              {label}
            </a>
            <a
              href={newUrl}
              target="_blank"
              rel="noreferrer"
              className="page-link p-0"
              style={{ fontSize: "0.78rem" }}
              title="Replacement file"
            >
              ↳ {label}
            </a>
          </div>
        );
      })}
      {removed.map((file, index) => {
        const fileUrl = fileToUrl(file);
        return (
          <a
            key={`removed_${fileUrl}_${index}`}
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="page-link p-0"
            style={{ textDecoration: "line-through", color: "#9aa0a6" }}
            title="Removed since previous round"
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
  const [selectedRouteType, setSelectedRouteType] = useState(null);
  const [finalizeComment, setFinalizeComment] = useState('');
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
        // The "Total" row shows the per-LINE engine total (base + base_tax +
        // per-line other_charges). Document-level global charges (TCS, doc
        // fees) are added explicitly in the "Global Taxes" row below and
        // rolled into the "Grand Total" row at the end. If we used
        // column.total here (which is the grand_total used elsewhere for
        // vendor headers), the subsequent "Global Taxes" / "Grand Total"
        // rows would double-count the globals.
        const lineEngineTotal = Number(
          details?.engine?.total ?? column.quote?.engine_total ?? column.total
        );
        const currentTotal = lineEngineTotal;
        const prevQuote = findPreviousDifferent(
          previousQuotes,
          (prev) => {
            const prevTotal = getNumericValue(prev.total_price);
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
        return renderFileLinks(
          column.documentFiles,
          "View File",
          fileDiffSince(column.documentFiles, previousQuotes, "document_files")
        );
      case "terms":
        return renderFileLinks(
          column.termsFiles,
          "View File",
          fileDiffSince(column.termsFiles, previousQuotes, "global_document_files")
        );
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
          // Prefer the BE's authoritative engine_global_charges_total (rounded
          // consistently with the rest of the app); compute locally only as a
          // fallback for legacy responses without engine output.
          const engineTotalFromApi = Number(
            details?.engine_global_charges_total ?? column.quote?.engine_global_charges_total ?? 0
          );
          let total = engineTotalFromApi;
          if (!(total > 0)) {
            // Apply globals to the per-LINE engine total, not to column.total
            // (which is the grand total — line + globals — used elsewhere for
            // vendor headers). Using grand here would double-count.
            const lineEngineTotal = Number(
              details?.engine?.total ?? column.quote?.engine_total ?? column.total
            );
            globalCharges.forEach(c => {
              const tax = Number(c.tax ?? c.amount ?? 0);
              const mode = c.tax_mode ?? c.amount_mode ?? "percentage";
              const chargeBase = mode === "percentage" ? (lineEngineTotal * tax) / 100 : tax;
              const extraTax = Number(c.additional_tax ?? 0);
              const extraMode = c.additional_tax_mode ?? "percentage";
              const extraTaxAmt = extraTax > 0 ? (extraMode === "percentage" ? (chargeBase * extraTax) / 100 : extraTax) : 0;
              total += chargeBase + extraTaxAmt;
            });
          }
          return <span className={styles.value}>{formatCurrency(total)} <small className="text-muted">({globalCharges.length} tax{globalCharges.length > 1 ? "es" : ""})</small></span>;
        }
        // Handle dynamic other_charges and global_charges detail rows
        if (rowMeta.type === "otherCharge") {
          const otherCharges = details.other_charges || [];
          const charge = otherCharges.find(c => c.name === rowMeta.chargeName);
          if (!charge) return <span className={styles.value}>--</span>;
          // Render a charge as "amount + tax (comment)". When includeAutoApplied
          // is true and the vendor left tax blank, fall back to the base-GST
          // auto-applied annotation — only available for the current quote
          // because it reads from details.engine.
          const renderChargeNode = (c, includeAutoApplied) => {
            const amountVal = Number(c.amount || 0);
            const taxVal = Number(c.tax || 0);
            const amountDisplay = c.amount_mode === "percentage" ? `${amountVal}%` : formatCurrency(amountVal);
            const commentText = c.comment ? ` (${c.comment})` : "";
            let taxDisplay = "";
            let taxIncludesComment = false;
            if (taxVal > 0) {
              const taxUnit = c.tax_mode === "percentage" ? `${taxVal}%` : formatCurrency(taxVal);
              taxDisplay = ` + ${taxUnit} tax${commentText}`;
              taxIncludesComment = true;
            } else if (amountVal > 0 && includeAutoApplied) {
              const engineCharges = details?.engine?.charges || [];
              const engineCharge = engineCharges.find(
                ec => (ec.slug && c.slug && ec.slug === c.slug) || ec.name === c.name
              );
              const engineTax = Number(engineCharge?.tax || 0);
              if (engineTax > 0) {
                const baseTaxRate = (details.tax_mode ?? "percentage") === "percentage" ? (parseFloat(details.tax) || 0) : 0;
                if (baseTaxRate > 0) {
                  taxDisplay = ` + ${baseTaxRate}% tax (auto-applied)`;
                }
              }
            }
            const trailingComment = !taxIncludesComment && commentText ? commentText : "";
            return <>{amountDisplay}<small className="text-muted">{taxDisplay}{trailingComment}</small></>;
          };
          const prevQuote = findPreviousDifferent(
            previousQuotes,
            (prev) => {
              const prevCharge = (prev.other_charges || []).find(c => c.name === charge.name);
              if (!prevCharge) return false;
              return (
                Number(prevCharge.amount || 0) !== Number(charge.amount || 0) ||
                (prevCharge.amount_mode || "percentage") !== (charge.amount_mode || "percentage") ||
                Number(prevCharge.tax || 0) !== Number(charge.tax || 0) ||
                (prevCharge.tax_mode || "percentage") !== (charge.tax_mode || "percentage") ||
                (prevCharge.comment || "") !== (charge.comment || "")
              );
            }
          );
          const prevCharge = prevQuote ? (prevQuote.other_charges || []).find(c => c.name === charge.name) : null;
          return (
            <PriceWithPrevious
              currentDisplay={renderChargeNode(charge, true)}
              previousDisplay={prevCharge ? renderChargeNode(prevCharge, false) : ""}
              previousExists={!!prevCharge}
              hasChanged={!!prevCharge}
            />
          );
        }
        if (rowMeta.type === "globalCharge") {
          const globalCharges = details.global_charges || column.quote?.global_charges || [];
          const charge = globalCharges.find(c => c.name === rowMeta.chargeName);
          if (!charge) return <span className={styles.value}>--</span>;
          // Both on-disk shapes coexist: legacy {tax, tax_mode} and newer
          // {amount, amount_mode}. Read both so the displayed value + mode
          // match what the engine actually applied.
          const taxVal = Number(charge.tax ?? charge.amount ?? 0);
          const mode = charge.tax_mode ?? charge.amount_mode ?? "percentage";
          const taxDisplay = mode === "percentage" ? `${taxVal}%` : formatCurrency(taxVal);
          const commentText = charge.comment ? ` (${charge.comment})` : "";
          // Additional tax on the charge itself (e.g. 10% tax on TCS).
          // Resolve to ₹ using this product's engine share so the buyer sees
          // the same amount the vendor's send-quote page shows.
          const extraTaxRate = Number(charge.additional_tax ?? 0);
          const extraTaxMode = charge.additional_tax_mode ?? "percentage";
          let extraTaxDisplay = null;
          if (extraTaxRate > 0) {
            const engineGlobalsForTax = details.engine_global_charges || column.quote?.engine_global_charges || [];
            const resolvedForTax = engineGlobalsForTax.find((c) =>
              (c.slug && charge.slug && c.slug === charge.slug) || c.name === charge.name
            );
            const shareForTax = Number(resolvedForTax?.amount || 0);
            const extraTaxAmt = extraTaxMode === "percentage"
              ? (shareForTax * extraTaxRate) / 100
              : extraTaxRate;
            if (extraTaxAmt > 0) {
              extraTaxDisplay = ` + ${formatCurrency(extraTaxAmt)} tax`;
            }
          }
          // Absolute (rupee) global charges are entered ONCE for the vendor's
          // whole quote and the backend distributes them proportionally across
          // the products in that quote (each product carries its weighted
          // share, not the full amount). Surface this with an info tooltip so
          // the buyer doesn't read "Rs. 1,000" in this cell as "added directly
          // to this product". Percentage charges don't need it because "5%"
          // is already the per-product rate the buyer expects.
          let distributionInfo = null;
          if (mode !== "percentage" && taxVal > 0) {
            const engineGlobals = details.engine_global_charges || column.quote?.engine_global_charges || [];
            const resolved = engineGlobals.find((c) =>
              (c.slug && charge.slug && c.slug === charge.slug) || c.name === charge.name
            );
            const share = Number(resolved?.amount || 0);
            distributionInfo = (
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip>
                    The global charge was added only on the entire quote. It was then divided and shared across all products in this RFQ.                     
                    {share > 0 && (
                      <>This product's share is <strong>{formatCurrency(share)}</strong>.</>
                    )}
                  </Tooltip>
                }
              >
                <span className="ms-1 text-muted" style={{ cursor: "help", display: "inline-flex", verticalAlign: "middle" }}>
                  <BsInfoCircle size={12} />
                </span>
              </OverlayTrigger>
            );
          }
          return (
            <span className={styles.value}>
              {taxDisplay}
              {extraTaxDisplay && <small className="text-muted">{extraTaxDisplay}</small>}
              {commentText && <small className="text-muted">{commentText}</small>}
              {distributionInfo}
            </span>
          );
        }
        if (rowKey === "grandTotal") {
          const globalCharges = details.global_charges || column.quote?.global_charges || [];
          // Grand Total = per-line engine total + global charges applied to
          // the per-line total. Reads engine.total directly (NOT column.total,
          // which already has globals folded in for the vendor header — using
          // it here would double-count). Falls back to column.total only when
          // engine output isn't available (legacy responses).
          const lineEngineTotal = Number(
            details?.engine?.total ?? column.quote?.engine_total ?? column.total
          );
          let globalTotal = 0;
          globalCharges.forEach(c => {
            const tax = Number(c.tax ?? c.amount ?? 0);
            const mode = c.tax_mode ?? c.amount_mode ?? "percentage";
            const chargeBase = mode === "percentage" ? (lineEngineTotal * tax) / 100 : tax;
            const extraTax = Number(c.additional_tax ?? 0);
            const extraMode = c.additional_tax_mode ?? "percentage";
            const extraTaxAmt = extraTax > 0 ? (extraMode === "percentage" ? (chargeBase * extraTax) / 100 : extraTax) : 0;
            globalTotal += chargeBase + extraTaxAmt;
          });
          // Prefer the BE's authoritative engine_grand_total when it's
          // present (rounded consistently with the rest of the app); compute
          // locally only as a fallback for legacy responses.
          const grandFromApi = Number(
            details?.engine_grand_total ?? column.quote?.engine_grand_total ?? 0
          );
          const grand = grandFromApi > 0 ? grandFromApi : lineEngineTotal + globalTotal;
          return <span className={`${styles.value} fw-bold`}>{formatCurrency(grand)}</span>;
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
                    {model.columns.map((column) => {
                      const target = column.isRegret
                        ? null
                        : getActiveRoundTargetForCell(activeRound, column.vendorId, row.key, row);
                      return (
                        <td
                          className={getCellClassName(column, row.key)}
                          key={`${proditem?.id}_${row.key}_${column.vendorId}_${column.quote?.quote_id || "x"}`}
                        >
                          {getCellContent(column, row.key, row)}
                          {target && (
                            <div style={{ marginTop: 4 }}>
                              <TargetBadge target={target} rowKey={row.key} />
                            </div>
                          )}
                        </td>
                      );
                    })}
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
        onHide={() => { if (!finalizeLoading) setActiveModal(null); }}
        loading={finalizeLoading}
        onConfirm={async (_selectedPOId, commentFromModal) => {
          const commentTrimmed = (commentFromModal || '').trim();
          setFinalizeComment(commentTrimmed);
          const isTender = proditem?.rfq?.[0]?.is_tender === 1 || proditem?.rfq?.[0]?.is_tender === true;
          const routeType = isTender ? "ARC" : "PO";
          setSelectedRouteType(routeType);

          // PO merge decision is made server-side in draftPurchaseOrder
          // (auto-merges into an existing draft PO when rfq + vendor +
          // project + selected_hierarchy match). Frontend always passes
          // null for the merge target.
          if (routeType === "ARC") {
            const result = await handleFinalize(currentItem, proditem, null, null, "ARC", commentTrimmed);
            if (result?.success !== false) setActiveModal(null);
          } else if (!useLegacyHierarchy) {
            const result = await handleFinalize(currentItem, proditem, null, null, "PO", commentTrimmed);
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
          const result = await handleFinalize(currentItem, proditem, null, selectedHierarchy, selectedRouteType || "PO", finalizeComment);
          if (result?.success !== false) setActiveModal(null);
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
