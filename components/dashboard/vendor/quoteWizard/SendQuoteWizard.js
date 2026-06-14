/* ────────────────────────────────────────────────────────────
   SendQuoteWizard — vendor-side 3-step quote submission flow.
   Renders at /dashboard/vendor/quote and replaces the legacy
   /dashboard/vendor/send-quote experience.
   ──────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Building2, ClipboardCheck, FileText, Clock, Send, Download, X,
  Plus, Trash2, ArrowRight, ArrowLeft, Copy, History,
  Check, Layers, MessageSquare, DollarSign, MessageCircle, AlertTriangle,
  Receipt, CreditCard, HelpCircle, Lock, CheckCircle2,
} from "lucide-react";

import {
  getRFQById,
  sendQuotation,
  updateQuotation,
  fetchVendorAgreement,
  addVendorAgreement,
  fetchQuoteHistory,
  fetchDeviationPreviews,
  handleUploadFile,
  createTenderPaymentOrder,
  verifyTenderPayment,
  getChargeNames,
} from "@/services/rfq";
import {
  getAllActiveNegotiationRounds,
  getAllVendorNegotiationStatus,
} from "@/services/negotiation";
import { getClarifications } from "@/services/clarification";
import { checkBidExpired } from "@/utils/sharedFunctions";
import usePreviewTotals from "@/hooks/usePreviewTotals";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";
import {
  RaiseClarificationModal,
  ClarificationDetailModal,
} from "@/components/dashboard/buyer/clarification";
import ClauseChatDrawer from "./ClauseChatDrawer";

import styles from "./SendQuoteWizard.module.scss";
import {
  buildInitialQuoteProducts,
  diffPaymentTerms,
  fmtINR,
  fmtShortDate,
  generateReference,
  genLocalId,
  sumPaymentTerms,
} from "./helpers";

const ALL_STEPS = [
  { id: "overview", label: "Inquiry overview", meta: "Buyer, products & terms" },
  { id: "clarifications", label: "Clarifications", meta: "Tender clarification window" },
  { id: "eval", label: "Technical evaluation", meta: "Specs & clause responses" },
  { id: "pricing", label: "Pricing", meta: "Per-line prices & charges" },
  { id: "terms", label: "Commercial terms", meta: "GSTIN, payment & global charges" },
  { id: "review", label: "Review & submit", meta: "Verify and confirm" },
];

// IST handling for vendor_clarification_date — keep parsing identical to the
// legacy send-quote page so the deadline never drifts by a few hours.
const IST_OFFSET_MINUTES = 330;
const parseISTDateTimeToUTCDate = (dateStr) => {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  let datePart, timePart;
  if (raw.includes("T")) [datePart, timePart] = raw.split("T");
  else if (raw.includes(" ")) [datePart, timePart] = raw.split(" ");
  else { datePart = raw; timePart = "00:00:00"; }
  const [year, month, day] = datePart.split("-").map((v) => parseInt(v, 10));
  const [hourStr, minuteStr, secondStr] = (timePart || "00:00:00").split(":");
  const hour = parseInt(hourStr || "0", 10);
  const minute = parseInt(minuteStr || "0", 10);
  const second = parseInt((secondStr || "0").split(".")[0] || "0", 10);
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
};

// Razorpay checkout SDK loader — identical to the legacy send-quote page.
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

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

// Map between internal wizard state ("agree" / "disagree") and the
// verbatim values stored in tbl_rfq_product_tech_evaluation_vendors_response
// ("I Agree" / "I Dont Agree").
const RESPONSE_TO_API = { agree: "I Agree", disagree: "I Dont Agree" };
const API_TO_RESPONSE = (raw) => {
  if (!raw) return null;
  const v = String(raw).trim();
  if (v === "I Agree") return "agree";
  if (v === "I Dont Agree" || v === "I Don't Agree") return "disagree";
  return null;
};

// Loose GSTIN format check — 15 chars, India pattern. Optional field, so the
// "no value" case is handled separately (warning at review).
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{2}$/;
const isValidGstin = (v) => !v || GSTIN_PATTERN.test(String(v).trim().toUpperCase());

const PAY_TYPE_OPTIONS = [
  { value: "advance", label: "Advance" },
  { value: "credit", label: "Credit" },
  { value: "other", label: "Other" },
];

const SendQuoteWizard = () => {
  const router = useRouter();
  const { id, token, type: pageType } = router.query;
  // Mirrors the legacy send-quote page: when enabled, products whose tech
  // evaluation exists but is not accepted by the buyer cannot be priced.
  const showTechEvalRestrictions = router.query.showTechEvalRestrictions === "true";
  const userProfile = useSelector((s) => s.userProfile);

  /* ─────────────────────────── State ─────────────────────────── */
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // step 1
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // step 2 — tech eval clauses keyed by `${product.id}.${clause.id}`
  // Shape: { response: 'agree'|'disagree', comment: '', files: [] }
  const [techClauses, setTechClauses] = useState({}); // { [productId]: Array<clause> }
  const [techResponses, setTechResponses] = useState({}); // { [productId]: { [clauseId]: {...} } }
  const [techLoading, setTechLoading] = useState(false);
  const [techSubmitted, setTechSubmitted] = useState({}); // { [productId]: true } — already submitted to backend
  // Per-clause chat: { [`${productId}.${clauseId}`]: messageCount }
  const [chatCounts, setChatCounts] = useState({});
  const [chatTarget, setChatTarget] = useState(null); // { product, clause, clauseIndex }

  // step 3 — line items + commercials
  const [products, setProducts] = useState([]);
  const [vendorGSTIN, setVendorGSTIN] = useState("");
  const [globalComment, setGlobalComment] = useState("");
  const [paymentTerms, setPaymentTerms] = useState([
    { id: null, type: "advance", value: 50, days: "", comment: "" },
    { id: null, type: "credit", value: 50, days: 30, comment: "" },
  ]);
  const originalPaymentTermsRef = useRef([]);
  const [alreadyQuoted, setAlreadyQuoted] = useState(false);

  // Global charges (apply on the grand total / PO value, not on a single line)
  const [globalCharges, setGlobalCharges] = useState([]);
  const [globalChargesModalOpen, setGlobalChargesModalOpen] = useState(false);

  // Edit eligibility + negotiation
  const [isBidExpired, setIsBidExpired] = useState(false);
  // keyed by rfq_product_id → array of { name, targetPrice, demand, mode, taxDemand }
  // (RFQ-level fields live under the `__rfq_level__` key)
  const [negotiationFields, setNegotiationFields] = useState({});
  // rfq_product_ids covered by any active round (excludes the RFQ-level bucket)
  const [activeNegotiationProductIds, setActiveNegotiationProductIds] = useState(new Set());
  // rfq_product_id → status for products the vendor already re-quoted in the
  // LATEST round (once-per-round rule, legacy parity)
  const [negotiationQuoteSubmitted, setNegotiationQuoteSubmitted] = useState({});
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  // One-shot guard so negotiated charges are auto-added only once per load
  const negotiationChargesAddedRef = useRef(false);

  // Charges modal
  const [chargesOpenIdx, setChargesOpenIdx] = useState(null);
  // Backend-managed charge type list (legacy parity). Hardcoded CHARGE_TYPES /
  // GLOBAL_CHARGE_TYPES remain as fallback when the API has no data.
  const [chargeNamesList, setChargeNamesList] = useState([]);

  // History modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Regret
  const [regretOpen, setRegretOpen] = useState(false);

  // Tender fees (legacy parity) — quotes on fee-bearing tenders can't be
  // submitted until the fee is paid via Razorpay.
  const [tenderFees, setTenderFees] = useState(0);
  const [tenderPaymentPaid, setTenderPaymentPaid] = useState(false);

  // Submitted confirmation
  const [submittedRef, setSubmittedRef] = useState(null);
  const [submittedAt, setSubmittedAt] = useState("");

  // Unsaved-changes guard (legacy parity) — set by user-facing mutators,
  // cleared on successful submit. A ref (not state) so the navigation
  // handlers always read the live value, even right before router.push.
  const hasUnsavedChangesRef = useRef(false);
  const markUnsaved = () => { hasUnsavedChangesRef.current = true; };
  const clearUnsaved = () => { hasUnsavedChangesRef.current = false; };

  // Clarifications (tenders only) — list + open status + modals.
  const [clarifications, setClarifications] = useState([]);
  const [hasOpenClarification, setHasOpenClarification] = useState(false);
  const [isOwnerOfOpenClarification, setIsOwnerOfOpenClarification] = useState(false);
  const [openClarificationObj, setOpenClarificationObj] = useState(null);
  const [clarLoading, setClarLoading] = useState(false);
  const [raiseClarOpen, setRaiseClarOpen] = useState(false);
  const [detailClar, setDetailClar] = useState(null);
  // 1-second tick for the clarification countdown
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ─────────────────────────── Derived ─────────────────────────── */
  // Backend-engine pricing preview. Sent on every change (debounced 300ms) so
  // what the vendor sees here is exactly what the server will compute on
  // submit — no duplicated math in the frontend.
  const previewDraft = useMemo(() => {
    const coerceAmount = (v) => {
      if (v === "" || v == null) return 0;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      items: products.map((p) => ({
        unit_price: coerceAmount(p.unit_price),
        quantity: coerceAmount(p.qty),
        tax: coerceAmount(p.tax),
        tax_mode: p.tax_mode || "percentage",
        other_charges: (p.other_charges || [])
          .filter((c) => c.name && c.name.trim())
          .map((c) => ({
            name: c.name,
            amount: coerceAmount(c.amount),
            amount_mode: c.amount_mode || "percentage",
            tax: c.tax == null || c.tax === "" ? null : coerceAmount(c.tax),
            tax_mode: c.tax_mode || "percentage",
          })),
      })),
      global_charges: globalCharges
        .filter((c) => c.name && c.name.trim())
        .map((c) => ({
          name: c.name,
          amount: coerceAmount(c.amount),
          amount_mode: c.amount_mode || "percentage",
        })),
    };
  }, [products, globalCharges]);

  // 600ms debounce — pauses long enough that fast keystrokes (e.g. typing
  // "400") collapse into a single API call after the user stops.
  const { totals: pricingTotals, isLoading: pricingLoading } = usePreviewTotals(
    previewDraft,
    { debounceMs: 600 }
  );

  // Sync engine-computed per-line totals back into product state so display
  // helpers (line foot, badges) keep working off `p.total_price`.
  useEffect(() => {
    if (!pricingTotals?.lines) return;
    setProducts((prev) => {
      let changed = false;
      const next = prev.map((p, idx) => {
        const newTotal = pricingTotals.lines[idx]?.total ?? 0;
        if (Number(p.total_price) === newTotal) return p;
        changed = true;
        return { ...p, total_price: newTotal };
      });
      return changed ? next : prev;
    });
  }, [pricingTotals]);

  // Derive hero-summary breakdown from engine response. Per-charge tax is
  // bundled into each bucket so the UI can show it as a sub-row of the charge.
  const totals = useMemo(() => {
    if (!pricingTotals?.lines) {
      return { subtotal: 0, gst: 0, extraCharges: [], globalCharges: [], globalChargesTotal: 0, grand: 0 };
    }
    let subtotal = 0;
    let baseTax = 0;
    const chargeBuckets = {};
    pricingTotals.lines.forEach((line) => {
      subtotal += Number(line.base) || 0;
      baseTax += Number(line.base_tax) || 0;
      (line.charges || []).forEach((c) => {
        const name = c.name || "Other";
        if (!chargeBuckets[name]) chargeBuckets[name] = { amount: 0, tax: 0 };
        chargeBuckets[name].amount += Number(c.subtotal) || 0;
        chargeBuckets[name].tax += Number(c.tax) || 0;
      });
    });
    const extraCharges = Object.entries(chargeBuckets).map(([label, v]) => ({
      label,
      amount: v.amount,
      tax: v.tax,
    }));
    const engineGlobals = (pricingTotals.global_charges || []).map((g) => ({
      label: g.name,
      amount: Number(g.subtotal) || Number(g.amount) || 0,
    }));
    return {
      subtotal,
      gst: baseTax,
      extraCharges,
      globalCharges: engineGlobals,
      globalChargesTotal: Number(pricingTotals.global_charges_total) || 0,
      grand: Number(pricingTotals.grand_total) || 0,
    };
  }, [pricingTotals]);
  const paymentTotal = useMemo(() => sumPaymentTerms(paymentTerms), [paymentTerms]);

  const evalProducts = useMemo(
    () => products.filter((p) => p.has_tech_eval),
    [products]
  );
  const hasTechEval = evalProducts.length > 0;

  // Hoisted clarification derivations — needed early because `visibleSteps`
  // decides whether to inject the Clarifications step. The full set of
  // derived clarification flags (window-active, countdown, blocks, etc.)
  // lives in a block further down for readability.
  const isTender = rfq?.is_tender === 1;
  const clarificationDeadline = useMemo(
    () => rfq?.vendor_clarification_date ? parseISTDateTimeToUTCDate(rfq.vendor_clarification_date) : null,
    [rfq?.vendor_clarification_date]
  );
  const isClarWindowActive = !!(clarificationDeadline && now < clarificationDeadline);
  const clarBlocksQuote = isTender && (isClarWindowActive || hasOpenClarification);
  const showClarStep = isTender && (clarificationDeadline != null || clarifications.length > 0);

  const visibleSteps = useMemo(() => {
    let base = ALL_STEPS;
    if (!hasTechEval) base = base.filter((s) => s.id !== "eval");
    if (!showClarStep) base = base.filter((s) => s.id !== "clarifications");
    // In read-only flows the last step is a snapshot of what's been
    // submitted — there's nothing to confirm anymore, so rename the label.
    if (isBidExpired) {
      return base.map((s) =>
        s.id === "review"
          ? { ...s, label: "Review", meta: "Snapshot of your submitted quote" }
          : s
      );
    }
    return base;
  }, [hasTechEval, showClarStep, isBidExpired]);
  const currentStepId = visibleSteps[currentStep]?.id || "overview";
  const evalTotalClauses = useMemo(
    () => Object.values(techClauses).reduce((n, arr) => n + (arr?.length || 0), 0),
    [techClauses]
  );
  const evalAnswered = useMemo(() => {
    let n = 0;
    Object.entries(techClauses).forEach(([pid, list]) => {
      (list || []).forEach((c) => {
        const r = techResponses[pid]?.[c.id];
        if (r?.response) n++;
      });
    });
    return n;
  }, [techClauses, techResponses]);
  const evalProgress = evalTotalClauses === 0
    ? 100
    : Math.round((evalAnswered / evalTotalClauses) * 100);

  /* ───────── Gating ───────── */
  const evalGateOk = useMemo(() => {
    if (evalProducts.length === 0) return true;
    if (evalAnswered !== evalTotalClauses) return false;
    // disagree requires comment
    for (const pid of Object.keys(techClauses)) {
      const list = techClauses[pid] || [];
      for (const c of list) {
        const r = techResponses[pid]?.[c.id];
        if (r?.response === "disagree" && !(r.comment || "").trim()) return false;
      }
    }
    return true;
  }, [evalProducts.length, evalAnswered, evalTotalClauses, techClauses, techResponses]);

  const canContinueStep1 = acceptedTerms;
  const canContinueStep2 = evalGateOk;
  // Pricing step (step 3): at least one product priced with delivery.
  const canContinueStep3 = useMemo(() => {
    if (!products.length) return false;
    return products.some(
      (p) => (parseFloat(p.unit_price) || 0) > 0 && (parseInt(p.delivery_period) || 0) > 0
    );
  }, [products]);
  // Commercial terms step (step 4): valid GSTIN (or empty) + payment terms sum to 100.
  const canContinueStep4 = useMemo(() => {
    const gstinOk = isValidGstin(vendorGSTIN);
    const validPayment =
      paymentTotal === 100 &&
      paymentTerms
        .filter((t) => t.action !== "delete")
        .every((t) => t.type && (Number(t.value) || 0) > 0);
    return gstinOk && validPayment;
  }, [vendorGSTIN, paymentTotal, paymentTerms]);
  const canSubmit = canContinueStep3 && canContinueStep4 && !clarBlocksQuote;

  // Review-step double-check callouts.
  const reviewWarnings = useMemo(() => {
    const warnings = [];
    if (!String(vendorGSTIN || "").trim()) {
      warnings.push({
        kind: "warn",
        title: "No GSTIN provided",
        detail: "Quote will be submitted without a GSTIN. Confirm this is intentional.",
      });
    }
    const zeroTaxLines = [];
    products.forEach((p) => {
      const tax = String(p.tax ?? "").trim();
      if (tax === "0" || tax === "0.0" || tax === "0.00") {
        zeroTaxLines.push(p.product_name || p.name || `Product #${p.id}`);
      }
      (p.charges || []).forEach((ch) => {
        const t = String(ch.tax ?? "").trim();
        if (t === "0" || t === "0.0" || t === "0.00") {
          zeroTaxLines.push(`${p.product_name || "Product"} → charge "${ch.name || "Untitled"}"`);
        }
      });
    });
    (globalCharges || []).forEach((ch) => {
      const t = String(ch.tax ?? "").trim();
      if (t === "0" || t === "0.0" || t === "0.00") {
        zeroTaxLines.push(`Global charge "${ch.name || "Untitled"}"`);
      }
    });
    if (zeroTaxLines.length) {
      warnings.push({
        kind: "warn",
        title: `Tax explicitly set to 0 on ${zeroTaxLines.length} item${zeroTaxLines.length === 1 ? "" : "s"}`,
        detail: zeroTaxLines.slice(0, 6).join(" · ") + (zeroTaxLines.length > 6 ? ` · +${zeroTaxLines.length - 6} more` : ""),
      });
    }
    if (!String(globalComment || "").trim()) {
      warnings.push({
        kind: "warn",
        title: "No global comment for the buyer",
        detail: "Consider adding a note about delivery, packaging, or service expectations.",
      });
    }
    return warnings;
  }, [vendorGSTIN, products, globalCharges, globalComment]);

  const canVisit = (i) => {
    if (i <= currentStep) return true;
    const targetId = visibleSteps[i]?.id;
    if (targetId === "clarifications") return acceptedTerms;
    // For tenders during clarification window OR with an open clarification,
    // every subsequent step is locked behind the clarifications step.
    if (clarBlocksQuote && targetId !== "clarifications") return false;
    if (targetId === "eval") return acceptedTerms;
    if (targetId === "pricing") return acceptedTerms && evalGateOk;
    if (targetId === "terms") return acceptedTerms && evalGateOk && canContinueStep3;
    if (targetId === "review") return acceptedTerms && evalGateOk && canContinueStep3 && canContinueStep4;
    return false;
  };

  /* ───────── Edit eligibility ───────── */
  // Per-product negotiable check
  const hasAnyNegotiation = Object.keys(negotiationFields).length > 0;
  const allFinalizedOther = products.length > 0 &&
    products.every((p) => p.finalization_status === "Another vendor is finalized");
  const allFinalizedYou = products.length > 0 &&
    products.every((p) => p.finalization_status === "You are finalized");
  const anyFinalizedYou = products.some((p) => p.finalization_status === "You are finalized");

  const editStatus = (() => {
    if (allFinalizedYou) {
      return {
        kind: "success",
        title: "You've been finalized for this RFQ",
        body: "Congratulations — the buyer has finalized your quote. No further edits are needed.",
        canEdit: false,
      };
    }
    if (allFinalizedOther) {
      return {
        kind: "danger",
        title: "Another vendor was finalized",
        body: "The buyer has finalized another vendor for this RFQ. You can no longer edit your quote.",
        canEdit: false,
      };
    }
    if (isBidExpired && hasAnyNegotiation) {
      return {
        kind: "info",
        title: "Negotiation round in progress — you're invited",
        body: `The bid deadline has passed, but you've been invited to a negotiation round on ${activeNegotiationProductIds.size || Object.keys(negotiationFields).filter((k) => k !== "__rfq_level__").length} product(s). The buyer's target asks are highlighted on each line.`,
        canEdit: true,
      };
    }
    if (isBidExpired && !alreadyQuoted) {
      return {
        kind: "warn",
        title: "Looks like you missed this inquiry",
        body: `The bid window ${rfq?.bid_end_date ? `closed on ${fmtShortDate(rfq.bid_end_date, { includeTime: true })}` : "has already closed"} and you weren't able to submit a quote in time. Try to respond a little earlier next time so you don't miss the opportunity — we'll keep nudging you when new inquiries from this buyer come in.`,
        canEdit: false,
        missed: true,
      };
    }
    if (isBidExpired) {
      return {
        kind: "warn",
        title: "Bid window closed",
        body: `The bid deadline ${rfq?.bid_end_date ? `(${fmtShortDate(rfq.bid_end_date, { includeTime: true })}) ` : ""}has passed. Your quote is now read-only.`,
        canEdit: false,
      };
    }
    if (alreadyQuoted) {
      return {
        kind: "info",
        title: "You can update your quote",
        body: `Your existing quote is editable until the deadline${rfq?.bid_end_date ? ` on ${fmtShortDate(rfq.bid_end_date, { includeTime: true })}` : ""}. Any changes you submit will replace your previous values.`,
        canEdit: true,
      };
    }
    return { kind: "info", title: "", body: "", canEdit: true };
  })();
  const isReadOnly = !editStatus.canEdit;
  const missedInquiry = !!editStatus.missed;

  /* ─────────────────────────── Clarification window ─────────────────────────── */
  // (isTender / clarificationDeadline / isClarWindowActive / clarBlocksQuote /
  //  showClarStep are declared above so the step list + canSubmit memos can
  //  see them. Remaining derivations live here for readability.)
  const clarMsLeft = isClarWindowActive ? clarificationDeadline.getTime() - now.getTime() : 0;
  const clarCountdown = clarMsLeft > 0 ? formatCountdown(clarMsLeft) : "";

  // Vendor can raise a new clarification only if: window still open AND there
  // is no existing open clarification (neither own nor anyone else's).
  const canRaiseClarification = isClarWindowActive && !hasOpenClarification;

  // Fetch clarifications on load + after a new one is raised / replied to.
  const refreshClarifications = useCallback(async () => {
    if (!id || !isTender) return;
    try {
      setClarLoading(true);
      const res = await getClarifications(parseInt(id), token);
      const payload = res?.data?.data || res?.data || {};
      const list = payload?.clarifications || payload?.data || (Array.isArray(payload) ? payload : []);
      setClarifications(Array.isArray(list) ? list : []);
      // Backend marks the active one + tells us if it's ours.
      const openOne = payload?.open_clarification || (Array.isArray(list) ? list.find((c) => c.status === "OPEN") : null);
      setOpenClarificationObj(openOne || null);
      setHasOpenClarification(!!payload?.has_open || !!openOne);
      setIsOwnerOfOpenClarification(!!payload?.is_own_clarification);
    } catch (_) {
      // keep last known list on error
    } finally {
      setClarLoading(false);
    }
  }, [id, token, isTender]);

  useEffect(() => {
    refreshClarifications();
  }, [refreshClarifications]);

  // Fetch the backend-managed charge type list once (legacy parity).
  useEffect(() => {
    getChargeNames()
      .then((res) => {
        const data = res?.data || res || [];
        if (Array.isArray(data) && data.length) setChargeNamesList(data);
      })
      .catch((err) => console.error("Failed to fetch charge names:", err));
  }, []);

  // Selects fall back to the hardcoded lists when the API returns nothing.
  const lineChargeTypes = useMemo(() => {
    const names = chargeNamesList.filter((c) => !c.is_global).map((c) => c.name).filter(Boolean);
    return names.length ? [...names, "Custom"] : CHARGE_TYPES;
  }, [chargeNamesList]);
  const globalChargeTypes = useMemo(() => {
    const names = chargeNamesList.filter((c) => c.is_global === true).map((c) => c.name).filter(Boolean);
    return names.length ? [...names, "Custom"] : GLOBAL_CHARGE_TYPES;
  }, [chargeNamesList]);

  // Warn user about unsaved changes when leaving the page (legacy parity)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Leaving the site will discard all changes.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleRouteChange = () => {
      if (hasUnsavedChangesRef.current && !window.confirm("You have unsaved changes. Leaving will discard all changes. Are you sure?")) {
        router.events.emit("routeChangeError");
        throw "Route change aborted due to unsaved changes";
      }
    };
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);
  // Read-only because the bid window closed AFTER the vendor submitted —
  // i.e. they have a quote on record but can no longer edit it.
  // Scoped to bid-expiry (NOT finalization, which is its own success/danger
  // story and shows its own inline banner inside the Pricing step).
  const reviewOnly = isBidExpired && alreadyQuoted && !missedInquiry;
  const bidEnded = isBidExpired;

  /* ─────────────────────────── Data load ─────────────────────────── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    getRFQById(id, token)
      .then(async (res) => {
        if (cancelled) return;
        const data = res?.data;
        if (!data) {
          toast.error("Inquiry not found.");
          return;
        }
        setRfq(data);
        setTenderFees(data.tender_fees || 0);
        setTenderPaymentPaid(data.has_paid_tender_fees === true);

        const built = buildInitialQuoteProducts(data);
        setProducts(built);

        const hasQuote = (data.quotations || []).length > 0;
        setAlreadyQuoted(hasQuote);
        if (hasQuote) {
          // Prefill payment terms + GSTIN + global comment from existing quote
          const qd = data.quote_details || {};
          if (qd.gstin) setVendorGSTIN(qd.gstin);
          if (qd.global_comment) setGlobalComment(qd.global_comment);
          const pts = data.quotations[0]?.payment_terms || [];
          if (pts.length) {
            setPaymentTerms(pts.map((t) => ({ ...t })));
            originalPaymentTermsRef.current = pts.map((t) => ({ ...t }));
          }
          // Prefill global charges from existing quote
          const gc = qd.global_charges || data.quotations[0]?.global_charges || [];
          if (Array.isArray(gc) && gc.length) {
            setGlobalCharges(
              gc.map((c) => ({
                _id: genLocalId("gc"),
                name: c.name || "",
                amount: parseFloat(c.amount ?? c.tax ?? 0) || 0,
                amount_mode: c.amount_mode || c.tax_mode || "percentage",
                comment: c.comment || "",
              }))
            );
          }
          // Already-quoted vendors usually only re-visit pricing step
          setAcceptedTerms(true);
        }

        // Preload tech-eval clauses & responses for each product that has eval.
        //
        // `/rfq/get-vendor-responses` (fetchVendorAgreement) returns ALL clauses
        // for this vendor — each row carries clause_id, clause_text,
        // clause_files, plus the vendor's previously-saved vendor_response
        // ("I Agree" / "I Dont Agree" / "") and vendor_response_files. So we
        // can drop the separate get-clauses-of-product call and hydrate from
        // a single endpoint, mirroring the working tech-eval page.
        const evalable = built.filter((p) => p.has_tech_eval);
        if (evalable.length > 0) {
          setTechLoading(true);
          await Promise.all(
            evalable.map(async (p) => {
              try {
                const respRes = await fetchVendorAgreement({
                  rfq_id: parseInt(id),
                  rfq_product_id: p.id,
                  vendor_id: userProfile?.id,
                });
                if (cancelled) return;

                const rows = Array.isArray(respRes?.data) ? respRes.data : [];

                // Clauses for rendering (the wizard's clause list expects
                // `id` / `clause_text` / `file_url`, so normalise here).
                const clauseList = rows.map((r) => ({
                  id: r.clause_id,
                  clause_id: r.clause_id,
                  clause_text: r.clause_text,
                  // The wizard's clause renderer reads `file_url` for the
                  // single "Reference" attachment chip; the API returns an
                  // array `clause_files`. Pick the first one for the chip and
                  // pass the full list through for downstream use.
                  file_url: (r.clause_files || [])[0] || "",
                  files: r.clause_files || [],
                }));
                setTechClauses((prev) => ({ ...prev, [p.id]: clauseList }));

                // Hydrate prior agree / disagree + uploaded reference files.
                // Note: deviation text is NOT stored on vendor_response —
                // it lives in the per-clause chat thread (loaded separately).
                const responses = {};
                let anyAnswered = false;
                rows.forEach((r) => {
                  const mapped = API_TO_RESPONSE(r.vendor_response);
                  if (mapped) anyAnswered = true;
                  responses[r.clause_id] = {
                    response: mapped,
                    comment: "",
                    files: r.vendor_response_files || [],
                  };
                });
                if (!cancelled) {
                  setTechResponses((prev) => ({ ...prev, [p.id]: responses }));
                  if (anyAnswered) {
                    setTechSubmitted((prev) => ({ ...prev, [p.id]: true }));
                  }
                }

                // Prefetch chat message counts so the per-clause "Chat (N)"
                // pill renders correctly on first paint.
                try {
                  const devRes = await fetchDeviationPreviews(
                    p.id,
                    userProfile?.id,
                    token
                  );
                  if (!cancelled && Array.isArray(devRes?.data)) {
                    const counts = {};
                    devRes.data.forEach((m) => {
                      const key = `${p.id}.${m.clause_id}`;
                      counts[key] = (counts[key] || 0) + 1;
                    });
                    setChatCounts((prev) => ({ ...prev, ...counts }));
                  }
                } catch (_) { /* preview failure is non-fatal */ }
              } catch (e) {
                console.error("Failed to load tech-eval for product", p.id, e);
              }
            })
          );
          if (!cancelled) setTechLoading(false);
        }

        // If already quoted (update mode) — jump straight to the Review step
        // so the vendor can re-verify and re-submit. They can step back to
        // edit pricing or terms if needed.
        if (hasQuote) {
          const hasEvalAtLoad = built.some((p) => p.has_tech_eval);
          // visibleSteps order: overview, [eval], pricing, terms, review
          const reviewIdx = hasEvalAtLoad ? 4 : 3;
          setCurrentStep(reviewIdx);
        }

        // Edit eligibility: check bid expiry + active negotiation rounds
        const expired = data.bid_end_date ? checkBidExpired(data.bid_end_date) : false;
        if (!cancelled) setIsBidExpired(expired);
        if (expired) {
          setNegotiationLoading(true);
          try {
            const resp = await getAllActiveNegotiationRounds(parseInt(id), token);
            const now = new Date();
            const activeRounds = (resp?.data || []).filter((r) => {
              if (r.status !== "ACTIVE" || !r.end_date) return false;
              const endStr =
                r.end_date.includes("+") || r.end_date.includes("Z")
                  ? r.end_date
                  : r.end_date.replace(" ", "T") + "Z";
              return new Date(endStr) > now;
            });
            // Multi-product rounds list every covered product in `products[]`
            // (rfq_product_id is NULL on the row); legacy rounds carry a single
            // rfq_product_id. Collect the union of covered product ids.
            const coveredIdsOf = (r) => {
              if (Array.isArray(r.products) && r.products.length > 0) {
                return r.products
                  .map((p) => p?.rfq_product_id)
                  .filter((pid) => pid != null);
              }
              return r.rfq_product_id != null ? [r.rfq_product_id] : [];
            };
            const coveredProductIds = new Set(activeRounds.flatMap(coveredIdsOf));
            // `tax_demand` is the buyer's free-text ask on the field's tax —
            // it gates the vendor's tax inputs independently of the amount target.
            const mapFields = (rawFields) => (rawFields || []).map((f) => ({
              name: f.name,
              targetPrice: f.target || f.target_price,
              demand: f.demand || null,
              mode: f.mode || null,
              taxDemand: f.tax_demand || null,
            }));
            const fieldsByProduct = {};
            activeRounds.forEach((r) => {
              if (Array.isArray(r.products) && r.products.length > 0) {
                // Multi round: backend strips products[].vendor_targets to this
                // vendor, so the first vendor_targets entry is ours.
                r.products.forEach((p) => {
                  const vt = (p?.vendor_targets || [])[0];
                  if (!vt?.fields?.length) return;
                  if (p?.is_rfq_level === true) {
                    // RFQ-level fields apply to the global section — key them
                    // under a dedicated bucket.
                    fieldsByProduct.__rfq_level__ = mapFields(vt.fields);
                  } else if (p?.rfq_product_id != null) {
                    fieldsByProduct[p.rfq_product_id] = mapFields(vt.fields);
                  }
                });
                return;
              }
              // Legacy round: fields live on the vendor's approval entry.
              const myApproval = (r.vendor_approvals || [])[0];
              if (!myApproval?.negotiation_fields) return;
              fieldsByProduct[r.rfq_product_id] = mapFields(myApproval.negotiation_fields);
            });
            if (!cancelled) {
              setNegotiationFields(fieldsByProduct);
              setActiveNegotiationProductIds(coveredProductIds);
            }
          } catch (e) {
            console.error("Failed to load negotiation rounds", e);
          } finally {
            if (!cancelled) setNegotiationLoading(false);
          }
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load inquiry. Please retry.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, userProfile?.id]);

  // Once-per-round rule (legacy parity): if the vendor already submitted a
  // quote for the LATEST round of a product, that product stays blocked until
  // the buyer opens a new round.
  useEffect(() => {
    if (!id || !rfq?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await getAllVendorNegotiationStatus(id, token);
        if (cancelled) return;
        if (response?.status === 1 && response?.data) {
          const statusMap = {};
          response.data.forEach((round) => {
            if (round.hasSubmittedQuote) {
              statusMap[round.rfq_product_id] = {
                hasSubmitted: true,
                quotedPrice: round.vendor_quoted_price,
                submittedAt: round.vendor_submitted_at,
                targetPrice: round.target_price,
                roundId: round.id,
                roundNumber: round.round_number,
              };
            }
          });
          setNegotiationQuoteSubmitted(statusMap);
        }
      } catch (error) {
        console.error("Error checking negotiation status:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, rfq?.id]);

  // Auto-add missing negotiated charges and drop fields whose target is
  // already met by the quoted value (legacy parity). Tax demands survive
  // regardless of the amount target.
  useEffect(() => {
    if (negotiationChargesAddedRef.current) return;
    const fields = negotiationFields;
    if (!fields || Object.keys(fields).length === 0 || products.length === 0) return;
    negotiationChargesAddedRef.current = true;

    const filteredFields = {};
    Object.keys(fields).forEach((productId) => {
      if (productId === "__rfq_level__") {
        filteredFields[productId] = fields[productId];
        return;
      }
      const product = products.find((p) => String(p.id) === String(productId));
      if (!product) {
        filteredFields[productId] = fields[productId];
        return;
      }
      filteredFields[productId] = fields[productId].filter((f) => {
        if (f.taxDemand) return true;
        const target = parseFloat(f.targetPrice);
        if (isNaN(target)) return true; // keep non-numeric fields like payment_terms
        if (f.name === "base_price") {
          const quoted = parseFloat(product.unit_price || 0);
          return quoted > 0 && target < quoted;
        }
        const charge = (product.other_charges || []).find(
          (c) => (c.slug || c.name) === f.name
        );
        if (!charge || parseFloat(charge.amount || 0) <= 0) return true;
        return target < parseFloat(charge.amount || 0);
      });
    });
    setNegotiationFields(filteredFields);

    // Reserved field names live elsewhere on the form, not in other_charges.
    const NON_CHARGE_FIELDS = [
      "base_price", "payment_terms", "comment", "global_comment",
      "vendor_tc", "documents", "delivery_period",
    ];
    setProducts((prev) =>
      prev.map((product) => {
        const negFields = filteredFields[product.id] || [];
        const existingChargeNames = new Set(
          (product.other_charges || []).map((c) => c.slug || c.name)
        );
        const missingCharges = negFields
          .filter(
            (f) =>
              !NON_CHARGE_FIELDS.includes(f.name) &&
              !existingChargeNames.has(f.name)
          )
          .map((f) => ({
            _id: genLocalId("ch"),
            name: f.name,
            slug: f.name,
            amount: 0,
            amount_mode: f.mode === "percentage" ? "percentage" : "absolute",
            // tax: null = inherit base rate (tri-state semantics).
            tax: null,
            tax_mode: "percentage",
          }));
        if (missingCharges.length === 0) return product;
        return {
          ...product,
          other_charges: [...(product.other_charges || []), ...missingCharges],
        };
      })
    );
  }, [negotiationFields, products]);

  /* ─────────────────────────── Mutators ─────────────────────────── */
  const updateProduct = (idx, patch) => {
    markUnsaved();
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const updateProductCharge = (pIdx, cIdx, patch) => {
    markUnsaved();
    setProducts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const charges = [...(p.other_charges || [])];
        charges[cIdx] = { ...charges[cIdx], ...patch };
        return { ...p, other_charges: charges };
      })
    );
  };

  const addProductCharge = (pIdx, name = "") => {
    markUnsaved();
    setProducts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          other_charges: [
            ...(p.other_charges || []),
            {
              _id: genLocalId("oc"),
              name,
              slug: name.toLowerCase().replace(/\s+/g, "_"),
              amount: 0,
              amount_mode: "percentage",
              // null = inherit base rate (tri-state). Vendor types 0 to mean "no tax on this charge".
              tax: null,
              tax_mode: "percentage",
              comment: "",
            },
          ],
        };
      })
    );
  };

  const removeProductCharge = (pIdx, cIdx) => {
    markUnsaved();
    setProducts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const charges = [...(p.other_charges || [])];
        charges.splice(cIdx, 1);
        return { ...p, other_charges: charges };
      })
    );
  };

  const setClauseResponse = (productId, clauseId, response) => {
    setTechResponses((prev) => {
      const cur = prev[productId]?.[clauseId] || {};
      return {
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [clauseId]: { ...cur, response },
        },
      };
    });
  };
  const setClauseComment = (productId, clauseId, comment) => {
    setTechResponses((prev) => {
      const cur = prev[productId]?.[clauseId] || {};
      return {
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [clauseId]: { ...cur, comment },
        },
      };
    });
  };
  const addClauseFile = async (productId, clauseId, file) => {
    if (!file) return;
    try {
      const res = await handleUploadFile(file, token);
      const url = res?.data?.[0]?.file_path;
      if (!url) throw new Error("Upload failed");
      setTechResponses((prev) => {
        const cur = prev[productId]?.[clauseId] || {};
        return {
          ...prev,
          [productId]: {
            ...(prev[productId] || {}),
            [clauseId]: { ...cur, files: [...(cur.files || []), url] },
          },
        };
      });
    } catch (e) {
      toast.error("File upload failed.");
    }
  };
  const removeClauseFile = (productId, clauseId, url) => {
    setTechResponses((prev) => {
      const cur = prev[productId]?.[clauseId] || {};
      return {
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [clauseId]: { ...cur, files: (cur.files || []).filter((u) => u !== url) },
        },
      };
    });
  };

  const changeGSTIN = (v) => {
    markUnsaved();
    setVendorGSTIN(v);
  };
  const changeGlobalComment = (v) => {
    markUnsaved();
    setGlobalComment(v);
  };

  /* ─────────────────────────── Payment terms ─────────────────────────── */
  const addPaymentTerm = () => {
    markUnsaved();
    setPaymentTerms((prev) => [
      ...prev,
      { id: null, type: "advance", value: 0, days: "", comment: "" },
    ]);
  };
  const updatePaymentTerm = (i, patch) => {
    markUnsaved();
    setPaymentTerms((prev) => prev.map((t, j) => (i === j ? { ...t, ...patch } : t)));
  };
  const removePaymentTerm = (i) => {
    markUnsaved();
    setPaymentTerms((prev) => {
      const next = [...prev];
      if (next[i].id) {
        next[i] = { ...next[i], action: "delete" };
      } else {
        next.splice(i, 1);
      }
      return next;
    });
  };

  /* ─────────────────────────── Submit tech-eval (per-product) ─────────────────────────── */
  const persistTechEvalForProduct = async (productId) => {
    const responses = techResponses[productId] || {};
    const payload = Object.entries(responses).map(([clauseId, r]) => {
      const row = {
        rfq_id: parseInt(id),
        rfq_product_id: productId,
        clause_id: parseInt(clauseId),
        vendor_response: r.response,
        vendor_id: userProfile?.id,
        file_url: r.files || [],
      };
      // Backend rejects deviation_text on "agree" rows (even when empty),
      // so only include it when the vendor disagreed AND wrote something.
      const trimmed = (r.comment || "").trim();
      if (r.response === "disagree" && trimmed) {
        row.deviation_text = trimmed;
      }
      return row;
    });
    if (!payload.length) return;
    await addVendorAgreement(payload);
    setTechSubmitted((prev) => ({ ...prev, [productId]: true }));
  };

  /* ─────────────────────────── Tender fee gate ─────────────────────────── */
  // Resolves true when the fee is paid (or not required). Opens the Razorpay
  // checkout when payment is still pending — mirroring the legacy send-quote
  // flow, including the already-paid skip.
  const ensureTenderFeesPaid = async () => {
    if (!(rfq?.is_tender === 1 && (tenderFees || 0) > 0 && !tenderPaymentPaid)) return true;

    const orderRes = await createTenderPaymentOrder(id, token);
    if (orderRes?.data?.already_paid) {
      setTenderPaymentPaid(true);
      toast.success("Tender fees already paid.");
      return true;
    }
    const orderData = orderRes?.data?.order;
    if (!orderData?.id) {
      toast.error("Failed to create payment order. Please try again.");
      return false;
    }
    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded) {
      toast.error("Razorpay SDK failed to load. Please try again.");
      return false;
    }

    return new Promise((resolve) => {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        order_id: orderData.id,
        // When order_id is provided Razorpay fetches the amount from the
        // order — passing it again risks a mismatch.
        currency: orderData.currency || "INR",
        name: "Workwise",
        description: "Tender Fees",
        handler: async (response) => {
          try {
            const verifyResponse = await verifyTenderPayment(
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                rfq_id: id,
              },
              token
            );
            if (verifyResponse?.status !== 1) {
              throw new Error(verifyResponse?.message || "Payment verification failed");
            }
            setTenderPaymentPaid(true);
            toast.success("Tender fees paid successfully.");
            resolve(true);
          } catch (err) {
            toast.error(err?.message || "Payment verification failed.");
            resolve(false);
          }
        },
        modal: {
          // Dismiss without paying → abort the submit; vendor's inputs are
          // untouched and they can retry.
          ondismiss: () => resolve(false),
        },
        prefill: { name: "", email: "", contact: "" },
        notes: { rfq: id },
        theme: { color: "#158993" },
      };
      const paymentObject = new window.Razorpay(options);
      // Razorpay allows retry within the same modal, so only surface the
      // error here — ondismiss handles the abort when the modal closes.
      paymentObject.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });
      paymentObject.open();
    });
  };

  /* ─────────────────────────── Submit quote ─────────────────────────── */
  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Add prices, payment terms (sum to 100%), and delivery before submitting.");
      return;
    }
    if (!rfq) return;

    setSubmitting(true);

    try {
      // 0) Tender fee gate — fee-bearing tenders must be paid before the
      // quote goes in. Aborts silently if the vendor closes the checkout.
      let feesPaid;
      try {
        feesPaid = await ensureTenderFeesPaid();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Unable to initiate payment");
        return;
      }
      if (!feesPaid) return;

      // 1) Persist any pending tech-eval responses (one network call per product)
      const evalPromises = Object.keys(techResponses)
        .filter((pid) => !techSubmitted[pid])
        .map((pid) => persistTechEvalForProduct(pid));
      if (evalPromises.length) await Promise.all(evalPromises);

      // 2) Build submission payload (mirrors legacy send-quote contract)
      const filteredProducts = products
        .filter((p) => {
          // Skip finalized / locked products
          if (p.finalization_status === "Another vendor is finalized") return false;
          if (p.finalization_status === "You are finalized") return false;
          // Tech-eval restriction (legacy parity): not-accepted products are
          // locked in the pricing grid and must not be quoted.
          if (showTechEvalRestrictions && p.has_tech_eval && !p.tech_eval_accepted) return false;
          // Once-per-round rule: already re-quoted in the latest round.
          if (negotiationQuoteSubmitted[p.id]) return false;
          // Post-expiry, only products with an active negotiation round go out.
          if (isBidExpired && !activeNegotiationProductIds.has(p.id)) return false;
          return true;
        })
        .map((p) => {
          // total_price comes from the engine via usePreviewTotals; backend
          // will recompute on save so this is purely advisory.
          const total = Number(p.total_price) || 0;

          return {
            id: p.id,
            product_id: p.product_id,
            variant: p.variant,
            quantity: p.qty,
            unit_price: parseFloat(p.unit_price) || 0,
            tax: parseFloat(p.tax) || 0,
            tax_mode: p.tax_mode || "percentage",
            total_price: total,
            comment: p.comment || "",
            delivery_period: parseInt(p.delivery_period) || 0,
            document_files: p.document_files || [],
            other_charges: (p.other_charges || [])
              .filter((c) => c.name && c.name.trim())
              .map((c) => ({
                name: c.name,
                slug: c.slug || c.name.toLowerCase().replace(/\s+/g, "_"),
                amount: parseFloat(c.amount) || 0,
                amount_mode: c.amount_mode || "percentage",
                // Per-charge GST. null = inherit product base rate.
                tax: c.tax == null || c.tax === "" ? null : parseFloat(c.tax),
                tax_mode: c.tax_mode || "percentage",
                comment: (c.comment || "").trim(),
                is_global: false,
              })),
          };
        });

      // All lines filtered out (finalized / tech-locked / already negotiated /
      // not in an active round) — nothing left to submit.
      if (!filteredProducts.length) {
        toast.error("No products are currently open for quoting.");
        return;
      }

      // Every filled line must be complete (legacy parity): a priced line
      // needs a delivery period and vice-versa. Fully empty lines pass —
      // they go out as skipped (unit_price 0).
      const hasPartialLine = filteredProducts.some(
        (p) => (p.unit_price > 0) !== (p.delivery_period > 0)
      );
      if (hasPartialLine) {
        toast.error("Base price and delivery period must be greater than zero");
        return;
      }

      const basePayload = {
        rfq_id: rfq.id,
        rfq_no: rfq.rfq_no,
        status: 1,
        products: filteredProducts,
        globalPaymentTerms: "",
        globalComment,
        term_and_condition_files: [],
        vendorGSTIN,
        global_charges: globalCharges
          .filter((c) => c.name && c.name.trim())
          // Legacy contract: the charge amount travels in `tax`/`tax_mode`
          // (historical naming); `additional_tax` is the extra tax on top.
          .map((c) => ({
            name: c.name,
            slug: c.slug || c.name.toLowerCase().replace(/\s+/g, "_"),
            tax: parseFloat(c.amount) || 0,
            tax_mode: c.amount_mode || "percentage",
            additional_tax: parseFloat(c.extra_tax) || 0,
            additional_tax_mode: c.extra_tax_mode || "percentage",
            comment: (c.comment || "").trim(),
            is_global: true,
          })),
      };

      if (alreadyQuoted) {
        const diff = diffPaymentTerms(paymentTerms, originalPaymentTermsRef.current);
        const updatePayload = {
          ...basePayload,
          global_payment_term_list: diff,
        };
        const quoteId = rfq.quotations[0]?.id;
        await updateQuotation(quoteId, updatePayload, token);
      } else {
        const insertPayload = {
          ...basePayload,
          global_payment_term_list: paymentTerms.filter((t) => t.action !== "delete"),
        };
        await sendQuotation(insertPayload, token);
      }

      // 3) Success
      setSubmittedRef(generateReference(rfq.rfq_no));
      setSubmittedAt(
        new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      clearUnsaved();
      toast.success("Quote submitted successfully");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to submit quote. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────────────────────── History ─────────────────────────── */
  const openHistoryFor = async (productVariantId) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetchQuoteHistory(productVariantId, token);
      setHistory(res?.data?.previous_quotes || res?.data || []);
    } catch (e) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ─────────────────────────── Regret ─────────────────────────── */
  const handleRegret = ({ reqret_reason }) => {
    if (!rfq) return;
    setSubmitting(true);
    const payload = {
      rfq_id: rfq.id,
      rfq_no: rfq.rfq_no,
      status: 1,
      products: products.map((p) => ({
        id: p.id,
        product_id: p.product_id,
        variant: p.variant,
        quantity: p.qty,
        unit_price: 0,
        total_price: 0,
        comment: "",
        delivery_period: "",
      })),
      is_regret: 1,
      regret_reason: reqret_reason,
      globalComment: "",
    };
    sendQuotation(payload, token)
      .then(() => {
        clearUnsaved();
        toast.success("Quote regretted. The buyer has been notified.");
        setRegretOpen(false);
        router.push(
          `/dashboard/vendor/inquiries-details?id=${id}${
            token !== undefined ? `&token=${token}` : ""
          }`
        );
      })
      .catch(() => toast.error("Failed to send regret. Please retry."))
      .finally(() => setSubmitting(false));
  };

  /* ─────────────────────────── Nav helpers ─────────────────────────── */
  const goToStep = (i) => {
    if (canVisit(i)) {
      setCurrentStep(i);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const nextStep = async () => {
    if (currentStepId === "eval") {
      // Persist any tech-eval responses opportunistically; don't block on failure.
      try {
        const pending = Object.keys(techResponses).filter((pid) => !techSubmitted[pid]);
        for (const pid of pending) await persistTechEvalForProduct(pid);
      } catch (e) {
        // Silently allow continue — they'll re-try on final submit too.
      }
    }
    if (currentStep < visibleSteps.length - 1) {
      const gateOk =
        currentStepId === "overview" ? canContinueStep1
        : currentStepId === "clarifications" ? !clarBlocksQuote
        : currentStepId === "eval" ? canContinueStep2
        : currentStepId === "pricing" ? canContinueStep3
        : currentStepId === "terms" ? canContinueStep4
        : true;
      if (gateOk) {
        setCurrentStep((s) => s + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClose = () => {
    router.push(`/dashboard/vendor/inquiries-received`);
  };
  const handleBack = () => {
    router.push(`/dashboard/vendor/inquiries-received`);
  };

  /* ─────────────────────────── Render ─────────────────────────── */
  if (loading) {
    return <WizardSkeleton />;
  }

  if (!rfq) {
    return (
      <div className={styles.root}>
        <div className={styles.skeletonShell}>
          <div className={styles.alertDanger}>
            <span>This inquiry could not be loaded.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <HeaderStrip
        rfq={rfq}
        pageType={pageType}
        alreadyQuoted={alreadyQuoted}
        totalSteps={visibleSteps.length}
        bidEnded={bidEnded}
        onBack={handleBack}
      />

      <Stepper
        steps={visibleSteps}
        currentStep={currentStep}
        canVisit={canVisit}
        onStep={goToStep}
      />

      {(missedInquiry || reviewOnly) && (
        <div className={`${styles.missedBanner} ${reviewOnly ? styles.missedBannerReview : ""}`}>
          <AlertTriangle size={16} strokeWidth={2.2} />
          <div className={styles.missedBannerBody}>
            <div className={styles.missedBannerTitle}>{editStatus.title}</div>
            <div className={styles.missedBannerDetail}>{editStatus.body}</div>
          </div>
        </div>
      )}

      <main className={styles.content}>
        {currentStepId === "overview" && (
          <Step1Overview
            rfq={rfq}
            products={products}
            accepted={acceptedTerms}
            onToggleAccept={() => setAcceptedTerms((v) => !v)}
            alreadyQuoted={alreadyQuoted}
            missedInquiry={missedInquiry}
          />
        )}

        {currentStepId === "clarifications" && (
          <StepClarifications
            rfq={rfq}
            clarifications={clarifications}
            loading={clarLoading}
            isWindowActive={isClarWindowActive}
            countdown={clarCountdown}
            deadline={clarificationDeadline}
            hasOpen={hasOpenClarification}
            isOwner={isOwnerOfOpenClarification}
            openClarification={openClarificationObj}
            canRaise={canRaiseClarification}
            onRaise={() => setRaiseClarOpen(true)}
            onOpenDetail={(c) => setDetailClar(c)}
            currentUserId={userProfile?.id}
          />
        )}

        {currentStepId === "eval" && (
          <Step2TechEval
            evalProducts={evalProducts}
            allProducts={products}
            techClauses={techClauses}
            techResponses={techResponses}
            techLoading={techLoading}
            evalAnswered={evalAnswered}
            evalTotal={evalTotalClauses}
            evalProgress={evalProgress}
            onSetResponse={setClauseResponse}
            onSetComment={setClauseComment}
            onAddFile={addClauseFile}
            onRemoveFile={removeClauseFile}
            chatCounts={chatCounts}
            onOpenClauseChat={(p, c, idx) => setChatTarget({ product: p, clause: c, clauseIndex: idx + 1 })}
          />
        )}

        {currentStepId === "pricing" && (
          <Step3Pricing
            rfq={rfq}
            products={products}
            totals={totals}
            pricingLoading={pricingLoading}
            paymentTerms={paymentTerms}
            paymentTotal={paymentTotal}
            globalComment={globalComment}
            vendorGSTIN={vendorGSTIN}
            globalCharges={globalCharges}
            onChangeGSTIN={changeGSTIN}
            onChangeGlobalComment={changeGlobalComment}
            onUpdateProduct={updateProduct}
            onOpenCharges={(i) => setChargesOpenIdx(i)}
            onOpenGlobalCharges={() => setGlobalChargesModalOpen(true)}
            onAddPaymentTerm={addPaymentTerm}
            onUpdatePaymentTerm={updatePaymentTerm}
            onRemovePaymentTerm={removePaymentTerm}
            onOpenHistory={openHistoryFor}
            canSubmit={canSubmit}
            token={token}
            editStatus={editStatus}
            isReadOnly={isReadOnly}
            negotiationFields={negotiationFields}
            showTechEvalRestrictions={showTechEvalRestrictions}
            isBidExpired={isBidExpired}
            activeNegotiationProductIds={activeNegotiationProductIds}
            negotiationQuoteSubmitted={negotiationQuoteSubmitted}
          />
        )}

        {currentStepId === "terms" && (
          <Step4CommercialTerms
            rfq={rfq}
            totals={totals}
            pricingLoading={pricingLoading}
            paymentTerms={paymentTerms}
            paymentTotal={paymentTotal}
            globalComment={globalComment}
            vendorGSTIN={vendorGSTIN}
            globalCharges={globalCharges}
            onChangeGSTIN={changeGSTIN}
            onChangeGlobalComment={changeGlobalComment}
            onOpenGlobalCharges={() => setGlobalChargesModalOpen(true)}
            onAddPaymentTerm={addPaymentTerm}
            onUpdatePaymentTerm={updatePaymentTerm}
            onRemovePaymentTerm={removePaymentTerm}
            canSubmit={canSubmit && !isReadOnly}
            isReadOnly={isReadOnly}
          />
        )}

        {currentStepId === "review" && (
          <Step5Review
            rfq={rfq}
            products={products}
            totals={totals}
            pricingLoading={pricingLoading}
            vendorGSTIN={vendorGSTIN}
            globalComment={globalComment}
            globalCharges={globalCharges}
            paymentTerms={paymentTerms}
            warnings={reviewWarnings}
            canSubmit={canSubmit && !isReadOnly}
          />
        )}
      </main>

      {!submittedRef && (
        <ActionBar
          currentStep={currentStep}
          currentStepId={currentStepId}
          totalSteps={visibleSteps.length}
          isLastStep={currentStep === visibleSteps.length - 1}
          canContinueStep1={canContinueStep1}
          canContinueStep2={canContinueStep2}
          canContinueStep3={canContinueStep3}
          canContinueStep4={canContinueStep4}
          canSubmit={canSubmit && !isReadOnly}
          missedInquiry={missedInquiry}
          clarBlocksQuote={clarBlocksQuote}
          evalAnswered={evalAnswered}
          evalTotal={evalTotalClauses}
          totals={totals}
          submitting={submitting}
          onPrev={prevStep}
          onNext={nextStep}
          onSubmit={handleSubmit}
          onRegret={() => setRegretOpen(true)}
          alreadyQuoted={alreadyQuoted}
          isReadOnly={isReadOnly}
        />
      )}

      {chargesOpenIdx !== null && (
        <ChargesModal
          product={products[chargesOpenIdx]}
          pIdx={chargesOpenIdx}
          onClose={() => setChargesOpenIdx(null)}
          onAddCharge={(name) => addProductCharge(chargesOpenIdx, name)}
          onUpdateCharge={(cIdx, patch) =>
            updateProductCharge(chargesOpenIdx, cIdx, patch)
          }
          onRemoveCharge={(cIdx) => removeProductCharge(chargesOpenIdx, cIdx)}
          negFields={negotiationFields[products[chargesOpenIdx]?.id] || []}
          bidExpired={isBidExpired}
          chargeTypes={lineChargeTypes}
        />
      )}

      {globalChargesModalOpen && (
        <GlobalChargesModal
          charges={globalCharges}
          negFields={negotiationFields.__rfq_level__ || []}
          bidExpired={isBidExpired}
          chargeTypes={globalChargeTypes}
          onClose={() => setGlobalChargesModalOpen(false)}
          onAddCharge={(name) => {
            markUnsaved();
            setGlobalCharges((prev) => [
              ...prev,
              {
                _id: genLocalId("gc"),
                name,
                amount: 0,
                amount_mode: "percentage",
                comment: "",
              },
            ]);
          }}
          onUpdateCharge={(cIdx, patch) => {
            markUnsaved();
            setGlobalCharges((prev) =>
              prev.map((c, i) => (i === cIdx ? { ...c, ...patch } : c))
            );
          }}
          onRemoveCharge={(cIdx) => {
            markUnsaved();
            setGlobalCharges((prev) => prev.filter((_, i) => i !== cIdx));
          }}
        />
      )}

      {historyOpen && (
        <HistoryModal
          history={history}
          loading={historyLoading}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {regretOpen && (
        <RegretQuoteReasonModal
          showModal={regretOpen}
          closeModal={() => setRegretOpen(false)}
          handleRegretReason={handleRegret}
        />
      )}

      <RaiseClarificationModal
        show={raiseClarOpen}
        onHide={() => setRaiseClarOpen(false)}
        rfqId={parseInt(id)}
        rfqNo={rfq?.rfq_no}
        deadline={clarificationDeadline}
        onSuccess={() => {
          setRaiseClarOpen(false);
          refreshClarifications();
        }}
      />

      <ClarificationDetailModal
        show={!!detailClar}
        onHide={() => setDetailClar(null)}
        clarification={detailClar}
        isBuyer={false}
        onSuccess={() => {
          setDetailClar(null);
          refreshClarifications();
        }}
      />

      <ClauseChatDrawer
        open={!!chatTarget}
        onClose={() => setChatTarget(null)}
        clause={chatTarget?.clause}
        productName={chatTarget?.product?.product_name || chatTarget?.product?.name}
        clauseIndex={chatTarget?.clauseIndex}
        currentUser={userProfile}
        otherUser={{
          buyer_id: rfq?.buyer_id || rfq?.created_by,
          vendor_id: userProfile?.id,
          contactName: rfq?.buyer_name,
          companyName: rfq?.buyer_company_name,
          rfq_no: rfq?.rfq_no,
          rfq_id: rfq?.id,
        }}
        product={chatTarget?.product}
        rfq={rfq}
        token={token}
        onMessagesChanged={(count) => {
          if (!chatTarget) return;
          const key = `${chatTarget.product.id}.${chatTarget.clause.clause_id || chatTarget.clause.id}`;
          setChatCounts((prev) => ({ ...prev, [key]: count }));
        }}
      />


      {submittedRef && (
        <SuccessModal
          rfq={rfq}
          totals={totals}
          products={products}
          submittedAt={submittedAt}
          submittedRef={submittedRef}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Header strip
   ════════════════════════════════════════════════════════════════ */
const HeaderStrip = ({ rfq, pageType, alreadyQuoted, totalSteps, bidEnded, onBack }) => {
  const isTender = rfq?.is_tender === 1;
  const status = bidEnded
    ? { label: alreadyQuoted ? "Existing quote · Read-only" : "Inquiry · Closed", dot: "danger" }
    : alreadyQuoted
      ? { label: "Existing quote · Update", dot: "warn" }
      : { label: "New inquiry · Active", dot: "" };
  const stepCopy = totalSteps === 2 ? "two quick steps" : "three quick steps";
  return (
    <section className={styles.headerStrip}>
      <div className={styles.headerInner}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size={13} />
            Back to inquiries
          </button>
          <div className={styles.eyebrow}>
            <span className={`${styles.eyebrowDot} ${status.dot ? styles[status.dot] : ""}`} />
            {status.label}
          </div>
          <h1 className={styles.pageTitle}>
            Submit quote for {rfq?.company_name || "Buyer"}
          </h1>
          <p className={styles.pageSub}>
            Walk through {stepCopy} to{" "}
            {totalSteps === 2
              ? "acknowledge terms and price your items."
              : "acknowledge terms, respond to product evaluation, and price your items."}
          </p>
        </div>
        <div className={styles.headerMeta}>
          <span className={`${styles.pill} ${styles.outline}`}>
            <span className={styles.pdot} style={{ background: "var(--info)" }} />
            <span>{isTender ? "Tender" : "RFQ"}</span>
            <span className={styles.mono} style={{ color: "var(--fg)", fontWeight: 600 }}>
              #{rfq?.rfq_no}
            </span>
          </span>
          {rfq?.bid_end_date && (
            <span className={`${styles.pill} ${bidEnded ? styles.danger : styles.warn}`}>
              <Clock size={12} />
              {bidEnded
                ? `Already ended · ${fmtShortDate(rfq.bid_end_date)}`
                : `Deadline · ${fmtShortDate(rfq.bid_end_date)}`}
            </span>
          )}
          {rfq?.id && (
            <a
              href={`/dashboard/buyer/query?rfq_id=${rfq.id}&role=vendor`}
              className={styles.queryBtn}
              title="Message the buyer"
            >
              <MessageCircle size={13} strokeWidth={2} />
              <span>Queries</span>
              {Number(rfq.unseen_query_count) > 0 && (
                <span className={styles.queryBtnBadge}>{rfq.unseen_query_count}</span>
              )}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════════════════════════════
   Status banner — edit eligibility + negotiation invite
   ════════════════════════════════════════════════════════════════ */
const StatusBanner = ({ status }) => {
  const klass =
    status.kind === "success"
      ? styles.statusBannerSuccess
      : status.kind === "danger"
      ? styles.statusBannerDanger
      : status.kind === "warn"
      ? styles.statusBannerWarn
      : styles.statusBannerInfo;
  return (
    <div className={`${styles.statusBanner} ${klass}`}>
      <div className={styles.statusBannerDot} />
      <div className={styles.statusBannerBody}>
        <div className={styles.statusBannerTitle}>{status.title}</div>
        <div className={styles.statusBannerText}>{status.body}</div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Stepper
   ════════════════════════════════════════════════════════════════ */
const Stepper = ({ steps, currentStep, canVisit, onStep }) => {
  const railRef = useRef(null);
  const itemRefs = useRef({});

  // Keep the active step visible inside the scrollable rail. When the list
  // has more steps than fit on screen, scroll the active one into view with
  // some breathing room on either side so the user can still see context.
  useEffect(() => {
    const rail = railRef.current;
    const item = itemRefs.current[currentStep];
    if (!rail || !item) return;
    // inline: "center" keeps the active step near the middle of the rail
    item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentStep, steps.length]);

  return (
    <div className={styles.stepperWrap}>
      <nav className={styles.stepper} aria-label="Progress" ref={railRef}>
        {steps.map((s, i) => {
          const isActive = currentStep === i;
          const isDone = currentStep > i;
          const disabled = !canVisit(i) && !isActive && !isDone;
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                ref={(el) => { itemRefs.current[i] = el; }}
                className={`${styles.step} ${isActive ? styles.stepActive : ""} ${
                  isDone ? styles.stepDone : ""
                }`}
                disabled={disabled}
                onClick={() => onStep(i)}
              >
                <div className={styles.stepNum}>
                  <span className={styles.stepNumText}>{i + 1}</span>
                </div>
                <div className={styles.stepLabelWrap}>
                  <div className={styles.stepLabel}>{s.label}</div>
                  <div className={styles.stepMeta}>{s.meta}</div>
                </div>
              </button>
              {i < steps.length - 1 && <div className={styles.stepDivider} />}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Step 1 — Overview & Terms
   ════════════════════════════════════════════════════════════════ */
const Step1Overview = ({ rfq, products, accepted, onToggleAccept, alreadyQuoted, missedInquiry }) => {
  const terms = rfq?.terms || [];
  const additionalRaw = rfq?.comment || "";

  return (
    <div className={styles.stepPane}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Inquiry overview</div>
          <div className={styles.sectionSub}>
            Review who's asking, what they need, and the terms you'll be agreeing to.
          </div>
        </div>
        <span className={`${styles.pill} ${rfq.is_tender === 1 ? styles.info : ""}`}>
          <span className={styles.pdot} style={{ background: "var(--info)" }} />
          {rfq.is_tender === 1 ? "Tender" : "RFQ"} · {alreadyQuoted ? "Update mode" : "Sealed bid"}
        </span>
      </div>

      {/* Buyer details */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3>
            <Building2 size={14} />
            Buyer details
          </h3>
          {rfq.company_name && (
            <span className={styles.cardHeadCount}>
              {rfq.company_name}
              {rfq.hotel_name ? ` · ${rfq.hotel_name}` : ""}
            </span>
          )}
        </div>
        <div className={styles.detailGrid}>
          <DetailCell label="Company" value={rfq.company_name} />
          <DetailCell label="Business unit" value={rfq.hotel_name} />
          <DetailCell label="Department" value={rfq.department_name} />
          <DetailCell label="Contact person" value={rfq.contact_name} />
          <DetailCell label="Email" value={rfq.response_email} mono />
          <DetailCell label="Phone" value={rfq.contact_number} mono />
          <DetailCell label="Delivery location" value={rfq.location} />
          <DetailCell
            label="Quote deadline"
            value={
              rfq.bid_end_date ? (
                <>
                  <span className={styles.mono}>{fmtShortDate(rfq.bid_end_date)}</span>
                  <span style={{ color: "var(--fg-4)", fontWeight: 400, fontSize: 12.5 }}>
                    {" "}
                    · {new Date(rfq.bid_end_date).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              ) : (
                "—"
              )
            }
          />
          {rfq.ra_start_date && (
            <DetailCell
              label="Reverse auction"
              value={
                <>
                  <span className={styles.mono}>{fmtShortDate(rfq.ra_start_date)}</span>
                  <span style={{ color: "var(--fg-4)", fontWeight: 400, fontSize: 12.5 }}>
                    {" → "}
                  </span>
                  <span className={styles.mono}>{fmtShortDate(rfq.ra_end_date)}</span>
                </>
              }
            />
          )}
        </div>
      </div>

      {/* What you're quoting */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <h3>
            <Layers size={14} />
            What you're quoting
          </h3>
          <span className={styles.cardHeadCount}>
            {products.length} product{products.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className={styles.cardSection} style={{ padding: "8px 22px" }}>
          {products.map((p, idx) => (
            <div
              className={styles.previewRow}
              key={p.id}
              style={idx > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
            >
              <div className={styles.previewLeft}>
                <div className={styles.previewIcon}>
                  <Layers size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={styles.previewName}>{p.product_name}</div>
                  {(() => {
                    const parts = [p.size, p.detailedSpec].filter(
                      (s) => s && String(s).trim()
                    );
                    if (parts.length === 0) {
                      return (
                        <div className={`${styles.previewSpec} ${styles.previewSpecMuted}`}>
                          No additional information
                        </div>
                      );
                    }
                    return (
                      <div className={styles.previewSpec} title={parts.join(" · ")}>
                        {parts.join(" · ")}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className={styles.previewRight}>
                <div style={{ textAlign: "right" }}>
                  <div className={styles.previewQtyLbl}>Quantity</div>
                  <div className={`${styles.mono} ${styles.previewQty}`}>
                    {p.qty} {p.unit}
                  </div>
                </div>
                {p.has_tech_eval && (
                  <span className={styles.pill}>
                    <Check size={10} strokeWidth={2.5} />
                    Tech evaluation required
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <h3>
            <FileText size={14} />
            Terms &amp; conditions
          </h3>
          <span className={styles.cardHeadCount}>
            {terms.length} clause{terms.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className={styles.cardSection}>
          {terms.length === 0 ? (
            <div className={styles.termsEmpty}>
              No predefined terms — submit your quote against the buyer's
              additional terms below (if any).
            </div>
          ) : (
            <div className={styles.termsList}>
              {terms.map((t, i) => {
                const text =
                  t.term_content || t.name || t.content?.[0]?.title || "Term";
                return (
                  <div className={styles.termItem} key={t.id || i}>
                    <span className={styles.termNum} />
                    <div className={styles.termText}>{text}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {additionalRaw && additionalRaw.replace(/<[^>]*>/g, "").trim() && (
          <div className={`${styles.cardSection} ${styles.additionalTerms}`}>
            <div className={styles.lbl}>Additional terms</div>
            <div
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: additionalRaw }}
            />
          </div>
        )}
      </div>

      <label
        className={`${styles.check} ${accepted ? styles.checked : ""} ${missedInquiry ? styles.checkDisabled : ""}`}
        onClick={(e) => {
          e.preventDefault();
          if (missedInquiry) return;
          onToggleAccept();
        }}
      >
        <span className={styles.checkBox} />
        <div className={styles.checkBody}>
          <div className={styles.checkTitle}>
            I have read and accept the terms &amp; conditions above.
          </div>
          <div className={styles.checkDesc}>
            {missedInquiry
              ? "The bid window has closed — you can't accept the terms or submit a quote for this inquiry anymore."
              : "By checking this, you confirm that any quote you submit will follow these terms. You can review them again before submitting."}
          </div>
        </div>
      </label>
    </div>
  );
};

const DetailCell = ({ label, value, mono = false }) => (
  <div className={styles.detailCell}>
    <div className={styles.k}>{label}</div>
    <div className={`${styles.v} ${mono ? styles.mono : ""}`}>
      {value || <span style={{ color: "var(--fg-4)", fontWeight: 400 }}>—</span>}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════
   Step — Clarifications (tenders only)

   This step shows whenever a tender has a configured clarification
   window (vendor_clarification_date) or any open clarifications.
   While the window is open OR an open clarification exists, every
   subsequent step (tech eval, pricing, terms, review) is locked.
   ════════════════════════════════════════════════════════════════ */
const StepClarifications = ({
  rfq,
  clarifications,
  loading,
  isWindowActive,
  countdown,
  deadline,
  hasOpen,
  isOwner,
  openClarification,
  canRaise,
  onRaise,
  onOpenDetail,
  currentUserId,
}) => {
  const deadlineText = deadline ? fmtShortDate(deadline, { includeTime: true }) : "";
  const isLocked = isWindowActive || hasOpen;

  // Choose the headline status pill + body copy based on the current state.
  const statusBlock = (() => {
    if (hasOpen) {
      return isOwner
        ? {
            tone: "info",
            title: "Your clarification is awaiting a response",
            body: "The buyer has been notified and will respond here. Quote submission stays locked until this is resolved.",
          }
        : {
            tone: "warn",
            title: "Another vendor's clarification is in progress",
            body: "While the buyer addresses it, no one (including you) can raise a new clarification or submit a quote.",
          };
    }
    if (isWindowActive) {
      return {
        tone: "info",
        title: "Clarification window is open",
        body: "Raise any clarifications you have about the tender. Once the window closes (and any open clarifications are resolved), quote submission will unlock.",
      };
    }
    return {
      tone: "success",
      title: "Clarification window has closed",
      body: "No clarifications need attention. You can continue to the next step and start your quote.",
    };
  })();

  return (
    <div className={styles.stepPane}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Clarifications</div>
          <div className={styles.sectionSub}>
            Tender clarification window — raise questions, see responses, and
            unlock quote submission once everything is resolved.
          </div>
        </div>
        <div className={styles.clarHeadActions}>
          <span className={`${styles.clarStatePill} ${styles[`clarStatePill_${isLocked ? "locked" : "open"}`]}`}>
            {isLocked ? <Lock size={11} strokeWidth={2.4} /> : <CheckCircle2 size={11} strokeWidth={2.4} />}
            {isLocked ? "Quotes locked" : "Quotes unlocked"}
          </span>
        </div>
      </div>

      {/* Countdown + deadline tile */}
      {deadline && (
        <div className={`${styles.clarCountdownCard} ${isWindowActive ? styles.clarCountdownActive : styles.clarCountdownEnded}`}>
          <div className={styles.clarCountdownLeft}>
            <div className={styles.clarCountdownLbl}>
              {isWindowActive ? "Clarification window closes in" : "Clarification window closed"}
            </div>
            {isWindowActive ? (
              <div className={styles.clarCountdownValue}>{countdown}</div>
            ) : (
              <div className={styles.clarCountdownValueEnded}>Quotes opened</div>
            )}
            <div className={styles.clarCountdownDeadline}>
              {isWindowActive ? "Closes" : "Closed"} at <strong>{deadlineText}</strong> IST
            </div>
          </div>
          <div className={`${styles.clarCountdownIcon} ${isWindowActive ? "" : styles.muted}`}>
            <HelpCircle size={28} strokeWidth={1.7} />
          </div>
        </div>
      )}

      {/* Status block */}
      <div className={`${styles.clarStatusBox} ${styles[`clarStatusBox_${statusBlock.tone}`]}`}>
        <AlertTriangle size={14} strokeWidth={2.2} />
        <div>
          <div className={styles.clarStatusTitle}>{statusBlock.title}</div>
          <div className={styles.clarStatusBody}>{statusBlock.body}</div>
        </div>
      </div>

      {/* List + raise button */}
      <div className={styles.clarListHead}>
        <div className={styles.clarListTitle}>
          All clarifications
          <span className={styles.clarListCount}>{clarifications.length}</span>
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
          onClick={onRaise}
          disabled={!canRaise}
          title={
            !isWindowActive
              ? "The clarification window has closed."
              : hasOpen
              ? "Wait for the current clarification to be resolved before raising another."
              : "Raise a new clarification"
          }
        >
          <Plus size={13} strokeWidth={2.4} />
          Raise clarification
        </button>
      </div>

      {loading && clarifications.length === 0 ? (
        <div className={styles.clarEmpty}>Loading clarifications…</div>
      ) : clarifications.length === 0 ? (
        <div className={styles.clarEmpty}>
          <HelpCircle size={20} strokeWidth={1.6} />
          <div className={styles.clarEmptyTitle}>No clarifications yet</div>
          <div className={styles.clarEmptyBody}>
            {canRaise
              ? "Spot something unclear in the tender? Raise a clarification — the buyer's response will be visible here for every invited vendor."
              : isWindowActive
              ? "Wait for the current clarification to be resolved before raising another."
              : "The clarification window has closed — no new clarifications can be raised."}
          </div>
        </div>
      ) : (
        <div className={styles.clarList}>
          {clarifications.map((c, idx) => {
            const mine = c.raised_by === currentUserId || c.created_by === currentUserId;
            const isOpenRow = c.status === "OPEN";
            return (
              <button
                key={c.id || idx}
                type="button"
                className={`${styles.clarRow} ${isOpenRow ? styles.clarRowOpen : ""}`}
                onClick={() => onOpenDetail(c)}
              >
                <div className={styles.clarRowNum}>{String(idx + 1).padStart(2, "0")}</div>
                <div className={styles.clarRowMain}>
                  <div className={styles.clarRowTitle}>
                    {c.subject || c.title || c.question || "Clarification"}
                    {mine && <span className={`${styles.tag} ${styles.tagInfo}`}>Mine</span>}
                  </div>
                  <div className={styles.clarRowMeta}>
                    {c.created_at && <span>Raised {fmtShortDate(c.created_at, { includeTime: true })}</span>}
                    {c.message_count > 0 && (
                      <>
                        <span>·</span>
                        <span>{c.message_count} message{c.message_count === 1 ? "" : "s"}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`${styles.clarRowStatus} ${
                    isOpenRow ? styles.clarRowStatusOpen : styles.clarRowStatusClosed
                  }`}
                >
                  {isOpenRow ? "Open" : "Resolved"}
                </span>
                <ArrowRight size={13} strokeWidth={2} className={styles.clarRowArrow} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Step 2 — Technical evaluation
   ════════════════════════════════════════════════════════════════ */
const Step2TechEval = ({
  evalProducts,
  allProducts,
  techClauses,
  techResponses,
  techLoading,
  evalAnswered,
  evalTotal,
  evalProgress,
  onSetResponse,
  onSetComment,
  onAddFile,
  onRemoveFile,
  chatCounts,
  onOpenClauseChat,
}) => {
  if (techLoading) {
    return (
      <div className={styles.stepPane}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Technical evaluation</div>
            <div className={styles.sectionSub}>Loading clauses…</div>
          </div>
        </div>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    );
  }

  if (!evalProducts.length) {
    return (
      <div className={styles.stepPane}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Technical evaluation</div>
            <div className={styles.sectionSub}>
              No technical evaluation required for this inquiry. Continue to pricing.
            </div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.evalEmpty}>
            Nothing to respond to — all products in this inquiry skip tech evaluation.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepPane}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>
            Product specifications &amp; technical evaluation
          </div>
          <div className={styles.sectionSub}>
            For each product, review what's being asked for and answer all
            evaluation clauses. You'll quote pricing in the next step.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: "100%" }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 500 }}>
              Evaluation progress
            </span>
            <span className={styles.mono} style={{ fontSize: 12, color: "var(--fg)" }}>
              {evalAnswered} of {evalTotal}
            </span>
          </div>
          <div className={styles.bar} style={{ width: "100%" }}>
            <div className={styles.barFill} style={{ width: `${evalProgress}%` }} />
          </div>
        </div>
      </div>

      {evalProducts.map((p, pidx) => {
        const clauses = techClauses[p.id] || [];
        const answered = clauses.filter(
          (c) => techResponses[p.id]?.[c.id]?.response
        ).length;

        return (
          <div className={styles.productCard} key={p.id}>
            {/* Head */}
            <div className={styles.productHead}>
              <div>
                <div className={styles.productName}>
                  <span className={styles.productIdx}>
                    {String(pidx + 1).padStart(2, "0")}
                  </span>
                  {p.product_name}
                </div>
                <div className={styles.productSpec}>
                  {p.detailedSpec || p.product_description || "—"}
                </div>
                <div className={styles.productMetaRow}>
                  {p.datasheet_file && (
                    <a className={styles.fileChip} href={p.datasheet_file} target="_blank" rel="noopener">
                      <Download size={11} />
                      TDS · datasheet
                    </a>
                  )}
                  {p.qap_file && (
                    <a className={styles.fileChip} href={p.qap_file} target="_blank" rel="noopener">
                      <Download size={11} />
                      QAP · quality plan
                    </a>
                  )}
                </div>
              </div>
              <div className={styles.qtyBlock}>
                <div className={styles.qtyLbl}>Quantity required</div>
                <div className={`${styles.qtyVal} ${styles.mono}`}>{p.qty}</div>
                <div className={styles.qtyUnit}>{p.unit}</div>
              </div>
            </div>

            {/* Spec details */}
            {p.size && (
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Size</div>
                <div className={styles.kvV}>{p.size}</div>
              </div>
            )}
            {p.detailedSpec && (
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Specification</div>
                <div className={styles.kvV}>{p.detailedSpec}</div>
              </div>
            )}
            {p.buyer_comment && (
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Buyer comment</div>
                <div className={styles.kvV} style={{ fontStyle: "italic", color: "var(--fg-2)" }}>
                  {p.buyer_comment}
                </div>
              </div>
            )}

            {/* Clauses */}
            <div className={styles.cardHead} style={{ borderTop: "1px solid var(--border)" }}>
              <h3>
                <ClipboardCheck size={14} />
                Technical evaluation
              </h3>
              <span className={styles.cardHeadCount}>
                {answered} of {clauses.length} answered
              </span>
            </div>

            {clauses.length === 0 ? (
              <div className={styles.evalEmpty}>No clauses defined.</div>
            ) : (
              clauses.map((c, cidx) => {
                const resp = techResponses[p.id]?.[c.id] || {};
                const isAnswered = !!resp.response;
                return (
                  <div
                    key={c.id}
                    className={`${styles.clause} ${isAnswered ? styles.clauseAnswered : ""}`}
                  >
                    <span className={styles.clauseNum}>
                      {String(cidx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className={styles.clauseText}>
                        {c.clause_text || c.text || c.title || "Clause"}
                      </div>

                      {c.file_url && (
                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
                            Reference
                          </span>
                          <a className={styles.fileChip} href={c.file_url} target="_blank" rel="noopener">
                            <Download size={11} />
                            {(c.file_url || "").split("/").pop()?.slice(0, 28) || "file"}
                          </a>
                        </div>
                      )}

                      <div className={styles.clauseActions}>
                        <button
                          type="button"
                          className={`${styles.radioChip} ${
                            resp.response === "agree" ? styles.agree : ""
                          }`}
                          onClick={() =>
                            onSetResponse(p.id, c.id, resp.response === "agree" ? null : "agree")
                          }
                        >
                          <span className={styles.radioInd} />
                          I agree
                        </button>
                        <button
                          type="button"
                          className={`${styles.radioChip} ${
                            resp.response === "disagree" ? styles.disagree : ""
                          }`}
                          onClick={() =>
                            onSetResponse(
                              p.id,
                              c.id,
                              resp.response === "disagree" ? null : "disagree"
                            )
                          }
                        >
                          <span className={styles.radioInd} />
                          I don't agree
                        </button>

                        <div style={{ height: 24, width: 1, marginLeft: 4, background: "var(--border)" }} />

                        <label className={styles.uploadMini}>
                          <Download size={12} style={{ transform: "rotate(180deg)" }} />
                          Attach cross-reference doc
                          <input
                            type="file"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onAddFile(p.id, c.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>

                        {onOpenClauseChat && (
                          <button
                            type="button"
                            className={styles.chatClauseBtn}
                            onClick={() => onOpenClauseChat(p, c, cidx)}
                            style={{ marginLeft: "auto" }}
                          >
                            <MessageCircle size={12} strokeWidth={2.2} />
                            {chatCounts?.[`${p.id}.${c.id}`] > 0
                              ? `Chat (${chatCounts[`${p.id}.${c.id}`]})`
                              : "Ask buyer"}
                          </button>
                        )}
                      </div>

                      {(resp.files || []).length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                          {resp.files.map((u) => (
                            <div className={styles.uploadedFile} key={u}>
                              <Download size={12} style={{ color: "var(--fg-3)" }} />
                              <span className={styles.name}>{u.split("/").pop()}</span>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => onRemoveFile(p.id, c.id, u)}
                                aria-label="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {resp.response && (
                        <div className={styles.clauseExtra}>
                          <div>
                            <label className={styles.label}>
                              Explanation / deviation
                              {resp.response === "disagree" && (
                                <span className={styles.labelMeta} style={{ color: "var(--danger)" }}>
                                  required
                                </span>
                              )}
                            </label>
                            <textarea
                              className={styles.textarea}
                              value={resp.comment || ""}
                              onChange={(e) =>
                                onSetComment(p.id, c.id, e.target.value)
                              }
                              placeholder={
                                resp.response === "agree"
                                  ? "Optional — add any clarifying notes."
                                  : "Briefly describe your deviation or alternative compliance approach."
                              }
                              maxLength={500}
                              style={{ minHeight: 64 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   QuoteSummary — shared sticky-right summary card used by Pricing,
   Commercial terms and Review steps. Reads from the same `totals`
   the pricing engine returns, so global-charge / payment / GSTIN
   changes recalculate in real time across all three steps.
   ════════════════════════════════════════════════════════════════ */
const QuoteSummary = ({
  rfq,
  totals,
  pricingLoading,
  paymentTerms,
  canSubmit,
  variant = "pricing", // "pricing" | "terms" | "review"
}) => {
  const titleByVariant = {
    pricing: "Quote summary",
    terms: "Quote summary",
    review: "Final total",
  };
  const activeTermCount = paymentTerms.filter((t) => t.action !== "delete").length;

  return (
    <div className={styles.heroSummary}>
      <div className={styles.heroInner}>
        <div className={styles.heroHead}>
          <div className={styles.heroTitle}>{titleByVariant[variant]}</div>
          <div className={styles.heroRfq}>#{rfq.rfq_no}</div>
        </div>

        {pricingLoading ? (
          <div>
            <div className={styles.heroGrandLbl}>Grand total</div>
            <div className={styles.calculatingState}>
              <span className={styles.calcDotLg} />
              Calculating…
            </div>
            <div className={styles.heroGrandMeta}>
              Updating from the pricing engine
            </div>
          </div>
        ) : totals.grand > 0 ? (
          <div>
            <div className={styles.heroGrandLbl}>Grand total</div>
            <div className={styles.heroGrand}>
              <span className={styles.heroGrandCur}>₹</span>
              <span>{fmtINR(totals.grand)}</span>
            </div>
            <div className={styles.heroGrandMeta}>
              Inclusive of GST, global &amp; line charges · INR
            </div>

            <div className={styles.breakdownBar}>
              <div
                className={styles.bdSubtotal}
                style={{ width: `${totals.grand ? (totals.subtotal / totals.grand) * 100 : 0}%` }}
              />
              <div
                className={styles.bdGst}
                style={{ width: `${totals.grand ? (totals.gst / totals.grand) * 100 : 0}%` }}
              />
              <div
                className={styles.bdCharges}
                style={{
                  width: `${
                    totals.grand
                      ? (totals.extraCharges.reduce((s, c) => s + c.amount, 0) /
                          totals.grand) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className={styles.breakdownLegend}>
              <div className={styles.breakdownRow}>
                <span className={styles.lbl}>
                  <span className={`${styles.swatch} ${styles.bdSubtotal}`} /> Subtotal
                </span>
                <span className={styles.val}>₹ {fmtINR(totals.subtotal)}</span>
              </div>
              <div className={styles.breakdownRow}>
                <span className={styles.lbl}>
                  <span className={`${styles.swatch} ${styles.bdGst}`} /> GST
                </span>
                <span className={styles.val}>₹ {fmtINR(totals.gst)}</span>
              </div>
              {totals.extraCharges.map((ec) => (
                <React.Fragment key={ec.label}>
                  <div className={styles.breakdownRow}>
                    <span className={styles.lbl}>
                      <span className={`${styles.swatch} ${styles.bdCharges}`} /> {ec.label}
                    </span>
                    <span className={styles.val}>₹ {fmtINR(ec.amount)}</span>
                  </div>
                  {ec.tax > 0 && (
                    <div className={`${styles.breakdownRow} ${styles.breakdownSub}`}>
                      <span className={styles.lbl}>
                        <span className={styles.subBranch} /> GST on {ec.label.toLowerCase()}
                      </span>
                      <span className={styles.val}>₹ {fmtINR(ec.tax)}</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
              {(totals.globalCharges || []).length > 0 && (
                <>
                  <div className={styles.breakdownDivider}>On grand total</div>
                  {totals.globalCharges.map((gc) => (
                    <div className={styles.breakdownRow} key={`g-${gc.label}`}>
                      <span className={styles.lbl}>
                        <span className={`${styles.swatch} ${styles.bdGlobal}`} /> {gc.label}
                      </span>
                      <span className={styles.val}>₹ {fmtINR(gc.amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.emptyHero}>
            <div className={styles.ic}>
              <DollarSign size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.ttl}>Awaiting your prices</div>
            <div className={styles.sub}>
              Your grand total &amp; tax breakdown will appear here as you
              price each line item.
            </div>
          </div>
        )}
      </div>

      <div className={styles.heroFoot}>
        <div className={styles.heroFootRow}>
          <span className={styles.k}>Payment</span>
          <span className={styles.v}>
            {activeTermCount} term{activeTermCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className={styles.heroFootRow}>
          <span className={styles.k}>Deadline</span>
          <span className={styles.v}>{fmtShortDate(rfq.bid_end_date)}</span>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span className={`${styles.completionPill} ${canSubmit ? styles.ready : ""}`}>
            <span className={styles.completionPulse} />
            {canSubmit ? "Ready to submit" : "In progress"}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-4)",
              fontFamily: "Geist Mono, monospace",
            }}
          >
            v1 · draft
          </span>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Step 3 — Pricing & submit
   ════════════════════════════════════════════════════════════════ */
const Step3Pricing = ({
  rfq,
  products,
  totals,
  pricingLoading,
  paymentTerms,
  paymentTotal,
  globalComment,
  vendorGSTIN,
  globalCharges,
  onChangeGSTIN,
  onChangeGlobalComment,
  onUpdateProduct,
  onOpenCharges,
  onOpenGlobalCharges,
  onAddPaymentTerm,
  onUpdatePaymentTerm,
  onRemovePaymentTerm,
  onOpenHistory,
  canSubmit,
  token,
  editStatus,
  isReadOnly,
  negotiationFields,
  showTechEvalRestrictions,
  isBidExpired,
  activeNegotiationProductIds,
  negotiationQuoteSubmitted,
}) => {
  const hasGlobalCharges = (globalCharges || []).some(
    (c) => c.name && c.name.trim() && parseFloat(c.amount) > 0
  );
  const activeGlobalCount = (globalCharges || []).filter(
    (c) => c.name && c.name.trim()
  ).length;
  return (
    <div className={styles.stepPane}>
      {/* Read-only / missed banners are hoisted to the top of the wizard.
          Only render the inline banner for non-warn cases (success, info)
          so we don't duplicate the same red strip in two places. */}
      {editStatus?.title && editStatus.kind !== "warn" && (
        <StatusBanner status={editStatus} />
      )}
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Pricing &amp; commercial terms</div>
          <div className={styles.sectionSub}>
            {isReadOnly
              ? "Your quote is in read-only mode — review the values you submitted."
              : "Enter your prices, add any per-line or global charges, and submit your quote."}
          </div>
          <div className={styles.miniStats}>
            <div className={styles.miniStat}>
              <div className={styles.lbl}>Items to price</div>
              <div className={styles.val}>{products.length}</div>
            </div>
            {rfq.vendor_clarification_date && (
              <>
                <div style={{ height: 28, width: 1, background: "var(--border)" }} />
                <div className={styles.miniStat}>
                  <div className={styles.lbl}>Clarification</div>
                  <div className={styles.val}>{fmtShortDate(rfq.vendor_clarification_date)}</div>
                </div>
              </>
            )}
            {rfq.ra_start_date && (
              <>
                <div style={{ height: 28, width: 1, background: "var(--border)" }} />
                <div className={styles.miniStat}>
                  <div className={styles.lbl}>Auction window</div>
                  <div className={styles.val}>
                    {fmtShortDate(rfq.ra_start_date)} → {fmtShortDate(rfq.ra_end_date)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.cols}>
        {/* LEFT — line items + commercial */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>
                Line items
              </h3>
              <span className={styles.pill}>
                {products.length} product{products.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {products.map((p, idx) => {
            const finalizedLocked =
              p.finalization_status === "Another vendor is finalized" ||
              (p.finalization_status === "You are finalized");
            // Tech-eval restriction (legacy parity): evaluation exists but the
            // buyer hasn't accepted it — the line cannot be priced.
            const techLocked =
              showTechEvalRestrictions && p.has_tech_eval && !p.tech_eval_accepted;
            // Once-per-round rule: already re-quoted in the latest round.
            const negSubmitted = !!(negotiationQuoteSubmitted || {})[p.id];
            // Post-expiry, lines without an active negotiation round are frozen.
            const bidExpiredForProduct =
              isBidExpired && !(activeNegotiationProductIds || new Set()).has(p.id);
            const locked =
              finalizedLocked || techLocked || negSubmitted || bidExpiredForProduct || isReadOnly;
            // Engine-computed total synced into p.total_price via usePreviewTotals
            const lineTotal = Number(p.total_price) || 0;
            const chargesTotal = (p.other_charges || []).reduce((s, c) => {
              if (!c.name) return s;
              const base = (parseFloat(p.qty) || 0) * (parseFloat(p.unit_price) || 0);
              const amt =
                c.amount_mode === "percentage"
                  ? (base * (parseFloat(c.amount) || 0)) / 100
                  : parseFloat(c.amount) || 0;
              return s + amt;
            }, 0);
            const hasCharges = (p.other_charges || []).some((c) => c.name && parseFloat(c.amount) > 0);
            const negFields = (negotiationFields && negotiationFields[p.id]) || [];
            const negByName = (name) =>
              negFields.find((f) => (f.name || "").toLowerCase() === name.toLowerCase());
            const isBeingNegotiated = negFields.length > 0;
            // Post-expiry, only fields the buyer actually negotiated unlock
            // (legacy parity). Amount inputs need an AMOUNT target; tax inputs
            // need a TAX demand — the two are independent.
            const isFieldNegotiable = (...names) => {
              if (!isBidExpired) return true;
              if (locked) return false;
              return negFields.some(
                (f) => names.includes(f.name) && f.targetPrice != null && f.targetPrice !== ""
              );
            };
            const isFieldTaxNegotiable = (...names) => {
              if (!isBidExpired) return true;
              if (locked) return false;
              return negFields.some((f) => names.includes(f.name) && f.taxDemand);
            };

            return (
              <div className={`${styles.lineCard} ${locked ? styles.locked : ""}`} key={p.id}>
                <div className={styles.lineHead}>
                  <div className={styles.lineHeadLeft}>
                    <div className={styles.numChip}>{String(idx + 1).padStart(2, "0")}</div>
                    <div>
                      <div className={styles.lineTitle}>{p.product_name}</div>
                      <div className={styles.lineDesc}>
                        {p.detailedSpec || p.product_description || "—"}
                      </div>
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {hasCharges && (
                          <span className={styles.pill}>
                            <Check size={10} strokeWidth={2.5} />
                            {(p.other_charges || []).filter((c) => c.name).length} extra charge
                            {((p.other_charges || []).filter((c) => c.name).length || 0) > 1 ? "s" : ""}
                          </span>
                        )}
                        {(parseFloat(p.unit_price) || 0) > 0 ? (
                          <span className={`${styles.pill} ${styles.success}`}>
                            <span className={styles.pdot} style={{ background: "var(--success)" }} />
                            Priced
                          </span>
                        ) : (
                          <span className={`${styles.pill} ${styles.warn}`}>Awaiting price</span>
                        )}
                        {p.has_tech_eval && (
                          <span className={`${styles.pill} ${styles.info}`}>Tech eval</span>
                        )}
                        {isBeingNegotiated && (
                          <span className={`${styles.pill} ${styles.warn}`}>
                            <span className={styles.pdot} style={{ background: "var(--warn)" }} />
                            Negotiation in progress
                          </span>
                        )}
                        {p.lowest_quotation && (
                          <span className={`${styles.pill}`}>
                            Lowest ₹{fmtINR(p.lowest_quotation.total_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.qtyBlockRight}>
                    <div className={styles.lbl}>Qty required</div>
                    <div className={styles.val}>{p.qty}</div>
                    <div className={styles.unit}>{p.unit}</div>
                  </div>
                </div>

                {/* Pricing */}
                <div className={styles.lineSection}>
                  <div className={styles.lineSectionLabel}>
                    <FileText size={11} />
                    Pricing
                  </div>
                  <div className={styles.priceGrid}>
                    <div>
                      <label className={styles.label}>
                        Unit price <span className={styles.req}>*</span>
                      </label>
                      <div className={styles.inputGroup}>
                        <div className={styles.prefix}>₹</div>
                        <input
                          type="number"
                          className={`${styles.input} ${styles.inputNum}`}
                          value={p.unit_price ?? ""}
                          onChange={(e) =>
                            onUpdateProduct(idx, { unit_price: e.target.value })
                          }
                          placeholder="0.00"
                          min={0}
                          step="0.01"
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={locked || !isFieldNegotiable("base_price", "unit_price", "price")}
                        />
                      </div>
                      {(() => {
                        const nf = negByName("unit_price") || negByName("base_price") || negByName("price");
                        if (!nf?.targetPrice) return null;
                        return (
                          <div className={styles.negHint}>
                            <span className={styles.negHintDot} />
                            Buyer's ask: <span className={styles.mono}>₹{fmtINR(nf.targetPrice)}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className={styles.label}>Tax (GST)</label>
                      <div className={styles.taxField}>
                        <input
                          type="number"
                          className={styles.taxInput}
                          value={p.tax ?? ""}
                          onChange={(e) =>
                            onUpdateProduct(idx, { tax: e.target.value })
                          }
                          placeholder="0"
                          min={0}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={locked || !isFieldTaxNegotiable("base_price", "unit_price", "price")}
                        />
                        <div className={styles.modeSeg} role="group" aria-label="Tax mode">
                          <button
                            type="button"
                            className={p.tax_mode === "percentage" ? styles.modeSegActive : ""}
                            onClick={() => onUpdateProduct(idx, { tax_mode: "percentage" })}
                            disabled={locked || !isFieldTaxNegotiable("base_price", "unit_price", "price")}
                            aria-pressed={p.tax_mode === "percentage"}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={p.tax_mode === "absolute" ? styles.modeSegActive : ""}
                            onClick={() => onUpdateProduct(idx, { tax_mode: "absolute" })}
                            disabled={locked || !isFieldTaxNegotiable("base_price", "unit_price", "price")}
                            aria-pressed={p.tax_mode === "absolute"}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={styles.label}>Other charges</label>
                      <button
                        type="button"
                        className={`${styles.chargesTrigger} ${
                          hasCharges ? styles.chargesActive : ""
                        }`}
                        onClick={() => onOpenCharges(idx)}
                        disabled={locked}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {hasCharges ? (
                            <Check size={12} strokeWidth={2.4} />
                          ) : (
                            <Plus size={12} />
                          )}
                          <span>
                            {hasCharges
                              ? `${(p.other_charges || []).filter((c) => c.name).length} charge${
                                  (p.other_charges || []).filter((c) => c.name).length > 1 ? "s" : ""
                                } added`
                              : "Add freight, insurance…"}
                          </span>
                        </span>
                        {hasCharges && (
                          <span className={styles.chargesAmt}>₹ {fmtINR(chargesTotal)}</span>
                        )}
                      </button>
                    </div>

                    <div>
                      <label className={styles.label}>
                        Delivery <span className={styles.req}>*</span>
                      </label>
                      <div className={styles.inputGroup}>
                        <input
                          type="number"
                          className={`${styles.input} ${styles.inputNum}`}
                          value={p.delivery_period ?? ""}
                          onChange={(e) =>
                            onUpdateProduct(idx, { delivery_period: e.target.value })
                          }
                          placeholder="7"
                          min={1}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={locked || !isFieldNegotiable("delivery_period")}
                        />
                        <div
                          className={styles.suffix}
                          style={{ fontFamily: "inherit", fontSize: 12 }}
                        >
                          days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className={styles.lineSection}>
                  <div className={styles.lineSectionLabel}>
                    <MessageSquare size={11} />
                    Notes &amp; attachments
                  </div>
                  <div className={styles.notesGrid}>
                    <div>
                      <label className={styles.label}>
                        Comment to buyer <span className={styles.labelMeta}>optional</span>
                      </label>
                      <textarea
                        className={styles.textarea}
                        value={p.comment || ""}
                        onChange={(e) =>
                          onUpdateProduct(idx, { comment: e.target.value })
                        }
                        placeholder="Add any product-specific notes the buyer should consider."
                        maxLength={300}
                        style={{ minHeight: 64 }}
                        disabled={locked || !isFieldNegotiable("comment")}
                      />
                    </div>
                    <div className={styles.spaceY3}>
                      <button
                        type="button"
                        className={styles.btn + " " + styles.btnSecondary + " " + styles.btnSm}
                        onClick={() => onOpenHistory(p.product_id)}
                        style={{ width: "100%", justifyContent: "center" }}
                        disabled={locked}
                      >
                        <History size={13} />
                        View past quotes
                      </button>
                      <label className={styles.uploadMini} style={{ width: "100%", justifyContent: "center", padding: 9 }}>
                        <Download size={12} style={{ transform: "rotate(180deg)" }} />
                        Attach supporting documents
                        <input
                          type="file"
                          multiple
                          disabled={locked || !isFieldNegotiable("documents")}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            const urls = [];
                            for (const f of files) {
                              try {
                                const res = await handleUploadFile(f, token);
                                const url = res?.data?.[0]?.file_path;
                                if (url) urls.push(url);
                              } catch (_) {}
                            }
                            if (urls.length) {
                              onUpdateProduct(idx, {
                                document_files: [...(p.document_files || []), ...urls],
                              });
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {(p.document_files || []).map((u) => (
                        <div className={styles.uploadedFile} key={u}>
                          <Download size={12} style={{ color: "var(--fg-3)" }} />
                          <span className={styles.name}>{u.split("/").pop()}</span>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            disabled={locked || !isFieldNegotiable("documents")}
                            onClick={() =>
                              onUpdateProduct(idx, {
                                document_files: (p.document_files || []).filter((f) => f !== u),
                              })
                            }
                            aria-label="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Foot */}
                <div className={styles.lineFoot}>
                  <div className={styles.lineFootBadges}>
                    <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                      <span className={styles.mono}>{p.qty}</span> ×{" "}
                      <span className={styles.mono}>
                        {p.unit_price ? `₹${fmtINR(p.unit_price)}` : "—"}
                      </span>
                      {p.tax > 0 && (
                        <>
                          {" + "}
                          <span className={styles.mono}>
                            {p.tax_mode === "percentage" ? `${p.tax}% GST` : `₹${p.tax} tax`}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className={styles.lineFootTotal}>
                    <span className={styles.lbl}>Line total</span>
                    <span className={`${styles.mono} ${styles.val} ${lineTotal === 0 ? styles.zero : ""}`}>
                      ₹ {fmtINR(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        </div>

        {/* RIGHT — shared quote summary */}
        <div className={styles.stickySection}>
          <QuoteSummary
            rfq={rfq}
            totals={totals}
            pricingLoading={pricingLoading}
            paymentTerms={paymentTerms}
            canSubmit={canSubmit}
            variant="pricing"
          />
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Step 4 — Commercial terms (GSTIN, global comment, global charges,
   payment terms). Extracted from Step3Pricing.
   ════════════════════════════════════════════════════════════════ */
const Step4CommercialTerms = ({
  rfq,
  totals,
  pricingLoading,
  paymentTerms,
  paymentTotal,
  globalComment,
  vendorGSTIN,
  globalCharges,
  onChangeGSTIN,
  onChangeGlobalComment,
  onOpenGlobalCharges,
  onAddPaymentTerm,
  onUpdatePaymentTerm,
  onRemovePaymentTerm,
  canSubmit,
  isReadOnly,
}) => {
  const hasGlobalCharges = (globalCharges || []).some(
    (c) => c.name && c.name.trim() && parseFloat(c.amount) > 0
  );
  const activeGlobalCount = (globalCharges || []).filter(
    (c) => c.name && c.name.trim()
  ).length;
  const gstinClean = String(vendorGSTIN || "").trim().toUpperCase();
  const gstinValid = isValidGstin(gstinClean);

  return (
    <div className={styles.stepPane}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Commercial terms</div>
          <div className={styles.sectionSub}>
            GSTIN, payment schedule, global charges and any quote-wide notes.
            These apply to the entire quote, not individual line items.
          </div>
        </div>
      </div>

      <div className={styles.cols}>
        {/* LEFT — commercial form */}
        <div>
        <div className={styles.commercialCard}>
        <div className={styles.cardSection}>
          <label className={styles.label}>
            GSTIN <span className={styles.labelMeta}>optional</span>
          </label>
          <input
            className={`${styles.input} ${styles.mono}`}
            value={vendorGSTIN}
            onChange={(e) => onChangeGSTIN(e.target.value)}
            placeholder="29ABCDE1234F1Z5"
            maxLength={15}
            style={{ maxWidth: 280 }}
            disabled={isReadOnly}
          />
          <div style={{ fontSize: 11.5, color: gstinValid ? "var(--fg-4)" : "#b91c1c", marginTop: 6 }}>
            {gstinValid ? "Used to issue invoices for the delivery location." : "GSTIN format looks off — should be 15 characters (e.g. 29ABCDE1234F1Z5)."}
          </div>
        </div>

        <div className={styles.cardSection}>
          <label className={styles.label}>
            Global comment <span className={styles.labelMeta}>visible to buyer</span>
          </label>
          <textarea
            className={styles.textarea}
            value={globalComment}
            onChange={(e) => onChangeGlobalComment(e.target.value)}
            placeholder="Any quote-wide notes — packaging, batching, conditions, etc."
            maxLength={500}
            disabled={isReadOnly}
          />
        </div>

        <div className={styles.cardSection}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
            <div>
              <label className={styles.label} style={{ marginBottom: 2 }}>
                Global charges <span className={styles.labelMeta}>applied on grand total</span>
              </label>
              <div style={{ fontSize: 11.5, color: "var(--fg-4)", lineHeight: 1.45 }}>
                Charges that apply across the entire PO value — e.g. shipping
                insurance, handling, vendor levies. Per-line charges live on each
                product.
              </div>
            </div>
            <button
              type="button"
              className={`${styles.chargesTrigger} ${hasGlobalCharges ? styles.chargesActive : ""}`}
              onClick={onOpenGlobalCharges}
              disabled={isReadOnly}
              style={{ maxWidth: 280, flexShrink: 0 }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {hasGlobalCharges ? (
                  <Check size={12} strokeWidth={2.4} />
                ) : (
                  <Plus size={12} />
                )}
                <span>
                  {activeGlobalCount === 0
                    ? "Add global charge"
                    : `${activeGlobalCount} global charge${activeGlobalCount > 1 ? "s" : ""}`}
                </span>
              </span>
              {hasGlobalCharges && totals?.globalChargesTotal > 0 && (
                <span className={styles.chargesAmt}>₹ {fmtINR(totals.globalChargesTotal)}</span>
              )}
            </button>
          </div>
        </div>

        <div className={styles.cardSection}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <label className={styles.label} style={{ marginBottom: 0 }}>
              Payment terms <span className={styles.req}>*</span>
            </label>
            <div className={styles.totHint} style={{ marginTop: 0 }}>
              <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                Must sum to 100% · currently
              </span>
              <span
                className={`${styles.totNum} ${
                  paymentTotal === 100 ? styles.totOk : styles.totErr
                }`}
                style={{ marginLeft: 6 }}
              >
                {paymentTotal}%
              </span>
            </div>
          </div>

          <div className={styles.payList}>
            {paymentTerms.map((t, i) => {
              const isDeleted = t.action === "delete";
              return (
                <div
                  key={i}
                  className={`${styles.payRow} ${isDeleted ? styles.deleted : ""}`}
                >
                  <div className={styles.payIdx}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <select
                    className={styles.select}
                    value={t.type || "advance"}
                    onChange={(e) => onUpdatePaymentTerm(i, { type: e.target.value })}
                    disabled={isDeleted || isReadOnly}
                  >
                    {PAY_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className={styles.inputGroup}>
                    <input
                      className={`${styles.input} ${styles.inputNum}`}
                      type="number"
                      min={0}
                      max={100}
                      value={t.value ?? ""}
                      onChange={(e) =>
                        onUpdatePaymentTerm(i, { value: Number(e.target.value) })
                      }
                      disabled={isDeleted || isReadOnly}
                      placeholder="0"
                    />
                    <div className={styles.suffix} style={{ padding: "0 9px" }}>%</div>
                  </div>
                  {t.type === "credit" ? (
                    <div className={styles.inputGroup}>
                      <input
                        className={`${styles.input} ${styles.inputNum}`}
                        type="number"
                        value={t.days ?? ""}
                        onChange={(e) =>
                          onUpdatePaymentTerm(i, { days: Number(e.target.value) })
                        }
                        disabled={isDeleted || isReadOnly}
                        placeholder="30"
                      />
                      <div className={styles.suffix} style={{ fontFamily: "inherit", fontSize: 12 }}>
                        days
                      </div>
                    </div>
                  ) : (
                    <input
                      className={styles.input}
                      value={t.comment ?? ""}
                      onChange={(e) =>
                        onUpdatePaymentTerm(i, { comment: e.target.value })
                      }
                      placeholder="Note"
                      disabled={isDeleted || isReadOnly}
                    />
                  )}
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onRemovePaymentTerm(i)}
                    disabled={(isDeleted && paymentTerms.length === 1) || isReadOnly}
                    aria-label="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
            {!isReadOnly && (
              <button
                type="button"
                className={styles.payAdd}
                onClick={onAddPaymentTerm}
              >
                <Plus size={13} />
                Add another term
              </button>
            )}
          </div>
        </div>
      </div>
        </div>

        {/* RIGHT — shared quote summary */}
        <div className={styles.stickySection}>
          <QuoteSummary
            rfq={rfq}
            totals={totals}
            pricingLoading={pricingLoading}
            paymentTerms={paymentTerms}
            canSubmit={canSubmit}
            variant="terms"
          />
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Step 5 — Review &amp; submit. Read-only summary of everything the
   vendor entered, with soft warnings for items they may want to
   double-check (zero tax, missing GSTIN, no global comment, etc.).
   ════════════════════════════════════════════════════════════════ */
const Step5Review = ({
  rfq,
  products,
  totals,
  pricingLoading,
  vendorGSTIN,
  globalComment,
  globalCharges,
  paymentTerms,
  warnings,
  canSubmit,
}) => {
  const priced = products.filter((p) => (parseFloat(p.unit_price) || 0) > 0);
  const skipped = products.filter((p) => !((parseFloat(p.unit_price) || 0) > 0));
  const activeGlobalCharges = (globalCharges || []).filter(
    (c) => c.name && c.name.trim() && parseFloat(c.amount) > 0
  );
  const activePaymentTerms = paymentTerms.filter((t) => t.action !== "delete");

  return (
    <div className={styles.stepPane}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Review &amp; submit</div>
          <div className={styles.sectionSub}>
            Verify every number below before you confirm. After submission, edits
            will notify that buyer.
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className={styles.reviewWarnings}>
          {warnings.map((w, i) => (
            <div
              key={i}
              className={`${styles.reviewWarning} ${w.kind === "warn" ? styles.reviewWarningWarn : styles.reviewWarningInfo}`}
            >
              <AlertTriangle size={14} strokeWidth={2.2} />
              <div>
                <div className={styles.reviewWarningTitle}>{w.title}</div>
                <div className={styles.reviewWarningDetail}>{w.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.cols}>
        {/* LEFT — read-only summary of every section */}
        <div>
          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHead}>
              <h3>
                <Layers size={14} strokeWidth={2} />
                Line items
              </h3>
              <span className={styles.reviewHeadMeta}>
                {priced.length} priced{skipped.length > 0 ? ` · ${skipped.length} skipped` : ""}
              </span>
            </div>
            <div className={styles.reviewCardBody}>
              {products.map((p, idx) => {
                const qty = Number(p.qty) || 0;
                const unit = parseFloat(p.unit_price) || 0;
                // Prefer the engine-computed total (includes per-line charges + tax)
                // and fall back to qty × unit only if it hasn't synced yet.
                const lineTotal = Number(p.total_price) > 0 ? Number(p.total_price) : unit * qty;
                const chargesCount = (p.other_charges || p.charges || []).filter((c) => c.name).length;
                const isSkipped = !(unit > 0);
                return (
                  <div key={p.id} className={`${styles.reviewLine} ${isSkipped ? styles.reviewLineSkipped : ""}`}>
                    <div className={styles.reviewLineNum}>{String(idx + 1).padStart(2, "0")}</div>
                    <div className={styles.reviewLineMain}>
                      <div className={styles.reviewLineName}>{p.product_name || p.name}</div>
                      {isSkipped ? (
                        <div className={styles.reviewLineDesc}>Not priced — will be marked as regret for this line</div>
                      ) : (
                        <div className={styles.reviewLineMath}>
                          {qty} {p.unit || ""} × ₹ {fmtINR(unit)}
                          {p.tax > 0 ? ` + ${p.tax}% tax` : ""}
                          {p.delivery_period ? ` · ${p.delivery_period}d delivery` : ""}
                          {chargesCount > 0 ? ` · ${chargesCount} extra charge${chargesCount > 1 ? "s" : ""}` : ""}
                        </div>
                      )}
                    </div>
                    <div className={styles.reviewLineRight}>
                      {isSkipped ? <span className={styles.reviewSkippedPill}>Skipped</span> : `₹ ${fmtINR(lineTotal)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHead}>
              <h3>
                <Receipt size={14} strokeWidth={2} />
                Commercial terms
              </h3>
            </div>
            <div className={styles.reviewCardBody}>
              <div className={styles.reviewKv}>
                <span className={styles.reviewKvKey}>GSTIN</span>
                <span className={`${styles.reviewKvVal} ${styles.mono}`}>
                  {vendorGSTIN ? vendorGSTIN : <span className={styles.reviewKvMuted}>— not provided —</span>}
                </span>
              </div>
              <div className={styles.reviewKv}>
                <span className={styles.reviewKvKey}>Global comment</span>
                <span className={styles.reviewKvVal}>
                  {globalComment ? globalComment : <span className={styles.reviewKvMuted}>— none —</span>}
                </span>
              </div>
              <div className={styles.reviewKv}>
                <span className={styles.reviewKvKey}>Global charges</span>
                <span className={styles.reviewKvVal}>
                  {activeGlobalCharges.length === 0 ? (
                    <span className={styles.reviewKvMuted}>— none —</span>
                  ) : (
                    <div className={styles.reviewChargeList}>
                      {activeGlobalCharges.map((c, i) => (
                        <div key={i} className={styles.reviewChargeRow}>
                          <span>{c.name}</span>
                          <span className={styles.mono}>₹ {fmtINR(c.amount)}{c.tax ? ` · ${c.tax}% tax` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.reviewCard}>
            <div className={styles.reviewCardHead}>
              <h3>
                <CreditCard size={14} strokeWidth={2} />
                Payment schedule
              </h3>
              <span className={styles.reviewHeadMeta}>{activePaymentTerms.length} term{activePaymentTerms.length === 1 ? "" : "s"}</span>
            </div>
            <div className={styles.reviewCardBody}>
              {activePaymentTerms.map((t, i) => (
                <div key={i} className={styles.reviewLine}>
                  <div className={styles.reviewLineNum}>{String(i + 1).padStart(2, "0")}</div>
                  <div className={styles.reviewLineMain}>
                    <div className={styles.reviewLineName}>
                      {PAY_TYPE_OPTIONS.find((o) => o.value === t.type)?.label || t.type}
                    </div>
                    <div className={styles.reviewLineDesc}>
                      {t.type === "credit"
                        ? `Net ${t.days || 0} days from invoice`
                        : (t.comment || "—")}
                    </div>
                  </div>
                  <div className={styles.reviewLineRight}>{t.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — shared quote summary (same as Pricing &amp; Commercial steps) */}
        <div className={styles.stickySection}>
          <QuoteSummary
            rfq={rfq}
            totals={totals}
            pricingLoading={pricingLoading}
            paymentTerms={paymentTerms}
            canSubmit={canSubmit}
            variant="review"
          />
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Action bar
   ════════════════════════════════════════════════════════════════ */
const ActionBar = ({
  currentStep,
  currentStepId,
  totalSteps,
  isLastStep,
  canContinueStep1,
  canContinueStep2,
  canContinueStep3,
  canContinueStep4,
  canSubmit,
  evalAnswered,
  evalTotal,
  totals,
  submitting,
  onPrev,
  onNext,
  onSubmit,
  onRegret,
  alreadyQuoted,
  isReadOnly,
  missedInquiry,
  clarBlocksQuote,
}) => {
  const stepNum = currentStep + 1;

  const helper = (() => {
    if (missedInquiry) {
      return "The bid window has closed — there's nothing more to do on this inquiry.";
    }
    if (isReadOnly && (currentStepId === "pricing" || currentStepId === "terms" || currentStepId === "review")) {
      return "Read-only. You can review your quote but no further changes can be submitted.";
    }
    if (currentStepId === "overview") return "Acknowledge the terms above to continue.";
    if (currentStepId === "clarifications") {
      return "Resolve all clarifications and wait for the window to close before continuing to the next step.";
    }
    if (currentStepId === "eval") {
      return evalTotal === 0
        ? "No clauses — continue when ready."
        : `Answer ${Math.max(0, evalTotal - evalAnswered)} remaining clause(s) to continue.`;
    }
    if (currentStepId === "pricing") return "Enter prices for the items you can quote, then continue.";
    if (currentStepId === "terms") return "Fill in commercial terms — GSTIN, payment schedule and any global charges.";
    if (currentStepId === "review") return "Review every number, then confirm to submit.";
    return null;
  })();

  // What does Next mean from the current step?
  const nextLabel = (() => {
    if (currentStepId === "overview") return totalSteps <= 2 ? "Continue to pricing" : "Continue";
    if (currentStepId === "clarifications") return "Continue";
    if (currentStepId === "eval") return "Continue to pricing";
    if (currentStepId === "pricing") return "Continue to terms";
    if (currentStepId === "terms") return "Continue to review";
    return "Continue";
  })();

  const nextDisabled = (() => {
    if (currentStepId === "overview") return !canContinueStep1;
    if (currentStepId === "clarifications") return clarBlocksQuote;
    if (currentStepId === "eval") return !canContinueStep2;
    if (currentStepId === "pricing") return !canContinueStep3;
    if (currentStepId === "terms") return !canContinueStep4;
    return false;
  })();

  return (
    <footer className={styles.actionBar}>
      <div className={styles.actionBarInner}>
        <div className={styles.actionHelper}>
          <span>
            <span className={styles.accent}>Step {stepNum} of {totalSteps}.</span>{" "}
            {helper}
          </span>
        </div>
        <div className={styles.actionGroup}>
          {(currentStepId === "pricing" || currentStepId === "terms" || currentStepId === "review") && totals.grand > 0 && (
            <div className={styles.actionTotal}>
              <span className={styles.lbl}>Total</span>
              <span className={styles.val}>₹ {fmtINR(totals.grand)}</span>
            </div>
          )}

          {!alreadyQuoted && !missedInquiry && (
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onRegret}>
              <X size={13} />
              Regret quote
            </button>
          )}

          {currentStep > 0 && !missedInquiry && (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onPrev}>
              <ArrowLeft size={13} />
              Back
            </button>
          )}

          {!isLastStep && !missedInquiry && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onNext}
              disabled={nextDisabled}
            >
              {nextLabel}
              <ArrowRight size={13} />
            </button>
          )}

          {isLastStep && !missedInquiry && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnXl}`}
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
            >
              <Send size={14} />
              {submitting ? "Submitting…" : alreadyQuoted ? "Confirm & Update" : "Confirm & Submit"}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};

/* ════════════════════════════════════════════════════════════════
   Charges modal
   ════════════════════════════════════════════════════════════════ */
const CHARGE_TYPES = ["Freight", "Insurance", "Packaging & Handling", "Installation", "TCS", "Custom"];

const validateCharge = (ch, i) => {
  const errs = [];
  if (!ch.name || !ch.name.trim()) errs.push("name missing");
  if (!(parseFloat(ch.amount) > 0)) errs.push("amount must be greater than 0");
  if (!(ch.comment || "").trim()) errs.push("note is required");
  return {
    idx: i,
    name: (ch.name || "").trim() || `Charge ${i + 1}`,
    errs,
  };
};

const ChargesModal = ({ product, pIdx, onClose, onAddCharge, onUpdateCharge, onRemoveCharge, negFields = [], bidExpired = false, chargeTypes }) => {
  const charges = product?.other_charges || [];
  const chargeReports = charges.map(validateCharge);
  const errorList = chargeReports.filter((r) => r.errs.length > 0);
  const hasErrors = errorList.length > 0;

  // Filter out charge types already added (one-per-type, except Custom)
  const existingNames = new Set(charges.map((c) => (c.name || "").toLowerCase().trim()));
  const availableTypes = (chargeTypes || CHARGE_TYPES).filter(
    (t) => t === "Custom" || !existingNames.has(t.toLowerCase())
  );

  // Post-expiry, charges unlock per-field (legacy parity): amount needs an
  // AMOUNT target on the matching negotiated field, tax needs a TAX demand.
  // New charges can't be added or removed once the bid window has closed.
  const findNegField = (ch) =>
    negFields.find((f) => f.name === ch.name || f.name === ch.slug);
  const isChargeAmountLocked = (ch) => {
    if (!bidExpired) return false;
    const f = findNegField(ch);
    return !(f && f.targetPrice != null && f.targetPrice !== "");
  };
  const isChargeTaxLocked = (ch) => {
    if (!bidExpired) return false;
    const f = findNegField(ch);
    return !(f && f.taxDemand);
  };

  return (
    <div className={styles.modalBackdrop} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <h3>
              Additional charges
              <span style={{ fontWeight: 450, color: "var(--fg-3)", marginLeft: 6 }}>
                {" · "} {product?.product_name}
              </span>
            </h3>
            <div className={styles.sub}>
              Add freight, insurance or any custom charge that should be billed
              for this line item.
            </div>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.label}>Add charge type</label>
          <select
            className={styles.select}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v === "Custom") {
                const name = window.prompt("Custom charge name", "");
                if (name && name.trim()) {
                  const exists = existingNames.has(name.trim().toLowerCase());
                  if (exists) {
                    toast.error(`"${name.trim()}" is already added.`);
                  } else {
                    onAddCharge(name.trim());
                  }
                }
              } else {
                onAddCharge(v);
              }
              e.target.value = "";
            }}
            disabled={availableTypes.length === 0 || bidExpired}
          >
            <option value="">
              {availableTypes.length === 0
                ? "All standard charge types added — use Custom"
                : "Select charge type…"}
            </option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t === "Custom" ? "+ Custom charge" : t}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {(product?.other_charges || []).map((ch, ci) => (
              <div className={styles.chargeCard} key={ch._id || ci}>
                <div className={styles.chargeCardHead}>
                  <h4>{ch.name || "(Unnamed)"}</h4>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onRemoveCharge(ci)}
                    aria-label="Remove"
                    disabled={bidExpired}
                  >
                    <Trash2 size={14} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
                <div className={styles.chargeGrid}>
                  <div>
                    <label className={styles.label}>Amount</label>
                    <div className={styles.taxField}>
                      <input
                        className={styles.taxInput}
                        type="number"
                        value={ch.amount ?? 0}
                        onChange={(e) => onUpdateCharge(ci, { amount: Number(e.target.value) })}
                        placeholder="0"
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isChargeAmountLocked(ch)}
                      />
                      <div className={styles.modeSeg} role="group" aria-label="Charge mode">
                        <button
                          type="button"
                          className={ch.amount_mode === "percentage" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "percentage" })}
                          aria-pressed={ch.amount_mode === "percentage"}
                          disabled={isChargeAmountLocked(ch)}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={ch.amount_mode === "absolute" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "absolute" })}
                          aria-pressed={ch.amount_mode === "absolute"}
                          disabled={isChargeAmountLocked(ch)}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={styles.label}>
                      Tax (GST)
                      {ch.tax == null || ch.tax === "" ? (
                        <span className={styles.labelMeta}>uses base rate</span>
                      ) : null}
                    </label>
                    <div className={styles.taxField}>
                      <input
                        className={styles.taxInput}
                        type="number"
                        value={ch.tax == null ? "" : ch.tax}
                        onChange={(e) =>
                          onUpdateCharge(ci, {
                            tax: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        placeholder={`${product?.tax ?? 0}${
                          (product?.tax_mode || "percentage") === "absolute" ? "₹" : "%"
                        }`}
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isChargeTaxLocked(ch)}
                      />
                      <div className={styles.modeSeg} role="group" aria-label="Tax mode">
                        <button
                          type="button"
                          className={(ch.tax_mode || "percentage") === "percentage" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { tax_mode: "percentage" })}
                          aria-pressed={(ch.tax_mode || "percentage") === "percentage"}
                          disabled={isChargeTaxLocked(ch)}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={ch.tax_mode === "absolute" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { tax_mode: "absolute" })}
                          aria-pressed={ch.tax_mode === "absolute"}
                          disabled={isChargeTaxLocked(ch)}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={styles.label}>
                      Note <span className={styles.req}>*</span>
                      {!(ch.comment || "").trim() && (
                        <span className={styles.labelMeta} style={{ color: "var(--danger)" }}>
                          required
                        </span>
                      )}
                    </label>
                    <input
                      className={styles.input}
                      type="text"
                      value={ch.comment || ""}
                      onChange={(e) => onUpdateCharge(ci, { comment: e.target.value })}
                      placeholder="e.g. GST 18% inclusive"
                      maxLength={120}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {charges.length === 0 ? (
            <div className={styles.chargesEmpty}>
              <div className={styles.ic}>
                <Plus size={18} />
              </div>
              <div className={styles.t1}>No extra charges yet</div>
              <div className={styles.t2}>
                Select a type above to add freight, insurance, etc.
              </div>
            </div>
          ) : hasErrors ? (
            <div className={styles.errorBanner}>
              <div className={styles.errorBannerTitle}>
                Please fix the following before saving:
              </div>
              <ul className={styles.errorBannerList}>
                {errorList.map((r) => (
                  <li key={r.idx}>
                    <strong>{r.name}</strong> — {r.errs.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.infoBanner}>
              Charges are saved when you submit the quote. They appear in the
              buyer's quote summary.
            </div>
          )}
        </div>
        <div className={styles.modalFoot}>
          <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
            {charges.length} charge{charges.length === 1 ? "" : "s"} on this line
            {hasErrors && (
              <span style={{ color: "var(--danger)", marginLeft: 8, fontWeight: 500 }}>
                · {errorList.length} need attention
              </span>
            )}
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onClose}
            disabled={hasErrors}
            title={hasErrors ? "Fix all errors before saving" : ""}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Global charges modal — charges that apply on the grand PO total
   ════════════════════════════════════════════════════════════════ */
const GLOBAL_CHARGE_TYPES = ["Shipping insurance", "Handling", "Service fee", "Discount", "Custom"];

const validateGlobalCharge = (ch, i) => {
  const errs = [];
  if (!ch.name || !ch.name.trim()) errs.push("name missing");
  if (!(parseFloat(ch.amount) > 0)) errs.push("amount must be greater than 0");
  if (!(ch.comment || "").trim()) errs.push("note is required");
  return {
    idx: i,
    name: (ch.name || "").trim() || `Charge ${i + 1}`,
    errs,
  };
};

const GlobalChargesModal = ({ charges, onClose, onAddCharge, onUpdateCharge, onRemoveCharge, negFields = [], bidExpired = false, chargeTypes }) => {
  const reports = (charges || []).map(validateGlobalCharge);
  const errorList = reports.filter((r) => r.errs.length > 0);
  const hasErrors = errorList.length > 0;

  const existingNames = new Set((charges || []).map((c) => (c.name || "").toLowerCase().trim()));
  const availableTypes = (chargeTypes || GLOBAL_CHARGE_TYPES).filter(
    (t) => t === "Custom" || !existingNames.has(t.toLowerCase())
  );

  // Post-expiry, only RFQ-level fields the buyer negotiated stay editable
  // (legacy parity); adding or removing global charges is blocked.
  const isChargeLocked = (ch) => {
    if (!bidExpired) return false;
    const f = negFields.find((x) => x.name === ch.name || x.name === ch.slug);
    return !(f && f.targetPrice != null && f.targetPrice !== "");
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <h3>
              Global charges
              <span style={{ fontWeight: 450, color: "var(--fg-3)", marginLeft: 6 }}>
                · applied on grand total
              </span>
            </h3>
            <div className={styles.sub}>
              Charges that apply across the entire quote — billed on the grand
              total, not on individual line items.
            </div>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.label}>Add charge type</label>
          <select
            className={styles.select}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v === "Custom") {
                const name = window.prompt("Custom global charge name", "");
                if (name && name.trim()) {
                  if (existingNames.has(name.trim().toLowerCase())) {
                    toast.error(`"${name.trim()}" is already added.`);
                  } else {
                    onAddCharge(name.trim());
                  }
                }
              } else {
                onAddCharge(v);
              }
              e.target.value = "";
            }}
            disabled={availableTypes.length === 0 || bidExpired}
          >
            <option value="">
              {availableTypes.length === 0
                ? "All standard charge types added — use Custom"
                : "Select charge type…"}
            </option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t === "Custom" ? "+ Custom charge" : t}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {(charges || []).map((ch, ci) => (
              <div className={styles.chargeCard} key={ch._id || ci}>
                <div className={styles.chargeCardHead}>
                  <h4>{ch.name || "(Unnamed)"}</h4>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onRemoveCharge(ci)}
                    aria-label="Remove"
                    disabled={bidExpired}
                  >
                    <Trash2 size={14} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
                <div className={styles.chargeGrid}>
                  <div>
                    <label className={styles.label}>Amount</label>
                    <div className={styles.taxField}>
                      <input
                        className={styles.taxInput}
                        type="number"
                        value={ch.amount ?? 0}
                        onChange={(e) => onUpdateCharge(ci, { amount: Number(e.target.value) })}
                        placeholder="0"
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isChargeLocked(ch)}
                      />
                      <div className={styles.modeSeg} role="group" aria-label="Charge mode">
                        <button
                          type="button"
                          className={ch.amount_mode === "percentage" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "percentage" })}
                          aria-pressed={ch.amount_mode === "percentage"}
                          disabled={isChargeLocked(ch)}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={ch.amount_mode === "absolute" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "absolute" })}
                          aria-pressed={ch.amount_mode === "absolute"}
                          disabled={isChargeLocked(ch)}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label className={styles.label}>
                      Note <span className={styles.req}>*</span>
                      {!(ch.comment || "").trim() && (
                        <span className={styles.labelMeta} style={{ color: "var(--danger)" }}>
                          required
                        </span>
                      )}
                    </label>
                    <input
                      className={styles.input}
                      type="text"
                      value={ch.comment || ""}
                      onChange={(e) => onUpdateCharge(ci, { comment: e.target.value })}
                      placeholder="e.g. across PO value"
                      maxLength={120}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(charges || []).length === 0 ? (
            <div className={styles.chargesEmpty}>
              <div className={styles.ic}>
                <Plus size={18} />
              </div>
              <div className={styles.t1}>No global charges yet</div>
              <div className={styles.t2}>
                Add charges that should apply on the entire PO value.
              </div>
            </div>
          ) : hasErrors ? (
            <div className={styles.errorBanner}>
              <div className={styles.errorBannerTitle}>
                Please fix the following before saving:
              </div>
              <ul className={styles.errorBannerList}>
                {errorList.map((r) => (
                  <li key={r.idx}>
                    <strong>{r.name}</strong> — {r.errs.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.infoBanner}>
              Global charges are billed across the full PO value, after line totals.
            </div>
          )}
        </div>
        <div className={styles.modalFoot}>
          <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
            {(charges || []).length} global charge
            {(charges || []).length === 1 ? "" : "s"}
            {hasErrors && (
              <span style={{ color: "var(--danger)", marginLeft: 8, fontWeight: 500 }}>
                · {errorList.length} need attention
              </span>
            )}
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onClose}
            disabled={hasErrors}
            title={hasErrors ? "Fix all errors before saving" : ""}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   History modal
   ════════════════════════════════════════════════════════════════ */
const HistoryModal = ({ history, loading, onClose }) => {
  return (
  <div className={styles.modalBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className={styles.modal} style={{ maxWidth: 540 }}>
      <div className={styles.modalHead}>
        <div>
          <h3>Previous quotes for this product</h3>
          <div className={styles.sub}>Most recent quotes you've submitted for the same item.</div>
        </div>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className={styles.modalBody}>
        {loading && <div className={styles.skeletonRow} style={{ width: "70%" }} />}
        {!loading && history.length === 0 && (
          <div className={styles.chargesEmpty}>
            <div className={styles.ic}>
              <History size={18} />
            </div>
            <div className={styles.t1}>No past quotes yet</div>
            <div className={styles.t2}>You haven't quoted this product before.</div>
          </div>
        )}
        {!loading && history.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((h, i) => {
              const total = h.total_price ?? h.amount ?? 0;
              return (
                <div
                  key={i}
                  style={{
                    padding: 14,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {h.product_name || h.product || "Product"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 3 }}>
                      <span className={styles.mono}>RFQ #{h.rfq_no || h.rfq_id}</span>{" "}
                      · {fmtShortDate(h.timestamp || h.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={styles.mono} style={{ fontSize: 13, fontWeight: 600 }}>
                      ₹ {fmtINR(total)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Success modal
   ════════════════════════════════════════════════════════════════ */
const SuccessModal = ({ rfq, totals, products, submittedAt, submittedRef, onClose }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(submittedRef);
      toast.success("Reference copied");
    } catch (_) {
      toast.error("Couldn't copy — please copy manually.");
    }
  };

  return (
    <div className={styles.confirmOverlay}>
      <div className={styles.confirmModal} role="dialog" aria-modal="true">
        <div className={styles.confirmHero}>
          <div className={styles.checkStage}>
            <svg className={styles.checkSvg} viewBox="0 0 80 80" aria-hidden="true">
              <circle className={styles.checkRingBg} cx="40" cy="40" r="38" />
              <circle className={styles.checkRing} cx="40" cy="40" r="36" />
              <path className={styles.checkTick} d="M26 41.5 L36 51.5 L55 31.5" />
            </svg>
          </div>
          <h2>Quote submitted</h2>
          <p>
            Your quote for{" "}
            <strong style={{ color: "var(--fg)" }}>
              RFQ #{rfq.rfq_no} · {rfq.company_name}
            </strong>{" "}
            has been delivered. The buyer team has been notified.
          </p>
          <div className={styles.refChip}>
            <span className={styles.tag}>Reference</span>
            <span className={styles.num}>{submittedRef}</span>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopy}
              aria-label="Copy reference"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        <div className={styles.confirmBody}>
          <div className={styles.confirmGrid}>
            <div className={`${styles.confirmCell} ${styles.total}`}>
              <div className={styles.k}>Grand total submitted</div>
              <div className={styles.v}>₹ {fmtINR(totals.grand)}</div>
            </div>
            <div className={styles.confirmCell}>
              <div className={styles.k}>Products quoted</div>
              <div className={styles.v}>
                {products.length} line item{products.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className={styles.confirmCell}>
              <div className={styles.k}>Submitted at</div>
              <div className={styles.v}>{submittedAt}</div>
            </div>
          </div>
        </div>

        <div className={styles.confirmFoot}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            <ArrowLeft size={13} />
            Back to inquiry
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onClose}>
            Done
            <Check size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Layout-aware loading skeleton — mirrors wizard structure
   ════════════════════════════════════════════════════════════════ */
const WizardSkeleton = () => (
  <div className={styles.root}>
    <section className={styles.headerStrip}>
      <div className={styles.headerInner}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.skelBar} style={{ width: 80, height: 12 }} />
          <div className={styles.skelBar} style={{ width: "55%", height: 28, marginTop: 12 }} />
          <div className={styles.skelBar} style={{ width: "70%", height: 14, marginTop: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <div className={styles.skelBar} style={{ width: 110, height: 26, borderRadius: 999 }} />
          <div className={styles.skelBar} style={{ width: 140, height: 26, borderRadius: 999 }} />
        </div>
      </div>
    </section>
    <nav className={styles.stepper}>
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          <div className={styles.skelStep}>
            <div className={styles.skelBar} style={{ width: 24, height: 24, borderRadius: 7 }} />
            <div>
              <div className={styles.skelBar} style={{ width: 120, height: 12 }} />
              <div className={styles.skelBar} style={{ width: 90, height: 10, marginTop: 6 }} />
            </div>
          </div>
          {i < 2 && <div className={styles.stepDivider} />}
        </React.Fragment>
      ))}
    </nav>
    <main className={styles.content}>
      <div style={{ marginBottom: 18 }}>
        <div className={styles.skelBar} style={{ width: 220, height: 19 }} />
        <div className={styles.skelBar} style={{ width: 380, height: 13, marginTop: 6 }} />
      </div>

      {/* Buyer details card skeleton */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.skelBar} style={{ width: 110, height: 13 }} />
          <div className={styles.skelBar} style={{ width: 160, height: 22, borderRadius: 999 }} />
        </div>
        <div className={styles.detailGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div className={styles.detailCell} key={i}>
              <div className={styles.skelBar} style={{ width: 80, height: 10 }} />
              <div className={styles.skelBar} style={{ width: "70%", height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>

      {/* What you're quoting skeleton */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <div className={styles.skelBar} style={{ width: 140, height: 13 }} />
          <div className={styles.skelBar} style={{ width: 70, height: 22, borderRadius: 999 }} />
        </div>
        <div style={{ padding: "8px 22px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className={styles.skelBar} style={{ width: 36, height: 36, borderRadius: 9 }} />
                <div>
                  <div className={styles.skelBar} style={{ width: 180, height: 14 }} />
                  <div className={styles.skelBar} style={{ width: 240, height: 12, marginTop: 6 }} />
                </div>
              </div>
              <div className={styles.skelBar} style={{ width: 60, height: 14 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Terms skeleton */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <div className={styles.skelBar} style={{ width: 140, height: 13 }} />
          <div className={styles.skelBar} style={{ width: 80, height: 22, borderRadius: 999 }} />
        </div>
        <div className={styles.cardSection}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px dashed var(--border)",
              }}
            >
              <div className={styles.skelBar} style={{ width: 26, height: 22, borderRadius: 6 }} />
              <div className={styles.skelBar} style={{ width: `${88 - i * 8}%`, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default SendQuoteWizard;
