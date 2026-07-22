// ARC v2 vendor quote wizard — port of prototypes/arc_ui/vendor-quote.html.
// Stage-driven flow: Overview & terms → Technical envelope → Pricing & submit.
// Wired to vendorGetRequestDetail / vendorSaveQuoteDraft / vendorSubmitQuote /
// vendorWithdrawQuote. The page intentionally renders ONLY the inner main-body
// content — DashboardShell (via pages/_app.js) provides the sidebar + topbar.
// Body is now driven by stageKey (overview/technical/commercial) — the inner
// currentStep stepper has been removed; VendorArcStageTimeline is the only nav.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";
import { getChargeNames } from "@/services/rfq";
import VendorArcStageTimeline from "@/components/dashboard/rate-contracts/vendor/stages/VendorArcStageTimeline";
import VendorOverviewStage from "@/components/dashboard/rate-contracts/vendor/stages/VendorOverviewStage";
import VendorTechnicalStage from "@/components/dashboard/rate-contracts/vendor/stages/VendorTechnicalStage";
import VendorCommercialStage from "@/components/dashboard/rate-contracts/vendor/stages/VendorCommercialStage";
import VendorArcNegotiationBanner from "@/components/dashboard/rate-contracts/vendor/VendorArcNegotiationBanner";
import useArcQuotePreview from "@/hooks/useArcQuotePreview";

