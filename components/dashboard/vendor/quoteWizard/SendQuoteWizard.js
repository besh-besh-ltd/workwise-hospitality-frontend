/* ────────────────────────────────────────────────────────────
   SendQuoteWizard — vendor-side 3-step quote submission flow.
   Renders at /dashboard/vendor/quote and replaces the legacy
   /dashboard/vendor/send-quote experience.
   ──────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Building2, ClipboardCheck, FileText, Clock, Send, Download, X,
  Plus, Trash2, ArrowRight, ArrowLeft, Copy, History,
  Check, Layers, MessageSquare, IndianRupee, MessageCircle, AlertTriangle,
  Receipt, CreditCard, HelpCircle, Lock, CheckCircle2, ChevronDown,
  Paperclip, Eye,
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
import QuoteMethodModal from "@/components/shared/QuoteMethodModal";
import {
  RaiseClarificationModal,
  ClarificationDetailModal,
} from "@/components/dashboard/buyer/clarification";
import ClauseChatDrawer from "./ClauseChatDrawer";

import styles from "./SendQuoteWizard.module.scss";
import {
  buildInitialQuoteProducts,
  deriveMrpBaseFE,
  diffPaymentTerms,
  fmtINR,
  fmtShortDate,
  generateReference,
  genLocalId,
  sumPaymentTerms,
} from "./helpers";
import { downloadQuoteExcel } from "@/utils/quoteExcel";
import { isValidGstin, seedGstin } from "@/utils/gstin";

// Format a buyer's negotiated target for display in an ask chip.
//  - "days"   → "5 days"          (delivery period)
//  - "charge" → "10%" | "₹150.00" (mode-aware charge target)
//  - "text"   → raw string        (payment terms, comments, etc.)
//  - default  → "₹150.00"         (amount)
const fmtNegTarget = (nf, kind = "amount") => {
  const v = nf?.targetPrice;
  if (v == null || v === "") return null;
  if (kind === "days") return `${v} days`;
  if (kind === "charge") return nf.mode === "percentage" ? `${v}%` : `₹${fmtINR(v)}`;
  if (kind === "text") return String(v);
  return `₹${fmtINR(v)}`;
};

// A round's `end_date` arrives UTC-naive ("2026-09-01 10:30:00"). Handing that
// straight to moment()/fmtShortDate reads it as LOCAL time and shows an IST
// vendor a deadline 5h30m early — on a two-hour round that is the difference
// between "respond today" and "already missed". Normalise to a real instant
// first, by the same rule the round filter already applies.
const parseRoundEnd = (endDate) => {
  if (!endDate) return null;
  const raw = String(endDate);
  const iso =
    raw.includes("+") || raw.includes("Z") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

// What to CALL each negotiated field when telling the vendor where to go.
// A round stores raw field keys (`base_price`, `payment_terms`) and a buyer can
// also name a free-text charge, so anything unrecognised is humanised instead of
// shown raw — "Freight Charges", not "freight_charges".
const NEG_FIELD_LABELS = {
  base_price: "Unit price",
  unit_price: "Unit price",
  price: "Unit price",
  delivery_period: "Delivery period",
  comment: "Line comment",
  documents: "Documents",
  payment_terms: "Payment terms",
  global_comment: "Overall comment",
  vendor_tc: "Terms & conditions",
};

const negFieldLabel = (name) =>
  NEG_FIELD_LABELS[name] ||
  String(name || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Which fmtNegTarget rendering a field's target wants. Unrecognised names are
// buyer-named charges, which are mode-aware (₹ or %).
const negAskKind = (name) => {
  if (name === "delivery_period") return "days";
  if (["comment", "global_comment", "payment_terms", "vendor_tc"].includes(name)) return "text";
  if (["base_price", "unit_price", "price"].includes(name)) return "amount";
  return "charge";
};

// One line of "here is what the buyer asked for on this field". `documents`
// carries an ARRAY of per-file comments in targetPrice, so it is never printed
// as a value — its ask is the free-text demand.
const negAskValue = (f) => {
  if (!f) return null;
  if (f.name === "documents") return f.demand || "Documents requested";
  return (
    fmtNegTarget(f, negAskKind(f.name)) ||
    f.demand ||
    (f.taxDemand ? `tax — ${f.taxDemand}` : null)
  );
};

/**
 * The outstanding negotiation asks, stated plainly: which item, which field,
 * what the buyer wants, and a button to the step that holds the input.
 *
 * Built for RFQ 536237, where the vendor was dropped on a Review step that
 * mentioned neither the round nor the ₹1,58,800 ask, under a header reading
 * "read-only". They concluded the RFQ was shut. Everything they needed was one
 * step back and nothing pointed to it.
 */
