// Buyer · Create Rate Contract — 6-step wizard.
// Faithful port of prototypes/arc_ui/buyer-create.html. DOM structure and
// class names mirror the prototype 1:1 so the existing arc_v2.css (section
// cards, horizontal stepper, cat-grid, item-row, te-clause-row, weight-bar,
// vendor-pick-row, action-dock) styles every panel directly.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";
import { getUnits } from "@/services/units";

// ──────────────────────────────────────────────────────────────────────────
//  Constants & helpers
// ──────────────────────────────────────────────────────────────────────────

const STEPS = [
  { key: "basics",    label: "Basics",         meta: "Category · type" },
  { key: "bu",        label: "Business unit",  meta: "Single-BU scope" },
  { key: "items",     label: "Items",          meta: "Pick from catalogue" },
  { key: "terms",     label: "Terms",          meta: "Dates · escalation" },
  { key: "tech",      label: "Tech & vendors", meta: "Clauses · eligibility" },
  { key: "review",    label: "Review",         meta: "Publish & float" },
];

const TODAY = new Date();
const isoOffset = (d) => {
  const dt = new Date(TODAY);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}

function initialsFor(name) {
  if (!name) return "??";
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function avClassFor(id) {
  const palette = ["av-indigo","av-sky","av-green","av-warm","av-violet","av-teal","av-rose"];
  return palette[Math.abs(Number(id) || 0) % palette.length];
}

// ──────────────────────────────────────────────────────────────────────────
//  Tiny SVG icon helpers — keeps JSX readable
// ──────────────────────────────────────────────────────────────────────────
const Icon = (props) => (
  <svg width={props.size || 14} height={props.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {props.children}
  </svg>
);

const FileIcon       = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Icon>;
const BuildingIcon   = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></Icon>;
const BoxIcon        = (p) => <Icon {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></Icon>;
const ClockIcon      = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>;
const CheckIcon      = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
const InfoIcon       = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Icon>;
const SearchIcon     = (p) => <Icon {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>;
const TrashIcon      = (p) => <Icon {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Icon>;
const PlusIcon       = (p) => <Icon size={p.size || 12} {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const PaperclipIcon  = (p) => <Icon size={p.size || 11} {...p}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66"/></Icon>;
const ArrowRightIcon = (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>;
const SendIcon       = (p) => <Icon {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Icon>;
const ServiceIcon    = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6"/><path d="M4.22 4.22l4.24 4.24m7.07 7.07l4.25 4.25"/></Icon>;
const ShieldIcon     = (p) => <Icon {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></Icon>;
const ChecklistIcon  = (p) => <Icon {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Icon>;

// ──────────────────────────────────────────────────────────────────────────
//  Page
// ──────────────────────────────────────────────────────────────────────────

export default function CreateRateContractPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // H8 — remember a draft already created this session so a retry after a
  // mid-flight failure resumes (re-publishes) instead of minting a duplicate.
  const draftArcRef = useRef(null);

  // Loaded reference data
  const [categories, setCategories] = useState([]);
  const [subCats, setSubCats] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [variants, setVariants] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [units, setUnits] = useState([]);

  // Step 1 — Basics
  const [title, setTitle] = useState("");
  const [internalRef, setInternalRef] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [type, setType] = useState("product");
  const [selectedSubCats, setSelectedSubCats] = useState([]);

  // Step 2 — BU
  const [hotelId, setHotelId] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);

  // Step 3 — Items (selectedIds + per-item meta)
  const [itemSearch, setItemSearch] = useState("");
  const [debouncedItemSearch, setDebouncedItemSearch] = useState("");
  const [itemSubCat, setItemSubCat] = useState("");   // in-step sub-category filter
  const [itemPage, setItemPage] = useState(1);
  const [variantsTotal, setVariantsTotal] = useState(0);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  // Persisted display meta for selected items so they survive pagination/search
  // (the browse list only holds the current pages; variantById falls back here).
  const [selectedMeta, setSelectedMeta] = useState({});
  const [itemSpecs, setItemSpecs] = useState({});
  const [itemQtys, setItemQtys] = useState({});
  const [itemUoms, setItemUoms] = useState({});
  const varSeq = useRef(0);

  // Step 4 — Terms
  const [submissionStart, setSubmissionStart] = useState(isoOffset(2));
  const [submissionEnd, setSubmissionEnd] = useState(isoOffset(12));
  const [contractStart, setContractStart] = useState(isoOffset(20));
  const [contractEnd, setContractEnd] = useState(isoOffset(380));
  const [escalation, setEscalation] = useState("none");
  const [escalationCap, setEscalationCap] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [deliveryTerms, setDeliveryTerms] = useState("Within 21 days of each released PO");
  const [penalty, setPenalty] = useState("1.5% LD per week of delay, capped at 7.5% of PO value");
  const [samplesRequired, setSamplesRequired] = useState(false);

  // Step 5 — Tech eval + vendors
  const [techRequired, setTechRequired] = useState(true);
  const [clausesByItem, setClausesByItem] = useState({});
  const [minPassByItem, setMinPassByItem] = useState({});
  const [eligibility, setEligibility] = useState("invitation");
  const [invitedVendorIds, setInvitedVendorIds] = useState([]);

  // Toast
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);
  function showToast(msg) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2400);
  }

  // ── Load reference data ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ArcApi.listRootCategories().catch(() => null),
      ArcApi.listAccessibleHotels().catch(() => null),
      getUnits().catch(() => null),
    ]).then(([catRes, hotelRes, unitRes]) => {
      if (cancelled) return;
      setCategories(catRes?.data?.categories || []);
      setHotels(hotelRes?.data?.hotels || []);
      setUnits(unitRes?.data || []);
    });
    return () => { cancelled = true; };
  }, []);

  // Sub-cats + variants + vendors load on category change. Departments are NOT
  // category-driven — they come from the user's mappings in the selected hotel
  // (see the hotel effect below).
  useEffect(() => {
    if (!categoryId) {
      setSubCats([]); setVariants([]);
      return;
    }
    let cancelled = false;
    ArcApi.getSubCategories(categoryId)
      .then((subRes) => { if (!cancelled) setSubCats(subRes?.data?.sub_categories || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [categoryId]);

  // Departments = every department the user is mapped to in the SELECTED HOTEL
  // (the department scopes who can raise MRs against this ARC). Independent of
  // the category. Auto-selects when there's exactly one; clears a stale pick
  // when the hotel changes.
  useEffect(() => {
    if (!hotelId) { setDepartments([]); setDepartmentId(null); return; }
    let cancelled = false;
    ArcApi.getDepartmentsForHotel({ hotel_id: hotelId })
      .then((res) => {
        if (cancelled) return;
        const depts = res?.data?.departments || [];
        setDepartments(depts);
        if (depts.length === 1) setDepartmentId(depts[0].id);
        else setDepartmentId((prev) => (depts.some((d) => d.id === prev) ? prev : null));
      })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, [hotelId]);

  // Debounce the item search so each keystroke doesn't hit the server.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedItemSearch(itemSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [itemSearch]);

  // Server-side paginated catalogue load. page 1 REPLACES the list (new query);
  // later pages APPEND ("Load more"). seq guards against out-of-order responses.
  const loadVariants = useCallback(async (page) => {
    if (!categoryId) { setVariants([]); setVariantsTotal(0); return; }
    const seq = ++varSeq.current;
    setLoadingVariants(true);
    try {
      const res = await ArcApi.searchVariants({
        category_id: categoryId,
        sub_category_ids: itemSubCat ? [Number(itemSubCat)] : [],
        q: debouncedItemSearch || null,
        page,
        limit: 30,
      });
      if (seq !== varSeq.current) return;
      const d = res?.data || {};
      const rows = Array.isArray(d.variants) ? d.variants : [];
      setVariants((prev) => (page === 1 ? rows : [...prev, ...rows]));
      setVariantsTotal(Number(d.total) || 0);
      setItemPage(page);
    } catch (_) {
      if (seq === varSeq.current && page === 1) { setVariants([]); setVariantsTotal(0); }
    } finally {
      if (seq === varSeq.current) setLoadingVariants(false);
    }
  }, [categoryId, itemSubCat, debouncedItemSearch]);

  // Reset to page 1 whenever the query (category / sub-category / search) changes.
  useEffect(() => { loadVariants(1); }, [loadVariants]);

  useEffect(() => {
    if (!categoryId || !hotelId) { setVendors([]); return; }
    let cancelled = false;
    ArcApi.listEligibleVendors({ category_id: categoryId, hotel_id: hotelId })
      .then((res) => { if (!cancelled) setVendors(res?.data?.vendors || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [categoryId, hotelId]);

  // ── Derived state ───────────────────────────────────────────────────
  const selectedHotel = useMemo(() => hotels.find((h) => h.id === hotelId), [hotels, hotelId]);
  const selectedCategoryTitle = useMemo(() => categories.find((c) => c.id === categoryId)?.title || categoryTitle, [categories, categoryId, categoryTitle]);

  function variantById(id) { return variants.find((v) => v.id === id) || selectedMeta[id] || { id, name: `Variant #${id}`, slug: "", uom: "—" }; }
  function vendorById(id)  { return vendors.find((v) => v.id === id) || null; }

  function itemTotalWeight(iid) {
    return (clausesByItem[iid] || []).reduce((s, c) => s + (Number(c.weight) || 0), 0);
  }
  function itemWeightStatus(iid) {
    const t = itemTotalWeight(iid);
    if (t === 100) return "ok";
    if (t > 100) return "over";
    return "under";
  }
  function itemClauseValid(iid) {
    const cls = clausesByItem[iid] || [];
    if (!cls.length) return false;
    if (itemTotalWeight(iid) !== 100) return false;
    if (cls.some((c) => !c.text)) return false;
    if (!Number(minPassByItem[iid])) return false;
    return true;
  }

  const canNext = useMemo(() => {
    if (step === 1) return !!title && !!categoryId && !!type;
    if (step === 2) return !!hotelId && !!departmentId;
    if (step === 3)
      return selectedItemIds.length > 0
        && selectedItemIds.every((id) => Number(itemQtys[id]) > 0 && !!(itemUoms[id] || "").trim() && (itemSpecs[id] || "").trim().length > 0);
    if (step === 4) return !!submissionStart && !!submissionEnd && !!contractStart && !!contractEnd;
    if (step === 5) {
      if (eligibility === "invitation" && invitedVendorIds.length === 0) return false;
      if (techRequired) return selectedItemIds.every(itemClauseValid);
      return true;
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, title, categoryId, type, hotelId, departmentId, selectedItemIds, itemQtys, itemUoms, itemSpecs, submissionStart, submissionEnd, contractStart, contractEnd, eligibility, invitedVendorIds, techRequired, clausesByItem, minPassByItem]);

  function goToStep(s) { if (s <= step) setStep(s); }
  function nextStep() { if (canNext && step < 6) setStep((s) => s + 1); }
  function backStep() { if (step > 1) setStep((s) => s - 1); }

  // ── Item / clause / vendor mutators ────────────────────────────────
  function pickCategory(c) {
    if (categoryId === c.id) return;
    setCategoryId(c.id);
    setCategoryTitle(c.title || "");
    setSelectedSubCats([]);
    setSelectedItemIds([]);
    setItemSpecs({}); setItemQtys({}); setItemUoms({});
    setClausesByItem({}); setMinPassByItem({});
  }
  function pickType(t) {
    if (type === t) return;
    setType(t);
    setSelectedItemIds([]);
  }
  function toggleSubCat(id) {
    setSelectedSubCats((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }
  function toggleItem(id, meta) {
    setSelectedItemIds((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      // Seed per-item state
      setItemSpecs((sp)   => sp[id] ? sp : { ...sp, [id]: "" });
      setItemQtys((q)     => q[id]  ? q  : { ...q,  [id]: "" });
      setItemUoms((u)     => u[id]  ? u  : { ...u,  [id]: "" });
      setClausesByItem((cl)  => cl[id]  ? cl  : { ...cl,  [id]: [] });
      setMinPassByItem((mp)  => mp[id]  ? mp  : { ...mp,  [id]: 65 });
      // Remember enough to display this item after it scrolls out of the
      // current catalogue page (Selected panel, tech-eval step, summary).
      if (meta) setSelectedMeta((m) => (m[id] ? m : { ...m, [id]: { id, name: meta.name, slug: meta.slug, uom: meta.uom ?? null } }));
      return [...s, id];
    });
  }
  function toggleVendor(id) {
    setInvitedVendorIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }
  function addClause(iid) {
    setClausesByItem((cl) => ({
      ...cl,
      [iid]: [...(cl[iid] || []), { text: "", weight: 20, type: "spec", file: "", mandatory: false }],
    }));
  }
  function removeClause(iid, idx) {
    setClausesByItem((cl) => ({
      ...cl,
      [iid]: (cl[iid] || []).filter((_, i) => i !== idx),
    }));
  }
  function updateClause(iid, idx, patch) {
    setClausesByItem((cl) => ({
      ...cl,
      [iid]: (cl[iid] || []).map((c, i) => i === idx ? { ...c, ...patch } : c),
    }));
  }

  // ── Submit ──────────────────────────────────────────────────────────
  async function submit() {
    if (busy) return; // H8 — guard against double-submit while a call is in flight
    setBusy(true); setError(null);
    try {
      const items = selectedItemIds.map((id) => ({
        product_variant_id: id,
        spec_text:          itemSpecs[id] || "",
        indicative_qty:     Number(itemQtys[id]) || 0,
        uom:                itemUoms[id] || null,
      }));
      const payload = {
        title,
        description: internalRef ? `Internal ref: ${internalRef}` : "",
        category_id: categoryId,
        sub_category_ids: selectedSubCats,
        hotel_id: hotelId,
        department_id: departmentId,
        // No process_id — ARC approval routes via the committee/hierarchy
        // model, so the backend stores process_id as NULL (audit H5).
        submission_start_at: submissionStart,
        submission_end_at:   submissionEnd,
        contract_start_at:   contractStart,
        contract_end_at:     contractEnd,
        eligibility_type:    eligibility,
        technical_response_required: techRequired,
        sample_required:     samplesRequired,
        escalation_clause_json: {
          type: escalation,
          cap_pct: Number(escalationCap) || null,
        },
        payment_terms_expected: paymentTerms,
        delivery_expected:      deliveryTerms,
        penalty_clause:         penalty,
        items,
        invited_vendor_ids:     eligibility === "invitation" ? invitedVendorIds : [],
      };
      // H8 — if a previous attempt already created the draft, resume it
      // instead of creating another (avoids orphaned/duplicate drafts).
      let arcId = draftArcRef.current;
      let createdItems = [];
      if (!arcId) {
        const res = await ArcApi.createDraft(payload);
        const arc = res?.data?.arc || res?.data?.data?.arc;
        arcId = arc?.id;
        if (!arcId) throw new Error("Could not create draft");
        draftArcRef.current = arcId;
        createdItems = res?.data?.items || res?.data?.data?.items || [];
      }

      // H4 — persist the per-item technical evaluation config the wizard
      // collected (clauses + weights + min passing score) so the qualification
      // gate actually uses it. Keyed by product_variant_id → created ARC item.
      if (techRequired && createdItems.length) {
        const itemIdByVariant = {};
        for (const it of createdItems) itemIdByVariant[it.product_variant_id] = it.id;
        for (const vid of selectedItemIds) {
          const arcItemId = itemIdByVariant[vid];
          const cls = clausesByItem[vid] || [];
          if (!arcItemId || cls.length === 0) continue;
          await ArcApi.setupTechEval(arcItemId, {
            minimum_passing_score: minPassByItem[vid] ?? 65,
            clauses: cls.map((c) => ({
              clause_text: c.text,
              weightage: Number(c.weight) || 0,
              clause_type: c.type || null,
              is_mandatory: !!c.mandatory,
            })),
          });
        }
      }

      const pubRes = await ArcApi.publish(arcId);
      // M3 — report the truth from the server (count of vendors actually
      // tagged + notified), not a client-side guess.
      const vendorCount =
        pubRes?.data?.vendor_count ?? pubRes?.data?.data?.vendor_count ?? 0;
      draftArcRef.current = null; // fully published — clear the resume handle
      showToast(`Floated · ${vendorCount} vendor(s) invited & notified`);
      setTimeout(() => router.push("/dashboard/buyer/rate-contracts/all"), 1100);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Could not publish");
    } finally { setBusy(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <main className="main-body" style={{ paddingBottom: 108 }}>
      <div>
        <h1 className="page-h1">Create Rate Contract</h1>
        <p className="page-sub">Single-BU ARC. Category drives the catalogue; tech eval is configured per item with explicit weights and a minimum passing score.</p>
      </div>

      {/* Horizontal stepper */}
      <nav className="h-stepper" aria-label="Lifecycle progress">
        {STEPS.map((s, i) => (
          <span key={s.key} style={{ display: "contents" }}>
            <button
              type="button"
              className={[
                "hs-step",
                step === i + 1 ? "is-active" : "",
                step > i + 1 ? "is-done" : "",
                step < i + 1 ? "is-locked" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => goToStep(i + 1)}
            >
              <div className="hs-num"><span className="n">{i + 1}</span></div>
              <div className="hs-lab">
                <span className="l">{s.label}</span>
                <span className="m">{s.meta}</span>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`hs-divider ${step > i + 1 ? "is-done" : ""}`} />
            )}
          </span>
        ))}
      </nav>

      {/* ═════ STEP 1 — Basics ═════ */}
      {step === 1 && (
        <section className="section-card">
          <div className="section-head">
            <div className="h-left">
              <div className="ic"><FileIcon /></div>
              <div><h2>Basics</h2><div className="h-sub">Title, category, type</div></div>
            </div>
          </div>
          <div className="section-body">
            <div className="form-grid">
              <div>
                <label className="label">Contract title <span className="req">*</span></label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. F&B Staples · BAB · Q3 2026" />
              </div>
              <div>
                <label className="label">Internal reference</label>
                <input className="input mono" value={internalRef} onChange={(e) => setInternalRef(e.target.value)} placeholder="e.g. FY26-ARC-BAB-FB-01" />
              </div>
            </div>

            <label className="label" style={{ marginTop: 18 }}>Category <span className="req">*</span></label>
            {categories.length === 0 ? (
              <div className="guide"><div className="g-ic"><InfoIcon /></div><div>No categories available yet.</div></div>
            ) : (
              <div className="cat-grid">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className={`cat-card ${categoryId === c.id ? "selected" : ""}`}
                    onClick={() => pickCategory(c)}
                  >
                    <div className="cc-ic"><BoxIcon size={20} /></div>
                    <div>
                      <div className="cc-name">{c.title}</div>
                      <div className="cc-meta">tap to load catalogue</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="label" style={{ marginTop: 18 }}>Type <span className="req">*</span></label>
            <div className="type-row">
              <div className={`cat-card ${type === "product" ? "selected" : ""}`} onClick={() => pickType("product")}>
                <div className="cc-ic"><BoxIcon size={20} /></div>
                <div><div className="cc-name">Products</div><div className="cc-meta">Physical goods · released POs</div></div>
              </div>
              <div className={`cat-card ${type === "service" ? "selected" : ""}`} onClick={() => pickType("service")}>
                <div className="cc-ic"><ServiceIcon size={20} /></div>
                <div><div className="cc-name">Services</div><div className="cc-meta">Recurring services · AMC, maintenance</div></div>
              </div>
            </div>

            {categoryId && subCats.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <label className="label">Sub-categories · narrow the catalogue (optional)</label>
                <div className="sub-chips">
                  {subCats.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`sub-chip ${selectedSubCats.includes(s.id) ? "selected" : ""}`}
                      onClick={() => toggleSubCat(s.id)}
                    >{s.title}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═════ STEP 2 — Business unit ═════ */}
      {step === 2 && (
        <section className="section-card">
          <div className="section-head">
            <div className="h-left">
              <div className="ic"><BuildingIcon /></div>
              <div><h2>Business unit</h2><div className="h-sub">Pick the single property</div></div>
            </div>
          </div>
          <div className="section-body">
            <div className="guide" style={{ marginBottom: 14 }}>
              <div className="g-ic"><InfoIcon /></div>
              <div>Multi-BU contracts are <strong>Phase 2</strong>. Every ARC is currently single-BU at creation.</div>
            </div>
            {hotels.length === 0 ? (
              <div className="guide"><div className="g-ic"><InfoIcon /></div><div>No accessible hotels — check your hospitality access.</div></div>
            ) : (
              <div className="cat-grid">
                {hotels.map((b) => (
                  <div key={b.id}
                       className={`cat-card ${hotelId === b.id ? "selected" : ""}`}
                       onClick={() => setHotelId(b.id)}>
                    <div className="cc-ic"><BuildingIcon size={20} /></div>
                    <div>
                      <div className="cc-name"><span className="mono fw-700">{buCodeFor(b.name)}</span> · {b.name}</div>
                      <div className="cc-meta">
                        {b.city || "—"}
                        {b.keys != null && <> · <span className="mono fw-600">{b.keys}</span> keys</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {departments.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <label className="label">Department · scopes who can raise MRs against this ARC</label>
                <div className="sub-chips">
                  {departments.map((d) => (
                    <button key={d.id}
                            type="button"
                            className={`sub-chip ${departmentId === d.id ? "selected" : ""}`}
                            onClick={() => setDepartmentId(d.id)}>{d.title}</button>
                  ))}
                </div>
              </div>
            )}
            {departments.length === 1 && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--fg-3)" }}>
                Department auto-set to <strong style={{ color: "var(--fg)" }}>{departments[0].title}</strong> (the only one you&apos;re mapped to in this business unit).
              </div>
            )}
            {departments.length === 0 && hotelId && (
              <div className="guide" style={{ marginTop: 12 }}>
                <div className="g-ic"><InfoIcon /></div>
                <div>You&apos;re not mapped to any department in this business unit. Ask an admin to grant you department access for it.</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═════ STEP 3 — Items ═════ */}
      {step === 3 && (
        <section className="section-card">
          <div className="section-head">
            <div className="h-left">
              <div className="ic"><BoxIcon /></div>
              <div>
                <h2>Items</h2>
                <div className="h-sub">
                  From <strong>{selectedCategoryTitle}</strong> · {type === "product" ? "Products" : "Services"}
                  {" · "}<strong className="mono">{selectedItemIds.length}</strong> selected
                </div>
              </div>
            </div>
          </div>
          <div className="section-body">
            {/* Selected items — pinned + configurable; persists across search/pages. */}
            {selectedItemIds.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="label" style={{ marginBottom: 8 }}>Selected items · configure each</div>
                {selectedItemIds.map((id) => {
                  const it = variantById(id);
                  return (
                    <div key={id} style={{ marginBottom: 8 }}>
                      <div className="item-row selected" onClick={() => toggleItem(id)}>
                        <div className="ir-check" />
                        <div className="ir-meta">
                          <div className="ir-name">{it.name}</div>
                          <div className="ir-sub"><span className="mono">{it.slug}</span></div>
                        </div>
                        <div className="ir-tag">{type === "service" ? "Service" : "Product"}</div>
                      </div>
                      <div className="item-detail">
                        <div className="form-grid cols-3">
                          <div>
                            <label className="label">Indicative quantity <span className="req">*</span></label>
                            <div className="input-group" style={{ maxWidth: 200 }}>
                              <input type="number" className="input input-num" value={itemQtys[id] ?? ""} onChange={(e) => setItemQtys((m) => ({ ...m, [id]: e.target.value }))} placeholder="0" min={0} />
                              <div className="suffix">{itemUoms[id] || "unit"}</div>
                            </div>
                          </div>
                          <div>
                            <label className="label">Unit of measure <span className="req">*</span></label>
                            <select className="select" style={{ maxWidth: 200 }} value={itemUoms[id] ?? ""} onChange={(e) => setItemUoms((m) => ({ ...m, [id]: e.target.value }))}>
                              <option value="">Select unit…</option>
                              {units.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                          </div>
                          <div />
                        </div>
                        <label className="label" style={{ marginTop: 11 }}>Specification <span className="req">*</span></label>
                        <textarea className="textarea" value={itemSpecs[id] ?? ""} onChange={(e) => setItemSpecs((m) => ({ ...m, [id]: e.target.value }))} placeholder="Describe the spec, grade, quality requirements…" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Browse toolbar — server search (debounced) + sub-category filter + count. */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              <div className="search-input" style={{ flex: 1, minWidth: 220 }}>
                <SearchIcon />
                <input className="input" placeholder={`Search ${selectedCategoryTitle || "catalogue"}…`} value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
              </div>
              {subCats.length > 0 && (
                <select className="select" style={{ width: 210 }} value={itemSubCat} onChange={(e) => setItemSubCat(e.target.value)}>
                  <option value="">All sub-categories</option>
                  {subCats.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              )}
              <span style={{ fontSize: 12.5, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
                <span className="mono fw-600">{variantsTotal.toLocaleString("en-IN")}</span> item{variantsTotal === 1 ? "" : "s"}
              </span>
            </div>

            {/* Browse list — compact, scrollable (fixed viewport, scales to thousands). */}
            <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
              {variants.map((it) => {
                const picked = selectedItemIds.includes(it.id);
                return (
                  <div key={it.id} className={`item-row ${picked ? "selected" : ""}`} onClick={() => toggleItem(it.id, it)} style={{ cursor: "pointer" }}>
                    <div className="ir-check" />
                    <div className="ir-meta">
                      <div className="ir-name">{it.name}</div>
                      <div className="ir-sub"><span className="mono">{it.slug}</span></div>
                    </div>
                    <div className="ir-tag">{type === "service" ? "Service" : "Product"}</div>
                  </div>
                );
              })}
              {loadingVariants && variants.length === 0 && (
                <div style={{ padding: 22, textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>Loading items…</div>
              )}
              {!loadingVariants && variants.length === 0 && (
                <div className="empty-state" style={{ padding: "32px 20px" }}>
                  <div className="ic"><BoxIcon size={22} /></div>
                  <h2>No items match</h2>
                  <p>{debouncedItemSearch || itemSubCat ? "Try a different search or sub-category." : "This category has no items in the catalogue yet."}</p>
                </div>
              )}
            </div>

            {/* Load more (append next page). */}
            {variants.length < variantsTotal && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-sm" disabled={loadingVariants} onClick={() => loadVariants(itemPage + 1)}>
                  {loadingVariants ? "Loading…" : `Load more — showing ${variants.length} of ${variantsTotal.toLocaleString("en-IN")}`}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═════ STEP 4 — Terms ═════ */}
      {step === 4 && (
        <section className="section-card">
          <div className="section-head">
            <div className="h-left">
              <div className="ic"><ClockIcon /></div>
              <div><h2>Tender dates &amp; commercial terms</h2></div>
            </div>
          </div>
          <div className="section-body">
            {/* ── Tender timeline ── */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", marginBottom: 12 }}>Tender timeline</div>
            <div className="form-grid">
              <div><label className="label">Submission start <span className="req">*</span></label><input type="date" className="input" value={submissionStart} onChange={(e) => setSubmissionStart(e.target.value)} /></div>
              <div><label className="label">Submission end <span className="req">*</span></label><input type="date" className="input" value={submissionEnd} onChange={(e) => setSubmissionEnd(e.target.value)} /></div>
              <div><label className="label">Contract start <span className="req">*</span></label><input type="date" className="input" value={contractStart} onChange={(e) => setContractStart(e.target.value)} /></div>
              <div><label className="label">Contract end <span className="req">*</span></label><input type="date" className="input" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} /></div>
            </div>

            {/* ── Commercial terms ── */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", marginBottom: 12 }}>Commercial terms</div>
            <div className="form-grid">
              <div>
                <label className="label">Price escalation</label>
                <select className="select" value={escalation} onChange={(e) => setEscalation(e.target.value)}>
                  <option value="none">None · flat rates</option>
                  <option value="annual">Annual % escalation</option>
                  <option value="cpi">CPI-linked</option>
                  <option value="tariff">Tariff-linked</option>
                </select>
              </div>
              <div>
                <label className="label">Escalation cap {escalation !== "none" && <span className="req">*</span>}</label>
                <div className="input-group">
                  <input type="number" className="input input-num" value={escalation === "none" ? "" : escalationCap} onChange={(e) => setEscalationCap(e.target.value)} placeholder={escalation === "none" ? "Not applicable" : "4"} min={0} disabled={escalation === "none"} />
                  <div className="suffix">%</div>
                </div>
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div><label className="label">Payment terms</label><input className="input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" /></div>
              <div><label className="label">Delivery / fulfilment terms</label><input className="input" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="e.g. Within 21 days of each released PO" /></div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="label">Penalty / LD clause</label>
              <textarea className="textarea" value={penalty} onChange={(e) => setPenalty(e.target.value)} placeholder="e.g. 1.5% LD per week of delay, capped at 7.5% of PO value" />
            </div>
            <label className="cbx" style={{ marginTop: 18 }}>
              <input type="checkbox" checked={samplesRequired} onChange={(e) => setSamplesRequired(e.target.checked)} />
              <span className="cbx-box" />
              <span>Require sample submission before tech evaluation</span>
            </label>
          </div>
        </section>
      )}

      {/* ═════ STEP 5 — Tech & vendors ═════ */}
      {step === 5 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="te-toggle">
            <label className="cbx" style={{ margin: 0 }}>
              <input type="checkbox" checked={techRequired} onChange={(e) => setTechRequired(e.target.checked)} />
              <span className="cbx-box" />
            </label>
            <div className="te-toggle-meta">
              <div className="ttm-name">Technical evaluation required</div>
              <div className="ttm-desc">When ON, vendors are scored per item using clauses you define below. Auto-qualified if their score ≥ the item's minimum passing score.</div>
            </div>
          </div>

          {techRequired && (
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><ChecklistIcon /></div>
                  <div>
                    <h2>Item-level technical evaluation</h2>
                    <div className="h-sub">Each item carries its own clauses, weights and minimum passing score. Vendor qualification is per (vendor × item).</div>
                  </div>
                </div>
              </div>
              <div className="section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="guide">
                  <div className="g-ic"><InfoIcon /></div>
                  <div>
                    <strong>How scoring works.</strong>{" "}
                    For each item below, add the technical clauses vendors must respond to. Each clause has a <strong>weight</strong> (total must equal 100). Evaluators assign marks and the system auto-computes a per-item percentage score — anyone scoring ≥ the item's <strong>minimum passing score</strong> auto-qualifies for that item.{" "}
                    Mark a clause <strong>Mandatory</strong> to make it a hard pass/fail gate: failing (or not yet judging) any mandatory clause disqualifies the vendor for that item <strong>regardless of the weighted score</strong>. Mandatory clauses still carry their weight and count toward the 100.
                  </div>
                </div>

                {selectedItemIds.length === 0 && (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <div className="ic"><BoxIcon size={20} /></div>
                    <h2>Pick items first</h2>
                    <p>Go back to step 3 to select items before configuring tech eval.</p>
                  </div>
                )}

                {selectedItemIds.map((iid) => {
                  const it = variantById(iid);
                  const status = itemWeightStatus(iid);
                  const valid = itemClauseValid(iid);
                  const cls = clausesByItem[iid] || [];
                  const total = itemTotalWeight(iid);
                  return (
                    <div key={iid} className={`te-item-card ${valid ? "complete" : status === "over" ? "error" : ""}`}>
                      <div className="te-item-head">
                        <div className="te-h-meta">
                          <div className="te-h-name">
                            <span>{it.name}</span>
                            <span className="te-h-num">{it.slug}</span>
                          </div>
                          <div className="te-h-sub">
                            <span className="mono fw-600" style={{ color: "var(--fg)" }}>{cls.length}</span> clause{cls.length === 1 ? "" : "s"}
                            <span style={{ color: "var(--fg-4)" }}>·</span>
                            <span>per {itemUoms[iid] || "unit"}</span>
                          </div>
                        </div>
                        <div className="te-min-pass">
                          <span className="lbl">Min pass</span>
                          <div className="input-group" style={{ maxWidth: 110 }}>
                            <input type="number" className="input input-num" value={minPassByItem[iid] ?? ""} onChange={(e) => setMinPassByItem((m) => ({ ...m, [iid]: Number(e.target.value) || 0 }))} min={0} max={100} placeholder="65" />
                            <div className="suffix">%</div>
                          </div>
                        </div>
                        <div>
                          {valid && <span className="te-status complete"><CheckIcon size={11} /> Configured</span>}
                          {!valid && status === "over" && <span className="te-status error"><Icon size={11}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon> Weights over 100</span>}
                          {!valid && status !== "over" && <span className="te-status warn">Needs clauses · weights = 100</span>}
                        </div>
                      </div>

                      <div className="weight-bar">
                        <span>Clause weights</span>
                        <div className="wb-track">
                          <div className={`wb-fill ${status}`} style={{ width: Math.min(100, total) + "%" }} />
                        </div>
                        <span className={`wb-val ${status}`}>{total} / 100</span>
                        {status === "over"  && <span style={{ color: "var(--danger)",  fontWeight: 600 }}>— reduce by <span className="mono">{total - 100}</span></span>}
                        {status === "under" && <span style={{ color: "var(--warn)",    fontWeight: 600 }}>— add <span className="mono">{100 - total}</span> more</span>}
                        {status === "ok"    && <span style={{ color: "var(--success)", fontWeight: 600 }}>✓ Balanced</span>}
                      </div>

                      <div className="te-clauses">
                        {cls.map((cl, idx) => (
                          <div key={idx}>
                            <div className="te-clause-row">
                              <div className="tcr-num">{String(idx + 1).padStart(2, "0")}</div>
                              <input className="tcr-text" type="text" value={cl.text} onChange={(e) => updateClause(iid, idx, { text: e.target.value })} placeholder="e.g. BIS / IEC certification provided" />
                              <select className="select" value={cl.type} onChange={(e) => updateClause(iid, idx, { type: e.target.value })} style={{ fontSize: 12, padding: "5px 7px" }}>
                                <option value="doc">Doc / Certification</option>
                                <option value="spec">Technical Spec</option>
                                <option value="commercial">Commercial</option>
                                <option value="sample">Sample</option>
                              </select>
                              <div className="input-group">
                                <input type="number" className="input input-num" value={cl.weight} onChange={(e) => updateClause(iid, idx, { weight: Number(e.target.value) || 0 })} min={0} max={100} placeholder="20" />
                                <div className="suffix">marks</div>
                              </div>
                              <button className="icon-btn" type="button" onClick={() => removeClause(iid, idx)} title="Remove clause">
                                <span style={{ color: "var(--danger)" }}><TrashIcon size={13} /></span>
                              </button>
                              <div className="tcr-bottom">
                                <span className={`clause-type-mini ${cl.type}`}>{cl.type}</span>
                                {cl.mandatory && (
                                  <span className="clause-type-mini" style={{ background: "var(--danger-soft, #fee2e2)", color: "var(--danger, #b91c1c)", fontWeight: 700 }}>
                                    Mandatory · pass/fail gate
                                  </span>
                                )}
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-3)", cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={!!cl.mandatory}
                                    onChange={(e) => updateClause(iid, idx, { mandatory: e.target.checked })}
                                  />
                                  Mandatory (pass/fail gate)
                                </label>
                                <span className="tcr-attach"><PaperclipIcon /> Attach reference document</span>
                                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-4)" }}>Vendors must respond &amp; upload evidence</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="te-add-clause" type="button" onClick={() => addClause(iid)}>
                          <PlusIcon /> Add clause to <span style={{ marginLeft: 4 }}>{it.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vendor eligibility */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic"><ShieldIcon /></div>
                <div><h2>Vendor eligibility</h2></div>
              </div>
            </div>
            <div className="section-body">
              <div className="form-grid">
                <label className="rd">
                  <input type="radio" name="elig" value="open" checked={eligibility === "open"} onChange={() => setEligibility("open")} />
                  <span className="rd-box" />Open to all approved vendors
                </label>
                <label className="rd">
                  <input type="radio" name="elig" value="invitation" checked={eligibility === "invitation"} onChange={() => setEligibility("invitation")} />
                  <span className="rd-box" />Invitation-only
                </label>
              </div>
              {eligibility === "invitation" && (
                <div style={{ marginTop: 14 }}>
                  <label className="label">Invite vendors <span className="req">*</span></label>
                  <div style={{ marginTop: 7 }}>
                    {vendors.length === 0 && (
                      <div className="guide"><div className="g-ic"><InfoIcon /></div><div>No vendors are subscribed to this hotel × category yet.</div></div>
                    )}
                    {vendors.map((v) => {
                      const picked = invitedVendorIds.includes(v.id);
                      return (
                        <div key={v.id} className={`vendor-pick-row ${picked ? "selected" : ""}`} onClick={() => toggleVendor(v.id)}>
                          <div className="vpr-check" />
                          <div className="vpr-info">
                            <div className={`vpr-av ${avClassFor(v.id)}`}>{initialsFor(v.name)}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{v.name}</div>
                              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{v.email || "—"}</div>
                            </div>
                          </div>
                          <div className="vpr-stat"><div className="k">Rating</div><div className="v">—</div></div>
                          <div className="vpr-stat"><div className="k">On-time</div><div className="v" style={{ color: "var(--success)" }}>—</div></div>
                          <div className="vpr-stat"><div className="k">Past 3y</div><div className="v">—</div></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═════ STEP 6 — Review ═════ */}
      {step === 6 && (
        <section className="section-card">
          <div className="section-head">
            <div className="h-left">
              <div className="ic"><CheckIcon /></div>
              <div><h2>Review &amp; publish</h2></div>
            </div>
          </div>
          <div className="section-body">
            <div className="kv-grid">
              <div className="k">Title</div><div className="v">{title}</div>
              <div className="k">Category</div><div className="v">{selectedCategoryTitle} · {type === "service" ? "Services" : "Products"}</div>
              <div className="k">Business unit</div><div className="v"><span className="mono fw-600">{buCodeFor(selectedHotel?.name)}</span> {selectedHotel?.name}</div>
              <div className="k">Items</div><div className="v"><span className="em mono">{selectedItemIds.length}</span> picked</div>
              <div className="k">Tender</div><div className="v"><span className="mono">{submissionStart}</span> → <span className="mono">{submissionEnd}</span></div>
              <div className="k">Term</div><div className="v"><span className="mono">{contractStart}</span> → <span className="mono">{contractEnd}</span></div>
              <div className="k">Eligibility</div><div className="v">{eligibility === "open" ? "Open · all approved vendors" : `${invitedVendorIds.length} invited`}</div>
              <div className="k">Tech eval</div><div className="v">{techRequired ? `Required · ${selectedItemIds.length} item(s) configured` : "Not required"}</div>
            </div>

            {techRequired && selectedItemIds.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div className="section-label">Tech eval summary per item</div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                  {selectedItemIds.map((iid) => {
                    const it = variantById(iid);
                    const valid = itemClauseValid(iid);
                    return (
                      <div key={iid} style={{ padding: "9px 13px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <span className="fw-600">{it.name}</span>
                        <span style={{ color: "var(--fg-3)" }}>·</span>
                        <span><span className="mono fw-600">{(clausesByItem[iid] || []).length}</span> clauses · weights <span className="mono fw-600">{itemTotalWeight(iid)}</span>/100</span>
                        <span style={{ color: "var(--fg-3)" }}>·</span>
                        <span>min pass <span className="mono fw-600">{(minPassByItem[iid] || 0)}%</span></span>
                        {valid
                          ? <span style={{ color: "var(--success)", fontWeight: 600, marginLeft: "auto" }}>✓ Configured</span>
                          : <span style={{ color: "var(--warn)",    fontWeight: 600, marginLeft: "auto" }}>⚠ Incomplete</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="guide" style={{ marginTop: 14 }}>
                <div className="g-ic"><InfoIcon /></div>
                <div style={{ color: "var(--danger)" }}>{error}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {toast && (
        <div className="arc-toast"><span className="t-ic">✓</span><span>{toast}</span></div>
      )}

      {/* Sticky bottom action dock */}
      <div className="action-dock">
        <div className="inner">
          <div className="left">
            <span className="fs-13 text-fg-2">
              <span className="fw-600 text-fg">Step {step} of 6</span> · {STEPS[step - 1].label}
            </span>
          </div>
          <div className="right">
            {step > 1 && (
              <button className="btn btn-ghost btn-sm" onClick={backStep}>Back</button>
            )}
            {step < 6 && (
              <button className="btn btn-blue" disabled={!canNext} onClick={nextStep}>
                Continue <ArrowRightIcon />
              </button>
            )}
            {step === 6 && (
              <button className="btn btn-success" disabled={busy} onClick={submit}>
                <SendIcon /> {busy ? "Publishing…" : "Publish & float"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
