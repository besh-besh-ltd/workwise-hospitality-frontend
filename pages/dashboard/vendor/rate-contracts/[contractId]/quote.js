// ARC v2 vendor quote wizard — port of prototypes/arc_ui/vendor-quote.html.
// Three-step flow: Overview & terms → Items & tech eval → Pricing & submit.
// Wired to vendorGetRequestDetail / vendorSaveQuoteDraft / vendorSubmitQuote /
// vendorWithdrawQuote. The page intentionally renders ONLY the inner main-body
// content — DashboardShell (via pages/_app.js) provides the sidebar + topbar.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

const STEPS = [
  { label: "Overview & terms",  meta: "Buyer · scope · T&Cs" },
  { label: "Items & tech eval", meta: "Specs · clauses · past data" },
  { label: "Pricing & submit",  meta: "Rates · commercial · sign" },
];

const fmtN = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");
const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const blankLine = () => ({
  rate: "",
  gst_pct: 5,
  gstMode: "%",
  freight: "",
  lead_time_days: "",
  moq: "",
  comment: "",
  leadNote: "",
  validity_notes: "",
  charges: [],
});

export default function VendorQuotePage() {
  const router = useRouter();
  const { contractId } = router.query;

  const [loading, setLoading] = useState(true);
  const [arc, setArc] = useState(null);
  const [items, setItems] = useState([]);
  const [invitation, setInvitation] = useState(null);
  const [quote, setQuote] = useState(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [openHistory, setOpenHistory] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(null);

  const [price, setPrice] = useState({});           // { [arc_item_id]: line }
  const [techResp, setTechResp] = useState({});     // { 'itemId|clauseId': {decision,note} }

  const [globals, setGlobals] = useState({
    gstin: "",
    comment: "",
    paymentTerms: [
      { label: "Advance on PO acceptance", pct: 30 },
      { label: "Net 30 after delivery",    pct: 70 },
    ],
  });

  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -------------------- load --------------------
  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.vendorGetRequestDetail(contractId);
        if (cancelled) return;
        const a = res?.arc || null;
        const its = res?.items || [];
        const inv = res?.invitation || null;
        const qt = res?.quote || null;
        const ls = res?.lines || [];

        setArc(a);
        setItems(its);
        setInvitation(inv);
        setQuote(qt);

        // Seed price state from draft lines if present.
        const seed = {};
        for (const ln of ls) {
          seed[ln.arc_item_id] = {
            ...blankLine(),
            rate: ln.rate ?? "",
            gst_pct: ln.gst_pct ?? 5,
            gstMode: "%",
            freight: ln.charges ?? "",
            lead_time_days: ln.lead_time_days ?? "",
            moq: ln.moq ?? "",
            validity_notes: ln.validity_notes ?? "",
          };
        }
        // Fill blanks for items without a draft line.
        for (const it of its) {
          if (!seed[it.id]) seed[it.id] = blankLine();
        }
        setPrice(seed);

        if (qt) {
          setGstin(qt.gstin_used || "");
          setGlobals(g => ({
            ...g,
            gstin: qt.gstin_used || "",
            comment: qt.payment_terms_notes || "",
          }));
        }
        if (qt?.status === "submitted") {
          setSubmitted(true);
          setSubmittedAt(qt.submitted_at ? new Date(qt.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");
          setReferenceNumber(qt.reference_number || `QT-${a?.id || ""}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [contractId]);

  // setGstin placeholder for the older seed line above
  const setGstin = (v) => setGlobals(g => ({ ...g, gstin: v }));

  // -------------------- pricing helpers --------------------
  const priceLine = (itemId) => price[itemId] || blankLine();

  const updateLine = (itemId, patch) => {
    setPrice(p => ({ ...p, [itemId]: { ...(p[itemId] || blankLine()), ...patch } }));
  };

  const addChargeOfType = (itemId, type) => {
    if (!type) return;
    setPrice(p => {
      const cur = p[itemId] || blankLine();
      return { ...p, [itemId]: { ...cur, charges: [...cur.charges, { name: type, amount: "", amountMode: "%", tax: "", note: "" }] } };
    });
  };

  const removeCharge = (itemId, idx) => {
    setPrice(p => {
      const cur = p[itemId] || blankLine();
      const next = cur.charges.slice();
      next.splice(idx, 1);
      return { ...p, [itemId]: { ...cur, charges: next } };
    });
  };

  const productChargesTotal = (itemId) => {
    const l = priceLine(itemId);
    return (l.charges || []).reduce((s, c) => s + safeNum(c.amount), 0);
  };

  const lineTotal = (itemId, qty) => {
    const l = priceLine(itemId);
    if (!l.rate) return 0;
    const subtotal = qty * safeNum(l.rate) + qty * safeNum(l.freight);
    const tax = l.gstMode === "%" ? (subtotal * safeNum(l.gst_pct)) / 100 : qty * safeNum(l.gst_pct);
    return Math.round(subtotal + tax);
  };

  const totals = useMemo(() => {
    let subtotal = 0, gst = 0, extra = 0;
    const extras = {};
    items.forEach(it => {
      const l = price[it.id] || blankLine();
      if (!l.rate) return;
      const qty = safeNum(it.committed_qty ?? it.indicative_qty ?? 0);
      const sub = qty * safeNum(l.rate);
      subtotal += sub;
      gst += l.gstMode === "%" ? (sub * safeNum(l.gst_pct)) / 100 : qty * safeNum(l.gst_pct);
      extra += qty * safeNum(l.freight);
      (l.charges || []).forEach(c => {
        const amt = safeNum(c.amount);
        const v = c.amountMode === "%" ? (sub * amt) / 100 : amt;
        extras[c.name] = (extras[c.name] || 0) + v;
        extra += v;
      });
    });
    return {
      subtotal: Math.round(subtotal),
      gst: Math.round(gst),
      extraCharges: Object.entries(extras).map(([label, amount]) => ({ label, amount: Math.round(amount) })),
      grand: Math.round(subtotal + gst + extra),
    };
  }, [items, price]);

  const paymentTotal = useMemo(() => globals.paymentTerms.reduce((s, t) => s + safeNum(t.pct), 0), [globals.paymentTerms]);

  // -------------------- tech eval (backend currently exposes none on this endpoint) --------------------
  const techClauses = useMemo(() => arc?.tech_clauses || [], [arc]);
  const itemClauses = (itemId) => {
    const block = techClauses.find(b => b.arc_item_id === itemId || b.itemId === itemId);
    return block?.clauses || [];
  };
  const hasTechClauses = techClauses.length > 0;

  const respKey = (itemId, cId) => `${itemId}|${cId}`;
  const getResp = (itemId, cId) => techResp[respKey(itemId, cId)] || { decision: null, note: "" };

  const setDecision = (itemId, cId, d) => {
    setTechResp(prev => {
      const k = respKey(itemId, cId);
      const cur = prev[k] || { decision: null, note: "" };
      return { ...prev, [k]: { ...cur, decision: cur.decision === d ? null : d } };
    });
  };

  const productEvalCount = (itemId) => itemClauses(itemId).filter(c => getResp(itemId, c.id).decision !== null).length;
  const evalTotal = items.reduce((s, it) => s + itemClauses(it.id).length, 0);
  const evalAnswered = items.reduce((s, it) => s + productEvalCount(it.id), 0);
  const evalProgress = evalTotal ? Math.round((evalAnswered / evalTotal) * 100) : 100;

  // -------------------- step gating --------------------
  const canVisit = (i) => {
    if (i <= currentStep) return true;
    if (i === 1) return acceptedTerms;
    if (i === 2) return acceptedTerms && (hasTechClauses ? evalAnswered === evalTotal : true);
    return false;
  };
  const canContinue = (() => {
    if (currentStep === 0) return acceptedTerms;
    if (currentStep === 1) return hasTechClauses ? evalAnswered === evalTotal : true;
    return false;
  })();
  const canSubmit = (() => {
    if (!acceptedTerms) return false;
    if (hasTechClauses && evalAnswered < evalTotal) return false;
    if (paymentTotal !== 100) return false;
    return items.length > 0 && items.every(it => safeNum(priceLine(it.id).rate) > 0);
  })();

  const goToStep = (i) => { if (canVisit(i)) setCurrentStep(i); };
  const nextStep = () => { if (canContinue && currentStep < 2) setCurrentStep(s => s + 1); };
  const prevStep = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  // -------------------- draft + submit --------------------
  const buildDraftPayload = () => ({
    arc_id: Number(contractId),
    payment_terms: globals.paymentTerms.map(t => `${t.label || ""}: ${safeNum(t.pct)}%`).join(" | "),
    gstin_used: globals.gstin || "",
    lines: items.map(it => {
      const l = priceLine(it.id);
      return {
        arc_item_id: it.id,
        rate: safeNum(l.rate) || null,
        gst_pct: safeNum(l.gst_pct) || null,
        charges: safeNum(l.freight) || null,
        lead_time_days: safeNum(l.lead_time_days) || null,
        moq: safeNum(l.moq) || null,
        validity_notes: l.validity_notes || l.comment || "",
      };
    }),
  });

  const saveDraft = async (silent = false) => {
    if (!contractId) return;
    setSavingDraft(true);
    try {
      await ArcApi.vendorSaveQuoteDraft(buildDraftPayload());
      if (!silent) showToastMsg("Draft saved");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleNextStep = async () => {
    if (!canContinue) return;
    await saveDraft(true);
    nextStep();
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await ArcApi.vendorSaveQuoteDraft(buildDraftPayload());
      await ArcApi.vendorSubmitQuote(contractId);
      const ref = "QT-" + (arc?.arc_number || "").replace(/\D/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
      setReferenceNumber(ref);
      setSubmittedAt(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const regretQuote = async () => {
    if (!contractId) return;
    try {
      await ArcApi.vendorWithdrawQuote(contractId);
      showToastMsg("Withdrew from this tender");
      setTimeout(() => router.push("/dashboard/vendor/rate-contracts/requests"), 800);
    } catch (e) {
      showToastMsg("Could not withdraw");
    }
  };

  const copyReference = () => {
    if (referenceNumber && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(referenceNumber);
    }
    showToastMsg("Reference copied");
  };

  const showToastMsg = (m) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };

  // -------------------- payment-term editors --------------------
  const addPaymentTerm  = () => setGlobals(g => ({ ...g, paymentTerms: [...g.paymentTerms, { label: "", pct: 0 }] }));
  const removePaymentTerm = (i) => setGlobals(g => g.paymentTerms.length === 1 ? g : ({ ...g, paymentTerms: g.paymentTerms.filter((_, idx) => idx !== i) }));
  const updatePaymentTerm = (i, patch) => setGlobals(g => ({ ...g, paymentTerms: g.paymentTerms.map((t, idx) => idx === i ? { ...t, ...patch } : t) }));

  // -------------------- derived helpers --------------------
  const submissionEnd = arc?.submission_end_at ? new Date(arc.submission_end_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const submissionStart = arc?.submission_start_at ? new Date(arc.submission_start_at).toLocaleDateString("en-IN") : "—";
  const termStart = arc?.contract_start_at ? new Date(arc.contract_start_at).toLocaleDateString("en-IN") : "—";
  const termEnd = arc?.contract_end_at ? new Date(arc.contract_end_at).toLocaleDateString("en-IN") : "—";
  const arcNumber = arc?.arc_number || "—";

  // Fallback for history — we don't have a backend feed yet.
  const history = [];

  if (loading) {
    return <QuoteSkeleton />;
  }
  if (!arc) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>
        Could not load this rate-contract request.
        <div style={{ marginTop: 12 }}>
          <Link href="/dashboard/vendor/rate-contracts/requests" className="btn btn-secondary btn-sm">Back to requests</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 108 }}>
      {/* HERO */}
      <section className="arc-hero">
        <div className="top">
          <div>
            <div className="eyebrow">Invitation to tender · sealed bid</div>
            <h1>
              <span>{arc.title}</span>
              <span className="num">{`#${arcNumber}`}</span>
              <span className="status-chip floated">Open · awaiting your quote</span>
            </h1>
            <div className="sub">
              <span className="em">Workwise Hospitality</span>
              <span className="sep">·</span>
              <span>{arc.category_title || arc.category_id || "—"}</span>
              <span className="sep">·</span>
              <span>
                <span className="em">{arc.hotel_code || ""}</span> {arc.hotel_name || ""}
              </span>
              <span className="sep">·</span>
              <span>Single-BU contract</span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-sm" onClick={() => setOpenHistory(true)} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
              Past quotes
            </button>
            <button className="btn btn-sm" onClick={regretQuote} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              Regret
            </button>
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell"><div className="k">Submission closes</div><div className="v"><span className="em">{submissionEnd}</span></div></div>
          <div className="cell"><div className="k">Contract term</div><div className="v"><span>{termStart}</span> → <span>{termEnd}</span></div></div>
          <div className="cell"><div className="k">Items</div><div className="v"><span className="em">{items.length}</span> line item(s)</div></div>
          <div className="cell"><div className="k">Business unit</div><div className="v"><span className="em">{arc.hotel_code || "—"}</span> {arc.hotel_name || ""}</div></div>
          <div className="cell"><div className="k">Bid sealing</div><div className="v">Encrypted until close</div></div>
        </div>
      </section>

      {/* STEPPER */}
      <nav className="stepper" aria-label="Progress">
        {STEPS.map((s, i) => {
          const cls = [
            "step",
            currentStep === i ? "is-active" : "",
            currentStep > i ? "is-done" : "",
            currentStep < i && !canVisit(i) ? "is-disabled" : "",
          ].filter(Boolean).join(" ");
          return (
            <div className="contents" key={i}>
              <button
                className={cls}
                onClick={() => goToStep(i)}
                disabled={currentStep < i && !canVisit(i)}
                type="button"
              >
                <div className="num"><span className="num-text">{i + 1}</span></div>
                <div className="label-wrap">
                  <div className="label">{s.label}</div>
                  <div className="meta">{s.meta}</div>
                </div>
              </button>
              {i < STEPS.length - 1 && <div className="step-divider" />}
            </div>
          );
        })}
      </nav>

      {/* STEP 1 — Overview & terms */}
      {currentStep === 0 && (
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Tender overview</div>
              <div className="q-section-sub">Review who&apos;s asking, what they need, and the rate-contract terms.</div>
            </div>
            <span className="pill"><span className="pdot" style={{ background: "var(--info)" }}></span>Rate contract · sealed bid</span>
          </div>

          <div className="q-card">
            <div className="q-card-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
                Buyer &amp; scope
              </h3>
              <span className="count">Workwise Hospitality</span>
            </div>
            <div className="detail-grid">
              <div className="detail-cell"><div className="k">Company</div><div className="v">Workwise Hospitality Pvt Ltd</div></div>
              <div className="detail-cell"><div className="k">Business unit</div><div className="v"><span className="mono fw-600">{arc.hotel_code || "—"}</span> {arc.hotel_name || ""}</div></div>
              <div className="detail-cell"><div className="k">Location</div><div className="v">{arc.hotel_city || "—"}</div></div>
              <div className="detail-cell"><div className="k">Category</div><div className="v">{arc.category_title || arc.category_id || "—"}</div></div>
              <div className="detail-cell"><div className="k">Submission window</div><div className="v"><span className="mono">{submissionStart}</span> → <span className="mono">{submissionEnd}</span></div></div>
              <div className="detail-cell"><div className="k">Contract term</div><div className="v"><span className="mono">{termStart}</span> → <span className="mono">{termEnd}</span></div></div>
              <div className="detail-cell"><div className="k">Eligibility</div><div className="v">{arc.eligibility === "open" ? "Open" : "Invitation only"}</div></div>
              <div className="detail-cell"><div className="k">Samples</div><div className="v">{arc.samples_required ? "Required" : "Not required"}</div></div>
              <div className="detail-cell"><div className="k">Price escalation</div><div className="v">{arc.escalation_policy || "Fixed for full contract term"}</div></div>
            </div>
          </div>

          <div className="q-card">
            <div className="q-card-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Items to quote
              </h3>
              <span className="count">{items.length} line item{items.length === 1 ? "" : "s"}</span>
            </div>
            <div className="q-card-section">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between"
                  style={idx > 0 ? { borderTop: "1px solid var(--border)", paddingTop: 13, marginTop: 13 } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0" style={{ background: "var(--surface-3)", color: "var(--fg-3)", border: "1px solid var(--border)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{it.variant_name || it.title || `Item #${it.id}`}</div>
                      <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.4 }}>
                        <span className="mono">{it.variant_slug || it.code || ""}</span>
                        {it.spec ? <> · <span>{it.spec}</span></> : null}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div style={{ fontSize: 10.5, color: "var(--fg-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Indicative qty</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                      <span>{safeNum(it.committed_qty ?? it.indicative_qty ?? 0).toLocaleString("en-IN")}</span>{" "}
                      <span style={{ color: "var(--fg-3)" }}>{it.uom || ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="q-card">
            <div className="q-card-head">
              <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Rate-contract terms
              </h3>
              <div className="flex items-center gap-2">
                <span className="count">{(arc.terms_list?.length || 0)} clauses</span>
                <a href="#" className="file-chip-mini" onClick={e => e.preventDefault()}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  T&amp;C document
                </a>
              </div>
            </div>
            <div className="q-card-section">
              <div className="terms-list">
                {(arc.terms_list || []).map((t, i) => (
                  <div className="term-item" key={i}>
                    <span className="term-num"></span>
                    <div className="term-text"><strong>{t.text}</strong> <span>{t.body}</span></div>
                  </div>
                ))}
                {(!arc.terms_list || arc.terms_list.length === 0) && (
                  <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>No specific clauses uploaded for this contract.</div>
                )}
              </div>
            </div>
            <div className="q-card-section" style={{ background: "var(--surface-2)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Additional ARC-specific terms
              </div>
              <ul style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.65, paddingLeft: 0, listStyle: "none" }}>
                <li>• <strong style={{ color: "var(--fg)" }}>Payment:</strong> <span>{arc.payment_expected || "Net 30 after delivery"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Delivery:</strong> <span>{arc.delivery_expected || "As per call-off PO"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Penalty / LD:</strong> <span>{arc.penalty_clause || "Standard LD per company policy"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Escalation:</strong> <span>{arc.escalation_policy || "Fixed for contract term"}</span></li>
                <li>• <strong style={{ color: "var(--fg)" }}>Call-offs:</strong> Buyer releases POs against this framework — qty per call-off; all other terms inherited.</li>
              </ul>
            </div>
          </div>

          <label
            className={"check" + (acceptedTerms ? " is-checked" : "")}
            onClick={(e) => { e.preventDefault(); setAcceptedTerms(v => !v); }}
          >
            <span className="box"></span>
            <div className="check-body">
              <div className="check-title">I have read and accept the rate-contract terms &amp; conditions above.</div>
              <div className="check-desc">
                By checking this, you confirm that any quote you submit will follow these terms for the full contract term{" "}
                <span className="mono">{termStart}</span> → <span className="mono">{termEnd}</span>.
              </div>
            </div>
          </label>
        </div>
      )}

      {/* STEP 2 — Items & tech eval */}
      {currentStep === 1 && (
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Item specifications &amp; technical evaluation</div>
              <div className="q-section-sub">Review each item&apos;s spec, study 3-year consumption history, and respond to technical clauses.</div>
            </div>
            {hasTechClauses && (
              <div className="flex flex-col items-end gap-2" style={{ minWidth: 240 }}>
                <div className="flex items-baseline justify-between w-full">
                  <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 500 }}>Tech eval progress</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--fg)" }}>{evalAnswered} of {evalTotal}</span>
                </div>
                <div className="q-bar w-full"><div className="q-fill" style={{ width: `${evalProgress}%` }}></div></div>
              </div>
            )}
          </div>

          {items.map((it, pidx) => {
            const clauses = itemClauses(it.id);
            const minPassBlock = techClauses.find(b => (b.arc_item_id || b.itemId) === it.id);
            return (
              <div className="product-card" key={it.id}>
                <div className="product-head">
                  <div>
                    <div className="name">
                      <span className="idx">{String(pidx + 1).padStart(2, "0")}</span>
                      <span>{it.variant_name || it.title || `Item #${it.id}`}</span>
                    </div>
                    <div className="spec">{it.spec || ""}</div>
                    <div className="product-meta-row">
                      <a href="#" className="file-chip-mini" onClick={e => e.preventDefault()}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        TDS · spec sheet
                      </a>
                      <a href="#" className="file-chip-mini" onClick={e => e.preventDefault()}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        Sample dispatch label
                      </a>
                    </div>
                  </div>
                  <div className="qty-block-r">
                    <div className="lbl">Indicative qty</div>
                    <div className="val mono">{safeNum(it.committed_qty ?? it.indicative_qty ?? 0).toLocaleString("en-IN")}</div>
                    <div className="unit">{it.uom || ""}</div>
                  </div>
                </div>

                <div className="kv-row"><div className="kv-k">Item code</div><div className="kv-v mono"><span>{it.variant_slug || it.code || "—"}</span> · <span>{it.uom || ""}</span></div></div>
                <div className="kv-row"><div className="kv-k">Spec</div><div className="kv-v">{it.spec || "—"}</div></div>
                <div className="kv-row">
                  <div className="kv-k">Target price</div>
                  <div className="kv-v">
                    <span className="mono fw-600">{it.target_price != null ? `₹${fmtN(it.target_price)}` : "N/A"}</span>
                    {" / "}<span>{it.uom || ""}</span>{" "}
                    <span className="text-fg-4 fs-11">· buyer reference, non-binding</span>
                  </div>
                </div>

                <div className="kv-row">
                  <div className="kv-k">Past 3-yr<br/>consumption</div>
                  <div className="kv-v">
                    <table className="past-3y-table">
                      <thead>
                        <tr>
                          <th>FY {(new Date().getFullYear()) - 3}</th>
                          <th className="right">FY {(new Date().getFullYear()) - 2}</th>
                          <th className="right">FY {(new Date().getFullYear()) - 1}</th>
                          <th className="right">3-yr avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono fw-600">{safeNum(it.past?.[0]).toLocaleString("en-IN")} {it.uom || ""}</td>
                          <td className="right">{safeNum(it.past?.[1]).toLocaleString("en-IN")}</td>
                          <td className="right">{safeNum(it.past?.[2]).toLocaleString("en-IN")}</td>
                          <td className="right" style={{ color: "var(--fg-3)" }}>
                            {Math.round((safeNum(it.past?.[0]) + safeNum(it.past?.[1]) + safeNum(it.past?.[2])) / 3).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="fs-11 text-fg-4 mt-2">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: -2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{" "}
                      Historical data drawn from past POs — for your demand-planning reference only.
                    </div>
                  </div>
                </div>

                {hasTechClauses && clauses.length > 0 && (
                  <div>
                    <div className="q-card-head" style={{ borderTop: "1px solid var(--border)" }}>
                      <h3>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        Technical evaluation
                      </h3>
                      <span className="count">
                        <span>{productEvalCount(it.id)}</span> of <span>{clauses.length}</span> answered · min pass{" "}
                        <span>{(minPassBlock?.min_pass ?? minPassBlock?.minPass ?? 0) + "%"}</span>
                      </span>
                    </div>
                    {clauses.map((c, cidx) => {
                      const resp = getResp(it.id, c.id);
                      return (
                        <div className={"clause" + (resp.decision !== null ? " is-answered" : "")} key={c.id}>
                          <span className="clause-num">{String(cidx + 1).padStart(2, "0")}</span>
                          <div>
                            <div className="clause-text">{c.text}</div>
                            <div className="clause-meta">
                              <span className="c-weight-pill">weight <span className="mono">{c.weight}</span> marks</span>
                              <span className="pill">{c.type}</span>
                            </div>
                            <div className="clause-actions">
                              <button
                                className={"radio-chip" + (resp.decision === "agree" ? " is-selected agree" : "")}
                                onClick={() => setDecision(it.id, c.id, "agree")}
                                type="button"
                              >
                                <span className="indicator"></span> I agree
                              </button>
                              <button
                                className={"radio-chip" + (resp.decision === "disagree" ? " is-selected disagree" : "")}
                                onClick={() => setDecision(it.id, c.id, "disagree")}
                                type="button"
                              >
                                <span className="indicator"></span> I don&apos;t agree
                              </button>
                              <button className="upload-mini" type="button">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                                Attach evidence
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!hasTechClauses && (
                  <div className="q-card-section" style={{ background: "var(--surface-2)", color: "var(--fg-3)", fontSize: 12.5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: -2 }}><circle cx="12" cy="12" r="10"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{" "}
                    No technical evaluation required for this item. Proceed to pricing.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 3 — Pricing */}
      {currentStep === 2 && (
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Pricing &amp; commercial terms</div>
              <div className="q-section-sub">Enter your single price per item for the full contract term. Single-BU contract — one price applies.</div>
              <div className="mini-stats">
                <div className="mini-stat"><div className="lbl">Items to price</div><div className="val">{items.length}</div></div>
                <div className="div"></div>
                <div className="mini-stat"><div className="lbl">Business unit</div><div className="val"><span className="mono">{arc.hotel_code || "—"}</span> {arc.hotel_name || ""}</div></div>
                <div className="div"></div>
                <div className="mini-stat"><div className="lbl">Contract term</div><div className="val"><span className="mono">{termStart}</span> → <span className="mono">{termEnd}</span></div></div>
              </div>
            </div>
          </div>

          <div className="q-cols">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>Line items</h3>
                  <span className="pill">{items.length} {items.length === 1 ? "item" : "items"}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}><span className="kbd">↹</span> tab between fields</div>
              </div>

              {items.map((it, idx) => {
                const l = priceLine(it.id);
                const qty = safeNum(it.committed_qty ?? it.indicative_qty ?? 0);
                const lt = lineTotal(it.id, qty);
                return (
                  <div className="line-card" key={it.id}>
                    <div className="line-card-head">
                      <div className="left">
                        <div className="num-chip">{String(idx + 1).padStart(2, "0")}</div>
                        <div>
                          <div className="title">{it.variant_name || it.title || `Item #${it.id}`}</div>
                          <div className="desc">{it.spec || ""}</div>
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {l.charges.length > 0 && (
                              <span className="pill">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                {" "}{l.charges.length} extra {l.charges.length > 1 ? "charges" : "charge"}
                              </span>
                            )}
                            {l.rate ? (
                              <span className="pill success"><span className="pdot"></span> Priced</span>
                            ) : (
                              <span className="pill warn">Awaiting price</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="qty-block">
                        <div className="lbl">Qty required</div>
                        <div className="val mono">{qty.toLocaleString("en-IN")}</div>
                        <div className="unit">{it.uom || ""}</div>
                      </div>
                    </div>

                    <div className="line-section">
                      <div className="line-section-label">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        Unit price for this contract
                      </div>
                      <div className="price-grid">
                        <div>
                          <label className="label">Unit price <span className="req">*</span></label>
                          <div className="input-group">
                            <div className="prefix">₹</div>
                            <input
                              type="number"
                              className="input input-num"
                              value={l.rate}
                              onChange={e => updateLine(it.id, { rate: e.target.value })}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                            <div className="suffix" style={{ fontFamily: "'Geist',sans-serif", fontSize: 12 }}>/ <span>{it.uom || ""}</span></div>
                          </div>
                          <div className="help-text">
                            Target was <span className="mono">{it.target_price != null ? `₹${fmtN(it.target_price)}` : "N/A"}</span> per <span>{it.uom || ""}</span>
                          </div>
                        </div>
                        <div>
                          <label className="label">Tax (GST)</label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="input input-num"
                              value={l.gst_pct}
                              onChange={e => updateLine(it.id, { gst_pct: e.target.value })}
                              placeholder="0"
                              min="0"
                            />
                            <div className="suffix" style={{ padding: 0 }}>
                              <div className="seg" style={{ border: "none", borderRadius: 0, height: "100%" }}>
                                <button type="button" className={l.gstMode === "%" ? "is-active" : ""} onClick={() => updateLine(it.id, { gstMode: "%" })} style={{ borderRadius: 0 }}>%</button>
                                <button type="button" className={l.gstMode === "₹" ? "is-active" : ""} onClick={() => updateLine(it.id, { gstMode: "₹" })} style={{ borderRadius: 0 }}>₹</button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="label">Freight (per <span>{it.uom || ""}</span>)</label>
                          <div className="input-group">
                            <div className="prefix">₹</div>
                            <input
                              type="number"
                              className="input input-num"
                              value={l.freight}
                              onChange={e => updateLine(it.id, { freight: e.target.value })}
                              placeholder="0"
                              min="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="label">Lead time <span className="req">*</span></label>
                          <div className="input-group">
                            <input
                              type="number"
                              className="input input-num"
                              value={l.lead_time_days}
                              onChange={e => updateLine(it.id, { lead_time_days: e.target.value })}
                              placeholder="7"
                              min="1"
                            />
                            <div className="suffix" style={{ fontFamily: "'Geist',sans-serif", fontSize: 12 }}>days</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="label">Other charges <span className="label-meta">insurance, packaging, TCS, etc.</span></label>
                        <button
                          type="button"
                          className={"charges-trigger" + (l.charges.length > 0 ? " has-items" : "")}
                          onClick={() => setChargesOpen(chargesOpen === it.id ? null : it.id)}
                        >
                          <span className="flex items-center gap-2">
                            {l.charges.length === 0 ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            )}
                            <span>
                              {l.charges.length === 0
                                ? "Add insurance, packaging, TCS…"
                                : `${l.charges.length} charge${l.charges.length > 1 ? "s" : ""} added`}
                            </span>
                          </span>
                          {l.charges.length > 0 && (
                            <span className="ch-amt">{`₹ ${fmtN(productChargesTotal(it.id))}`}</span>
                          )}
                        </button>
                        {chargesOpen === it.id && (
                          <div className="rounded-lg mt-2 p-3" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
                            <div className="flex items-center gap-2 mb-2" style={{ flexWrap: "wrap" }}>
                              {["Insurance", "Packaging", "TCS", "Loading", "Other"].map(t => (
                                <button key={t} type="button" className="btn btn-sm" onClick={() => addChargeOfType(it.id, t)}>+ {t}</button>
                              ))}
                            </div>
                            {l.charges.length === 0 && (
                              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Pick a charge type above to add it to this line.</div>
                            )}
                            {l.charges.map((c, ci) => (
                              <div key={ci} className="grid items-center gap-2 mt-2" style={{ gridTemplateColumns: "1fr 110px 90px 32px" }}>
                                <input
                                  className="input"
                                  type="text"
                                  value={c.name}
                                  onChange={e => setPrice(p => { const cur = { ...(p[it.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], name: e.target.value }; cur.charges = ch; return { ...p, [it.id]: cur }; })}
                                  placeholder="Charge name"
                                />
                                <div className="input-group">
                                  <input
                                    className="input input-num"
                                    type="number"
                                    value={c.amount}
                                    onChange={e => setPrice(p => { const cur = { ...(p[it.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], amount: e.target.value }; cur.charges = ch; return { ...p, [it.id]: cur }; })}
                                    placeholder="0"
                                  />
                                  <div className="suffix" style={{ padding: 0 }}>
                                    <div className="seg" style={{ border: "none", borderRadius: 0, height: "100%" }}>
                                      <button type="button" className={c.amountMode === "%" ? "is-active" : ""} onClick={() => setPrice(p => { const cur = { ...(p[it.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], amountMode: "%" }; cur.charges = ch; return { ...p, [it.id]: cur }; })} style={{ borderRadius: 0 }}>%</button>
                                      <button type="button" className={c.amountMode === "₹" ? "is-active" : ""} onClick={() => setPrice(p => { const cur = { ...(p[it.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], amountMode: "₹" }; cur.charges = ch; return { ...p, [it.id]: cur }; })} style={{ borderRadius: 0 }}>₹</button>
                                    </div>
                                  </div>
                                </div>
                                <input
                                  className="input"
                                  type="text"
                                  value={c.note}
                                  onChange={e => setPrice(p => { const cur = { ...(p[it.id] || blankLine()) }; const ch = [...cur.charges]; ch[ci] = { ...ch[ci], note: e.target.value }; cur.charges = ch; return { ...p, [it.id]: cur }; })}
                                  placeholder="Note"
                                />
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => removeCharge(it.id, ci)}
                                  title="Remove"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="line-section">
                      <div className="line-section-label">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                        Notes &amp; attachments
                      </div>
                      <div className="notes-grid">
                        <div>
                          <label className="label">Comment to buyer <span className="label-meta">optional</span></label>
                          <textarea
                            className="textarea"
                            value={l.comment}
                            onChange={e => updateLine(it.id, { comment: e.target.value })}
                            placeholder="MOQ, validity caveats, substitute proposals…"
                            maxLength={300}
                            style={{ minHeight: 64 }}
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className="label">Lead-time note</label>
                            <input
                              className="input"
                              type="text"
                              value={l.leadNote}
                              onChange={e => updateLine(it.id, { leadNote: e.target.value })}
                              placeholder="e.g. Subject to PO confirmation"
                            />
                          </div>
                          <button className="upload-mini w-full justify-center" type="button" style={{ padding: 9 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                            Attach supporting documents
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="line-card-foot">
                      <div className="badges">
                        <span>
                          <span className="mono">{qty.toLocaleString("en-IN")}</span> ×{" "}
                          <span className="mono">{l.rate ? `₹${fmtN(l.rate)}` : "—"}</span>
                          {safeNum(l.gst_pct) > 0 && (
                            <> + <span className="mono">{l.gstMode === "%" ? `${l.gst_pct}% GST` : `₹${l.gst_pct} tax`}</span></>
                          )}
                        </span>
                      </div>
                      <div className="ltot">
                        <span className="lbl">Line total</span>
                        <span className={"val" + (lt === 0 ? " is-zero" : "")}>{`₹ ${fmtN(lt)}`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>Commercial terms</h3>
                  <span className="pill">Applies to entire quote</span>
                </div>
              </div>

              <div className="commercial-card">
                <div className="q-card-section">
                  <label className="label">GSTIN <span className="label-meta">used for invoicing</span></label>
                  <input
                    className="input mono"
                    value={globals.gstin}
                    onChange={e => setGlobals(g => ({ ...g, gstin: e.target.value }))}
                    placeholder="29ABCDE1234F1Z5"
                    maxLength={15}
                    style={{ maxWidth: 280 }}
                  />
                </div>
                <div className="q-card-section">
                  <label className="label">Global comment <span className="label-meta">visible to buyer</span></label>
                  <textarea
                    className="textarea"
                    value={globals.comment}
                    onChange={e => setGlobals(g => ({ ...g, comment: e.target.value }))}
                    placeholder="Quote-wide notes — packaging, batching, validity, etc."
                    maxLength={500}
                  />
                </div>
                <div className="q-card-section">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="label" style={{ marginBottom: 0 }}>Payment terms <span className="req">*</span></label>
                    <div className="tot-hint">
                      <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>Must sum to 100% · currently</span>
                      <span className={"tot-num ml-1 " + (paymentTotal === 100 ? "ok" : "err")}>{paymentTotal}%</span>
                    </div>
                  </div>
                  <div className="rounded-lg" style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                    {globals.paymentTerms.map((pt, i) => (
                      <div
                        key={i}
                        className={"grid items-center gap-2 px-3 py-2" + (i === 0 ? " !border-t-0" : "")}
                        style={{ gridTemplateColumns: "24px 1fr 130px 32px", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                      >
                        <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", textAlign: "center" }}>{String(i + 1).padStart(2, "0")}</div>
                        <input
                          className="input"
                          style={{ border: "none", background: "transparent", padding: "4px 6px" }}
                          type="text"
                          value={pt.label}
                          onChange={e => updatePaymentTerm(i, { label: e.target.value })}
                          placeholder={i === 0 ? "e.g. Advance on PO acceptance" : "e.g. Net 30 after delivery"}
                        />
                        <div className="input-group" style={{ border: "1px solid var(--border)" }}>
                          <input
                            className="input input-num"
                            style={{ padding: "5px 10px" }}
                            type="number"
                            value={pt.pct}
                            onChange={e => updatePaymentTerm(i, { pct: Number(e.target.value) })}
                            min="0"
                            max="100"
                            placeholder="0"
                          />
                          <div className="suffix" style={{ padding: "0 9px" }}>%</div>
                        </div>
                        <button
                          className="icon-btn"
                          onClick={() => removePaymentTerm(i)}
                          type="button"
                          disabled={globals.paymentTerms.length === 1}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    ))}
                    <button
                      className="w-full text-left px-3 py-2 flex items-center gap-2"
                      onClick={addPaymentTerm}
                      type="button"
                      style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)", fontSize: 12.5, color: "var(--primary)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                      Add another term
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside>
              <div className="hero-summary">
                <div className="hero-summary-inner">
                  <div className="hero-head">
                    <div className="h-title">Quote summary</div>
                    <div className="h-rfq">{`#${arcNumber}`}</div>
                  </div>
                  {totals.grand > 0 ? (
                    <div>
                      <div className="hero-grand-label">Grand total · full term</div>
                      <div className="hero-grand"><span className="cur">₹</span><span>{fmtN(totals.grand)}</span></div>
                      <div className="hero-grand-meta">Inclusive of GST &amp; all charges · INR · full contract term</div>
                      <div className="breakdown-bar">
                        <div className="bd-subtotal" style={{ width: `${(totals.subtotal / totals.grand) * 100 || 0}%` }}></div>
                        <div className="bd-gst" style={{ width: `${(totals.gst / totals.grand) * 100 || 0}%` }}></div>
                        <div className="bd-charges" style={{ width: `${(totals.extraCharges.reduce((s, c) => s + c.amount, 0) / totals.grand) * 100 || 0}%` }}></div>
                      </div>
                      <div className="breakdown-legend">
                        <div className="breakdown-row"><span className="lbl"><span className="swatch bd-subtotal"></span> Subtotal</span><span className="val">{`₹ ${fmtN(totals.subtotal)}`}</span></div>
                        <div className="breakdown-row"><span className="lbl"><span className="swatch bd-gst"></span> GST</span><span className="val">{`₹ ${fmtN(totals.gst)}`}</span></div>
                        {totals.extraCharges.map(ec => (
                          <div className="breakdown-row" key={ec.label}>
                            <span className="lbl"><span className="swatch bd-charges"></span> <span>{ec.label}</span></span>
                            <span className="val">{`₹ ${fmtN(ec.amount)}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-hero">
                      <div className="ic">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <div className="ttl">Awaiting your prices</div>
                      <div className="sub">Your grand total &amp; tax breakdown will appear here as you price each line item.</div>
                    </div>
                  )}
                </div>
                <div className="hero-foot">
                  <div className="meta-row"><span className="k">Payment</span><span className="v">{globals.paymentTerms.length} term{globals.paymentTerms.length === 1 ? "" : "s"} · {paymentTotal}%</span></div>
                  <div className="meta-row"><span className="k">BU</span><span className="v"><span>{arc.hotel_code || "—"}</span> · <span>{arc.hotel_name || ""}</span></span></div>
                  <div className="meta-row"><span className="k">Closes</span><span className="v">{submissionEnd}</span></div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={"completion-pill" + (canSubmit ? " is-ready" : "")}>
                      <span className="pulse"></span>
                      <span>{canSubmit ? "Ready to submit" : "In progress"}</span>
                    </span>
                    <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "'Geist Mono',monospace" }}>v1 · draft</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {toast && (
        <div className="arc-toast">
          <span className="t-ic">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Action dock */}
      {!submitted && (
        <div className="action-dock">
          <div className="inner">
            <div className="left">
              {currentStep === 0 && (
                <span className="fs-13 text-fg-2"><span className="fw-600 text-fg">Step 1 of 3.</span> Acknowledge the terms above to continue.</span>
              )}
              {currentStep === 1 && (
                <span className="fs-13 text-fg-2">
                  <span className="fw-600 text-fg">Step 2 of 3.</span>{" "}
                  {hasTechClauses
                    ? <span>Answer <span className="fw-600 text-fg">{evalTotal - evalAnswered}</span> remaining clause(s) to continue.</span>
                    : <span>Review item specs &amp; past consumption.</span>}
                </span>
              )}
              {currentStep === 2 && (
                <span className="fs-13 text-fg-2"><span className="fw-600 text-fg">Step 3 of 3.</span> Review totals, then submit when ready.</span>
              )}
            </div>
            <div className="right">
              {currentStep === 2 && totals.grand > 0 && (
                <span className="fs-13 text-fg-3 mr-2">Total <span className="mono fw-700 text-fg">{`₹ ${fmtN(totals.grand)}`}</span></span>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => saveDraft(false)}
                disabled={savingDraft}
                type="button"
              >
                {savingDraft ? "Saving…" : "Save draft"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={regretQuote} type="button">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                Regret quote
              </button>
              {currentStep > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={prevStep} type="button">Back</button>
              )}
              {currentStep < 2 && (
                <button
                  className="btn btn-blue"
                  onClick={handleNextStep}
                  disabled={!canContinue || savingDraft}
                  type="button"
                >
                  <span>{currentStep === 0 ? "Continue to items" : "Continue to pricing"}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              )}
              {currentStep === 2 && (
                <button
                  className="btn btn-success"
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  {submitting ? "Submitting…" : "Submit quote"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation overlay */}
      {submitted && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <div className="confirm-hero">
              <div className="check-stage">
                <svg className="check-svg" viewBox="0 0 80 80">
                  <circle className="ring-bg" cx="40" cy="40" r="38" />
                  <circle className="ring" cx="40" cy="40" r="36" />
                  <path className="tick" d="M26 41.5 L36 51.5 L55 31.5" />
                </svg>
              </div>
              <h2>Quote submitted</h2>
              <p>
                Your quote for <strong style={{ color: "var(--fg)" }}>ARC #{arcNumber} · {arc.title}</strong> has been delivered. The buyer team has been notified.
              </p>
              <div className="ref-chip">
                <span className="ref-tag">Reference</span>
                <span className="ref-num">{referenceNumber}</span>
                <button className="copy-btn" type="button" onClick={copyReference}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
            </div>
            <div className="confirm-body">
              <div className="confirm-grid">
                <div className="confirm-cell is-total"><div className="k">Grand total</div><div className="v">{`₹ ${fmtN(totals.grand)}`}</div></div>
                <div className="confirm-cell"><div className="k">Items quoted</div><div className="v">{items.length}</div></div>
                <div className="confirm-cell"><div className="k">Submitted at</div><div className="v">{submittedAt}</div></div>
              </div>
              <div className="next-steps-block">
                <div className="ns-title">What happens next</div>
                <ol className="timeline">
                  <li className="is-done"><span>Quote received by buyer</span><span className="meta">just now</span></li>
                  <li className="is-current"><span>Buyer opens technical evaluation</span><span className="meta">~24 hrs</span></li>
                  <li><span>Commercial evaluation</span><span className="meta">post tech</span></li>
                  <li><span>ARC committee approval</span><span className="meta">~1 week</span></li>
                  <li><span>Awarded contract sign &amp; activation</span><span className="meta">final step</span></li>
                </ol>
                <div className="email-confirm">
                  <div className="ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div>A confirmation copy has been sent to your registered email on file with the full quote breakdown.</div>
                </div>
              </div>
            </div>
            <div className="confirm-foot">
              <button className="btn btn-secondary" type="button">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download PDF
              </button>
              <Link className="btn btn-blue" href="/dashboard/vendor/rate-contracts">
                Back to dashboard{" "}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {openHistory && (
        <div className="arc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpenHistory(false); }}>
          <div className="arc-modal" style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <div>
                <div className="t"><h3>Your previous quotes</h3></div>
                <div className="sub">Most recent quotes from your team for similar items.</div>
              </div>
              <button className="icon-btn" onClick={() => setOpenHistory(false)} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-2">
                {history.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--fg-3)", padding: 16, textAlign: "center" }}>
                    No previous quote history available yet.
                  </div>
                )}
                {history.map(h => (
                  <div className="p-3 rounded-lg flex items-center justify-between" style={{ border: "1px solid var(--border)" }} key={h.id}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{h.product}</div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 3 }}>
                        <span className="mono">{h.rfq}</span> · <span>{h.buyer}</span> · <span>{h.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{`₹ ${h.amount}`}</div>
                      <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>{h.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — shape-aware: dark hero with detail cells, the 3-step stepper,
//  and the quote-entry table. Mirrors the loaded layout 1:1.
// ──────────────────────────────────────────────────────────────────────────
const QSk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function QuoteSkeleton() {
  return (
    <div style={{ paddingBottom: 108, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Hero */}
      <section className="arc-sk-hero">
        <QSk w={170} h={11} style={{ marginBottom: 12 }} />
        <QSk w="48%" h={24} style={{ marginBottom: 10 }} />
        <QSk w="62%" h={12} style={{ marginBottom: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <QSk w="70%" h={9} style={{ marginBottom: 7 }} />
              <QSk w="85%" h={14} />
            </div>
          ))}
        </div>
      </section>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <QSk key={i} w={180} h={42} r={10} />
        ))}
      </div>

      {/* Quote table card */}
      <div className="arc-sk-tile">
        <QSk w={220} h={15} style={{ marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <QSk key={i} w="70%" h={10} />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, row) => (
          <div key={row} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid var(--border)", alignItems: "center" }}>
            <div>
              <QSk w="80%" h={13} style={{ marginBottom: 5 }} />
              <QSk w="50%" h={10} />
            </div>
            {Array.from({ length: 4 }).map((__, c) => (
              <QSk key={c} w="85%" h={32} r={7} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
