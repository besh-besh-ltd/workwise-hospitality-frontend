// Buyer · Manual ARC Entry — single dense back-office data-entry workspace.
//
// One scrollable workspace (NOT a wizard): a hero band with a STICKY 6-stage
// Target-Stage segmented control (S0 Draft … S5 Ended) + dirty/saving status
// chip + Save-draft/Finalize, a sticky left section rail (A→M), stage-aware
// conditional rendering per spec §2.3 (Required / Optional / Auto / Hidden),
// real vendor selection (BU×category → eligible vendors + override toggle),
// a rate-schedule <table> with mono tabular numerals, per-vendor quote/award/
// contract blocks, the S4/S5 signed-PDF upload, the S3 auto-generate guide,
// and a sticky right summary (kv-grid, completeness).
//
// The draft IS the ARC row (status='draft'); resume via ?d=<arcId> hydrating
// GET /manual/draft/:id. Section autosave on blur (PUT section). On finalize,
// navigate to the new ARC's lifecycle detail page. arc_v2.css tokens only.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";
import {
  buildSectionPayload,
  buildDraftPayload,
  buildFinalizePayload,
} from "@/utils/manualEntryPayloads";

// ──────────────────────────────────────────────────────────────────────────
//  Target stages (the master affordance) + the §2.3 field-group matrix
// ──────────────────────────────────────────────────────────────────────────

// Each stage carries its UI label, the guide sentence, and the §2.3 rule for
// every field group. Cell values: 'R' required · 'O' optional · 'A' auto
// (system-generated, read-only preview) · 'H' hidden.
const STAGES = [
  { key: "draft",      n: "S0", label: "Draft",        meta: "Not yet floated" },
  { key: "floated",    n: "S1", label: "Floated",      meta: "Collecting quotes" },
  { key: "evaluation", n: "S2", label: "Evaluation",   meta: "Under evaluation" },
  { key: "sig_pending",n: "S3", label: "Sig-pending",  meta: "Awarded · awaiting sign" },
  { key: "active",     n: "S4", label: "Active",       meta: "Signed contract on hand" },
  { key: "ended",      n: "S5", label: "Ended",        meta: "Expired / terminated / closed" },
];

const STAGE_GUIDE = {
  draft:       { tone: "",       text: "Draft — header, scope, provenance and at least one line item. Nothing is floated; no vendors required yet." },
  floated:     { tone: "",       text: "Floated — invited vendors and the (backdated) submission window are recorded. Quotes are optional at this stage." },
  evaluation:  { tone: "",       text: "Under evaluation — vendor quotes are required; awards are optional until you finalise the commercial evaluation." },
  sig_pending: { tone: "violet", text: "Vendor signature pending — the contract PDF will be generated automatically when the vendor e-signs; do not upload a document here." },
  active:      { tone: "success",text: "Active historical contract — upload the already-signed PDF and enter the original signature date. The document is stored as-is and never re-generated." },
  ended:       { tone: "warn",   text: "Ended — choose the end status (expired / terminated / closed). If the contract was ever awarded, contract & award groups are required; closed-without-award only needs header, scope and a reason." },
};

// Field-group × target-stage matrix (spec §2.3). 'R1' = required only when the
// ARC was awarded before it ended (S5 toggle); we treat the awarded toggle in
// the page. 'S3auto' marks groups the server generates for S3 (read-only).
const GROUPS = [
  { id: "A", key: "header",     title: "Contract header / meta",   sys: false },
  { id: "B", key: "scope",      title: "Scope",                    sys: false },
  { id: "C", key: "provenance", title: "Provenance & backdating",  sys: false },
  { id: "D", key: "vendors",    title: "Parties / vendor selection", sys: false },
  { id: "E", key: "items",      title: "Rate schedule / line items", sys: false },
  { id: "F", key: "quotes",     title: "Vendor quotes",            sys: false },
  { id: "G", key: "awards",     title: "Commercial eval / awards", sys: false },
  { id: "H", key: "terms",      title: "Commercial terms",         sys: false },
  { id: "I", key: "quality",    title: "Quality / compliance",     sys: false },
  { id: "J", key: "contract",   title: "Contract & document",      sys: false },
  { id: "K", key: "signatures", title: "Signatures",               sys: false },
  { id: "L", key: "approvals",  title: "Approvals (committee outcome)", sys: false },
  { id: "M", key: "audit",      title: "Audit / event provenance", sys: true },
];

// rule(groupId, stageKey, awarded) → 'R' | 'O' | 'A' | 'H'  (spec §2.3)
function rule(groupId, stageKey, awarded) {
  const M = {
    //        S0   S1   S2   S3       S4   S5
    A: ["R", "R", "R", "R", "R", "R"],
    B: ["R", "R", "R", "R", "R", "R"],
    C: ["R", "R", "R", "R", "R", "R"],
    D: ["O", "R", "R", "R", "R", "R1"],
    E: ["R", "R", "R", "R", "R", "R1"],
    F: ["H", "O", "R", "R", "R", "R1"],
    G: ["H", "H", "O", "R", "R", "R1"],
    H: ["O", "O", "O", "R", "R", "O"],
    I: ["O", "O", "O", "O", "O", "O"],
    J: ["H", "H", "H", "A", "R", "O"],
    K: ["H", "H", "H", "A", "R", "O"],
    L: ["H", "H", "O", "R", "R", "O"],
    M: ["A", "A", "A", "A", "A", "A"],
  };
  const idx = STAGES.findIndex((s) => s.key === stageKey);
  let v = (M[groupId] || [])[idx] || "H";
  // S5 conditional: 'R1' collapses to R when awarded, else O (or H for D/F/G when closed_no_award).
  if (v === "R1") v = awarded ? "R" : "O";
  return v;
}

const RULE_BADGE = {
  R: { label: "Required", cls: "warn" },
  O: { label: "Optional", cls: "" },
  A: { label: "Auto",     cls: "violet" },
  H: { label: "Hidden",   cls: "" },
};

// ──────────────────────────────────────────────────────────────────────────
//  Wizard steps — the page is a guided, one-step-at-a-time flow. Each step
//  carries one or more field-groups; a step is shown only when at least one of
//  its groups is not Hidden for the chosen target stage. 'stage' and 'review'
//  always show. (Group M / audit is system-only and never a step.)
// ──────────────────────────────────────────────────────────────────────────
const STEP_DEFS = [
  { key: "stage",     label: "Stage",       groups: [],             always: true },
  { key: "basics",    label: "Details",     groups: ["A", "B", "C"] },
  { key: "vendors",   label: "Vendors",     groups: ["D"] },
  { key: "items",     label: "Line items",  groups: ["E"] },
  { key: "quotes",    label: "Quotes",      groups: ["F"] },
  { key: "awards",    label: "Awards",      groups: ["G"] },
  { key: "terms",     label: "Terms",       groups: ["H", "I"] },
  { key: "contract",  label: "Contract",    groups: ["J", "K"] },
  { key: "approvals", label: "Approvals",   groups: ["L"] },
  { key: "review",    label: "Review",      groups: [],             always: true },
];

const STEP_INTRO = {
  stage:     "Where is this contract in its life? Your choice tailors the rest of the steps.",
  basics:    "The contract's identity, where it applies, and the (backdated) key dates.",
  vendors:   "Choose the supplier(s) on this contract — by business unit and category.",
  items:     "The rate schedule — every product with its quantity, UOM and target rate.",
  quotes:    "What each vendor quoted, line by line.",
  awards:    "Allocate the awarded quantity across vendors. Splits are allowed.",
  terms:     "Payment, delivery and penalty terms; compliance notes.",
  contract:  "The signed contract document and its signature dates.",
  approvals: "The committee's approval outcome for this contract.",
  review:    "Check everything, then finalise the rate contract.",
};

