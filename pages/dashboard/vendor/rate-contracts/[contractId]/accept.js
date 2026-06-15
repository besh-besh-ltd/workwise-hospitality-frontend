// Vendor — Pending Acceptance page. Translates prototypes/arc_ui/vendor-accept.html
// into a React page wired to ArcApi.vendorGetContract / vendorRequestOtp /
// vendorVerifyOtp / vendorDeclineContract. Per-line confirm, commercial-terms
// acceptance, OTP signing and the decline modal are all controlled here.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

// ---------------- helpers ----------------
const fmtINR = (n) => {
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
const fmtLakh = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  return fmtINR(v);
};
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const daysLeft = (s) => {
  if (!s) return null;
  const diff = Math.ceil((new Date(s).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

// Commercial terms are derived from the ARC the buyer created. Payment,
// delivery, penalty and escalation are captured at ARC creation (the buyer's
// RFQ terms) — termination is a standard platform clause. This makes the
// "who decided these terms" answer transparent in the UI via the `source`.
function buildTerms(arc) {
  arc = arc || {};
  const esc = arc.escalation_clause_json || {};
  const escText =
    !esc.type || esc.type === "none"
      ? "Rates are fixed for the full contract term — no price escalation applies."
      : esc.cap_pct
        ? `Price escalation permitted via the agreed index, capped at ${esc.cap_pct}% over the term.`
        : "Price escalation permitted as per the agreed index, subject to buyer approval.";
  return [
    {
      key: "payment", title: "Payment terms", source: "from-arc",
      text: arc.payment_terms_expected
        ? `${arc.payment_terms_expected} from goods receipt (GRN) at the receiving business unit. Invoices are raised against each call-off PO with the agreed HSN code per line.`
        : "Payment as agreed per call-off PO at the receiving business unit.",
    },
    {
      key: "delivery", title: "Delivery & lead time", source: "from-arc",
      text: arc.delivery_expected
        ? `${arc.delivery_expected}. Partial deliveries acceptable; a packing list, lot number and OC certificate must accompany each shipment.`
        : "Delivery as agreed per line; packing list and OC certificate to accompany each shipment.",
    },
    {
      key: "penalty", title: "Penalty / SLA clauses", source: "from-arc",
      text: arc.penalty_clause
        ? arc.penalty_clause
        : "Standard service-level penalties apply for late delivery and quality rejects as per the buyer's policy.",
    },
    {
      key: "escalation", title: "Price escalation", source: "from-arc",
      text: escText,
    },
    {
      key: "termination", title: "Termination & exit", source: "standard",
      text: "Either party may terminate for cause with 30 days' written notice. On termination, all open call-off POs shall be honoured and the vendor agrees to a 90-day transition support window at the contracted rates.",
    },
  ];
}

// Disputable fields — what the vendor can flag on a line, and what the buyer's
// commercial evaluator may edit in return. Mirrors the backend field whitelist.
const DISPUTE_FIELDS = [
  { key: "base_price",     label: "Base price / unit rate" },
  { key: "gst",            label: "GST %" },
  { key: "charges",        label: "Freight / charges" },
  { key: "committed_qty",  label: "Committed quantity" },
  { key: "payment_terms",  label: "Payment terms" },
  { key: "delivery_terms", label: "Delivery terms" },
];
const FIELD_LABEL = Object.fromEntries(DISPUTE_FIELDS.map((f) => [f.key, f.label]));
const clarValueText = (field, v) => {
  if (v == null) return "—";
  if (field === "base_price") return fmtINR(v);
  if (field === "gst") return `${v}%`;
  if (field === "committed_qty") return `${Number(v).toLocaleString("en-IN")}`;
  if (field === "charges") return typeof v === "object" ? JSON.stringify(v) : String(v);
  return String(v);
};

// ---------------- icons ----------------
const Icon = ({ d, w = 14, sw = 2 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ICONS = {
  clock:     <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  download:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  x:         <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  doc:       <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></>,
  fileText:  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></>,
  box:       <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
  flag:      <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>,
  check:     <polyline points="20 6 9 17 4 12" />,
  paperPlane:<><polyline points="22 2 11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
  send:      <><path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
  phone:     <><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></>,
  mail:      <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
  square:    <rect x="3" y="3" width="18" height="18" rx="2" />,
  building:  <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><line x1="9" y1="9" x2="9" y2="9" /><line x1="9" y1="12" x2="9" y2="12" /><line x1="9" y1="15" x2="9" y2="15" /><line x1="9" y1="18" x2="9" y2="18" /></>,
  lock:      <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  list:      <><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  alert:     <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12" y2="17" /></>,
  circleX:   <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>,
  pen:       <><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></>,
};

// ---------------- toast ----------------
function useToast() {
  const [toast, setToast] = useState("");
  const show = (msg) => {
    setToast(msg);
    if (typeof window !== "undefined") {
      clearTimeout(window.__acceptToast);
      window.__acceptToast = setTimeout(() => setToast(""), 2400);
    }
  };
  return [toast, show];
}

// ---------------- main page ----------------
export default function VendorAcceptPage() {
  const router = useRouter();
  const contractId = router.query.contractId;

  const [contract, setContract] = useState(null);
  const [arc, setArc] = useState(null);
  const [lines, setLines] = useState([]);
  const [clarifications, setClarifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // line-level state (keyed by line.id)
  const [lineConfirmed, setLineConfirmed] = useState({});
  const [lineFlagged, setLineFlagged] = useState({}); // {id: {field, note}}
  const [flagOpen, setFlagOpen] = useState({});
  const [flagDraft, setFlagDraft] = useState({});
  const [flagField, setFlagField] = useState({});
  const [submittingClar, setSubmittingClar] = useState(false);

  // commercial terms
  const [termCheck, setTermCheck] = useState({
    payment: false, delivery: false, penalty: false, escalation: false, termination: false,
  });

  // OTP flow
  const [showOtp, setShowOtp] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [devCode, setDevCode] = useState(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);

  // decline modal
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const [signing, setSigning] = useState(false);
  const [toast, showToast] = useToast();

  // load contract (re-callable after a clarification submit re-routes the ARC)
  const fetchContract = async () => {
    if (!contractId) return;
    const res = await ArcApi.vendorGetContract(contractId);
    setContract(res?.data?.contract || null);
    setArc(res?.data?.arc || null);
    setLines(res?.data?.lines || []);
    setClarifications(res?.data?.clarifications || []);
  };

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.vendorGetContract(contractId);
        if (cancelled) return;
        setContract(res?.data?.contract || null);
        setArc(res?.data?.arc || null);
        setLines(res?.data?.lines || []);
        setClarifications(res?.data?.clarifications || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contractId]);

  // ---- derived ----
  const totalLines = lines.length;
  const confirmedCount = useMemo(
    () => Object.values(lineConfirmed).filter(Boolean).length,
    [lineConfirmed]
  );
  const flaggedCount = useMemo(
    () => Object.keys(lineFlagged).length,
    [lineFlagged]
  );
  const allTermsConfirmed = useMemo(
    () => Object.values(termCheck).every(Boolean),
    [termCheck]
  );
  const allLinesConfirmed = confirmedCount === totalLines && totalLines > 0;
  const otpCode = otpDigits.join("");

  // Server-side clarifications. While the contract sits in 'clarification' (or
  // any clarification is still open), the buyer is reviewing — the whole page
  // is read-only and signing is blocked. Resolved ones (revised/upheld) are
  // shown back on each line when the contract re-opens for re-review.
  const awaitingBuyer = contract?.status === "clarification" ||
    clarifications.some((c) => c.status === "open");
  const clarByItem = useMemo(() => {
    const m = {};
    for (const c of clarifications) { const k = Number(c.arc_item_id); if (!m[k]) m[k] = c; }
    return m;
  }, [clarifications]);
  const hasLocalFlags = flaggedCount > 0;

  const grandTotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.unit_rate || 0) * Number(l.committed_qty || 0), 0),
    [lines]
  );

  // Linear flow gate — each step unlocks the next. OTP signing (step 3) only
  // becomes interactive once lines (step 1) and terms (step 2) are complete,
  // and never while a clarification is pending or staged.
  const step1Done = allLinesConfirmed && !hasLocalFlags && !awaitingBuyer;
  const step2Done = step1Done && allTermsConfirmed;
  const otpUnlocked = step2Done;          // step 3 may begin
  const signed = otpVerified;             // verifyOtp finalises signing server-side
  const currentStep = !step1Done ? 1 : !allTermsConfirmed ? 2 : !signed ? 3 : 4;

  // Auto-scroll to the next action section the moment a step completes, so the
  // vendor never has to hunt for what's next. Only on forward progress.
  const termsRef = useRef(null);
  const signRef = useRef(null);
  const prevStepRef = useRef(1);
  useEffect(() => {
    const prev = prevStepRef.current;
    if (currentStep > prev) {
      const target = currentStep === 2 ? termsRef.current : currentStep >= 3 ? signRef.current : null;
      if (target) {
        // small delay so the layout (e.g. unlocked section) settles first
        setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      }
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  const canSign = step2Done && otpCode.length === 6 && otpVerified;

  const deadline = contract?.awaiting_until || arc?.contract_end_at;
  const respondDays = daysLeft(deadline);

  // ---- handlers ----
  const toggleConfirm = (id) => {
    if (lineFlagged[id] || awaitingBuyer) return;
    setLineConfirmed((s) => ({ ...s, [id]: !s[id] }));
  };
  const openFlag = (id) => {
    if (awaitingBuyer) return;
    setFlagOpen((s) => ({ ...s, [id]: true }));
    setFlagDraft((s) => ({ ...s, [id]: s[id] || "" }));
    setFlagField((s) => ({ ...s, [id]: s[id] || DISPUTE_FIELDS[0].key }));
  };
  const cancelFlag = (id) => {
    setFlagOpen((s) => ({ ...s, [id]: false }));
  };
  const flagLine = (id) => {
    const note = (flagDraft[id] || "").trim();
    const field = flagField[id] || DISPUTE_FIELDS[0].key;
    if (!note) { showToast("Add a short note explaining the concern"); return; }
    setLineFlagged((s) => ({ ...s, [id]: { field, note } }));
    setLineConfirmed((s) => ({ ...s, [id]: false }));
    setFlagOpen((s) => ({ ...s, [id]: false }));
    showToast("Line staged — submit the clarification request to send it");
  };
  const unflagLine = (id) => {
    setLineFlagged((s) => { const n = { ...s }; delete n[id]; return n; });
    setFlagDraft((s) => ({ ...s, [id]: "" }));
    showToast("Flag removed");
  };

  // Send every staged flag to the buyer in one request — this rolls the ARC
  // back to commercial review and parks the contract until they respond.
  const submitClarifications = async () => {
    if (submittingClar || !hasLocalFlags) return;
    setSubmittingClar(true);
    try {
      const items = Object.entries(lineFlagged).map(([id, v]) => ({
        arc_contract_line_id: Number(id), field: v.field, comment: v.note,
      }));
      await ArcApi.vendorRequestClarification(contractId, items);
      setLineFlagged({});
      setLineConfirmed({});
      showToast("Clarification submitted — the buyer will review and respond");
      await fetchContract();
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmittingClar(false);
    }
  };

  const toggleTerm = (k) => setTermCheck((s) => ({ ...s, [k]: !s[k] }));

  // OTP — calls real API
  const sendOtp = async () => {
    if (otpSending || otpVerified) return;
    setOtpSending(true);
    setShowOtp(true);
    try {
      const res = await ArcApi.vendorRequestOtp(contractId);
      const code = res?.data?.dev_code || null;
      setDevCode(code);
      setOtpExpiresAt(res?.data?.otp_expires_at || null);
      showToast(code ? `OTP sent (dev code shown below)` : "OTP sent to your registered mobile");
    } catch (e) {
      // axios interceptor will surface error toast; allow retry
      setShowOtp(false);
    } finally {
      setOtpSending(false);
    }
  };
  const resendOtp = async () => {
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpVerified(false);
    setOtpSending(false);
    setDevCode(null);
    await sendOtp();
  };
  const onOtpInput = (i, e) => {
    const v = (e.target.value || "").replace(/[^0-9]/g, "").slice(-1);
    setOtpDigits((s) => {
      const n = [...s];
      n[i] = v;
      return n;
    });
    if (v && e.target.nextElementSibling && e.target.nextElementSibling.classList.contains("otp-input")) {
      e.target.nextElementSibling.focus();
    }
    // clear previous verification — must re-verify
    if (otpVerified) setOtpVerified(false);
  };
  const onOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otpDigits[i] && e.target.previousElementSibling && e.target.previousElementSibling.classList.contains("otp-input")) {
      e.target.previousElementSibling.focus();
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 6 || otpVerifying) return;
    setOtpVerifying(true);
    try {
      await ArcApi.vendorVerifyOtp(contractId, otpCode);
      setOtpVerified(true);
      showToast("OTP verified — ready to seal");
    } catch (e) {
      setOtpVerified(false);
    } finally {
      setOtpVerifying(false);
    }
  };

  const acceptSign = async () => {
    if (!canSign || signing) return;
    setSigning(true);
    try {
      // verify already called — backend has finalised signing on verify; redirect.
      showToast("Contract signed · activating…");
      setTimeout(() => {
        router.push("/dashboard/vendor/rate-contracts/active");
      }, 1200);
    } finally {
      setSigning(false);
    }
  };

  const confirmDecline = async () => {
    if (declining) return;
    setDeclining(true);
    try {
      await ArcApi.vendorDeclineContract(contractId, declineReason || "");
      setShowDecline(false);
      showToast("Decline recorded · ARC will route back to committee");
      setTimeout(() => router.push("/dashboard/vendor/rate-contracts/requests"), 1100);
    } finally {
      setDeclining(false);
    }
  };

  // Printable preview of the UNSIGNED document the vendor is about to sign.
  // Explicitly watermarked — the real signature only lands on OTP verify.
  const previewUnsignedDoc = () => {
    if (!contract || typeof window === "undefined") return;
    const a = arc || {};
    const win = window.open("", "_blank");
    if (!win) return;
    const linesHtml = lines.map((l) => `<tr>
        <td>${l.variant_name || ""}<div class="sub">${l.variant_slug || l.arc_item_id}</div></td>
        <td class="r mono">₹${Number(l.unit_rate || 0).toLocaleString("en-IN")}/${l.uom || ""}</td>
        <td class="r mono">${Number(l.gst_pct ?? 0)}%</td>
        <td class="r mono">${Number(l.committed_qty || 0).toLocaleString("en-IN")} ${l.uom || ""}</td>
        <td class="r mono">₹${Math.round(Number(l.unit_rate || 0) * Number(l.committed_qty || 0)).toLocaleString("en-IN")}</td>
      </tr>`).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>UNSIGNED · ${a.arc_number || ""}</title>
      <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a18;max-width:820px;margin:32px auto;padding:0 28px;position:relative;}
      .wm{position:fixed;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-22deg);font-size:84px;font-weight:800;color:rgba(180,83,9,.08);letter-spacing:.1em;pointer-events:none;}
      h1{font-size:20px;margin:0 0 4px;} .meta{color:#6b6b66;font-size:12px;margin-bottom:6px;}
      .draftnote{display:inline-block;background:#fff7ed;border:1px solid #fed7aa;color:#9a4708;font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;margin-bottom:18px;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e2e2dd;border-radius:8px;overflow:hidden;margin-bottom:18px;} .grid>div{padding:12px 16px;} .grid>div:first-child{border-right:1px solid #e2e2dd;}
      .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a85;font-weight:600;} .v{margin-top:5px;font-size:13px;font-weight:500;}
      table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px;} th,td{padding:9px 10px;border-bottom:1px solid #eee;text-align:left;} th{background:#fafaf8;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#8a8a85;} .r{text-align:right;} .mono{font-family:ui-monospace,monospace;} .sub{font-size:10px;color:#9a9a95;}
      .sig{margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px;} .sigbox{border:1px dashed #d6d6d0;border-radius:8px;padding:14px 16px;} .pending{color:#9a4708;font-style:italic;font-size:11px;margin-top:8px;}</style></head>
      <body>
      <div class="wm">UNSIGNED</div>
      <h1>Rate Contract — ${a.title || ""}</h1>
      <div class="meta">${a.arc_number || ""} · ${contract.vendor_name || ""}</div>
      <div class="draftnote">Unsigned draft — your signature is generated only after OTP verification</div>
      <div class="grid">
        <div><div class="k">Buyer</div><div class="v">${a.company_name || ""}${a.hotel_name ? " · " + a.hotel_name : ""}</div></div>
        <div><div class="k">Term</div><div class="v">${fmtDate(a.contract_start_at)} → ${fmtDate(a.contract_end_at)}</div></div>
      </div>
      <table><thead><tr><th>Item</th><th class="r">Unit rate</th><th class="r">GST</th><th class="r">Committed</th><th class="r">Line value</th></tr></thead><tbody>${linesHtml}</tbody></table>
      <div class="sig">
        <div class="sigbox"><div class="k">For buyer</div><div class="v">${a.buyer_name || "Procurement Lead"}</div></div>
        <div class="sigbox"><div class="k">For vendor</div><div class="v">${contract.vendor_name || ""}</div><div class="pending">— signature pending OTP verification —</div></div>
      </div>
      </body></html>`);
    win.document.close();
    win.focus();
  };

  // ---- render ----
  if (!contractId) return null;
  if (loading) {
    return <AcceptSkeleton />;
  }
  if (!contract) {
    return <div style={{ padding: 32, color: "var(--fg-3)" }}>Contract not found.</div>;
  }

  const A = arc || {};
  const arcNumber  = A.arc_number || contract.arc_number || `#${contract.id}`;
  const arcTitle   = A.title || contract.arc_title || contract.title || "Rate contract";
  const vendorName = contract.vendor_name || "Your company";
  const vendorSignatory = contract.vendor_name || "Authorised signatory";
  const vendorMobile = contract.vendor_mobile || contract.vendor_phone_masked || null;
  const vendorEmail  = contract.vendor_email || null;
  const hotelName  = A.hotel_name || "the business unit";
  const hotelCity  = A.hotel_city || "";
  const buFull     = hotelName + (hotelCity ? ` · ${hotelCity}` : "");
  const companyName = A.company_name || "Workwise Hospitality";
  const buyerName  = A.buyer_name || "Buyer Procurement Lead";
  const buyerRole  = A.buyer_designation || "Procurement Lead";
  const category   = A.category_title || "";
  const cStart     = A.contract_start_at || null;
  const cEnd       = A.contract_end_at || null;
  const terms      = buildTerms(A);

  // Per-step section state for the progressive-flow treatment (done / active /
  // locked). Steps: 1 = confirm lines, 2 = accept terms, 3 = sign.
  const stepCls = (n) => {
    const done = n === 1 ? step1Done : n === 2 ? step2Done : signed;
    if (done) return "is-done";
    if (currentStep === n) return "is-active-step";
    return "is-locked-step";
  };
  const StepBadge = ({ n }) => {
    const s = stepCls(n);
    return (
      <span className={`step-badge ${s}`}>
        {s === "is-done" ? <><Icon w={10} sw={3} d={ICONS.check} /> Done</>
          : s === "is-active-step" ? <>Step {n} · Action needed</>
          : <><Icon w={9} sw={2.4} d={ICONS.lock} /> Step {n} · Locked</>}
      </span>
    );
  };

  const termsAcceptedCount = Object.values(termCheck).filter(Boolean).length;

  const linesProgressPct = totalLines
    ? Math.round(((confirmedCount + flaggedCount) / totalLines) * 100)
    : 0;
  const termsProgressPct = Math.round((termsAcceptedCount / 5) * 100);

  return (
    <main className="main-body" style={{ paddingBottom: 96 }}>
      {/* HERO BAND */}
      <section className="arc-hero">
        <div className="top">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Awarded · Pending your sign</div>
            <h1>
              <span>{arcTitle}</span>
              <span className="num">{arcNumber.startsWith("#") ? arcNumber : `#${arcNumber}`}</span>
              <span
                className="status-chip"
                style={{ background: "rgba(67,56,202,0.32)", color: "#c7d2fe", borderColor: "rgba(165,180,252,0.36)" }}
              >
                Awaiting sign
              </span>
            </h1>
            <div className="sub">
              <span>Buyer: <span className="em">{companyName}</span></span>
              {category && <><span className="sep">·</span><span>{category}</span></>}
              <span className="sep">·</span>
              <span className="em">{hotelName}</span>
            </div>
          </div>
          <div className="hero-actions">
            {deadline && (
              <span className="countdown-chip">
                <Icon w={13} d={ICONS.clock} />
                Respond by <span className="em">{fmtDate(deadline)}</span>
                {respondDays !== null && respondDays >= 0 && (
                  <>
                    {" "}· <span className="em">{respondDays} days left</span>
                  </>
                )}
              </span>
            )}
            <button className="btn" onClick={previewUnsignedDoc} title="Opens the unsigned document you're about to sign">
              <Icon w={13} d={ICONS.download} />
              Preview unsigned document
            </button>
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell"><div className="k">Vendor</div><div className="v"><span className="em">{vendorName}</span></div></div>
          <div className="cell"><div className="k">Contract term</div><div className="v">{fmtDate(cStart)} → {fmtDate(cEnd)}</div></div>
          <div className="cell"><div className="k">Total committed value</div><div className="v"><span className="em mono">{fmtLakh(grandTotal)}</span></div></div>
          <div className="cell"><div className="k">Award covers</div><div className="v">{lines.length} SKU{lines.length === 1 ? "" : "s"} · <span className="em">{hotelName}</span></div></div>
          <div className="cell"><div className="k">Escalation policy</div><div className="v">{(A.escalation_clause_json?.type && A.escalation_clause_json.type !== "none") ? "Indexed" : "Fixed for term"}</div></div>
        </div>
      </section>

      {/* ACTION BANNER — branches: under buyer review · staged flags to submit ·
          normal step flow. */}
      {awaitingBuyer ? (
        <section className="action-center clar-review">
          <div className="ac-icon" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
            <Icon w={22} d={ICONS.clock} />
          </div>
          <div className="ac-body">
            <div className="ac-title">Clarification under review by the buyer</div>
            <div className="ac-sub">
              You raised {clarifications.filter((c) => c.status === "open").length} clarification(s). The buyer&apos;s
              commercial evaluator will revise the disputed term(s) or respond — the contract re-opens for your
              signature once they do. <strong>Signing is paused.</strong>
            </div>
          </div>
        </section>
      ) : hasLocalFlags ? (
        <section className="action-center clar-stage">
          <div className="ac-icon" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
            <Icon w={22} d={ICONS.flag} />
          </div>
          <div className="ac-body">
            <div className="ac-title">{flaggedCount} line(s) flagged for clarification</div>
            <div className="ac-sub">
              Submitting routes these back to the buyer&apos;s commercial evaluator and pauses signing until they
              respond. You can&apos;t sign a contract with an open dispute.
            </div>
          </div>
          <div className="ac-actions">
            <button className="btn btn-warn" onClick={submitClarifications} disabled={submittingClar}>
              <Icon w={14} d={ICONS.send} />
              {submittingClar ? "Submitting…" : `Submit clarification request (${flaggedCount})`}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowDecline(true)}>
              <Icon w={14} d={ICONS.x} />
              Decline
            </button>
          </div>
        </section>
      ) : (
        <section className="action-center">
          <div className="ac-icon">
            <Icon w={22} d={currentStep === 4 ? ICONS.check : currentStep === 3 ? ICONS.pen : ICONS.doc} />
          </div>
          <div className="ac-body">
            {currentStep === 4 ? (
              <>
                <div className="ac-title">Contract signed &amp; activated</div>
                <div className="ac-sub">Your signature is sealed. Call-off POs can now be raised against this contract.</div>
              </>
            ) : (
              <>
                <div className="ac-title">
                  Step {currentStep} of 3 —{" "}
                  {currentStep === 1 ? "Confirm each awarded line"
                    : currentStep === 2 ? "Accept the commercial terms"
                    : "Sign with OTP to activate"}
                </div>
                <div className="ac-sub">
                  {currentStep === 1 && <>Review the rates &amp; quantities below and <strong>confirm each line</strong>. If anything looks off, <strong>flag that line</strong> — pick the term in question and it routes back to the buyer&apos;s evaluator.</>}
                  {currentStep === 2 && <>All lines confirmed. Now <strong>accept each commercial clause</strong> below to proceed to signing.</>}
                  {currentStep === 3 && <>Lines and terms accepted. <strong>Request an OTP and sign</strong> in the signature panel below — signing is irrevocable.</>}
                </div>
              </>
            )}
          </div>
          {currentStep !== 4 && (
            <div className="ac-actions">
              <button className="btn btn-ghost" onClick={() => setShowDecline(true)}>
                <Icon w={14} d={ICONS.x} />
                Decline
              </button>
            </div>
          )}
        </section>
      )}

      {/* TWO COLUMN BODY */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 18, alignItems: "flex-start" }}>

        {/* LEFT: contract document */}
        <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>

          <section className="section-card contract-paper" style={{ position: "relative", overflow: "hidden" }}>
            <div className="preview-stamp">DRAFT</div>

            {/* Document title bar */}
            <div className="doc-title-row" style={{ position: "relative", zIndex: 1 }}>
              <div>
                <div className="dt-title">
                  <Icon w={20} d={ICONS.fileText} />
                  Rate Contract Document
                </div>
                <div className="dt-sub">{arcNumber} · Generated {fmtDate(contract.created_at)} · Rev 1</div>
              </div>
              <div className="dt-seal" style={signed ? { background: "var(--success-soft)", borderColor: "rgba(5,118,66,0.3)", color: "var(--success)" } : undefined}>
                <Icon w={11} sw={2.2} d={signed ? ICONS.check : ICONS.lock} />
                {signed ? "Signed copy" : "Awaiting signature"}
              </div>
            </div>

            {/* Parties & Period */}
            <div className="doc-section" style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h"><span className="dh-num">1</span> Parties &amp; Period</div>
              <div className="parties-grid">
                <div className="party-card">
                  <div className="p-role">Buyer</div>
                  <div className="p-name">{companyName}</div>
                  <div className="p-meta">
                    {hotelName}{hotelCity ? ` · ${hotelCity}` : ""}
                    <br />Authorised signatory: <strong style={{ color: "var(--fg)" }}>{buyerName}</strong>
                    {buyerRole ? ` · ${buyerRole}` : ""}
                  </div>
                  <div className="p-gst">GSTIN: N/A</div>
                </div>
                <div className="vs-chip">VS</div>
                <div className="party-card" style={{ borderColor: "rgba(67,56,202,0.28)", background: "var(--indigo-soft)" }}>
                  <div className="p-role" style={{ color: "var(--indigo)" }}>Vendor</div>
                  <div className="p-name">{vendorName}</div>
                  <div className="p-meta">
                    Awarded vendor
                    <br />Authorised signatory: <strong style={{ color: "var(--fg)" }}>{vendorSignatory}</strong>
                  </div>
                  <div className="p-gst">GSTIN: {contract.vendor_gstin || "N/A"}</div>
                </div>
              </div>
              <div className="term-grid" style={{ marginTop: 16 }}>
                <div className="t-k">Contract term</div>
                <div className="t-v">
                  <strong style={{ color: "var(--fg)" }}>{fmtDate(cStart)}</strong> through{" "}
                  <strong style={{ color: "var(--fg)" }}>{fmtDate(cEnd)}</strong>, non-auto-renewing.
                </div>
                <div className="t-k">Business unit</div>
                <div className="t-v">
                  <span className="bu-tag primary">
                    <Icon w={11} sw={2} d={ICONS.building} />
                    <span>{buFull}</span>
                  </span>
                </div>
                <div className="t-k">Award scope</div>
                <div className="t-v">
                  Sole supplier for <strong>{lines.length}</strong> SKU(s) at <strong>{hotelName}</strong>. Buyer retains a 10% emergency-procurement carve-out.
                </div>
              </div>
            </div>

            {/* Items / Lines — STEP 1: confirm each line */}
            <div className={`doc-section ${stepCls(1)}`} style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h flex items-center justify-between" style={{ display: "flex" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="dh-num">2</span> Awarded Line Items · rates &amp; quantities
                  <StepBadge n={1} />
                </span>
                <span className="pill neutral" style={{ textTransform: "none", letterSpacing: 0 }}>
                  <span className="mono">{confirmedCount} of {totalLines}</span>&nbsp;confirmed
                  {flaggedCount > 0 && <>, <span className="mono text-warn">{flaggedCount} flagged</span></>}
                </span>
              </div>

              <div>
                {lines.map((line, idx) => {
                  const isConfirmed = !!lineConfirmed[line.id];
                  const isFlagged = !!lineFlagged[line.id];
                  const rowClass =
                    isFlagged ? "line-row row-flagged" :
                    isConfirmed ? "line-row row-confirmed" :
                    "line-row";
                  const variantName = line.variant_name || `Variant #${line.product_variant_id}`;
                  const variantCode = line.variant_slug || line.arc_item_id ? `#${line.arc_item_id || line.id}` : "";
                  const uom = line.uom || "u";
                  const lineValue = Number(line.unit_rate || 0) * Number(line.committed_qty || 0);
                  const srvClar = clarByItem[Number(line.arc_item_id)];

                  return (
                    <div key={line.id} className={rowClass}>
                      <div className="lr-top">
                        <div className="lr-name">
                          <div className="lr-ic">
                            <Icon w={18} d={ICONS.box} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="lr-title">
                              <span>Line <span className="mono">{String(idx + 1).padStart(2, "0")}</span> · {variantName}</span>
                              {variantCode && <span className="lr-code">{variantCode}</span>}
                              {isConfirmed && (
                                <span className="pill success" style={{ padding: "2px 7px", fontSize: 10 }}>
                                  <Icon w={9} sw={3} d={ICONS.check} /> Confirmed
                                </span>
                              )}
                              {isFlagged && (
                                <span className="pill warn" style={{ padding: "2px 7px", fontSize: 10 }}>Flagged</span>
                              )}
                              {srvClar?.status === "open" && (
                                <span className="pill warn" style={{ padding: "2px 7px", fontSize: 10 }}>Under review</span>
                              )}
                              {srvClar?.status === "revised" && (
                                <span className="pill success" style={{ padding: "2px 7px", fontSize: 10 }}>
                                  <Icon w={9} sw={3} d={ICONS.check} /> Revised
                                </span>
                              )}
                              {srvClar?.status === "upheld" && (
                                <span className="pill neutral" style={{ padding: "2px 7px", fontSize: 10 }}>Buyer responded</span>
                              )}
                            </div>
                            <div className="lr-spec">{line.spec_note || line.notes || ""}</div>
                          </div>
                        </div>
                        <div className="lr-confirm">
                          <label
                            className="confirm-chip"
                            onClick={(e) => { e.preventDefault(); toggleConfirm(line.id); }}
                            style={(isFlagged || awaitingBuyer) ? { pointerEvents: "none", opacity: 0.45 } : undefined}
                          >
                            <span className="cc-box"></span>
                            <span>{isConfirmed ? "Line confirmed" : "Confirm this line"}</span>
                          </label>
                          {!isFlagged && !flagOpen[line.id] && !awaitingBuyer && (
                            <a className="flag-link" onClick={() => openFlag(line.id)}>
                              <Icon w={11} d={ICONS.flag} />
                              Flag for clarification
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="lr-grid">
                        <div className="lr-cell">
                          <div className="lc-k">Unit rate</div>
                          <div className="lc-v">
                            <span>{fmtINR(line.unit_rate)}</span>{" "}
                            <span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, color: "var(--fg-3)", fontSize: 11 }}>
                              / {uom}
                            </span>
                          </div>
                        </div>
                        <div className="lr-cell">
                          <div className="lc-k">GST</div>
                          <div className="lc-v">{line.gst_pct != null ? `${line.gst_pct}%` : "—"}</div>
                        </div>
                        <div className="lr-cell">
                          <div className="lc-k">Freight</div>
                          <div className="lc-v">
                            {line.charges == null
                              ? "Inclusive"
                              : Number(line.charges) === 0
                                ? "Inclusive (FOB)"
                                : `+ ₹${line.charges}/u`}
                          </div>
                        </div>
                        <div className="lr-cell">
                          <div className="lc-k">Payment</div>
                          <div className="lc-v txt">{line.payment_terms || contract.payment_terms || "Net 45 days"}</div>
                        </div>
                        <div className="lr-cell">
                          <div className="lc-k">Committed value</div>
                          <div className="lc-v">{fmtLakh(lineValue)}</div>
                        </div>
                        <div className="lr-cell" style={{ gridColumn: "span 5" }}>
                          <div className="lc-k">Annual committed quantity</div>
                          <div className="lr-bu-list" style={{ marginTop: 5 }}>
                            <span className="lr-bu-pill">
                              <span>{hotelName}</span>
                              <span className="qty">{Number(line.committed_qty || 0).toLocaleString("en-IN")} {uom}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Flag inline composer — pick the disputed field + a note */}
                      {flagOpen[line.id] && !isFlagged && (
                        <div className="flag-collapse">
                          <div className="fc-h">
                            <Icon w={12} sw={2.4} d={ICONS.flag} /> Raise clarification on this line
                          </div>
                          <div className="fc-field">
                            <label className="fc-label">Which term is the concern?</label>
                            <select
                              className="fc-select"
                              value={flagField[line.id] || DISPUTE_FIELDS[0].key}
                              onChange={(e) => setFlagField((s) => ({ ...s, [line.id]: e.target.value }))}
                            >
                              {DISPUTE_FIELDS.map((f) => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            className="textarea"
                            value={flagDraft[line.id] || ""}
                            onChange={(e) => setFlagDraft((s) => ({ ...s, [line.id]: e.target.value }))}
                            placeholder={`e.g. Freight is marked inclusive (FOB) — for ${hotelName} we need at least 10% freight added.`}
                          />
                          <div className="fc-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => cancelFlag(line.id)}>Cancel</button>
                            <button className="btn btn-warn btn-sm" onClick={() => flagLine(line.id)}>
                              <Icon w={12} sw={2.4} d={ICONS.flag} />
                              Flag this line
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Staged-locally flag (not yet submitted) */}
                      {isFlagged && (
                        <div className="flag-shown">
                          <div className="fs-h">
                            <span>
                              <Icon w={11} sw={2.4} d={ICONS.flag} /> Staged · {FIELD_LABEL[lineFlagged[line.id].field]} — submit the request to send
                            </span>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => unflagLine(line.id)}
                              style={{ padding: "2px 7px", fontSize: 10.5 }}
                            >
                              Remove flag
                            </button>
                          </div>
                          <div className="fs-note">{lineFlagged[line.id].note}</div>
                        </div>
                      )}

                      {/* Server clarification — under review, or buyer's resolution on re-review */}
                      {srvClar && (
                        <div className={`clar-card clar-${srvClar.status}`}>
                          <div className="clar-h">
                            <span className="clar-field">
                              <Icon w={11} sw={2.4} d={srvClar.status === "open" ? ICONS.clock : ICONS.check} />
                              {FIELD_LABEL[srvClar.field] || srvClar.field}
                              {srvClar.status === "open" && " · awaiting buyer"}
                              {srvClar.status === "revised" && " · revised by buyer"}
                              {srvClar.status === "upheld" && " · buyer responded"}
                            </span>
                          </div>
                          <div className="clar-q">“{srvClar.vendor_comment}”</div>
                          {srvClar.status === "revised" && (
                            <div className="clar-change">
                              <span className="clar-old">{clarValueText(srvClar.field, srvClar.old_value)}</span>
                              <Icon w={12} sw={2.4} d={ICONS.send} />
                              <span className="clar-new">{clarValueText(srvClar.field, srvClar.new_value)}</span>
                            </div>
                          )}
                          {srvClar.buyer_response && (
                            <div className="clar-resp"><strong>Buyer:</strong> {srvClar.buyer_response}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {lines.length === 0 && (
                  <div style={{ padding: 18, color: "var(--fg-3)", fontSize: 13, textAlign: "center" }}>
                    No awarded lines on this contract.
                  </div>
                )}
              </div>
            </div>

            {/* Commercial terms — STEP 2: accept each clause */}
            <div ref={termsRef} className={`doc-section ${stepCls(2)}`} style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h flex items-center justify-between" style={{ display: "flex" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="dh-num">3</span> Commercial Terms · accept each clause
                  <StepBadge n={2} />
                </span>
                <span className="pill neutral" style={{ textTransform: "none", letterSpacing: 0 }}>
                  <span className="mono">{termsAcceptedCount} of 5</span>&nbsp;accepted
                </span>
              </div>
              <div className="doc-note">
                Set by the buyer when the rate contract was floated — from their RFQ terms. Termination is a standard platform clause.
              </div>
              {stepCls(2) === "is-locked-step" && (
                <div className="step-lock-note">
                  <Icon w={12} sw={2.2} d={ICONS.lock} /> Confirm all awarded lines above to unlock the commercial terms.
                </div>
              )}
              <div className="term-list">
                {terms.map((t) => (
                  <div
                    key={t.key}
                    role="button"
                    tabIndex={step1Done ? 0 : -1}
                    className={`term-item ${termCheck[t.key] ? "checked" : ""}${step1Done ? " is-clickable" : ""}`}
                    onClick={() => { if (step1Done) toggleTerm(t.key); }}
                    onKeyDown={(e) => { if (step1Done && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleTerm(t.key); } }}
                  >
                    <span className={`ti-check${termCheck[t.key] ? " is-on" : ""}`} aria-hidden="true" style={{ marginTop: 2 }} />
                    <div className="ti-body">
                      <div className="ti-title">{t.title}</div>
                      <div className="ti-text">{t.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 3 · Sign & activate — the final action, on the page itself */}
            <div ref={signRef} className={`doc-section sign-section ${stepCls(3)}`} style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h flex items-center justify-between" style={{ display: "flex" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="dh-num">4</span> Sign &amp; activate
                  <StepBadge n={3} />
                </span>
              </div>

              {/* Locked until lines + terms are done */}
              {!otpUnlocked && !signed && (
                <div className="sign-locked">
                  <div className="sl-ic"><Icon w={20} d={ICONS.lock} /></div>
                  <div>
                    <div className="sl-title">Signing unlocks once the steps above are complete</div>
                    <div className="sl-sub">
                      {!step1Done && <>Confirm all <strong>{totalLines}</strong> awarded line(s)</>}
                      {!step1Done && !allTermsConfirmed && <> · </>}
                      {!allTermsConfirmed && <>Accept all <strong>5</strong> commercial clauses</>}
                    </div>
                  </div>
                </div>
              )}

              {/* Signed success */}
              {signed && (
                <div className="sign-done">
                  <div className="sd-ic"><Icon w={22} sw={2.6} d={ICONS.check} /></div>
                  <div>
                    <div className="sd-title">Contract signed &amp; activated</div>
                    <div className="sd-sub">Your OTP signature is sealed. You can now raise call-off POs against this contract.</div>
                  </div>
                  <button className="btn btn-success" onClick={() => router.push("/dashboard/vendor/rate-contracts/active")}>
                    View active contract
                  </button>
                </div>
              )}

              {/* Active signing flow */}
              {otpUnlocked && !signed && (
                <div className="sign-flow">
                  {!showOtp ? (
                    <>
                      <div className="sf-intro">
                        A one-time code will be sent to your registered mobile and email. Signing is <strong>irrevocable</strong> — the document hash (SHA-256) is sealed on verification.
                      </div>
                      <div className="ev-stack">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="ev-ic"><Icon w={15} d={ICONS.phone} /></div>
                          <div style={{ flex: 1 }}>
                            <div className="fs-12 text-fg fw-600">{vendorMobile || "+91 ●●●●● ●●●●●"}</div>
                            <div className="fs-11 text-fg-3">Registered for vendor signatory</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="ev-ic"><Icon w={15} d={ICONS.mail} /></div>
                          <div style={{ flex: 1 }}>
                            <div className="fs-12 text-fg fw-600">{vendorEmail || "vendor on file"}</div>
                            <div className="fs-11 text-fg-3">Mirror copy of OTP</div>
                          </div>
                        </div>
                      </div>
                      <button className="btn btn-warn btn-lg mt-3" onClick={sendOtp} disabled={otpSending} style={{ width: "100%" }}>
                        <Icon w={15} d={ICONS.paperPlane} />
                        {otpSending ? "Sending OTP…" : "Send OTP & begin signing"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="fs-12 text-fg-2 fw-600 mb-2 flex items-center justify-between">
                        <span>Enter the 6-digit code</span>
                        {!otpVerified && otpSending && <span className="fs-11 text-fg-3">Sending…</span>}
                        {!otpVerified && otpVerifying && <span className="fs-11 text-fg-3">Verifying…</span>}
                        {otpVerified && <span className="fs-11 text-success fw-600"><Icon w={11} sw={3} d={ICONS.check} /> Verified</span>}
                      </div>
                      <div className="otp-grid">
                        {otpDigits.map((d, i) => (
                          <input
                            key={i}
                            className="otp-input"
                            type="text"
                            maxLength={1}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={d}
                            onChange={(e) => onOtpInput(i, e)}
                            onKeyDown={(e) => onOtpKeyDown(i, e)}
                          />
                        ))}
                      </div>
                      {devCode && (
                        <div className="hash-row" style={{ marginTop: 10 }}>
                          <span className="hr-l">Dev OTP:</span><span><code>{devCode}</code></span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 fs-11 text-fg-3">
                        <span>Sent to your registered phone &amp; email</span>
                        <button className="btn btn-ghost btn-sm" onClick={resendOtp} style={{ padding: "3px 8px", fontSize: 11 }} disabled={otpSending}>Resend</button>
                      </div>
                      {!otpVerified && (
                        <button className="btn btn-success btn-lg mt-3" onClick={verifyOtp} disabled={otpCode.length !== 6 || otpVerifying} style={{ width: "100%" }}>
                          <Icon w={15} d={ICONS.pen} />
                          {otpVerifying ? "Verifying & sealing…" : "Verify & sign contract"}
                        </button>
                      )}
                    </>
                  )}
                  <div className="sig-helper">
                    By signing you accept this contract <strong>irrevocably</strong> under the WorkWise Terms of Service.
                  </div>
                </div>
              )}
            </div>

            {/* Compliance */}
            <div className="doc-section" style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h"><span className="dh-num">5</span> Compliance documents · submitted &amp; on file</div>
              <div className="compliance-grid">
                <div className="comp-item"><Icon w={14} sw={2.4} d={ICONS.check} /> GST registration certificate <span className="c-meta">on file</span></div>
                <div className="comp-item"><Icon w={14} sw={2.4} d={ICONS.check} /> ISO 9001:2015 certificate <span className="c-meta">on file</span></div>
                <div className="comp-item"><Icon w={14} sw={2.4} d={ICONS.check} /> MSME / Udyam registration <span className="c-meta">on file</span></div>
                <div className="comp-item"><Icon w={14} sw={2.4} d={ICONS.check} /> PAN &amp; CIN <span className="c-meta">verified</span></div>
                <div className="comp-item"><Icon w={14} sw={2.4} d={ICONS.check} /> Bank-account verification <span className="c-meta">penny-drop OK</span></div>
                <div className="comp-item"><Icon w={14} sw={2.4} d={ICONS.check} /> Sample approval <span className="c-meta">CE-approved</span></div>
              </div>
            </div>

            {/* Signature page preview */}
            <div className="doc-section" style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h"><span className="dh-num">6</span> Signature page · preview</div>
              <div className="parties-grid">
                <div className="party-card" style={{ background: "var(--surface-2)" }}>
                  <div className="p-role">For Buyer</div>
                  <div className="p-name">{buyerName}</div>
                  <div className="p-meta">{companyName}</div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border-strong)" }}>
                    <div className="sig-block" style={{ padding: "10px 12px" }}>
                      <div className="sig-name" style={{ fontSize: 24 }}>{buyerName}</div>
                      <div className="sig-meta">e-signed · {fmtDate(contract.committee_approved_at || contract.created_at || contract.updated_at)}</div>
                    </div>
                  </div>
                </div>
                <div className="vs-chip">&amp;</div>
                <div
                  className="party-card"
                  style={{ background: "var(--surface-2)", borderStyle: "dashed", borderColor: signed ? "var(--success)" : "var(--warn)" }}
                >
                  <div className="p-role" style={{ color: signed ? "var(--success)" : "var(--warn)" }}>{signed ? "For Vendor — signed" : "For Vendor — awaiting"}</div>
                  <div className="p-name">{vendorSignatory}</div>
                  <div className="p-meta">{vendorName}</div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border-strong)" }}>
                    {!signed ? (
                      <div style={{ textAlign: "center", padding: "18px 12px", fontSize: 11.5, color: "var(--fg-4)", fontStyle: "italic" }}>
                        — signature pending OTP verification —
                      </div>
                    ) : (
                      <div className="sig-block">
                        <div className="sig-name">{vendorSignatory}</div>
                        <div className="sig-meta">e-signed · OTP verified · {fmtDate(new Date())}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="hash-row" style={{ marginTop: 14 }}>
                <span className="hr-l">SHA-256:</span>
                <span>{contract.document_hash || contract.contract_hash || "— final hash computed at activation —"}</span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT: aside acceptance flow */}
        <aside className="accept-aside">

          {/* Progress checklist */}
          <section className="section-card checklist-card">
            <div className="section-head">
              <h2>
                <span className="ic"><Icon w={13} sw={2.2} d={ICONS.list} /></span> Acceptance checklist
              </h2>
            </div>
            <div className="section-body" style={{ padding: 0 }}>

              {/* Step 1 */}
              <div className={`cl-step ${allLinesConfirmed ? "done" : "current"}`}>
                <div className="cl-node"><span className="cl-node-num">1</span></div>
                <div>
                  <div className="cl-title">Confirm every awarded line</div>
                  <div className="cl-sub">
                    {confirmedCount} of {totalLines} confirmed{flaggedCount ? ` · ${flaggedCount} flagged` : ""}
                  </div>
                  <div className="mini-progress">
                    <div className="mp-bar">
                      <div
                        className={`mp-fill ${flaggedCount > 0 && !allLinesConfirmed ? "warn" : ""}`}
                        style={{ width: `${linesProgressPct}%` }}
                      />
                    </div>
                    <span className="mp-num">{linesProgressPct}%</span>
                  </div>
                </div>
                <div className="cl-stat">{allLinesConfirmed ? "Done" : "Open"}</div>
              </div>

              {/* Step 2 */}
              <div className={`cl-step ${allTermsConfirmed ? "done" : allLinesConfirmed ? "current" : "pending"}`}>
                <div className="cl-node"><span className="cl-node-num">2</span></div>
                <div>
                  <div className="cl-title">Accept commercial terms</div>
                  <div className="cl-sub">{termsAcceptedCount} of 5 clauses accepted</div>
                  <div className="mini-progress">
                    <div className="mp-bar">
                      <div className="mp-fill" style={{ width: `${termsProgressPct}%` }} />
                    </div>
                    <span className="mp-num">{termsProgressPct}%</span>
                  </div>
                </div>
                <div className="cl-stat">{allTermsConfirmed ? "Done" : allLinesConfirmed ? "Open" : "Pending"}</div>
              </div>

              {/* Step 3 */}
              <div className={`cl-step ${otpVerified ? "done" : (allLinesConfirmed && allTermsConfirmed ? "current" : "pending")}`}>
                <div className="cl-node"><span className="cl-node-num">3</span></div>
                <div>
                  <div className="cl-title">Sign digitally (OTP)</div>
                  <div className="cl-sub">SHA-256 hash will be sealed on activation</div>
                </div>
                <div className="cl-stat">{otpVerified ? "Verified" : (allLinesConfirmed && allTermsConfirmed ? "Open" : "Pending")}</div>
              </div>
            </div>
          </section>

          {/* Decline option */}
          <section className="section-card">
            <div className="section-body" style={{ padding: "12px 16px" }}>
              <button
                className="btn btn-ghost btn-block"
                onClick={() => setShowDecline(true)}
                style={{ color: "var(--danger)" }}
              >
                <Icon w={13} sw={2.2} d={ICONS.x} />
                Decline this contract
              </button>
            </div>
          </section>

          <Link href="/dashboard/vendor/rate-contracts/requests" style={{ fontSize: 12, color: "var(--fg-3)", textAlign: "center", display: "block" }}>
            ← Back to requests
          </Link>
        </aside>
      </div>

      {/* Sticky action dock */}
      <div className="action-dock">
        <div className="inner">
          <div className="left">
            <span>Lines:{" "}
              <span className={step1Done ? "em text-success fw-600 mono" : "em text-warn fw-600 mono"}>{confirmedCount} of {totalLines}</span>
            </span>
            <span className="text-fg-4">·</span>
            <span>Terms:{" "}
              <span className={allTermsConfirmed ? "em text-success fw-600" : "em text-warn fw-600"}>
                {allTermsConfirmed ? "Accepted" : `${termsAcceptedCount} of 5`}
              </span>
            </span>
            <span className="text-fg-4">·</span>
            <span>Signature:{" "}
              <span className={signed ? "em text-success fw-600" : "em text-warn fw-600"}>
                {signed ? "Signed" : (showOtp ? "Awaiting OTP" : "Pending")}
              </span>
            </span>
          </div>
          <div className="right">
            {signed ? (
              <button className="btn btn-success btn-lg" onClick={() => router.push("/dashboard/vendor/rate-contracts/active")}>
                <Icon w={15} d={ICONS.check} />
                View active contract
              </button>
            ) : awaitingBuyer ? (
              <span className="dock-hint text-warn">
                <Icon w={13} d={ICONS.clock} /> Clarification under review — signing paused
              </span>
            ) : hasLocalFlags ? (
              <button className="btn btn-warn btn-lg" onClick={submitClarifications} disabled={submittingClar}>
                <Icon w={15} d={ICONS.send} />
                {submittingClar ? "Submitting…" : `Submit clarification request (${flaggedCount})`}
              </button>
            ) : (
              <span className="dock-hint">
                {currentStep === 1 && "Confirm each line to continue"}
                {currentStep === 2 && "Accept the commercial terms to continue"}
                {currentStep === 3 && "Sign with OTP in the panel above to activate"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Decline modal */}
      {showDecline && (
        <div className="arc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowDecline(false); }}>
          <div className="arc-modal">
            <div className="modal-head">
              <div className="t">
                <div className="ic" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  <Icon w={16} sw={2.2} d={ICONS.alert} />
                </div>
                <div>
                  <h3>Decline this rate contract?</h3>
                  <div className="sub">This action cannot be undone.</div>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="guide danger" style={{ marginBottom: 12 }}>
                <div className="g-ic">
                  <Icon w={14} sw={2.2} d={ICONS.circleX} />
                </div>
                <div>
                  Declining will <strong>route this ARC back to the buyer's committee</strong>. They will either award to the L2 vendor or close the contract without award.
                  Your future eligibility may be affected.
                </div>
              </div>
              <label className="label">Reason for declining (visible to buyer)</label>
              <textarea
                className="textarea"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Raw material cost has shifted significantly since quote submission; we cannot honour the awarded rates."
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setShowDecline(false)} disabled={declining}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDecline} disabled={declining}>
                <Icon w={13} sw={2.2} d={ICONS.x} />
                {declining ? "Declining…" : "Decline contract"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="arc-toast">
          <span className="t-ic">✓</span>
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — shape-aware: dark hero, action banner, then the 2-column body
//  (contract paper with doc sections · sticky sign/OTP aside). Mirrors the
//  loaded layout 1:1.
// ──────────────────────────────────────────────────────────────────────────
const ASk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function AcceptSkeleton() {
  return (
    <main className="main-body">
      {/* Hero */}
      <section className="arc-sk-hero">
        <ASk w={190} h={11} style={{ marginBottom: 12 }} />
        <ASk w="52%" h={24} style={{ marginBottom: 10 }} />
        <ASk w="60%" h={12} />
      </section>

      {/* Action banner */}
      <section style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
        <ASk w={44} h={44} r={11} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <ASk w="40%" h={15} style={{ marginBottom: 7 }} />
          <ASk w="65%" h={11} />
        </div>
      </section>

      {/* 2-col: contract paper + sign aside */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 18, alignItems: "flex-start" }}>
        <div className="arc-sk-tile">
          <ASk w={250} h={16} style={{ marginBottom: 18 }} />
          {Array.from({ length: 3 }).map((_, s) => (
            <div key={s} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
              <ASk w={170} h={11} style={{ marginBottom: 12 }} />
              <ASk w="90%" h={11} style={{ marginBottom: 7 }} />
              <ASk w="75%" h={11} style={{ marginBottom: 7 }} />
              <ASk w="55%" h={11} />
            </div>
          ))}
        </div>
        <div className="arc-sk-tile">
          <ASk w={140} h={14} style={{ marginBottom: 14 }} />
          <ASk w="100%" h={44} r={9} style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ASk key={i} w={40} h={46} r={8} />
            ))}
          </div>
          <ASk w="100%" h={40} r={9} />
        </div>
      </div>
    </main>
  );
}
