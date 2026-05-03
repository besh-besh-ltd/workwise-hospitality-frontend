import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { extractQuotation, fetchQuoteHistory, getRFQById, sendQuotation, updateQuotation, createTenderPaymentOrder, verifyTenderPayment, getChargeNames, createChargeName, updateChargeName, deleteChargeName, deleteQuoteFile } from "@/services/rfq";
import PlaceholderLoading from "react-placeholder-loading";
import Loader from "@/components/shared/Loader";
import { toast } from "react-toastify";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import ReadMore from "@/components/shared/ReadMore";
import { faFile } from "@fortawesome/free-regular-svg-icons";
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { extractfileName, extractParsedNumber, formatDisplayDate, formatPrice, handleFileUpload, moneyOrPercent, toNumber } from "@/utils/sharedFunctions";
import { faDeleteLeft, faDownload, faMinus, faPlus, faRemove } from "@fortawesome/free-solid-svg-icons";
import { renderFileLink } from "@/utils/elementFunctions";
import SmartButton from "@/components/shared/SmartButton";
import { QuotesOverrideModal } from "@/components/modal/ExtractedQuotesModal";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { FiTrash2, FiChevronDown, FiChevronUp, FiCheck, FiX, FiEdit2 } from "react-icons/fi";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import QuoteHistoryModal from "@/components/modal/QuoteHistoryModal";
import VendorQuoteHistoryModal from "@/components/modal/VendorQuoteHistoryModal";
import ProductNegotiationBadge from "./ProductNegotiationBadge";
import Modal from "react-modal";
import { checkOpenClarification } from "@/services/clarification";
import { getAllVendorNegotiationStatus, getAllActiveNegotiationRounds } from "@/services/negotiation";
import { checkBidExpired } from "@/utils/sharedFunctions";
import { Alert, OverlayTrigger, Tooltip as BsTooltip } from "react-bootstrap";
import { Tooltip } from "react-tooltip";
import GrandTotalBreakup from "@/components/shared/GrandTotalBreakup";
import usePreviewTotals from "@/hooks/usePreviewTotals";

const PercentageAbsoluteToggle = ({ currentMode, onToggle, size = "sm", disabled = false }) => {
  const baseStyle = {
    padding: "0 0.5rem",
    height: "31px",
    lineHeight: "1",
    fontSize: "0.8rem",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.3s ease",
    opacity: disabled ? 0.6 : 1,
  };
  return (
    <div className="d-flex" role="group" style={{ flexShrink: 0 }}>
      <button type="button"
        onClick={() => { if (!disabled) onToggle('percentage'); }}
        disabled={disabled}
        style={{
          ...baseStyle,
          borderRadius: "4px 0 0 4px",
          backgroundColor: currentMode === 'percentage' ? 'var(--primary-color)' : 'var(--dark-grey-color)',
          color: currentMode === 'percentage' ? '#fff' : '#000',
        }}
      >%</button>
      <button type="button"
        onClick={() => { if (!disabled) onToggle('absolute'); }}
        disabled={disabled}
        style={{
          ...baseStyle,
          borderRadius: "0 4px 4px 0",
          backgroundColor: currentMode === 'absolute' ? 'var(--primary-color)' : 'var(--dark-grey-color)',
          color: currentMode === 'absolute' ? '#fff' : '#000',
        }}
      >₹</button>
    </div>
  );
};

// Hover-driven info tooltip with explicit high z-index so it renders above
// the surrounding modal (Bootstrap modal stacking sits around 1050; the
// floating bubble forces 99999 so it never gets covered). Pure JS state
// instead of react-bootstrap's OverlayTrigger to side-step portal/z-index
// quirks observed inside Modal contexts.
const CustomInfoTooltip = ({ text, size = 14, placement = "top" }) => {
  const [show, setShow] = useState(false);
  const verticalProps = placement === "bottom"
    ? { top: "100%", marginTop: 6 }
    : { bottom: "100%", marginBottom: 6 };
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help", color: "#6c757d" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <IoMdInformationCircleOutline size={size} />
      {show && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#212529",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 4,
            fontSize: "0.72rem",
            lineHeight: 1.35,
            width: "max-content",
            maxWidth: 240,
            whiteSpace: "normal",
            textAlign: "center",
            zIndex: 99999,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            ...verticalProps,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};


const SendQuotePageComp = () => {
  const router = useRouter();
  const { id, token, type: pageType } = router.query;
  const showTechEvalRestrictionsParam = router.query.showTechEvalRestrictions === 'true';
  const [regretModal, setregretModal] = useState(false);
  const [rfqDetails, setrfqDetails] = useState(null);
  const [loading, setloading] = useState(false);
  const [quoteProducts, setquoteProducts] = useState([]);
  const [submitLoading, setsubmitLoading] = useState(false);
  const [showSubmitQuoteConfirmModal, setShowSubmitQuoteConfirmModal] = useState(false);


  const [chargesMode, setChargesMode] = useState({
    tax: { global: "percentage" },
  })

  const [globalFreight, setglobalFreight] = useState(0);
  const [globalPackaging, setglobalPackaging] = useState(0);
  const [globalOtherCharges, setGlobalOtherCharges] = useState([]);
  const [chargesModalOpen, setChargesModalOpen] = useState(null);
  const [chargesSummaryOpen, setChargesSummaryOpen] = useState(true);
  const [invalidCommentChargeId, setInvalidCommentChargeId] = useState(null);
  const [chargeNamesList, setChargeNamesList] = useState([]);
  const [addingCustomCharge, setAddingCustomCharge] = useState(false);
  const [editingCustomCharge, setEditingCustomCharge] = useState(null);
  const [customChargeInput, setCustomChargeInput] = useState("");
  const [chargeDropdownOpen, setChargeDropdownOpen] = useState(false);
  const [globalChargeDropdownOpen, setGlobalChargeDropdownOpen] = useState(false);
  const [addingGlobalCustomCharge, setAddingGlobalCustomCharge] = useState(false);
  const [editingGlobalCustomCharge, setEditingGlobalCustomCharge] = useState(null);
  const [globalCustomChargeInput, setGlobalCustomChargeInput] = useState("");
  const [globalPaymentTerms, setglobalPaymentTerms] = useState("");
  const [globalComment, setglobalComment] = useState("");
  const [vendorGSTIN, setVendorGSTIN] = useState(null);
  const [previousGlobalFiles, setPreviousGlobalFiles] = useState([]);
  const [globalDocumentFiles, setGlobalDocumentFiles] = useState([]);
  const [alreadyQuoted, setalreadyQuoted] = useState(null);
  const [currentLowest, setCurrentLowest] = useState(null);
  const [techEvalStatuses, setTechEvalStatuses] = useState({});
  const [showTechEvalRestrictions, setShowTechEvalRestrictions] = useState(false);
  const [extractedQuotes, setExtractedQuotes] = useState({
    show: false,
    data: null,
  })
  const [extractingQuotes, setExtractingQuotes] = useState(false);
const [quoteHistory, setQuoteHistory] = useState(null);
const [showQuoteHistoryModal, setShowQuoteHistoryModal] = useState(false); //to fetch the quote hitory for a product for vendor page
const [tenderPaymentPaid, setTenderPaymentPaid] = useState(false);
const [tenderFees, setTenderFees] = useState(0);
const [tenderPaymentLoading, setTenderPaymentLoading] = useState(false);
// Clarification blocking state
const [hasOpenClarification, setHasOpenClarification] = useState(false);
const [openClarification, setOpenClarification] = useState(null);
const [isOwnerOfOpenClarification, setIsOwnerOfOpenClarification] = useState(false);
// Negotiation quote submitted state - tracks products where vendor has already submitted negotiation quote
const [negotiationQuoteSubmitted, setNegotiationQuoteSubmitted] = useState({});
// Bid expiry and active negotiation round state
const [isBidExpired, setIsBidExpired] = useState(false);
const [activeNegotiationProductIds, setActiveNegotiationProductIds] = useState(new Set());
const [activeNegotiationFields, setActiveNegotiationFields] = useState({});
const [hasActiveNegotiationRounds, setHasActiveNegotiationRounds] = useState(false);
// Changes by Agnij [Preserve form state when Razorpay modal opens]
const formStateRef = useRef(null);
const shouldAutoSendQuoteRef = useRef(false);
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const negotiationChargesAddedRef = useRef(false);
const [showBuyerCommentModal, setShowBuyerCommentModal] = useState(null); // null or { field: 'payment_terms'|'comments'|'documents', productId }
const [showPrevDocsModal, setShowPrevDocsModal] = useState(null); // null or array of file URLs

// Clarification period window for tenders (IST-based)
// We treat vendor_clarification_date as an IST datetime and convert it to a UTC Date,
// so 6:30 PM IST is compared correctly regardless of the browser/server timezone.
const IST_OFFSET_MINUTES = 330; // +05:30

const parseISTDateTimeToUTCDate = (dateStr) => {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  let datePart;
  let timePart;

  if (raw.includes("T")) {
    [datePart, timePart] = raw.split("T");
  } else if (raw.includes(" ")) {
    [datePart, timePart] = raw.split(" ");
  } else {
    datePart = raw;
    timePart = "00:00:00";
  }

  const [year, month, day] = datePart.split("-").map((v) => parseInt(v, 10));
  const [hourStr, minuteStr, secondStr] = (timePart || "00:00:00").split(":");
  const hour = parseInt(hourStr || "0", 10);
  const minute = parseInt(minuteStr || "0", 10);
  const second = parseInt((secondStr || "0").split(".")[0] || "0", 10);

  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) -
    IST_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcMs);
};

// Track "now" for countdown timers
const [now, setNow] = useState(new Date());

useEffect(() => {
  const timerId = setInterval(() => {
    setNow(new Date());
  }, 1000);
  return () => clearInterval(timerId);
}, []);

const clarificationDeadline =
  rfqDetails?.vendor_clarification_date
    ? parseISTDateTimeToUTCDate(rfqDetails.vendor_clarification_date)
    : null;

const isClarificationWindowActive =
  clarificationDeadline && now < clarificationDeadline;

const clarificationMsLeft = isClarificationWindowActive
  ? clarificationDeadline.getTime() - now.getTime()
  : 0;

const formatISTDateTime = (date) => {
  if (!date) return "";
  try {
    return formatDisplayDate(date, { includeTime: true });
  } catch {
    return formatDisplayDate(date);
  }
};

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
    2,
    "0"
  );
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const clarificationDeadlineIST = clarificationDeadline
  ? formatISTDateTime(clarificationDeadline)
  : "";

const clarificationCountdown = clarificationMsLeft > 0
  ? formatCountdown(clarificationMsLeft)
  : "";

  // structured payment terms rows
const [paymentTermsRows, setPaymentTermsRows] = useState([
  // {id:null, value: "", type: "advance", days: "", comment: ""},
]);

