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
import VendorArcStageTimeline from "@/components/dashboard/rate-contracts/vendor/stages/VendorArcStageTimeline";
import VendorOverviewStage from "@/components/dashboard/rate-contracts/vendor/stages/VendorOverviewStage";
import VendorTechnicalStage from "@/components/dashboard/rate-contracts/vendor/stages/VendorTechnicalStage";
import VendorCommercialStage from "@/components/dashboard/rate-contracts/vendor/stages/VendorCommercialStage";
import useArcQuotePreview from "@/hooks/useArcQuotePreview";

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
  charges: [],  // [{ name, amount, amountMode:'%'|'₹', tax:'', taxMode:'%'|'₹', note }]
});

// Phase 2 — map FE display tokens to engine mode strings.
const toEngineMode = (m) => (m === "%" || m === "percentage") ? "percentage"
  : (m === "₹" || m === "absolute") ? "absolute"
  : "percentage";

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

  // Phase 1 §3 — server-derived T&C gate. Seeded from quote.terms_accepted_at on
  // load; persisted via acceptTerms endpoint on accept; refreshed via onRefresh.
  const [termsAcceptedAt, setTermsAcceptedAt] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");
  const [openHistory, setOpenHistory] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(null);

  const [price, setPrice] = useState({});           // { [arc_item_id]: line }

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
            return rawCharges.map(c => ({
              name:       c.name || "",
              amount:     c.amount != null ? String(c.amount) : "",
              amountMode: (c.amount_mode === "absolute" || c.amount_mode === "₹") ? "₹" : "%",
              // tax: null/undefined/"" → "" (inherit); 0 → "0" (explicit no tax)
              tax:        (c.tax === null || c.tax === undefined || c.tax === "") ? "" : String(c.tax),
              taxMode:    (c.tax_mode === "absolute" || c.tax_mode === "₹") ? "₹" : "%",
              note:       c.comment || "",
            }));
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
            gst_pct: ln.gst_pct ?? 5,
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
  };

  const addChargeOfType = (itemId, type) => {
    if (!type) return;
    setPrice(p => {
      const cur = p[itemId] || blankLine();
      // Phase 2 — charge shape extended with per-charge tax fields.
      return { ...p, [itemId]: { ...cur, charges: [...cur.charges, { name: type, amount: "", amountMode: "%", tax: "", taxMode: "%", note: "" }] } };
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
    return { arc_id: Number(contractId), lines, global_charges: [] };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, items, price]);

  // Phase 2 — engine-backed preview (debounced 600ms). `preview` replaces the
  // client-side totals when available; falls back to client math while loading.
  const { preview: enginePreview } = useArcQuotePreview(previewDraft);

  // lineTotal: use engine preview when available, else client fallback.
  const lineTotal = (itemId, qty) => {
    if (enginePreview?.lines) {
      const el = enginePreview.lines.find(l => Number(l.arc_item_id) === Number(itemId));
      if (el) return Math.round(el.total);
    }
    // Client fallback (Phase 1 math; replaced by engine once preview responds).
    const l = priceLine(itemId);
    if (!l.rate) return 0;
    const subtotal = qty * safeNum(l.rate) + qty * safeNum(l.freight);
    const tax = l.gstMode === "%" ? (subtotal * safeNum(l.gst_pct)) / 100 : qty * safeNum(l.gst_pct);
    return Math.round(subtotal + tax);
  };

  // totals: use engine preview when available, else client fallback.
  const totals = useMemo(() => {
    if (enginePreview) {
      // Reconstruct the legacy shape the aside summary + VendorCommercialStage expect.
      const gst = enginePreview.lines.reduce((s, l) => s + (l.base_tax || 0), 0);
      // Aggregate per-charge-name totals across lines for the breakdown legend.
      const extras = {};
      enginePreview.lines.forEach(l => {
        (l.charges || []).forEach(c => {
          const key = c.name || "Charge";
          extras[key] = (extras[key] || 0) + (c.amount || 0);
        });
      });
      return {
        subtotal: Math.round(enginePreview.grand_subtotal || 0),
        gst: Math.round(gst),
        extraCharges: Object.entries(extras).map(([label, amount]) => ({ label, amount: Math.round(amount) })),
        grand: Math.round(enginePreview.grand_total || 0),
      };
    }
    // Client fallback — preserved from Phase 1 for use while preview is loading.
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

  const onSaveTechDraft = async () => {
    setTechBusy(true); setTechError(null);
    try {
      const responses = [];
      for (const it of techItems) {
        for (const cl of it.clauses || []) {
          responses.push({ clause_id: cl.clause_id, vendor_response: techResponses[cl.clause_id] ?? "" });
        }
      }
      await ArcApi.vendorSaveTechEnvelopeDraft({ arc_id: Number(contractId), responses });
    } catch (e) { setTechError(e?.response?.data?.message || e?.message || "Save failed"); }
    finally { setTechBusy(false); }
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

  const evalTotal = techItems.reduce((s, it) => s + (it.clauses || []).length, 0);
  const evalAnswered = techItems.reduce((s, it) => {
    return s + (it.clauses || []).filter(c => techResponses[c.clause_id] != null && String(techResponses[c.clause_id]).trim() !== "").length;
  }, 0);
  const evalProgress = evalTotal ? Math.round((evalAnswered / evalTotal) * 100) : 100;

  // -------------------- stage gating --------------------
  // canSubmit mirrors server's 409 guard — do NOT loosen.
  const canSubmit = (() => {
    if (!acceptedTerms) return false;
    if (hasTechClauses && !techSealed) return false;
    if (paymentTotal !== 100) return false;
    return items.length > 0 && items.every(it => safeNum(priceLine(it.id).rate) > 0);
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
        gst_pct:       safeNum(l.gst_pct) || null,
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
  // windowOpen: true while submission deadline is in the future (or unknown).
  const windowOpen = arc?.submission_end_at ? new Date(arc.submission_end_at) > new Date() : true;

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
          <div className="cell"><div className="k">Business unit</div><div className="v"><span className="em">{arc.hotel_code || "—"}</span> {arc.hotel_name || ""}</div></div>
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

      {lockedNote && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <div>{lockedNote}</div>
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
                <div className="q-card">
                  <div className="q-card-section" style={{ color: "var(--fg-3)", fontSize: 13 }}>
                    The buyer has completed the award process. Your quote was not selected for this rate contract.
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
          readOnly={submitted}
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
          onChangeResponse={(clauseId, value) => setTechResponses(prev => ({ ...prev, [clauseId]: value }))}
          onUploadEvidence={onUploadTechEvidence}
          onDeleteEvidence={onDeleteTechEvidence}
          uploadErrors={techUploadErrors}
          readOnly={false}
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
          setGlobals={setGlobals}
          onChangePaymentTerms={updatePaymentTerm}
          onChangeComment={(v) => setGlobals(g => ({ ...g, comment: v }))}
          paymentTotal={paymentTotal}
          chargesOpen={chargesOpen}
          setChargesOpen={setChargesOpen}
          canSubmit={canSubmit}
          submitting={submitting}
          onSaveDraft={() => saveDraft(false)}
          onSubmit={submit}
          onWithdraw={openRegretModal}
          submitted={submitted}
          submittedAt={submittedAt}
          readOnly={false}
          arcNumber={arcNumber}
          termStart={termStart}
          termEnd={termEnd}
          submissionEnd={submissionEnd}
          addPaymentTerm={addPaymentTerm}
          removePaymentTerm={removePaymentTerm}
          updatePaymentTerm={updatePaymentTerm}
          setPrice={setPrice}
          blankLine={blankLine}
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
      {!submitted && ["overview", "technical", "commercial"].includes(stageKey) && (() => {
        const visibleOrder = ["overview", ...(hasTechClauses ? ["technical"] : []), "commercial"];
        const curIdx = visibleOrder.indexOf(stageKey);
        const prevStage = curIdx > 0 ? visibleOrder[curIdx - 1] : null;
        const nextStage = curIdx >= 0 && curIdx < visibleOrder.length - 1 ? visibleOrder[curIdx + 1] : null;
        const continueBlocked =
          savingDraft ||
          (stageKey === "overview" && !acceptedTerms) ||
          (stageKey === "technical" && hasTechClauses && !techSealed);
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
                    : <span>Enter rates for all items, then submit.</span>}
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
                      disabled={techBusy || evalTotal === 0 || evalAnswered < evalTotal}
                      title={evalTotal === 0 ? "No clauses to respond to" : evalAnswered < evalTotal ? `Respond to all ${evalTotal} clauses first` : "Seal technical envelope"}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      {techBusy ? "Sealing…" : "Seal Technical Evaluation"}
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
                    {submitting ? "Submitting…" : "Submit quote"}
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