// ──────────────────────────────────────────────────────────────────────────
//  Tiny inline icons (matches create.js convention)
// ──────────────────────────────────────────────────────────────────────────
const Ic = (p) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.children}</svg>
);
const InfoIcon  = (p) => <Ic {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Ic>;
const PlusIcon  = (p) => <Ic size={p.size || 12} {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ic>;
const TrashIcon = (p) => <Ic {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></Ic>;
const SearchIcon= (p) => <Ic {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ic>;
const CheckIcon = (p) => <Ic {...p}><polyline points="20 6 9 17 4 12"/></Ic>;

// ──────────────────────────────────────────────────────────────────────────
//  helpers
// ──────────────────────────────────────────────────────────────────────────
const isoDate = (ts) => (ts ? String(ts).slice(0, 10) : "");
// datetime-local wants "YYYY-MM-DDTHH:mm"
const isoDateTime = (ts) => (ts ? String(ts).slice(0, 16) : "");
const num = (v) => (v === "" || v == null ? 0 : Number(v) || 0);
function initialsFor(name) {
  if (!name) return "??";
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function avClassFor(id) {
  const palette = ["av-indigo","av-sky","av-green","av-warm","av-violet","av-teal","av-rose"];
  return palette[Math.abs(Number(id) || 0) % palette.length];
}

// ──────────────────────────────────────────────────────────────────────────
//  Page
// ──────────────────────────────────────────────────────────────────────────
export default function ManualArcEntryPage() {
  const router = useRouter();

  // master control
  const [stage, setStage] = useState("active");      // default to the common historical case (S4)
  const [endedStatus, setEndedStatus] = useState("expired"); // S5 sub-status
  const [closedReason, setClosedReason] = useState("");
  const [awarded, setAwarded] = useState(true);      // S5 "was this awarded before it ended?"

  // draft lifecycle
  const [arcId, setArcId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | dirty | saving | saved | error
  const [error, setError] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const [stepIdx, setStepIdx] = useState(0);   // current wizard step

  // reference data
  const [categories, setCategories] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [subCats, setSubCats] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [overrideEligibility, setOverrideEligibility] = useState(false);
  const [variants, setVariants] = useState([]);
  const [variantSearch, setVariantSearch] = useState("");
  const [debouncedVarSearch, setDebouncedVarSearch] = useState("");
  const [loadingVariants, setLoadingVariants] = useState(false);
  const varSeq = useRef(0);

  // ── Group A — header ──
  const [arcNumber, setArcNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("product");
  const [eligibilityType, setEligibilityType] = useState("open");
  const [technicalRequired, setTechnicalRequired] = useState(false);
  const [sampleRequired, setSampleRequired] = useState(false);

  // ── Group B — scope ──
  const [hotelId, setHotelId] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [selectedSubCats, setSelectedSubCats] = useState([]);
  const [departmentId, setDepartmentId] = useState(null);

  // ── Group C — provenance / backdating ──
  const [createdAt, setCreatedAt] = useState("");
  const [floatedAt, setFloatedAt] = useState("");
  const [submissionStart, setSubmissionStart] = useState("");
  const [submissionEnd, setSubmissionEnd] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");

  // ── Group D — vendors (ids picked) ──
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);

  // ── Group E — items ──  rows keyed by a local uid
  const [items, setItems] = useState([]); // [{uid, product_variant_id, name, spec_text, target_price, indicative_qty, uom, hsn}]
  const itemSeq = useRef(0);
  // SC-2/FE-02 — maps local item uid → SERVER arc_item_id so quotes/awards
  // payloads (and their autosaves) key by the controller's arc_item_id. Filled
  // on resume hydrate and after each items-section save (refreshItemIds).
  const itemIdByUidRef = useRef({});

  // ── Group F/G/J — per-vendor quote lines + awards + contract docs ──
  // quoteLines[vendorId][itemUid] = { rate, gst_pct, lead_time_days, moq }
  const [quoteLines, setQuoteLines] = useState({});
  const [quoteMeta, setQuoteMeta] = useState({}); // quoteMeta[vendorId] = { submitted_at, payment_terms, gstin_used }
  // awards[itemUid] = [{ vendor_id, allocated_qty }]
  const [awards, setAwards] = useState({});
  const [finalizedAt, setFinalizedAt] = useState("");
  // contractDocs[vendorId] = { file, document_s3_url, generated_at, signed_by_vendor_at, uploading }
  const [contractDocs, setContractDocs] = useState({});

  // ── Group H — commercial terms ──
  const [paymentTermsExpected, setPaymentTermsExpected] = useState("");
  const [deliveryExpected, setDeliveryExpected] = useState("");
  const [penaltyClause, setPenaltyClause] = useState("");

  // ── Group L — committee outcome snapshot ──
  const [committeeDecision, setCommitteeDecision] = useState("approved");
  const [committeeDecidedAt, setCommitteeDecidedAt] = useState("");
  const [committeeDecidedBy, setCommitteeDecidedBy] = useState("");
  const [committeeComment, setCommitteeComment] = useState("");

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  const markDirty = useCallback(() => setSaveState((s) => (s === "saving" ? s : "dirty")), []);

  // ── Load reference data ──
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      ArcApi.listRootCategories().catch(() => null),
      ArcApi.listAccessibleHotels().catch(() => null),
    ]).then(([catRes, hotelRes]) => {
      if (cancelled) return;
      setCategories(catRes?.data?.categories || catRes?.categories || []);
      setHotels(hotelRes?.data?.hotels || hotelRes?.hotels || []);
    });
    return () => { cancelled = true; };
  }, []);

  // sub-categories + departments on category/hotel change
  useEffect(() => {
    if (!categoryId) { setSubCats([]); return; }
    let cancelled = false;
    ArcApi.getSubCategories(categoryId)
      .then((r) => { if (!cancelled) setSubCats(r?.data?.sub_categories || r?.sub_categories || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [categoryId]);

  useEffect(() => {
    if (!hotelId) { setDepartments([]); return; }
    let cancelled = false;
    ArcApi.getDepartmentsForHotel({ hotel_id: hotelId })
      .then((r) => {
        if (cancelled) return;
        const depts = r?.data?.departments || r?.departments || [];
        setDepartments(depts);
        if (depts.length === 1) setDepartmentId(depts[0].id);
      })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, [hotelId]);

  // vendor sets (eligible + all-for-override) on hotel×category
  useEffect(() => {
    if (!categoryId || !hotelId) { setEligibleVendors([]); setAllVendors([]); return; }
    let cancelled = false;
    ArcApi.listEligibleVendors({ category_id: categoryId, hotel_id: hotelId })
      .then((r) => { if (!cancelled) setEligibleVendors(r?.data?.vendors || r?.vendors || []); })
      .catch(() => {});
    ArcApi.listAllVendors({ hotel_id: hotelId, category_id: categoryId })
      .then((r) => { if (!cancelled) setAllVendors(r?.data?.vendors || r?.vendors || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [categoryId, hotelId]);

  // variant search (debounced)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedVarSearch(variantSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [variantSearch]);

  const loadVariants = useCallback(async () => {
    if (!categoryId) { setVariants([]); return; }
    const seq = ++varSeq.current;
    setLoadingVariants(true);
    try {
      const r = await ArcApi.searchVariants({
        category_id: categoryId,
        sub_category_ids: selectedSubCats,
        q: debouncedVarSearch || null,
        page: 1, limit: 30,
      });
      if (seq !== varSeq.current) return;
      setVariants(r?.data?.variants || r?.variants || []);
    } catch (_) {
      if (seq === varSeq.current) setVariants([]);
    } finally {
      if (seq === varSeq.current) setLoadingVariants(false);
    }
  }, [categoryId, selectedSubCats, debouncedVarSearch]);
  useEffect(() => { loadVariants(); }, [loadVariants]);

  // ── Resume (?d=<id>) — hydrate the full graph ──
  useEffect(() => {
    if (!router.isReady) return;
    const d = Number(router.query.d);
    if (!d) return;
    let cancelled = false;
    (async () => {
      setResuming(true); setError(null);
      try {
        const res = await ArcApi.getManualDraft(d);
        const body = res?.data || res || {};
        const arc = body.arc || {};
        const me  = body.manual_entry || {};
        if (!arc.id || cancelled) return;
        setArcId(arc.id);
        // master
        if (me.target_stage) setStage(me.target_stage);
        setOverrideEligibility(!!me.eligibility_overridden);
        if (arc.closed_reason) setClosedReason(arc.closed_reason);
        if (["expired","terminated","closed_no_award"].includes(arc.status)) setEndedStatus(arc.status);
        // A
        setArcNumber(arc.arc_number || "");
        setTitle(arc.title || "");
        setDescription(arc.description || "");
        setType(arc.type || "product");
        setEligibilityType(arc.eligibility_type || "open");
        setTechnicalRequired(!!arc.technical_response_required);
        setSampleRequired(!!arc.sample_required);
        // B
        setHotelId(arc.hotel_id || null);
        setCategoryId(arc.category_id || null);
        setSelectedSubCats(Array.isArray(arc.sub_category_ids) ? arc.sub_category_ids : []);
        setDepartmentId(arc.department_id || null);
        // C — floated_at lives only on the PUBLISHED event; hydrate doesn't
        // return it for a draft, so take the best available (explicit field →
        // submission_start_at) so the field is not left blank on resume.
        setCreatedAt(isoDateTime(arc.created_at));
        setFloatedAt(isoDateTime(body.floated_at || arc.submission_start_at));
        setSubmissionStart(isoDateTime(arc.submission_start_at));
        setSubmissionEnd(isoDateTime(arc.submission_end_at));
        setContractStart(isoDate(arc.contract_start_at));
        setContractEnd(isoDate(arc.contract_end_at));
        // E — keep a stable uid per item and remember its SERVER arc_item_id so
        // quotes/awards can be hydrated against the local uid, and so a later
        // awards/quotes autosave keys correctly (FE-02: awards state is fully
        // populated BEFORE any awards autosave can fire → no DELETE-from-empty).
        const idMap = {};                       // uid → server arc_item_id
        const uidByItemId = {};                 // server arc_item_id → uid
        const its = (body.items || []).map((it) => {
          const uid = `i${itemSeq.current++}`;
          if (it.id != null) { idMap[uid] = Number(it.id); uidByItemId[Number(it.id)] = uid; }
          return {
            uid,
            product_variant_id: it.product_variant_id,
            name: it.variant_name || `Variant #${it.product_variant_id}`,
            spec_text: it.spec_text || "",
            target_price: it.target_price != null ? String(it.target_price) : "",
            indicative_qty: it.indicative_qty != null ? String(it.indicative_qty) : "",
            uom: it.uom || "",
            hsn: it.hsn || "",
            _id: it.id,
          };
        });
        setItems(its);
        itemIdByUidRef.current = idMap;
        // D
        setSelectedVendorIds((body.invitations || []).map((i) => i.vendor_id));
        // F — quotes → quoteLines (keyed vendor_id + item uid) + quoteMeta.
        const qLines = {};
        const qMeta = {};
        for (const q of (body.quotes || [])) {
          const vid = q.vendor_id;
          qMeta[vid] = {
            submitted_at: isoDateTime(q.submitted_at),
            payment_terms: q.payment_terms || "",
            gstin_used: q.gstin_used || "",
          };
          for (const line of (q.lines || [])) {
            const uid = uidByItemId[Number(line.arc_item_id)];
            if (!uid) continue;
            qLines[vid] = qLines[vid] || {};
            qLines[vid][uid] = {
              rate: line.rate != null ? String(line.rate) : "",
              gst_pct: line.gst_pct != null ? String(line.gst_pct) : "",
              lead_time_days: line.lead_time_days != null ? String(line.lead_time_days) : "",
              moq: line.moq != null ? String(line.moq) : "",
            };
          }
        }
        setQuoteLines(qLines);
        setQuoteMeta(qMeta);
        // G — awards → awards[itemUid] = [{ vendor_id, allocated_qty }]
        //     (resolve server arc_item_id → local uid).
        const aw = {};
        for (const a of (body.awards || [])) {
          const uid = uidByItemId[Number(a.arc_item_id)];
          if (!uid) continue;
          aw[uid] = aw[uid] || [];
          aw[uid].push({ vendor_id: a.awarded_vendor_id, allocated_qty: a.allocated_qty != null ? String(a.allocated_qty) : "" });
        }
        setAwards(aw);
        setFinalizedAt(isoDateTime(body.comm_eval?.finalized_at));
        // J/K — contracts → contractDocs (generated/signed/document per vendor).
        const docs = {};
        for (const c of (body.contracts || [])) {
          docs[c.vendor_id] = {
            generated_at: isoDateTime(c.generated_at),
            signed_by_vendor_at: isoDateTime(c.signed_by_vendor_at),
            document_s3_url: c.document_s3_url || undefined,
            document_hash: c.document_hash || undefined,
          };
        }
        setContractDocs(docs);
        // H
        setPaymentTermsExpected(arc.payment_terms_expected || "");
        setDeliveryExpected(arc.delivery_expected || "");
        setPenaltyClause(arc.penalty_clause || "");
        // L
        if (me.committee_decision) setCommitteeDecision(me.committee_decision);
        setCommitteeDecidedAt(isoDateTime(me.committee_decided_at));
        setCommitteeDecidedBy(me.committee_decided_by != null ? String(me.committee_decided_by) : "");
        setCommitteeComment(me.committee_comment || "");
        showToast("Draft loaded");
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || "Could not load draft");
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.d]);

  // ── Derived ──
  const selectedHotel = useMemo(() => hotels.find((h) => h.id === hotelId), [hotels, hotelId]);
  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);
  // FE-03 — closed_no_award collapses groups D–G to optional. Derive awardedness
  // from the ENDED status (not merely disabling the checkbox while leaving
  // awarded=true): closed_no_award is never "awarded", so D/E/F/G become O.
  const isAwarded = stage === "ended" ? (endedStatus !== "closed_no_award" && awarded) : true;

  // Vendor list shown in group D: eligible-only, or all (override) with a flag.
  const vendorPickList = useMemo(() => {
    if (overrideEligibility) {
      const eligibleIds = new Set(eligibleVendors.map((v) => v.id));
      return (allVendors.length ? allVendors : eligibleVendors).map((v) => ({
        ...v, subscribed: v.subscribed != null ? v.subscribed : eligibleIds.has(v.id),
      }));
    }
    return eligibleVendors.map((v) => ({ ...v, subscribed: true }));
  }, [overrideEligibility, eligibleVendors, allVendors]);

  const selectedVendors = useMemo(
    () => vendorPickList.filter((v) => selectedVendorIds.includes(v.id)),
    [vendorPickList, selectedVendorIds]
  );
  function vendorName(id) {
    return (vendorPickList.find((v) => v.id === id) || eligibleVendors.find((v) => v.id === id) || {}).name || `Vendor #${id}`;
  }

  // group visibility/rule for the current stage
  const rules = useMemo(() => {
    const r = {};
    for (const g of GROUPS) r[g.id] = rule(g.id, stage, isAwarded);
    return r;
  }, [stage, isAwarded]);
  const visibleGroups = GROUPS.filter((g) => rules[g.id] !== "H");

  // ── Completeness per group (drives the rail dots + summary) ──
  function groupComplete(gid) {
    const req = rules[gid] === "R";
    switch (gid) {
      case "A": return !!title && !!type && (stage === "draft" || !!eligibilityType);
      case "B": return !!hotelId && !!categoryId && !!departmentId;
      case "C": {
        if (!createdAt) return false;
        if (stage !== "draft" && (!floatedAt || !submissionStart || !submissionEnd)) return false;
        if (["sig_pending","active","ended"].includes(stage) && (!contractStart || !contractEnd)) return false;
        return true;
      }
      case "D": return req ? selectedVendorIds.length > 0 : true;
      case "E": return items.length > 0 && items.every((it) => it.product_variant_id && num(it.indicative_qty) > 0 && !!it.uom);
      case "F": {
        if (rules.F !== "R") return true;
        return selectedVendorIds.length > 0 && items.some((it) =>
          selectedVendorIds.some((vid) => num(quoteLines[vid]?.[it.uid]?.rate) > 0));
      }
      case "G": {
        if (rules.G !== "R") return true;
        return items.every((it) => {
          const alloc = (awards[it.uid] || []).reduce((s, a) => s + num(a.allocated_qty), 0);
          return (awards[it.uid] || []).length > 0 && alloc === num(it.indicative_qty);
        }) && !!finalizedAt;
      }
      case "H": return req ? (!!paymentTermsExpected && !!deliveryExpected) : true;
      case "J": {
        if (rules.J === "A") return true;       // auto-generated (S3)
        if (rules.J !== "R") return true;
        return selectedVendors.every((v) => contractDocs[v.id]?.document_s3_url && contractDocs[v.id]?.generated_at);
      }
      case "K": {
        if (rules.K === "A") return true;
        if (rules.K !== "R") return true;
        return selectedVendors.every((v) => contractDocs[v.id]?.signed_by_vendor_at);
      }
      case "L": return req ? (!!committeeDecision && !!committeeDecidedAt && !!committeeDecidedBy) : true;
      default: return true;
    }
  }

  const completeness = useMemo(() => {
    const o = {};
    for (const g of visibleGroups) o[g.id] = groupComplete(g.id);
    return o;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleGroups, title, type, eligibilityType, hotelId, categoryId, departmentId, createdAt, floatedAt,
      submissionStart, submissionEnd, contractStart, contractEnd, selectedVendorIds, items, quoteLines,
      awards, finalizedAt, paymentTermsExpected, deliveryExpected, contractDocs, committeeDecision,
      committeeDecidedAt, committeeDecidedBy, stage, isAwarded]);

  const allRequiredComplete = visibleGroups
    .filter((g) => rules[g.id] === "R")
    .every((g) => completeness[g.id]);

  // ── Wizard steps (filtered by the chosen target stage) ──
  const steps = useMemo(
    () => STEP_DEFS.filter((s) => s.always || s.groups.some((g) => rules[g] !== "H")),
    [rules]
  );
  const clampedIdx = Math.max(0, Math.min(stepIdx, steps.length - 1));
  const current = steps[clampedIdx] || steps[0];
  const isLastStep = clampedIdx >= steps.length - 1;
  const inStep = (gid) => current.groups.includes(gid);

  // keep the step index valid when the step list changes (e.g. stage switch)
  useEffect(() => {
    setStepIdx((i) => Math.max(0, Math.min(i, steps.length - 1)));
  }, [steps.length]);

  // per-step status for the stepper: 'done' | 'todo' | 'optional'
  function stepStatus(step) {
    if (step.key === "review") return allRequiredComplete ? "done" : "todo";
    if (step.key === "stage") return "done";
    const req = step.groups.filter((g) => rules[g] === "R");
    if (!req.length) return "optional";
    return req.every((g) => completeness[g]) ? "done" : "todo";
  }
  function stepIndexForGroup(gid) {
    return steps.findIndex((s) => s.groups.includes(gid));
  }
  function gotoStep(i) {
    const next = Math.max(0, Math.min(i, steps.length - 1));
    setStepIdx(next);
    if (typeof window !== "undefined") {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
  }
  const goNext = () => gotoStep(clampedIdx + 1);
  const goBack = () => gotoStep(clampedIdx - 1);

  // ── Stage selection (warn on downgrade that hides filled groups) ──
  function pickStage(next) {
    if (next === stage) return;
    const curIdx = STAGES.findIndex((s) => s.key === stage);
    const nextIdx = STAGES.findIndex((s) => s.key === next);
    if (nextIdx < curIdx) {
      // would any currently-visible+filled group become hidden?
      const wouldHide = GROUPS.some((g) =>
        rules[g.id] !== "H" && rule(g.id, next, isAwarded) === "H" && completeness[g.id]);
      if (wouldHide && !window.confirm(
        "Switching to an earlier stage hides some groups you've already filled. Your data is kept on the server and simply won't be submitted for this stage. Continue?")) {
        return;
      }
    }
    setStage(next);
    markDirty();
  }

  // ── Save-draft (ensure ARC row exists, then bulk PATCH) ──
  const ensureDraft = useCallback(async () => {
    if (arcId) return arcId;
    const res = await ArcApi.createManualDraft({
      header: { arc_number: arcNumber || undefined, title, description, type, eligibility_type: eligibilityType,
        technical_response_required: technicalRequired, sample_required: sampleRequired },
      scope: { hotel_id: hotelId, category_id: categoryId, sub_category_ids: selectedSubCats, department_id: departmentId },
      provenance: { target_stage: stage, created_at: createdAt || undefined },
    });
    const body = res?.data || res || {};
    const id = body.arc?.id || body.id;
    if (!id) throw new Error("Could not create draft");
    setArcId(id);
    // reflect resume URL without a full nav
    router.replace({ pathname: router.pathname, query: { d: id } }, undefined, { shallow: true });
    return id;
  }, [arcId, arcNumber, title, description, type, eligibilityType, technicalRequired, sampleRequired,
      hotelId, categoryId, selectedSubCats, departmentId, stage, createdAt, router]);

  // FE-01 — collect the LIVE component state into the plain object the pure
  // payload builders consume. This is a plain function (NOT memoized), so every
  // caller reads FRESH state at call time — the stale-closure bug that the old
  // memoized autosaveSection + eslint-disable masked is gone. `selectedVendors`
  // is read from the ref so finalize/contract/signatures see the current list.
  const collectState = useCallback(() => ({
    arcNumber, title, description, type, eligibilityType, technicalRequired, sampleRequired,
    hotelId, categoryId, selectedSubCats, departmentId,
    stage, endedStatus, closedReason, awarded, overrideEligibility,
    createdAt, floatedAt, submissionStart, submissionEnd, contractStart, contractEnd,
    selectedVendorIds, selectedVendors,
    items, quoteLines, quoteMeta, awards, finalizedAt, contractDocs,
    paymentTermsExpected, deliveryExpected, penaltyClause,
    committeeDecision, committeeDecidedAt, committeeDecidedBy, committeeComment,
  }), [arcNumber, title, description, type, eligibilityType, technicalRequired, sampleRequired,
      hotelId, categoryId, selectedSubCats, departmentId,
      stage, endedStatus, closedReason, awarded, overrideEligibility,
      createdAt, floatedAt, submissionStart, submissionEnd, contractStart, contractEnd,
      selectedVendorIds, selectedVendors,
      items, quoteLines, quoteMeta, awards, finalizedAt, contractDocs,
      paymentTermsExpected, deliveryExpected, penaltyClause,
      committeeDecision, committeeDecidedAt, committeeDecidedBy, committeeComment]);

  // Re-hydrate items from the server and refresh uid→arc_item_id (by unique
  // product_variant_id) so subsequent quotes/awards autosaves carry real ids.
  const refreshItemIds = useCallback(async (id) => {
    try {
      const res = await ArcApi.getManualDraft(id);
      const body = res?.data || res || {};
      const serverItems = body.items || [];
      const byVariant = new Map(serverItems.map((si) => [Number(si.product_variant_id), Number(si.id)]));
      const map = {};
      setItems((cur) => cur.map((it) => {
        const sid = byVariant.get(Number(it.product_variant_id));
        if (sid != null) { map[it.uid] = sid; return { ...it, _id: sid }; }
        return it;
      }));
      itemIdByUidRef.current = { ...itemIdByUidRef.current, ...map };
    } catch { /* non-fatal — next save retries */ }
  }, []);

  // Section autosave on blur — PUT a single section. FE-01: builds the payload
  // from FRESH state via buildSectionPayload (the same code the test covers), so
  // the "Saved" chip reflects a confirmed save of CURRENT data, not a stale one.
  const autosaveSection = useCallback(async (section) => {
    if (busy || resuming) return;
    const st = collectState();
    // Until the draft row exists the server needs the minimum create fields
    // (title + hotel + category + department, all NOT NULL on tbl_arc). Don't
    // fire autosave — or surface the server's "…required" error — on blur
    // before those exist. The data stays in local state and is persisted on
    // Save draft / Finalize, or by the first autosave once prerequisites are met.
    if (!arcId && !(st.title && st.hotelId && st.categoryId && st.departmentId)) return;
    try {
      const id = await ensureDraft();
      setSaveState("saving");
      // Items must be persisted before quotes/awards so their arc_item_id keys
      // resolve. If we're saving quotes/awards but some items are unsaved, flush
      // items first and learn their server ids.
      if ((section === "quotes" || section === "awards")
          && items.some((it) => it._id == null && itemIdByUidRef.current[it.uid] == null)) {
        await ArcApi.saveManualSection(id, "items", buildSectionPayload("items", st));
        await refreshItemIds(id);
      }
      const body = buildSectionPayload(section, st, itemIdByUidRef.current);
      await ArcApi.saveManualSection(id, section, body);
      // After items save, learn the server ids so quotes/awards can key off them.
      if (section === "items") await refreshItemIds(id);
      setSaveState("saved");
    } catch (e) {
      // Autosave is best-effort: reflect failure on the status chip only (no
      // disruptive blur-time toast). Real validation is surfaced when the user
      // explicitly clicks Save draft or Finalize.
      setSaveState("error");
    }
  }, [busy, resuming, arcId, ensureDraft, items, collectState, refreshItemIds]);

  async function saveDraft() {
    if (busy) return;
    setBusy(true); setError(null); setSaveState("saving");
    try {
      const id = await ensureDraft();
      // Persist items first so the bulk patch carries resolvable arc_item_ids.
      await ArcApi.saveManualSection(id, "items", buildSectionPayload("items", collectState()));
      await refreshItemIds(id);
      await ArcApi.patchManualDraft(id, buildDraftPayload(collectState(), itemIdByUidRef.current));
      setSaveState("saved");
      showToast("Draft saved");
    } catch (e) {
      setSaveState("error");
      setError(e?.response?.data?.message || e?.message || "Could not save draft");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (busy) return;
    if (!allRequiredComplete) {
      // jump to the step holding the first incomplete required group
      const firstBad = visibleGroups.find((g) => rules[g.id] === "R" && !completeness[g.id]);
      if (firstBad) {
        const si = stepIndexForGroup(firstBad.id);
        if (si >= 0) gotoStep(si);
        showToast(`Complete "${firstBad.title}" before finalising.`);
      }
      return;
    }
    setBusy(true); setError(null);
    try {
      const id = await ensureDraft();
      // SC-2 — persist the full graph through the per-section endpoints in the
      // controller's order (items → vendors → quotes → awards → approvals) so
      // every section lands in its canonical shape with resolved arc_item_ids
      // BEFORE the atomic finalize reads them back from the DB.
      const st = collectState();
      await ArcApi.saveManualSection(id, "items", buildSectionPayload("items", st));
      await refreshItemIds(id);
      const st2 = collectState();
      const idMap = itemIdByUidRef.current;
      if (rule("D", stage, isAwarded) !== "H") await ArcApi.saveManualSection(id, "vendors", buildSectionPayload("vendors", st2, idMap));
      if (rule("F", stage, isAwarded) !== "H") await ArcApi.saveManualSection(id, "quotes", buildSectionPayload("quotes", st2, idMap));
      if (rule("G", stage, isAwarded) !== "H" && isAwarded) await ArcApi.saveManualSection(id, "awards", buildSectionPayload("awards", st2, idMap));
      if (rule("H", stage, isAwarded) !== "H") await ArcApi.saveManualSection(id, "terms", buildSectionPayload("terms", st2, idMap));
      if (rule("L", stage, isAwarded) !== "H") await ArcApi.saveManualSection(id, "approvals", buildSectionPayload("approvals", st2, idMap));
      // SC-1 — send the FULL top-level finalize payload (all backdated dates +
      // ended_sub_status/closed_reason/was_awarded/committee_*), not {confirm:true}.
      const res = await ArcApi.finalizeManualArc(id, buildFinalizePayload(st2));
      const body = res?.data || res || {};
      const newId = body.arc?.id || id;
      showToast("ARC finalised");
      router.push(`/dashboard/buyer/rate-contracts/${newId}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Could not finalise");
      setBusy(false);
    }
  }

  // ── Item / vendor / quote / award mutators ──
  function addItem(v) {
    setItems((cur) => {
      if (cur.some((it) => it.product_variant_id === v.id)) return cur;
      return [...cur, { uid: `i${itemSeq.current++}`, product_variant_id: v.id, name: v.name || v.slug || `Variant #${v.id}`,
        spec_text: "", target_price: "", indicative_qty: "", uom: v.uom || "", hsn: "" }];
    });
    markDirty();
  }
  function updateItem(uid, patch) { setItems((cur) => cur.map((it) => it.uid === uid ? { ...it, ...patch } : it)); markDirty(); }
  function removeItem(uid) {
    setItems((cur) => cur.filter((it) => it.uid !== uid));
    setAwards((a) => { const n = { ...a }; delete n[uid]; return n; });
    markDirty();
  }
  function toggleVendor(id) {
    setSelectedVendorIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    markDirty();
  }
  function setQuoteLine(vid, uid, patch) {
    setQuoteLines((q) => ({ ...q, [vid]: { ...(q[vid] || {}), [uid]: { ...(q[vid]?.[uid] || {}), ...patch } } }));
    markDirty();
  }
  function setQuoteMetaFor(vid, patch) { setQuoteMeta((m) => ({ ...m, [vid]: { ...(m[vid] || {}), ...patch } })); markDirty(); }
  function setAward(uid, vendorId, allocated_qty) {
    setAwards((a) => {
      const rows = a[uid] || [];
      const exists = rows.find((r) => r.vendor_id === vendorId);
      let next;
      if (allocated_qty === "" || allocated_qty == null) next = rows.filter((r) => r.vendor_id !== vendorId);
      else if (exists) next = rows.map((r) => r.vendor_id === vendorId ? { ...r, allocated_qty } : r);
      else next = [...rows, { vendor_id: vendorId, allocated_qty }];
      return { ...a, [uid]: next };
    });
    markDirty();
  }
  function setContractDoc(vid, patch) { setContractDocs((c) => ({ ...c, [vid]: { ...(c[vid] || {}), ...patch } })); markDirty(); }

  async function uploadDoc(vid, file) {
    if (!file) return;
    if (stage === "sig_pending") { showToast("S3 documents auto-generate on vendor sign — no upload here."); return; }
    try {
      const id = await ensureDraft();
      setContractDoc(vid, { uploading: true });
      const fd = new FormData();
      fd.append("file", file);
      const res = await ArcApi.uploadManualContractDoc(id, vid, fd);
      const body = res?.data || res || {};
      setContractDoc(vid, { uploading: false, file, document_s3_url: body.document_s3_url, document_hash: body.document_hash });
      showToast("Signed PDF uploaded");
    } catch (e) {
      setContractDoc(vid, { uploading: false });
      showToast(e?.response?.data?.message || "Upload failed");
    }
  }

  // ── render helpers ──
  const guide = STAGE_GUIDE[stage];

  function RuleBadge({ gid }) {
    const r = rules[gid];
    const b = RULE_BADGE[r] || RULE_BADGE.O;
    const complete = completeness[gid];
    let cls = "pill", text = b.label;
    if (r === "R") { cls = complete ? "status-pill" : "needs-action-pill"; text = complete ? "Complete" : "Required"; }
    else if (r === "A") { cls = "pill"; }
    return <span className={cls} style={r === "A" ? { color: "var(--violet)", background: "var(--violet-soft)", borderColor: "rgba(109,40,217,0.18)" } : undefined}>{text}</span>;
  }

  // a section card — only renders when its group belongs to the active step and
  // is not hidden for the current stage; shows the title + a Required/Optional badge.
  function Section({ g, children }) {
    if (rules[g.id] === "H") return null;
    if (!current.groups.includes(g.id)) return null;
    return (
      <div className="section-card" id={`sec-${g.key}`}>
        <div className="section-head">
          <strong style={{ fontSize: 14 }}>{g.title}</strong>
          <RuleBadge gid={g.id} />
        </div>
        <div className="section-body">{children}</div>
      </div>
    );
  }

  const numericContract = stage === "ended" ? endedStatus : (
    stage === "active" ? "contract_active" :
    stage === "sig_pending" ? "awaiting_vendor_acceptance" : null);

  return (
    <div className="main-body" style={{ paddingBottom: 96 }}>
      {/* ── Header (full width — shares the grid's left edge) ── */}
      <header className="me-head">
        <div className="me-head-text">
          <h1 className="page-h1">Manual ARC Entry</h1>
          <p className="page-sub">Reconstruct a historical or in-flight rate contract — one step at a time.</p>
        </div>
        <SaveChip state={saveState} />
      </header>

      {error && <div className="guide danger" style={{ marginTop: 14 }}><span className="g-ic"><InfoIcon /></span><div><strong>Error.</strong> {error}</div></div>}

      {/* ── Two-column workspace: vertical step rail + content ── */}
      <div className="me-grid">
        {/* vertical step rail (sticky side, not a top banner) */}
        <aside className="me-rail" aria-label="Manual entry steps">
          {steps.map((s, i) => {
            const status = stepStatus(s);
            const isCurrent = i === clampedIdx;
            const showCheck = status === "done" && !isCurrent;
            const cls = isCurrent ? "current" : (showCheck ? "checked" : "");
            const stateText = isCurrent ? "In progress" : status === "done" ? "Done" : status === "optional" ? "Optional" : "Required";
            return (
              <button key={s.key} type="button"
                      className={`me-rail-item ${cls} ${i < clampedIdx ? "reached" : ""}`}
                      aria-current={isCurrent ? "step" : undefined}
                      onClick={() => gotoStep(i)}>
                <span className="me-rail-num mono">{showCheck ? <CheckIcon size={14} /> : i + 1}</span>
                <span className="me-rail-text">
                  <span className="me-rail-label">{s.label}</span>
                  <span className="me-rail-state">{stateText}</span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* active step content */}
        <div className="me-main" key={current.key}>
        {resuming && <div className="guide"><span className="g-ic"><InfoIcon /></span><div>Loading saved draft…</div></div>}

        <div className="me-step-head">
          <h2>{current.label}</h2>
          <p>{STEP_INTRO[current.key]}</p>
        </div>

        {/* Step · Stage (the master choice) */}
        {current.key === "stage" && (
          <div className="section-card">
            <div className="section-body">
              <label className="label">Target stage <span className="req">*</span></label>
              <div className="cat-grid stage-grid" style={{ marginTop: 8 }}>
                {STAGES.map((s) => (
                  <button key={s.key} type="button"
                          className={`cat-card stage-card ${stage === s.key ? "selected" : ""}`}
                          onClick={() => pickStage(s.key)}>
                    <div className="cc-ic mono" style={{ fontSize: 12, fontWeight: 700 }}>{s.n}</div>
                    <div>
                      <div className="cc-name">{s.label}</div>
                      <div className="cc-meta">{s.meta}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className={`guide ${guide.tone}`} style={{ marginTop: 14 }}>
                <span className="g-ic"><InfoIcon /></span>
                <div>{guide.text}</div>
              </div>
              {stage === "ended" && (
                <div className="form-grid cols-3" style={{ marginTop: 14 }}>
                  <div>
                    <label className="label">End status <span className="req">*</span></label>
                    <select className="select" value={endedStatus} onChange={(e) => { setEndedStatus(e.target.value); markDirty(); }}>
                      <option value="expired">Expired</option>
                      <option value="terminated">Terminated</option>
                      <option value="closed_no_award">Closed — no award</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <label className="cbx">
                      <input type="checkbox" checked={awarded} disabled={endedStatus === "closed_no_award"}
                             onChange={(e) => { setAwarded(e.target.checked); markDirty(); }} />
                      Was this awarded before it ended?
                    </label>
                  </div>
                  {(endedStatus === "terminated" || endedStatus === "closed_no_award") && (
                    <div className="span-3" style={{ gridColumn: "span 3" }}>
                      <label className="label">{endedStatus === "terminated" ? "Termination reason" : "Closed reason"} <span className="req">*</span></label>
                      <textarea className="textarea" value={closedReason} onBlur={() => autosaveSection("provenance")}
                                onChange={(e) => { setClosedReason(e.target.value); markDirty(); }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

          {/* A — header */}
          <Section g={GROUPS[0]}>
            <div className="form-grid">
              <div>
                <label className="label">ARC number <span className="muted-hint">(blank → auto-generated)</span></label>
                <input className="input mono" value={arcNumber} placeholder="ARC-2024-014"
                       onBlur={() => autosaveSection("header")}
                       onChange={(e) => { setArcNumber(e.target.value); markDirty(); }} />
              </div>
              <div>
                <label className="label">Title <span className="req">*</span></label>
                <input className="input" value={title} placeholder="e.g. Vegetable supplies · FY24"
                       onBlur={() => autosaveSection("header")}
                       onChange={(e) => { setTitle(e.target.value); markDirty(); }} />
              </div>
              <div className="span-2">
                <label className="label">Description</label>
                <textarea className="textarea" value={description}
                          onBlur={() => autosaveSection("header")}
                          onChange={(e) => { setDescription(e.target.value); markDirty(); }} />
              </div>
            </div>
            <div className="form-grid cols-3" style={{ marginTop: 14 }}>
              <div>
                <label className="label">Type <span className="req">*</span></label>
                <select className="select" value={type} onBlur={() => autosaveSection("header")}
                        onChange={(e) => { setType(e.target.value); markDirty(); }}>
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <div>
                <label className="label">Eligibility {stage !== "draft" && <span className="req">*</span>}</label>
                <select className="select" value={eligibilityType} onBlur={() => autosaveSection("header")}
                        onChange={(e) => { setEligibilityType(e.target.value); markDirty(); }}>
                  <option value="open">Open</option>
                  <option value="invitation">Invitation</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                <label className="cbx"><input type="checkbox" checked={technicalRequired}
                       onChange={(e) => { setTechnicalRequired(e.target.checked); markDirty(); autosaveSection("header"); }} /> Technical response required</label>
                <label className="cbx"><input type="checkbox" checked={sampleRequired}
                       onChange={(e) => { setSampleRequired(e.target.checked); markDirty(); autosaveSection("header"); }} /> Sample required</label>
              </div>
            </div>
          </Section>

          {/* B — scope */}
          <Section g={GROUPS[1]}>
            <label className="label">Business unit (hotel) <span className="req">*</span></label>
            <div className="cat-grid">
              {hotels.map((h) => (
                <button key={h.id} type="button" className={`cat-card ${hotelId === h.id ? "selected" : ""}`}
                        onClick={() => { setHotelId(h.id); setDepartmentId(null); markDirty(); }}>
                  <div className="cc-ic mono" style={{ fontSize: 11 }}>{initialsFor(h.name)}</div>
                  <div><div className="cc-name">{h.name}</div><div className="cc-meta">{h.city || "—"}</div></div>
                </button>
              ))}
            </div>
            <label className="label" style={{ marginTop: 18 }}>Category <span className="req">*</span></label>
            <div className="cat-grid">
              {categories.map((c) => (
                <button key={c.id} type="button" className={`cat-card ${categoryId === c.id ? "selected" : ""}`}
                        onClick={() => { setCategoryId(c.id); setSelectedSubCats([]); markDirty(); }}>
                  <div className="cc-ic mono" style={{ fontSize: 11 }}>{initialsFor(c.title)}</div>
                  <div><div className="cc-name">{c.title}</div></div>
                </button>
              ))}
            </div>
            {subCats.length > 0 && (
              <>
                <label className="label" style={{ marginTop: 18 }}>Sub-categories (optional)</label>
                <div className="sub-chips">
                  {subCats.map((s) => (
                    <button key={s.id} type="button" className={`sub-chip ${selectedSubCats.includes(s.id) ? "selected" : ""}`}
                            onClick={() => { setSelectedSubCats((cur) => cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]); markDirty(); }}>
                      {s.title}
                    </button>
                  ))}
                </div>
              </>
            )}
            {departments.length > 0 && (
              <>
                <label className="label" style={{ marginTop: 18 }}>Department <span className="req">*</span></label>
                <div className="sub-chips">
                  {departments.map((d) => (
                    <button key={d.id} type="button" className={`sub-chip ${departmentId === d.id ? "selected" : ""}`}
                            onClick={() => { setDepartmentId(d.id); markDirty(); autosaveSection("scope"); }}>
                      {d.name || d.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Section>

          {/* C — provenance / backdating */}
          <Section g={GROUPS[2]}>
            <div className="form-grid cols-3">
              <div>
                <label className="label">Created at <span className="req">*</span></label>
                <input type="datetime-local" className="input mono" value={createdAt}
                       onBlur={() => autosaveSection("provenance")}
                       onChange={(e) => { setCreatedAt(e.target.value); markDirty(); }} />
              </div>
              {stage !== "draft" && (
                <>
                  <div>
                    <label className="label">Floated at <span className="req">*</span></label>
                    <input type="datetime-local" className="input mono" value={floatedAt}
                           onBlur={() => autosaveSection("provenance")}
                           onChange={(e) => { setFloatedAt(e.target.value); markDirty(); }} />
                  </div>
                  <div>
                    <label className="label">Submission start <span className="req">*</span></label>
                    <input type="datetime-local" className="input mono" value={submissionStart}
                           onBlur={() => autosaveSection("provenance")}
                           onChange={(e) => { setSubmissionStart(e.target.value); markDirty(); }} />
                  </div>
                  <div>
                    <label className="label">Submission end <span className="req">*</span></label>
                    <input type="datetime-local" className="input mono" value={submissionEnd}
                           onBlur={() => autosaveSection("provenance")}
                           onChange={(e) => { setSubmissionEnd(e.target.value); markDirty(); }} />
                  </div>
                </>
              )}
              {["sig_pending","active","ended"].includes(stage) && (
                <>
                  <div>
                    <label className="label">Contract start <span className="req">*</span></label>
                    <input type="date" className="input mono" value={contractStart}
                           onBlur={() => autosaveSection("provenance")}
                           onChange={(e) => { setContractStart(e.target.value); markDirty(); }} />
                  </div>
                  <div>
                    <label className="label">Contract end <span className="req">*</span></label>
                    <input type="date" className="input mono" value={contractEnd}
                           onBlur={() => autosaveSection("provenance")}
                           onChange={(e) => { setContractEnd(e.target.value); markDirty(); }} />
                  </div>
                </>
              )}
            </div>
            <div className="guide" style={{ marginTop: 12 }}>
              <span className="g-ic"><InfoIcon /></span>
              <div>Dates must be ordered (created ≤ floated ≤ submission start &lt; end ≤ contract start &lt; end) and not in the future — the server enforces this on finalise.</div>
            </div>
          </Section>

          {/* D — vendors */}
          <Section g={GROUPS[3]}>
            {!hotelId || !categoryId ? (
              <div className="empty-state"><p className="text-fg-3">Pick a business unit and category (Scope) to load eligible vendors.</p></div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <span className="section-label">Subscribed to {selectedHotel?.name || "this BU"} / {selectedCategory?.title || "category"}</span>
                  <label className="cbx" style={{ fontSize: 12 }}>
                    <input type="checkbox" checked={overrideEligibility}
                           onChange={(e) => { setOverrideEligibility(e.target.checked); markDirty(); }} />
                    Show all vendors / override eligibility
                  </label>
                </div>
                {vendorPickList.length === 0 ? (
                  <div className="empty-state"><p className="text-fg-3">No vendors found for this scope.</p></div>
                ) : vendorPickList.map((v) => {
                  const picked = selectedVendorIds.includes(v.id);
                  return (
                    <div key={v.id} className={`vendor-pick-row ${picked ? "selected" : ""}`}
                         onClick={() => toggleVendor(v.id)}>
                      <span className="vpr-check">{picked && <CheckIcon size={12} />}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span className={`avatar ${avClassFor(v.id)}`} style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{initialsFor(v.name)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{v.email || v.mobile || "—"}</div>
                        </div>
                      </div>
                      <span />
                      <span />
                      {overrideEligibility && !v.subscribed && (
                        <span className="needs-action-pill">Not currently subscribed</span>
                      )}
                    </div>
                  );
                })}
                {overrideEligibility && (
                  <div className="guide warn" style={{ marginTop: 12 }}>
                    <span className="g-ic"><InfoIcon /></span>
                    <div>Selecting an unsubscribed vendor records <strong>eligibility_overridden</strong> on this ARC for audit.</div>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* E — rate schedule / line items */}
          <Section g={GROUPS[4]}>
            <div className="search-input" style={{ marginBottom: 12 }}>
              <SearchIcon />
              <input className="input" placeholder={`Search ${selectedCategory?.title || "catalogue"}…`}
                     value={variantSearch} disabled={!categoryId}
                     onChange={(e) => setVariantSearch(e.target.value)} />
            </div>
            {loadingVariants && <div className="text-fg-3" style={{ fontSize: 12, padding: "4px 0" }}>Searching…</div>}
            {categoryId && variants.length > 0 && (
              <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 14 }}>
                {variants.map((v) => {
                  const added = items.some((it) => it.product_variant_id === v.id);
                  return (
                    <div key={v.id} className={`item-row ${added ? "selected" : ""}`} onClick={() => !added && addItem(v)}>
                      <span className="ir-check">{added && <CheckIcon size={11} />}</span>
                      <div className="ir-meta"><div className="ir-name">{v.name}</div><div className="ir-sub">{v.slug || ""}</div></div>
                      {added ? <span className="ir-tag">Added</span> : <span className="ir-tag"><PlusIcon /> Add</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {items.length === 0 ? (
              <div className="empty-state"><p className="text-fg-3">No line items yet — search and add the first product.</p></div>
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="text-right">Qty</th>
                      <th>UOM</th>
                      <th className="text-right">Target ₹</th>
                      <th>HSN</th>
                      <th>Spec</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.uid}>
                        <td style={{ fontWeight: 600 }}>{it.name}</td>
                        <td className="text-right">
                          <input className="input input-num" style={{ width: 90 }} type="number" min="0" value={it.indicative_qty}
                                 onBlur={() => autosaveSection("items")}
                                 onChange={(e) => updateItem(it.uid, { indicative_qty: e.target.value })} />
                        </td>
                        <td>
                          <input className="input" style={{ width: 80 }} value={it.uom}
                                 onBlur={() => autosaveSection("items")}
                                 onChange={(e) => updateItem(it.uid, { uom: e.target.value })} />
                        </td>
                        <td className="text-right">
                          <input className="input input-num" style={{ width: 100 }} type="number" min="0" value={it.target_price}
                                 onBlur={() => autosaveSection("items")}
                                 onChange={(e) => updateItem(it.uid, { target_price: e.target.value })} />
                        </td>
                        <td>
                          <input className="input mono" style={{ width: 90 }} value={it.hsn} placeholder="HSN"
                                 onBlur={() => autosaveSection("items")}
                                 onChange={(e) => updateItem(it.uid, { hsn: e.target.value })} />
                        </td>
                        <td>
                          <input className="input" style={{ minWidth: 140 }} value={it.spec_text} placeholder="spec…"
                                 onBlur={() => autosaveSection("items")}
                                 onChange={(e) => updateItem(it.uid, { spec_text: e.target.value })} />
                        </td>
                        <td><button className="icon-btn" onClick={() => removeItem(it.uid)} title="Remove"><TrashIcon /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* F — vendor quotes (per vendor × item) */}
          <Section g={GROUPS[5]}>
            {selectedVendors.length === 0 || items.length === 0 ? (
              <div className="empty-state"><p className="text-fg-3">Select vendors (Parties) and add line items first.</p></div>
            ) : selectedVendors.map((v) => (
              <div key={v.id} className="section-card" style={{ marginBottom: 12 }}>
                <div className="section-head">
                  <strong style={{ fontSize: 13 }}>{v.name}</strong>
                </div>
                <div className="section-body">
                  <div className="form-grid cols-3" style={{ marginBottom: 12 }}>
                    <div>
                      <label className="label">Submitted at {rules.F === "R" && <span className="req">*</span>}</label>
                      <input type="datetime-local" className="input mono" value={quoteMeta[v.id]?.submitted_at || ""}
                             onBlur={() => autosaveSection("quotes")}
                             onChange={(e) => setQuoteMetaFor(v.id, { submitted_at: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Payment terms (quote)</label>
                      <input className="input" value={quoteMeta[v.id]?.payment_terms || ""}
                             onBlur={() => autosaveSection("quotes")}
                             onChange={(e) => setQuoteMetaFor(v.id, { payment_terms: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">GSTIN used</label>
                      <input className="input mono" value={quoteMeta[v.id]?.gstin_used || ""} placeholder="22AAAAA0000A1Z5"
                             onBlur={() => autosaveSection("quotes")}
                             onChange={(e) => setQuoteMetaFor(v.id, { gstin_used: e.target.value })} />
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table className="table">
                      <thead>
                        <tr><th>Item</th><th className="text-right">Rate ₹</th><th className="text-right">GST %</th><th className="text-right">Lead (d)</th><th className="text-right">MOQ</th></tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const ql = quoteLines[v.id]?.[it.uid] || {};
                          return (
                            <tr key={it.uid}>
                              <td style={{ fontWeight: 600 }}>{it.name}</td>
                              <td className="text-right"><input className="input input-num" style={{ width: 90 }} type="number" min="0" value={ql.rate ?? ""} onBlur={() => autosaveSection("quotes")} onChange={(e) => setQuoteLine(v.id, it.uid, { rate: e.target.value })} /></td>
                              <td className="text-right"><input className="input input-num" style={{ width: 70 }} type="number" min="0" max="100" value={ql.gst_pct ?? ""} onBlur={() => autosaveSection("quotes")} onChange={(e) => setQuoteLine(v.id, it.uid, { gst_pct: e.target.value })} /></td>
                              <td className="text-right"><input className="input input-num" style={{ width: 70 }} type="number" min="0" value={ql.lead_time_days ?? ""} onBlur={() => autosaveSection("quotes")} onChange={(e) => setQuoteLine(v.id, it.uid, { lead_time_days: e.target.value })} /></td>
                              <td className="text-right"><input className="input input-num" style={{ width: 70 }} type="number" min="0" value={ql.moq ?? ""} onBlur={() => autosaveSection("quotes")} onChange={(e) => setQuoteLine(v.id, it.uid, { moq: e.target.value })} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          {/* G — commercial eval / awards */}
          <Section g={GROUPS[6]}>
            {items.length === 0 || selectedVendors.length === 0 ? (
              <div className="empty-state"><p className="text-fg-3">Add items and vendor quotes to allocate awards.</p></div>
            ) : (
              <>
                <div style={{ marginBottom: 12, maxWidth: 320 }}>
                  <label className="label">Commercial evaluation finalized at {rules.G === "R" && <span className="req">*</span>}</label>
                  <input type="datetime-local" className="input mono" value={finalizedAt}
                         onBlur={() => autosaveSection("awards")}
                         onChange={(e) => { setFinalizedAt(e.target.value); markDirty(); }} />
                </div>
                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th><th className="text-right">Indicative</th>
                        {selectedVendors.map((v) => <th key={v.id} className="text-right">{v.name}</th>)}
                        <th className="text-right">Allocated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const alloc = (awards[it.uid] || []).reduce((s, a) => s + num(a.allocated_qty), 0);
                        const balanced = alloc === num(it.indicative_qty);
                        return (
                          <tr key={it.uid}>
                            <td style={{ fontWeight: 600 }}>{it.name}</td>
                            <td className="text-right mono">{it.indicative_qty || "—"}</td>
                            {selectedVendors.map((v) => {
                              const row = (awards[it.uid] || []).find((a) => a.vendor_id === v.id);
                              return (
                                <td key={v.id} className="text-right">
                                  <input className="input input-num" style={{ width: 80 }} type="number" min="0"
                                         value={row?.allocated_qty ?? ""}
                                         onBlur={() => autosaveSection("awards")}
                                         onChange={(e) => setAward(it.uid, v.id, e.target.value)} />
                                </td>
                              );
                            })}
                            <td className="text-right mono" style={{ color: balanced ? "var(--success)" : "var(--danger)" }}>{alloc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="guide" style={{ marginTop: 12 }}>
                  <span className="g-ic"><InfoIcon /></span>
                  <div>Allocated quantity per item must equal the indicative quantity (split awards allowed across vendors).</div>
                </div>
              </>
            )}
          </Section>

          {/* H — commercial terms */}
          <Section g={GROUPS[7]}>
            <div className="form-grid">
              <div>
                <label className="label">Payment terms (expected) {rules.H === "R" && <span className="req">*</span>}</label>
                <input className="input" value={paymentTermsExpected} placeholder="e.g. Net 30"
                       onBlur={() => autosaveSection("terms")}
                       onChange={(e) => { setPaymentTermsExpected(e.target.value); markDirty(); }} />
              </div>
              <div>
                <label className="label">Delivery (expected) {rules.H === "R" && <span className="req">*</span>}</label>
                <input className="input" value={deliveryExpected} placeholder="e.g. Within 21 days of each PO"
                       onBlur={() => autosaveSection("terms")}
                       onChange={(e) => { setDeliveryExpected(e.target.value); markDirty(); }} />
              </div>
              <div className="span-2">
                <label className="label">Penalty / LD clause</label>
                <textarea className="textarea" value={penaltyClause}
                          onBlur={() => autosaveSection("terms")}
                          onChange={(e) => { setPenaltyClause(e.target.value); markDirty(); }} />
              </div>
            </div>
          </Section>

          {/* I — quality / compliance (vendor-master, read-only note) */}
          <Section g={GROUPS[8]}>
            <div className="guide violet">
              <span className="g-ic"><InfoIcon /></span>
              <div>Quality / compliance (FSSAI, HACCP, ISO, MSME/Udyam, GSTIN) are <strong>vendor-master</strong> attributes and are surfaced read-only from the vendor profile — they are not entered per-ARC in V1.</div>
            </div>
          </Section>

          {/* J — contract & document */}
          <Section g={GROUPS[9]}>
            {rules.J === "A" ? (
              <div className="guide violet">
                <span className="g-ic"><InfoIcon /></span>
                <div>The contract rows + signed PDF are <strong>generated automatically</strong> when the vendor e-signs via the portal OTP flow. Nothing to upload here.</div>
              </div>
            ) : selectedVendors.length === 0 ? (
              <div className="empty-state"><p className="text-fg-3">Award at least one vendor to record a contract.</p></div>
            ) : selectedVendors.map((v) => {
              const doc = contractDocs[v.id] || {};
              return (
                <div key={v.id} className="section-card" style={{ marginBottom: 12 }}>
                  <div className="section-head"><strong style={{ fontSize: 13 }}>{v.name}</strong>{numericContract && <StageBadge status={numericContract} />}</div>
                  <div className="section-body">
                    <div className="form-grid cols-3">
                      <div>
                        <label className="label">Signed PDF {rules.J === "R" && <span className="req">*</span>}</label>
                        {doc.document_s3_url ? (
                          <span className="file-chip-mini"><CheckIcon size={11} /> {doc.file?.name || "uploaded.pdf"}</span>
                        ) : (
                          <input type="file" accept="application/pdf" disabled={doc.uploading}
                                 onChange={(e) => uploadDoc(v.id, e.target.files?.[0])} />
                        )}
                      </div>
                      <div>
                        <label className="label">Generated at {rules.J === "R" && <span className="req">*</span>}</label>
                        <input type="datetime-local" className="input mono" value={doc.generated_at || ""}
                               onBlur={() => autosaveSection("contract")}
                               onChange={(e) => setContractDoc(v.id, { generated_at: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Section>

          {/* K — signatures */}
          <Section g={GROUPS[10]}>
            {rules.K === "A" ? (
              <div className="guide violet"><span className="g-ic"><InfoIcon /></span><div>Signature timestamp is captured automatically by the vendor OTP sign flow.</div></div>
            ) : selectedVendors.length === 0 ? (
              <div className="empty-state"><p className="text-fg-3">No awarded vendors yet.</p></div>
            ) : (
              <div className="form-grid">
                {selectedVendors.map((v) => (
                  <div key={v.id}>
                    <label className="label">{v.name} — signed by vendor at {rules.K === "R" && <span className="req">*</span>}</label>
                    <input type="datetime-local" className="input mono" value={contractDocs[v.id]?.signed_by_vendor_at || ""}
                           onBlur={() => autosaveSection("signatures")}
                           onChange={(e) => setContractDoc(v.id, { signed_by_vendor_at: e.target.value })} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* L — approvals (committee outcome snapshot) */}
          <Section g={GROUPS[11]}>
            <div className="form-grid cols-3">
              <div>
                <label className="label">Committee decision {rules.L === "R" && <span className="req">*</span>}</label>
                <select className="select" value={committeeDecision} onBlur={() => autosaveSection("approvals")}
                        onChange={(e) => { setCommitteeDecision(e.target.value); markDirty(); }}>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="label">Decided at {rules.L === "R" && <span className="req">*</span>}</label>
                <input type="datetime-local" className="input mono" value={committeeDecidedAt}
                       onBlur={() => autosaveSection("approvals")}
                       onChange={(e) => { setCommitteeDecidedAt(e.target.value); markDirty(); }} />
              </div>
              <div>
                <label className="label">Decided by (user id) {rules.L === "R" && <span className="req">*</span>}</label>
                <input className="input mono" type="number" value={committeeDecidedBy}
                       onBlur={() => autosaveSection("approvals")}
                       onChange={(e) => { setCommitteeDecidedBy(e.target.value); markDirty(); }} />
              </div>
              <div className="span-3" style={{ gridColumn: "span 3" }}>
                <label className="label">Committee comment</label>
                <textarea className="textarea" value={committeeComment}
                          onBlur={() => autosaveSection("approvals")}
                          onChange={(e) => { setCommitteeComment(e.target.value); markDirty(); }} />
              </div>
            </div>
            <div className="guide" style={{ marginTop: 12 }}>
              <span className="g-ic"><InfoIcon /></span>
              <div>Recorded as a committee <strong>outcome snapshot</strong> — no live approval instance is created and no approval notifications fire for backfill.</div>
            </div>
          </Section>

        {/* Step · Review & finalise */}
        {current.key === "review" && (
          <div className="me-review">
            <div className="section-card">
              <div className="section-head"><strong style={{ fontSize: 14 }}>Summary</strong></div>
              <div className="section-body">
                <div className="kv-grid">
                  <span className="text-fg-3">Business unit</span><span>{selectedHotel?.name || "—"}</span>
                  <span className="text-fg-3">Category</span><span>{selectedCategory?.title || "—"}</span>
                  <span className="text-fg-3">Department</span><span>{departments.find((d) => d.id === departmentId)?.name || departments.find((d) => d.id === departmentId)?.title || "—"}</span>
                  <span className="text-fg-3">Target stage</span><span>{STAGES.find((s) => s.key === stage)?.label}</span>
                  <span className="text-fg-3">Validity</span><span className="mono">{contractStart || "—"}{contractEnd ? ` → ${contractEnd}` : ""}</span>
                  <span className="text-fg-3">Line items</span><span className="mono">{items.length}</span>
                  <span className="text-fg-3">Vendors</span><span className="mono">{selectedVendorIds.length}</span>
                  <span className="text-fg-3">Awarded items</span><span className="mono">{Object.values(awards).filter((r) => (r || []).length).length}</span>
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-head">
                <strong style={{ fontSize: 14 }}>Checklist</strong>
                <span className="section-label">{allRequiredComplete ? "Ready to finalise" : "Some steps need attention"}</span>
              </div>
              <div className="section-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {steps.filter((s) => s.key !== "stage" && s.key !== "review").map((s) => {
                  const st = stepStatus(s);
                  const i = steps.findIndex((x) => x.key === s.key);
                  return (
                    <button key={s.key} type="button" className={`me-check me-check-${st}`} onClick={() => gotoStep(i)}>
                      <span className="me-check-ic">{st === "done" ? <CheckIcon size={12} /> : st === "optional" ? "○" : "!"}</span>
                      <span className="me-check-label">{s.label}</span>
                      <span className="me-check-state mono">{st === "done" ? "Complete" : st === "optional" ? "Optional" : "Required"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="guide">
              <span className="g-ic"><InfoIcon /></span>
              <div>On finalise the server writes the full contract with your backdated dates and enforces date ordering, award balance and scope. Historical stages send nothing to vendors{stage === "sig_pending" ? "; only signature-pending notifies the vendor to e-sign." : "."}</div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ── Wizard footer nav ── */}
      <div className="action-dock">
        <div className="me-dock">
          {clampedIdx === 0 ? (
            <button className="btn btn-ghost btn-md" onClick={() => router.push("/dashboard/buyer/rate-contracts/all")}>← Exit</button>
          ) : (
            <button className="btn btn-secondary btn-md" onClick={goBack}>← Back</button>
          )}
          <div className="me-dock-mid mono">Step {clampedIdx + 1} / {steps.length} · <span className="me-dock-step">{current.label}</span></div>
          <div className="me-dock-right">
            <SaveChip state={saveState} />
            <button className="btn btn-secondary btn-md" disabled={busy} onClick={saveDraft}>Save draft</button>
            {isLastStep ? (
              <button className="btn btn-primary btn-md" disabled={busy} onClick={finalize}>Finalize ARC</button>
            ) : (
              <button className="btn btn-blue btn-md" disabled={busy} onClick={goNext}>Next →</button>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="arc-toast"><span className="t-ic">✓</span><span>{toast}</span></div>}

      {/* page-scoped layout styles — arc_v2.css tokens only */}
      <style jsx>{`
        .me-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;
          padding-bottom: 16px; border-bottom: 1px solid var(--border); }
        .me-head-text { min-width: 0; }
        .me-grid { display: grid; grid-template-columns: 248px minmax(0, 1fr); gap: 32px; align-items: start; }
        /* vertical step rail */
        .me-rail { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 2px; padding: 0px; }
        .me-rail-item { position: relative; display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 12px; align-items: center;
          width: 100%; text-align: left; padding: 8px 11px; border: 1px solid transparent; border-radius: var(--radius);
          background: transparent; cursor: pointer; font-family: inherit; transition: background 0.15s ease, border-color 0.15s ease; }
        .me-rail-item:hover { background: var(--surface-3); }
        .me-rail-item.current { background: var(--surface); border-color: var(--border); box-shadow: var(--shadow-sm); }
        .me-rail-num { position: relative; width: 30px; height: 30px; flex: none; border-radius: var(--radius-pill, 999px); display: grid; place-items: center;
          font-size: 12.5px; font-weight: 700; border: 1.5px solid var(--border-strong); background: var(--surface); color: var(--fg-3);
          z-index: 1; transition: all 0.18s ease; }
        .me-rail-item:not(:last-child) .me-rail-num::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          width: 2px; height: 12px; background: var(--border-strong); }
        .me-rail-item.reached .me-rail-num::after { background: var(--accent); }
        .me-rail-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .me-rail-label { font-size: 13px; font-weight: 600; color: var(--fg-3); line-height: 1.25; }
        .me-rail-state { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; color: var(--fg-4); text-transform: uppercase; }
        .me-rail-item.current .me-rail-num { border-color: var(--primary); color: var(--primary); box-shadow: var(--ring-primary); }
        .me-rail-item.current .me-rail-label { color: var(--fg); }
        .me-rail-item.current .me-rail-state { color: var(--primary); }
        .me-rail-item.checked .me-rail-num { background: var(--accent); border-color: var(--accent); color: #fff; }
        .me-rail-item.checked .me-rail-label { color: var(--fg-2); }
        .me-rail-item.checked .me-rail-state { color: var(--success); }
        /* step content column */
        .me-main { min-width: 0; display: flex; flex-direction: column; gap: 16px;
          animation: meStepIn 0.22s cubic-bezier(0.22, 1, 0.36, 1); }
        .me-step-head { padding: 0 2px; }
        .me-step-head h2 { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; margin: 0; color: var(--fg); }
        .me-step-head p { margin: 5px 0 0; font-size: 13px; color: var(--fg-3); line-height: 1.5; max-width: 72ch; }
        .me-review { display: flex; flex-direction: column; gap: 16px; }
        .me-check { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 10px; text-align: left;
          padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface);
          cursor: pointer; font-family: inherit; transition: background 0.15s ease; }
        .me-check:hover { background: var(--surface-2); }
        .me-check-ic { width: 22px; height: 22px; display: grid; place-items: center; border-radius: var(--radius-pill, 999px); font-size: 12px; font-weight: 700;
          background: var(--surface-3); color: var(--fg-3); }
        .me-check-done .me-check-ic { background: var(--success-soft); color: var(--success); }
        .me-check-todo .me-check-ic { background: var(--warn-soft); color: var(--warn); }
        .me-check-label { font-size: 13px; font-weight: 600; color: var(--fg); }
        .me-check-state { font-size: 11px; font-weight: 700; color: var(--fg-3); }
        .me-check-done .me-check-state { color: var(--success); }
        .me-check-todo .me-check-state { color: var(--warn); }
        .me-dock { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .me-dock-mid { font-size: 12px; color: var(--fg-3); white-space: nowrap; }
        .me-dock-step { color: var(--fg); font-weight: 700; }
        .me-dock-right { display: flex; align-items: center; gap: 10px; }
        .muted-hint { font-weight: 400; color: var(--fg-4); font-size: 10.5px; }
        :global(.stage-grid) { grid-template-columns: repeat(3, 1fr); }
        :global(.stage-card) { padding: 13px 14px; flex-direction: column; gap: 8px; align-items: flex-start; }
        @keyframes meStepIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @media (max-width: 960px) {
          .me-grid { grid-template-columns: 1fr; gap: 16px; }
          .me-rail { position: static; flex-direction: row; gap: 4px; overflow-x: auto; padding-bottom: 4px; }
          .me-rail-item { width: auto; flex: none; grid-template-columns: auto auto; gap: 8px; padding: 6px 10px; }
          .me-rail-item:not(:last-child) .me-rail-num::after { display: none; }
          .me-rail-state { display: none; }
          :global(.stage-grid) { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .me-dock-mid { display: none; }
          :global(.stage-grid) { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .me-main { animation: none; }
          .me-rail-item, .me-rail-num, .me-check { transition: none; }
        }
      `}</style>
    </div>
  );
}

// ── Save status chip ──
function SaveChip({ state }) {
  const map = {
    idle:   { dot: "var(--fg-4)",    text: "Not saved" },
    dirty:  { dot: "var(--warn)",    text: "Unsaved" },
    saving: { dot: "var(--primary)", text: "Saving…" },
    saved:  { dot: "var(--success)", text: "Saved" },
    error:  { dot: "var(--danger)",  text: "Error" },
  };
  const m = map[state] || map.idle;
  return (
    <span className="status-pill" style={{ background: "var(--surface)", color: "var(--fg-2)", borderColor: "var(--border)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot }} />
      {m.text}
    </span>
  );
}

// ── Contract status badge (lightweight, arc_v2 tokens) ──
function StageBadge({ status }) {
  const L = {
    awaiting_vendor_acceptance: { t: "Awaiting Sign", c: "var(--warn)" },
    contract_active: { t: "Active", c: "var(--success)" },
    expired: { t: "Expired", c: "var(--fg-3)" },
    terminated: { t: "Terminated", c: "var(--danger)" },
    closed_no_award: { t: "Closed (No Award)", c: "var(--fg-3)" },
  };
  const m = L[status] || { t: status, c: "var(--fg-3)" };
  return <span className="status-pill" style={{ color: m.c, background: "var(--surface-3)", borderColor: "var(--border)" }}>{m.t}</span>;
}
