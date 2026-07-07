// Buyer · Create Rate Contract — 6-step wizard.
// Faithful port of prototypes/arc_ui/buyer-create.html. DOM structure and
// class names mirror the prototype 1:1 so the existing arc_v2.css (section
// cards, horizontal stepper, cat-grid, item-row, te-clause-row, weight-bar,
// vendor-pick-row, action-dock) styles every panel directly.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";
import { getUnits, addCustomUnit } from "@/services/units";

// ──────────────────────────────────────────────────────────────────────────
//  Constants & helpers
// ──────────────────────────────────────────────────────────────────────────

// Sr 22 — abbreviation → full-name map for the 18 seeded default units
// (tbl_units has no full-name column). Custom/unknown units fall back to
// showing their own name as the tooltip.
const UOM_FULL = {
  pcs: "Pieces", kg: "Kilogram", g: "Gram", tonne: "Metric tonne",
  L: "Litre", mL: "Millilitre", m: "Metre", cm: "Centimetre", mm: "Millimetre",
  "m²": "Square metre", "m³": "Cubic metre", pack: "Pack", set: "Set",
  box: "Box", roll: "Roll", bottle: "Bottle", hr: "Hour", day: "Day",
};
const uomFull = (name) => UOM_FULL[name] || name;

// Sr 9 — one-line meaning for each price-escalation type, shown under the
// selector so buyers can choose the right basis without external guidance.
const ESCALATION_HELP = {
  none:   "No escalation — rates stay firm and fixed for the entire contract term.",
  annual: "Rates rise by a fixed percentage on each contract anniversary, up to the cap.",
  cpi:    "Rates are revised in line with movement in the agreed Consumer Price Index (CPI), up to the cap and subject to your approval.",
  tariff: "Rates track a published tariff / benchmark rate, up to the cap and subject to your approval.",
};

const STEPS = [
  { key: "basics",    label: "Basics",         meta: "Category · type" },
  { key: "bu",        label: "Business unit",  meta: "Single-BU scope" },
  { key: "items",     label: "Items",          meta: "Pick from catalogue" },
  { key: "terms",     label: "Terms",          meta: "Dates · escalation" },
  { key: "tech",      label: "Tech & vendors", meta: "Clauses · eligibility" },
  { key: "review",    label: "Review",         meta: "Submit for approval" },
];

const TODAY = new Date();
const isoOffset = (d) => {
  const dt = new Date(TODAY);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};

// A stored timestamp → the "YYYY-MM-DDTHH:mm" a <input type="datetime-local">
// expects. The columns are `timestamp without time zone`, so we treat the stored
// value as wall-clock and slice it directly (normalising a space or trailing Z)
// rather than going through Date(), which would shift it by the local TZ offset.
// Empty string when absent so the input renders cleanly.
const isoDateTime = (ts) => (ts ? String(ts).replace(" ", "T").slice(0, 16) : "");

// Infer the "furthest-progressed" step for a resumed draft (no stored
// current_step). Open the highest step that has data — vendors/eligibility →
// step 5, then items → 3, then dates → 4, then BU → 2, else 1; and step 6
// (Review) once the draft is complete enough to publish (BU + items + dates).
function deriveResumeStep(arc, items = [], invitations = []) {
  const hasBU      = !!arc.hotel_id && !!arc.department_id;
  const hasItems   = items.length > 0;
  const hasDates   = !!arc.submission_start_at && !!arc.submission_end_at
                     && !!arc.contract_start_at && !!arc.contract_end_at;
  const hasVendors = invitations.length > 0;
  // Fully-formed draft → land on Review so the user can publish straightaway.
  if (hasBU && hasItems && hasDates) return 6;
  if (hasVendors) return 5;
  if (hasItems)   return 3;
  if (hasDates)   return 4;
  if (hasBU)      return 2;
  return 1;
}

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