// Save the initial payment terms list from backend
const originalPaymentTermsListRef = useRef(null);

  // Build the canonical pricing payload from the form state. The backend's
  // /pricing/preview endpoint runs the same engine that recomputes on save,
  // so the totals shown here are guaranteed to match what gets persisted.
  const previewDraft = useMemo(() => {
    return {
      items: quoteProducts.map((item) => {
        const prod = rfqDetails?.products?.find((pi) => pi.id == item.id);
        const qtySpec = prod?.product_specs?.find((s) => s.title === "Quantity");
        const qty = parseFloat(qtySpec?.value ?? item.quantity) || 0;
        return {
          unit_price: item.unit_price,
          quantity: qty,
          tax: item.tax,
          tax_mode: chargesMode?.tax?.[item.id] || item.tax_mode || "percentage",
          other_charges: item.other_charges || [],
        };
      }),
      global_charges: globalOtherCharges.map((c) => ({
        name: c.name,
        amount: c.amount,
        amount_mode: c.amount_mode,
      })),
    };
  }, [quoteProducts, rfqDetails, chargesMode, globalOtherCharges]);

  const { totals: pricingTotals, isLoading: pricingLoading } = usePreviewTotals(previewDraft);

  // Sync engine-computed line totals back into quoteProducts.total_price so
  // existing render code (cell totals, summary text, submit payload) keeps
  // working. We compare before writing to avoid render loops.
  useEffect(() => {
    if (!pricingTotals?.lines) return;
    setquoteProducts((prev) => {
      let changed = false;
      const next = prev.map((item, idx) => {
        const line = pricingTotals.lines[idx];
        const newTotal = line?.total ?? 0;
        if (Number(item.total_price) === newTotal) return item;
        changed = true;
        return { ...item, total_price: newTotal };
      });
      return changed ? next : prev;
    });
  }, [pricingTotals]);

  const grandTotalBeforeGlobalCharges = pricingTotals?.grand_subtotal ?? 0;
  const globalChargesTotal = pricingTotals?.global_charges_total ?? 0;
  const grandTotalIncludingGST = pricingTotals?.grand_total ?? 0;
  const grandTotalIncludingGSTText = formatPrice(grandTotalIncludingGST);

  const quoteBreakup = useMemo(() => {
    if (!pricingTotals?.lines) {
      return { totalBase: 0, totalTax: 0, totalOtherCharges: 0, chargeBreakdown: [] };
    }
    let totalBase = 0, totalTax = 0, totalOtherCharges = 0;
    const chargesByName = {};
    pricingTotals.lines.forEach((line) => {
      totalBase += Number(line.base) || 0;
      totalTax += Number(line.base_tax) || 0;
      (line.charges || []).forEach((charge) => {
        const subtotal = Number(charge.subtotal) || 0;
        totalOtherCharges += subtotal;
        if (subtotal > 0) {
          const name = charge.name || "Other";
          chargesByName[name] = (chargesByName[name] || 0) + subtotal;
        }
      });
    });
    const chargeBreakdown = Object.entries(chargesByName).map(([label, value]) => ({ label, value }));
    return { totalBase, totalTax, totalOtherCharges, chargeBreakdown };
  }, [pricingTotals]);

  // Check if any quoteable product has pending/incomplete tech eval
  const hasPendingTechEval = rfqDetails?.products?.some(p => {
    if (rfqDetails.finalizations && rfqDetails.finalizations.length > 0) {
      const itemFound = rfqDetails.finalizations.find((f) => f.product_id == p.product_id && f.variant == p.variant);
      if (itemFound) return false;
    }
    const ts = techEvalStatuses[p.id];
    return ts && ts.has_tech_eval && !ts.all_clauses_responded;
  }) || false;

  /**
   * Main transformer
   * @param {Array<object>} items
   * @returns {Array<object>}
   */
  function normalizeExtractedItems(items) {
    const seen = new Set();
    const unique = (items || []).filter((it) => {
      if (it.id === 0) return false;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
    
    return unique.map((it) => {
      const quantityNum = it.quantity.value;
      const unit = (it.quantity && it.quantity.unit) || "";

      const basePriceNum = it.base_price.value;

      const freight = moneyOrPercent(it.freight);
      const packaging = moneyOrPercent(it.packaging);

      // Taxes are typically percentage
      const tax = moneyOrPercent(it.taxes, true);
      if (typeof tax.value === "number" && it.taxes && it.taxes.unit === "%") {
        tax.mode = "%";
      }

      const deliveryPeriod =
        typeof it.delivery_period === "number"
          ? it.delivery_period
          : toNumber(it.delivery_period);

      return {
        id: it.id,
        rfq_product_name: rfqDetails.products?.find(product => product.id == it.id)?.name || it.item_name,
        raw_product_name: it.item_name,
        quantity: quantityNum,
        unit,
        base_price: basePriceNum,
        freight,
        packaging,
        tax,
        delivery_period: deliveryPeriod ?? null,
      };
    });
  }

const openQuoteHistoryModal = async (product_variant_id, index) => {
  try {
    const response = await fetchQuoteHistory(product_variant_id, token);
    setQuoteHistory(response); // load data
    setShowQuoteHistoryModal(true); // open modal
  } catch (error) {
    console.error("Error fetching quote history:", error);
  }
};


  // Changes by Agnij 2024-07-30 [Add function to check if fields are filled]
  const isAnyFieldFilled = () => {
    // Check global fields
    if (globalFreight > 0 ||
        globalPackaging > 0 ||
        globalPaymentTerms.trim() !== "" ||
        globalComment.trim() !== "" ||
        globalDocumentFiles.length > 0 ||
        globalOtherCharges.some(c => (c.name && c.name.trim() !== "") || c.amount > 0)) {
      return true;
    }

    // Check product fields
    for (const product of quoteProducts) {
      if (product.unit_price > 0 ||
          product.freight_price > 0 ||
          product.package_price > 0 ||
          product.tax > 0 ||
          product.freight_tax > 0 ||
          product.package_tax > 0 ||
          product.tax_tax > 0 ||
          (product.other_charges && product.other_charges.some(c => (c.name && c.name.trim() !== "") || c.amount > 0)) ||
          product.comment.trim() !== "" ||
          (product.delivery_period.toString().trim() !== "" && !isNaN(parseInt(product.delivery_period)) && parseInt(product.delivery_period) > 0) ||
          (product.document_files && product.document_files.length > 0)) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    // Wait for router to be ready before accessing query params
    if (!router.isReady) return;

    if (id) {
      getRFQdetails();
      getChargeNames().then(res => {
        if (res?.data) setChargeNamesList(res.data);
      }).catch(() => {});
    }

    // Update the tech evaluation restriction flag
    const restrictionsEnabled = router.query.showTechEvalRestrictions === 'true';
    setShowTechEvalRestrictions(restrictionsEnabled);
  }, [router.isReady, id, router.query.showTechEvalRestrictions]);

  // Fetch charge names list
  useEffect(() => {
    if (!router.isReady) return;
    getChargeNames().then(res => {
      const data = res?.data || res || [];
      if (Array.isArray(data)) setChargeNamesList(data);
    }).catch(err => console.error('Failed to fetch charge names:', err));
  }, [router.isReady]);

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Leaving the site will discard all changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const handleRouteChange = () => {
      if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Leaving will discard all changes. Are you sure?')) {
        router.events.emit('routeChangeError');
        throw 'Route change aborted due to unsaved changes';
      }
    };
    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [hasUnsavedChanges, router]);

  // Check for open clarifications (for tenders only)
  useEffect(() => {
    const checkClarifications = async () => {
      if (!id || !rfqDetails?.is_tender) return;
      try {
        const result = await checkOpenClarification(id, token);
        setHasOpenClarification(result.hasOpen);
        setOpenClarification(result.clarification || null);
        // Use is_own_clarification from API (backend handles privacy)
        setIsOwnerOfOpenClarification(result.isOwnClarification || false);
      } catch (error) {
        console.error("Error checking clarifications:", error);
      }
    };
    checkClarifications();
  }, [id, token, rfqDetails?.is_tender]);

  // Check for negotiation quote submission status
  useEffect(() => {
    const checkNegotiationStatus = async () => {
      if (!id || !rfqDetails?.id) return;
      try {
        const response = await getAllVendorNegotiationStatus(id, token);
        if (response?.status === 1 && response?.data) {
          const statusMap = {};
          response.data.forEach((round) => {
            // Block regular submission if vendor has submitted for the LATEST round.
            // Only unblock if a NEW round was created and vendor hasn't submitted for it yet.
            // The backend returns the latest round per product, so if hasSubmittedQuote is true,
            // the vendor already submitted for the most recent round - keep them blocked.
            if (round.hasSubmittedQuote) {
              statusMap[round.rfq_product_id] = {
                hasSubmitted: true,
                quotedPrice: round.vendor_quoted_price,
                submittedAt: round.vendor_submitted_at,
                targetPrice: round.target_price,
                roundId: round.id,
                roundNumber: round.round_number
              };
            }
          });
          setNegotiationQuoteSubmitted(statusMap);
        }
      } catch (error) {
        console.error("Error checking negotiation status:", error);
      }
    };
    checkNegotiationStatus();
  }, [id, rfqDetails?.id]);

  // Check bid expiry and fetch active negotiation rounds
  useEffect(() => {
    if (!rfqDetails?.bid_end_date) {
      setIsBidExpired(false);
      setActiveNegotiationProductIds(new Set());
      setHasActiveNegotiationRounds(false);
      return;
    }
    const expired = checkBidExpired(rfqDetails.bid_end_date);
    setIsBidExpired(expired);

    if (expired && id) {
      const fetchActiveRounds = async () => {
        try {
          const response = await getAllActiveNegotiationRounds(id, token);
          const now = new Date();
          const activeRounds = (response?.data || []).filter(
            r => {
              if (r.status !== 'ACTIVE' || !r.end_date) return false;
              // Backend sends end_date in UTC without timezone suffix — append Z to parse as UTC
              const endDateStr = r.end_date.includes('+') || r.end_date.includes('Z') ? r.end_date : r.end_date.replace(' ', 'T') + 'Z';
              return new Date(endDateStr) > now;
            }
          );
          const productIds = new Set(activeRounds.map(r => r.rfq_product_id));
          setActiveNegotiationProductIds(productIds);
          setHasActiveNegotiationRounds(productIds.size > 0);

          // Extract per-field negotiation data
          const fieldsByProduct = {};
          activeRounds.forEach(r => {
            // The API filters by vendor token, so vendor_approvals should contain this vendor's entry
            const myApproval = (r.vendor_approvals || [])[0];
            if (!myApproval?.negotiation_fields) return;
            fieldsByProduct[r.rfq_product_id] = myApproval.negotiation_fields.map(f => ({
              name: f.name,
              targetPrice: f.target || f.target_price,
              mode: f.mode || null,
            }));
          });
          setActiveNegotiationFields(fieldsByProduct);
        } catch (error) {
          console.error("Error checking active negotiation rounds:", error);
          setActiveNegotiationProductIds(new Set());
          setHasActiveNegotiationRounds(false);
        }
      };
      fetchActiveRounds();
    } else {
      setActiveNegotiationProductIds(new Set());
      setHasActiveNegotiationRounds(false);
    }
  }, [rfqDetails?.bid_end_date, id]);

  // Auto-add missing negotiated charges and filter out fields where target >= quoted value
  useEffect(() => {
    if (negotiationChargesAddedRef.current) return;
    const fields = activeNegotiationFields;
    if (!fields || Object.keys(fields).length === 0 || quoteProducts.length === 0) return;
    negotiationChargesAddedRef.current = true;

    // Filter out negotiation fields where target >= vendor's quoted value
    const filteredFields = {};
    Object.keys(fields).forEach(productId => {
      const product = quoteProducts.find(p => String(p.id) === String(productId));
      if (!product) { filteredFields[productId] = fields[productId]; return; }
      filteredFields[productId] = fields[productId].filter(f => {
        const target = parseFloat(f.targetPrice);
        if (isNaN(target)) return true; // keep non-numeric fields like payment_terms
        if (f.name === 'base_price') {
          const quoted = parseFloat(product.unit_price || 0);
          return quoted > 0 && target < quoted;
        }
        // For charges, find the matching charge in other_charges
        const charge = (product.other_charges || []).find(c => (c.slug || c.name) === f.name);
        if (!charge || parseFloat(charge.amount || 0) <= 0) return true; // new charge, always show
        const quotedAmt = parseFloat(charge.amount || 0);
        return target < quotedAmt;
      });
    });
    setActiveNegotiationFields(filteredFields);

    // Auto-add missing negotiated charges
    setquoteProducts(prev => prev.map(product => {
      const negFields = filteredFields[product.id] || [];
      const existingChargeNames = new Set((product.other_charges || []).map(c => c.slug || c.name));
      const missingCharges = negFields
        .filter(f => !['base_price', 'payment_terms', 'comments', 'vendor_tc', 'documents'].includes(f.name) && !existingChargeNames.has(f.name))
        .map(f => ({
          _id: generateChargeId(),
          name: f.name,
          slug: f.name,
          amount: 0,
          amount_mode: f.mode === 'percentage' ? 'percentage' : 'absolute',
          // tax: null = inherit base rate. Vendors must explicitly type 0
          // to express "no tax on this charge" (tri-state semantics).
          tax: null,
          tax_mode: 'percentage',
        }));
      if (missingCharges.length === 0) return product;
      return { ...product, other_charges: [...(product.other_charges || []), ...missingCharges] };
    }));
  }, [activeNegotiationFields, quoteProducts]);

  // Changes by Agnij <2024-07-30> [Add debug logging for reverse auction status]
  useEffect(() => {
    if (rfqDetails) {
      const now = new Date();
      let raStartDate = null;
      let raStartDateString = "Not set";

      if (rfqDetails.ra_start_date) {
        raStartDateString = rfqDetails.ra_start_date;
        if (rfqDetails.ra_start_date.includes('T')) {
          raStartDate = new Date(rfqDetails.ra_start_date);
        } else if (rfqDetails.ra_start_date.includes(' ')) {
          const [datePart, timePart] = rfqDetails.ra_start_date.split(' ');
          raStartDate = new Date(`${datePart}T${timePart}`);
        } else {
          raStartDate = new Date(rfqDetails.ra_start_date);
        }
      }

      const isAuctionActive = currentLowest; // Reflects the outcome of updatecurrentLowest

    }
  }, [rfqDetails, currentLowest]);

  const getProductSpecValueByTitle = (productSpecs, title) => {
    const spec = productSpecs.find(spec => spec.title === title);
    return spec ? spec.value : "";
  }

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

  const updatecurrentLowest = (products, rfqData) => {
    if (products && Array.isArray(products)) {
      // Extract technical evaluation status for each product
      const techStatuses = {};
      products.forEach(product => {
        // Changes by Agnij 2024-07-29 [Fix tech eval status tracking]
        if (product.tech_evaluation_status) {
          techStatuses[product.id] = {
            has_tech_eval: product.tech_evaluation_status.has_tech_eval === true,
            is_accepted: product.tech_evaluation_status.is_accepted === true,
            all_clauses_responded: product.tech_evaluation_status.all_clauses_responded === true
          };
        }
      });
      setTechEvalStatuses(techStatuses);

      // Changes by Agnij 2024-07-29 [Fix reverse auction display]
      // Only show current lowest if reverse auction is active (after start date)
      const hasLowestQuotation = products.some(product => product.lowest_quotation !== null);

      // Check if reverse auction is active
      const isReverseAuctionActive = () => {
        // If rfqData isn't available, return false
        if (!rfqData) return false;

        // Check if reverse auction is enabled
        if (rfqData.reverse_auction !== 1) return false;

        // If no start date is defined, return false
        if (!rfqData.ra_start_date) return false;

        // Get current time and auction start time
        const now = new Date();
        let raStartDate;

        // Parse the ra_start_date based on its format
        if (rfqData.ra_start_date.includes('T')) {
          raStartDate = new Date(rfqData.ra_start_date);
        } else if (rfqData.ra_start_date.includes(' ')) {
          // Format: "YYYY-MM-DD HH:MM:SS"
          const [datePart, timePart] = rfqData.ra_start_date.split(' ');
          raStartDate = new Date(`${datePart}T${timePart}`);
        } else {
          // Try to parse as-is
          raStartDate = new Date(rfqData.ra_start_date);
        }

        // Check if auction has started
        return raStartDate <= now;
      };

      // Determine if reverse auction is active
      const isAuctionActive = isReverseAuctionActive();

      // Only set currentLowest to true if auction is active AND there are lowest quotations
      setCurrentLowest(hasLowestQuotation && isAuctionActive);

      // Set technical evaluation restrictions based on whether reverse auction is active
      // This ensures restrictions are applied during reverse auction regardless of URL parameters
      setShowTechEvalRestrictions(isAuctionActive);
    } else {
      setCurrentLowest(null);
    }
  };

  const getRFQdetails = () => {
    setloading(true);
    getRFQById(id, token)
      .then((res) => {
        setloading(false);

        setTenderFees(res.data?.tender_fees || 0);
        setTenderPaymentPaid(res.data?.has_paid_tender_fees === true);

        if (res.data.quote_details) {
          setglobalComment(res.data.quote_details.global_comment || ""); // Set globalComment from API or fallback to empty string
          setglobalPaymentTerms(res.data.quote_details.global_payment_term || ""); // Set globalPaymentTerms from API or fallback to empty string
          setGlobalOtherCharges((res.data.quote_details.global_charges || []).map(c => ({ _id: generateChargeId(), name: c.name, amount: c.tax || 0, amount_mode: c.tax_mode || "percentage" })));

          //  one state and useRef for payment terms to track newly added, updated, and deleted terms
          const paymetTermData = res.data.quotations[0]?.payment_terms || []
          setPaymentTermsRows(paymetTermData); // Set structured payment terms rows
          originalPaymentTermsListRef.current  = paymetTermData

          const currentGSTIN = res.data.quote_details.gstin;
          setVendorGSTIN(currentGSTIN ?? null);
        }

        if (res.data.terms_and_conditions_files) {
          setPreviousGlobalFiles(res.data?.terms_and_conditions_files?.map((item) => { return item.file_url }))
        }
        // Array to store each quote
        let bidProducts = [];

        // Map to store already quoted data if exists
        const quotationsMap = new Map();
        res.data.quotations[0]?.products?.forEach((quoteItem) => {
          const key = `${quoteItem.product_id}_${quoteItem.variant}`;
          quotationsMap[key] = quoteItem;
        });

        if (res.data.products.length > 0) {
          res.data.products.map((productItem) => {
            const key = `${productItem.product_id}_${productItem.variant}`;
            const quoteItem = quotationsMap[key] || {}; // Fallback to empty if not found

            bidProducts.push({
              id: productItem.id,
              product_id: productItem.product_id,
              variant: productItem.variant,
              quantity: getProductSpecValueByTitle(
                productItem?.product_specs,
                "Quantity"
              ),
              // quantity: productItem?.product_specs[2]?.value || "",
              product_name: productItem.product_details
                ? productItem.product_details[0].name
                : "",
              unit_price: quoteItem.unit_price || "",
              tax: quoteItem.tax || null,
              tax_mode: quoteItem?.tax_mode || "percentage",
              // Stored value is the engine-computed total from the last save;
              // the live-preview hook will refresh it on the first render
              // cycle if any input drifts.
              total_price: parseFloat(quoteItem.total_price) || 0,
              comment: quoteItem.comment || "",
              delivery_period: quoteItem.delivery_period || "",
              previous_document_files:
                quoteItem?.previous_document_files?.map((item) => {
                  return item.file_url;
                }) || [],
              document_files: [],
              other_charges: (() => {
                const existing = (quoteItem?.other_charges || []).map(c => ({ ...c, _id: generateChargeId() }));
                const existingNames = existing.map(c => c.name);
                const migrated = [];
                // Legacy freight_tax / package_tax → null when absent so the
                // synthetic charge inherits base rate (tri-state semantics).
                const legacyTaxOrNull = (raw) =>
                  raw === null || raw === undefined || raw === "" ? null : (parseFloat(raw) || 0);
                if (parseFloat(quoteItem.freight_price) > 0 && !existingNames.includes("Freight")) {
                  migrated.push({ _id: generateChargeId(), name: "Freight", amount: parseFloat(quoteItem.freight_price) || 0, amount_mode: quoteItem?.freight_mode || "percentage", tax: legacyTaxOrNull(quoteItem?.freight_tax), tax_mode: quoteItem?.freight_tax_mode || "percentage" });
                }
                if (parseFloat(quoteItem.package_price) > 0 && !existingNames.includes("Packaging")) {
                  migrated.push({ _id: generateChargeId(), name: "Packaging", amount: parseFloat(quoteItem.package_price) || 0, amount_mode: quoteItem?.package_mode || "percentage", tax: legacyTaxOrNull(quoteItem?.package_tax), tax_mode: quoteItem?.package_tax_mode || "percentage" });
                }
                return [...migrated, ...existing];
              })(),
            });
          });
          setquoteProducts(bidProducts);

          const taxProductObj = { global: "percentage" };
          bidProducts.forEach(product => { taxProductObj[product.id] = product.tax_mode || "percentage" });
          setChargesMode({ tax: taxProductObj });
          if (res.data.quotations.length > 0)
            setalreadyQuoted(res.data.quotations)
        }
        // Changes by Agnij <2024-07-30> [Pass RFQ data directly to avoid state timing issues]
        updatecurrentLowest(res.data.products, res.data);
        setrfqDetails(res.data);
      })
      .catch((error) => {
        setloading(false);
      });
  };

  const generateChargeId = () => `oc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const getChargesSummary = (product) => {
    const lines = [];
    (product.other_charges || []).forEach(c => {
      if (c.name && parseFloat(c.amount) > 0) {
        lines.push(`${c.name}: ${c.amount_mode === "percentage" ? c.amount + "%" : "₹" + c.amount}`);
      }
    });
    return lines;
  };

  const handleAddOtherCharge = (productIndex, chargeName = "", chargeSlug = "") => {
    const slug = chargeSlug || chargeName.toLowerCase().replace(/\s+/g, '_');
    setquoteProducts(prev => prev.map((item, idx) => {
      if (idx === productIndex) {
        return {
          ...item,
          other_charges: [
            ...(item.other_charges || []),
            // tax: null = inherit base rate (tri-state). Vendor must
            // explicitly type 0 in the tax field to mean "no tax on this charge".
            { _id: generateChargeId(), name: chargeName, slug, amount: 0, amount_mode: "percentage", tax: null, tax_mode: "percentage" }
          ]
        };
      }
      return item;
    }));
  };

  const handleRemoveOtherCharge = (productIndex, chargeId) => {
    setquoteProducts((prev) =>
      prev.map((item, idx) =>
        idx === productIndex
          ? { ...item, other_charges: item.other_charges.filter((c) => c._id !== chargeId) }
          : item
      )
    );
  };

  const handleUpdateOtherCharge = (productIndex, chargeId, field, value) => {
    setquoteProducts((prev) =>
      prev.map((item, idx) => {
        if (idx !== productIndex) return item;
        return {
          ...item,
          other_charges: item.other_charges.map((c) =>
            c._id === chargeId ? { ...c, [field]: value } : c
          ),
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleChargeFieldUpdate = (productIndex, field, value, _modeOverrides) => {
    setquoteProducts((prev) =>
      prev.map((item, idx) => (idx === productIndex ? { ...item, [field]: value } : item))
    );
  };


  const handleUpdateData = (
    item_id,
    e,
    product_id,
    variant,
    type,
    valueType = "integer",
    total_qty = parseFloat(total_qty),
    file,
    fileOperation,
    taxMode = chargesMode.tax[item_id],
  ) => {
    let value = e.target.value;
    let d = quoteProducts.map((item) => {
      if (item.id == item_id && item.product_id == product_id && item.variant == variant) {
        if (valueType == "integer") {
          item[type] = parseFloat(value);
        } else if (valueType == "array") {
          let doc_list = item[type];
          if (fileOperation && fileOperation == "remove") {
            let newFileList = doc_list.filter((fileItem) => fileItem !== file);
            item[type] = newFileList;
          }
          else
            item[type].push(file)

        } else {
          item[type] = value;
        }

        // Clear tax and charges only when base price is explicitly set to 0 (not when field is empty mid-edit)
        if (type === "unit_price" && value !== "" && parseFloat(value) === 0) {
          item.tax = 0;
          item.other_charges = [];
        }
        // total_price is computed by the backend preview hook and synced
        // back into state via the effect below the previewDraft useMemo.
      }
      return item;
    });
    setquoteProducts(d);
    setHasUnsavedChanges(true);
  };

  // Apply a fresh products array to state. Totals are no longer computed
  // here — the live-preview hook recomputes via the backend engine and syncs
  // line.total back into each item's total_price.
  const applyProducts = (products) => {
    setquoteProducts(products);
  };



  // 
  const getPaymentTermsChanges = () => {
  
  // newly added term, no id in objects
const createdTerms = 
  paymentTermsRows
    .filter(t => !t.id && t.action !== "delete")
    .map(({ id, action, ...rest }) => rest)


// DELETE: only ids
const deletedTerms = paymentTermsRows
  .filter(t => t.id && t.action === "delete")
  .map(t => t.id);

// UPDATE: full object incl. id, exclude action
const updatedTerms = 
  paymentTermsRows
    .filter(c => {
      const o = originalPaymentTermsListRef.current.find(x => x.id === c.id);
      return (
        c.id &&
        c.action !== "delete" &&
        o && (
          c.type !== o.type ||
          c.value !== o.value ||
          (c.days ?? null) !== (o.days ?? null) ||
          (c.comment ?? "") !== (o.comment ?? "")
        )
      );
    })
    .map(({ action, ...rest }) => rest)


return { deletedTerms, createdTerms, updatedTerms };
};


  // Changes by Agnij [Save form state before opening payment modal]
  const saveFormState = () => {
    formStateRef.current = {
      quoteProducts: JSON.parse(JSON.stringify(quoteProducts)),
      globalFreight,
      globalPackaging,
      globalPaymentTerms,
      globalComment,
      globalDocumentFiles: [...globalDocumentFiles],
      paymentTermsRows: JSON.parse(JSON.stringify(paymentTermsRows)),
      vendorGSTIN,
      chargesMode: JSON.parse(JSON.stringify(chargesMode)),
      globalOtherCharges: JSON.parse(JSON.stringify(globalOtherCharges)),
    };
  };

  // Changes by Agnij [Restore form state after payment modal closes]
  const restoreFormState = () => {
    if (formStateRef.current) {
      setquoteProducts(formStateRef.current.quoteProducts);
      setglobalFreight(formStateRef.current.globalFreight);
      setglobalPackaging(formStateRef.current.globalPackaging);
      setglobalPaymentTerms(formStateRef.current.globalPaymentTerms);
      setglobalComment(formStateRef.current.globalComment);
      setGlobalDocumentFiles(formStateRef.current.globalDocumentFiles);
      setPaymentTermsRows(formStateRef.current.paymentTermsRows);
      setVendorGSTIN(formStateRef.current.vendorGSTIN);
      setChargesMode(formStateRef.current.chargesMode);
      setGlobalOtherCharges(formStateRef.current.globalOtherCharges || []);
      formStateRef.current = null;
    }
  };

  const initiateTenderPayment = async () => {
    try {
      setTenderPaymentLoading(true);
      
      // Changes by Agnij [Save form state before opening payment modal]
      saveFormState();
      shouldAutoSendQuoteRef.current = true;

      const orderRes = await createTenderPaymentOrder(id, token);
      
      // Changes by Agnij [Axios interceptor returns response.data, so orderRes is already the data object]
      // Backend returns: { status: 1, data: { order: {...}, payment_id: 20 } }
      // After axios interceptor: orderRes = { status: 1, data: { order: {...}, payment_id: 20 } }
      // So orderData = orderRes.data.order (not orderRes.data.data.order)
      console.log('=== Razorpay Order Data Debug ===');
      console.log('Full API response (after axios interceptor):', orderRes);
      console.log('Response.data:', orderRes?.data);
      
      const orderData = orderRes?.data?.order;
      console.log('Order data extracted:', orderData);
      console.log('Order ID:', orderData?.id);
      console.log('Order amount (paise):', orderData?.amount);
      console.log('Order amount (rupees):', orderData?.amount ? orderData.amount / 100 : 0);
      console.log('Order currency:', orderData?.currency);
      console.log('===================================');

      if (orderRes?.data?.already_paid) {
        setTenderPaymentPaid(true);
        toast.success("Tender fees already paid.");
        shouldAutoSendQuoteRef.current = false;
        setTenderPaymentLoading(false);
        // Changes by Agnij [Allow quote update even if tender fees are already paid]
        // Continue to show the submit confirmation modal so user can update quote
        setShowSubmitQuoteConfirmModal(true);
        return;
      }

      if (!orderData || !orderData.id) {
        console.error('Order data validation failed:', { orderData, orderRes });
        toast.error("Failed to create payment order. Please try again.");
        shouldAutoSendQuoteRef.current = false;
        restoreFormState();
        setTenderPaymentLoading(false);
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        toast.error("Razorpay SDK failed to load. Please try again.");
        shouldAutoSendQuoteRef.current = false;
        restoreFormState();
        setTenderPaymentLoading(false);
        return;
      }

      // Changes by Agnij [When using order_id, Razorpay fetches order details automatically]
      // Don't pass amount field - Razorpay will use the amount from the order
      // This matches the pattern used in subscription payments
      console.log('=== Razorpay Options Debug ===');
      console.log('Order ID being used:', orderData.id);
      console.log('Order amount from backend (paise):', orderData.amount);
      console.log('Order amount from backend (rupees):', orderData.amount / 100);
      console.log('Note: Not passing amount field - Razorpay will fetch from order');
      console.log('===================================');
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        order_id: orderData?.id,
        // Changes by Agnij [Don't pass amount - Razorpay fetches it from the order when order_id is provided]
        // This matches the subscription payment pattern
        currency: orderData?.currency || "INR",
        name: "Workwise",
        description: "Tender Fees",
        handler: async function (response) {
          try {
            const verifyResponse = await verifyTenderPayment(
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                rfq_id: id
              },
              token
            );

            // Check if payment verification was successful
            if (verifyResponse?.status !== 1) {
              throw new Error(verifyResponse?.message || "Payment verification failed");
            }

            setTenderPaymentPaid(true);
            toast.success("Tender fees paid successfully.");

            // Changes by Agnij [Auto-send quote after successful payment]
            // Clear saved form state so ondismiss (which fires after modal closes)
            // won't restore stale state and interfere with quote submission
            formStateRef.current = null;

            if (shouldAutoSendQuoteRef.current) {
              shouldAutoSendQuoteRef.current = false;
              handleSubmitQuoteConfirm();
            } else {
              getRFQdetails();
            }
          } catch (err) {
            toast.error(err?.message || "Payment verification failed.");
            shouldAutoSendQuoteRef.current = false;
            restoreFormState();
            setTenderPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            // Changes by Agnij [Restore form state when payment modal is closed without payment]
            shouldAutoSendQuoteRef.current = false;
            restoreFormState();
            setTenderPaymentLoading(false);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: ""
        },
        notes: {
          rfq: id
        },
        theme: {
          color: "#158993"
        }
      };

      const paymentObject = new window.Razorpay(options);
      
      // Changes by Agnij [Handle payment failure]
      // Only show toast here - do NOT reset refs or restore form state.
      // Razorpay allows retry within the same modal. If user retries and succeeds,
      // the success handler needs shouldAutoSendQuoteRef to still be true.
      // ondismiss will handle full cleanup when the modal is actually closed.
      paymentObject.on('payment.failed', function(response) {
        toast.error("Payment failed. Please try again.");
      });

      paymentObject.open();
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to initiate payment";
      toast.error(msg);
      shouldAutoSendQuoteRef.current = false;
      restoreFormState();
      setTenderPaymentLoading(false);
    }
  };

  const handleSendQuote = async () => {
    // Changes by Agnij [Only check payment if not already paid - payment should only be asked once]
    if (rfqDetails?.is_tender === 1 && (tenderFees || 0) > 0 && !tenderPaymentPaid) {
      await initiateTenderPayment();
      return;
    }
    setShowSubmitQuoteConfirmModal(true);
  };

  const handleSubmitQuoteConfirm = () => {

    
    setShowSubmitQuoteConfirmModal(false);

    // Validate payment terms - at least one valid row should exist
    const validPaymentTerms = paymentTermsRows.filter(row => 
      row && 
      row.action !== "delete" && 
      row.type && 
      row.value != null && 
      row.value > 0
    );
    
    if (validPaymentTerms.length === 0) {
      return toast.error("At least one valid payment term is required. Please add your payment terms.");
    }

    // GSTIN is optional; if provided, validate format (15 chars)
    if (vendorGSTIN && vendorGSTIN.trim() && vendorGSTIN.length !== 15) {
      return toast.error("Please enter a valid 15-character GSTIN or leave blank.")
    }

    // return 0
    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: [],
      globalPaymentTerms,
      global_payment_term_list: paymentTermsRows,    // NEW structured array
      globalComment,
      term_and_condition_files: globalDocumentFiles,
      vendorGSTIN,
      global_charges: globalOtherCharges
        .filter(c => c.name && c.name.trim() !== "")
        .map(({ _id, amount, amount_mode, ...rest }) => ({
          name: rest.name,
          slug: rest.slug || rest.name.toLowerCase().replace(/\s+/g, '_'),
          tax: parseFloat(amount) || 0,
          tax_mode: amount_mode || "percentage",
          is_global: true,
        })),
    };

    if (alreadyQuoted) {
      // Validate payment terms for update scenario
      const paymentTermsUpdate = getPaymentTermsChanges(paymentTermsRows, originalPaymentTermsListRef.current);
      const validCreatedTerms = paymentTermsUpdate.createdTerms.filter(row => 
        row && 
        row.type && 
        row.value != null && 
        row.value > 0
      );
      const validUpdatedTerms = paymentTermsUpdate.updatedTerms.filter(row => 
        row && 
        row.type && 
        row.value != null && 
        row.value > 0
      );
      
      // Check if there are any valid terms after considering deletions
      const remainingValidTerms = validCreatedTerms.length + validUpdatedTerms.length;
      const originalValidTerms = originalPaymentTermsListRef.current ? 
        originalPaymentTermsListRef.current.filter(row => 
          row && 
          row.type && 
          row.value != null && 
          row.value > 0 &&
          !paymentTermsUpdate.deletedTerms.includes(row.id)
        ).length : 0;
      
      if (remainingValidTerms + originalValidTerms === 0) {
        // setShowSubmitQuoteConfirmModal(false);
        return toast.error("At least one valid payment term is required. Please add your payment terms.");
      }

      payload.global_payment_term_list = paymentTermsUpdate;

      let quote_id = rfqDetails.quotations[0].id;
      const updatedProducts = quoteProducts
        .filter(product => {
          // When bid expired, only include products with active negotiation rounds
          if (isBidExpired && !activeNegotiationProductIds.has(product.id)) return false;
          return true;
        })
        .map(product => {
          if(product.unit_price == 0) {
            product.tax = 0;
            product.total_price = 0;
            product.other_charges = [];
          }

          product.tax = parseFloat(product.tax) || 0;
          product.tax_mode = chargesMode.tax[product.id] || product.tax_mode || "percentage";
          product.total_price = parseFloat(product.total_price) || 0;
          product.other_charges = (product.other_charges || [])
            .filter(c => c.name && c.name.trim() !== "")
            .map(({ _id, ...rest }) => rest);

          return product;
        })
      payload = { ...payload, products: updatedProducts };

      setsubmitLoading(true);
      updateQuotation(quote_id, payload, token)
        .then((res) => {
          setsubmitLoading(false);
          // Clear form state only after successful quote update
          formStateRef.current = null;
          setHasUnsavedChanges(false);
          toast.success("Quote updated Successfully...!");
          // setShowSubmitQuoteConfirmModal(false);
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((error) => {
          setsubmitLoading(false);
          setTenderPaymentLoading(false);
          // setShowSubmitQuoteConfirmModal(false);
          // Display error message from backend
          const errorMessage = error?.response?.data?.message || error?.message || "Unable to update quote. Please try again.";
          toast.error(errorMessage);
        })
    }
    else {
      let isEmpty = false;
      let allFinalizedProducts = [];
      rfqDetails?.finalizations?.map((item) =>
        allFinalizedProducts.push(item.product_id)
      );
      let filteredquoteProducts = quoteProducts.filter((item) => {
        // Exclude finalized products and products with negotiation quotes already submitted
        if (allFinalizedProducts.includes(item.product_id)) return false;
        if (negotiationQuoteSubmitted[item.id]) return false;
        // When bid expired, only include products with active negotiation rounds
        if (isBidExpired && !activeNegotiationProductIds.has(item.id)) return false;
        return true;
      });

      const updatedProducts = filteredquoteProducts.map(product => {
        if(product.unit_price == 0) {
          product.tax = 0;
          product.total_price = 0;
          product.other_charges = [];
        } else {
          product.total_price = parseFloat(product.total_price) || 0;
        }

        product.tax = parseFloat(product.tax) || 0;
        product.tax_mode = chargesMode.tax[product.id] || "percentage";
        product.other_charges = (product.other_charges || [])
          .filter(c => c.name && c.name.trim() !== "")
          .map(({ _id, ...rest }) => rest);

        return product;
      })

      if (
        updatedProducts.some(
          (product) =>
            (!!product.unit_price && (parseInt(product.unit_price) || 0) <= 0) ||
            (!!product.delivery_period && (parseInt(product.delivery_period) || 0) <= 0)
        )
      ) {
        // setShowSubmitQuoteConfirmModal(false);
        return toast.error("Some required fields may be missing or in negative")
      }
        
      payload = { ...payload, products: updatedProducts };

      setsubmitLoading(true);
      sendQuotation(payload, token)
        .then((res) => {
          setsubmitLoading(false);
          // Clear form state only after successful quote submission
          formStateRef.current = null;
          toast.success("Quote sent Successfully...!");
          // setShowSubmitQuoteConfirmModal(false);
          router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
        })
        .catch((err) => {
          setsubmitLoading(false);
          setTenderPaymentLoading(false);
          // setShowSubmitQuoteConfirmModal(false);
          // Display error message from backend
          const errorMessage = err?.response?.data?.message || err?.message || "Unable to send quote. Please try again.";
          toast.error(errorMessage);
        });
    }
  };

  const handleSubmitQuoteCancel = () => {
    setShowSubmitQuoteConfirmModal(false);
  };

  const isAvailableForQuote = (item) => {
    if (rfqDetails.finalizations && rfqDetails.finalizations.length > 0) {
      let itemFound = rfqDetails.finalizations.find((f_item) => f_item.product_id == item.product_id && f_item.variant == item.variant);
      return itemFound ? false : true;
    } else {
      return true;
    }
  };

  const handleRegretQuote = ({ reqret_reason }, resetForm) => {
    let isEmpty = false;
    let allFinalizedProducts = [];
    rfqDetails?.finalizations?.map((item) =>
      allFinalizedProducts.push(item.product_id)
    );
    let filteredquoteProducts = quoteProducts.filter((item) => {
      if (!allFinalizedProducts.includes(item.product_id)) {
        return item;
      }
    });

    let payload = {
      rfq_id: rfqDetails.id,
      rfq_no: rfqDetails.rfq_no,
      status: 1,
      products: filteredquoteProducts,
      is_regret: 1,
      regret_reason: reqret_reason,
      globalPaymentTerms,
      globalComment,
    };
    setsubmitLoading(true);
    sendQuotation(payload, token)
      .then((res) => {
        setsubmitLoading(false);
        toast.success("Quote regretted successfully!");
        router.push(`/dashboard/vendor/inquiries-details?id=${id}${token !== undefined ? `&token=${token}` : ''}`);
      })
      .catch((err) => {
        setsubmitLoading(false);
        // Display error message from backend
        const errorMessage = err.response?.data?.message || "Failed to submit regret. Please try again.";
        toast.error(errorMessage);
      });
  };

  const uploadQuoteItemFiles = async (e, item) => {
    try {
      const filePath = await handleFileUpload(e, token);
      handleUpdateData(
        item.id,
        e,
        item.product_id,
        item.variant,
        "document_files",
        "array",
        getProductSpecValueByTitle(item?.product_specs, "Quantity"),
        // item?.product_specs[2]?.value,
        filePath
      )
    } catch (error) {
      console.error(error)
      let message = error.message?.response?.data?.errors?.file?.message;
      toast.error(message);
    }
  };

  const uploadGlobalDocumentFiles = async (e) => {
    try {
      const filePath = await handleFileUpload(e, token);

      setGlobalDocumentFiles((prevGlobalDocumentFiles) => [
        ...prevGlobalDocumentFiles,
        filePath
      ]);

    } catch (error) {
      let message = error.message;
      toast.error(message);
    }
  };

  const uploadExtractionDocument = async (e) => {
    try {
      setExtractingQuotes(true);
      await handleQuotationDocumentUpload(e.target?.files?.[0]);
    } catch (error) {
      let message = typeof error.message == 'string' ? error.message : "Something went wrong in extracting Quotes from uploaded document";
      toast.error(message);
    } finally { 
      setExtractingQuotes(false); 
    }
  }

  const handleQuotationDocumentUpload = async (file) => {
    try {
      const response = await extractQuotation(file, rfqDetails)
      const extracted = response.data?.result?.extracted?.Details;

      if(extracted) {
        setExtractedQuotes((prev) => ({
          ...prev,
          data: normalizeExtractedItems(extracted),
          show: true,
        }));
      } else {
        toast.info("No Quotations found in given document. If you think this is wrong, please contact our support team!")
      }
    } catch (error) {
      console.error("QUOTE EXTRACTION ERROR:", error);
      toast.error("Something went wrong while extraction details from quotation document, please try again later!");
    }
  }

  const removeGlobalFiles = (file_url) => {
    const newFileLinks = globalDocumentFiles.filter((fileItem) => fileItem !== file_url);
    setGlobalDocumentFiles(newFileLinks);
  }
  

  const overrideQuote = (overrideQuotes) => {
    if (overrideQuotes && Array.isArray(overrideQuotes)) {
      const overrideQuoteIds = overrideQuotes.map(quote => quote.id);
      const updatedProduts = quoteProducts
        .map((product) => {
          if (overrideQuoteIds.includes(product.id)) {
            const quote = overrideQuotes.find(quote => product.id === quote.id);
            if(quote) {
              if (typeof quote.base_price === "number") {
                product.unit_price = quote.base_price;
              }
              if (typeof quote.freight.value === "number") {
                product.freight_price = quote.freight.value;
                product.freight_mode = quote.freight.unit;
              }
              if (typeof quote.packaging.value === "number") {
                product.package_price = quote.packaging.value;
                product.package_mode = quote.packaging.unit;
              }
              if (typeof quote.tax.value === "number") {
                product.tax = quote.tax.value;
                product.tax_mode = quote.tax.unit;
              }
              product.delivery_period = String(quote.delivery_period);
            }
          }

          return product;
        });

      applyProducts(updatedProduts);

      setExtractedQuotes(prev => ({...prev, show: false}));
      toast.info("Quoted has been overrided to respective products")
    }
  };

  useEffect(() => {
    console.log("EXTRACTED DATA:", extractedQuotes.data)
  }, [extractedQuotes.data])

  return (
    <>
      {submitLoading && <Loader />}
      <section className="quote-common-header sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Send Quotation</h3>
            </div>
            <div className="col-md-6"></div>
          </div>
        </div>
      </section>

      {/* Table Placeholder */}
      {loading && (
        <section className="quote-send-sec-1">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">
                    <h3 className="title">
                      <PlaceholderLoading
                        shape="rect"
                        width={600}
                        height={50}
                      />
                    </h3>

                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                    <p>
                      <PlaceholderLoading
                        shape="rect"
                        width={300}
                        height={20}
                      />
                    </p>
                  </div>

                  <div className="table-responsive">
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Sl No.</th>
                            <th>Item</th>
                            <th>Qty</th>
                            {/* <th>Unit</th> */}
                            <th>Pricing</th>
                            <th>Total</th>
                            <th>Vendor Comments</th>
                            <th style={{ maxWidth: "100px" }}>
                              Delivery Period
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={100}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={300}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>

                            <td>
                              <PlaceholderLoading
                                shape="rect"
                                width={50}
                                height={20}
                              />
                            </td>
                            <td>
                              <div className="comment">
                                <div className="comment-group">
                                  <PlaceholderLoading
                                    shape="rect"
                                    width={200}
                                    height={20}
                                  />
                                </div>

                                <PlaceholderLoading
                                  shape="rect"
                                  width={150}
                                  height={40}
                                />
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="quote-sec-btm">
                    <div className="row">
                      <div className="col-md-6">
                        <PlaceholderLoading
                          shape="rect"
                          width={150}
                          height={40}
                        />
                      </div>
                      <div className="col-md-6">
                        <div className="float-end">
                          <PlaceholderLoading
                            shape="rect"
                            width={150}
                            height={40}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* // Actual Data area */}

      {!loading && rfqDetails && (
        <section className="quote-send-sec-1">
          <div className="container-fluid ">
            {/* Clarification Blocking Banner */}
            {rfqDetails?.is_tender === 1 && hasOpenClarification && (
              <div className="row mb-3">
                <div className="col-12">
                  {isOwnerOfOpenClarification ? (
                    <Alert variant="info" className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 mb-0">
                      <div>
                        <strong>Your Clarification is Pending</strong> - Your clarification request has been submitted. A response from the tender creator will arrive soon. Quote submission is disabled until the clarification is resolved.
                      </div>
                      {clarificationDeadlineIST && (
                        <div className="small text-muted ms-md-2">
                          Clarification deadline: {clarificationDeadlineIST} IST
                        </div>
                      )}
                    </Alert>
                  ) : (
                    <Alert variant="warning" className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 mb-0">
                      <div>
                        <strong>Clarification in Progress</strong> - A clarification is currently being addressed. Quote submission is temporarily disabled. Please check back later.
                      </div>
                      {clarificationDeadlineIST && (
                        <div className="small text-muted ms-md-2">
                          Clarification deadline: {clarificationDeadlineIST} IST
                        </div>
                      )}
                    </Alert>
                  )}
                </div>
              </div>
            )}
            {/* Clarification window active (no open clarifications yet) */}
            {rfqDetails?.is_tender === 1 &&
              !hasOpenClarification &&
              isClarificationWindowActive && (
                <div className="row mb-3">
                  <div className="col-12">
                    <Alert
                      variant="info"
                      className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 mb-0"
                    >
                      <div>
                        <strong>Clarification Period Active</strong> - You can
                        raise clarifications until the clarification period ends.
                        Quote submission will be enabled only after the
                        clarification date is over and all clarifications are
                        closed.
                      </div>
                      {clarificationDeadlineIST && clarificationCountdown && (
                        <div className="small text-muted ms-md-2">
                          Ends at {clarificationDeadlineIST} IST &mdash; Time left:{" "}
                          {clarificationCountdown}
                        </div>
                      )}
                    </Alert>
                  </div>
                </div>
              )}
            <div className="row">
              <div className="col-md-12">
                <div className="quote-sec-table">
                  <div className="quote-sec-table-top">

                      {/* RFQ Details Section */}
                                      <div className="d-flex flex-wrap justify-content-between gap-4 mb-3 bg-light p-3 rounded-2">
                    {rfqDetails?.company_name && (
                      <div className="text-start">
                        <strong>RFQ No:</strong>
                        <div>#{rfqDetails.rfq_no}</div>
                      </div>
                    )}
                    {rfqDetails?.contact_name && (
                      <div className="text-start">
                        <strong>Company Name:</strong>
                        <div>{rfqDetails?.company_name || ''}</div>
                      </div>
                    )}
                    {rfqDetails?.contact_name && (
                      <div className="text-start">
                        <strong>Contact Person:</strong>
                        <div>{rfqDetails?.contact_name || ""}</div>
                      </div>
                    )}
                    {rfqDetails?.response_email && (
                      <div className="text-start">
                        <strong>Email:</strong>
                        <div>{rfqDetails.response_email}</div>
                      </div>
                    )}
                    {rfqDetails?.contact_number && (
                      <div className="text-start">
                        <strong>Contact Number:</strong>
                        <div>{rfqDetails.contact_number}</div>
                      </div>
                    )}
                    {rfqDetails?.bid_end_date && (
                      <div className="text-start">
                        <strong>Quote Submission Deadline:</strong>
                        <div>{formatDisplayDate(rfqDetails.bid_end_date, { includeTime: true })}</div>
                      </div>
                    )}
                  </div>


        {/* AI file upload start here */}
       <div>
       {/* <div>

         <div className="d-flex align-items-center my-3">
           <hr className="flex-grow-1" />
           <span className="mx-3  fw-semibold">
         Smart Quotation Assist - Wisely 
           </span>
           <hr className="flex-grow-1" />
         </div>

                      <label
                        className="upload uploadInlineFile d-flex align-items-center justify-content-center rounded-2 mb-3 py-2"
                        style={{
                          background: "#edf0ff",
                          border: "1px dashed #c9cff8",
                          cursor: "pointer",
                          opacity: extractingQuotes ? "0.5" : "1",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faWandMagicSparkles}
                          className="me-2"
                        />
                        {extractingQuotes
                          ? "Extracing quotes from document..."
                          : "Upload document to extract quotes"}
                        <input
                          type="file"
                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                          onChange={(e) => uploadExtractionDocument(e)}
                          multiple
                          disabled={extractingQuotes}
                        />
                      </label>

                       start: recently upload files 
                       {globalDocumentFiles &&
                        globalDocumentFiles.length > 0 && (
                          <div className="row">
                            <p className="fw-medium mb-1">
                              New Uploaded Files:
                            </p>
                            <div className="d-flex gap-4">
                              {globalDocumentFiles.map((doc_file) => {
                                return (
                                  <p
                                    key={doc_file}
                                    href={doc_file}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="badge bg-light border text-primary   text-truncate cursor-pointer "
                                    style={{ maxWidth: 280 }}
                                    title={"Click here to download the file"}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeGlobalFiles(doc_file);
                                    }}
                                  >
                                    <FontAwesomeIcon
                                      icon={faDownload}
                                      className="text-primary "
                                    />
                                    <span
                                      className="text-truncate"
                                      style={{
                                        maxWidth: 200,
                                        marginLeft: "10px",
                                      }}
                                    >
                                      {extractfileName(doc_file)}
                                    </span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        )} 
             start: recently upload files
            {globalDocumentFiles && globalDocumentFiles.length > 0 && (
          <div className="row">
           <p className="fw-medium mb-1">New Uploaded Files:</p>
            <div className="d-flex gap-4" >
              {globalDocumentFiles.map((doc_file) => {
               return (
                  <p
                  key={doc_file}
                  href={doc_file}
                  target="_blank"
                  rel="noreferrer"
                  className="badge bg-light border text-primary   text-truncate cursor-pointer "
                  style={{ maxWidth: 280 }}
                  title={"Click here to download the file"}
                  onClick={(e) => {
                      e.preventDefault()
                      removeGlobalFiles(doc_file)
                    }}
                >
                  <FontAwesomeIcon icon={faDownload} className="text-primary " />
                  <span className="text-truncate" style={{ maxWidth: 200, marginLeft: '10px' }}>
                   {extractfileName(doc_file)}
                  </span>
                </p>
 
              )
            })}
            </div>
         </div>
          )}

        {previousGlobalFiles?.length > 0 && (
          <div className=" mb-3">
            <p className="fw-medium mb-1">Previously Uploaded Files:</p>
            <div className="d-flex gap-4 ">
              {previousGlobalFiles.map((prev_file) => (
                <a
                  key={prev_file}
                  href={prev_file}
                  target="_blank"
                  rel="noreferrer"
                  className="badge bg-light border text-primary   text-truncate "
                  style={{ maxWidth: 280 }}
                  title={"Click here to download the file"}
                >
                  <FontAwesomeIcon icon={faDownload} className="text-primary " />
                  <span className="text-truncate" style={{ maxWidth: 200, marginLeft: '10px' }}>
                    {extractfileName(prev_file)}
                  </span>
                </a>
              ))}

            </div>
          </div>
        )} 


       </div> */}

       {/* <div className="d-flex align-items-center my-3">
         <hr className="flex-grow-1" />
         <span className="mx-3  fw-semibold">
           OR send quotation manually
         </span>
         <hr className="flex-grow-1" />
       </div>  */}


                    <div className="row align-items-stretch mb-4">
                      {/* ========== COLUMN 1: Global Costing + Quote Document + Global Comment ========== */}
                      <div className="col-lg-4 col-12 d-flex">
                        <div className="card border shadow-sm rounded-3 w-100" style={{ maxHeight: "400px", position: "relative" }}>
                          {isBidExpired && (
                            <div style={{
                              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                              background: "rgba(255,255,255,0.85)", zIndex: 2,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              borderRadius: "0.5rem",
                            }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#6c757d" }}>You can&apos;t add or edit these charges</span>
                            </div>
                          )}
                          <div className="card-body d-flex flex-column" style={{ overflow: "hidden" }}>
                            <div className="d-flex align-items-center gap-2 mb-3" style={{ flexShrink: 0 }}>
                              <h3 className="fs-6 fw-semibold mb-0">
                                Global Charges
                              </h3>
                              <OverlayTrigger placement="right" overlay={<BsTooltip>This charge will be added to your total amount</BsTooltip>}>
                                <span style={{ cursor: 'pointer', color: '#6c757d' }}><IoMdInformationCircleOutline size={16} /></span>
                              </OverlayTrigger>
                            </div>


                            {/* Global Charges Dropdown - fixed above scroll */}
                            <div style={{ flexShrink: 0 }}>

                            {!isBidExpired && (() => {
                              const selectedNames = globalOtherCharges.map(c => c.name);
                              const availableCharges = chargeNamesList.filter(c => c.is_global && !selectedNames.includes(c.name));

                              if (addingGlobalCustomCharge) {
                                return (
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                    <input type="text" className="form-control form-control-sm" placeholder="Enter charge name"
                                      style={{ flex: 1 }}
                                      value={globalCustomChargeInput} onChange={(e) => setGlobalCustomChargeInput(e.target.value)}
                                      autoFocus
                                      onKeyDown={async (e) => {
                                        if (e.key === "Enter" && globalCustomChargeInput.trim()) {
                                          try {
                                            const res = await createChargeName({ name: globalCustomChargeInput.trim(), is_global: true });
                                            setChargeNamesList(prev => [...prev, { id: res?.data?.id || res?.id, name: globalCustomChargeInput.trim(), is_global: true }]);
                                            setGlobalOtherCharges(prev => [...prev, { _id: generateChargeId(), name: globalCustomChargeInput.trim(), amount: 0, amount_mode: "percentage" }]);
                                            toast.success("Charge added successfully");
                                          } catch (err) { toast.error("Failed to create charge"); }
                                          setAddingGlobalCustomCharge(false); setGlobalCustomChargeInput("");
                                        }
                                      }}
                                    />
                                    <button type="button" className="btn btn-sm btn-success" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={async () => {
                                        if (!globalCustomChargeInput.trim()) return;
                                        try {
                                          const res = await createChargeName({ name: globalCustomChargeInput.trim(), is_global: true });
                                          setChargeNamesList(prev => [...prev, { id: res?.data?.id || res?.id, name: globalCustomChargeInput.trim(), is_global: true }]);
                                          setGlobalOtherCharges(prev => [...prev, { _id: generateChargeId(), name: globalCustomChargeInput.trim(), amount: 0, amount_mode: "percentage" }]);
                                          toast.success("Charge added successfully");
                                        } catch (err) { toast.error("Failed to create charge"); }
                                        setAddingGlobalCustomCharge(false); setGlobalCustomChargeInput("");
                                      }}
                                    >Add</button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={() => { setAddingGlobalCustomCharge(false); setGlobalCustomChargeInput(""); }}
                                    >Cancel</button>
                                  </div>
                                );
                              }

                              if (editingGlobalCustomCharge) {
                                return (
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                    <input type="text" className="form-control form-control-sm" placeholder="Edit charge name"
                                      style={{ flex: 1 }}
                                      value={globalCustomChargeInput} onChange={(e) => setGlobalCustomChargeInput(e.target.value)}
                                      autoFocus
                                      onKeyDown={async (e) => {
                                        if (e.key === "Enter" && globalCustomChargeInput.trim()) {
                                          try {
                                            await updateChargeName(editingGlobalCustomCharge.id, { name: globalCustomChargeInput.trim(), is_global: true });
                                            setChargeNamesList(prev => prev.map(c => c.id === editingGlobalCustomCharge.id ? { ...c, name: globalCustomChargeInput.trim() } : c));
                                            toast.success("Charge updated successfully");
                                          } catch (err) { toast.error("Failed to update charge"); }
                                          setEditingGlobalCustomCharge(null); setGlobalCustomChargeInput("");
                                        }
                                      }}
                                    />
                                    <button type="button" className="btn btn-sm btn-success" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={async () => {
                                        if (!globalCustomChargeInput.trim()) return;
                                        try {
                                          await updateChargeName(editingGlobalCustomCharge.id, { name: globalCustomChargeInput.trim(), is_global: true });
                                          setChargeNamesList(prev => prev.map(c => c.id === editingGlobalCustomCharge.id ? { ...c, name: globalCustomChargeInput.trim() } : c));
                                          toast.success("Charge updated successfully");
                                        } catch (err) { toast.error("Failed to update charge"); }
                                        setEditingGlobalCustomCharge(null); setGlobalCustomChargeInput("");
                                      }}
                                    >Save</button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={() => { setEditingGlobalCustomCharge(null); setGlobalCustomChargeInput(""); }}
                                    >Cancel</button>
                                  </div>
                                );
                              }

                              return (
                                <div className="position-relative mb-3">
                                  {globalChargeDropdownOpen && (
                                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                                      onClick={() => setGlobalChargeDropdownOpen(false)}
                                    />
                                  )}
                                  <div className="form-select form-select-sm" style={{ cursor: "pointer" }}
                                    onClick={() => setGlobalChargeDropdownOpen(prev => !prev)}
                                  >
                                    Select tax type...
                                  </div>
                                  {globalChargeDropdownOpen && (
                                    <div className="position-absolute w-100 bg-white border rounded shadow-sm d-flex flex-column" style={{ zIndex: 10, top: "100%", left: 0, maxHeight: "200px" }}>
                                      <div style={{ flex: 1, overflowY: "auto" }}>
                                      {availableCharges.map(charge => (
                                        <div key={charge.id} className="d-flex align-items-center justify-content-between px-3 py-2" style={{ cursor: "pointer", fontSize: "0.85rem" }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        >
                                          <span style={{ flex: 1 }} onClick={() => {
                                            setGlobalOtherCharges(prev => [...prev, { _id: generateChargeId(), name: charge.name, amount: 0, amount_mode: "percentage" }]);
                                            setGlobalChargeDropdownOpen(false);
                                          }}>{charge.name}</span>
                                          {charge.created_by !== null && (
                                            <span className="d-flex gap-2 ms-2" style={{ flexShrink: 0 }}>
                                              <FiEdit2 size={13} color="#198754" style={{ cursor: "pointer" }} title="Edit"
                                                onClick={(e) => { e.stopPropagation(); setEditingGlobalCustomCharge(charge); setGlobalCustomChargeInput(charge.name); setGlobalChargeDropdownOpen(false); }}
                                              />
                                              <FiTrash2 size={13} color="#dc3545" style={{ cursor: "pointer" }} title="Delete"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  try {
                                                    await deleteChargeName(charge.id);
                                                    setChargeNamesList(prev => prev.filter(c => c.id !== charge.id));
                                                    toast.success("Charge deleted successfully");
                                                  } catch (err) { toast.error("Failed to delete charge"); }
                                                  setGlobalChargeDropdownOpen(false);
                                                }}
                                              />
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      </div>
                                      <div className="px-3 py-2 text-primary fw-semibold" style={{ cursor: "pointer", fontSize: "0.85rem", borderTop: "1px solid #eee", flexShrink: 0 }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        onClick={() => { setAddingGlobalCustomCharge(true); setGlobalChargeDropdownOpen(false); }}
                                      >
                                        + Add custom charge
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            </div>

                            {/* Scrollable charge cards */}
                            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                            {globalOtherCharges.map((charge, idx) => (
                              <div key={charge._id} className="border rounded p-2 mb-2" style={{ fontSize: "0.85rem" }}>
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>{charge.name}</span>
                                  {!isBidExpired && (
                                    <FiTrash2 size={14} color="#dc3545" style={{ cursor: "pointer", flexShrink: 0 }}
                                      onClick={() => setGlobalOtherCharges(prev => prev.filter(c => c._id !== charge._id))}
                                    />
                                  )}
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                  <input type="number" min={0} className="form-control form-control-sm" style={{ flex: 1, minWidth: 0 }}
                                    placeholder={charge.amount_mode === "percentage" ? "Tax (%)" : "Tax (₹)"}
                                    value={charge.amount || ""}
                                    disabled={isBidExpired}
                                    onChange={(e) => {
                                      const updated = [...globalOtherCharges];
                                      updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                                      setGlobalOtherCharges(updated);
                                    }}
                                    onWheel={(e) => e.currentTarget.blur()}
                                  />
                                  <PercentageAbsoluteToggle currentMode={charge.amount_mode}
                                    disabled={isBidExpired}
                                    onToggle={(value) => {
                                      const updated = [...globalOtherCharges];
                                      updated[idx] = { ...updated[idx], amount_mode: value };
                                      setGlobalOtherCharges(updated);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                            </div>

                            {/* Upload Quotation Document */}
                            <label
                              className={`upload uploadInlineFile d-flex align-items-center justify-content-center rounded-2 mb-3 py-2 mt-3 ${isBidExpired ? "disabled" : ""}`}
                              style={{
                                background: "#edf0ff",
                                border: "1px dashed #c9cff8",
                                cursor: isBidExpired ? "not-allowed" : "pointer",
                                opacity: isBidExpired ? 0.6 : 1,
                              }}
                            >
                              <FontAwesomeIcon icon={faFile} className="me-2" />
                              Upload Quotation Document
                              <input
                                type="file"
                                accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                onChange={(e) => uploadGlobalDocumentFiles(e)}
                                multiple
                                disabled={isBidExpired}
                              />
                            </label>

                            {/* Uploaded Files */}
                            {globalDocumentFiles &&
                              globalDocumentFiles.length > 0 && (
                                <div className="row">
                                  <p className="fw-medium mb-1">
                                    New Uploaded Files:
                                  </p>
                                  <div className="d-flex gap-4">
                                    {globalDocumentFiles.map((doc_file) => (
                                      <p
                                        key={doc_file}
                                        className="badge bg-light border text-primary text-truncate cursor-pointer"
                                        style={{ maxWidth: 280 }}
                                        title="Click here to remove file"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          removeGlobalFiles(doc_file);
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faDownload}
                                          className="text-primary"
                                        />
                                        <span
                                          className="text-truncate"
                                          style={{
                                            maxWidth: 200,
                                            marginLeft: "10px",
                                          }}
                                        >
                                          {extractfileName(doc_file)}
                                        </span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {previousGlobalFiles?.length > 0 && (
                              <div className="mb-3">
                                <p className="fw-medium mb-1">
                                  Previously Uploaded Files:
                                </p>
                                <div className="d-flex gap-4">
                                  {previousGlobalFiles.map((prev_file) => (
                                    <a
                                      key={prev_file}
                                      href={prev_file}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="badge bg-light border text-primary text-truncate"
                                      style={{ maxWidth: 280 }}
                                      title="Click here to download the file"
                                    >
                                      <FontAwesomeIcon
                                        icon={faDownload}
                                        className="text-primary"
                                      />
                                      <span
                                        className="text-truncate"
                                        style={{
                                          maxWidth: 200,
                                          marginLeft: "10px",
                                        }}
                                      >
                                        {extractfileName(prev_file)}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Global Comment moved here */}
                            {/* <h3 className="fs-6 fw-semibold mb-2">
                              Global Comment
                            </h3>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={globalComment}
                              placeholder="Placeholder text for global comment"
                              onChange={(e) => setglobalComment(e.target.value)}
                            /> */}
                          </div>
                        </div>
                      </div>

                      {/* ========== COLUMN 2: Payment Terms (summary) + Global Comment ========== */}
                      <div className="col-lg-3 col-12 d-flex">
                        <div className="card border shadow-sm rounded-3 w-100 h-100">
                          <div className="card-body d-flex flex-column">
                          
                          {globalPaymentTerms && (
                          <>
                            <div className="mb-3 d-flex align-items-center justify-content-between">
                              <h3 className="fs-6 fw-semibold mb-0">Payment Terms <span className="text-danger">*</span></h3>
                            </div>
                            <textarea
                              className="form-control mb-3"
                              rows={3}
                              value={globalPaymentTerms}
                              placeholder="100% Against Proforma Invoice"
                              onChange={(e) => setglobalPaymentTerms(e.target.value)}
                              disabled={isBidExpired}
                            />
                            </>
                          )}

                            <h3 className="fs-6 fw-semibold mb-2">Global Comment</h3>
                            <textarea
                              className="form-control flex-grow-1"
                            value={globalComment}
                            placeholder="Placeholder text for global comment"
                            onChange={(e) => setglobalComment(e.target.value)}
                            disabled={isBidExpired}
                          />
                        </div>
                      </div>
                      </div>

                      {/* ========== COLUMN 3: Payment Terms Breakdown (editor) ========== */}
                      <div className="col-lg-5 col-12">
                        <div className="border rounded-3 p-3 pb-2 mb-3" >
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex flex-column gap-2 w-100">
                              <h3 className="fs-6 fw-semibold mb-0">GSTIN <span className="text-muted">(optional)</span></h3>
                              <input
                                className="form-control w-100"
                                max={15}
                                value={vendorGSTIN}
                                placeholder="Enter your GSTIN as per delivery location"
                                onChange={(e) => setVendorGSTIN(e.target.value)}
                                disabled={isBidExpired}
                              />
                            </div>
                          </div>
                          </div>

                          {(() => {
                            const paymentTermsNegField = Object.values(activeNegotiationFields).flat().find(f => f.name === 'payment_terms');
                            const isPaymentTermsNegotiated = !!paymentTermsNegField;
                            const paymentTermsEnabled = !isBidExpired || isPaymentTermsNegotiated;
                            const buyerPaymentComment = paymentTermsNegField?.targetPrice || '';
                            return (
                          <div className={`rounded-3 p-3 pb-2 ${isPaymentTermsNegotiated ? '' : 'border'}`} style={isPaymentTermsNegotiated ? { border: '2px solid #f0ad4e' } : {}}>
                              <div className="d-flex align-items-center justify-content-between mb-2">
                              <div>
                              <h3 className="fs-6 fw-semibold mb-0">Payment Terms <span className="text-danger">*</span></h3>
                                <small className="text-muted">amount defined so far: {paymentTermsRows.reduce((a,b)=>a+(Number(b.value)||0),0)}%</small>
                                {paymentTermsRows.filter(row => 
                                  row && 
                                  row.action !== "delete" && 
                                  row.type && 
                                  row.value != null && 
                                  row.value > 0
                                ).length === 0 && (
                                  <>
                                    <br />
                                    <small className="text-danger">At least one valid payment term is required</small>
                                  </>
                                )}
                                </div>

                            {paymentTermsEnabled && (
                            <SmartButton
                                  onClick={() =>
                                    setPaymentTermsRows((prev) => [ ...(prev || []), { id:null,  value: "", type: "advance", days: "", comment:'' } ])
                                  }
                            theme={'primary'}
                            style={{ paddingLeft: "0.5rem", paddingRight: "0.5rem", fontSize: "0.75rem" }}
                            label="+ Add"
                          />
                            )}

                              </div>

                              <PaymentTermsEditor
                                value={paymentTermsRows}
                                onChange={setPaymentTermsRows}
                                disabled={!paymentTermsEnabled}
                              />
                              {isPaymentTermsNegotiated && (
                                <div className="text-end mt-1">
                                  <span
                                    style={{ fontSize: '0.72rem', color: '#856404', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                                    onClick={() => setShowBuyerCommentModal({ field: 'payment_terms' })}
                                  >
                                    View Buyer Comment
                                  </span>
                                </div>
                              )}

                              {/* Buyer Comment Modal for text fields */}
                              {showBuyerCommentModal && (
                                <Modal
                                  isOpen={true}
                                  onRequestClose={() => setShowBuyerCommentModal(null)}
                                  ariaHideApp={false}
                                  contentLabel="Buyer Comment"
                                  className="contact-modal contact-modal-new"
                                  style={{
                                    overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 9999 },
                                    content: {
                                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                                      maxWidth: "550px", width: "90%", border: "none", background: "#fff",
                                      borderRadius: "8px", padding: "24px", maxHeight: "60vh", overflow: "auto",
                                    },
                                  }}
                                >
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="fw-bold mb-0" style={{ fontSize: "1rem" }}>
                                      {showBuyerCommentModal.field === 'payment_terms' && "Buyer's Comment on Payment Terms"}
                                      {showBuyerCommentModal.field === 'comments' && "Buyer's Comment"}
                                      {showBuyerCommentModal.field === 'documents' && "Buyer's Comments on Documents"}
                                    </h5>
                                    <button onClick={() => setShowBuyerCommentModal(null)} className="btn-close" aria-label="Close" style={{ fontSize: "0.7rem" }}></button>
                                  </div>
                                  {(() => {
                                    const allNegFields = Object.values(activeNegotiationFields).flat();
                                    const negField = allNegFields.find(f => f.name === showBuyerCommentModal.field);
                                    const target = negField?.targetPrice;
                                    if (showBuyerCommentModal.field === 'documents' && Array.isArray(target)) {
                                      return (
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                          {target.map((doc, idx) => (
                                            <div key={idx} className="border rounded p-2 mb-2">
                                              <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>Document {(doc.document_index || 0) + 1}</span>
                                                {doc.file_url && (
                                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>View Doc</a>
                                                )}
                                              </div>
                                              <div style={{ fontSize: '0.85rem', background: '#fff8e1', border: '1px solid #f0ad4e', borderRadius: '6px', padding: '8px 12px' }}>
                                                {doc.comment || 'No comment'}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#333", background: "#fff8e1", border: "1px solid #f0ad4e", borderRadius: "6px", padding: "12px 16px", whiteSpace: 'pre-wrap' }}>
                                        {(typeof target === 'string' ? target : '') || 'No comment provided.'}
                                      </div>
                                    );
                                  })()}
                                </Modal>
                              )}
                              {/* Previous Documents Modal */}
                              {showPrevDocsModal && (
                                <Modal
                                  isOpen={true}
                                  onRequestClose={() => setShowPrevDocsModal(null)}
                                  ariaHideApp={false}
                                  contentLabel="Previous Documents"
                                  className="contact-modal contact-modal-new"
                                  style={{
                                    overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 9999 },
                                    content: {
                                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                                      maxWidth: "450px", width: "90%", border: "none", background: "#fff",
                                      borderRadius: "8px", padding: "24px", maxHeight: "60vh", overflow: "auto",
                                    },
                                  }}
                                >
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="fw-bold mb-0" style={{ fontSize: "1rem" }}>Previous Documents</h5>
                                    <button onClick={() => setShowPrevDocsModal(null)} className="btn-close" aria-label="Close" style={{ fontSize: "0.7rem" }}></button>
                                  </div>
                                  <div>
                                    {(showPrevDocsModal.files || []).map((fileUrl, idx) => (
                                      <div key={idx} className="d-flex align-items-center justify-content-between border rounded p-2 mb-2">
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Document {idx + 1}</span>
                                        <div className="d-flex align-items-center gap-2">
                                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>
                                            View Doc
                                          </a>
                                          {!isBidExpired && <FiTrash2 size={13} color="#dc3545" style={{ cursor: "pointer", flexShrink: 0 }} title="Delete"
                                            onClick={async () => {
                                              try {
                                                await deleteQuoteFile(fileUrl);
                                                const pIdx = showPrevDocsModal.productIndex;
                                                setquoteProducts(prev => prev.map((p, i) => {
                                                  if (i !== pIdx) return p;
                                                  return { ...p, previous_document_files: p.previous_document_files.filter(f => f !== fileUrl) };
                                                }));
                                                const updatedFiles = showPrevDocsModal.files.filter(f => f !== fileUrl);
                                                if (updatedFiles.length === 0) {
                                                  setShowPrevDocsModal(null);
                                                } else {
                                                  setShowPrevDocsModal({ ...showPrevDocsModal, files: updatedFiles });
                                                }
                                                toast.success("File deleted successfully");
                                              } catch (err) {
                                                toast.error("Failed to delete file");
                                              }
                                            }}
                                          />}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </Modal>
                              )}
                            </div>
                          )
                          })()}
                      </div>
                  </div>
                  </div>
                  {/* Charges Modal */}
                  {chargesModalOpen !== null && rfqDetails?.products && (() => {
                    const modalIndex = chargesModalOpen;
                    const modalProduct = quoteProducts[modalIndex];
                    const rfqProduct = rfqDetails.products[modalIndex];
                    if (!modalProduct || !rfqProduct) return null;
                    const productName = rfqProduct?.product_details?.[0]?.name || "Item";
                    const qty = parseFloat(getProductSpecValueByTitle(rfqProduct?.product_specs, "Quantity")) || 0;
                    const unit = getProductSpecValueByTitle(rfqProduct?.product_specs, "Unit") || "";
                    const base = (parseFloat(modalProduct.unit_price) || 0) * qty;

                    // Charges total comes from the engine output for this line.
                    const modalLine = pricingTotals?.lines?.[modalIndex];
                    const allChargesTotal = Number(modalLine?.charges_total) || 0;

                    const isProductFinalized = rfqProduct.finalization_status === "Another vendor is finalized" || rfqProduct.finalization_status === "You are finalized";
                    const techStatus = techEvalStatuses[rfqProduct.id];
                    const isTechEvalPendingOrRejected = showTechEvalRestrictions && techStatus && techStatus.has_tech_eval === true && techStatus.is_accepted !== true;
                    const isNegotiationSubmittedForProduct = !!negotiationQuoteSubmitted[rfqProduct.id];
                    const isBidExpiredForProduct = isBidExpired && !activeNegotiationProductIds.has(rfqProduct.id);
                    const isDisabled = isProductFinalized || isTechEvalPendingOrRejected || isNegotiationSubmittedForProduct || isBidExpiredForProduct;

                    // Per-field negotiation check for modal charges
                    const modalNegotiatedFields = activeNegotiationFields[rfqProduct.id] || [];
                    const isChargeNegotiable = (chargeName, chargeSlug) => {
                      if (!isBidExpired) return true;
                      if (!activeNegotiationProductIds.has(rfqProduct.id)) return false;
                      if (isProductFinalized || isTechEvalPendingOrRejected || isNegotiationSubmittedForProduct) return false;
                      return modalNegotiatedFields.some(f => f.name === chargeName || f.name === chargeSlug || f.name === (chargeSlug || chargeName));
                    };
                    const getChargeTargetPrice = (chargeNameOrSlug) => {
                      const field = modalNegotiatedFields.find(f => f.name === chargeNameOrSlug);
                      return field?.targetPrice ?? null;
                    };
                    const getChargeTargetMode = (chargeNameOrSlug) => {
                      const field = modalNegotiatedFields.find(f => f.name === chargeNameOrSlug);
                      return field?.mode || null;
                    };
                    const formatChargeTarget = (chargeNameOrSlug) => {
                      const tp = getChargeTargetPrice(chargeNameOrSlug);
                      if (tp == null) return null;
                      const mode = getChargeTargetMode(chargeNameOrSlug);
                      return mode === 'percentage' ? `${tp}%` : `₹${tp}`;
                    };
                    const isBidExpiredWithNegotiation = isBidExpired && !isBidExpiredForProduct;

                    const handleChargesModalClose = () => {
                      // Comment is mandatory for every charge — vendors must
                      // describe the tax type / remarks for the buyer.
                      const missing = (modalProduct.other_charges || []).find(c => !c.comment?.trim());
                      if (missing) {
                        setInvalidCommentChargeId(missing._id);
                        toast.error('Please add a comment for every charge');
                        return;
                      }
                      setInvalidCommentChargeId(null);
                      setChargesModalOpen(null);
                    };

                    return (
                      <Modal
                        isOpen={true}
                        onRequestClose={handleChargesModalClose}
                        ariaHideApp={false}
                        contentLabel="Charges Modal"
                        className="contact-modal contact-modal-new"
                        style={{
                          overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 9999 },
                          content: {
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            maxWidth: "780px",
                            width: "95%",
                            border: "none",
                            background: "transparent",
                            overflow: "hidden",
                            padding: "20px",
                            maxHeight: "85vh",
                            height: "85vh",
                          },
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", borderRadius: "8px", overflow: "hidden" }}>
                          {/* Fixed Header */}
                          <div className="d-flex justify-content-between align-items-center" style={{ padding: "16px 20px", borderBottom: "1px solid #dee2e6", flexShrink: 0 }}>
                            <h5 className="fw-bold mb-0" style={{ fontSize: "1rem" }}>Charges — {productName} <small className="text-muted">(Qty: {qty} {unit})</small></h5>
                            <button onClick={handleChargesModalClose} className="btn-close" aria-label="Close" style={{ fontSize: "0.7rem" }}></button>
                          </div>

                          {/* Scrollable Body */}
                          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                            {/* Charge Dropdown */}
                            {!isDisabled && (() => {
                              const selectedNames = (modalProduct.other_charges || []).map(c => c.name);
                              const availableCharges = chargeNamesList.filter(c => !c.is_global && !selectedNames.includes(c.name));

                              if (addingCustomCharge) {
                                return (
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                    <input type="text" className="form-control form-control-sm" placeholder="Enter charge name"
                                      style={{ flex: 1 }}
                                      value={customChargeInput} onChange={(e) => setCustomChargeInput(e.target.value)}
                                      autoFocus
                                      onKeyDown={async (e) => {
                                        if (e.key === "Enter" && customChargeInput.trim()) {
                                          try {
                                            const res = await createChargeName({ name: customChargeInput.trim(), is_global: false });
                                            setChargeNamesList(prev => [...prev, { id: res?.data?.id || res?.id, name: customChargeInput.trim(), is_global: false }]);
                                            handleAddOtherCharge(modalIndex, customChargeInput.trim());
                                            toast.success("Charge added successfully");
                                          } catch (err) { toast.error("Failed to create charge"); }
                                          setAddingCustomCharge(false); setCustomChargeInput("");
                                        }
                                      }}
                                    />
                                    <button type="button" className="btn btn-sm btn-success" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={async () => {
                                        if (!customChargeInput.trim()) return;
                                        try {
                                          const res = await createChargeName({ name: customChargeInput.trim(), is_global: false });
                                          setChargeNamesList(prev => [...prev, { id: res?.data?.id || res?.id, name: customChargeInput.trim(), is_global: false }]);
                                          handleAddOtherCharge(modalIndex, customChargeInput.trim());
                                          toast.success("Charge added successfully");
                                          } catch (err) { toast.error("Failed to create charge"); }
                                        setAddingCustomCharge(false); setCustomChargeInput("");
                                      }}
                                    >Add</button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={() => { setAddingCustomCharge(false); setCustomChargeInput(""); }}
                                    >Cancel</button>
                                  </div>
                                );
                              }

                              if (editingCustomCharge) {
                                return (
                                  <div className="d-flex align-items-center gap-2 mb-3">
                                    <input type="text" className="form-control form-control-sm" placeholder="Edit charge name"
                                      style={{ flex: 1 }}
                                      value={customChargeInput} onChange={(e) => setCustomChargeInput(e.target.value)}
                                      autoFocus
                                      onKeyDown={async (e) => {
                                        if (e.key === "Enter" && customChargeInput.trim()) {
                                          try {
                                            await updateChargeName(editingCustomCharge.id, { name: customChargeInput.trim() });
                                            setChargeNamesList(prev => prev.map(c => c.id === editingCustomCharge.id ? { ...c, name: customChargeInput.trim() } : c));
                                            toast.success("Charge updated successfully");
                                          } catch (err) { toast.error("Failed to update charge"); }
                                          setEditingCustomCharge(null); setCustomChargeInput("");
                                        }
                                      }}
                                    />
                                    <button type="button" className="btn btn-sm btn-success" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={async () => {
                                        if (!customChargeInput.trim()) return;
                                        try {
                                          await updateChargeName(editingCustomCharge.id, { name: customChargeInput.trim() });
                                          setChargeNamesList(prev => prev.map(c => c.id === editingCustomCharge.id ? { ...c, name: customChargeInput.trim() } : c));
                                          toast.success("Charge updated successfully");
                                          } catch (err) { toast.error("Failed to update charge"); }
                                        setEditingCustomCharge(null); setCustomChargeInput("");
                                      }}
                                    >Save</button>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" style={{ fontSize: "0.75rem", padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, width: "auto" }}
                                      onClick={() => { setEditingCustomCharge(null); setCustomChargeInput(""); }}
                                    >Cancel</button>
                                  </div>
                                );
                              }

                              return (
                                <div className="position-relative mb-3">
                                  {chargeDropdownOpen && (
                                    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
                                      onClick={() => setChargeDropdownOpen(false)}
                                    />
                                  )}
                                  <div className="form-select form-select-sm"
                                    style={{ cursor: isBidExpiredWithNegotiation ? "not-allowed" : "pointer", opacity: isBidExpiredWithNegotiation ? 0.6 : 1 }}
                                    onClick={() => { if (!isBidExpiredWithNegotiation) setChargeDropdownOpen(prev => !prev); }}
                                  >
                                    Select charge type...
                                  </div>
                                  {chargeDropdownOpen && (
                                    <div className="position-absolute w-100 bg-white border rounded shadow-sm d-flex flex-column" style={{ zIndex: 10, top: "100%", left: 0, maxHeight: "200px" }}>
                                      <div style={{ flex: 1, overflowY: "auto" }}>
                                      {availableCharges.map(charge => (
                                        <div key={charge.id} className="d-flex align-items-center justify-content-between px-3 py-2" style={{ cursor: "pointer", fontSize: "0.85rem" }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        >
                                          <span style={{ flex: 1 }} onClick={() => { handleAddOtherCharge(modalIndex, charge.name); setChargeDropdownOpen(false); }}>{charge.name}</span>
                                          {charge.created_by !== null && (
                                            <span className="d-flex gap-2 ms-2" style={{ flexShrink: 0 }}>
                                              <FiEdit2 size={13} color="#198754" style={{ cursor: "pointer" }} title="Edit"
                                                onClick={(e) => { e.stopPropagation(); setEditingCustomCharge(charge); setCustomChargeInput(charge.name); setChargeDropdownOpen(false); }}
                                              />
                                              <FiTrash2 size={13} color="#dc3545" style={{ cursor: "pointer" }} title="Delete"
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  try {
                                                    await deleteChargeName(charge.id);
                                                    setChargeNamesList(prev => prev.filter(c => c.id !== charge.id));
                                                    toast.success("Charge deleted successfully");
                                                  } catch (err) { toast.error("Failed to delete charge"); }
                                                  setChargeDropdownOpen(false);
                                                }}
                                              />
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      </div>
                                      <div className="px-3 py-2 text-primary fw-semibold" style={{ cursor: "pointer", fontSize: "0.85rem", borderTop: "1px solid #eee", flexShrink: 0 }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        onClick={() => { setAddingCustomCharge(true); setChargeDropdownOpen(false); }}
                                      >
                                        + Add custom charge
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Charges List */}
                            {(modalProduct.other_charges || []).length > 0 && (
                              <h6 className="fw-semibold mb-3 text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Charges</h6>
                            )}

                            {(modalProduct.other_charges || []).length === 0 && (
                              <p className="text-muted text-center py-3" style={{ fontSize: "0.85rem" }}>No charges added yet. Select a charge type above.</p>
                            )}

                            {(modalProduct.other_charges || []).map((charge) => {
                              const chargeDisabled = !isChargeNegotiable(charge.name, charge.slug);
                              const chargeTarget = getChargeTargetPrice(charge.slug || charge.name);
                              const chargeTargetFormatted = formatChargeTarget(charge.slug || charge.name);
                              const isNegotiatedCharge = chargeTarget != null;
                              return (
                              <div key={charge._id} className="border rounded p-2 mb-2" style={isNegotiatedCharge ? { border: '2px solid #f0ad4e' } : {}}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>
                                    {charge.name}
                                    {isNegotiatedCharge && <small className="ms-2" style={{ color: '#856404', fontWeight: 600 }}>(Target: {chargeTargetFormatted})</small>}
                                  </span>
                                  {!chargeDisabled && !isNegotiatedCharge && (
                                    <FiTrash2 size={14} color="#dc3545" style={{ cursor: "pointer", flexShrink: 0 }}
                                      onClick={() => handleRemoveOtherCharge(modalIndex, charge._id)}
                                    />
                                  )}
                                </div>
                                <div className="row g-4 align-items-start">
                                  <div className="col-sm-4">
                                    <small className="text-muted d-block mb-1">Amount</small>
                                    <div className="d-flex align-items-center gap-1">
                                      <input type="number" min={0} className="form-control form-control-sm" style={{ flex: 1, minWidth: 0, ...(isNegotiatedCharge ? { border: '2px solid #f0ad4e' } : {}) }}
                                        placeholder={charge.amount_mode === "percentage" ? "%" : "₹"}
                                        value={charge.amount || ""}
                                        onChange={(e) => handleUpdateOtherCharge(modalIndex, charge._id, "amount", parseFloat(e.target.value) || 0)}
                                        onWheel={(e) => e.target.blur()} disabled={chargeDisabled}
                                      />
                                      <PercentageAbsoluteToggle currentMode={charge.amount_mode}
                                        disabled={chargeDisabled}
                                        onToggle={(value) => handleUpdateOtherCharge(modalIndex, charge._id, "amount_mode", value)}
                                      />
                                    </div>
                                    {isNegotiatedCharge && (
                                      <div style={{ background: '#333', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', marginTop: '3px', display: 'inline-block' }}>
                                        Target: {chargeTargetFormatted}
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-sm-4">
                                    <small className="text-muted d-block mb-1">Tax</small>
                                    <div className="d-flex align-items-center gap-1">
                                      {/*
                                        Tri-state tax input:
                                          blank  → tax: null (inherit base rate)
                                          0      → explicit no tax on this charge
                                          n > 0  → explicit rate
                                        Render the actual value (so 0 shows as "0", not blank), and
                                        only blank for null/undefined so the placeholder is visible.
                                      */}
                                      <input type="number" min={0} className="form-control form-control-sm" style={{ flex: 1, minWidth: 0 }}
                                        placeholder={`Uses base tax (${quoteProducts[modalIndex]?.tax || 0}${chargesMode.tax[rfqProduct.id] === 'absolute' ? '₹' : '%'})`}                                        value={charge.tax === null || charge.tax === undefined || charge.tax === "" ? "" : charge.tax}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const next = raw === "" ? null : (Number.isFinite(parseFloat(raw)) ? parseFloat(raw) : null);
                                          handleUpdateOtherCharge(modalIndex, charge._id, "tax", next);
                                        }}
                                        onWheel={(e) => e.target.blur()} disabled={chargeDisabled || isNegotiatedCharge}
                                        />
                                        <PercentageAbsoluteToggle currentMode={charge.tax_mode}
                                        disabled={chargeDisabled || isNegotiatedCharge}
                                        onToggle={(value) => handleUpdateOtherCharge(modalIndex, charge._id, "tax_mode", value)}
                                        />
                                        </div>
                                        {(charge.tax === undefined || charge.tax === "" || charge.tax === null) && (
                                        <div style={{ color: '#856404', fontSize: '0.7rem', lineHeight: 1.3, marginTop: '4px', backgroundColor: '#fff8e1', marginTop: 6, padding: '2px 6px', borderRadius: '3px', border: '1px solid #f0ad4e' }}>
                                        Enter 0 for non-taxable charge.
                                        </div>
                                        )}
                                        </div>
                                        <div className="col-sm-4">
                                    {(() => {
                                      const COMMENT_MAX = 30;
                                      const commentLen = (charge.comment || "").length;
                                      const atLimit = commentLen >= COMMENT_MAX;
                                      return (
                                        <>
                                          <div className="d-flex align-items-center gap-1 mb-1">
                                            <small className="text-muted">Comment <span className="text-danger">*</span></small>
                                            <CustomInfoTooltip text="Enter tax type, remarks or comments for the buyer" />
                                          </div>
                                          <input type="text" className="form-control form-control-sm"
                                            style={{ minWidth: 0, border: invalidCommentChargeId === charge._id ? '2px solid #dc3545' : undefined }}
                                            placeholder="What is this tax for?"
                                            value={charge.comment || ""}
                                            maxLength={COMMENT_MAX}
                                            onChange={(e) => {
                                              if (invalidCommentChargeId === charge._id) setInvalidCommentChargeId(null);
                                              handleUpdateOtherCharge(modalIndex, charge._id, "comment", e.target.value);
                                            }}
                                            disabled={chargeDisabled}
                                          />
                                          <div style={{
                                            fontSize: '0.7rem',
                                            color: atLimit ? '#dc3545' : '#6c757d',
                                            textAlign: 'right',
                                            marginTop: '2px',
                                          }}>
                                            {commentLen}/{COMMENT_MAX}
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>

                          {/* Sticky Footer: Summary + Save Button */}
                          <div style={{ flexShrink: 0, borderTop: "1px solid #dee2e6" }}>
                            <div className="p-3" style={{ background: "#f8f9fa" }}>
                              <div
                                className="d-flex justify-content-between align-items-center"
                                style={{ cursor: "pointer", padding: "4px 0", borderRadius: "4px", transition: "background-color 0.2s ease" }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#eaeaea"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                onClick={() => setChargesSummaryOpen(prev => !prev)}
                              >
                                <h6 className="fw-semibold mb-0" style={{ fontSize: "0.8rem" }}>Charges Summary</h6>
                                {chargesSummaryOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                              </div>
                              {chargesSummaryOpen && (
                                <div style={{ fontSize: "0.82rem", marginTop: "8px" }}>
                                  {(modalProduct.other_charges || []).map((charge, chargeIdx) => {
                                    const engineCharge = modalLine?.charges?.[chargeIdx];
                                    const cAmt = Number(engineCharge?.amount) || 0;
                                    const cTax = Number(engineCharge?.tax) || 0;
                                    if (cAmt <= 0 && cTax <= 0) return null;
                                    return (
                                      <div key={charge._id} className="d-flex justify-content-between">
                                        <span>{charge.name || "Unnamed"}:</span>
                                        <span>₹{cAmt.toFixed(2)} {cTax > 0 ? `(Tax: ₹${cTax.toFixed(2)})` : ""}</span>
                                      </div>
                                    );
                                  })}
                                  <hr className="my-2" />
                                  <div className="d-flex justify-content-between fw-bold">
                                    <span>All Charges Total:</span>
                                    <span>₹{allChargesTotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Modal>
                    );
                  })()}

                  <div  className="table-responsive" style={{ width: "100%", overflowX: "hidden" }}>
                    <div className="table-container">
                      <table className="table" style={{ width: "100%", tableLayout: "auto" }}>
                        <thead>
                          <tr>
                            <th
                              rowSpan="2"
                              className="align-middle text-center"
                              style={{ width: "45px", maxWidth: "45px" }}
                            >
                              Sl No.
                            </th>
                            <th rowSpan="2" className="align-middle">
                              Item Details
                            </th>
                            <th
                              className="text-center align-middle"
                              style={{ width: "150px", minWidth: "150px", maxWidth: "150px" }}
                            >
                              Base Price<br/>+<br/>Other Charges
                            </th>

                            <th className="text-center align-middle" style={{ minWidth: "150px" }}>Total</th>
                            {currentLowest ? (
                              <th rowSpan="2" className="align-middle text-center">
                                Current Lowest
                              </th>
                            ) : null}
                            <th className="text-center align-middle" style={{ width: "130px" }}>Comment(s)</th>
                            <th className="text-center align-middle" style={{ width: "110px" }}>
                              Delivery Period <small>(In Days)</small>
                            </th>
                            <th className="text-center align-middle">Documents</th>
                            {/* {alreadyQuoted ? (
                              <th className="text-center">
                                Previous Documents
                              </th>
                            ) : null} */}
                          </tr>
                        </thead>
                        <tbody>
                          {rfqDetails.products &&
                            rfqDetails.products.length > 0 &&
                            rfqDetails.products.map((item, index) => {
                              if (isAvailableForQuote(item)) {
                                // Changes by Agnij 2024-07-29 [Fix tech eval restrictions check]
                                const techStatus = techEvalStatuses[item.id];

                                // Determine if inputs should be disabled - only during reverse auction for rejected products
                                const isTechEvalPendingOrRejected =
                                  showTechEvalRestrictions &&
                                  techStatus &&
                                  techStatus.has_tech_eval === true &&
                                  techStatus.is_accepted !== true;

                                // Check if this specific product has a negotiation quote already submitted
                                const isNegotiationSubmittedForProduct = !!negotiationQuoteSubmitted[item.id];
                                // When bid has expired, disable products that do NOT have an active negotiation round
                                const isBidExpiredForProduct = isBidExpired && !activeNegotiationProductIds.has(item.id);
                                const isProductFinalized = item.finalization_status === "Another vendor is finalized" || item.finalization_status === "You are finalized";
                                const isProductDisabled = isProductFinalized || isTechEvalPendingOrRejected || isNegotiationSubmittedForProduct || isBidExpiredForProduct;
                                // When bid expired but negotiation active, only negotiated fields should be enabled
                                const isBidExpiredNonNegotiable = isBidExpired && !isBidExpiredForProduct && !isProductFinalized && !isTechEvalPendingOrRejected && !isNegotiationSubmittedForProduct;

                                // Per-field negotiation check
                                const negotiatedFields = activeNegotiationFields[item.id] || [];
                                const isFieldNegotiable = (fieldName) => {
                                  if (!isBidExpired) return true;
                                  if (!activeNegotiationProductIds.has(item.id)) return false;
                                  if (isProductFinalized || isTechEvalPendingOrRejected || isNegotiationSubmittedForProduct) return false;
                                  return negotiatedFields.some(f => f.name === fieldName);
                                };
                                const getTargetPrice = (fieldName) => {
                                  const field = negotiatedFields.find(f => f.name === fieldName);
                                  return field?.targetPrice ?? null;
                                };
                                const getTargetMode = (fieldName) => {
                                  const field = negotiatedFields.find(f => f.name === fieldName);
                                  return field?.mode || null;
                                };
                                const formatTarget = (fieldName) => {
                                  const tp = getTargetPrice(fieldName);
                                  if (tp == null) return null;
                                  const mode = getTargetMode(fieldName);
                                  return mode === 'percentage' ? `${tp}%` : `₹${tp}`;
                                };
                                const hasBasePriceTarget = getTargetPrice('base_price') != null && isFieldNegotiable('base_price');

                                return (
                                  <React.Fragment key={`q_${item.id}_${item.product_id}_${item.variant}`}>
                                  <tr
                                  >
                                    <td style={{ textAlign: "center", backgroundColor: "#f8f9fa", verticalAlign: "middle" }}>{index + 1}</td>
                                    <td>
                                      <p className="fw-semibold text-nowrap mb-1">
                                        {item?.product_details[0]?.name}
                                      </p>
                                      {/* Product-level Negotiation Badge */}
                                      {rfqDetails.id && (
                                        <ProductNegotiationBadge
                                          rfq_id={rfqDetails.id}
                                          rfq_product_id={item.id}
                                          token={token}
                                        />
                                      )}
                                      {isProductFinalized && (
                                        <span className="badge bg-warning text-dark mt-1 d-block" style={{ fontSize: "0.7rem" }}>
                                          {item.finalization_status === "You are finalized" ? "You are Finalized" : "Another Vendor is Finalized"} — Quote cannot be edited
                                        </span>
                                      )}
                                      {isNegotiationSubmittedForProduct && (
                                        <span className="badge bg-success mt-1" style={{ fontSize: "0.7rem" }}>
                                          Negotiation Quote Submitted
                                        </span>
                                      )}
                                      {getProductSpecValueByTitle(item?.product_specs, "Size") && (
                                        <p className="text-sm mb-1">
                                          {getProductSpecValueByTitle(item?.product_specs, "Size")}
                                        </p>
                                      )}
                                      <p className="text-sm mb-1 text-success fw-bold">
                                        {`${getProductSpecValueByTitle(
                                          item?.product_specs,
                                          "Quantity"
                                        )} ${getProductSpecValueByTitle(
                                          item?.product_specs,
                                          "Unit"
                                        )}`}
                                      </p>
                                      {getProductSpecValueByTitle(item?.product_specs, "Spec") && (
                                        <ReadMore
                                          content={`- ${getProductSpecValueByTitle(
                                            item?.product_specs,
                                            "Spec"
                                          )}`}
                                          maxLines={2}
                                          additionalClasses="text-sm"
                                        />
                                      )}
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Not accepted
                                        </small>
                                      )}
                                    </td>
                                    <td style={{ width: "150px", minWidth: "150px", maxWidth: "150px" }}>
                                      <div>
                                        <input
                                          type="number"
                                          name=""
                                          id=""
                                          placeholder="₹"
                                          style={{ width: "100%", ...(hasBasePriceTarget ? { border: '2px solid #f0ad4e', borderRadius: '4px' } : {}) }}
                                          value={
                                            quoteProducts[index].unit_price
                                          }
                                          min={0}
                                          onChange={(e) =>
                                            handleUpdateData(
                                              item.id,
                                              e,
                                              item.product_id,
                                              item.variant,
                                              "unit_price",
                                              "",
                                              getProductSpecValueByTitle(
                                                item?.product_specs,
                                                "Quantity"
                                              )
                                            )
                                          }
                                          onWheel={(e) => e.target.blur()}
                                          disabled={!isFieldNegotiable('base_price')}
                                        />
                                        {hasBasePriceTarget && (
                                          <div style={{ background: '#333', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', marginTop: '2px', display: 'inline-block' }}>
                                            Target: {formatTarget('base_price')}
                                          </div>
                                        )}

                                        {isTechEvalPendingOrRejected && (
                                          <small
                                            className="d-block text-danger mt-1"
                                            style={{ fontSize: "0.7rem" }}
                                          >
                                            Not accepted
                                          </small>
                                        )}

                                        {(parseFloat(quoteProducts[index]?.unit_price) > 0) && (
                                          <span
                                            className="text-primary d-block text-end mt-1"
                                            style={{ fontSize: "0.72rem", cursor: "pointer" }}
                                            onClick={() => setChargesModalOpen(index)}
                                          >
                                            {isProductDisabled
                                              ? (getChargesSummary(quoteProducts[index]).length > 0 ? "Show Charges" : "")
                                              : (getChargesSummary(quoteProducts[index]).length > 0 ? "Edit Charges" : "+ Add Charges")
                                            }
                                          </span>
                                        )}

                                        {/* Tax/VAT inline */}
                                        {(parseFloat(quoteProducts[index]?.unit_price) > 0) && (
                                          <div className="d-flex align-items-center gap-1 mt-2">
                                            <input type="number" min={0} className="form-control form-control-sm" style={{ flex: 1, minWidth: 0, height: "31px" }}
                                              placeholder={chargesMode.tax[quoteProducts[index]?.id] === "absolute" ? "Tax (₹)" : "Tax (%)"}
                                              value={quoteProducts[index].tax || ""}
                                              onChange={(e) => handleUpdateData(item.id, e, item.product_id, item.variant, "tax", "", getProductSpecValueByTitle(item?.product_specs, "Quantity"))}
                                              onWheel={(e) => e.target.blur()} disabled={isProductDisabled || isBidExpiredNonNegotiable}
                                            />
                                            <PercentageAbsoluteToggle currentMode={chargesMode.tax[quoteProducts[index]?.id] || "percentage"}
                                              disabled={isProductDisabled || isBidExpiredNonNegotiable}
                                              onToggle={(value) => {
                                                setChargesMode(prev => ({ ...prev, tax: { ...prev.tax, [quoteProducts[index].id]: value } }));
                                                handleChargeFieldUpdate(index, "tax", quoteProducts[index].tax || 0, { tax: value });
                                              }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    <td style={{ minWidth: "150px", textAlign: "center", verticalAlign: "middle" }}>
                                      {(() => {
                                        const totalVal = quoteProducts[index].total_price;
                                        const formattedTotal = totalVal > 0 ? formatPrice(totalVal) : "₹0.00";
                                        const chargeLines = getChargesSummary(quoteProducts[index]);
                                        const hasCharges = chargeLines.length > 0;
                                        const isTruncated = formattedTotal.length > 14;
                                        const showTooltip = isTruncated || hasCharges;
                                        return (
                                          <>
                                          <span
                                            className="fw-bold"
                                            style={{ fontSize: "0.9rem", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}
                                            {...(showTooltip ? {
                                              "data-tooltip-id": "charges-tooltip",
                                              "data-tooltip-html":
                                                `<strong>${formattedTotal}</strong>` +
                                                (hasCharges ? `<hr style="margin:4px 0;border-color:#ccc"/>` + chargeLines.join("<br/>") : "")
                                            } : {})}
                                          >
                                            {formattedTotal}
                                          </span>
                                          <button
                                            className="d-block mx-auto mt-2"
                                            style={{
                                              fontSize: "0.7rem",
                                              padding: "2px 8px",
                                              backgroundColor: "#dbdbec",
                                              color: "#000080",
                                              border: "none",
                                              borderRadius: "3px",
                                              fontWeight: 500,
                                              cursor: "pointer",
                                              transition: "opacity 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => e.target.style.opacity = "0.75"}
                                            onMouseLeave={(e) => e.target.style.opacity = "1"}
                                            onClick={() => openQuoteHistoryModal(item.product_id, index)}
                                          >
                                            Prev Quotes
                                          </button>
                                          </>
                                        );
                                      })()}
                                    </td>
                                    {currentLowest ? (
                                      rfqDetails?.products[index]
                                        ?.lowest_quotation ? (
                                        <td>
                                          <input
                                            type="number"
                                            name=""
                                            id=""
                                            placeholder="₹"
                                            value={
                                              rfqDetails?.products[index]
                                                ?.lowest_quotation?.total_price
                                            }
                                            disabled
                                          />
                                          {techEvalStatuses[item.id] &&
                                            techEvalStatuses[item.id]
                                              .has_tech_eval &&
                                            !techEvalStatuses[item.id]
                                              .is_accepted && (
                                              <div className="mt-1">
                                                <small className="text-warning">
                                                  <i className="fas fa-info-circle me-1"></i>
                                                  You must be technically
                                                  accepted to see lowest quote
                                                </small>
                                              </div>
                                            )}
                                        </td>
                                      ) : (
                                        <td>
                                          <input
                                            type="number"
                                            name=""
                                            id=""
                                            placeholder="--"
                                            disabled
                                          />
                                          {techEvalStatuses[item.id] &&
                                            techEvalStatuses[item.id]
                                              .has_tech_eval &&
                                            !techEvalStatuses[item.id]
                                              .is_accepted && (
                                              <div className="mt-1">
                                                <small className="text-warning">
                                                  <i className="fas fa-info-circle me-1"></i>
                                                  Technical acceptance required
                                                </small>
                                              </div>
                                            )}
                                        </td>
                                      )
                                    ) : null}
                                    <td>
                                      <div className="comment" style={{display:'flex', flexDirection:"column"}}>
                                        <div className="comment-group">
                                          <textarea
                                            name="comment"
                                            id="comment"
                                            cols="30"
                                            rows="2"
                                            value={quoteProducts[index].comment}
                                            style={{
                                              maxWidth: "200px",
                                              minHeight: "38px",
                                              resize: "vertical",
                                            }}
                                            onChange={(e) =>
                                              handleUpdateData(
                                                item.id,
                                                e,
                                                item.product_id,
                                                item.variant,
                                                "comment",
                                                "string",
                                                getProductSpecValueByTitle(
                                                  item?.product_specs,
                                                  "Quantity"
                                                )
                                              )
                                            }
                                            disabled={isProductDisabled || (isBidExpiredNonNegotiable && !isFieldNegotiable('comments'))}
                                          ></textarea>
                                          <span htmlFor="comment">0/300</span>
                                        </div>
                                        {isFieldNegotiable('comments') && isBidExpired && (
                                            <div className="text-end" style={{alignSelf:'flex-end'}}>
                                              <span
                                                style={{ fontSize: '0.68rem', color: '#856404', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                                                onClick={() => setShowBuyerCommentModal({ field: 'comments', productId: item.id })}
                                              >
                                                View Buyer Comment
                                              </span>
                                            </div>
                                          )}
                                        {isTechEvalPendingOrRejected && (
                                          <small
                                            className="d-block text-danger mt-1"
                                            style={{ fontSize: "0.7rem" }}
                                          >
                                            Commenting disabled (Not technically
                                            accepted)
                                          </small>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ width: "110px", textAlign: "center" }}>
                                      <input
                                        style={{ maxWidth: "70px", textAlign: "center" }}
                                        name="delivery_period"
                                        id="delivery_period"
                                        type="number"
                                        placeholder="E.g. 7"
                                        value={
                                          quoteProducts[index].delivery_period
                                        }
                                        onChange={(e) => {
                                          handleUpdateData(
                                            item.id,
                                            e,
                                            item.product_id,
                                            item.variant,
                                            "delivery_period",
                                            "string",
                                            getProductSpecValueByTitle(
                                              item?.product_specs,
                                              "Quantity"
                                            )
                                          );
                                        }}
                                        onWheel={(e) => e.target.blur()}
                                        disabled={isProductDisabled || (isBidExpiredNonNegotiable && !isFieldNegotiable('delivery_period'))}
                                      />
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Cannot set delivery (Not technically
                                          accepted)
                                        </small>
                                      )}
                                    </td>
                                    <td style={{ maxWidth: 200 }}>
                                      {(() => {
                                        const uploadDisabled = isProductDisabled || (isBidExpiredNonNegotiable && !isFieldNegotiable('documents'));
                                        return (
                                      <label
                                        className={`upload uploadInlineFile d-flex align-items-center justify-content-center ${
                                          isTechEvalPendingOrRejected || uploadDisabled
                                            ? "disabled"
                                            : ""
                                        }`}
                                        style={{ padding: "5px 8px", fontSize: "0.78rem", transition: "opacity 0.2s ease", ...(uploadDisabled ? { cursor: "not-allowed", opacity: 0.5 } : {}) }}
                                        onMouseEnter={(e) => { if (!uploadDisabled) e.currentTarget.style.opacity = "0.75"; }}
                                        onMouseLeave={(e) => { if (!uploadDisabled) e.currentTarget.style.opacity = "1"; }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faFile}
                                          className="me-1"
                                          style={{ fontSize: "0.75rem" }}
                                        />{" "}
                                        Upload
                                        <input
                                          type="file"
                                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                          onChange={(e) =>
                                            uploadQuoteItemFiles(e, item)
                                          }
                                          multiple={true}
                                          disabled={isProductDisabled || (isBidExpiredNonNegotiable && !isFieldNegotiable('documents'))}
                                        />
                                      </label>
                                        );
                                      })()}
                                      {alreadyQuoted && (
                                        <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                              fontSize: "0.85rem",
                                            }}
                                          >
                                            {quoteProducts[index]?.previous_document_files?.length > 0 ? (
                                              <button type="button" className="btn btn-sm btn-primary" style={{ fontSize: '0.72rem', padding: '2px 10px', marginTop: '6px' }}
                                                onClick={() => setShowPrevDocsModal({ files: quoteProducts[index].previous_document_files, productIndex: index })}>
                                                Show Files ({quoteProducts[index].previous_document_files.length})
                                              </button>
                                            ) : (
                                              <span style={{ color: "#888" }}>No Files</span>
                                            )}
                                          </div>
                                      )}
                                      {isTechEvalPendingOrRejected && (
                                        <small
                                          className="d-block text-danger mt-1"
                                          style={{ fontSize: "0.7rem" }}
                                        >
                                          Upload disabled (Not technically
                                          accepted)
                                        </small>
                                      )}
                                      {isFieldNegotiable('documents') && isBidExpired && (
                                        <div className="mt-1" style={{textAlign:"end"}}>
                                          <span
                                            style={{ fontSize: '0.7rem', color: '#856404', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                                            onClick={() => setShowBuyerCommentModal({ field: 'documents', productId: item.id })}
                                          >
                                            View Buyer Comments
                                          </span>
                                        </div>
                                      )}
                                      {quoteProducts[index].document_files &&
                                        quoteProducts[index].document_files
                                          .length > 0 &&
                                        quoteProducts[index].document_files.map(
                                          (doc_file) => {
                                            return (
                                              <div
                                                key={doc_file}
                                                className="d-flex justify-content-between align-items-center"
                                              >
                                                <a
                                                  href={doc_file}
                                                  className="page-link text-truncate"
                                                  target="_blank"
                                                  style={{ maxWidth: "140px" }}
                                                >
                                                  {extractfileName(doc_file)}
                                                </a>
                                                <span
                                                  className="btn-close btn-close-sm"
                                                  aria-label="Close"
                                                  onClick={(e) =>
                                                    handleUpdateData(
                                                      item.id,
                                                      e,
                                                      item.product_id,
                                                      item.variant,
                                                      "document_files",
                                                      "array",
                                                      getProductSpecValueByTitle(
                                                        item?.product_specs,
                                                        "Quantity"
                                                      ),
                                                      doc_file,
                                                      "remove"
                                                    )
                                                  }
                                                ></span>
                                              </div>
                                            );
                                          }
                                        )}
                                    </td>
                                    {/* {alreadyQuoted && (
                                      <td>
                                        {quoteProducts[index]
                                          .previous_document_files &&
                                          quoteProducts[index]
                                            .previous_document_files.length >
                                            0 &&
                                          renderFileLink(
                                            quoteProducts[index]
                                              .previous_document_files
                                          )}
                                      </td>
                                    )} */}
                                  </tr>
                                  </React.Fragment>
                                );
                              }
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Tooltip id="charges-tooltip" place="top" style={{ maxWidth: 250, fontSize: 12, borderRadius: 6, zIndex: 9999, lineHeight: "1.6" }} />

                  <div className="quote-sec-btm">
                    <div className="row">
                      <div className="col-md-6">
                        {pageType != "update-quote" && (
                          <button
                            id="regret_quote-quote_actions-send_quote_page"
                            type="submit"
                            className="btn btn-primary"
                            onClick={() => setregretModal(true)}
                            disabled={isBidExpired}
                            title={isBidExpired ? "Bidding period has ended" : ""}
                          >
                            Regret Quote
                          </button>
                        )}
                      </div>
                      <div className="col-md-6">
                        {/* Changes by Agnij 2024-07-30 [Disable send quote button when no fields are filled] */}
                        {/* Bid expiry alerts */}
                        {isBidExpired && !hasActiveNegotiationRounds && (
                          <Alert variant="danger" className="mb-3 py-2">
                            <small><strong>Bidding Period Ended:</strong> The quote submission deadline has passed.</small>
                          </Alert>
                        )}
                        {isBidExpired && hasActiveNegotiationRounds && (
                          <Alert variant="info" className="mb-3 py-2">
                            <small><strong>Bidding Period Ended:</strong> Only products with active negotiation rounds can be updated.</small>
                          </Alert>
                        )}
                        {/* Show info if some products have negotiation quotes submitted */}
                        {Object.keys(negotiationQuoteSubmitted).length > 0 && (
                          <Alert variant={Object.keys(negotiationQuoteSubmitted).length >= (rfqDetails?.products?.filter(p => isAvailableForQuote(p))?.length || 0) ? "danger" : "info"} className="mb-3 py-2">
                            <small>
                              {Object.keys(negotiationQuoteSubmitted).length >= (rfqDetails?.products?.filter(p => isAvailableForQuote(p))?.length || 0)
                                ? <><strong>Quote Submission Disabled:</strong> You have submitted negotiation quotes for all products.</>
                                : <><strong>Note:</strong> You have submitted negotiation quotes for {Object.keys(negotiationQuoteSubmitted).length} product(s). Those products are locked. You can still submit quotes for remaining products.</>
                              }
                            </small>
                          </Alert>
                        )}
                        {/* Start Grand Total Breakup */}
                        <div className="d-flex justify-content-end mb-2">
                          <GrandTotalBreakup
                            totalBase={quoteBreakup.totalBase}
                            totalTax={quoteBreakup.totalTax}
                            totalOtherCharges={quoteBreakup.totalOtherCharges}
                            grandTotal={grandTotalIncludingGST}
                            formatPrice={formatPrice}
                            align="end"
                            chargeBreakdown={quoteBreakup.chargeBreakdown}
                            globalChargeBreakdown={globalOtherCharges
                              .filter(c => c.name && c.name.trim())
                              .map(c => {
                                const val = c.amount_mode === 'percentage'
                                  ? (grandTotalBeforeGlobalCharges * (parseFloat(c.amount) || 0)) / 100
                                  : (parseFloat(c.amount) || 0);
                                return { label: c.name, value: val };
                              })
                              .filter(c => c.value > 0)
                            }
                          />
                        </div>
                        {/* End Grand Total Breakup */}
                        <button
                          id="send_quote-quote_actions-send_quote_page"
                          type="submit"
                          className="btn btn-secondary float-end"
                          onClick={handleSendQuote}
                          disabled={
                            !isAnyFieldFilled() ||
                            tenderPaymentLoading ||
                            hasPendingTechEval ||
                            (isBidExpired && !hasActiveNegotiationRounds) ||
                            (rfqDetails?.vendor_clarification_date &&
                              (isClarificationWindowActive || hasOpenClarification)) ||
                            (Object.keys(negotiationQuoteSubmitted).length > 0 && Object.keys(negotiationQuoteSubmitted).length >= (rfqDetails?.products?.filter(p => isAvailableForQuote(p))?.length || 0))
                          }
                          title={
                            (isBidExpired && !hasActiveNegotiationRounds)
                              ? "Quotations aren't allowed now"
                              : hasPendingTechEval
                              ? "Quote submission disabled - Technical evaluation is pending"
                              : (Object.keys(negotiationQuoteSubmitted).length > 0 && Object.keys(negotiationQuoteSubmitted).length >= (rfqDetails?.products?.filter(p => isAvailableForQuote(p))?.length || 0))
                              ? "Quote submission disabled - Negotiation quotes submitted for all products"
                              : rfqDetails?.vendor_clarification_date &&
                                isClarificationWindowActive
                              ? "Quote submission blocked - Clarification period is still active"
                              : hasOpenClarification
                              ? "Quote submission blocked - Clarification in progress"
                              : ""
                          }
                        >
                          {(isBidExpired && !hasActiveNegotiationRounds) ? 'Send Quote' : (Object.keys(negotiationQuoteSubmitted).length > 0 && Object.keys(negotiationQuoteSubmitted).length >= (rfqDetails?.products?.filter(p => isAvailableForQuote(p))?.length || 0)) ? 'All Quotes Submitted' : 'Send Quote'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>
      )}
      <RegretQuoteReasonModal
        handleRegretReason={handleRegretQuote}
        showModal={regretModal}
        closeModal={() => {
          setregretModal(false);
        }}
      />
      {extractedQuotes.data && (
        <QuotesOverrideModal
          show={extractedQuotes.show}
          onClose={() =>
            setExtractedQuotes((prev) => ({ ...prev, show: false }))
          }
          quotes={extractedQuotes.data}
          overrideQuote={overrideQuote}
        />
      )}

      {/* Submit Quote Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSubmitQuoteConfirmModal}
        onClose={handleSubmitQuoteCancel}
        onConfirm={handleSubmitQuoteConfirm}
        title="Submit Quote"
        description="Are you sure you want to submit this quote?\nThis action will send your quote to the buyer."
        confirmButtonColor="success"
        confirmButtonText="Submit Quote"
        cancelButtonText="Cancel"
        customFooter={(() => {
          const itemsWithRupees = [];

          if (itemsWithRupees.length === 0) return null;

          return (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '8px',
              width: '100%'
            }}>
              <p style={{ fontWeight: 700, color: '#856404', marginBottom: '8px', fontSize: '0.9rem' }}>
                &#9888; Some items have ₹ (Rupees) selected instead of %
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#856404', fontSize: '0.82rem' }}>
                {itemsWithRupees.map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.name}</strong> — {item.charges.join(', ')}
                  </li>
                ))}
              </ul>
              <p style={{ fontWeight: 600, color: '#856404', marginTop: '8px', marginBottom: 0, fontSize: '0.82rem' }}>
                Please confirm this is intentional before submitting.
              </p>
            </div>
          );
        })()}
      />

      {showQuoteHistoryModal && (
        <VendorQuoteHistoryModal
          showModal={showQuoteHistoryModal}
          closeModal={() => setShowQuoteHistoryModal(false)}
          quoteHistory={quoteHistory}
          quotehistorydata={quoteHistory?.data} // pass previous_quotes etc.
        />
      )}
    </>
  );
};

export default SendQuotePageComp;






//  PaymentTermsUIOnly component
const PaymentTermsEditor = ({ value, onChange, disabled = false }) => {
  const rows = Array.isArray(value) ? value : [];

    const setRows = (next) => onChange && onChange(next);

    const markDeleted = (index) => {
     const updated = [...rows];
     const row = updated[index] || {};
    updated[index] = { ...row, action: "delete" };
    setRows(updated);
  };

  const restoreRow = (index) => {
    const updated = [...rows];
    const row = updated[index];
    if (!row) return;
    const { action, ...rest } = row;
    updated[index] = rest;
    setRows(updated);
  };

  const updateRow = (index, patch) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div>
      {rows.map((row, index) => {
        const isCredit = row.type === "credit";
        const isDeleted = row.action === "delete";
        return (
          <div key={index} className="row g-2 align-items-end mb-2">
            <div className="col-3">
              <label className="form-label mb-1">% of Amount</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g., 30"
                value={row.value}
                onChange={(e) =>
                  updateRow(index, {
                    value: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                min={0}
                max={100}
                disabled={isDeleted || disabled}
              />
            </div>

            <div className="col-3">
              <label className="form-label mb-1">Type</label>
              <select
                className="form-select"
                value={row.type}
                onChange={(e) => {
                  const nextType = e.target.value;
                  updateRow(index, {
                    type: nextType,
                    days: nextType === "credit" ? row.days : "",
                    comment: nextType === "credit" ? "" : (row.comment ?? ""),
                  });
                }}
                disabled={isDeleted || disabled}
              >
                <option value="advance">Advance</option>
                <option value="credit">Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            {isCredit ? (
              <div className="col-4">
                <label className="form-label mb-1">Credit Days</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g., 30"
                  value={row.days}
                  onChange={(e) =>
                    updateRow(index, {
                      days: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  min={1}
                disabled={isDeleted || disabled}
                />
              </div>
            ) : (
              <div className="col-4">
                <label className="form-label mb-1">
                  Comment
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={row.type === "other" ? "Describe payment term" : "Note (optional)"}
                  value={row.comment || ""}
                  onChange={(e) => updateRow(index, { comment: e.target.value })}
               disabled={isDeleted || disabled}
                />
              </div>
            )}

            <div className="col-2 d-flex mb-1">
              {!disabled && (!isDeleted ? (
                <SmartButton
                  onClick={() => markDeleted(index)}
                  theme={"red"}
                  style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
                  label="Remove"
                />
              ) : (
                <SmartButton
                  onClick={() => restoreRow(index)}
                  theme={"secondary"}
                  style={{ paddingLeft: "0.6rem", paddingRight: "0.6rem" }}
                  label="Restore"
                />
              ))}
            </div>

            {/* Small status line below inputs when deleted */}
            {isDeleted && (
              <div className="col-12 mt-0">
                <small className="text-danger">
                  you removed this term. Click "Restore" to add it back.
                </small>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

