// Vendor — Pending Acceptance page. Translates prototypes/arc_ui/vendor-accept.html
// into a React page wired to ArcApi.vendorGetContract / vendorRequestOtp /
// vendorVerifyOtp / vendorDeclineContract. Per-line confirm, commercial-terms
// acceptance, OTP signing and the decline modal are all controlled here.

import { useEffect, useMemo, useState } from "react";
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

const TERMS = [
  { key: "payment",    title: "Payment terms",            text: "Net 45 days from GRN at receiving BU. Invoices to be raised per call-off PO with HSN code as per agreed line. Late-payment penalty 1.5% per month payable by Buyer if Net 45 + 15 grace breached." },
  { key: "delivery",   title: "Delivery & lead time",     text: "DDP delivery to BU loading dock between 9:00 and 17:00 IST. Standard lead time as agreed per line. Partial deliveries acceptable. Packing list, lot number and OC certificate to accompany each shipment." },
  { key: "penalty",    title: "Penalty / SLA clauses",    text: "Late-delivery penalty 0.5% of line value per day, capped at 7.5%. Quality reject > 3% of any lot triggers replacement at vendor's cost within 7 days; repeat (3 consecutive lots) gives Buyer right to terminate without notice." },
  { key: "escalation", title: "Price escalation",         text: "Rates are fixed for the full contract term; commodity-index moves of > 8% (referenced to public monthly average) entitle vendor to a one-time review request, subject to Buyer approval." },
  { key: "termination",title: "Termination & exit",       text: "Either party may terminate for cause with 30 days' written notice; for convenience with 60 days' notice. On termination, all open call-off POs shall be honoured. Vendor agrees to a 90-day transition support window at the contracted rates." },
];

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
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  // line-level state (keyed by line.id)
  const [lineConfirmed, setLineConfirmed] = useState({});
  const [lineFlagged, setLineFlagged] = useState({}); // {id: {note}}
  const [flagOpen, setFlagOpen] = useState({});
  const [flagDraft, setFlagDraft] = useState({});

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

  // load contract
  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.vendorGetContract(contractId);
        if (cancelled) return;
        setContract(res?.data?.contract || null);
        setLines(res?.data?.lines || []);
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

  const grandTotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.unit_rate || 0) * Number(l.committed_qty || 0), 0),
    [lines]
  );

  const canSign =
    allLinesConfirmed &&
    allTermsConfirmed &&
    otpCode.length === 6 &&
    otpVerified;

  const deadline = contract?.awaiting_until || contract?.contract_end_at;
  const respondDays = daysLeft(deadline);

  // ---- handlers ----
  const toggleConfirm = (id) => {
    if (lineFlagged[id]) return;
    setLineConfirmed((s) => ({ ...s, [id]: !s[id] }));
  };
  const openFlag = (id) => {
    setFlagOpen((s) => ({ ...s, [id]: true }));
    setFlagDraft((s) => ({ ...s, [id]: s[id] || "" }));
  };
  const cancelFlag = (id) => {
    setFlagOpen((s) => ({ ...s, [id]: false }));
  };
  const flagLine = (id) => {
    setLineFlagged((s) => ({ ...s, [id]: { note: flagDraft[id] || "" } }));
    setLineConfirmed((s) => ({ ...s, [id]: false }));
    setFlagOpen((s) => ({ ...s, [id]: false }));
    showToast("Line flagged for clarification — routed to CE");
  };
  const unflagLine = (id) => {
    setLineFlagged((s) => { const n = { ...s }; delete n[id]; return n; });
    setFlagDraft((s) => ({ ...s, [id]: "" }));
    showToast("Flag removed");
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

  // ---- render ----
  if (!contractId) return null;
  if (loading) {
    return <AcceptSkeleton />;
  }
  if (!contract) {
    return <div style={{ padding: 32, color: "var(--fg-3)" }}>Contract not found.</div>;
  }

  const arcNumber = contract.arc_number || `#${contract.id}`;
  const arcTitle  = contract.arc_title || contract.title || "Rate contract";
  const vendorName = contract.vendor_name || "Your company";
  const buName     = contract.hotel_name || "Hotel";
  const category   = contract.category_name || contract.category || "";

  const termsAcceptedCount = Object.values(termCheck).filter(Boolean).length;

  const linesProgressPct = totalLines
    ? Math.round(((confirmedCount + flaggedCount) / totalLines) * 100)
    : 0;
  const termsProgressPct = Math.round((termsAcceptedCount / 5) * 100);

  return (
    <main className="main-body">
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
              <span>Buyer: <span className="em">Workwise Hospitality Group</span></span>
              <span className="sep">·</span>
              <span>{category || "—"}</span>
              <span className="sep">·</span>
              <span className="em">{buName}</span>
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
            <button className="btn">
              <Icon w={13} d={ICONS.download} />
              Download PDF
            </button>
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell"><div className="k">Vendor</div><div className="v"><span className="em">{vendorName}</span></div></div>
          <div className="cell"><div className="k">Contract term</div><div className="v">{fmtDate(contract.contract_start_at)} → {fmtDate(contract.contract_end_at)}</div></div>
          <div className="cell"><div className="k">Total committed value</div><div className="v"><span className="em mono">{fmtLakh(grandTotal)}</span></div></div>
          <div className="cell"><div className="k">Award covers</div><div className="v">{lines.length} SKU{lines.length === 1 ? "" : "s"} · <span className="em">{buName}</span></div></div>
          <div className="cell"><div className="k">Escalation policy</div><div className="v">Fixed for term</div></div>
        </div>
      </section>

      {/* ACTION BANNER */}
      <section className="action-center">
        <div className="ac-icon">
          <Icon w={22} d={ICONS.doc} />
        </div>
        <div className="ac-body">
          <div className="ac-title">You've been awarded this rate contract</div>
          <div className="ac-sub">
            Review the document, <strong>confirm each line</strong>, accept the commercial terms, then <strong>sign with OTP</strong> to activate.
            If anything needs clarification, <strong>flag the specific line</strong> — it routes back to the buyer's commercial evaluator and pauses your timer.
          </div>
        </div>
        <div className="ac-actions">
          <button className="btn btn-ghost" onClick={() => setShowDecline(true)}>
            <Icon w={14} d={ICONS.x} />
            Decline
          </button>
        </div>
      </section>

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
              <div className="dt-seal">Awaiting<br />Counter-<br />signature</div>
            </div>

            {/* Parties & Period */}
            <div className="doc-section" style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h"><span className="dh-num">1</span> Parties &amp; Period</div>
              <div className="parties-grid">
                <div className="party-card">
                  <div className="p-role">Buyer</div>
                  <div className="p-name">Workwise Hospitality Group</div>
                  <div className="p-meta">
                    Procurement HQ
                    <br />Authorised signatory: <strong style={{ color: "var(--fg)" }}>Buyer Procurement Lead</strong>
                  </div>
                  <div className="p-gst">GSTIN: N/A</div>
                </div>
                <div className="vs-chip">VS</div>
                <div className="party-card" style={{ borderColor: "rgba(67,56,202,0.28)", background: "var(--indigo-soft)" }}>
                  <div className="p-role" style={{ color: "var(--indigo)" }}>Vendor</div>
                  <div className="p-name">{vendorName}</div>
                  <div className="p-meta">
                    Registered vendor
                    <br />Authorised signatory: <strong style={{ color: "var(--fg)" }}>{contract.vendor_signatory || "Authorised signatory"}</strong>
                  </div>
                  <div className="p-gst">GSTIN: {contract.vendor_gstin || "—"}</div>
                </div>
              </div>
              <div className="term-grid" style={{ marginTop: 16 }}>
                <div className="t-k">Contract term</div>
                <div className="t-v">
                  <strong style={{ color: "var(--fg)" }}>{fmtDate(contract.contract_start_at)}</strong> through{" "}
                  <strong style={{ color: "var(--fg)" }}>{fmtDate(contract.contract_end_at)}</strong>, non-auto-renewing.
                </div>
                <div className="t-k">Business unit</div>
                <div className="t-v">
                  <span className="bu-tag primary">
                    <Icon w={10} sw={2.4} d={ICONS.square} />
                    <span>{buName}</span>
                  </span>
                </div>
                <div className="t-k">Award scope</div>
                <div className="t-v">
                  Sole supplier for <strong>{lines.length}</strong> SKU(s) for <strong>{buName}</strong>. Buyer retains a 10% emergency-procurement carve-out.
                </div>
              </div>
            </div>

            {/* Items / Lines */}
            <div className="doc-section" style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h flex items-center justify-between" style={{ display: "flex" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="dh-num">2</span> Awarded Line Items · rates &amp; quantities
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
                            </div>
                            <div className="lr-spec">{line.spec_note || line.notes || ""}</div>
                          </div>
                        </div>
                        <div className="lr-confirm">
                          <label
                            className="confirm-chip"
                            onClick={(e) => { e.preventDefault(); toggleConfirm(line.id); }}
                            style={isFlagged ? { pointerEvents: "none", opacity: 0.45 } : undefined}
                          >
                            <span className="cc-box"></span>
                            <span>{isConfirmed ? "Line confirmed" : "Confirm this line"}</span>
                          </label>
                          {!isFlagged && !flagOpen[line.id] && (
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
                              <span>{buName}</span>
                              <span className="qty">{Number(line.committed_qty || 0).toLocaleString("en-IN")} {uom}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Flag inline composer */}
                      {flagOpen[line.id] && !isFlagged && (
                        <div className="flag-collapse">
                          <div className="fc-h">
                            <Icon w={12} sw={2.4} d={ICONS.flag} /> Raise clarification on this line
                          </div>
                          <textarea
                            className="textarea"
                            value={flagDraft[line.id] || ""}
                            onChange={(e) => setFlagDraft((s) => ({ ...s, [line.id]: e.target.value }))}
                            placeholder={`e.g. Rate of ${fmtINR(line.unit_rate)} assumes Mumbai port FOB — please confirm DDP terms for ${buName}.`}
                          />
                          <div className="fc-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => cancelFlag(line.id)}>Cancel</button>
                            <button className="btn btn-warn btn-sm" onClick={() => flagLine(line.id)}>
                              <Icon w={12} sw={2.4} d={ICONS.send} />
                              Send to CE
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Flag confirmed view */}
                      {isFlagged && (
                        <div className="flag-shown">
                          <div className="fs-h">
                            <span>
                              <Icon w={11} sw={2.4} d={ICONS.flag} /> Clarification raised · routed to Commercial Evaluator
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

            {/* Commercial terms */}
            <div className="doc-section" style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h"><span className="dh-num">3</span> Commercial Terms · accept each clause</div>
              <div className="term-list">
                {TERMS.map((t) => (
                  <div key={t.key} className={`term-item ${termCheck[t.key] ? "checked" : ""}`}>
                    <label className="cbx" style={{ paddingTop: 2 }}>
                      <input type="checkbox" checked={termCheck[t.key]} onChange={() => toggleTerm(t.key)} />
                      <span className="cbx-box"></span>
                    </label>
                    <div className="ti-body">
                      <div className="ti-title">{t.title}</div>
                      <div className="ti-text">{t.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance */}
            <div className="doc-section" style={{ position: "relative", zIndex: 1 }}>
              <div className="doc-h"><span className="dh-num">4</span> Compliance documents · submitted &amp; on file</div>
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
              <div className="doc-h"><span className="dh-num">5</span> Signature page · preview</div>
              <div className="parties-grid">
                <div className="party-card" style={{ background: "var(--surface-2)" }}>
                  <div className="p-role">For Buyer</div>
                  <div className="p-name">Buyer Procurement Lead</div>
                  <div className="p-meta">Workwise Hospitality Group</div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border-strong)" }}>
                    <div className="sig-block" style={{ padding: "10px 12px" }}>
                      <div className="sig-name" style={{ fontSize: 24 }}>Workwise Procurement</div>
                      <div className="sig-meta">e-signed · {fmtDate(contract.committee_approved_at || contract.updated_at)}</div>
                    </div>
                  </div>
                </div>
                <div className="vs-chip">&amp;</div>
                <div
                  className="party-card"
                  style={{ background: "var(--surface-2)", borderStyle: "dashed", borderColor: "var(--warn)" }}
                >
                  <div className="p-role" style={{ color: "var(--warn)" }}>For Vendor — awaiting</div>
                  <div className="p-name">{contract.vendor_signatory || "Authorised signatory"}</div>
                  <div className="p-meta">{vendorName}</div>
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border-strong)" }}>
                    {!otpVerified ? (
                      <div style={{ textAlign: "center", padding: "18px 12px", fontSize: 11.5, color: "var(--fg-4)", fontStyle: "italic" }}>
                        — signature pending OTP verification —
                      </div>
                    ) : (
                      <div className="sig-block">
                        <div className="sig-name">{contract.vendor_signatory || vendorName}</div>
                        <div className="sig-meta">e-signing · OTP verified · today</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="hash-row" style={{ marginTop: 14 }}>
                <span className="hr-l">SHA-256 (draft):</span>
                <span>{contract.contract_hash || "— final hash computed at activation —"}</span>
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

          {/* OTP signature card */}
          <section className="approve-card">
            <div className="ac-head">
              <span className="here-now">Step 3 · digital signature</span>
              <div className="ac-title">Sign with OTP</div>
              <div className="ac-sub">A one-time code will be sent to your registered mobile and email. Signing is irrevocable.</div>
            </div>
            <div className="ac-body">

              {/* Before OTP sent */}
              {!showOtp && (
                <div>
                  <div className="ev-stack">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
                        <Icon w={15} d={ICONS.phone} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="fs-12 text-fg fw-600">{contract.vendor_phone_masked || "+91 ●●●●● ●●●●●"}</div>
                        <div className="fs-11 text-fg-3">Registered for vendor signatory</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
                        <Icon w={15} d={ICONS.mail} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="fs-12 text-fg fw-600">{contract.vendor_email || "vendor on file"}</div>
                        <div className="fs-11 text-fg-3">Mirror copy of OTP</div>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-warn btn-block btn-lg mt-3"
                    onClick={sendOtp}
                    disabled={otpSending}
                  >
                    <Icon w={15} d={ICONS.paperPlane} />
                    {otpSending ? "Sending OTP…" : "Send OTP"}
                  </button>
                </div>
              )}

              {/* After OTP shown */}
              {showOtp && (
                <div>
                  <div className="fs-12 text-fg-2 fw-600 mb-2 flex items-center justify-between">
                    <span>Enter 6-digit code</span>
                    {!otpVerified && otpSending && <span className="fs-11 text-fg-3">Sending<span className="mono">…</span></span>}
                    {!otpVerified && otpVerifying && <span className="fs-11 text-fg-3">Verifying<span className="mono">…</span></span>}
                    {otpVerified && (
                      <span className="fs-11 text-success fw-600">
                        <Icon w={11} sw={3} d={ICONS.check} /> Verified
                      </span>
                    )}
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
                      <span className="hr-l">Dev OTP:</span>
                      <span><code>{devCode}</code></span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 fs-11 text-fg-3">
                    <span>Sent to your registered phone &amp; email</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={resendOtp}
                      style={{ padding: "3px 8px", fontSize: 11 }}
                      disabled={otpSending}
                    >
                      Resend
                    </button>
                  </div>

                  {!otpVerified && otpCode.length === 6 && (
                    <button
                      className="btn btn-blue btn-block btn-lg mt-3"
                      onClick={verifyOtp}
                      disabled={otpVerifying}
                    >
                      <Icon w={15} d={ICONS.check} />
                      {otpVerifying ? "Verifying…" : "Verify OTP"}
                    </button>
                  )}

                  {/* Signature preview */}
                  <div className="mt-4">
                    <div className="fs-11 text-fg-3 fw-600 mb-2" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Your signature
                    </div>
                    <div className="sig-block">
                      <div className="sig-name">{contract.vendor_signatory || "Authorised signatory"}</div>
                      <div className="sig-meta">{vendorName}</div>
                      {otpVerified && (
                        <div className="fs-11 text-success fw-600 mt-2">
                          <Icon w={11} sw={3} d={ICONS.check} /> OTP verified · ready to seal
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn btn-success btn-block btn-lg mt-3"
                    onClick={acceptSign}
                    disabled={!canSign || signing}
                  >
                    <Icon w={15} d={ICONS.pen} />
                    {signing ? "Sealing…" : "Confirm signature & activate"}
                  </button>

                  {!canSign && otpVerified && (
                    <div className="sig-helper" style={{ borderLeftColor: "var(--warn)" }}>
                      Complete{" "}
                      {!allLinesConfirmed && <strong>line confirmations</strong>}
                      {!allLinesConfirmed && !allTermsConfirmed && " and "}
                      {!allTermsConfirmed && <strong>commercial-terms acceptance</strong>}
                      {" "}before signing.
                    </div>
                  )}
                </div>
              )}

              <div className="sig-helper">
                By signing you accept this contract <strong>irrevocably</strong> under the WorkWise Terms of Service.
                The signed document hash (<span className="mono">SHA-256</span>) will be sealed and stored on activation.
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
            <span>Lines confirmed: <span className="em mono">{confirmedCount} of {totalLines}</span></span>
            <span className="text-fg-4">·</span>
            <span>Terms:{" "}
              <span className={allTermsConfirmed ? "em text-success fw-600" : "em text-warn fw-600"}>
                {allTermsConfirmed ? "Accepted" : `${termsAcceptedCount} of 5`}
              </span>
            </span>
            <span className="text-fg-4">·</span>
            <span>Signature:{" "}
              <span className={otpVerified ? "em text-success fw-600" : "em text-warn fw-600"}>
                {otpVerified ? "OTP verified" : (showOtp ? "Awaiting OTP" : "Pending")}
              </span>
            </span>
          </div>
          <div className="right">
            <button className="btn btn-ghost" onClick={() => showToast("Open any line in the document and click Flag for clarification")}>
              <Icon w={13} d={ICONS.flag} />
              Flag a clarification
            </button>
            <button className="btn btn-success btn-lg" onClick={acceptSign} disabled={!canSign || signing}>
              <Icon w={15} d={ICONS.check} />
              Accept &amp; sign
            </button>
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