// Sr 44/45/46 — shared sanitiser for the two tech-eval numeric inputs (item
// min-pass % and clause weight "marks"). Deleting the field must leave it
// BLANK — never coerced to 0 the way the old `Number(e.target.value) || 0`
// handler did — so `""` passes straight through. A malformed/typed value like
// "040" has its leading zero collapsed, and anything above 100 is clamped
// rather than silently accepted (the backend enforces the same 1–100 range —
// see setupTechEval in arcEvaluationController.js — as the authoritative
// backstop for a resumed draft that jumps straight to Review/Submit).
function sanitizePct(raw) {
  const s = String(raw ?? "");
  if (s === "") return "";
  const digitsOnly = s.replace(/[^\d]/g, "");
  if (digitsOnly === "") return "";
  const normalised = digitsOnly.replace(/^0+(?=\d)/, "");
  const n = Number(normalised);
  if (!Number.isFinite(n)) return "";
  return Math.min(100, n);
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
const AlertIcon      = (p) => <Icon {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>;
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
  // Track C — monotonic "furthest reached" step. It only ever increases, so a
  // step the user has reached stays unlocked/clickable even after navigating
  // backward; forward progress past it on a fresh wizard still needs per-step
  // validation (nextStep gates on canNext). A resumed draft sets this to the
  // furthest hydrated stage so every reached step is reachable.
  const [furthestStep, setFurthestStep] = useState(1);
  const [busy, setBusy] = useState(false);
  // Resume (?c=<id>) — true while the draft is being fetched + hydrated.
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState(null);
  // H8 — remember a draft already created this session so a retry after a
  // mid-flight failure resumes (re-publishes) instead of minting a duplicate.
  const draftArcRef = useRef(null);
  // Sr 2 — keep a ref of the live step for the popstate handler (avoids stale closure).
  const stepRef = useRef(1);
  useEffect(() => { stepRef.current = step; }, [step]);

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
  // Sr 5 — ids whose selected-item detail (qty/UOM/spec) is minimised. Default
  // = expanded (id absent) so a newly-selected item shows its required fields.
  const [collapsedItemIds, setCollapsedItemIds] = useState([]);
  const toggleCollapse = (id) =>
    setCollapsedItemIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  // Sr 21 — which selected item's UOM select has the inline "add custom unit" row open.
  const [addingUomFor, setAddingUomFor] = useState(null);
  const [newUomName, setNewUomName] = useState("");
  const varSeq = useRef(0);

  // Step 4 — Terms
  const [submissionStart, setSubmissionStart] = useState(isoOffset(2));
  const [submissionEnd, setSubmissionEnd] = useState(isoOffset(12));
  const [contractStart, setContractStart] = useState(isoOffset(20));
  const [contractEnd, setContractEnd] = useState(isoOffset(380));
  const [escalation, setEscalation] = useState("none");
  const [escalationCap, setEscalationCap] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [deliveryTerms, setDeliveryTerms] = useState("Within 2 days of each released PO");
  const [penalty, setPenalty] = useState("1.5% LD per week of delay, capped at 7.5% of PO value");
  const [samplesRequired, setSamplesRequired] = useState(false);

  // Step 5 — Tech eval + vendors. Technical evaluation is configured PER ITEM:
  // techByItem[itemId] toggles whether that product is technically evaluated
  // (default ON when an item is selected). Items left ON need clauses; items
  // turned OFF skip tech entirely and let all vendors compete on price.
  const [techByItem, setTechByItem] = useState({});
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

  // ── Resume a draft (?c=<id>) ────────────────────────────────────────
  // Opening …/create?c=<id> rehydrates EVERY wizard field/selection from the
  // saved draft, unlocks all stages, and auto-opens the furthest-progressed
  // stage (not step 1). draftArcRef is set to the draft id so submitting a
  // resumed draft re-publishes the SAME ARC (PATCH the scalars, then publish) —
  // never mints a duplicate (spec §2.4). The category/hotel-driven effects below
  // react to the ids we set here and load sub-cats / variants / vendors /
  // departments on their own; the departments effect preserves a matching
  // departmentId, so order doesn't matter.
  useEffect(() => {
    if (!router.isReady) return;
    const c = Number(router.query.c);
    if (!c) return;
    let cancelled = false;
    (async () => {
      setResuming(true);
      setError(null);
      try {
        const res = await ArcApi.getContractDetail(c);
        const arc = res?.data?.arc;
        const items = res?.data?.items || [];
        const invitations = res?.data?.invitations || [];
        if (!arc || cancelled) return;
        // Remember the existing ARC so submit() resumes it (no duplicate draft).
        draftArcRef.current = arc.id;

        // ── Step 1 — Basics ──
        setTitle(arc.title || "");
        const desc = arc.description || "";
        setInternalRef(desc.startsWith("Internal ref: ") ? desc.slice(14) : "");
        setCategoryId(arc.category_id || null);
        // categoryTitle is otherwise resolved by selectedCategoryTitle once the
        // categories list loads; seed a placeholder so labels read before then.
        setCategoryTitle("");
        setType(arc.type || "product");
        setSelectedSubCats(Array.isArray(arc.sub_category_ids) ? arc.sub_category_ids : []);

        // ── Step 2 — Business unit ──
        setHotelId(arc.hotel_id || null);
        setDepartmentId(arc.department_id || null);

        // ── Step 3 — Items ──
        const ids = items.map((it) => it.product_variant_id);
        setSelectedItemIds(ids);
        setSelectedMeta(Object.fromEntries(items.map((it) => [it.product_variant_id, {
          id: it.product_variant_id, name: it.variant_name, slug: it.variant_slug, uom: it.uom ?? null,
        }])));
        setItemSpecs(Object.fromEntries(items.map((it) => [it.product_variant_id, it.spec_text || ""])));
        setItemQtys(Object.fromEntries(items.map((it) => [it.product_variant_id, it.indicative_qty != null ? String(it.indicative_qty) : ""])));
        setItemUoms(Object.fromEntries(items.map((it) => [it.product_variant_id, it.uom || ""])));

        // ── Step 4 — Terms ──
        setSubmissionStart(isoDateTime(arc.submission_start_at));
        setSubmissionEnd(isoDateTime(arc.submission_end_at));
        setContractStart(isoDateTime(arc.contract_start_at));
        setContractEnd(isoDateTime(arc.contract_end_at));
        const esc = arc.escalation_clause_json || {};
        setEscalation(esc.type || "none");
        setEscalationCap(esc.cap_pct != null ? String(esc.cap_pct) : "");
        setPaymentTerms(arc.payment_terms_expected || "");
        setDeliveryTerms(arc.delivery_expected || "");
        setPenalty(arc.penalty_clause || "");
        setSamplesRequired(!!arc.sample_required);

        // ── Step 5 — Tech eval (per item) + vendors ──
        // Default every selected item's tech toggle ON (the wizard's rule), then
        // overlay any persisted per-item config from items[].tech_eval.
        const techOn = {};
        const clauseMap = {};
        const minPass = {};
        for (const it of items) {
          const vid = it.product_variant_id;
          const te = it.tech_eval; // { minimum_passing_score, clauses[] } | null
          if (te) {
            techOn[vid] = true;
            minPass[vid] = Number(te.minimum_passing_score) || 0;
            clauseMap[vid] = (te.clauses || []).map((cl) => ({
              text: cl.clause_text || "",
              weight: Number(cl.weightage) || 0,
              type: cl.clause_type || "spec",
              file: "",
              mandatory: !!cl.is_mandatory,
            }));
          } else {
            // No persisted config: ON with empty clauses, unless the draft was
            // saved price-only (technical_response_required === false).
            techOn[vid] = arc.technical_response_required !== false;
            minPass[vid] = 65;
            clauseMap[vid] = [];
          }
        }
        setTechByItem(techOn);
        setClausesByItem(clauseMap);
        setMinPassByItem(minPass);
        setEligibility(arc.eligibility_type || "open");
        setInvitedVendorIds(invitations.map((i) => i.vendor_id));

        // ── Unlock all stages + open the furthest-progressed one ──
        // The draft was fully created once, so every step is reachable: set the
        // high-water mark to 6 (Track C) so all steps stay clickable.
        setFurthestStep(6);
        setStep(deriveResumeStep(arc, items, invitations));
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || "Could not load draft");
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.c]);

  // Sr 2 — hardware/browser Back walks back through wizard steps instead of
  // abandoning the wizard. Prime one extra history frame, then intercept the pop:
  // past step 1 we consume it (decrement + re-arm) and cancel the route change;
  // at step 1 we let the navigation proceed so Back still exits the wizard.
  useEffect(() => {
    if (!router.isReady) return;
    window.history.pushState(null, "");
    router.beforePopState(() => {
      if (stepRef.current > 1) {
        setStep((s) => Math.max(1, s - 1));
        window.history.pushState(null, ""); // re-arm for the next Back press
        return false;                        // cancel the exit
      }
      return true;                           // step 1 → allow leaving
    });
    return () => { router.beforePopState(() => true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

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
    // Sr 23 — don't dump the whole category catalogue on mount; only fetch
    // once the user has an active query (search text or the sub-category
    // browse filter). The selected-items panel is unaffected — it's pinned.
    if (!debouncedItemSearch && !itemSubCat) {
      setVariants([]); setVariantsTotal(0); setLoadingVariants(false); return;
    }
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
      // Sr 7 — dedupe by id (a product with >1 tbl_product_categories row for
      // the same category yields the same variant multiple times from the
      // backend JOIN). Runs on both the page-1 replace and the "Load more"
      // append so a row already shown is never re-introduced.
      setVariants((prev) => {
        const merged = page === 1 ? rows : [...prev, ...rows];
        const seen = new Set();
        return merged.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
      });
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
    // Sr 13/44/45 — blank/0 is invalid, and (defensively — the input already
    // clamps to 100) so is anything over 100. Keeps the Continue gate correct
    // even if minPassByItem is ever seeded some other way (e.g. draft resume).
    const mp = Number(minPassByItem[iid]);
    if (!mp || mp < 1 || mp > 100) return false;
    return true;
  }
  // Per-item technical-eval toggle (default ON for any selected item).
  const itemTechOn = (iid) => techByItem[iid] !== false;
  // Any item at all being evaluated → vendors must seal a technical envelope.
  const anyTechRequired = selectedItemIds.some(itemTechOn);
  // A tech-ON item must have valid clauses; a tech-OFF item is always fine.
  const itemTechConfigured = (iid) => !itemTechOn(iid) || itemClauseValid(iid);

  const canNext = useMemo(() => {
    if (step === 1) return !!title && !!categoryId && !!type;
    if (step === 2) return !!hotelId && !!departmentId;
    if (step === 3)
      return selectedItemIds.length > 0
        && selectedItemIds.every((id) => Number(itemQtys[id]) > 0 && !!(itemUoms[id] || "").trim() && (itemSpecs[id] || "").trim().length > 0);
    if (step === 4) return !!submissionStart && !!submissionEnd && !!contractStart && !!contractEnd;
    if (step === 5) {
      if (eligibility === "invitation" && invitedVendorIds.length === 0) return false;
      // Only items with technical evaluation ON must be fully configured.
      return selectedItemIds.every(itemTechConfigured);
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, title, categoryId, type, hotelId, departmentId, selectedItemIds, itemQtys, itemUoms, itemSpecs, submissionStart, submissionEnd, contractStart, contractEnd, eligibility, invitedVendorIds, techByItem, clausesByItem, minPassByItem]);

  // Any step the user has already REACHED (<= furthestStep) is freely clickable
  // in either direction — back-nav never relocks it (Track C).
  function goToStep(s) { if (s >= 1 && s <= furthestStep) setStep(s); }
  function nextStep() {
    if (canNext && step < 6) {
      const next = step + 1;
      setStep(next);
      setFurthestStep((f) => Math.max(f, next)); // bump the high-water mark
    }
  }
  // Going back only moves the cursor; it must NOT shrink furthestStep.
  function backStep() { if (step > 1) setStep((s) => s - 1); }

  // Sr 8 — bring the new step's header into view on every step change
  // (Continue, Back, stepper click, and resume). With the fixed bottom
  // action-dock, Continue can otherwise leave the next step's header offscreen.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  // ── Item / clause / vendor mutators ────────────────────────────────
  function pickCategory(c) {
    if (categoryId === c.id) return;
    setCategoryId(c.id);
    setCategoryTitle(c.title || "");
    setSelectedSubCats([]);
    setSelectedItemIds([]);
    setItemSpecs({}); setItemQtys({}); setItemUoms({});
    setClausesByItem({}); setMinPassByItem({}); setTechByItem({});
  }
  function pickType(t) {
    if (type === t) return;
    setType(t);
    setSelectedItemIds([]);
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
      setTechByItem((t)      => (id in t) ? t : { ...t, [id]: true }); // default ON
      // Remember enough to display this item after it scrolls out of the
      // current catalogue page (Selected panel, tech-eval step, summary).
      if (meta) setSelectedMeta((m) => (m[id] ? m : { ...m, [id]: { id, name: meta.name, slug: meta.slug, uom: meta.uom ?? null } }));
      return [...s, id];
    });
  }
  // Sr 21 — add a custom unit and select it for the item that opened the
  // inline add-row; the new unit is added to the shared `units` list so every
  // item's select can offer it. NOTE on the response shape: axiosInstance's
  // response interceptor already unwraps `response.data` (the backend body
  // `{status, data}`), so a successful call here resolves with that body —
  // same one level as `getUnits()` → `unitRes?.data` (create.js load effect) —
  // hence `res?.data` (not `res?.data?.data`). A 409 (unit already exists) is
  // an axios error, so it takes the reject path; the service wraps errors as
  // `reject({ message: error })`, and the interceptor's error handler rejects
  // with the raw axios error (not its `.data`) — so the existing row is at
  // `err.message.response.data.data`.
  async function saveCustomUnit(itemId) {
    const name = newUomName.trim();
    if (!name) return;
    try {
      const res = await addCustomUnit({ name });
      const u = res?.data; // { id, name, is_default:false }
      if (u) {
        setUnits((prev) => prev.some((x) => x.id === u.id) ? prev : [...prev, u]);
        setItemUoms((m) => ({ ...m, [itemId]: u.name }));
      }
      setAddingUomFor(null); setNewUomName("");
    } catch (err) {
      // 409 → unit already exists; select the returned existing row instead
      // of surfacing a duplicate error.
      const existing = err?.message?.response?.data?.data;
      if (existing) {
        setUnits((prev) => prev.some((x) => x.id === existing.id) ? prev : [...prev, existing]);
        setItemUoms((m) => ({ ...m, [itemId]: existing.name }));
        setAddingUomFor(null); setNewUomName("");
      } else {
        showToast("Could not add unit");
      }
    }
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

  // ── Submit / Save draft ─────────────────────────────────────────────
  // Shared payload builder — submit() and saveDraft() both persist the exact
  // same wizard state; only whether publish() runs afterward differs. Kept as
  // one function so the two flows can't drift out of sync (Sr 17).
  function buildPayload() {
    const items = selectedItemIds.map((id) => ({
      product_variant_id: id,
      spec_text:          itemSpecs[id] || "",
      indicative_qty:     Number(itemQtys[id]) || 0,
      uom:                itemUoms[id] || null,
    }));
    return {
      title,
      description: internalRef ? `Internal ref: ${internalRef}` : "",
      category_id: categoryId,
      sub_category_ids: selectedSubCats,
      type,
      hotel_id: hotelId,
      department_id: departmentId,
      // No process_id — ARC approval routes via the committee/hierarchy
      // model, so the backend stores process_id as NULL (audit H5).
      submission_start_at: submissionStart,
      submission_end_at:   submissionEnd,
      contract_start_at:   contractStart,
      contract_end_at:     contractEnd,
      eligibility_type:    eligibility,
      // True if ANY item is technically evaluated → vendors must seal a
      // technical envelope (for the items that have clauses) before quoting.
      technical_response_required: anyTechRequired,
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
      // The set of items that will actually get a tech-eval row (re)persisted
      // by persistTechEval() right after this call — same gate it uses
      // (`itemTechOn(vid) && clauses present`). updateDraft reconciles against
      // this so an item toggled OFF (or emptied of clauses) since the last
      // save has its stale tech-eval config torn down, instead of surviving
      // indefinitely and still forcing vendors to seal a technical envelope.
      tech_item_variant_ids: selectedItemIds.filter(
        (vid) => itemTechOn(vid) && (clausesByItem[vid] || []).length > 0
      ),
    };
  }

  // Persist the per-item technical evaluation config the wizard collected
  // (clauses + weights + min passing score) so the qualification gate
  // actually uses it. Keyed by product_variant_id → ARC item id — works for
  // BOTH a freshly-created draft's items (from createDraft's response) and a
  // resumed draft's reconciled items (from updateDraft's response, GROUP D),
  // since both now return the same { id, product_variant_id } shape.
  async function persistTechEval(arcItems) {
    if (!anyTechRequired || !arcItems.length) return;
    const itemIdByVariant = {};
    for (const it of arcItems) itemIdByVariant[it.product_variant_id] = it.id;
    for (const vid of selectedItemIds) {
      const arcItemId = itemIdByVariant[vid];
      const cls = clausesByItem[vid] || [];
      // Only set up tech eval for items with the toggle ON — a tech-OFF item
      // gets no tech_evaluation row, so it skips qualification entirely.
      if (!arcItemId || !itemTechOn(vid) || cls.length === 0) continue;
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

  // Create-or-update the draft ARC (createDraft if new, updateDraft if
  // resuming/already created this session — H8), persist tech eval, and
  // return the arc id + the reconciled items list. Shared by submit() and
  // saveDraft(). updateDraft now reconciles the item set + invitations too
  // (GROUP D backend fix), so this works identically on both branches.
  async function persistDraft(payload) {
    let arcId = draftArcRef.current;
    let items = [];
    if (!arcId) {
      const res = await ArcApi.createDraft(payload);
      const arc = res?.data?.arc || res?.data?.data?.arc;
      arcId = arc?.id;
      if (!arcId) throw new Error("Could not create draft");
      draftArcRef.current = arcId;
      items = res?.data?.items || res?.data?.data?.items || [];
    } else {
      // Resumed draft (?c=<id> or a prior in-session create): the ARC already
      // exists, so PATCH the edits onto it rather than minting a duplicate
      // (spec §2.4). updateDraft reconciles scalars + item set + invitations.
      const res = await ArcApi.updateDraft(arcId, payload);
      items = res?.data?.items || res?.data?.data?.items || [];
    }
    await persistTechEval(items);
    return arcId;
  }

  async function submit() {
    if (busy) return; // H8 — guard against double-submit while a call is in flight
    setBusy(true); setError(null);
    try {
      const arcId = await persistDraft(buildPayload());
      const pubRes = await ArcApi.publish(arcId);
      draftArcRef.current = null; // fully submitted — clear the resume handle
      // Publish now routes through an approval gate. If the publisher is the
      // sole/ANY approver the engine auto-approves and the ARC floats in the
      // same request (floated:true); otherwise it parks pending publish approval.
      const floated = pubRes?.data?.data?.floated ?? pubRes?.data?.floated;
      if (floated) {
        const vendorCount =
          pubRes?.data?.vendor_count ?? pubRes?.data?.data?.vendor_count ?? 0;
        showToast(vendorCount ? `Floated · ${vendorCount} vendor(s) invited & notified` : "Floated · vendors invited & notified");
        setTimeout(() => router.push("/dashboard/buyer/rate-contracts/all"), 1100);
      } else {
        showToast("Submitted for publish approval");
        // Land the creator on the detail/overview so they see the pending banner.
        setTimeout(() => router.push(`/dashboard/buyer/rate-contracts/${arcId}`), 1100);
      }
    } catch (e) {
      // Surface the server message verbatim — the no-policy message is actionable.
      setError(e?.response?.data?.message || e?.message || "Could not publish");
    } finally { setBusy(false); }
  }

  // Sr 17 — persist the current wizard state WITHOUT publishing, then exit to
  // the Drafts list. Shares buildPayload()/persistDraft() with submit() so the
  // two flows can never drift; the only difference is publish() never runs and
  // draftArcRef is left set (the draft stays open for a later resume/submit).
  async function saveDraft() {
    if (busy) return; // same re-entrancy guard as submit() (H8)
    setBusy(true);
    try {
      await persistDraft(buildPayload());
      showToast("Draft saved");
      setTimeout(() => router.push("/dashboard/buyer/rate-contracts/drafts"), 900);
    } catch (e) {
      // Save draft is reachable from steps 2-6, but the `error` banner only
      // renders on step 6 (Review) — toast instead so a failure is visible
      // regardless of which step the user saved from.
      showToast(e?.response?.data?.message || e?.message || "Could not save draft");
    } finally { setBusy(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <main className="main-body" style={{ paddingBottom: 108 }}>
      <div>
        {/* Resuming a saved draft → a quiet "Draft" eyebrow orients the user. */}
        {draftArcRef.current && (
          <span className="page-eyebrow info">Draft · resuming</span>
        )}
        <h1 className="page-h1">{draftArcRef.current ? "Resume Rate Contract draft" : "Create Rate Contract"}</h1>
        <p className="page-sub">Single-BU ARC. Category drives the catalogue; tech eval is configured per item with explicit weights and a minimum passing score.</p>
      </div>

      {/* Resume — clean loading state while the draft hydrates. */}
      {resuming && (
        <div className="guide" style={{ marginBottom: 14 }}>
          <div className="g-ic"><ClockIcon /></div>
          <div>Loading saved draft…</div>
        </div>
      )}

      {/* Horizontal stepper — orientation line + the reached/current/locked rail. */}
      <nav className="h-stepper" aria-label="Lifecycle progress">
        {STEPS.map((s, i) => (
          <span key={s.key} style={{ display: "contents" }}>
            <button
              type="button"
              className={[
                "hs-step",
                step === i + 1 ? "is-active" : "",
                // "done" = a reached step that isn't the active one (uses the
                // monotonic furthestStep so checkmarks persist after back-nav).
                furthestStep >= i + 1 && step !== i + 1 ? "is-done" : "",
                // only a never-reached step is locked.
                furthestStep < i + 1 ? "is-locked" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => goToStep(i + 1)}
              aria-current={step === i + 1 ? "step" : undefined}
            >
              <div className="hs-num"><span className="n">{i + 1}</span></div>
              <div className="hs-lab">
                <span className="l">{s.label}</span>
                <span className="m">{s.meta}</span>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`hs-divider ${furthestStep > i + 1 ? "is-done" : ""}`} />
            )}
          </span>
        ))}
      </nav>

      {/* Orientation line — "Step X of 6 · Label" mirrors ArcStageTimeline. */}
      <div className="wiz-orient">
        <span className="section-label">Step <span className="mono">{step}</span> of <span className="mono">6</span></span>
        <span className="wiz-orient-sep">·</span>
        <span className="wiz-orient-lab">{STEPS[step - 1].label}</span>
        <span className="wiz-orient-meta">{STEPS[step - 1].meta}</span>
      </div>

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
                <div className="help-text">Shown to vendors and across dashboards. Keep it specific to the BU and period.</div>
              </div>
              <div>
                <label className="label">Internal reference</label>
                <input className="input mono" value={internalRef} onChange={(e) => setInternalRef(e.target.value)} placeholder="e.g. FY26-ARC-BAB-FB-01" />
                <div className="help-text">Optional. Your own filing code — kept internal, not shared with vendors.</div>
              </div>
            </div>

            <label className="label" style={{ marginTop: 18 }}>Category <span className="req">*</span></label>
            <div className="help-text" style={{ marginTop: -2, marginBottom: 9 }}>Drives the item catalogue and the pool of eligible vendors for this contract.</div>
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
              <div className="help-text" style={{ marginTop: 12 }}>
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
              <div style={{ marginBottom: 18 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>
                  Selected items · configure each <span className="mono fw-600" style={{ color: "var(--fg)" }}>({selectedItemIds.length})</span>
                </div>
                {selectedItemIds.map((id) => {
                  const it = variantById(id);
                  return (
                    <div key={id} style={{ marginBottom: 8 }}>
                      {/* Sr 5 — row click minimises/expands the detail block (does NOT
                          remove the item); an explicit trash button removes it. */}
                      <div
                        className="item-row selected"
                        onClick={() => toggleCollapse(id)}
                        style={{ cursor: "pointer", gridTemplateColumns: "24px 1fr auto auto" }}
                      >
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
                          title={collapsedItemIds.includes(id) ? "Expand" : "Minimise"}
                          style={{ transform: collapsedItemIds.includes(id) ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        <div className="ir-meta">
                          <div className="ir-name">{it.name}</div>
                          <div className="ir-sub"><span className="mono">{it.slug}</span></div>
                        </div>
                        <div className="ir-tag">{type === "service" ? "Service" : "Product"}</div>
                        <button type="button" className="icon-btn" title="Remove item"
                          onClick={(e) => { e.stopPropagation(); toggleItem(id); }}>
                          <span style={{ color: "var(--danger)" }}><TrashIcon size={13} /></span>
                        </button>
                      </div>
                      {!collapsedItemIds.includes(id) && (
                      <div className="item-detail">
                        <div className="form-grid cols-3">
                          <div>
                            <label className="label">Indicative quantity <span className="req">*</span></label>
                            <div className="input-group" style={{ maxWidth: 200 }}>
                              <input type="number" className="input input-num" value={itemQtys[id] ?? ""} onChange={(e) => setItemQtys((m) => ({ ...m, [id]: e.target.value }))} placeholder="0" min={0} />
                              <div className="suffix" title={uomFull(itemUoms[id] || "unit")}>{itemUoms[id] || "unit"}</div>
                            </div>
                          </div>
                          <div>
                            <label className="label">Unit of measure <span className="req">*</span></label>
                            <select className="select" style={{ maxWidth: 200 }} value={itemUoms[id] ?? ""} onChange={(e) => {
                              if (e.target.value === "__add_custom__") { setAddingUomFor(id); setNewUomName(""); return; }
                              setItemUoms((m) => ({ ...m, [id]: e.target.value }));
                            }}>
                              <option value="">Select unit…</option>
                              {units.map((u) => <option key={u.id} value={u.name} title={uomFull(u.name)}>{u.name}</option>)}
                              <option value="__add_custom__">＋ Add custom unit…</option>
                            </select>
                            {addingUomFor === id && (
                              <div style={{ display: "flex", gap: 6, marginTop: 8, maxWidth: 260 }}>
                                <input className="input" style={{ flex: 1, minWidth: 0 }} autoFocus value={newUomName} onChange={(e) => setNewUomName(e.target.value)} placeholder="e.g. Carton" maxLength={50} />
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => saveCustomUnit(id)}>Add</button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setAddingUomFor(null); setNewUomName(""); }}>Cancel</button>
                              </div>
                            )}
                          </div>
                          <div />
                        </div>
                        <label className="label" style={{ marginTop: 11 }}>Specification <span className="req">*</span></label>
                        <textarea className="textarea" value={itemSpecs[id] ?? ""} onChange={(e) => setItemSpecs((m) => ({ ...m, [id]: e.target.value }))} placeholder="Describe the spec, grade, quality requirements…" />
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Browse toolbar — server search (debounced) + sub-category filter + count. */}
            {selectedItemIds.length > 0 && (
              <div className="section-label" style={{ marginBottom: 10 }}>Browse catalogue</div>
            )}
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
              {/* Sr 23 — count line only reads meaningfully once a query is active. */}
              {(debouncedItemSearch || itemSubCat) && (
                <span style={{ fontSize: 12.5, color: "var(--fg-3)", whiteSpace: "nowrap" }}>
                  <span className="mono fw-600">{variantsTotal.toLocaleString("en-IN")}</span> item{variantsTotal === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {/* Sr 23 — no query yet → prompt instead of dumping the whole category
                catalogue on mount. The selected-items panel above is independent and
                keeps rendering regardless. */}
            {!debouncedItemSearch && !itemSubCat ? (
              <div className="empty-state" style={{ padding: "32px 20px" }}>
                <div className="ic"><SearchIcon size={22} /></div>
                <h2>Search the catalogue</h2>
                <p>Start typing an item name or code to find items in {selectedCategoryTitle || "this category"}.</p>
              </div>
            ) : (
              <>
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
                      <p>Try a different search or sub-category.</p>
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
              </>
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
              <div><h2>Tender dates &amp; commercial terms</h2><div className="h-sub">Submission window, contract term, and the commercial baseline vendors quote against</div></div>
            </div>
          </div>
          <div className="section-body">
            {/* ── Tender timeline ── */}
            <div className="section-label" style={{ marginBottom: 12 }}>Tender timeline</div>
            <div className="form-grid">
              <div><label className="label">Submission start <span className="req">*</span></label><input type="datetime-local" className="input" value={submissionStart} onChange={(e) => setSubmissionStart(e.target.value)} /></div>
              <div><label className="label">Submission end <span className="req">*</span></label><input type="datetime-local" className="input" value={submissionEnd} onChange={(e) => setSubmissionEnd(e.target.value)} /></div>
              <div><label className="label">Contract start <span className="req">*</span></label><input type="datetime-local" className="input" value={contractStart} onChange={(e) => setContractStart(e.target.value)} /></div>
              <div><label className="label">Contract end <span className="req">*</span></label><input type="datetime-local" className="input" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} /></div>
            </div>

            {/* ── Commercial terms ── */}
            <div className="section-label" style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)", marginBottom: 12 }}>Commercial terms</div>
            <div className="form-grid">
              <div>
                <label className="label">Price escalation</label>
                <select className="select" value={escalation} onChange={(e) => setEscalation(e.target.value)}>
                  <option value="none">None · flat rates</option>
                  <option value="annual">Annual % escalation</option>
                  <option value="cpi">CPI-linked</option>
                  <option value="tariff">Tariff-linked</option>
                </select>
                {/* Sr 9 — dynamic help line reflecting the currently selected escalation type */}
                <div className="help-text">{ESCALATION_HELP[escalation]}</div>
              </div>
              <div>
                <label className="label">Escalation cap {escalation !== "none" && <span className="req">*</span>}</label>
                <div className="input-group">
                  <input type="number" className="input input-num" value={escalation === "none" ? "" : escalationCap} onChange={(e) => setEscalationCap(e.target.value)} placeholder={escalation === "none" ? "Not applicable" : "4"} min={0} disabled={escalation === "none"} />
                  <div className="suffix">%</div>
                </div>
                {/* Sr 10 — cap help, shown only when the field is applicable (non-"none") */}
                {escalation !== "none" && (
                  <div className="help-text">
                    The most the total price may rise over the full contract term — it protects you from
                    open-ended escalation. Any revision above this ceiling is not admissible, and every
                    revision still needs your written approval. Enter the ceiling as a percentage (e.g. 4).
                  </div>
                )}
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div><label className="label">Payment terms</label><input className="input" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" /></div>
              <div><label className="label">Delivery / fulfilment terms</label><input className="input" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="e.g. Within 2 days of each released PO" /></div>
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
          <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><ChecklistIcon /></div>
                  <div>
                    <h2>Item-level technical evaluation</h2>
                    <div className="h-sub">Toggle technical evaluation per product. A product that's ON is scored on its clauses (only qualified vendors can win it); a product that's OFF skips tech and goes straight to price competition among all vendors.</div>
                  </div>
                </div>
                {selectedItemIds.length > 1 && (
                  <div className="h-right" style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn-secondary btn-sm"
                      onClick={() => setTechByItem(Object.fromEntries(selectedItemIds.map((id) => [id, true])))}>
                      All on
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm"
                      onClick={() => setTechByItem(Object.fromEntries(selectedItemIds.map((id) => [id, false])))}>
                      All off
                    </button>
                  </div>
                )}
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
                  const techOn = itemTechOn(iid);
                  const status = itemWeightStatus(iid);
                  const valid = itemClauseValid(iid);
                  const cls = clausesByItem[iid] || [];
                  const total = itemTotalWeight(iid);
                  return (
                    <div key={iid} className={`te-item-card ${!techOn ? "" : valid ? "complete" : status === "over" ? "error" : ""}`} style={!techOn ? { opacity: 0.85 } : undefined}>
                      <div className="te-item-head">
                        {/* Per-item technical-evaluation toggle (default ON). */}
                        <label className="cbx" style={{ margin: 0 }} title={techOn ? "Technical evaluation ON — vendors are scored on clauses for this product" : "Technical evaluation OFF — this product skips tech; all vendors compete on price"}>
                          <input type="checkbox" checked={techOn} onChange={(e) => setTechByItem((t) => ({ ...t, [iid]: e.target.checked }))} />
                          <span className="cbx-box" />
                        </label>
                        <div className="te-h-meta">
                          <div className="te-h-name">
                            <span>{it.name}</span>
                            <span className="te-h-num">{it.slug}</span>
                          </div>
                          <div className="te-h-sub">
                            {techOn ? (
                              <>
                                <span className="mono fw-600" style={{ color: "var(--fg)" }}>{cls.length}</span> clause{cls.length === 1 ? "" : "s"}
                                <span style={{ color: "var(--fg-4)" }}>·</span>
                                <span title={uomFull(itemUoms[iid] || "unit")}>per {itemUoms[iid] || "unit"}</span>
                              </>
                            ) : (
                              <span style={{ color: "var(--fg-3)" }}>No technical evaluation — all vendors compete on price for this product</span>
                            )}
                          </div>
                        </div>
                        {techOn && (
                          <div className="te-min-pass">
                            <span className="lbl">Min pass</span>
                            <div className="input-group" style={{ maxWidth: 110 }}>
                              <input type="number" className="input input-num" value={minPassByItem[iid] ?? ""} onChange={(e) => setMinPassByItem((m) => ({ ...m, [iid]: sanitizePct(e.target.value) }))} min={0} max={100} placeholder="65" />
                              <div className="suffix">%</div>
                            </div>
                            {/* Sr 13 — surface WHY Continue is blocked: blank/0 (or, defensively, >100) isn't a valid passing threshold. */}
                            {(() => {
                              const mp = minPassByItem[iid];
                              const invalid = mp === "" || mp === undefined || mp === null || !(Number(mp) >= 1 && Number(mp) <= 100);
                              return invalid ? (
                                <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>Enter a passing % between 1 and 100</div>
                              ) : null;
                            })()}
                          </div>
                        )}
                        <div>
                          {!techOn && <span className="te-status">Tech eval off</span>}
                          {techOn && valid && <span className="te-status complete"><CheckIcon size={11} /> Configured</span>}
                          {techOn && !valid && status === "over" && <span className="te-status error"><Icon size={11}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon> Weights over 100</span>}
                          {techOn && !valid && status !== "over" && <span className="te-status warn">Needs clauses · weights = 100</span>}
                        </div>
                      </div>

                      {techOn && (
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
                      )}

                      {techOn && (
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
                                <input type="number" className="input input-num" value={cl.weight ?? ""} onChange={(e) => updateClause(iid, idx, { weight: sanitizePct(e.target.value) })} min={0} max={100} placeholder="20" />
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          {/* Vendor eligibility */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic"><ShieldIcon /></div>
                <div><h2>Vendor eligibility</h2><div className="h-sub">Who may quote against this contract</div></div>
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
                <div style={{ marginTop: 16 }}>
                  <label className="label">Invite vendors <span className="req">*</span></label>
                  <div className="help-text" style={{ marginTop: -2, marginBottom: 9 }}>
                    Only vendors subscribed to this business unit × category are listed.
                    {invitedVendorIds.length > 0 && <> <span className="mono fw-600" style={{ color: "var(--fg)" }}>{invitedVendorIds.length}</span> selected.</>}
                  </div>
                  <div>
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
                              <div className="vpr-name">{v.name}</div>
                              <div className="vpr-email">{v.email || "—"}</div>
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
              <div><h2>Review &amp; publish</h2><div className="h-sub">Confirm the contract before it goes for publish approval</div></div>
            </div>
          </div>
          <div className="section-body">
            <div className="section-label" style={{ marginBottom: 10 }}>Summary</div>
            <div className="kv-grid">
              <div className="k">Title</div><div className="v">{title}</div>
              <div className="k">Category</div><div className="v">{selectedCategoryTitle} · {type === "service" ? "Services" : "Products"}</div>
              <div className="k">Business unit</div><div className="v"><span className="mono fw-600">{buCodeFor(selectedHotel?.name)}</span> {selectedHotel?.name}</div>
              <div className="k">Items</div><div className="v"><span className="em mono">{selectedItemIds.length}</span> picked</div>
              <div className="k">Tender</div><div className="v"><span className="mono">{submissionStart}</span> → <span className="mono">{submissionEnd}</span></div>
              <div className="k">Term</div><div className="v"><span className="mono">{contractStart}</span> → <span className="mono">{contractEnd}</span></div>
              <div className="k">Eligibility</div><div className="v">{eligibility === "open" ? "Open · all approved vendors" : `${invitedVendorIds.length} invited`}</div>
              <div className="k">Tech eval</div><div className="v">{
                anyTechRequired
                  ? `${selectedItemIds.filter(itemTechOn).length} of ${selectedItemIds.length} product(s) evaluated`
                  : "Not required — all products price-only"
              }</div>
            </div>

            {selectedItemIds.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="section-label" style={{ marginBottom: 8 }}>Tech eval summary per item</div>
                <div className="rev-items">
                  {selectedItemIds.map((iid) => {
                    const it = variantById(iid);
                    const techOn = itemTechOn(iid);
                    const valid = itemClauseValid(iid);
                    return (
                      <div key={iid} className="rev-item">
                        <span className="ri-name">{it.name}</span>
                        {techOn ? (
                          <>
                            <span className="ri-dot">·</span>
                            <span className="ri-fact"><span className="mono fw-600">{(clausesByItem[iid] || []).length}</span> clauses · weights <span className="mono fw-600">{itemTotalWeight(iid)}</span>/100</span>
                            <span className="ri-dot">·</span>
                            <span className="ri-fact">min pass <span className="mono fw-600">{(minPassByItem[iid] || 0)}%</span></span>
                            {valid
                              ? <span className="ri-stat ok"><CheckIcon size={11} /> Configured</span>
                              : <span className="ri-stat warn">Incomplete</span>}
                          </>
                        ) : (
                          <>
                            <span className="ri-dot">·</span>
                            <span className="ri-fact muted">No technical evaluation — price-only</span>
                            <span className="ri-stat off">Tech eval off</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="guide" style={{ marginTop: 20 }}>
              <div className="g-ic"><InfoIcon /></div>
              <div>
                This rate contract goes for <strong>publish approval</strong> before vendors can see it. If you are the sole approver, it goes live immediately on publish.
              </div>
            </div>

            {error && (
              <div className="guide danger" style={{ marginTop: 14 }}>
                <div className="g-ic"><AlertIcon /></div>
                <div><strong>Couldn&apos;t publish.</strong> {error}</div>
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
            {/* Sr 17 — Save draft & exit. Gated on BU being set (step ≥ 2) so
                createDraft's required fields (title/category from step 1,
                hotel/department from step 2) are always satisfiable. */}
            {step > 1 && hotelId && departmentId && (
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={saveDraft}>
                {busy ? "Saving…" : "Save draft & exit"}
              </button>
            )}
            {step > 1 && (
              <button className="btn btn-ghost btn-sm" onClick={backStep}>Back</button>
            )}
            {step < 6 && (
              <button className="btn btn-blue" disabled={!canNext || busy} onClick={nextStep}>
                Continue <ArrowRightIcon />
              </button>
            )}
            {step === 6 && (
              <button className="btn btn-success" disabled={busy} onClick={submit}>
                <SendIcon /> {busy ? "Submitting…" : "Submit for publish approval"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