const NegotiationCallout = ({ summary, onGoToStep }) => {
  if (!summary?.active) return null;
  const { lines, rfqLevel, askCount } = summary;
  const itemCount = lines.length + (rfqLevel.length > 0 ? 1 : 0);
  return (
    <div className={styles.negCallout} data-testid="negotiation-callout">
      <div className={styles.negCalloutHead}>
        <AlertTriangle size={15} strokeWidth={2.3} />
        <div>
          <div className={styles.negCalloutTitle}>
            The buyer is waiting on {askCount} change{askCount === 1 ? "" : "s"}
            {itemCount > 1 ? ` across ${itemCount} sections` : ""}
          </div>
          <div className={styles.negCalloutSub}>
            Your quote will be submitted exactly as it stands below. Nothing here
            changes until you edit it — open the step listed against each ask.
          </div>
        </div>
      </div>

      <div className={styles.negCalloutList}>
        {lines.map((line) => (
          <div key={line.productId} className={styles.negCalloutRow}>
            <div className={styles.negCalloutRowMain}>
              <div className={styles.negCalloutItem}>{line.name}</div>
              <ul className={styles.negCalloutAsks}>
                {line.asks.map((a) => (
                  <li key={a.name}>
                    <span className={styles.negCalloutField}>{a.label}</span>
                    {a.value ? (
                      <>
                        {" — buyer wants "}
                        <span className={styles.mono}>{a.value}</span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className={styles.negCalloutJump}
              onClick={() => onGoToStep?.("pricing")}
            >
              Go to Pricing
              <ArrowRight size={13} strokeWidth={2.2} />
            </button>
          </div>
        ))}

        {rfqLevel.length > 0 && (
          <div className={styles.negCalloutRow}>
            <div className={styles.negCalloutRowMain}>
              <div className={styles.negCalloutItem}>Whole quote</div>
              <ul className={styles.negCalloutAsks}>
                {rfqLevel.map((a) => (
                  <li key={a.name}>
                    <span className={styles.negCalloutField}>{a.label}</span>
                    {a.value ? (
                      <>
                        {" — buyer wants "}
                        <span className={styles.mono}>{a.value}</span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className={styles.negCalloutJump}
              onClick={() => onGoToStep?.("terms")}
            >
              Go to Commercial terms
              <ArrowRight size={13} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// A single "Buyer's ask" chip. `value` is a pre-formatted string; renders
// nothing when empty so it only appears on fields the buyer actually negotiated.
const BuyerAskHint = ({ value, label = "Buyer's ask", mono = true }) => {
  if (value == null || value === "") return null;
  return (
    <div className={styles.negHint}>
      <span className={styles.negHintDot} />
      {label}: {mono ? <span className={styles.mono}>{value}</span> : <span>{value}</span>}
    </div>
  );
};

// Normalize a `documents` negotiation field into the buyer's per-document
// comments + an overall demand. `targetPrice` is the array the buyer set per
// document — `[{ document_index, file_url, comment }]`; `demand` is the buyer's
// free-text request for additional documents. Returns a stable shape so the
// caller can match comments against the vendor's own uploaded files (by URL
// first, then index) and render the demand separately.
const parseDocAsks = (negField) => {
  if (!negField) return { comments: [], demand: null };
  const raw = negField.targetPrice;
  const arr = Array.isArray(raw) ? raw : [];
  const comments = arr
    .filter((d) => d && d.comment && String(d.comment).trim())
    .map((d) => ({
      index: Number.isInteger(d.document_index) ? d.document_index : null,
      fileUrl: d.file_url || null,
      comment: String(d.comment).trim(),
    }));
  // The buyer's free-text request reaches us in one of TWO shapes, because two
  // writers emit it (negotiationHelpers.js):
  //   :357 per-vendor documents  -> { target: [ …per-doc comments ], demand: "…" }
  //   :402 global / RFQ-level    -> { target: "kindly add Product image" }
  // Only `demand` was ever read, so the second shape — 7 of the 8 `documents`
  // fields in production's `products[]` column, and every round on RFQ 536312 —
  // rendered an empty hint and the ask never reached the vendor. Read either.
  const fromTarget =
    typeof raw === "string" && raw.trim() ? raw.trim() : null;
  const demand =
    negField.demand && String(negField.demand).trim()
      ? String(negField.demand).trim()
      : fromTarget;
  return { comments, demand };
};

// File lists from the API come back either as plain URL strings or as
// `{ file_url } / { file_path }` objects. The add-vendor-response endpoint only
// accepts string URLs — sending the raw objects fails with a 500 ("Error adding
// vendor responses or associated files"). Normalise to string URLs on the way in.
const toFileUrls = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((f) => (typeof f === "string" ? f : f?.file_url || f?.file_path || ""))
    .filter(Boolean);

// Resolve the buyer's comment for one specific document — matched by file URL
// first (robust across re-ordering), then by the original document index.
const docAskFor = (asks, fileUrl, index) => {
  if (!asks) return null;
  if (fileUrl) {
    const byUrl = asks.comments.find((c) => c.fileUrl && c.fileUrl === fileUrl);
    if (byUrl) return byUrl.comment;
  }
  if (index != null) {
    const byIdx = asks.comments.find((c) => c.index === index);
    if (byIdx) return byIdx.comment;
  }
  return null;
};

// Per-document buyer comment, shown inline under the matching uploaded file.
const DocAskComment = ({ comment }) => {
  if (!comment) return null;
  return (
    <div className={styles.negHint} style={{ marginTop: 4, marginBottom: 0 }}>
      <span className={styles.negHintDot} />
      Buyer's ask: <span>{comment}</span>
    </div>
  );
};

const ALL_STEPS = [
  { id: "overview", label: "Inquiry overview", meta: "Buyer, products & terms" },
  { id: "clarifications", label: "Clarifications", meta: "Tender clarification window" },
  { id: "eval", label: "Technical evaluation", meta: "Specs & clause responses" },
  { id: "pricing", label: "Pricing", meta: "Per-line prices & charges" },
  { id: "terms", label: "Commercial terms", meta: "GSTIN, payment & global charges" },
  { id: "review", label: "Review & submit", meta: "Verify and confirm" },
];

// Which steps are on screen, given the two things that add or remove one. The
// `visibleSteps` memo and the data loader both go through this, because they
// must agree: the loader needs to resolve a landing step by INDEX, and the old
// hardcoded `hasEvalAtLoad ? 4 : 3` silently assumed the Clarifications step was
// never present — so on a tender it dropped the vendor on Commercial terms.
const visibleStepsFor = ({ hasTechEval, showClarStep }) =>
  ALL_STEPS.filter(
    (s) =>
      (s.id !== "eval" || hasTechEval) &&
      (s.id !== "clarifications" || showClarStep)
  );

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

/* ────────────────────────────────────────────────────────────────
   "Has this line been priced?" — ONE definition, used everywhere.

   A Traditional line is priced on `unit_price`. An MRP (tax-inclusive) line
   is priced on `entered_mrp`: `unit_price` is the DERIVED base, it is left
   blank in client state, and the backend re-derives it on save. So testing
   `unit_price > 0` reports a fully-priced MRP line as unpriced.

   That drift shipped: the submit-payload validator was MRP-aware while the
   review screen and the pricing-step status pill were not, so a vendor who
   priced three MRP lines was told on the final confirmation screen that all
   three were "Not priced — will be marked as regret", next to a correct
   grand total. Every priced/skipped decision must call THIS, so the two can
   never disagree again.

   Accepts both shapes it is asked about: in-component product state (strings,
   `entered_mrp: ""`) and outgoing payload rows (numbers, `entered_mrp: null`).
   ──────────────────────────────────────────────────────────────── */
const isLinePriced = (p) =>
  ((p?.pricing_method === "MRP"
    ? parseFloat(p?.entered_mrp)
    : parseFloat(p?.unit_price)) || 0) > 0;

/** Per-unit base rate — the number every "qty × ₹rate" string on this page
 *  means. Traditional lines quote it directly; MRP lines derive it from
 *  MRP − discount with GST stripped out. Same branch as helpers'
 *  computeLineTotal, so the strings agree with the totals. */
const lineUnitBase = (p) =>
  p?.pricing_method === "MRP"
    ? // base2dp, not base: this is a displayed unit RATE, so it wants the
      // rounded figure. The line total is computed from the tax-inclusive
      // amount instead (see helpers' computeLineTotal), which is why
      // qty × this rate can differ from the line total by a few paise on an
      // MRP line — the inclusive amount is what the vendor actually offered.
      deriveMrpBaseFE({
        mrp: p?.entered_mrp,
        discount: p?.mrp_discount,
        discountMode: p?.mrp_discount_mode,
        gst: p?.tax,
      }).base2dp
    : parseFloat(p?.unit_price) || 0;

/** "MRP ₹1,300.00 less 15%" — the provenance of an MRP line's base rate. */
const mrpProvenance = (p) => {
  const mrp = parseFloat(p?.entered_mrp) || 0;
  if (mrp <= 0) return "";
  const disc = parseFloat(p?.mrp_discount) || 0;
  if (disc <= 0) return `MRP ₹${fmtINR(mrp)}`;
  const shown =
    p?.mrp_discount_mode === "absolute" ? `₹${fmtINR(disc)}` : `${disc}%`;
  return `MRP ₹${fmtINR(mrp)} less ${shown}`;
};

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
  // MRP (tax-inclusive) quoting — quote-wide method selection. Persisted per
  // line too, but the modal sets one method for every line at once.
  const [pricingMethod, setPricingMethod] = useState("TRADITIONAL");
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [vendorGSTIN, setVendorGSTIN] = useState("");
  // True while the GSTIN on screen was seeded from the vendor's company
  // profile rather than read off this quote. Drives the "from your company
  // profile" hint — the whole complaint was that a vendor could not tell
  // whether they had filled the field in.
  const [gstinFromProfile, setGstinFromProfile] = useState(false);
  const [globalComment, setGlobalComment] = useState("");
  // Vendor's quote-wide attachments — sent as `term_and_condition_files`
  // (stored in tbl_quotes_files for this quote), returned as the top-level
  // `terms_and_conditions_files` by getRfqById.
  const [globalDocumentFiles, setGlobalDocumentFiles] = useState([]);
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
  // The live rounds themselves (round_number / end_date), so the header can name
  // the deadline the vendor is actually working to instead of the dead bid date.
  const [negotiationRounds, setNegotiationRounds] = useState([]);
  // One-shot guard so negotiated charges are auto-added only once per load
  const negotiationChargesAddedRef = useRef(false);

  // Is a negotiation round live on this quote? Declared here — ABOVE the step
  // list and the read-only derivations — because all of them need it. Four
  // separate signals used to test `isBidExpired` alone and told the vendor the
  // quote was read-only while a round was open (RFQ 536237).
  const hasAnyNegotiation = Object.keys(negotiationFields).length > 0;

  // Everything the vendor needs to act on the round, in one shape: which lines
  // carry an ask, which fields, what the buyer wants, and which STEP holds the
  // input. Per-product asks live on Pricing; RFQ-level asks (payment terms,
  // global charges, quote-wide documents) live on Commercial terms.
  const negotiationSummary = useMemo(() => {
    const empty = { active: false, lines: [], rfqLevel: [], steps: new Set(), askCount: 0 };
    if (!isBidExpired) return empty;
    const entries = Object.entries(negotiationFields || {});
    if (entries.length === 0) return empty;

    const lines = [];
    let rfqLevel = [];
    entries.forEach(([key, fields]) => {
      // A field with no target, no demand and no tax note is not an ask — the
      // filter effect already drops targets the vendor's quote has met.
      const asks = (fields || [])
        .filter(
          (f) =>
            (f.targetPrice != null && f.targetPrice !== "") || f.demand || f.taxDemand
        )
        .map((f) => ({ name: f.name, label: negFieldLabel(f.name), value: negAskValue(f) }));
      if (asks.length === 0) return;
      if (key === "__rfq_level__") {
        rfqLevel = asks;
        return;
      }
      const idx = products.findIndex((p) => String(p.id) === String(key));
      lines.push({
        productId: key,
        index: idx,
        name:
          idx >= 0
            ? products[idx].product_name || products[idx].name || `Item #${key}`
            : `Item #${key}`,
        asks,
      });
    });

    const steps = new Set();
    if (lines.length > 0) steps.add("pricing");
    if (rfqLevel.length > 0) steps.add("terms");
    return {
      active: lines.length > 0 || rfqLevel.length > 0,
      lines,
      rfqLevel,
      steps,
      askCount:
        lines.reduce((n, l) => n + l.asks.length, 0) + rfqLevel.length,
    };
  }, [negotiationFields, products, isBidExpired]);

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
      items: products.map((p) => {
        const isMrp = p.pricing_method === "MRP";
        return {
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
          // MRP mode — server resolves base from these raw audit inputs
          // before the engine runs (preview endpoint is opt-in per item).
          pricing_method: isMrp ? "MRP" : "TRADITIONAL",
          ...(isMrp
            ? {
                entered_mrp: coerceAmount(p.entered_mrp),
                mrp_discount: coerceAmount(p.mrp_discount),
                mrp_discount_mode: p.mrp_discount_mode || "percentage",
              }
            : {}),
        };
      }),
      global_charges: globalCharges
        .filter((c) => c.name && c.name.trim())
        .map((c) => ({
          name: c.name,
          amount: coerceAmount(c.amount),
          amount_mode: c.amount_mode || "percentage",
          // GST on the global charge — engine returns it in the totals so the
          // grand total reflects it live.
          additional_tax: coerceAmount(c.extra_tax),
          additional_tax_mode: c.extra_tax_mode || "percentage",
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
  // helpers (line foot, badges) keep working off `p.total_price`. Also syncs
  // the engine's per-line base/base_tax (engine_base/engine_base_tax) so the
  // MRP derived read-out ("Base ₹… · GST ₹… · Buyer pays ₹…") can render
  // straight off product state without prop-drilling pricingTotals.
  useEffect(() => {
    if (!pricingTotals?.lines) return;
    setProducts((prev) => {
      let changed = false;
      const next = prev.map((p, idx) => {
        const line = pricingTotals.lines[idx];
        const newTotal = line?.total ?? 0;
        const newBase = line?.base ?? 0;
        const newBaseTax = line?.base_tax ?? 0;
        if (
          Number(p.total_price) === newTotal &&
          Number(p.engine_base) === newBase &&
          Number(p.engine_base_tax) === newBaseTax
        ) {
          return p;
        }
        changed = true;
        return { ...p, total_price: newTotal, engine_base: newBase, engine_base_tax: newBaseTax };
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
      // GST on the global charge (additional_tax) — shown as a sub-row.
      tax: Number(g.tax) || Number(g.additional_tax) || 0,
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

  // Export the live pricing calculation to Excel. Driven by the engine response
  // (pricingTotals) so the file matches the on-screen totals exactly, with live
  // formulas seeded from those cached values. See utils/quoteExcel.js.
  const handleDownloadExcel = useCallback(() => {
    try {
      downloadQuoteExcel({
        rfq,
        products,
        globalCharges,
        pricingTotals,
        vendorGSTIN,
        showTechEvalRestrictions,
      });
    } catch (e) {
      console.error("Quote Excel export failed", e);
      toast.error("Couldn't generate the Excel. Please try again.");
    }
  }, [rfq, products, globalCharges, pricingTotals, vendorGSTIN, showTechEvalRestrictions]);

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
    const base = visibleStepsFor({ hasTechEval, showClarStep });
    // Mark the steps that hold an outstanding ask so the stepper can point at
    // them. A vendor who lands mid-wizard has no other way to tell which tab
    // the buyer is waiting on.
    const flagged = base.map((s) => ({
      ...s,
      negotiation: negotiationSummary.steps.has(s.id),
    }));
    // In read-only flows the last step is a snapshot of what's been
    // submitted — there's nothing to confirm anymore, so rename the label.
    // NOT when a round is live: the vendor can and must still submit, and
    // calling it a snapshot is what convinced them the RFQ was closed.
    if (isBidExpired && !hasAnyNegotiation) {
      return flagged.map((s) =>
        s.id === "review"
          ? { ...s, label: "Review", meta: "Snapshot of your submitted quote" }
          : s
      );
    }
    return flagged;
  }, [hasTechEval, showClarStep, isBidExpired, hasAnyNegotiation, negotiationSummary]);
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
    // Clauses arrive asynchronously (fetchVendorAgreement, one call per product).
    // Until they land, evalAnswered and evalTotalClauses are BOTH 0, so the
    // `!==` below is false and the gate reads as satisfied. That was harmless
    // while this only guarded forward navigation, but it is not harmless now
    // that canSubmit consults it — an unanswered quote could go out in the
    // window before the clause lists resolve. Treat "not loaded yet" as not
    // answered.
    if (techLoading) return false;
    if (evalProducts.some((p) => !techClauses[p.id])) return false;
    if (evalTotalClauses === 0) return false;
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
  }, [evalProducts, evalAnswered, evalTotalClauses, techClauses, techResponses, techLoading]);

  const canContinueStep1 = acceptedTerms;
  const canContinueStep2 = evalGateOk;

  /**
   * Whether this line must state a delivery period before the quote can go out.
   *
   * A fresh quote always must. During a negotiation round it must only if the
   * buyer actually opened delivery_period — because that is exactly when the
   * input is editable (see the `disabled` on the delivery field below, which
   * asks the same question).
   *
   * Requiring it unconditionally is what deadlocked RFQ 560: quotes submitted
   * before the delivery period became mandatory store '', the round opened
   * only base_price, and the vendor was handed a required field that was
   * simultaneously disabled — with no way to satisfy either. Tying the
   * requirement to editability keeps the rule for every quote that can
   * actually meet it, and drops it only where meeting it is impossible.
   */
  const deliveryRequired = useCallback(
    (p) => {
      if (!isBidExpired) return true;
      return (negotiationFields[p.id] || []).some(
        (f) => f.name === "delivery_period" && f.targetPrice != null && f.targetPrice !== ""
      );
    },
    [isBidExpired, negotiationFields]
  );

  // Pricing step (step 3): at least one product priced, with delivery where
  // the vendor is in a position to supply it.
  const canContinueStep3 = useMemo(() => {
    if (!products.length) return false;
    return products.some(
      (p) =>
        isLinePriced(p) &&
        (!deliveryRequired(p) || (parseInt(p.delivery_period) || 0) > 0)
    );
  }, [products, deliveryRequired]);
  /**
   * Commercial terms step (step 4): valid GSTIN (or empty) + payment terms
   * that sum to 100.
   *
   * Gated on the same principle as deliveryRequired above: require a field
   * only where the vendor can actually edit it. After bid expiry
   * Step4CommercialTerms disables every payment-term input unless the round
   * raised an RFQ-level ask on payment_terms. Demanding a correction there is
   * a dead end, not a safeguard — it deadlocked base_price-only rounds, where
   * a quote carrying a payment row with no stored `type` (the select still
   * DISPLAYS "advance") could never reach Review & submit.
   *
   * The stored values are already on record and go out unchanged, so nothing
   * is validated away — the check simply moves to where it can be satisfied.
   *
   * GSTIN is the one field that USED to be listed here and no longer is. It
   * was skipped post-expiry only because the input locked on bid expiry; that
   * lock left a vendor invited to a round with no GSTIN on file unable to
   * supply one (215 of 331 production quotes on negotiated RFQs are blank).
   * The input is now editable whenever the quote is, so by this same rule the
   * format check applies again — the vendor can act on it.
   */
  const paymentTermsEditable =
    !isBidExpired ||
    (negotiationFields.__rfq_level__ || []).some(
      (f) => (f.name || "").toLowerCase() === "payment_terms"
    );
  const canContinueStep4 = useMemo(() => {
    const gstinOk = isValidGstin(vendorGSTIN);
    const validPayment =
      !paymentTermsEditable ||
      (paymentTotal === 100 &&
        paymentTerms
          .filter((t) => t.action !== "delete")
          .every((t) => t.type && (Number(t.value) || 0) > 0));
    return gstinOk && validPayment;
  }, [vendorGSTIN, paymentTotal, paymentTerms, paymentTermsEditable]);
  // evalGateOk belongs here, not only on the step navigation. It used to guard
  // only forward movement through the stepper, and an already-quoted vendor is
  // dropped straight onto Review at load — skipping navigation entirely. That is
  // how RFQ 536289's quote reached the database with six clause-bearing lines
  // priced and zero clauses answered. The server refuses this too
  // (techEvalQuoteGate); this keeps the vendor from getting as far as a 400.
  const canSubmit =
    evalGateOk && canContinueStep3 && canContinueStep4 && !clarBlocksQuote;

  /**
   * Why "Continue to review" is disabled, in the vendor's own terms.
   *
   * A dead button with no stated reason is what turned a locked 80% payment
   * schedule into a support ticket: the inline hints sit beside the fields,
   * but a vendor looking at the disabled button has no idea which one is at
   * fault. This only ever names a condition the vendor can actually act on —
   * anything locked no longer gates the step at all.
   */
  const termsBlockReason = useMemo(() => {
    if (canContinueStep4) return null;
    if (paymentTermsEditable) {
      if (paymentTotal !== 100) {
        return `Payment terms currently total ${paymentTotal}% — they must total 100% to continue.`;
      }
      const incomplete = paymentTerms
        .filter((t) => t.action !== "delete")
        .some((t) => !t.type || (Number(t.value) || 0) <= 0);
      if (incomplete) {
        return "Every payment term needs a type and a percentage above zero.";
      }
    }
    if (!isValidGstin(vendorGSTIN)) {
      return "The GSTIN format looks off — it should be 15 characters, e.g. 29ABCDE1234F1Z5.";
    }
    return null;
  }, [canContinueStep4, paymentTermsEditable, paymentTotal, paymentTerms, isBidExpired, vendorGSTIN]);

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
  // An RFQ-level round negotiates quote-level fields only (payment terms,
  // global charges) and covers no product line, so activeNegotiationProductIds
  // is empty BY DESIGN. The quote is still answerable — on those fields alone.
  const rfqLevelNegotiationActive = (negotiationFields.__rfq_level__ || []).length > 0;
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
      const negotiatedProductCount =
        activeNegotiationProductIds.size ||
        Object.keys(negotiationFields).filter((k) => k !== "__rfq_level__").length;
      return {
        kind: "info",
        title: "Negotiation round in progress — you're invited",
        // A round can target quote-level terms with no product line at all;
        // saying "0 product(s)" there reads as a broken page.
        body: negotiatedProductCount === 0
          ? "The bid deadline has passed, but you've been invited to a negotiation round on this quote's commercial terms. The buyer's target asks are highlighted under Commercial terms; your product lines stay as quoted."
          : `The bid deadline has passed, but you've been invited to a negotiation round on ${negotiatedProductCount} product(s). The buyer's target asks are highlighted on each line.`,
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

  // An RFQ-level `documents` ask is answerable from ANY line as well as from the
  // quote-wide uploader: the buyer wants the file, not a particular attachment
  // point. Lines opened this way carry no product entry in the round, so they
  // must be admitted to the payload explicitly (see filteredProducts) and the
  // server must accept them (rfqController: the documents-only exemption).
  const rfqLevelDocAskActive = (negotiationFields.__rfq_level__ || []).some(
    (f) => (f.name || "").toLowerCase() === "documents"
  );

  // Per-line "is this line fully read-only" — mirrors the `locked` flag computed
  // inside Step3Pricing, so the charges modal (rendered here, outside that
  // component) can disable its fields while still letting the vendor open it.
  const isLineLocked = (p) => {
    if (!p) return false;
    const finalizedLocked =
      p.finalization_status === "Another vendor is finalized" ||
      p.finalization_status === "You are finalized";
    const techLocked =
      showTechEvalRestrictions && p.has_tech_eval && !p.tech_eval_accepted;
    const negSubmitted = !!negotiationQuoteSubmitted[p.id];
    const bidExpiredForProduct =
      isBidExpired && !activeNegotiationProductIds.has(p.id);
    return finalizedLocked || techLocked || negSubmitted || bidExpiredForProduct || isReadOnly;
  };

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
  // A live round means the quote is NOT a read-only archive — the vendor is
  // being asked to change it. Without this exemption the invite banner rendered
  // in the "missed inquiry" warning chrome, under a header that said read-only.
  const reviewOnly = isBidExpired && alreadyQuoted && !missedInquiry && !hasAnyNegotiation;
  // Still the honest meaning: the BID window closed. It no longer implies
  // "read-only" on its own — HeaderStrip checks `liveRound` first, and a live
  // round overrides both the status label and the deadline pill.
  const bidEnded = isBidExpired;
  // The deadline the vendor is actually working to. The bid date is history the
  // moment a round opens; showing it as the only date is what read as "closed".
  const liveRound = useMemo(() => {
    if (!hasAnyNegotiation || negotiationRounds.length === 0) return null;
    return [...negotiationRounds].sort(
      (a, b) => (Number(b.round_number) || 0) - (Number(a.round_number) || 0)
    )[0];
  }, [hasAnyNegotiation, negotiationRounds]);

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
        // Quote-wide pricing method (header convenience column) — seeded from
        // the existing quote when re-visiting; a fresh quote defaults to
        // Traditional.
        setPricingMethod(data.quotations?.[0]?.pricing_method === "MRP" ? "MRP" : "TRADITIONAL");

        const hasQuote = (data.quotations || []).length > 0;
        setAlreadyQuoted(hasQuote);
        // What tbl_quotes holds for THIS quote. Tracked outside the `hasQuote`
        // branch because the profile seed below has to know whether the quote
        // already answered the question — state set in this async handler is
        // not readable again until the next render.
        let storedGstin = "";
        if (hasQuote) {
          // Prefill payment terms + GSTIN + global comment from existing quote
          const qd = data.quote_details || {};
          const q0 = data.quotations?.[0] || {};
          if (qd.gstin) {
            storedGstin = qd.gstin;
            setVendorGSTIN(qd.gstin);
          }
          if (qd.global_comment) setGlobalComment(qd.global_comment);
          // The vendor's quote attachments come back as the top-level
          // `terms_and_conditions_files` (built from tbl_quotes_files for THIS
          // vendor's quote — not the buyer's RFQ files, which are `TERM_files`).
          // Items are { file_url } objects.
          const rawAttachments =
            data.terms_and_conditions_files || q0.terms_and_conditions_files || [];
          const gFiles = (Array.isArray(rawAttachments) ? rawAttachments : [])
            .map((f) => (typeof f === "string" ? f : f?.file_url || f?.file_path || ""))
            .filter(Boolean);
          if (gFiles.length) setGlobalDocumentFiles(gFiles);
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
                // GST on the charge round-trips via additional_tax.
                extra_tax: c.additional_tax == null ? "" : parseFloat(c.additional_tax) || 0,
                extra_tax_mode: c.additional_tax_mode || "percentage",
                comment: c.comment || "",
              }))
            );
          }
          // Already-quoted vendors usually only re-visit pricing step
          setAcceptedTerms(true);
        }

        // GSTIN is a column on tbl_quotes, so it is scoped to ONE quote and
        // every new RFQ opened with an empty box — which vendors read as "the
        // GSTIN I entered was lost". Seed it from the vendor's own company
        // profile, which the platform already holds (422 of 475 vendors) and
        // which purchaseOrderModel already falls back to when it builds a PO.
        //
        // SEED, NEVER OVERRIDE: a quote that carries its own GSTIN keeps it.
        // Delivery-location GSTINs legitimately differ from the head-office
        // one, and that value is what the vendor actually submitted.
        //
        // Only a well-formed profile GSTIN is offered. 18 of 422 production
        // profiles hold junk in this column (truncated to 14 chars, a stray
        // leading ':', one literal password); seeding one would put a value
        // the vendor never typed into the box and then block them at step 4
        // for a format error on it.
        const seeded = seedGstin({
          stored: storedGstin,
          profile: data.vendor_profile_gstin,
        });
        if (seeded.fromProfile) {
          setVendorGSTIN(seeded.value);
          setGstinFromProfile(true);
        }

        // Preload tech-eval clauses & responses for each product that has eval.
        //
        // `/rfq/get-vendor-responses` (fetchVendorAgreement) returns ALL clauses
        // for this vendor — each row carries clause_id, clause_text,
        // clause_files, plus the vendor's previously-saved vendor_response
        // ("I Agree" / "I Dont Agree" / "") and vendor_response_files. So we
        // can drop the separate get-clauses-of-product call and hydrate from
        // a single endpoint, mirroring the working tech-eval page.
        // { [rfqProductId]: true } for products whose whole clause set is already
        // answered. Filled inside the fetch loop below and read by the landing-step
        // decision after it, so it is a plain local, not state — state set inside
        // this async handler is not readable again until the next render.
        const fullyAnsweredAtLoad = {};
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
                  file_url: toFileUrls(r.clause_files)[0] || "",
                  files: toFileUrls(r.clause_files),
                }));
                setTechClauses((prev) => ({ ...prev, [p.id]: clauseList }));

                // Hydrate prior agree / disagree + uploaded reference files.
                // Note: deviation text is NOT stored on vendor_response —
                // it lives in the per-clause chat thread (loaded separately).
                const responses = {};
                let anyAnswered = false;
                let answeredCount = 0;
                rows.forEach((r) => {
                  const mapped = API_TO_RESPONSE(r.vendor_response);
                  if (mapped) {
                    anyAnswered = true;
                    answeredCount++;
                  }
                  responses[r.clause_id] = {
                    response: mapped,
                    comment: "",
                    files: toFileUrls(r.vendor_response_files),
                  };
                });
                // Recorded so the landing step below can tell a vendor who has
                // answered everything from one who has answered some or none.
                // rows.length is the clause count for this product — the API
                // returns one row per clause whether or not it was answered.
                fullyAnsweredAtLoad[p.id] = rows.length > 0 && answeredCount === rows.length;
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

        // If already quoted (update mode) — land on Review so the vendor can
        // re-verify and re-submit, stepping back to pricing or terms if needed.
        //
        // EXCEPT when technical clauses are still unanswered: then land them on
        // the Technical evaluation step instead. Jumping unconditionally to
        // Review is how RFQ 536289 happened — canVisit() returns true for every
        // step at or below the current one, so arriving at Review retroactively
        // unlocked the eval step the vendor had never visited, and the old
        // canSubmit did not consult evalGateOk. A regret converted into a fully
        // priced 14-line quote with zero clauses answered, and the RFQ deadlocked.
        //
        // Landing on the gate is also just the honest answer to "what does this
        // vendor still owe?" — they cannot submit until it is done.
        //
        // The decision itself is made BELOW, after the negotiation fetch: when a
        // round is live the honest landing step is the one holding the ask, and
        // that is not knowable until the rounds are in. Dropping a negotiating
        // vendor on Review is how RFQ 536237 stalled for six rounds — the step
        // they landed on never mentioned the ask, and the editable field was one
        // step back with nothing pointing to it.
        const landingCtx = { hasQuote, built, fullyAnsweredAtLoad, data };

        // Edit eligibility: check bid expiry + active negotiation rounds.
        // Filled by the fetch below and read by the landing decision after it —
        // state set in here is not readable again until the next render.
        let negotiatedFieldKeys = [];
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
              // `??`, not `||`: a numeric target of 0 is a real ask (the buyer
              // wants this charge waived) and `||` would discard it in favour
              // of the legacy `target_price` key, which is usually absent —
              // leaving targetPrice undefined and the field locked.
              targetPrice: f.target ?? f.target_price,
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
              setNegotiationRounds(activeRounds);
            }
            negotiatedFieldKeys = Object.keys(fieldsByProduct);
          } catch (e) {
            console.error("Failed to load negotiation rounds", e);
          } finally {
            if (!cancelled) setNegotiationLoading(false);
          }
        }

        // Landing step — decided here so it can see the live round (see the
        // note above the landingCtx assignment).
        if (!cancelled && landingCtx.hasQuote) {
          const evalAtLoad = landingCtx.built.filter((p) => p.has_tech_eval);
          const clausesOutstanding = evalAtLoad.some(
            (p) => !landingCtx.fullyAnsweredAtLoad[p.id]
          );
          // An unanswered clause still outranks everything — the vendor cannot
          // submit until it is done, so pointing anywhere else is a dead end.
          // Otherwise: a live round means the work is on the step holding the
          // ask; only a quote with nothing outstanding lands on Review.
          const negotiatedStep = negotiatedFieldKeys.some((k) => k !== "__rfq_level__")
            ? "pricing"
            : negotiatedFieldKeys.length > 0
              ? "terms"
              : null;
          const landOn = clausesOutstanding
            ? "eval"
            : negotiatedStep || "review";
          // Resolved through the same helper visibleSteps uses, so the index is
          // right whether or not a Clarifications step is present.
          const steps = visibleStepsFor({
            hasTechEval: evalAtLoad.length > 0,
            showClarStep:
              landingCtx.data.is_tender === 1 &&
              (landingCtx.data.vendor_clarification_date != null ||
                (landingCtx.data.clarifications || []).length > 0),
          });
          const idx = steps.findIndex((s) => s.id === landOn);
          if (idx >= 0) setCurrentStep(idx);
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
          const quoted = parseFloat(product.unit_price);
          // No comparable prior price — an MRP line (which deliberately keeps
          // unit_price blank in client state) or a line the vendor never
          // priced. Keep the buyer's ask, exactly as the charge branch below
          // does when there is no matching charge to compare against.
          //
          // Dropping it here does not merely hide the ask: isFieldNegotiable
          // reads this same list, so a dropped base_price DISABLES the price
          // input for the whole round. Every MRP line was un-repriceable.
          if (!Number.isFinite(quoted) || quoted <= 0) return true;
          return target < quoted;
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
              // Start blank (not 0) so the field is immediately editable.
              amount: "",
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
    // Once the vendor types, the value is theirs and the profile hint no
    // longer describes what is on screen.
    setGstinFromProfile(false);
    setVendorGSTIN(v);
  };
  const changeGlobalComment = (v) => {
    markUnsaved();
    setGlobalComment(v);
  };

  // Quote-wide document upload (mirrors the per-line attach flow).
  const uploadGlobalFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    markUnsaved();
    const urls = [];
    for (const f of files) {
      try {
        const res = await handleUploadFile(f, token);
        const url = res?.data?.[0]?.file_path;
        if (url) urls.push(url);
      } catch (_) {
        toast.error("File upload failed.");
      }
    }
    if (urls.length) setGlobalDocumentFiles((prev) => [...prev, ...urls]);
  };
  const removeGlobalFile = (url) => {
    markUnsaved();
    setGlobalDocumentFiles((prev) => prev.filter((u) => u !== url));
  };

  /* ─────────────────────────── Payment terms ─────────────────────────── */
  const addPaymentTerm = () => {
    markUnsaved();
    setPaymentTerms((prev) => {
      // Default to the first non-"other" type not already used; fall back to
      // "other" (which is repeatable) when advance + credit are both taken.
      const used = new Set(prev.filter((t) => t.action !== "delete").map((t) => t.type));
      const free = PAY_TYPE_OPTIONS.find((o) => o.value !== "other" && !used.has(o.value));
      const type = free ? free.value : "other";
      return [...prev, { id: null, type, value: 0, days: "", comment: "" }];
    });
  };
  const updatePaymentTerm = (i, patch) => {
    markUnsaved();
    setPaymentTerms((prev) => prev.map((t, j) => (i === j ? { ...t, ...patch } : t)));
  };
  const removePaymentTerm = (i) => {
    markUnsaved();
    // Hard-remove the row from the list. Deletions of existing (id'd) terms are
    // still sent to the backend — diffPaymentTerms derives them by comparing
    // against the original snapshot (any original id missing from the current
    // list is treated as deleted).
    setPaymentTerms((prev) => prev.filter((_, idx) => idx !== i));
  };

  /* ─────────────────────────── Submit tech-eval (per-product) ─────────────────────────── */
  const persistTechEvalForProduct = async (productId) => {
    const responses = techResponses[productId] || {};
    const payload = Object.entries(responses)
      // Only submit clauses the vendor actually answered — sending an unmapped
      // / null response makes the backend reject the whole batch.
      .filter(([, r]) => r.response === "agree" || r.response === "disagree")
      .map(([clauseId, r]) => {
      const row = {
        rfq_id: parseInt(id),
        rfq_product_id: productId,
        clause_id: parseInt(clauseId),
        // Backend expects the API labels ("I Agree" / "I Dont Agree"), not the
        // wizard's internal "agree" / "disagree" state values.
        vendor_response: RESPONSE_TO_API[r.response],
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
    // The submit button is disabled under exactly this condition, so this can
    // only fire if a future caller wires up its own control. It used to raise
    // a toast listing every gate at once ("add prices, payment terms, and
    // delivery") — unreachable, and misleading if it ever had fired, since it
    // named fields that may be locked. The reason a vendor can act on now
    // lives in `termsBlockReason`, next to the button that is actually stuck.
    if (!canSubmit) return;
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
          // Exception: an RFQ-level `documents` ask opens every line's uploader,
          // so a line the vendor attached files to must go out even though the
          // round names no product. Without this the file is uploaded, listed,
          // and then silently dropped at submit — worse than a disabled control.
          if (isBidExpired && !activeNegotiationProductIds.has(p.id)) {
            const answersDocAsk =
              rfqLevelDocAskActive && (p.document_files || []).length > 0;
            if (!answersDocAsk) return false;
          }
          return true;
        })
        .map((p) => {
          // total_price comes from the engine via usePreviewTotals; backend
          // will recompute on save so this is purely advisory.
          const total = Number(p.total_price) || 0;
          const isMrp = p.pricing_method === "MRP";

          return {
            id: p.id,
            product_id: p.product_id,
            // Sent so backend validation messages can name the product instead
            // of showing a bare id (e.g. "freight requires a comment").
            product_name: p.product_name,
            variant: p.variant,
            quantity: p.qty,
            // In MRP mode this is the FE-derived base (advisory — the backend
            // always re-derives from entered_mrp/mrp_discount before persisting).
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
            // MRP (tax-inclusive) quoting — audit inputs. Traditional/regret
            // lines carry the method only; the raw MRP fields stay absent.
            pricing_method: isMrp ? "MRP" : "TRADITIONAL",
            ...(isMrp
              ? {
                  entered_mrp: p.entered_mrp === "" ? null : parseFloat(p.entered_mrp) || 0,
                  mrp_discount: p.mrp_discount === "" ? null : parseFloat(p.mrp_discount) || 0,
                  mrp_discount_mode: p.mrp_discount_mode || "percentage",
                }
              : {}),
          };
        });

      // All lines filtered out (finalized / tech-locked / already negotiated /
      // not in an active round). An RFQ-level round is answerable on its
      // quote-level fields alone, so an empty line set is legitimate there —
      // and required: updateQuoteItems rejects any line that has no active
      // round of its own. Anywhere else there is genuinely nothing to send.
      if (!filteredProducts.length && !(alreadyQuoted && rfqLevelNegotiationActive)) {
        // Name the actual reason. "No products" reads as "this inquiry is
        // empty" to a vendor whose real problem is that they have already
        // spent their one response for the round.
        const answeredThisRound = products.some((p) => negotiationQuoteSubmitted[p.id]);
        toast.error(
          answeredThisRound
            ? "You have already submitted your revised quote for this negotiation round. The buyer must open a new round before you can revise it again."
            : "No products are currently open for quoting."
        );
        return;
      }

      // Every filled line must be complete (legacy parity): a priced line
      // needs a delivery period and vice-versa. Fully empty lines pass —
      // they go out as skipped (unit_price 0).
      //
      // Skipped entirely for a line whose delivery period the buyer did not
      // open: the vendor cannot edit that field, so this could only ever
      // reject a revision they are not permitted to fix. See deliveryRequired.
      const hasPartialLine = filteredProducts.some(
        (p) => deliveryRequired(p) && isLinePriced(p) !== (p.delivery_period > 0)
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
        // MRP (tax-inclusive) quoting — quote-wide method (header convenience
        // column); OQ2: the modal sets one method for every line.
        pricing_method: pricingMethod,
        // Vendor's quote-wide attachments. The backend reads this key and stores
        // them in `tbl_quotes_files` (file_type='term_and_condition'), scoped to
        // this vendor's quote — separate from the buyer's RFQ files. getRfqById
        // returns them as the top-level `terms_and_conditions_files`.
        term_and_condition_files: globalDocumentFiles,
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
        liveRound={liveRound}
        onBack={handleBack}
      />

      <Stepper
        steps={visibleSteps}
        currentStep={currentStep}
        canVisit={canVisit}
        onStep={goToStep}
      />

      {/* The invite gets its OWN banner. It used to ride on the `reviewOnly`
          branch below, which meant the one accurate message on the page was
          dressed in "you missed this inquiry" chrome. It also names the steps
          to go to, because the vendor may be looking at any of them. */}
      {hasAnyNegotiation && editStatus.kind !== "success" && editStatus.kind !== "danger" && (
        <div className={styles.negBanner}>
          <AlertTriangle size={16} strokeWidth={2.2} />
          <div className={styles.missedBannerBody}>
            <div className={styles.negBannerTitle}>{editStatus.title}</div>
            <div className={styles.negBannerDetail}>{editStatus.body}</div>
            {negotiationSummary.steps.size > 0 && (
              <div className={styles.negBannerSteps}>
                Open{" "}
                {[...negotiationSummary.steps]
                  .map((sid) => (sid === "pricing" ? "Pricing" : "Commercial terms"))
                  .join(" and ")}{" "}
                to make the change
                {liveRound?.end_date
                  ? ` — this round closes ${fmtShortDate(parseRoundEnd(liveRound.end_date), { includeTime: true })}`
                  : ""}
                .
              </div>
            )}
          </div>
        </div>
      )}

      {(missedInquiry || reviewOnly) && editStatus.kind !== "success" && editStatus.kind !== "danger" && (
        <div className={`${styles.missedBanner} ${reviewOnly ? styles.missedBannerReview : ""}`}>
          <AlertTriangle size={16} strokeWidth={2.2} />
          <div className={styles.missedBannerBody}>
            <div className={styles.missedBannerTitle}>{editStatus.title}</div>
            <div className={styles.missedBannerDetail}>{editStatus.body}</div>
          </div>
        </div>
      )}

      <main className={styles.content}>
         {(editStatus.kind === "success" || editStatus.kind === "danger") && editStatus.title && (
        <StatusBanner status={editStatus} />
          )}
          
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
            pricingMethod={pricingMethod}
            onOpenMethodModal={() => setMethodModalOpen(true)}
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
            gstinFromProfile={gstinFromProfile}
            globalCharges={globalCharges}
            globalDocumentFiles={globalDocumentFiles}
            rfqLevelNegFields={negotiationFields.__rfq_level__ || []}
            token={token}
            onChangeGSTIN={changeGSTIN}
            onChangeGlobalComment={changeGlobalComment}
            onUploadGlobalFiles={uploadGlobalFiles}
            onRemoveGlobalFile={removeGlobalFile}
            onOpenGlobalCharges={() => setGlobalChargesModalOpen(true)}
            onAddPaymentTerm={addPaymentTerm}
            onUpdatePaymentTerm={updatePaymentTerm}
            onRemovePaymentTerm={removePaymentTerm}
            canSubmit={canSubmit && !isReadOnly}
            isReadOnly={isReadOnly}
            isBidExpired={isBidExpired}
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
            negotiationSummary={negotiationSummary}
            onGoToStep={(stepId) => {
              const idx = visibleSteps.findIndex((s) => s.id === stepId);
              if (idx >= 0) goToStep(idx);
            }}
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
          termsBlockReason={termsBlockReason}
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
          onDownloadExcel={handleDownloadExcel}
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
          readOnly={isLineLocked(products[chargesOpenIdx])}
          chargeTypes={lineChargeTypes}
        />
      )}

      {globalChargesModalOpen && (
        <GlobalChargesModal
          charges={globalCharges}
          engineBreakdown={totals.globalCharges}
          negFields={negotiationFields.__rfq_level__ || []}
          bidExpired={isBidExpired}
          readOnly={isReadOnly}
          chargeTypes={globalChargeTypes}
          onClose={() => setGlobalChargesModalOpen(false)}
          onAddCharge={(name) => {
            markUnsaved();
            setGlobalCharges((prev) => [
              ...prev,
              {
                _id: genLocalId("gc"),
                name,
                // Start blank (not 0) so the field is immediately editable.
                amount: "",
                amount_mode: "percentage",
                // Optional GST on the charge (maps to additional_tax on save).
                extra_tax: "",
                extra_tax_mode: "percentage",
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

      <QuoteMethodModal
        open={methodModalOpen}
        current={pricingMethod}
        onClose={() => setMethodModalOpen(false)}
        onSelect={(method) => {
          markUnsaved();
          setPricingMethod(method);
          // MRP lines are always percentage-GST (tax is extracted from within the
          // price). Reset any absolute tax_mode a line carried over from Traditional
          // so it can't break the MRP round-trip; the server enforces this too.
          setProducts((prev) =>
            prev.map((p) =>
              method === "MRP"
                ? { ...p, pricing_method: method, tax_mode: "percentage" }
                : { ...p, pricing_method: method }
            )
          );
          setMethodModalOpen(false);
        }}
      />

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
const HeaderStrip = ({ rfq, pageType, alreadyQuoted, totalSteps, bidEnded, liveRound, onBack }) => {
  const isTender = rfq?.is_tender === 1;
  // A live round outranks the bid window: the vendor IS being asked to revise,
  // so the status must not read "Read-only" and the date must not be the dead
  // bid date. Saying both is what stalled RFQ 536237 for six rounds.
  const status = liveRound
    ? { label: `Negotiation R${liveRound.round_number} · Revision requested`, dot: "warn" }
    : bidEnded
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
          {liveRound ? (
            <span className={`${styles.pill} ${styles.warn}`}>
              <Clock size={12} />
              {`Respond by · ${fmtShortDate(parseRoundEnd(liveRound.end_date), { includeTime: true })}`}
            </span>
          ) : (
            rfq?.bid_end_date && (
              <span className={`${styles.pill} ${bidEnded ? styles.danger : styles.warn}`}>
                <Clock size={12} />
                {bidEnded
                  ? `Already ended · ${fmtShortDate(rfq.bid_end_date)}`
                  : `Deadline · ${fmtShortDate(rfq.bid_end_date)}`}
              </span>
            )
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
                } ${s.negotiation ? styles.stepNegotiation : ""}`}
                disabled={disabled}
                data-negotiation={s.negotiation ? "true" : "false"}
                onClick={() => onStep(i)}
              >
                <div className={styles.stepNum}>
                  <span className={styles.stepNumText}>{i + 1}</span>
                </div>
                <div className={styles.stepLabelWrap}>
                  <div className={styles.stepLabel}>
                    {s.label}
                    {/* The only cue that this tab is the one the buyer is
                        waiting on. A vendor landing mid-wizard has no other. */}
                    {s.negotiation && (
                      <span className={styles.stepNegBadge}>
                        Negotiation
                      </span>
                    )}
                  </div>
                  <div className={styles.stepMeta}>
                    {s.negotiation ? "Buyer has asked for a revision here" : s.meta}
                  </div>
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
  // Ids wire the real checkbox to its visible title (accessible name) and to
  // the explanatory line below it (accessible description).
  const acceptId = useId();
  const acceptTitleId = `${acceptId}-title`;
  const acceptDescId = `${acceptId}-desc`;

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

      {/* Contractual acceptance gate — step 1 can't be left until it's ticked,
          so it MUST be a real <input type="checkbox">: keyboard operation,
          focus, and the announced checked state all come from the control
          itself. The input is visually hidden (never display:none, which
          would drop it out of the tab order) behind the styled `.checkBox`
          span, which mirrors `:checked` and `:focus-visible`. */}
      <label
        className={`${styles.check} ${accepted ? styles.checked : ""} ${missedInquiry ? styles.checkDisabled : ""}`}
      >
        <input
          type="checkbox"
          className={styles.checkInput}
          checked={accepted}
          disabled={missedInquiry}
          aria-labelledby={acceptTitleId}
          aria-describedby={acceptDescId}
          onChange={() => {
            if (missedInquiry) return;
            onToggleAccept();
          }}
        />
        <span className={styles.checkBox} aria-hidden="true" />
        <div className={styles.checkBody}>
          <div className={styles.checkTitle} id={acceptTitleId}>
            I have read and accept the terms &amp; conditions above.
          </div>
          <div className={styles.checkDesc} id={acceptDescId}>
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
                    <React.Fragment key={`g-${gc.label}`}>
                      <div className={styles.breakdownRow}>
                        <span className={styles.lbl}>
                          <span className={`${styles.swatch} ${styles.bdGlobal}`} /> {gc.label}
                        </span>
                        <span className={styles.val}>₹ {fmtINR(gc.amount)}</span>
                      </div>
                      {gc.tax > 0 && (
                        <div className={`${styles.breakdownRow} ${styles.breakdownSub}`}>
                          <span className={styles.lbl}>
                            <span className={styles.subBranch} /> GST on {gc.label.toLowerCase()}
                          </span>
                          <span className={styles.val}>₹ {fmtINR(gc.tax)}</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.emptyHero}>
            <div className={styles.ic}>
              <IndianRupee size={20} strokeWidth={1.8} />
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
  pricingMethod,
  onOpenMethodModal,
}) => {
  // `documents` is an RFQ-LEVEL field ("RFQ Documents", NegotiationFieldsSelect).
  // A round raising it stores one `is_rfq_level` entry and no product entry, so
  // negotiationFields[productId] is empty and isFieldNegotiable("documents")
  // below is false for every line — the per-line uploader CANNOT unlock, and
  // should not: the answer belongs in the quote-wide uploader on the Commercial
  // terms step, which that same ask does unlock.
  //
  // Unlocking this one instead would be wrong twice over: it writes to the
  // line's document_files, which the buyer never asked about, and updateQuoteItems
  // rejects any line with no active round of its own.
  //
  // What was missing was any way for the vendor to know that. Reported on RFQ
  // 536363 (round 952 — ACTIVE, is_rfq_level, field `documents`): the vendor saw
  // a greyed "Attach supporting documents" here and concluded they were blocked,
  // with the working uploader one step away and unmentioned.
  const rfqLevelDocAsk = (negotiationFields?.__rfq_level__ || []).find(
    (f) => (f.name || "").toLowerCase() === "documents"
  );
  const hasGlobalCharges = (globalCharges || []).some(
    (c) => c.name && c.name.trim() && Number.isFinite(parseFloat(c.amount))
  );
  const activeGlobalCount = (globalCharges || []).filter(
    (c) => c.name && c.name.trim()
  ).length;
  return (
    <div className={styles.stepPane}>
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
        {/* MRP (tax-inclusive) quoting — quote-wide method chip. Opens the
            shared selection modal; selecting a method maps it onto every
            product line (OQ2: quote-wide, per-line grain only for audit). */}
        <button
          type="button"
          className={styles.pill}
          style={{ cursor: isReadOnly ? "default" : "pointer", flexShrink: 0 }}
          onClick={() => !isReadOnly && onOpenMethodModal?.()}
          disabled={isReadOnly}
        >
          Method: {pricingMethod === "MRP" ? "MRP (tax-inclusive)" : "Traditional"}
          {!isReadOnly && <span style={{ marginLeft: 6, color: "var(--fg-3, #71717a)" }}>▸ change</span>}
        </button>
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
            // Charges total shown on the line pill INCLUDES each charge's GST
            // so it matches the grand-total breakdown in the summary panel.
            const chargesTotal = (p.other_charges || []).reduce((s, c) => {
              if (!c.name) return s;
              return s + computeChargeBreakdown(c, p).total;
            }, 0);
            // A charge waived to zero still EXISTS — hiding it here left the vendor
            // no way to see the charge the buyer had just negotiated to 0.
            const hasCharges = (p.other_charges || []).some(
              (c) => c.name && Number.isFinite(parseFloat(c.amount))
            );
            const negFields = (negotiationFields && negotiationFields[p.id]) || [];
            // The documents controls are gated separately from `locked`.
            // `bidExpiredForProduct` freezes lines the round did not name — which
            // is exactly what a quote-wide `documents` ask overrides, since the
            // buyer wants the file, not a particular attachment point. The real
            // locks (finalized, tech-eval, already re-quoted, read-only) still
            // apply; only the not-named-by-this-round freeze is lifted, and only
            // for these two controls.
            const docsLocked =
              finalizedLocked ||
              techLocked ||
              negSubmitted ||
              isReadOnly ||
              (bidExpiredForProduct && !rfqLevelDocAsk);
            const docsEditable =
              !docsLocked &&
              (!isBidExpired ||
                !!rfqLevelDocAsk ||
                negFields.some(
                  (f) =>
                    f.name === "documents" &&
                    f.targetPrice != null &&
                    f.targetPrice !== ""
                ));
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

            // `.lineCard.locked` sets `pointer-events: none` on the WHOLE card.
            // On an RFQ-level `documents` round every line is frozen (the round
            // names no product), so that class landed on the one card whose
            // uploader had deliberately been left enabled — the input read
            // `disabled={false}` and was still dead to the mouse (RFQ 536312).
            // Every other control in here is `disabled` in its own right, so the
            // blanket pointer/opacity treatment buys nothing; drop it while the
            // uploader is live and keep a muted background so the line still
            // reads as mostly frozen.
            return (
              <div
                className={`${styles.lineCard} ${
                  locked && !docsEditable ? styles.locked : ""
                } ${locked && docsEditable ? styles.lineCardDocsLive : ""}`}
                key={p.id}
              >
                <div className={styles.lineHead}>
                  <div className={styles.lineHeadLeft}>
                    <div className={styles.numChip}>{String(idx + 1).padStart(2, "0")}</div>
                    <div>
                      <div className={styles.lineTitle}>{p.product_name}</div>
                      {p.size && (
                        <div className={styles.lineDesc}>
                          <span className={styles.lineLabel}>Product size: </span>
                          {p.size}
                        </div>
                      )}
                      <div className={styles.lineDesc}>
                        <span className={styles.lineLabel}>Product specification: </span>
                        {p.detailedSpec || p.product_description || "—"}
                      </div>
                      {p.buyer_comment && (
                        <div className={styles.lineDesc}>
                          <span className={styles.lineLabel}>Comment: </span>
                          {p.buyer_comment}
                        </div>
                      )}
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {hasCharges && (
                          <span className={styles.pill}>
                            <Check size={10} strokeWidth={2.5} />
                            {(p.other_charges || []).filter((c) => c.name).length} extra charge
                            {((p.other_charges || []).filter((c) => c.name).length || 0) > 1 ? "s" : ""}
                          </span>
                        )}
                        {isLinePriced(p) ? (
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
                      {p.pricing_method === "MRP" ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <label className={styles.label}>
                              MRP <span className={styles.req}>*</span>
                            </label>
                            <div className={styles.inputGroup}>
                              <div className={styles.prefix}>₹</div>
                              <input
                                type="number"
                                className={`${styles.input} ${styles.inputNum}`}
                                value={p.entered_mrp ?? ""}
                                onChange={(e) =>
                                  onUpdateProduct(idx, { entered_mrp: e.target.value })
                                }
                                placeholder="0.00"
                                min={0}
                                step="0.01"
                                onWheel={(e) => e.currentTarget.blur()}
                                disabled={locked}
                              />
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <label className={styles.label}>Discount</label>
                            <div className={styles.taxField}>
                              <input
                                type="number"
                                className={styles.taxInput}
                                value={p.mrp_discount ?? ""}
                                onChange={(e) =>
                                  onUpdateProduct(idx, { mrp_discount: e.target.value })
                                }
                                placeholder="0"
                                min={0}
                                onWheel={(e) => e.currentTarget.blur()}
                                disabled={locked}
                              />
                              <div className={styles.modeSeg} role="group" aria-label="Discount mode">
                                <button
                                  type="button"
                                  className={p.mrp_discount_mode === "percentage" ? styles.modeSegActive : ""}
                                  onClick={() => onUpdateProduct(idx, { mrp_discount_mode: "percentage" })}
                                  disabled={locked}
                                  aria-pressed={p.mrp_discount_mode === "percentage"}
                                >
                                  %
                                </button>
                                <button
                                  type="button"
                                  className={p.mrp_discount_mode === "absolute" ? styles.modeSegActive : ""}
                                  onClick={() => onUpdateProduct(idx, { mrp_discount_mode: "absolute" })}
                                  disabled={locked}
                                  aria-pressed={p.mrp_discount_mode === "absolute"}
                                >
                                  ₹
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
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
                            // Not `!nf?.targetPrice`: a target of 0 is a real
                            // ask. isFieldNegotiable already unlocks the field
                            // for it, so the truthiness check unlocked the
                            // input while hiding what to aim at.
                            if (nf?.targetPrice == null || nf.targetPrice === "") return null;
                            return (
                              <div className={styles.negHint}>
                                <span className={styles.negHintDot} />
                                Buyer's ask: <span className={styles.mono}>₹{fmtINR(nf.targetPrice)}</span>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>

                    <div>
                      <label className={styles.label}>
                        {p.pricing_method === "MRP" ? "GST % (extracted from MRP)" : "Tax (GST)"}
                      </label>
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
                        {p.pricing_method === "MRP" ? (
                          // MRP: GST is always a percentage extracted from within the
                          // price — no ₹ option (an absolute GST would break the MRP
                          // round-trip; the server also forces percentage).
                          <div className={styles.modeSeg} role="group" aria-label="Tax mode">
                            <button
                              type="button"
                              className={styles.modeSegActive}
                              disabled
                              aria-pressed={true}
                            >
                              %
                            </button>
                          </div>
                        ) : (
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
                        )}
                      </div>
                      {(() => {
                        const ntx =
                          negByName("unit_price") || negByName("base_price") || negByName("price");
                        return (
                          <BuyerAskHint
                            label="Buyer's ask (tax)"
                            mono={false}
                            value={ntx?.taxDemand}
                          />
                        );
                      })()}
                    </div>

                    <div>
                      <label className={styles.label}>Other charges</label>
                      <button
                        type="button"
                        className={`${styles.chargesTrigger} ${
                          hasCharges ? styles.chargesActive : ""
                        }`}
                        onClick={() => onOpenCharges(idx)}
                        // Stays clickable when locked so the vendor can OPEN and
                        // review existing charges (the modal's fields are
                        // read-only). Only disabled when locked AND there's
                        // nothing to review.
                        disabled={locked && !hasCharges}
                        style={locked && hasCharges ? { pointerEvents: "auto" } : undefined}
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
                      {(() => {
                        const n = (p.other_charges || []).filter((c) =>
                          negFields.some((f) => f.name === c.name || f.name === c.slug)
                        ).length;
                        if (!n) return null;
                        return (
                          <div className={styles.negHint}>
                            <span className={styles.negHintDot} />
                            Buyer's ask on {n} charge{n > 1 ? "s" : ""} — open to review
                          </div>
                        );
                      })()}
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
                      <BuyerAskHint value={fmtNegTarget(negByName("delivery_period"), "days")} />
                    </div>
                  </div>
                  {p.pricing_method === "MRP" && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--fg-3, #71717a)" }}>
                      Base ₹{fmtINR(p.engine_base || 0)} · GST ₹{fmtINR(p.engine_base_tax || 0)} · Buyer pays ₹
                      {fmtINR(p.total_price || 0)}
                    </div>
                  )}
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
                      <BuyerAskHint
                        mono={false}
                        value={
                          fmtNegTarget(negByName("comment"), "text") ||
                          negByName("comment")?.demand
                        }
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
                          disabled={!docsEditable}
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
                      {(() => {
                        const asks = parseDocAsks(negByName("documents"));
                        if (asks.demand) {
                          return <BuyerAskHint mono={false} value={asks.demand} />;
                        }
                        // No ask on this line, but one on the whole quote — say
                        // so, and name the step that can actually answer it.
                        if (rfqLevelDocAsk) {
                          const rfqAsks = parseDocAsks(rfqLevelDocAsk);
                          return (
                            <BuyerAskHint
                              mono={false}
                              label="Buyer's document request"
                              value={`${rfqAsks.demand ? `${rfqAsks.demand} — a` : "A"}pplies to the whole quote. Attach here or under Commercial terms.`}
                            />
                          );
                        }
                        return null;
                      })()}
                      {(p.document_files || []).map((u, di) => {
                        const ask = docAskFor(parseDocAsks(negByName("documents")), u, di);
                        return (
                        <div key={u}>
                        <div className={styles.uploadedFile}>
                          <Download size={12} style={{ color: "var(--fg-3)" }} />
                          <span className={styles.name}>{u.split("/").pop()}</span>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            disabled={!docsEditable}
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
                        <DocAskComment comment={ask} />
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Foot */}
                <div className={styles.lineFoot}>
                  <div className={styles.lineFootBadges}>
                    <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                      <span className={styles.mono}>{p.qty}</span> ×{" "}
                      <span className={styles.mono}>
                        {/* MRP lines carry no unit_price — show the derived base
                            rather than a dash on a fully-priced line. */}
                        {lineUnitBase(p) > 0 ? `₹${fmtINR(lineUnitBase(p))}` : "—"}
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
  gstinFromProfile = false,
  globalCharges,
  globalDocumentFiles = [],
  rfqLevelNegFields = [],
  token,
  onChangeGSTIN,
  onChangeGlobalComment,
  onUploadGlobalFiles,
  onRemoveGlobalFile,
  onOpenGlobalCharges,
  onAddPaymentTerm,
  onUpdatePaymentTerm,
  onRemovePaymentTerm,
  canSubmit,
  isReadOnly,
  isBidExpired = false,
}) => {
  const hasGlobalCharges = (globalCharges || []).some(
    (c) => c.name && c.name.trim() && Number.isFinite(parseFloat(c.amount))
  );
  const activeGlobalCount = (globalCharges || []).filter(
    (c) => c.name && c.name.trim()
  ).length;
  const gstinClean = String(vendorGSTIN || "").trim().toUpperCase();
  const gstinValid = isValidGstin(gstinClean);
  // Buyer's RFQ-level negotiation asks (payment terms, global comment) — keyed
  // by field name; the global-charge asks are surfaced inside GlobalChargesModal.
  const rfqAsk = (name) =>
    (rfqLevelNegFields || []).find((f) => (f.name || "").toLowerCase() === name);
  // During the negotiation phase (after bid expiry) only the RFQ-level fields
  // the buyer explicitly raised an ask on may be edited. Before expiry every
  // field is editable (still subject to isReadOnly). GSTIN is exempt: it
  // carries no price, so the backend deliberately leaves it un-guarded during
  // a round (rfqController.updateQuoteItems) and it stays editable here.
  const isRfqFieldLocked = (name) => {
    if (isReadOnly) return true;
    if (!isBidExpired) return false;
    return !rfqAsk(name);
  };
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const attachmentCount = (globalDocumentFiles || []).length;

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
            {gstinValid
              ? gstinFromProfile
                // Answers the question the vendor was actually asking — "did I
                // fill this in, or is the form showing me someone else's
                // value?" — and says plainly that they can change it.
                ? "Prefilled from your company profile. Edit it if this delivery location bills under a different GSTIN."
                : "Used to issue invoices for the delivery location."
              : "GSTIN format looks off — should be 15 characters (e.g. 29ABCDE1234F1Z5)."}
          </div>
        </div>

        <div className={styles.cardSection}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
            <div style={{ flex: "1 1 calc(50% - 8px)", minWidth: 240, display: "flex", flexDirection: "column" }}>
              <label className={styles.label}>
                Global comment <span className={styles.labelMeta}>visible to buyer</span>
              </label>
              <textarea
                className={styles.textarea}
                value={globalComment}
                onChange={(e) => onChangeGlobalComment(e.target.value)}
                placeholder="Any quote-wide notes — packaging, batching, conditions, etc."
                maxLength={500}
                disabled={isRfqFieldLocked("global_comment")}
                style={{ flex: 1 }}
              />
              <BuyerAskHint
                mono={false}
                value={
                  fmtNegTarget(rfqAsk("global_comment"), "text") ||
                  rfqAsk("global_comment")?.demand
                }
              />
            </div>
            <div style={{ flex: "1 1 calc(50% - 8px)", minWidth: 240, display: "flex", flexDirection: "column" }}>
              <label className={styles.label}>
                Attachments <span className={styles.labelMeta}>visible to buyer · optional</span>
              </label>
              <label
                className={styles.uploadMini}
                style={{ width: "100%", justifyContent: "center", padding: 14 }}
              >
                <Download size={13} style={{ transform: "rotate(180deg)" }} />
                Attach quote-wide documents
                <input
                  type="file"
                  multiple
                  disabled={isRfqFieldLocked("documents")}
                  onChange={async (e) => {
                    await onUploadGlobalFiles?.(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {attachmentCount > 0 && (
                <button
                  type="button"
                  className={`${styles.chargesTrigger} ${styles.chargesActive}`}
                  style={{ marginTop: 8 }}
                  onClick={() => setFilesModalOpen(true)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Paperclip size={12} strokeWidth={2.2} />
                    <span>
                      {attachmentCount} file{attachmentCount > 1 ? "s" : ""} attached
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                    <Eye size={13} /> View files
                  </span>
                </button>
              )}
              {filesModalOpen && (
                <GlobalFilesModal
                  files={globalDocumentFiles}
                  readOnly={isRfqFieldLocked("documents")}
                  onRemove={onRemoveGlobalFile}
                  onUpload={onUploadGlobalFiles}
                  onClose={() => setFilesModalOpen(false)}
                  docAsks={parseDocAsks(rfqAsk("documents"))}
                />
              )}
              {(() => {
                const asks = parseDocAsks(rfqAsk("documents"));
                if (!asks.demand && asks.comments.length === 0) return null;
                return (
                  <>
                    {asks.demand && <BuyerAskHint mono={false} value={asks.demand} />}
                    {asks.comments.length > 0 && (
                      <BuyerAskHint
                        mono={false}
                        label="Buyer's ask"
                        value={`commented on ${asks.comments.length} document${asks.comments.length > 1 ? "s" : ""} — open “View files”`}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>
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
              // Stays clickable in read-only so the vendor can review existing
              // global charges; the modal's fields are disabled. Only blocked
              // when read-only AND there's nothing to review.
              disabled={isReadOnly && activeGlobalCount === 0}
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
          <BuyerAskHint
            mono={false}
            value={
              fmtNegTarget(rfqAsk("payment_terms"), "text") ||
              rfqAsk("payment_terms")?.demand
            }
          />

          <div className={styles.payList}>
            {paymentTerms.map((t, i) => {
              const isDeleted = t.action === "delete";
              // Each type can be picked only once — hide types already used by
              // OTHER rows. "other" is always available (repeatable), and the
              // row's own current type stays so it renders as selected.
              const usedByOthers = new Set(
                paymentTerms
                  .filter((pt, idx) => idx !== i && pt.action !== "delete")
                  .map((pt) => pt.type)
              );
              const typeOptions = PAY_TYPE_OPTIONS.filter(
                (o) => o.value === "other" || o.value === (t.type || "advance") || !usedByOthers.has(o.value)
              );
              // The combined % can't exceed 100 — cap this row's value to
              // whatever's left after the other (non-deleted) rows.
              const othersValueSum = paymentTerms.reduce(
                (s, pt, idx) =>
                  idx !== i && pt.action !== "delete" ? s + (Number(pt.value) || 0) : s,
                0
              );
              const maxValue = Math.max(0, 100 - othersValueSum);
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
                    disabled={isDeleted || isRfqFieldLocked("payment_terms")}
                  >
                    {typeOptions.map((o) => (
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
                      max={maxValue}
                      value={t.value ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          onUpdatePaymentTerm(i, { value: "" });
                          return;
                        }
                        let v = Number(raw);
                        if (!Number.isFinite(v) || v < 0) v = 0;
                        // Clamp so the combined % never goes over 100.
                        onUpdatePaymentTerm(i, { value: Math.min(v, maxValue) });
                      }}
                      disabled={isDeleted || isRfqFieldLocked("payment_terms")}
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
                          onUpdatePaymentTerm(i, {
                            days: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        disabled={isDeleted || isRfqFieldLocked("payment_terms")}
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
                      disabled={isDeleted || isRfqFieldLocked("payment_terms")}
                    />
                  )}
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onRemovePaymentTerm(i)}
                    disabled={(isDeleted && paymentTerms.length === 1) || isRfqFieldLocked("payment_terms")}
                    aria-label="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
            {!isRfqFieldLocked("payment_terms") && (
              <button
                type="button"
                className={styles.payAdd}
                onClick={onAddPaymentTerm}
                // Nothing left to allocate once the terms already total 100%.
                disabled={paymentTotal >= 100}
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
  negotiationSummary,
  onGoToStep,
}) => {
  // MRP-aware — see isLinePriced. Testing unit_price here is what told vendors
  // their priced MRP lines would be "marked as regret".
  const priced = products.filter(isLinePriced);
  const skipped = products.filter((p) => !isLinePriced(p));
  const activeGlobalCharges = (globalCharges || []).filter(
    (c) => c.name && c.name.trim() && Number.isFinite(parseFloat(c.amount))
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

      {/* Above the warnings on purpose: this is the reason the vendor is on
          this page at all, and the numbers below are the ones NOT yet changed. */}
      <NegotiationCallout summary={negotiationSummary} onGoToStep={onGoToStep} />

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
                // Per-unit base: quoted directly on Traditional lines, derived
                // from MRP − discount on MRP ones.
                const unit = lineUnitBase(p);
                // Prefer the engine-computed total (includes per-line charges + tax)
                // and fall back to qty × unit only if it hasn't synced yet.
                const lineTotal = Number(p.total_price) > 0 ? Number(p.total_price) : unit * qty;
                const chargesCount = (p.other_charges || p.charges || []).filter((c) => c.name).length;
                const isSkipped = !isLinePriced(p);
                const provenance = p.pricing_method === "MRP" ? mrpProvenance(p) : "";
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
                          {provenance ? ` · ${provenance}` : ""}
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
                      {activeGlobalCharges.map((c, i) => {
                        // Show the engine-computed value (amount + GST), not the
                        // raw "10%" input. b.amount is the charge's full
                        // contribution incl GST; net = b.amount − b.tax.
                        const b =
                          (totals?.globalCharges || []).find(
                            (g) => (g.label || "").toLowerCase() === (c.name || "").toLowerCase()
                          ) || { amount: 0, tax: 0 };
                        const total = Number(b.amount) || 0;
                        const gst = Number(b.tax) || 0;
                        const net = total - gst;
                        return (
                          <div key={i} className={styles.reviewChargeRow}>
                            <span>{c.name}</span>
                            <span className={styles.mono}>
                              ₹ {fmtINR(total)}
                              {gst > 0 ? ` (₹${fmtINR(net)} + ₹${fmtINR(gst)} GST)` : ""}
                            </span>
                          </div>
                        );
                      })}
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
  termsBlockReason,
  canSubmit,
  evalAnswered,
  evalTotal,
  totals,
  submitting,
  onPrev,
  onNext,
  onSubmit,
  onRegret,
  onDownloadExcel,
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
    if (currentStepId === "terms") {
      return termsBlockReason || "Fill in commercial terms — GSTIN, payment schedule and any global charges.";
    }
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

          {(currentStepId === "pricing" || currentStepId === "terms" || currentStepId === "review") && totals.grand > 0 && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onDownloadExcel}
              title="Download the pricing calculation as an Excel sheet"
            >
              <Download size={13} />
              Download Excel
            </button>
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

// Zero is a legitimate amount, not a missing one. A buyer can and does open a
// negotiation asking for freight at 0, and the round auto-adds that charge at
// exactly `amount: 0` (see the negotiated-charge injector above) — so
// rejecting 0 here made the form contradict the ask it had just rendered, and
// left the vendor unable to close this modal at all. 110 of the 490 charge
// entries already stored in production are zero-amount.
//
// Blank and negative are still errors; only the "> 0" part was wrong.
const validateCharge = (ch, i) => {
  const errs = [];
  if (!ch.name || !ch.name.trim()) errs.push("name missing");
  const amount = parseFloat(ch.amount);
  if (!Number.isFinite(amount)) errs.push("amount is required");
  else if (amount < 0) errs.push("amount cannot be negative");
  // Kept: the server requires a note on every per-product charge
  // (validateProductChargeComments), so dropping it here would only move the
  // rejection from this modal to the submit call.
  if (!(ch.comment || "").trim()) errs.push("note is required");
  return {
    idx: i,
    name: (ch.name || "").trim() || `Charge ${i + 1}`,
    errs,
  };
};

// Money breakdown for a per-line charge, mirroring the pricing engine: the
// amount (a percentage of the line base, or an absolute ₹ value) plus its GST.
// A null/blank tax inherits the product's base rate.
const computeChargeBreakdown = (ch, product) => {
  // MRP lines have no client-side unit_price, so qty × unit_price is 0 and a
  // percentage charge previewed as ₹0.00 on a fully-priced line. The engine's
  // per-line base is the truthful figure there. Traditional lines keep the
  // local arithmetic so the preview tracks typing without waiting on the
  // debounced preview call.
  const base =
    product?.pricing_method === "MRP"
      ? parseFloat(product?.engine_base) || 0
      : (parseFloat(product?.qty) || 0) * (parseFloat(product?.unit_price) || 0);
  const amount =
    ch.amount_mode === "percentage"
      ? (base * (parseFloat(ch.amount) || 0)) / 100
      : parseFloat(ch.amount) || 0;
  const inheritsTax = ch.tax == null || ch.tax === "";
  const taxVal = inheritsTax ? (parseFloat(product?.tax) || 0) : (parseFloat(ch.tax) || 0);
  const taxMode = inheritsTax
    ? (product?.tax_mode || "percentage")
    : (ch.tax_mode || "percentage");
  const tax = taxMode === "percentage" ? (amount * taxVal) / 100 : taxVal;
  return { amount, tax, total: amount + tax };
};

/* Custom charge-type dropdown — replaces the native <select>, whose OS popup
   doesn't match the wizard's design system. Standard types scroll; the
   "+ Custom charge" affordance is pinned to the bottom and expands inline into
   a name field with confirm / cancel buttons (no browser prompt). */
const ChargeTypeDropdown = ({ types, disabled, onPick, existingNames }) => {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const wrapRef = useRef(null);
  const customInputRef = useRef(null);

  const reset = () => {
    setOpen(false);
    setCustomMode(false);
    setCustomName("");
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) reset();
    };
    const onKey = (e) => {
      if (e.key === "Escape") reset();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the custom-name field as soon as it appears.
  useEffect(() => {
    if (customMode) customInputRef.current?.focus();
  }, [customMode]);

  const standardTypes = types.filter((t) => t !== "Custom");
  const hasCustom = types.includes("Custom");
  const allStandardAdded = standardTypes.length === 0;

  const confirmCustom = () => {
    const name = customName.trim();
    if (!name) return;
    if (existingNames && existingNames.has(name.toLowerCase())) {
      toast.error(`"${name}" is already added.`);
      return;
    }
    onPick(name);
    reset();
  };

  return (
    <div className={styles.ddWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.ddTrigger}
        onClick={() => (open ? reset() : setOpen(true))}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.ddPlaceholder}>
          {allStandardAdded
            ? "All standard charge types added — use Custom"
            : "Select charge type…"}
        </span>
        <ChevronDown
          size={14}
          className={`${styles.ddChevron} ${open ? styles.ddChevronOpen : ""}`}
        />
      </button>
      {open && (
        <div className={styles.ddMenu} role="listbox">
          {standardTypes.length > 0 && (
            <div className={styles.ddScroll}>
              {standardTypes.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={styles.ddItem}
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onPick(t);
                    reset();
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {hasCustom && (
            customMode ? (
              <div className={styles.ddCustomRow}>
                <input
                  ref={customInputRef}
                  className={styles.ddCustomInput}
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmCustom();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setCustomMode(false);
                      setCustomName("");
                    }
                  }}
                  placeholder="Custom charge name"
                  maxLength={40}
                />
                <button
                  type="button"
                  className={`${styles.ddCustomBtn} ${styles.ddCustomBtnOk}`}
                  onClick={confirmCustom}
                  disabled={!customName.trim()}
                  aria-label="Add custom charge"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  className={styles.ddCustomBtn}
                  onClick={() => {
                    setCustomMode(false);
                    setCustomName("");
                  }}
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.ddItem} ${styles.ddItemCustom}`}
                onClick={() => setCustomMode(true)}
              >
                <Plus size={12} />
                Custom charge
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

const ChargesModal = ({ product, pIdx, onClose, onAddCharge, onUpdateCharge, onRemoveCharge, negFields = [], bidExpired = false, readOnly = false, chargeTypes }) => {
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
  // `readOnly` (finalized / read-only quote) locks every field outright.
  const findNegField = (ch) =>
    negFields.find((f) => f.name === ch.name || f.name === ch.slug);
  const isChargeAmountLocked = (ch) => {
    if (readOnly) return true;
    if (!bidExpired) return false;
    const f = findNegField(ch);
    return !(f && f.targetPrice != null && f.targetPrice !== "");
  };
  const isChargeTaxLocked = (ch) => {
    if (readOnly) return true;
    if (!bidExpired) return false;
    const f = findNegField(ch);
    return !(f && f.taxDemand);
  };

  // Closing (Done / X / backdrop) is blocked while any charge is incomplete —
  // each invalid charge raises a toast naming the field(s) that need fixing,
  // so a half-filled charge can never be silently saved. Read-only quotes have
  // nothing to validate, so they just close.
  const attemptClose = () => {
    if (!readOnly && hasErrors) {
      errorList.forEach((r) => toast.error(`${r.name}: ${r.errs.join(", ")}`));
      return;
    }
    onClose();
  };

  return (
    <div className={styles.modalBackdrop} onClick={(e) => {
      if (e.target === e.currentTarget) attemptClose();
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
          <button type="button" className={styles.iconBtn} onClick={attemptClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.label}>Add charge type</label>
          <ChargeTypeDropdown
            types={availableTypes}
            existingNames={existingNames}
            disabled={availableTypes.length === 0 || bidExpired || readOnly}
            onPick={(v) => onAddCharge(v)}
          />

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
                    disabled={bidExpired || readOnly}
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
                        value={ch.amount ?? ""}
                        onChange={(e) =>
                          onUpdateCharge(ci, {
                            amount: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
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
                      disabled={readOnly}
                    />
                  </div>
                </div>
                {(() => {
                  const b = computeChargeBreakdown(ch, product);
                  return (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px dashed var(--border)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        fontSize: 12,
                        color: "var(--fg-3)",
                      }}
                    >
                      Breakdown:
                      <span className={styles.mono}>₹{fmtINR(b.amount)}</span>
                      <span>amount</span>
                      <span>+</span>
                      <span className={styles.mono}>₹{fmtINR(b.tax)}</span>
                      <span>GST</span>
                      <span>=</span>
                      <span className={styles.mono} style={{ color: "var(--fg)", fontWeight: 600 }}>
                        ₹{fmtINR(b.total)}
                      </span>
                    </div>
                  );
                })()}
                {(() => {
                  const f = findNegField(ch);
                  if (!f) return null;
                  return (
                    <>
                      <BuyerAskHint value={fmtNegTarget(f, "charge")} />
                      <BuyerAskHint label="Buyer's ask (tax)" mono={false} value={f.taxDemand} />
                    </>
                  );
                })()}
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
            onClick={attemptClose}
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

// Same zero rule as validateCharge above. GLOBAL_CHARGE_TYPES literally
// includes "Discount", which could never be stated at all under the old check.
const validateGlobalCharge = (ch, i) => {
  const errs = [];
  if (!ch.name || !ch.name.trim()) errs.push("name missing");
  const amount = parseFloat(ch.amount);
  if (!Number.isFinite(amount)) errs.push("amount is required");
  else if (amount < 0) errs.push("amount cannot be negative");
  if (!(ch.comment || "").trim()) errs.push("note is required");
  return {
    idx: i,
    name: (ch.name || "").trim() || `Charge ${i + 1}`,
    errs,
  };
};

/* ════════════════════════════════════════════════════════════════
   Quote-wide attachments modal — review / add / remove the files that
   accompany the whole quote (mirrors the legacy attachment list, just
   moved off the form into a focused dialog).
   ════════════════════════════════════════════════════════════════ */
const GlobalFilesModal = ({ files = [], readOnly = false, onRemove, onUpload, onClose, docAsks = null }) => {
  const list = Array.isArray(files) ? files : [];
  // Buyer comments that didn't match any currently-uploaded file (e.g. the file
  // was removed/replaced) — still surfaced so nothing the buyer asked is lost.
  const matchedUrls = new Set(
    (docAsks?.comments || [])
      .map((c) => (c.fileUrl && list.includes(c.fileUrl) ? c.fileUrl : null))
      .filter(Boolean)
  );
  const unmatchedComments = (docAsks?.comments || []).filter(
    (c) => !(c.fileUrl && matchedUrls.has(c.fileUrl)) &&
      !(c.index != null && c.index < list.length && !c.fileUrl)
  );
  const prettyName = (u) => {
    try {
      return decodeURIComponent(String(u).split("/").pop() || u);
    } catch (_) {
      return String(u).split("/").pop() || u;
    }
  };
  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} style={{ maxWidth: 560 }}>
        <div className={styles.modalHead}>
          <div>
            <h3>
              Attachments
              <span style={{ fontWeight: 450, color: "var(--fg-3)", marginLeft: 6 }}>
                · visible to buyer
              </span>
            </h3>
            <div className={styles.sub}>
              Quote-wide documents that accompany this submission.
            </div>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          {!readOnly && (
            <label
              className={styles.uploadMini}
              style={{ width: "100%", justifyContent: "center", padding: 12, marginBottom: 14 }}
            >
              <Download size={13} style={{ transform: "rotate(180deg)" }} />
              Attach more documents
              <input
                type="file"
                multiple
                onChange={async (e) => {
                  await onUpload?.(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {list.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--fg-4)", fontSize: 12.5, padding: "24px 0" }}>
              No attachments yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((u, i) => {
                const ask = docAskFor(docAsks, u, i);
                return (
                <div key={u} style={{ display: "flex", flexDirection: "column" }}>
                <div className={styles.uploadedFile} style={{ marginTop: 0 }}>
                  <Paperclip size={12} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
                  <span
                    className={styles.name}
                    title={prettyName(u)}
                    style={{ fontFamily: "inherit", color: "var(--fg-2)" }}
                  >
                    Document {i + 1}
                  </span>
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--accent)",
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={13} /> View doc
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => onRemove?.(u)}
                      aria-label="Remove document"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <DocAskComment comment={ask} />
                </div>
                );
              })}
            </div>
          )}
          {(docAsks?.demand || unmatchedComments.length > 0) && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid var(--border, #e5e7eb)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {docAsks?.demand && (
                <BuyerAskHint
                  mono={false}
                  label="Buyer's ask · documents requested"
                  value={docAsks.demand}
                />
              )}
              {unmatchedComments.map((c, ci) => (
                <BuyerAskHint
                  key={`uc-${ci}`}
                  mono={false}
                  label={c.index != null ? `Buyer's ask · document ${c.index + 1}` : "Buyer's ask"}
                  value={c.comment}
                />
              ))}
            </div>
          )}
        </div>
        <div className={styles.modalFoot}>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
            {list.length} file{list.length === 1 ? "" : "s"}
          </span>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const GlobalChargesModal = ({ charges, onClose, onAddCharge, onUpdateCharge, onRemoveCharge, negFields = [], bidExpired = false, readOnly = false, chargeTypes, engineBreakdown = [] }) => {
  // Engine-computed amount + GST per global charge (matched by name), so the
  // in-modal breakdown equals the grand-total summary exactly.
  const breakdownFor = (name) =>
    engineBreakdown.find(
      (g) => (g.label || "").toLowerCase() === (name || "").toLowerCase()
    ) || { amount: 0, tax: 0 };
  const reports = (charges || []).map(validateGlobalCharge);
  const errorList = reports.filter((r) => r.errs.length > 0);
  const hasErrors = errorList.length > 0;

  const existingNames = new Set((charges || []).map((c) => (c.name || "").toLowerCase().trim()));
  const availableTypes = (chargeTypes || GLOBAL_CHARGE_TYPES).filter(
    (t) => t === "Custom" || !existingNames.has(t.toLowerCase())
  );

  // Post-expiry, only RFQ-level fields the buyer negotiated stay editable
  // (legacy parity); adding or removing global charges is blocked. `readOnly`
  // (finalized / read-only quote) locks every field outright.
  const isChargeLocked = (ch) => {
    if (readOnly) return true;
    if (!bidExpired) return false;
    const f = negFields.find((x) => x.name === ch.name || x.name === ch.slug);
    return !(f && f.targetPrice != null && f.targetPrice !== "");
  };

  // Closing is blocked while any charge is incomplete — each invalid charge
  // raises a toast naming the field(s) to fix, so a half-filled charge can
  // never be silently saved. Read-only quotes just close.
  const attemptClose = () => {
    if (!readOnly && hasErrors) {
      errorList.forEach((r) => toast.error(`${r.name}: ${r.errs.join(", ")}`));
      return;
    }
    onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) attemptClose();
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
          <button type="button" className={styles.iconBtn} onClick={attemptClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.label}>Add charge type</label>
          <ChargeTypeDropdown
            types={availableTypes}
            existingNames={existingNames}
            disabled={availableTypes.length === 0 || bidExpired || readOnly}
            onPick={(v) => onAddCharge(v)}
          />

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
                    disabled={bidExpired || readOnly}
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
                        value={ch.amount ?? ""}
                        onChange={(e) =>
                          onUpdateCharge(ci, {
                            amount: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
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
                  <div>
                    <label className={styles.label}>
                      Tax (GST) <span className={styles.labelMeta}>optional</span>
                    </label>
                    <div className={styles.taxField}>
                      <input
                        className={styles.taxInput}
                        type="number"
                        value={ch.extra_tax == null ? "" : ch.extra_tax}
                        onChange={(e) =>
                          onUpdateCharge(ci, {
                            extra_tax: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        placeholder="0"
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isChargeLocked(ch)}
                      />
                      <div className={styles.modeSeg} role="group" aria-label="Tax mode">
                        <button
                          type="button"
                          className={(ch.extra_tax_mode || "percentage") === "percentage" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { extra_tax_mode: "percentage" })}
                          aria-pressed={(ch.extra_tax_mode || "percentage") === "percentage"}
                          disabled={isChargeLocked(ch)}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={ch.extra_tax_mode === "absolute" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { extra_tax_mode: "absolute" })}
                          aria-pressed={ch.extra_tax_mode === "absolute"}
                          disabled={isChargeLocked(ch)}
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
                      placeholder="e.g. across PO value"
                      maxLength={120}
                      disabled={readOnly}
                    />
                  </div>
                </div>
                {(() => {
                  const b = breakdownFor(ch.name);
                  // The engine's global-charge subtotal already INCLUDES its GST
                  // (it's the charge's full contribution to the grand total), so
                  // the pre-GST amount is subtotal − tax. Adding the tax again
                  // would double-count it.
                  const total = Number(b.amount) || 0;
                  const gst = Number(b.tax) || 0;
                  const net = total - gst;
                  return (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px dashed var(--border)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        fontSize: 12,
                        color: "var(--fg-3)",
                      }}
                    >
                      Breakdown:
                      <span className={styles.mono}>₹{fmtINR(net)}</span>
                      <span>amount</span>
                      <span>+</span>
                      <span className={styles.mono}>₹{fmtINR(gst)}</span>
                      <span>GST</span>
                      <span>=</span>
                      <span className={styles.mono} style={{ color: "var(--fg)", fontWeight: 600 }}>
                        ₹{fmtINR(total)}
                      </span>
                    </div>
                  );
                })()}
                {(() => {
                  const f = negFields.find((x) => x.name === ch.name || x.name === ch.slug);
                  if (!f) return null;
                  return (
                    <>
                      <BuyerAskHint value={fmtNegTarget(f, "charge")} />
                      <BuyerAskHint label="Buyer's ask (tax)" mono={false} value={f.taxDemand} />
                    </>
                  );
                })()}
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
            onClick={attemptClose}
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