// Sr 53 — 2-decimal money display (not whole-rupee rounding). The pricing
// engine already keeps 2-dp end to end (pricingEngine.js q2); this formatter
// must not re-round to an integer, or a persisted 30.68 displays as 31.
const fmtN = (n) => (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// 2-dp rounding for the CLIENT FALLBACK math only (mirrors pricingEngine's q2).
// Round once, at the boundary — never round each line/GST/charge separately
// before summing (that reintroduces drift).
const q2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const blankLine = () => ({
  rate: "",
  // Sr 52 — GST must default BLANK (never a silent 5%); it is now mandatory at
  // submit (canSubmit/BE validateSubmittedLines), with an explicit 0 accepted.
  gst_pct: "",
  gstMode: "%",
  freight: "",
  lead_time_days: "",
  moq: "",
  comment: "",
  leadNote: "",
  validity_notes: "",
  charges: [],  // [{ name, amount, amountMode:'%'|'₹', tax:'', taxMode:'%'|'₹', note }]
});

// Phase 2 — map FE display tokens to engine mode strings.
const toEngineMode = (m) => (m === "%" || m === "percentage") ? "percentage"
  : (m === "₹" || m === "absolute") ? "absolute"
  : "percentage";

// Fallback charge types used only when the backend charge-name list is empty
// (mirrors the RFQ send-quote wizard's hardcoded fallback).
const DEFAULT_CHARGE_TYPES = ["Freight", "Insurance", "Packaging", "TCS", "Loading", "Other"];

export default function VendorQuotePage() {
  const router = useRouter();
  const { contractId } = router.query;

  const [loading, setLoading] = useState(true);
  const [arc, setArc] = useState(null);
  const [items, setItems] = useState([]);
  const [invitation, setInvitation] = useState(null);
  const [quote, setQuote] = useState(null);

  // ── Lifecycle host state ──
  const [lifecycle, setLifecycle] = useState(null);
  const [stageKey, setStageKey] = useState(null);
  const [lockedNote, setLockedNote] = useState("");

  // ── Technical envelope (two-envelope flow) ──
  const [techEnvelope, setTechEnvelope] = useState(null);  // { required, tech_submitted_at, clauses_total, clauses_answered }
  const [techItems, setTechItems] = useState([]);           // [{ arc_item_id, clauses:[...] }]
  const [techResponses, setTechResponses] = useState({});  // { [clauseId]: vendor_response }
  const [techFiles, setTechFiles] = useState({});           // { [clauseId]: [{file_id,url,original_name}] }
  const [techBusy, setTechBusy] = useState(false);
  const [techError, setTechError] = useState(null);
  const [techUploadErrors, setTechUploadErrors] = useState({});  // { [clauseId]: errorMsg }
  // Universal (ARC-wide) technical clauses — the SEPARATE "universally
  // configured" envelope. Parallel state to the per-item envelope above; the
  // single seal (below) covers both.
  const [universalClauses, setUniversalClauses] = useState([]);     // [{clause_id, clause_text, ...}]
  const [universalMinPass, setUniversalMinPass] = useState(null);
  const [universalResponses, setUniversalResponses] = useState({}); // { [clauseId]: vendor_response }
  const [universalFiles, setUniversalFiles] = useState({});         // { [clauseId]: [{file_id,url,original_name}] }
  const [universalUploadErrors, setUniversalUploadErrors] = useState({});

  // Phase 1 §3 — server-derived T&C gate. Seeded from quote.terms_accepted_at on
  // load; persisted via acceptTerms endpoint on accept; refreshed via onRefresh.
  const [termsAcceptedAt, setTermsAcceptedAt] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  // True ONLY right after the vendor submits in this session — drives the
  // one-time "Quote submitted" confirmation. `submitted` (above) is true for any
  // already-submitted quote on load, so gating the modal on it would re-trap the
  // vendor behind the overlay on every revisit. Closing it reveals the lifecycle.
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");
  const [openHistory, setOpenHistory] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(null);

  // ── Update-after-submit + version history ──
  // `editing` re-opens an already-submitted quote for a new submission while the
  // window is still open. `history` is the audit trail of every prior submission
  // (newest-first), loaded from the server (vendor-isolated). The previous quote
  // is ALWAYS recorded for audit — re-submitting just appends a new version.
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [price, setPrice] = useState({});           // { [arc_item_id]: line }

  const [globals, setGlobals] = useState({
    gstin: "",
    comment: "",
    paymentTerms: [
      { label: "Advance on PO acceptance", pct: 30 },
      { label: "Net 30 after delivery",    pct: 70 },
    ],
  });

  // #2 — Document-level (global) charges state.
  // Shape mirrors per-line charges: { name, amount, amountMode:'%'|'₹', tax, taxMode:'%'|'₹', note }
  // amountMode defaults to '₹' (absolute) per spec §2.1 to avoid % ambiguity.
  const [globalCharges, setGlobalCharges] = useState([]);
  const [globalChargesOpen, setGlobalChargesOpen] = useState(false);

  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Sr 37 — auto-save status chips (idle | dirty | saving | saved | error), one
  // per stage. Mirrors the buyer manual-entry.js saveState/markDirty/SaveChip
  // pattern: on-blur silent save + a trailing debounce, no toast per save (the
  // chip is the only affordance).
  const [commercialSaveState, setCommercialSaveState] = useState("idle");
  const [techSaveState, setTechSaveState] = useState("idle");
  const commercialAutosaveTimer = useRef(null);
  const techAutosaveTimer = useRef(null);
  useEffect(() => () => {
    if (commercialAutosaveTimer.current) clearTimeout(commercialAutosaveTimer.current);
    if (techAutosaveTimer.current) clearTimeout(techAutosaveTimer.current);
  }, []);

  // ── Regret / withdraw flow ──
  const [confirmRegret, setConfirmRegret] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawModalError, setWithdrawModalError] = useState(null);

  // ── E1: acceptingTerms guard ──
  const [acceptingTerms, setAcceptingTerms] = useState(false);

  // -------------------- load --------------------
  const loadTechEnvelope = useCallback(async () => {
    try {
      const res = await ArcApi.vendorGetTechClauses(contractId);
      const d = res?.data || {};
      setTechItems(d.items || []);
      const r = {}, f = {};
      for (const it of d.items || []) {
        for (const cl of it.clauses || []) {
          if (cl.vendor_response != null) r[cl.clause_id] = cl.vendor_response;
          if (Array.isArray(cl.files)) f[cl.clause_id] = cl.files;
        }
      }
      setTechResponses(r);
      setTechFiles(f);
      // Universal (ARC-wide) block — separate from items[]. Hydrate parallel state.
      const u = d.universal || null;
      if (u && Array.isArray(u.clauses)) {
        setUniversalClauses(u.clauses);
        setUniversalMinPass(u.minimum_passing_score ?? null);
        const ur = {}, uf = {};
        for (const cl of u.clauses) {
          if (cl.vendor_response != null) ur[cl.clause_id] = cl.vendor_response;
          if (Array.isArray(cl.files)) uf[cl.clause_id] = cl.files;
        }
        setUniversalResponses(ur);
        setUniversalFiles(uf);
      } else {
        setUniversalClauses([]);
        setUniversalMinPass(null);
        setUniversalResponses({});
        setUniversalFiles({});
      }
      return d;
    } catch (_e) {
      // 403 (not invited) is surfaced by the page guard; ignore here.
      return null;
    }
  }, [contractId]);

  const loadLifecycle = useCallback(async () => {
    try {
      const res = await ArcApi.vendorGetRequestLifecycle(contractId);
      const payload = res?.data || null;
      setLifecycle(payload);
      return payload;
    } catch (_e) {
      return null;
    }
  }, [contractId]);

  // Version history of this vendor's OWN past submissions (newest-first). Loaded
  // when the quote is submitted (on mount / refresh) and when the "Past quotes"
  // modal opens, so the count + the modal stay fresh after each re-submit.
  const loadHistory = useCallback(async () => {
    if (!contractId) return [];
    setHistoryLoading(true);
    try {
      const res = await ArcApi.vendorQuoteHistory(contractId);
      const versions = res?.data?.versions || [];
      setHistory(versions);
      return versions;
    } catch (_e) {
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // §1.1 FIX: read from res.data.* (axios interceptor unwraps to response.data)
        const res = await ArcApi.vendorGetRequestDetail(contractId);
        if (cancelled) return;
        const d = res?.data || {};
        const a = d.arc || null;
        const its = d.items || [];
        const inv = d.invitation || null;
        const qt = d.quote || null;
        const ls = d.lines || [];
        const te = d.tech_envelope || null;

        setArc(a);
        setItems(its);
        setInvitation(inv);
        setQuote(qt);
        setTechEnvelope(te);

        // Seed price state from draft lines if present.
        // Phase 2 — charges is now a canonical engine array; hydrate to FE shape.
        // Legacy: charges was a single number (freight) — normalised here as a
        // single "Freight" charge entry so the charges modal shows it correctly.
        const fromEngineCharges = (rawCharges) => {
          if (!rawCharges) return [];
          if (Array.isArray(rawCharges) && rawCharges.length > 0) {
            return rawCharges.map(c => {
              // Per-line charges carry tax on `tax`; document-level (global) charges
              // carry it on the engine's `additional_tax` key. Read either so this
              // shared hydrator works for both (per-line rows have no additional_tax).
              const _t  = c.additional_tax ?? c.tax;
              const _tm = c.additional_tax_mode ?? c.tax_mode;
              return {
                name:       c.name || "",
                amount:     c.amount != null ? String(c.amount) : "",
                amountMode: (c.amount_mode === "absolute" || c.amount_mode === "₹") ? "₹" : "%",
                // tax: null/undefined/"" → "" (inherit); 0 → "0" (explicit no tax)
                tax:        (_t === null || _t === undefined || _t === "") ? "" : String(_t),
                taxMode:    (_tm === "absolute" || _tm === "₹") ? "₹" : "%",
                note:       c.comment || "",
              };
            });
          }
          const n = Number(rawCharges);
          if (Number.isFinite(n) && n > 0) {
            return [{ name: "Freight", amount: String(n), amountMode: "₹", tax: "", taxMode: "%", note: "" }];
          }
          return [];
        };
        const seed = {};
        for (const ln of ls) {
          seed[ln.arc_item_id] = {
            ...blankLine(),
            rate: ln.rate ?? "",
            // Sr 52 — only blank when truly absent; preserve a real stored 0.
            gst_pct: ln.gst_pct ?? "",
            gstMode: "%",
            freight: "",  // Phase 2 — no standalone freight; charges handles it
            charges: fromEngineCharges(ln.charges),
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
          // Phase 1 §3 — seed server-persisted T&C acceptance on load.
          if (qt.terms_accepted_at) setTermsAcceptedAt(qt.terms_accepted_at);
          // #2 — hydrate global charges from persisted quote_pricing.global_charges_input.
          // fromEngineCharges already handles undefined/null → [].
          setGlobalCharges(fromEngineCharges(qt?.quote_pricing?.global_charges_input));
        }
        if (qt?.submitted_at && !qt?.withdrawn_at) {
          setSubmitted(true);
          setSubmittedAt(qt.submitted_at ? new Date(qt.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");
        }

        // §1.3 FIX: load tech clauses via the dedicated endpoint when required.
        if (te?.required) {
          await loadTechEnvelope();
        }

        // Load lifecycle for the timeline host.
        await loadLifecycle();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [contractId]);

  // Load the version history once the quote is submitted (and whenever the
  // submitted flag flips back on after a refresh). Re-submits additionally call
  // loadHistory() directly so the count updates without a flag change.
  useEffect(() => {
    if (submitted) loadHistory();
  }, [submitted, loadHistory]);

  // Phase 1 §3 — derived boolean from server-persisted timestamp.
  const acceptedTerms = !!termsAcceptedAt;

  // Stage selection — honour ?stage= when valid + unlocked, else default.
  const STAGE_KEYS = ["overview", "technical", "commercial", "awarding", "active"];
  useEffect(() => {
    if (!lifecycle || !router.isReady) return;
    const q = typeof router.query.stage === "string" ? router.query.stage : null;
    const target = q && STAGE_KEYS.includes(q) ? lifecycle.stages.find((s) => s.key === q) : null;

    // Backend-level lock check (includes terms-gate + tech-gate set by server projector)
    if (target && target.state === "locked") {
      if (target.reason === "terms_required") {
        setLockedNote(
          q === "technical"
            ? "Accept the rate-contract terms on the Overview tab to unlock the technical envelope."
            : "Accept the terms first before pricing."
        );
      } else if (target.reason === "tech_required") {
        setLockedNote("Seal your technical envelope before pricing.");
      } else {
        setLockedNote(`${target.label} is not available yet.`);
      }
      setStageKey((prev) => prev || lifecycle.default_stage);
      return;
    }

    // FE-level gate: technical skipped when not required
    if (q === "technical" && !techEnvelope?.required) {
      setLockedNote("No technical evaluation is required for this contract.");
      setStageKey(acceptedTerms ? "commercial" : "overview");
      return;
    }

    // FE-level gate: commercial locked until terms accepted
    if (q === "commercial" && !acceptedTerms) {
      setLockedNote("Accept the rate-contract terms on the Overview tab to unlock the technical envelope.");
      setStageKey("overview");
      return;
    }

    // FE-level gate: commercial locked until tech sealed when required
    if (q === "commercial" && techEnvelope?.required && !techEnvelope?.tech_submitted_at) {
      setLockedNote("Seal your technical envelope before pricing.");
      setStageKey("technical");
      return;
    }

    if (target && target.state !== "locked") {
      setStageKey(q);
      return;
    }
    setStageKey((prev) => prev || lifecycle.default_stage);
    if (!q) {
      router.replace(
        { pathname: router.pathname, query: { ...router.query, stage: lifecycle.default_stage } },
        undefined, { shallow: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle, router.isReady, techEnvelope, acceptedTerms]);

  // ── Stage advance helpers ──────────────────────────────────────────────────
  // Derives which stages are currently reachable (FE logic mirrors BE truth).
  const allowedStages = () => {
    const out = ["overview"];
    if (hasTechClauses) out.push("technical");
    if (acceptedTerms && (!hasTechClauses || techSealed)) out.push("commercial");
    return out;
  };
  const furthestAllowed = () => allowedStages().slice(-1)[0];

  const selectStage = (key) => {
    // FE gate: skip technical when not required
    if (key === "technical" && !hasTechClauses) {
      setLockedNote("No technical evaluation is required for this contract.");
      return;
    }
    // Phase 1 §3 — commercial + technical both locked until terms accepted
    if ((key === "technical" || key === "commercial") && !acceptedTerms) {
      setLockedNote(
        key === "technical"
          ? "Accept the rate-contract terms on the Overview tab to unlock the technical envelope."
          : "Accept the terms first before pricing."
      );
      return;
    }
    // FE gate: commercial locked until tech sealed
    if (key === "commercial" && hasTechClauses && !techSealed) {
      setLockedNote("Seal your technical envelope before pricing.");
      return;
    }
    setLockedNote("");
    setStageKey(key);
    router.replace(
      { pathname: router.pathname, query: { ...router.query, stage: key } },
      undefined, { shallow: true }
    );
  };

  // After vendor mutations (save/submit/seal/withdraw): re-fetch lifecycle +
  // detail so the timeline and stage bodies reflect the fresh state.
  const onRefresh = useCallback(async ({ advance = false } = {}) => {
    const [fresh] = await Promise.all([
      loadLifecycle(),
      ArcApi.vendorGetRequestDetail(contractId).then((res) => {
        const d = res?.data || {};
        setArc(d.arc || null);
        setItems(d.items || []);
        setQuote(d.quote || null);
        const te = d.tech_envelope || null;
        setTechEnvelope(te);
        // Phase 1 §3 — refresh server-persisted T&C acceptance.
        if (d.quote?.terms_accepted_at) setTermsAcceptedAt(d.quote.terms_accepted_at);
        if (d.quote?.submitted_at && !d.quote?.withdrawn_at) {
          setSubmitted(true);
          setSubmittedAt(d.quote.submitted_at ? new Date(d.quote.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "");
        } else {
          setSubmitted(false);
        }
        return d;
      }).catch(() => null),
    ]);
    if (advance && fresh?.default_stage) {
      setStageKey(fresh.default_stage);
      router.replace(
        { pathname: router.pathname, query: { ...router.query, stage: fresh.default_stage } },
        undefined, { shallow: true }
      );
    }
    return fresh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadLifecycle, contractId]);

  // setGstin helper used in the load effect above
  const setGstin = (v) => setGlobals(g => ({ ...g, gstin: v }));

  // Phase 1 §3 — persist T&C acceptance to server; refresh lifecycle.
  // E1: guarded with acceptingTerms to prevent double-click.
  const onAcceptTerms = useCallback(async () => {
    if (acceptingTerms) return;
    setAcceptingTerms(true);
    try {
      const res = await ArcApi.vendorAcceptTerms(contractId);
      const ts = res?.data?.terms_accepted_at || new Date().toISOString();
      setTermsAcceptedAt(ts);
      showToastMsg("Terms accepted");
      await onRefresh();
    } catch (e) {
      showToastMsg(e?.response?.data?.message || e?.message || "Could not save acceptance");
    } finally {
      setAcceptingTerms(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, onRefresh, acceptingTerms]);

  // -------------------- pricing helpers --------------------
  const priceLine = (itemId) => price[itemId] || blankLine();

  const updateLine = (itemId, patch) => {
    setPrice(p => ({ ...p, [itemId]: { ...(p[itemId] || blankLine()), ...patch } }));
    scheduleCommercialAutosave();
  };

  const addChargeOfType = (itemId, type) => {
    if (!type) return;
    // "Custom" → a free-form row with an empty, editable name. A catalog pick
    // keeps its name (locked read-only in the modal).
    const name = type === "Custom" ? "" : type;
    setPrice(p => {
      const cur = p[itemId] || blankLine();
      // Phase 2 — charge shape extended with per-charge tax fields.
      return { ...p, [itemId]: { ...cur, charges: [...cur.charges, { name, amount: "", amountMode: "%", tax: "", taxMode: "%", note: "" }] } };
    });
    scheduleCommercialAutosave();
  };

  const removeCharge = (itemId, idx) => {
    setPrice(p => {
      const cur = p[itemId] || blankLine();
      const next = cur.charges.slice();
      next.splice(idx, 1);
      return { ...p, [itemId]: { ...cur, charges: next } };
    });
    scheduleCommercialAutosave();
  };

  const productChargesTotal = (itemId) => {
    // Prefer the engine's resolved charges_total (each charge amount resolved by
    // its %/₹ mode PLUS the charge's own tax) so the per-line "Charges" indicator
    // reflects the real cost — not a naive sum of the raw amount fields (which
    // ignored the % mode and the additional GST on the charge).
    if (enginePreview?.lines) {
      const el = enginePreview.lines.find(l => Number(l.arc_item_id) === Number(itemId));
      if (el) return el.charges_total || 0;
    }
    // Client fallback (used only while the debounced preview is loading).
    const l = priceLine(itemId);
    const it = items.find(i => Number(i.id) === Number(itemId));
    const qty = safeNum(it?.committed_qty ?? it?.indicative_qty ?? 0);
    const sub = qty * safeNum(l.rate);
    let total = 0;
    (l.charges || []).forEach(c => {
      const amt = c.amountMode === "%" ? (sub * safeNum(c.amount)) / 100 : safeNum(c.amount);
      let tax = 0;
      if (c.tax === "" || c.tax == null) { if (l.gstMode === "%") tax = (amt * safeNum(l.gst_pct)) / 100; }
      else { tax = c.taxMode === "₹" ? safeNum(c.tax) : (amt * safeNum(c.tax)) / 100; }
      total += amt + tax;
    });
    return q2(total);
  };

  // #2 — Global charge helpers (document-level).
  const addGlobalCharge = (type) => {
    if (!type) return;
    const name = type === "Custom" ? "" : type;
    setGlobalCharges(prev => [...prev, { name, amount: "", amountMode: "₹", tax: "", taxMode: "%", note: "" }]);
    scheduleCommercialAutosave();
  };
  const removeGlobalCharge = (idx) => {
    setGlobalCharges(prev => { const next = prev.slice(); next.splice(idx, 1); return next; });
    scheduleCommercialAutosave();
  };
  const updateGlobalCharge = (idx, patch) => {
    setGlobalCharges(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
    scheduleCommercialAutosave();
  };
  // Sr 37 — setPrice/setGlobals wrapped for props handed to VendorCommercialStage:
  // the charges-modal + GSTIN/comment fields there call these setters DIRECTLY
  // (bypassing updateLine/addPaymentTerm/etc.), so wrapping is the single point
  // that also schedules the auto-save for those direct edits.
  const setPriceAndMark = (updater) => { setPrice(updater); scheduleCommercialAutosave(); };
  const setGlobalsAndMark = (updater) => { setGlobals(updater); scheduleCommercialAutosave(); };

  // Backend-managed charge-name list — the "other charges" pickers are driven
  // from this (per-line vs document-level split on is_global), matching the RFQ
  // send-quote page instead of a hardcoded list. Falls back to DEFAULT_CHARGE_TYPES.
  const [chargeNamesList, setChargeNamesList] = useState([]);
  useEffect(() => {
    getChargeNames()
      .then((res) => {
        const data = res?.data || res || [];
        if (Array.isArray(data) && data.length) setChargeNamesList(data);
      })
      .catch(() => {});
  }, []);
  const lineChargeTypes = useMemo(() => {
    const names = chargeNamesList.filter((c) => !c.is_global).map((c) => c.name).filter(Boolean);
    return names.length ? names : DEFAULT_CHARGE_TYPES;
  }, [chargeNamesList]);
  const globalChargeTypes = useMemo(() => {
    const names = chargeNamesList.filter((c) => c.is_global === true).map((c) => c.name).filter(Boolean);
    return names.length ? names : DEFAULT_CHARGE_TYPES;
  }, [chargeNamesList]);
  // Document-level (global) charges carry their tax on the engine's
  // additional_tax/_mode keys — normalizeGlobalCharge ONLY reads those (per-line
  // charges use `tax`/`tax_mode`). FE state keeps tax/taxMode for display.
  const globalChargesToEngine = (charges) => (charges || []).map(c => ({
    name:                c.name || null,
    amount:              safeNum(c.amount),
    amount_mode:         toEngineMode(c.amountMode || "₹"),
    additional_tax:      (c.tax === "" || c.tax == null) ? null : safeNum(c.tax),
    additional_tax_mode: toEngineMode(c.taxMode || "%"),
    ...(c.note ? { comment: c.note } : {}),
  }));

  // Phase 2 — build preview payload for the engine-backed preview hook.
  // Converts FE state (price[itemId].charges with amountMode:'%'/'₹') to the
  // canonical engine charge shape (amount_mode:'percentage'/'absolute').
  const previewDraft = useMemo(() => {
    if (!contractId || items.length === 0) return null;
    const lines = items.map(it => {
      const l = priceLine(it.id);
      const engineCharges = (l.charges || []).map(c => ({
        name:        c.name || null,
        amount:      safeNum(c.amount),
        amount_mode: toEngineMode(c.amountMode || "%"),
        // Per-charge tax: empty string → null (inherit base); 0 → explicit zero.
        tax:         (c.tax === "" || c.tax == null) ? null : safeNum(c.tax),
        tax_mode:    toEngineMode(c.taxMode || "%"),
        ...(c.note ? { comment: c.note } : {}),
      }));
      return {
        arc_item_id: it.id,
        rate:        safeNum(l.rate),
        gst_pct:     safeNum(l.gst_pct),
        gst_mode:    l.gstMode || "%",
        charges:     engineCharges,
      };
    }).filter(line => line.rate > 0); // only priced lines need preview
    if (lines.length === 0) return null;
    return { arc_id: Number(contractId), lines, global_charges: globalChargesToEngine(globalCharges) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, items, price, globalCharges]);

  // Phase 2 — engine-backed preview (debounced 600ms). `preview` replaces the
  // client-side totals when available; falls back to client math while loading.
  const { preview: enginePreview } = useArcQuotePreview(previewDraft);

  // lineTotal: use engine preview when available, else client fallback.
  const lineTotal = (itemId, qty) => {
    if (enginePreview?.lines) {
      const el = enginePreview.lines.find(l => Number(l.arc_item_id) === Number(itemId));
      // Sr 53 — no Math.round: the engine already returns a 2-dp total.
      if (el) return el.total;
    }
    // Client fallback (Phase 1 math; replaced by engine once preview responds).
    const l = priceLine(itemId);
    if (!l.rate) return 0;
    const subtotal = qty * safeNum(l.rate) + qty * safeNum(l.freight);
    const tax = l.gstMode === "%" ? (subtotal * safeNum(l.gst_pct)) / 100 : qty * safeNum(l.gst_pct);
    return q2(subtotal + tax);
  };

  // totals: use engine preview when available, else client fallback.
  //
  // Coherent, reconciling breakup (combined-GST):
  //   subtotal (goods, pre-tax) + Σ extraCharges (pre-tax) + globalChargesTotal
  //   (pre-tax) + gst (ALL tax: line + charge + global) === grand.
  // The engine's `grand_subtotal` is the sum of line TOTALS (already tax- and
  // charge-inclusive), so it is NOT the goods subtotal — we use Σ line.base.
  const totals = useMemo(() => {
    if (enginePreview) {
      const lines = enginePreview.lines || [];
      // Goods subtotal — pre-tax line base only.
      const goodsSubtotal = lines.reduce((s, l) => s + (l.base || 0), 0);
      // GST = line base tax + per-charge tax (aggregated below) + global-charge tax.
      let gst = lines.reduce((s, l) => s + (l.base_tax || 0), 0);
      // Per-charge-name pre-tax totals for the breakdown legend; their tax → GST.
      const extras = {};
      lines.forEach(l => {
        (l.charges || []).forEach(c => {
          const key = c.name || "Charge";
          extras[key] = (extras[key] || 0) + (c.amount || 0); // pre-tax amount
          gst += (c.tax || 0);
        });
      });
      // Document-level (global) charges: pre-tax amount to its own row, tax → GST.
      const engineGlobals = Array.isArray(enginePreview.global_charges) ? enginePreview.global_charges : [];
      const globalPretax = engineGlobals.reduce((s, c) => s + (c.amount || 0), 0);
      engineGlobals.forEach(c => { gst += (c.additional_tax || 0); });
      // Sr 53 — sum the engine's already-2dp values raw; format ONCE at display.
      return {
        subtotal: goodsSubtotal,
        gst,
        extraCharges: Object.entries(extras).map(([label, amount]) => ({ label, amount })),
        globalCharges: engineGlobals,
        globalChargesTotal: globalPretax,
        grand: enginePreview.grand_total || 0,
      };
    }
    // Client fallback — approximate, used only while the engine preview loads.
    // Global charges are omitted here (labelled approximate); the engine fills them in.
    let subtotal = 0, gst = 0, chargesPretax = 0;
    const extras = {};
    items.forEach(it => {
      const l = price[it.id] || blankLine();
      if (!l.rate) return;
      const qty = safeNum(it.committed_qty ?? it.indicative_qty ?? 0);
      const sub = qty * safeNum(l.rate);
      subtotal += sub;
      gst += l.gstMode === "%" ? (sub * safeNum(l.gst_pct)) / 100 : qty * safeNum(l.gst_pct);
      (l.charges || []).forEach(c => {
        const amt = c.amountMode === "%" ? (sub * safeNum(c.amount)) / 100 : safeNum(c.amount);
        extras[c.name || "Charge"] = (extras[c.name || "Charge"] || 0) + amt;
        chargesPretax += amt;
        // Per-charge tax tri-state: blank → inherit base GST% (only when base is %);
        // 0 → no tax; >0 → explicit rate in the charge's own mode.
        if (c.tax === "" || c.tax == null) {
          if (l.gstMode === "%") gst += (amt * safeNum(l.gst_pct)) / 100;
        } else {
          gst += (c.taxMode === "₹") ? safeNum(c.tax) : (amt * safeNum(c.tax)) / 100;
        }
      });
    });
    // Sr 53 — 2-dp (q2), not whole-rupee Math.round, so the non-engine fallback
    // path also keeps decimals while the engine preview is loading.
    return {
      subtotal: q2(subtotal),
      gst: q2(gst),
      extraCharges: Object.entries(extras).map(([label, amount]) => ({ label, amount: q2(amount) })),
      globalCharges: [],
      globalChargesTotal: 0,
      grand: q2(subtotal + gst + chargesPretax),
    };
  }, [items, price, enginePreview]);

  const paymentTotal = useMemo(() => globals.paymentTerms.reduce((s, t) => s + safeNum(t.pct), 0), [globals.paymentTerms]);

  // -------------------- tech eval — two-envelope flow (§1.3 FIX) --------------------
  // techItems comes from vendorGetTechClauses (loaded on mount when required).
  // techEnvelope (lightweight summary) comes from vendorGetRequestDetail.
  const hasTechClauses = !!techEnvelope?.required;
  const techSealed = !!techEnvelope?.tech_submitted_at;

  const itemClauses = (itemId) => {
    const block = techItems.find(b => Number(b.arc_item_id) === Number(itemId));
    return block?.clauses || [];
  };

  // Sr 37 — `silent` (mirrors saveDraft(silent)) drives the auto-save chip
  // instead of the top-level techError banner: a failed silent save (e.g. the
  // submission window just closed, server 409s) must not surface a disruptive
  // banner on every debounce/blur — the chip's "error" state is enough. The
  // manual "Save Draft" button and onSealTechEnvelope keep calling this with
  // no args (silent=false), so their existing banner behaviour is unchanged.
  const onSaveTechDraft = async (silent = false) => {
    setTechBusy(true);
    if (!silent) setTechError(null);
    if (silent) setTechSaveState("saving");
    try {
      const responses = [];
      for (const it of techItems) {
        for (const cl of it.clauses || []) {
          responses.push({ clause_id: cl.clause_id, vendor_response: techResponses[cl.clause_id] ?? "" });
        }
      }
      // Only POST the item draft when there ARE item clauses (backend rejects an
      // empty responses[]) — a universal-only ARC has no item clauses.
      if (responses.length > 0) {
        await ArcApi.vendorSaveTechEnvelopeDraft({ arc_id: Number(contractId), responses });
      }
      // Also persist the universal (ARC-wide) responses when present — same seal.
      if (universalClauses.length > 0) {
        const uResponses = universalClauses.map((cl) => ({
          clause_id: cl.clause_id, vendor_response: universalResponses[cl.clause_id] ?? "",
        }));
        await ArcApi.vendorSaveUniversalTechEnvelopeDraft({ arc_id: Number(contractId), responses: uResponses });
      }
      if (silent) setTechSaveState("saved");
    } catch (e) {
      if (silent) setTechSaveState("error");
      else setTechError(e?.response?.data?.message || e?.message || "Save failed");
    }
    finally { setTechBusy(false); }
  };

  const markTechDirty = () => setTechSaveState((s) => (s === "saving" ? s : "dirty"));

  // Trailing ~800ms debounce after a clause response changes, so long typing
  // sessions persist without needing a blur. Guard: never once sealed/closed.
  const scheduleTechAutosave = () => {
    markTechDirty();
    if (!contractId || techSealed || !windowOpen) return;
    if (techAutosaveTimer.current) clearTimeout(techAutosaveTimer.current);
    techAutosaveTimer.current = setTimeout(() => { onSaveTechDraft(true); }, 800);
  };

  // Immediate silent save on blur of a clause textarea.
  const onTechFieldBlur = () => {
    if (!contractId || techSealed || !windowOpen) return;
    if (techAutosaveTimer.current) clearTimeout(techAutosaveTimer.current);
    onSaveTechDraft(true);
  };

  const onUploadTechEvidence = async (clauseId, file) => {
    if (!file) return;
    setTechBusy(true);
    // Clear any previous upload error for this clause on new attempt.
    setTechUploadErrors(p => { const n = { ...p }; delete n[clauseId]; return n; });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await ArcApi.vendorUploadTechEvidence(clauseId, fd);
      const f = res?.data?.file;
      if (f) setTechFiles((prev) => ({ ...prev, [clauseId]: [...(prev[clauseId] || []), f] }));
    } catch (e) {
      // Upload errors go to per-clause inline state, NOT the top techError banner.
      const msg = e?.response?.data?.message || e?.message || "Upload failed";
      setTechUploadErrors(p => ({ ...p, [clauseId]: msg }));
    }
    finally { setTechBusy(false); }
  };

  const onDeleteTechEvidence = async (clauseId, fileId) => {
    setTechBusy(true); setTechError(null);
    try {
      await ArcApi.vendorDeleteTechEvidence(fileId);
      setTechFiles((prev) => ({ ...prev, [clauseId]: (prev[clauseId] || []).filter((f) => f.file_id !== fileId) }));
    } catch (e) { setTechError(e?.response?.data?.message || e?.message || "Delete failed"); }
    finally { setTechBusy(false); }
  };

  // ── Universal (ARC-wide) envelope handlers — parallel to the item ones,
  // targeting the universal endpoints. Autosave rides the shared onSaveTechDraft.
  const onChangeUniversalResponse = (clauseId, value) => {
    setUniversalResponses((prev) => ({ ...prev, [clauseId]: value }));
    scheduleTechAutosave();
  };

  const onUploadUniversalEvidence = async (clauseId, file) => {
    if (!file) return;
    setTechBusy(true);
    setUniversalUploadErrors((p) => { const n = { ...p }; delete n[clauseId]; return n; });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await ArcApi.vendorUploadUniversalTechEvidence(clauseId, fd);
      const f = res?.data?.file;
      if (f) setUniversalFiles((prev) => ({ ...prev, [clauseId]: [...(prev[clauseId] || []), f] }));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Upload failed";
      setUniversalUploadErrors((p) => ({ ...p, [clauseId]: msg }));
    }
    finally { setTechBusy(false); }
  };

  const onDeleteUniversalEvidence = async (clauseId, fileId) => {
    setTechBusy(true); setTechError(null);
    try {
      await ArcApi.vendorDeleteUniversalTechEvidence(fileId);
      setUniversalFiles((prev) => ({ ...prev, [clauseId]: (prev[clauseId] || []).filter((f) => f.file_id !== fileId) }));
    } catch (e) { setTechError(e?.response?.data?.message || e?.message || "Delete failed"); }
    finally { setTechBusy(false); }
  };

  const onSealTechEnvelope = async () => {
    setTechBusy(true); setTechError(null);
    try {
      await onSaveTechDraft();
      const res = await ArcApi.vendorSubmitTechEnvelope(Number(contractId));
      const sealedAt = res?.data?.tech_submitted_at || new Date().toISOString();
      setTechEnvelope(prev => ({ ...(prev || {}), tech_submitted_at: sealedAt }));
      showToastMsg("Technical envelope sealed");
      await onRefresh();
    } catch (e) { setTechError(e?.response?.data?.message || e?.message || "Seal failed"); }
    finally { setTechBusy(false); }
  };

  // Fold universal answered/total into the progress so the SINGLE seal gate
  // reflects BOTH the per-item and the ARC-wide (universal) envelopes.
  const evalTotal = techItems.reduce((s, it) => s + (it.clauses || []).length, 0) + universalClauses.length;
  const evalAnswered = techItems.reduce((s, it) => {
    return s + (it.clauses || []).filter(c => techResponses[c.clause_id] != null && String(techResponses[c.clause_id]).trim() !== "").length;
  }, 0) + universalClauses.filter(c => universalResponses[c.clause_id] != null && String(universalResponses[c.clause_id]).trim() !== "").length;
  const evalProgress = evalTotal ? Math.round((evalAnswered / evalTotal) * 100) : 100;

  // -------------------- stage gating --------------------
  // Submission window state — vendors may only act ('open') while
  // submission_start_at <= now <= submission_end_at. Before the start it's
  // 'not_started'; after the end it's 'ended'. The server's submissionWindowGate
  // is the real enforcement; this drives the UI lock + the status banner.
  const windowState = (() => {
    const now = Date.now();
    const start = arc?.submission_start_at ? new Date(arc.submission_start_at).getTime() : null;
    const end   = arc?.submission_end_at   ? new Date(arc.submission_end_at).getTime()   : null;
    if (start && now < start) return "not_started";
    if (end && now > end)     return "ended";
    return "open";
  })();
  const windowOpen = windowState === "open";

  // Sr 52 — a line's GST is "set" only when it's a non-empty, finite, >=0
  // number. Blank/null/"" is NOT a valid submission value (no silent 0
  // default); an explicit 0 passes (0% GST is a legitimate choice).
  const gstIsSet = (v) => v !== "" && v != null && Number.isFinite(Number(v)) && Number(v) >= 0;

  // canSubmit mirrors server's 409 guard — do NOT loosen.
  const canSubmit = (() => {
    if (!windowOpen) return false;
    if (!acceptedTerms) return false;
    if (hasTechClauses && !techSealed) return false;
    if (paymentTotal !== 100) return false;
    return items.length > 0 && items.every(it => {
      const l = priceLine(it.id);
      return safeNum(l.rate) > 0 && gstIsSet(l.gst_pct);
    });
  })();

  // Advance to next allowed stage from current stageKey.
  const advanceStage = async (saveFirst = false) => {
    if (saveFirst) await saveDraft(true);
    const allowed = allowedStages();
    const idx = allowed.indexOf(stageKey);
    if (idx < 0) {
      // stageKey is overview/technical/commercial not in allowed list — go to furthest
      selectStage(furthestAllowed());
      return;
    }
    const next = allowed[idx + 1];
    if (next) selectStage(next);
  };

  // Go back one stage.
  const retreatStage = () => {
    const allowed = allowedStages();
    const idx = allowed.indexOf(stageKey);
    const prev = idx > 0 ? allowed[idx - 1] : allowed[0];
    selectStage(prev);
  };

  // -------------------- draft + submit --------------------
  const buildDraftPayload = () => ({
    arc_id: Number(contractId),
    payment_terms: globals.paymentTerms.map(t => `${t.label || ""}: ${safeNum(t.pct)}%`).join(" | "),
    gstin_used: globals.gstin || "",
    global_charges: globalChargesToEngine(globalCharges),
    lines: items.map(it => {
      const l = priceLine(it.id);
      // Phase 2 — send canonical engine charge array (not the legacy single freight number).
      // FE amountMode '%'/'₹' → engine amount_mode 'percentage'/'absolute'.
      // Per-charge tax: blank string → null (engine tri-state: inherit base tax);
      //                 "0" → 0 (explicit no tax); positive number → explicit rate.
      const engineCharges = (l.charges || []).map(c => ({
        name:        c.name || null,
        amount:      safeNum(c.amount),
        amount_mode: toEngineMode(c.amountMode || "%"),
        tax:         (c.tax === "" || c.tax == null) ? null : safeNum(c.tax),
        tax_mode:    toEngineMode(c.taxMode || "%"),
        ...(c.note ? { comment: c.note } : {}),
      }));
      return {
        arc_item_id:   it.id,
        rate:          safeNum(l.rate) || null,
        // Sr 52 — blank/null → null (draft stays a true blank on round-trip);
        // an explicit 0 must survive as 0, NOT collapse to null. The old
        // `safeNum(l.gst_pct) || null` bug: safeNum("") === 0, and 0 || null
        // === null, so a real 0 was silently sent as blank.
        gst_pct:       (l.gst_pct === "" || l.gst_pct == null) ? null : safeNum(l.gst_pct),
        gst_mode:      l.gstMode === "₹" ? "absolute" : "percentage",
        charges:       engineCharges,
        lead_time_days: safeNum(l.lead_time_days) || null,
        moq:           safeNum(l.moq) || null,
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

  const markCommercialDirty = () => setCommercialSaveState((s) => (s === "saving" ? s : "dirty"));

  // Sr 37 — silent auto-save wrapper around the existing saveDraft(true). Never
  // throws/toasts: a failed autosave (e.g. the window just closed, server
  // 409s) only flips the chip to "error" — it must not crash the page or
  // spam a toast on every keystroke/blur.
  const autosaveCommercial = async () => {
    if (!contractId || !windowOpen || (submitted && !editing)) return;
    setCommercialSaveState("saving");
    try {
      await saveDraft(true);
      setCommercialSaveState("saved");
    } catch (_e) {
      setCommercialSaveState("error");
    }
  };

  // Trailing ~800ms debounce after a price/globals/charges field changes, so
  // long typing sessions persist without needing a blur. On-blur (immediate)
  // save is wired separately via onFieldBlur on each input.
  const scheduleCommercialAutosave = () => {
    markCommercialDirty();
    if (!contractId || !windowOpen || (submitted && !editing)) return;
    if (commercialAutosaveTimer.current) clearTimeout(commercialAutosaveTimer.current);
    commercialAutosaveTimer.current = setTimeout(() => { autosaveCommercial(); }, 800);
  };

  // Immediate silent save on blur of a commercial-stage field.
  const onCommercialFieldBlur = () => {
    if (!contractId || !windowOpen || (submitted && !editing)) return;
    if (commercialAutosaveTimer.current) clearTimeout(commercialAutosaveTimer.current);
    autosaveCommercial();
  };

  const handleNextStep = async () => {
    await advanceStage(true);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await ArcApi.vendorSaveQuoteDraft(buildDraftPayload());
      await ArcApi.vendorSubmitQuote(contractId);
      // §1.4 FIX: reload to get real submitted_at; drop fabricated reference.
      await onRefresh({ advance: true });
      // Leave edit mode and refresh the version history so the new submission
      // (just archived server-side) is reflected in the count + Past quotes.
      setEditing(false);
      await loadHistory();
      // Show the one-time confirmation only for THIS submit (not on revisit).
      setJustSubmitted(true);
    } catch (e) {
      showToastMsg(e?.response?.data?.message || e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  // D: Open confirm modal (button calls this, not the API directly).
  const openRegretModal = () => {
    if (!contractId) return;
    setWithdrawModalError(null);
    setConfirmRegret(true);
  };

  // D: Guarded withdraw — called only from inside the confirm modal.
  const regretQuote = async () => {
    if (withdrawing || !contractId) return;
    setWithdrawing(true);
    setWithdrawModalError(null);
    try {
      await ArcApi.vendorWithdrawQuote(contractId);
      setConfirmRegret(false);
      showToastMsg("Quote withdrawn");
      await onRefresh();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Could not withdraw";
      // Surface 409 deadline-passed inline in the modal, not just a toast.
      setWithdrawModalError(msg);
    } finally {
      setWithdrawing(false);
    }
  };

  // D: Withdrawn state — derived from refreshed quote.
  const withdrawnAt = quote?.withdrawn_at || null;
  const isWithdrawn = !!withdrawnAt;
  // Re-open an already-submitted quote for a new submission (only while the
  // window is open — the server's submissionWindowGate is the real enforcement;
  // this just surfaces the affordance). Lands on the editable commercial stage.
  const startEditing = () => {
    setEditing(true);
    selectStage("commercial");
  };

  const arcRefLabel = arc?.arc_number ? `ARC-${arc.arc_number}` : `ARC-${contractId || ""}`;
  const copyReference = () => {
    if (arcRefLabel && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(arcRefLabel);
    }
    showToastMsg("Reference copied");
  };

  const showToastMsg = (m) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };

  // Download the submitted quote as a PDF. Fetches the blob (auth header injected
  // by the shared axios instance), builds an object URL, and triggers a download
  // via a temporary anchor — then revokes the URL. Toast on failure.
  const handleDownloadPdf = async () => {
    if (downloadingPdf || !contractId) return;
    setDownloadingPdf(true);
    try {
      const blob = await ArcApi.downloadVendorQuotePdf(contractId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${arcNumber !== "—" ? arcNumber : contractId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      showToastMsg(e?.response?.data?.message || e?.message || "Could not download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // -------------------- payment-term editors --------------------
  const addPaymentTerm  = () => { setGlobals(g => ({ ...g, paymentTerms: [...g.paymentTerms, { label: "", pct: 0 }] })); scheduleCommercialAutosave(); };
  const removePaymentTerm = (i) => { setGlobals(g => g.paymentTerms.length === 1 ? g : ({ ...g, paymentTerms: g.paymentTerms.filter((_, idx) => idx !== i) })); scheduleCommercialAutosave(); };
  const updatePaymentTerm = (i, patch) => { setGlobals(g => ({ ...g, paymentTerms: g.paymentTerms.map((t, idx) => idx === i ? { ...t, ...patch } : t) })); scheduleCommercialAutosave(); };

  // -------------------- derived helpers --------------------
  const submissionEnd = arc?.submission_end_at ? new Date(arc.submission_end_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const submissionStart = arc?.submission_start_at ? new Date(arc.submission_start_at).toLocaleDateString("en-IN") : "—";
  const submissionStartFull = arc?.submission_start_at ? new Date(arc.submission_start_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const termStart = arc?.contract_start_at ? new Date(arc.contract_start_at).toLocaleDateString("en-IN") : "—";
  const termEnd = arc?.contract_end_at ? new Date(arc.contract_end_at).toLocaleDateString("en-IN") : "—";
  const arcNumber = arc?.arc_number || "—";

  // Current (latest) version number — history is newest-first, so [0] is latest.
  // Falls back to 1 once submitted but before the history feed has loaded.
  const currentVersion = history.length > 0 ? history[0].version_no : (submitted ? 1 : 0);

  if (loading) {
    return (
      <main className="main-body">
        <QuoteSkeleton />
      </main>
    );
  }
  if (!arc) {
    return (
      <main className="main-body">
        <div style={{ padding: 40, textAlign: "center", color: "var(--fg-3)" }}>
          Could not load this rate-contract request.
          <div style={{ marginTop: 12 }}>
            <Link href="/dashboard/vendor/rate-contracts/requests" className="btn btn-secondary btn-sm">Back to requests</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-body" style={{ paddingBottom: 108 }}>
      {/* HERO */}
      <section className="arc-hero">
        <div className="top">
          <div>
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
                <span className="em">{arc.hotel_name || "—"}</span>
              </span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-sm" onClick={() => { setOpenHistory(true); loadHistory(); }} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
              Past quotes{submitted && currentVersion > 0 ? ` · v${currentVersion}` : ""}
            </button>
            {/* Update quote — re-open the submitted quote for a new submission while
                the window is still open. Hidden once the window closes (the form
                then stays read-only and the server gate would reject a re-submit). */}
            {submitted && !isWithdrawn && windowOpen && !editing && (
              <button className="btn btn-sm btn-blue" onClick={startEditing} type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Update quote
              </button>
            )}
            {/* Download the submitted quote PDF — available anytime once submitted. */}
            {submitted && (
              <button className="btn btn-sm" onClick={handleDownloadPdf} disabled={downloadingPdf} type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {downloadingPdf ? "Preparing…" : "Download quote PDF"}
              </button>
            )}
            {/* D: Only show Regret when there is a non-withdrawn quote to withdraw. */}
            {quote && !isWithdrawn && (
              <button className="btn btn-sm" onClick={openRegretModal} disabled={withdrawing} type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                Regret
              </button>
            )}
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell"><div className="k">Submission closes</div><div className="v"><span className="em">{submissionEnd}</span></div></div>
          <div className="cell"><div className="k">Contract term</div><div className="v"><span>{termStart}</span> → <span>{termEnd}</span></div></div>
          <div className="cell"><div className="k">Items</div><div className="v"><span className="em">{items.length}</span> line item(s)</div></div>
          <div className="cell"><div className="k">Business unit</div><div className="v"><span className="em">{arc.hotel_name || "—"}</span></div></div>
          <div className="cell"><div className="k">Bid sealing</div><div className="v">Encrypted until close</div></div>
        </div>
      </section>

      {/* LIFECYCLE TIMELINE (vendor-projected stages) */}
      {lifecycle?.stages && (
        <VendorArcStageTimeline
          stages={lifecycle.stages}
          selectedKey={stageKey}
          onSelect={selectStage}
        />
      )}

      {/* NEGOTIATION BANNER — shows only when an ACTIVE round targets this vendor */}
      <VendorArcNegotiationBanner arcId={contractId} onAfterSubmit={onRefresh} />

      {lockedNote && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <div>{lockedNote}</div>
        </div>
      )}

      {/* Submission window lock — when the window hasn't started yet or has
          ended, NOTHING can be submitted (terms, technical envelope, or quote).
          The server's submissionWindowGate enforces this; here we lock the UI
          and tell the vendor clearly why they can't proceed. */}
      {!windowOpen && !isWithdrawn && ["overview", "technical", "commercial"].includes(stageKey) && (
        <div className="guide danger" style={{ alignItems: "flex-start" }}>
          <div className="g-ic" style={{ marginTop: 2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {windowState === "not_started"
                ? "Submission window hasn't opened yet"
                : "Submission window has closed"}
            </div>
            <div style={{ fontSize: 12.5 }}>
              {windowState === "not_started"
                ? <>You can&apos;t proceed with this rate contract yet — submissions open on <span className="mono">{submissionStartFull}</span>. You can review the items and specifications now, and come back once the window opens to accept terms, respond to the technical envelope, and submit your quote.</>
                : <>You can&apos;t proceed with this rate contract — the submission window closed on <span className="mono">{submissionEnd}</span>. Accepting terms, responding to the technical envelope, and submitting or updating a quote are all locked. Your view is read-only from here.</>}
            </div>
          </div>
        </div>
      )}

      {/* Audit notice — updating an already-submitted quote. The current
          submission is recorded for audit; re-submitting appends a new version. */}
      {editing && (
        <div className="guide violet" style={{ alignItems: "flex-start" }}>
          <div className="g-ic" style={{ marginTop: 2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>You&apos;re updating a submitted quote</div>
            <div style={{ fontSize: 12.5 }}>
              Your current submission <strong>(v{currentVersion})</strong> is <strong>recorded for audit</strong>, and re-submitting saves a <strong>new version to history</strong> — nothing is lost. You can keep updating until <span className="mono">{submissionEnd}</span>.
            </div>
          </div>
        </div>
      )}

      {/* D: Terminal withdrawn state banner — replaces the submitted stage after a regret. */}
      {isWithdrawn && (
        <div className="guide danger" style={{ alignItems: "flex-start" }}>
          <div className="g-ic" style={{ marginTop: 2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Quote withdrawn</div>
            <div style={{ fontSize: 12.5 }}>
              You marked this rate contract as declined on{" "}
              <span className="mono">{new Date(withdrawnAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>.
              If you wish to re-submit, please return to your rate-contract requests list.
            </div>
          </div>
        </div>
      )}

      {/* AWARDING STAGE — Award & sign (read-only panel) */}
      {stageKey === "awarding" && (
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Award &amp; sign</div>
              <div className="q-section-sub">Await the buyer&apos;s award decision. If selected, you&apos;ll be invited to sign the rate contract.</div>
            </div>
          </div>
          {(() => {
            const awardingStage = lifecycle?.stages?.find(s => s.key === "awarding");
            const reason = awardingStage?.reason;
            if (reason === "awaiting_sign") {
              return (
                <div className="q-card">
                  <div className="q-card-head">
                    <h3>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Congratulations — you&apos;ve been awarded
                    </h3>
                  </div>
                  <div className="q-card-section">
                    <p style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 16 }}>
                      The buyer has selected your quote. Please review and sign the rate contract to activate it.
                    </p>
                    <Link href={`/dashboard/vendor/rate-contracts/${contractId}/accept`} className="btn btn-success">
                      Review &amp; sign contract
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              );
            }
            if (reason === "not_awarded") {
              return (
                <div className="q-card" style={{ overflow: "hidden" }}>
                  <div className="q-card-section" style={{ textAlign: "center", padding: "38px 28px" }}>
                    <div style={{ width: 62, height: 62, borderRadius: "50%", margin: "0 auto 16px", display: "grid", placeItems: "center", background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--fg-3)" }}>
                      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--fg)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                      Not selected for this contract
                    </h3>
                    <p style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
                      The buyer has completed the award process and selected another vendor for
                      {arcNumber ? <> <strong className="mono">#{arcNumber}</strong></> : " this rate contract"}.
                      The decision is final for this contract.
                    </p>
                    <div style={{ height: 1, background: "var(--border)", margin: "22px auto", maxWidth: 340 }} />
                    <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto 20px" }}>
                      Thank you for taking the time to submit a competitive quote — it was genuinely
                      appreciated. New rate-contract opportunities open regularly, and we&apos;d love
                      to see you bid again.
                    </p>
                    <Link href="/dashboard/vendor/rate-contracts/requests" className="btn btn-blue">
                      Explore open opportunities
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              );
            }
            return (
              <div className="q-card">
                <div className="q-card-section" style={{ color: "var(--fg-3)", fontSize: 13 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: -2, marginRight: 6 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  The buyer&apos;s evaluation team is reviewing all submitted quotes. You&apos;ll be notified once the award decision is made.
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ACTIVE STAGE — Contract live (read-only panel) */}
      {stageKey === "active" && (
        <div className="step-pane">
          <div className="q-section-head">
            <div>
              <div className="q-section-title">Active contract</div>
              <div className="q-section-sub">Your rate contract is active. Call-off POs will be released by the buyer against this framework.</div>
            </div>
          </div>
          {(() => {
            const activeStage = lifecycle?.stages?.find(s => s.key === "active");
            const reason = activeStage?.reason;
            if (reason === "live") {
              return (
                <div className="q-card">
                  <div className="q-card-section">
                    <p style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 16 }}>
                      Your rate contract is live. The buyer will release call-off purchase orders against the agreed rates.
                    </p>
                    <Link href={`/dashboard/vendor/rate-contracts/${contractId}`} className="btn btn-blue">
                      View active contract
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Link>
                  </div>
                </div>
              );
            }
            if (["expired", "terminated", "declined"].includes(reason)) {
              return (
                <div className="q-card">
                  <div className="q-card-section" style={{ color: "var(--fg-3)", fontSize: 13 }}>
                    This contract has ended ({reason}).
                  </div>
                </div>
              );
            }
            return (
              <div className="q-card">
                <div className="q-card-section" style={{ color: "var(--fg-3)", fontSize: 13 }}>
                  Contract status: {reason || "pending"}.
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Inner stepper removed — VendorArcStageTimeline above is the only nav */}

      {/* STAGE BODIES — driven by stageKey, not an internal stepper */}
      {(stageKey === "overview" || (!stageKey && true)) && (
        <VendorOverviewStage
          arc={arc}
          items={items}
          invitation={invitation}
          techEnvelope={techEnvelope}
          acceptedTerms={acceptedTerms}
          termsAcceptedAt={termsAcceptedAt}
          onAcceptTerms={onAcceptTerms}
          acceptingTerms={acceptingTerms}
          readOnly={(submitted && !editing) || !windowOpen}
          submissionStart={submissionStart}
          submissionEnd={submissionEnd}
          termStart={termStart}
          termEnd={termEnd}
        />
      )}

      {stageKey === "technical" && hasTechClauses && (
        <VendorTechnicalStage
          items={items}
          techItems={techItems}
          itemClauses={itemClauses}
          techResponses={techResponses}
          techFiles={techFiles}
          techSealed={techSealed}
          techBusy={techBusy}
          techError={techError}
          evalTotal={evalTotal}
          evalAnswered={evalAnswered}
          evalProgress={evalProgress}
          onChangeResponse={(clauseId, value) => { setTechResponses(prev => ({ ...prev, [clauseId]: value })); scheduleTechAutosave(); }}
          onUploadEvidence={onUploadTechEvidence}
          onDeleteEvidence={onDeleteTechEvidence}
          uploadErrors={techUploadErrors}
          readOnly={!windowOpen}
          // Sr 37 — auto-save chip + silent on-blur save (debounce above handles typing pauses).
          saveState={techSaveState}
          onFieldBlur={onTechFieldBlur}
          // Universal (ARC-wide) envelope — distinct section rendered ABOVE the items.
          universalClauses={universalClauses}
          universalMinPass={universalMinPass}
          universalResponses={universalResponses}
          universalFiles={universalFiles}
          onChangeUniversalResponse={onChangeUniversalResponse}
          onUploadUniversalEvidence={onUploadUniversalEvidence}
          onDeleteUniversalEvidence={onDeleteUniversalEvidence}
          universalUploadErrors={universalUploadErrors}
        />
      )}

      {stageKey === "commercial" && (
        <VendorCommercialStage
          arc={arc}
          items={items}
          price={price}
          priceLine={priceLine}
          updateLine={updateLine}
          addChargeOfType={addChargeOfType}
          removeCharge={removeCharge}
          productChargesTotal={productChargesTotal}
          lineTotal={lineTotal}
          totals={totals}
          globals={globals}
          setGlobals={setGlobalsAndMark}
          onChangePaymentTerms={updatePaymentTerm}
          onChangeComment={(v) => { setGlobals(g => ({ ...g, comment: v })); scheduleCommercialAutosave(); }}
          paymentTotal={paymentTotal}
          chargesOpen={chargesOpen}
          setChargesOpen={setChargesOpen}
          globalCharges={globalCharges}
          setGlobalCharges={setGlobalCharges}
          globalChargesOpen={globalChargesOpen}
          setGlobalChargesOpen={setGlobalChargesOpen}
          addGlobalCharge={addGlobalCharge}
          removeGlobalCharge={removeGlobalCharge}
          updateGlobalCharge={updateGlobalCharge}
          lineChargeTypes={lineChargeTypes}
          globalChargeTypes={globalChargeTypes}
          canSubmit={canSubmit}
          submitting={submitting}
          onSaveDraft={() => saveDraft(false)}
          onSubmit={submit}
          onWithdraw={openRegretModal}
          submitted={submitted}
          submittedAt={submittedAt}
          readOnly={(submitted && !editing) || !windowOpen}
          editing={editing}
          currentVersion={currentVersion}
          windowOpen={windowOpen}
          isWithdrawn={isWithdrawn}
          onUpdateQuote={startEditing}
          onDownloadPdf={handleDownloadPdf}
          downloadingPdf={downloadingPdf}
          arcNumber={arcNumber}
          termStart={termStart}
          termEnd={termEnd}
          submissionEnd={submissionEnd}
          addPaymentTerm={addPaymentTerm}
          removePaymentTerm={removePaymentTerm}
          updatePaymentTerm={updatePaymentTerm}
          setPrice={setPriceAndMark}
          blankLine={blankLine}
          // Sr 37 — auto-save chip + silent on-blur save (debounce above handles typing pauses).
          saveState={commercialSaveState}
          onFieldBlur={onCommercialFieldBlur}
        />
      )}


      {toast && (
        <div className="arc-toast">
          <span className="t-ic">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Action dock — single action center for all stage navigation + commercial submit.
          Phase 1 §D: Submit + Save-draft are NOW here (not in VendorCommercialStage aside).
          Accept-terms and seal-envelope remain inside their stage bodies (stage-specific seals). */}
      {(!submitted || editing) && ["overview", "technical", "commercial"].includes(stageKey) && (() => {
        const visibleOrder = ["overview", ...(hasTechClauses ? ["technical"] : []), "commercial"];
        const curIdx = visibleOrder.indexOf(stageKey);
        const prevStage = curIdx > 0 ? visibleOrder[curIdx - 1] : null;
        const nextStage = curIdx >= 0 && curIdx < visibleOrder.length - 1 ? visibleOrder[curIdx + 1] : null;
        const continueBlocked =
          savingDraft ||
          (stageKey === "overview" && !acceptedTerms) ||
          (stageKey === "technical" && hasTechClauses && !techSealed);
        // Window closed (not started / ended) → no submission actions at all.
        // Keep only Back navigation; the banner above explains why.
        if (!windowOpen) {
          return (
            <div className="action-dock">
              <div className="inner">
                <div className="left">
                  <span className="fs-13 text-fg-2">
                    <span className="fw-600 text-fg">Locked.</span>{" "}
                    {windowState === "not_started"
                      ? <>Submissions open on <span className="mono">{submissionStartFull}</span>.</>
                      : <>The submission window closed on <span className="mono">{submissionEnd}</span>.</>}
                  </span>
                </div>
                <div className="right">
                  {prevStage && (
                    <button className="btn btn-secondary btn-sm" onClick={() => selectStage(prevStage)} type="button">Back</button>
                  )}
                </div>
              </div>
            </div>
          );
        }
        return (
        <div className="action-dock">
          <div className="inner">
            <div className="left">
              {stageKey === "overview" && (
                <span className="fs-13 text-fg-2"><span className="fw-600 text-fg">Tender &amp; terms.</span> {acceptedTerms ? "Terms acknowledged — continue when ready." : "Acknowledge the terms above to continue."}</span>
              )}
              {stageKey === "technical" && (
                <span className="fs-13 text-fg-2">
                  <span className="fw-600 text-fg">Technical envelope.</span>{" "}
                  {hasTechClauses
                    ? (techSealed
                        ? <span>Envelope sealed — continue to your quote.</span>
                        : (evalTotal === 0
                            ? <span>No clauses to respond to on this envelope — seal when ready.</span>
                            : <span>{evalAnswered} of {evalTotal} answered — respond to all clauses, then seal the envelope to continue.</span>))
                    : <span>No technical evaluation required for these items.</span>}
                </span>
              )}
              {stageKey === "commercial" && (
                <span className="fs-13 text-fg-2">
                  <span className="fw-600 text-fg">Your quote.</span>{" "}
                  {canSubmit
                    ? <span style={{ color: "var(--success, #22c55e)" }}>Ready to submit — all lines priced.</span>
                    : <span>Enter rate and GST (0 is valid) for all items, then submit.</span>}
                </span>
              )}
            </div>
            <div className="right">
              {prevStage && (
                <button className="btn btn-secondary btn-sm" onClick={() => selectStage(prevStage)} type="button">Back</button>
              )}
              {/* C: Technical stage — Seal + Save Draft (unsealed) or Continue (sealed) */}
              {stageKey === "technical" && (
                techSealed ? (
                  <button
                    className="btn btn-blue"
                    onClick={handleNextStep}
                    type="button"
                  >
                    <span>Continue to your quote</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={onSaveTechDraft}
                      disabled={techBusy}
                    >
                      {techBusy ? "Saving…" : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-blue"
                      onClick={onSealTechEnvelope}
                      disabled={techBusy || (evalTotal > 0 && evalAnswered < evalTotal)}
                      title={evalTotal === 0 ? "No clauses to respond to — seal to continue to your quote" : evalAnswered < evalTotal ? `Respond to all ${evalTotal} clauses first` : "Seal technical envelope"}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      {techBusy ? "Sealing…" : evalTotal === 0 ? "Seal & continue" : "Seal Technical Evaluation"}
                    </button>
                  </>
                )
              )}
              {/* Phase 1 §D — commercial: Save draft + Submit in the dock (SINGLE action center) */}
              {stageKey === "commercial" && !nextStage && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => saveDraft(false)}
                    disabled={submitting || savingDraft}
                  >
                    {savingDraft ? "Saving…" : "Save draft"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={submit}
                    disabled={!canSubmit || submitting || savingDraft}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    {submitting ? "Submitting…" : (editing ? "Re-submit quote" : "Submit quote")}
                  </button>
                </>
              )}
              {/* Overview → next stage Continue button (non-technical stages) */}
              {nextStage && stageKey !== "technical" && (
                <button
                  className="btn btn-blue"
                  onClick={handleNextStep}
                  disabled={continueBlocked}
                  type="button"
                >
                  <span>{nextStage === "technical" ? "Continue to technical" : "Continue to your quote"}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* One-time post-submit confirmation. Gated on justSubmitted (this session)
          so revisiting an already-submitted quote shows the lifecycle, not this
          overlay. Closeable via the ✕, the backdrop, or the footer actions. */}
      {justSubmitted && (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setJustSubmitted(false); }}>
          <div className="confirm-modal">
            <button className="confirm-close" type="button" aria-label="Close" onClick={() => setJustSubmitted(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
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
                <span className="ref-num">{arcRefLabel}</span>
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
              <Link className="btn btn-secondary" href="/dashboard/vendor/rate-contracts">
                Back to dashboard
              </Link>
              <button className="btn btn-secondary" type="button" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {downloadingPdf ? "Preparing…" : "Download PDF"}
              </button>
              <button className="btn btn-blue" type="button" onClick={() => setJustSubmitted(false)}>
                View contract status{" "}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D: Regret confirmation modal */}
      {confirmRegret && (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget && !withdrawing) setConfirmRegret(false); }}>
          <div className="confirm-modal" style={{ maxWidth: 420 }}>
            <div className="confirm-body" style={{ padding: "28px 28px 20px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 10 }}>Withdraw your quote?</div>
              <div style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
                This notifies the buyer and marks you as declined for this rate contract.
              </div>
              {withdrawModalError && (
                <div className="guide danger" style={{ alignItems: "center", marginTop: 14 }}>
                  <div className="g-ic" style={{ marginTop: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div style={{ fontSize: 12.5 }}>{withdrawModalError}</div>
                </div>
              )}
            </div>
            <div className="confirm-foot">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => { if (!withdrawing) setConfirmRegret(false); }}
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={regretQuote}
                disabled={withdrawing}
              >
                {withdrawing ? "Withdrawing…" : "Withdraw quote"}
              </button>
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
                <div className="t"><h3>Your submitted versions</h3></div>
                <div className="sub">Every version you&apos;ve submitted for this rate contract, newest first. Each re-submission is kept for audit.</div>
              </div>
              <button className="icon-btn" onClick={() => setOpenHistory(false)} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-2">
                {historyLoading && history.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--fg-3)", padding: 16, textAlign: "center" }}>
                    Loading your submission history…
                  </div>
                )}
                {!historyLoading && history.length === 0 && (
                  <div style={{ fontSize: 13, color: "var(--fg-3)", padding: 16, textAlign: "center" }}>
                    No previous quote history available yet.
                  </div>
                )}
                {history.map((h, idx) => (
                  <div className="p-3 rounded-lg flex items-center justify-between" style={{ border: "1px solid var(--border)" }} key={h.version_no}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        <span className="mono">v{h.version_no}</span>
                        {idx === 0 && <span className="pill" style={{ marginLeft: 8 }}>Current</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 3 }}>
                        <span>{h.submitted_at ? new Date(h.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>
                        {" · "}
                        <span>{h.line_count} line item{h.line_count === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{`₹ ${fmtN(h.grand_total)}`}</div>
                      <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2 }}>Grand total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
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
