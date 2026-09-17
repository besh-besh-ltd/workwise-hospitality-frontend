// Commercial stage — extracted from the old comm-eval.js page.
// Quote-comparison matrix with L1 highlight and per-item allocation editor.
//   no arc-comm read/evaluate → StageNoPermission
//   arc-comm.read             → view-only matrix (rates, L1, saved awards)
//   arc-comm.evaluate         → + award/split editor, save, finalize, send-back
// Once finalized (stage complete) everything is read-only; a committee
// send-back re-opens it (stage.reason === 'sent_back').
//
// GROUP rate contract (one ARC, several hotels): vendors quote one rate per
// item for the group, but the award is made hotel by hotel. Each item carries
// a row per hotel with its expected quantity, and a vendor can win only the
// hotels it was invited for. One vendor per hotel per item.

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";
import { StageNoPermission, StageReadOnlyBanner, StageSkeleton } from "./StageShared";
import { StageColumns, ActorFlowCard } from "./StageAside";
import ArcNegotiationPanel from "@/components/dashboard/rate-contracts/buyer/negotiation/ArcNegotiationPanel";

const CLAR_FIELD_LABEL = {
  base_price: "Base price / unit rate",
  gst: "GST %",
  charges: "Freight / charges",
  committed_qty: "Committed quantity",
  payment_terms: "Payment terms",
  delivery_terms: "Delivery terms",
};
const CLAR_FREE_TEXT = new Set(["payment_terms", "delivery_terms"]);
const fmtClarVal = (field, v) => {
  if (v == null) return "—";
  if (field === "base_price" || field === "charges") return "₹" + Number(v).toLocaleString("en-IN");
  if (field === "gst") return v + "%";
  if (field === "committed_qty") return Number(v).toLocaleString("en-IN");
  return String(v);
};
const fmtClarDate = (s) => { try { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return ""; } };

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}
function fmtLakh(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  return fmtINR(v);
}
function toNum(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}
// Opens the buyer-side vendor profile in a new tab — so the buyer can see the
// vendor's full profile (compliance, contacts, track record) without leaving
// the comparison. Mirrors the old quote-compare "Vendor profile" action.
function VendorProfileLink({ vendorId, vendorName }) {
  if (vendorId == null) return null;
  return (
    <a
      href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${vendorId}&showContact=true`}
      target="_blank"
      rel="noopener noreferrer"
      className="vendor-profile-btn"
      title={`View ${vendorName || "vendor"}'s profile`}
      aria-label="View vendor profile"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </a>
  );
}
const AV_CLASSES = ["av-blue", "av-green", "av-amber", "av-violet", "av-indigo", "av-pink"];
function avClass(id) {
  if (id === null || id === undefined) return AV_CLASSES[0];
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AV_CLASSES[Math.abs(h) % AV_CLASSES.length];
}
function landedRate(line, includeCharges) {
  // Redacted (technically disqualified) lines have no commercial terms —
  // they contribute nothing to totals, ranks, or L1 picks.
  if (!line || line.disqualified || line.rate == null) return null;
  return toNum(line.rate) + (includeCharges ? toNum(line.charges) : 0);
}

// Per-UNIT landed cost — engine-authoritative when line_pricing is present,
// else the legacy client estimate. Honors the includeCharges toggle by mapping
// it onto the engine breakdown. Returns null for redacted/missing lines so they
// contribute nothing to totals/ranks/L1 (same contract as landedRate).
//
// IMPORTANT — clarification-revised lines (`line._ov` is truthy): the engine
// line_pricing was computed from the ORIGINAL quote BEFORE the committee revised
// rate/charges. For revised cells, `effLineFor` overlays rate/charges but does NOT
// re-run the engine. We MUST fall back to the client `landedRate` so the revised
// values are honoured. Documented: re-running engine client-side is out of scope.
//
// Toggle ↔ engine mapping:
//   includeCharges ON  → lp.total (base + base_tax + charges_total)
//   includeCharges OFF → lp.base + lp.base_tax (rate + its GST, no extra charges)
// NOTE: the OFF basis now includes base_tax (GST on the rate), which is an
// intentional improvement over the old client landedRate(line,false) = rate only.
// If strict parity with the old "rate only" basis is needed, use lp.base instead.
//
// Mixed engine/legacy ranking: when a live ARC has some submitted quotes with
// line_pricing (new) and some without (legacy/pre-Phase-2), engine-ON and
// legacy lines compare apples-to-oranges (legacy lacks base_tax in landed). This
// is documented and rare (line_pricing written on every save/submit going forward).
function engineLanded(line, includeCharges) {
  if (!line || line.disqualified) return null;            // redacted: excluded
  // Revised-by-clarification: line_pricing is stale (computed before the committee
  // changed rate/charges). Prefer the client math which reads the overlaid values.
  if (line._ov) return landedRate(line, includeCharges);
  const lp = line.line_pricing;
  if (lp && lp.total != null) {
    // Engine breakdown: base + base_tax + charges_total === lp.total (pricingEngine.js ~143-150)
    return includeCharges
      ? Number(lp.total)
      : Number(lp.base || 0) + Number(lp.base_tax || 0);
  }
  // Legacy rows (line_pricing absent — pre-Phase-2 quotes): fall back so they rank.
  return landedRate(line, includeCharges);
}

export default function CommercialStage({ arc, lifecycle, stage, permissions, onRefresh }) {
  const commPerms = permissions["arc-comm"] || [];
  const isAdmin = (permissions["arc"] || []).includes("admin");
  const canRead = isAdmin || commPerms.includes("read") || commPerms.includes("evaluate");
  const canEvaluate = isAdmin || commPerms.includes("evaluate");
  const isComplete = stage?.state === "complete";
  const sentBack = stage?.reason === "sent_back";
  const editable = canEvaluate && !isComplete;
  // "Send back to Technical" only makes sense when technical evaluation actually
  // applies. If it was skipped (no clauses), there's no upstream stage to bounce
  // to — hide the control (the server enforces the same rule).
  const technicalApplies =
    ((lifecycle?.stages) || []).find((s) => s.key === "technical")?.state !== "skipped";

  const [loading, setLoading] = useState(true);
  const [commEvaluation, setCommEvaluation] = useState(null);
  const [items, setItems] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [awards, setAwards] = useState([]);
  const [alloc, setAlloc] = useState({});
  const [activeView, setActiveView] = useState("product");
  const [expanded, setExpanded] = useState({});
  const [includeCharges, setIncludeCharges] = useState(true);
  const [savingItem, setSavingItem] = useState(null);
  // Session-wide split-edit input mode (OQ5 default = 'qty'): 'qty' | 'pct'.
  // Applies to every item's split editor; not persisted server-side/localStorage.
  const [allocMode, setAllocMode] = useState("qty");
  const autoPickBusyRef = useRef(false);
  // item_id → qualified vendor ids; items absent from the map carry no
  // technical restriction (technical was skipped for them).
  const [qualifiedMap, setQualifiedMap] = useState({});
  const [finalizing, setFinalizing] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");
  const [sendingBack, setSendingBack] = useState(false);
  // Vendor clarifications that re-opened this stage. Each is resolved by a
  // scoped revise (edit the disputed field) or an uphold (keep it, reply).
  const [clarifications, setClarifications] = useState([]);
  const [clarDraft, setClarDraft] = useState({});   // id → { value, response }
  const [clarBusy, setClarBusy] = useState(null);    // id currently resolving
  // Group rate contract data (null for a single-hotel ARC): the hotels, each
  // item's per-hotel quantity and the hotels each vendor was invited for.
  const [group, setGroup] = useState(null);

  const applyPayload = (payload) => {
    setCommEvaluation(payload.comm_evaluation || null);
    setItems(Array.isArray(payload.items) ? payload.items : []);
    setQuotes(Array.isArray(payload.quotes) ? payload.quotes : []);
    setClarifications(Array.isArray(payload.clarifications) ? payload.clarifications : []);
    setQualifiedMap(payload.qualified_by_item || {});
    setGroup(payload.arc?.is_group || (Array.isArray(payload.hotels) && payload.hotels.length > 0)
      ? {
          hotels: payload.hotels || [],
          itemHotelQtys: payload.item_hotel_qtys || {},
          invitationHotels: payload.invitation_hotels || {},
        }
      : null);
    const aw = Array.isArray(payload.awards) ? payload.awards : [];
    setAwards(aw);
    const seed = {};
    aw.forEach((a) => {
      if (!a || !a.arc_item_id || !a.awarded_quote_line_id) return;
      seed[`${a.arc_item_id}::${a.awarded_quote_line_id}`] = { qty: toNum(a.allocated_qty) };
    });
    setAlloc(seed);
  };

  const reload = useCallback(async () => {
    if (!arc?.id) return;
    try {
      const r = await ArcApi.getCommEval(arc.id);
      applyPayload(r?.data || r || {});
    } catch (e) { /* interceptor */ }
  }, [arc?.id]);

  useEffect(() => {
    if (!arc?.id || !canRead) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await ArcApi.getCommEval(arc.id);
        if (!cancelled) applyPayload(r?.data || r || {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arc?.id, canRead]);

  // ── lookups ──────────────────────────────────────────────────────────
  const vendors = useMemo(() => {
    const map = new Map();
    quotes.forEach((q) => {
      const vid = q.vendor_id;
      if (!map.has(vid)) {
        map.set(vid, { vendor_id: vid, vendor_name: q.vendor_name || `Vendor ${vid}`, quote_id: q.quote_id, submitted_at: q.submitted_at, lines: [] });
      }
      map.get(vid).lines.push({
        quote_line_id: q.quote_line_id, arc_item_id: q.arc_item_id,
        rate: q.rate == null ? null : toNum(q.rate),
        gst_pct: toNum(q.gst_pct), charges: toNum(q.charges),
        lead_time_days: q.lead_time_days, moq: q.moq,
        // §1.1 — engine output for display + ranking (null when disqualified/redacted)
        line_pricing: q.line_pricing || null,
        // server-side redacted: technical committee deemed this pair unfit —
        // pricing fields arrive null and must never enter any total/rank
        disqualified: !!q.technically_disqualified,
        // Phase 2 — negotiation provenance (set by backend after vendor submits revised rate)
        rate_source: q.rate_source || "LANDED",
        pre_negotiation_rate: q.pre_negotiation_rate ?? null,
      });
    });
    return Array.from(map.values());
  }, [quotes]);

  const vendorById = useMemo(() => {
    const m = new Map();
    vendors.forEach((v) => m.set(v.vendor_id, v));
    return m;
  }, [vendors]);

  const itemById = useMemo(() => {
    const m = new Map();
    items.forEach((it) => m.set(it.id || it.arc_item_id, it));
    return m;
  }, [items]);

  const lineFor = (vid, itemId) => {
    const v = vendorById.get(vid);
    return v ? v.lines.find((l) => l.arc_item_id === itemId) || null : null;
  };

  // ── clarification overrides ──────────────────────────────────────────
  // A revise edits the AWARD SNAPSHOT for one item×vendor (the quote line in
  // the DB never changes). Build: (a) the effective snapshot per awarded cell,
  // (b) the resolved 'revised' clarifications keyed by item::vendor for the
  // strike-through + (i) provenance tooltip.
  const awardSnapByCell = useMemo(() => {
    const m = {};
    awards.forEach((a) => {
      const snap = typeof a.awarded_quote_snapshot === "string"
        ? JSON.parse(a.awarded_quote_snapshot) : (a.awarded_quote_snapshot || {});
      m[`${a.arc_item_id}::${a.awarded_vendor_id}`] = snap;
    });
    return m;
  }, [awards]);

  const revisionByCell = useMemo(() => {
    const m = {};
    clarifications.forEach((c) => {
      if (c.status !== "revised") return;
      const k = `${c.arc_item_id}::${c.vendor_id}`;
      (m[k] = m[k] || []).push(c);
    });
    return m;
  }, [clarifications]);

  // The quote line overlaid with any revised snapshot fields; `_ov` records the
  // original (quoted) values so the cell can strike them through.
  const SNAP_OF = { base_price: "rate", gst: "gst_pct", charges: "charges" };
  const effLineFor = (vid, itemId) => {
    const base = lineFor(vid, itemId);
    if (!base) return base;
    const snap = awardSnapByCell[`${itemId}::${vid}`];
    if (!snap) return base;
    const eff = { ...base };
    const ov = {};
    for (const [field, key] of Object.entries(SNAP_OF)) {
      if (snap[key] == null) continue;
      const before = toNum(base[key]);
      const after = toNum(snap[key]);
      if (Math.abs(before - after) > 1e-9) { eff[key] = after; ov[field] = { before, after }; }
    }
    eff._ov = Object.keys(ov).length ? ov : null;
    return eff;
  };
  const revisionFor = (vid, itemId) => revisionByCell[`${itemId}::${vid}`] || null;

  // Technical qualification — vendors who didn't clear an item's clauses
  // can't be awarded that item (and never count as its L1).
  const isQualified = (vid, itemId) => {
    const allowed = qualifiedMap[itemId];
    return !allowed || allowed.includes(Number(vid));
  };

  const l1ForItem = (itemId) => {
    let best = null;
    vendors.forEach((v) => {
      if (!isQualified(v.vendor_id, itemId)) return;
      const l = v.lines.find((x) => x.arc_item_id === itemId);
      if (!l) return;
      // §1.6 #1 — engine-authoritative landed (falls back to legacy for pre-Phase-2 rows)
      const lan = engineLanded(l, includeCharges);
      if (lan === null) return;
      if (best === null || lan < best.landed) best = { vendor_id: v.vendor_id, line: l, landed: lan };
    });
    return best;
  };
  const isL1 = (vid, itemId) => {
    const b = l1ForItem(itemId);
    return !!b && b.vendor_id === vid;
  };
  const vendorTotal = (vid) => {
    let s = 0;
    items.forEach((it) => {
      const itemId = it.id || it.arc_item_id;
      const l = lineFor(vid, itemId);
      if (!l) return;
      // §1.6 #2 — engine-authoritative landed (vendorRank inherits via vendorTotal)
      const lan = engineLanded(l, includeCharges);
      if (lan === null) return;
      s += lan * toNum(it.indicative_qty);
    });
    return s;
  };
  // Lines the vendor actually competes on — quoted AND technically qualified.
  const eligibleLines = (v) => v.lines.filter((l) => !l.disqualified);
  // A header L-rank only means something between vendors competing on the
  // FULL basket; a vendor disqualified on any item gets no rank — their
  // total isn't comparable.
  const vendorRank = (vid) => {
    const fullBasket = vendors.filter((v) => eligibleLines(v).length === items.length);
    const ranked = fullBasket.slice().sort((a, b) => vendorTotal(a.vendor_id) - vendorTotal(b.vendor_id));
    const idx = ranked.findIndex((v) => v.vendor_id === vid);
    return idx === -1 ? null : idx + 1;
  };

  // ── allocation helpers ───────────────────────────────────────────────
  const allocatedFor = (itemId, vid) => {
    const v = vendorById.get(vid);
    if (!v) return 0;
    const l = v.lines.find((x) => x.arc_item_id === itemId);
    if (!l) return 0;
    return toNum(alloc[`${itemId}::${l.quote_line_id}`]?.qty);
  };
  const itemAllocations = (itemId) => {
    let total = 0;
    const rows = [];
    vendors.forEach((v) => {
      const l = v.lines.find((x) => x.arc_item_id === itemId);
      if (!l) return;
      const qty = toNum(alloc[`${itemId}::${l.quote_line_id}`]?.qty);
      if (qty > 0) { rows.push({ vendor: v, line: l, qty }); total += qty; }
    });
    return { rows, total };
  };
  const itemStatus = (itemId) => {
    if (isGroup) return groupItemStatus(itemId);
    const it = itemById.get(itemId);
    const indicative = it ? toNum(it.indicative_qty) : 0;
    const { rows, total } = itemAllocations(itemId);
    const quoted = vendors.some((v) => v.lines.some((x) => x.arc_item_id === itemId));
    if (!quoted) return { kind: "no_quotes", indicative, allocated: 0, splitCount: 0 };
    if (total === 0) return { kind: "pending", indicative, allocated: 0, splitCount: 0 };
    if (Math.abs(total - indicative) < 0.0001) return { kind: "awarded", indicative, allocated: total, splitCount: rows.length };
    return { kind: "partial", indicative, allocated: total, splitCount: rows.length };
  };
  const counts = () => {
    const total = items.length;
    let awarded = 0, partial = 0;
    items.forEach((it) => {
      const s = itemStatus(it.id || it.arc_item_id);
      if (s.kind === "awarded") awarded++;
      else if (s.kind === "partial") partial++;
    });
    return { total, awarded, partial, pending: total - awarded - partial };
  };
  const contractedValue = () => {
    let s = 0;
    items.forEach((it) => {
      const itemId = it.id || it.arc_item_id;
      itemAllocations(itemId).rows.forEach((r) => {
        // Awarded value is computed on the REVISED rate when a clarification
        // changed it (the quote line stays the competitive baseline).
        // §1.6 #5 / §1.7: effLineFor overlays rate/charges from revise snapshot; its
        // _ov flag causes engineLanded to fall back to client math (line_pricing stale).
        const lan = engineLanded(effLineFor(r.vendor.vendor_id, itemId) || r.line, includeCharges);
        if (lan !== null) s += lan * r.qty;
      });
    });
    return s;
  };

  // ── group rate contract: award hotel by hotel ────────────────────────
  const isGroup = !!group;
  const hotelById = useMemo(
    () => new Map(((group && group.hotels) || []).map((h) => [Number(h.hotel_id), h])),
    [group]
  );
  // The hotels that expect some of this item, with their quantity.
  const hotelRowsFor = (itemId) => (((group && group.itemHotelQtys) || {})[String(itemId)] || [])
    .filter((r) => toNum(r.indicative_qty) > 0)
    .map((r) => ({
      hotel_id: Number(r.hotel_id),
      qty: toNum(r.indicative_qty),
      hotel: hotelById.get(Number(r.hotel_id)) || { name: `Hotel ${r.hotel_id}` },
    }));
  const invitedFor = (vid, hotelId) =>
    (((group && group.invitationHotels) || {})[String(vid)] || []).map(Number).includes(Number(hotelId));
  const canAwardAt = (vid, itemId, hotelId) => {
    const l = lineFor(vid, itemId);
    return !!l && !l.disqualified && isQualified(vid, itemId) && invitedFor(vid, hotelId);
  };
  // { hotelId: [{ vendor_id, qty }] } — the saved award split for one item.
  const hotelAwardsFor = (itemId) => {
    const m = {};
    awards.forEach((a) => {
      if (Number(a.arc_item_id) !== Number(itemId)) return;
      (a.hotels || []).forEach((h) => {
        (m[Number(h.hotel_id)] = m[Number(h.hotel_id)] || []).push({ vendor_id: Number(a.awarded_vendor_id), qty: toNum(h.allocated_qty) });
      });
    });
    return m;
  };
  // Awarded when every hotel that some invited vendor can supply is awarded.
  // A hotel no invited vendor quoted for stays without a supplier.
  const groupItemStatus = (itemId) => {
    const rows = hotelRowsFor(itemId);
    const byHotel = hotelAwardsFor(itemId);
    const quoted = vendors.some((v) => v.lines.some((x) => x.arc_item_id === itemId));
    let awardedHotels = 0, openHotels = 0, noSupplier = 0, allocated = 0;
    const awardedVendors = new Set();
    rows.forEach((r) => {
      const at = byHotel[r.hotel_id] || [];
      const got = at.reduce((sum, x) => sum + x.qty, 0);
      allocated += got;
      at.forEach((x) => awardedVendors.add(x.vendor_id));
      if (Math.abs(got - r.qty) < 0.0001) awardedHotels++;
      else if (vendors.some((v) => canAwardAt(v.vendor_id, itemId, r.hotel_id))) openHotels++;
      else noSupplier++;
    });
    const base = {
      indicative: rows.reduce((sum, r) => sum + r.qty, 0), allocated, splitCount: awardedVendors.size,
      hotels: rows.length, awardedHotels, openHotels, noSupplier,
    };
    if (!quoted) return { ...base, kind: "no_quotes" };
    if (awardedHotels === 0) return { ...base, kind: "pending" };
    if (openHotels === 0) return { ...base, kind: "awarded" };
    return { ...base, kind: "partial" };
  };
  // { hotelId: vendorId } as saved — the largest share where a hotel is split.
  const currentHotelVendors = (itemId) => {
    const out = {};
    Object.entries(hotelAwardsFor(itemId)).forEach(([hotelId, at]) => {
      const top = at.reduce((a, b) => (b.qty > a.qty ? b : a), at[0]);
      if (top) out[hotelId] = top.vendor_id;
    });
    return out;
  };
  const groupRows = (itemId, hotelVendors) => {
    const rows = [];
    hotelRowsFor(itemId).forEach((r) => {
      const vid = hotelVendors[r.hotel_id];
      if (vid == null) return;
      const v = vendors.find((x) => Number(x.vendor_id) === Number(vid));
      const l = v && v.lines.find((x) => x.arc_item_id === itemId);
      if (v && l) rows.push({ vendor: v, line: l, qty: r.qty, hotel_id: r.hotel_id });
    });
    return rows;
  };

  // ── editing actions (evaluators only) ────────────────────────────────
  // Every award action persists IMMEDIATELY (one source of truth — the
  // server). The only staged state is the percentage draft inside an open
  // split editor; nothing else can be lost by a stray click.

  // rows: [{ vendor, line, qty, pct }] — ranked by landed rate for l_rank.
  const buildAllocations = (itemId, rows) => {
    const l1 = l1ForItem(itemId);
    // §1.6 #4 — sort by engine landed (null lines sort last via ?? MAX_VALUE)
    const ranked = rows.slice().sort((a, b) =>
      (engineLanded(a.line, includeCharges) ?? Number.MAX_VALUE) -
      (engineLanded(b.line, includeCharges) ?? Number.MAX_VALUE));
    return ranked.map((r, idx) => ({
      awarded_vendor_id: r.vendor.vendor_id,
      awarded_quote_line_id: r.line.quote_line_id,
      allocated_qty: r.qty,
      allocated_share_pct: r.pct,
      l_rank: `L${idx + 1}`,
      is_l1_default: !!(l1 && r.line.quote_line_id === l1.line.quote_line_id),
      awarded_quote_snapshot: quoteSnapshot(r.line),
    }));
  };

  // §1.7 — snapshot records the engine landed rate so the awarded value is
  // reconstructible from the snapshot alone and matches the ranked number.
  // line_pricing added for provenance (stable even if engine changes later).
  const quoteSnapshot = (line) => ({
    rate: line.rate, gst_pct: line.gst_pct, charges: line.charges,
    lead_time_days: line.lead_time_days, moq: line.moq,
    landed_rate: engineLanded(line, includeCharges), include_charges: includeCharges,
    line_pricing: line.line_pricing || null,
  });

  // GROUP rows: [{ vendor, line, qty, hotel_id }] — one per awarded hotel. The
  // server stores one award per vendor (its total) plus the hotel split, so a
  // vendor's rank and share are the same on each of its rows.
  const buildGroupAllocations = (itemId, rows) => {
    const l1 = l1ForItem(itemId);
    const indicative = hotelRowsFor(itemId).reduce((sum, r) => sum + r.qty, 0);
    const vendorQty = new Map();
    rows.forEach((r) => vendorQty.set(r.vendor.vendor_id, (vendorQty.get(r.vendor.vendor_id) || 0) + r.qty));
    const rankedVendorIds = Array.from(new Map(rows.map((r) => [r.vendor.vendor_id, r])).values())
      .sort((a, b) =>
        (engineLanded(a.line, includeCharges) ?? Number.MAX_VALUE) -
        (engineLanded(b.line, includeCharges) ?? Number.MAX_VALUE))
      .map((r) => r.vendor.vendor_id);
    return rows.map((r) => ({
      hotel_id: r.hotel_id,
      awarded_vendor_id: r.vendor.vendor_id,
      awarded_quote_line_id: r.line.quote_line_id,
      allocated_qty: r.qty,
      allocated_share_pct: indicative > 0 ? Math.round((vendorQty.get(r.vendor.vendor_id) / indicative) * 10000) / 100 : null,
      l_rank: `L${rankedVendorIds.indexOf(r.vendor.vendor_id) + 1}`,
      is_l1_default: !!(l1 && r.line.quote_line_id === l1.line.quote_line_id),
      awarded_quote_snapshot: quoteSnapshot(r.line),
    }));
  };

  const postAllocation = async (itemId, rows, successMsg) =>
    saveItemAllocations(itemId, buildAllocations(itemId, rows), successMsg);

  const postGroupAllocation = async (itemId, hotelVendors, successMsg) =>
    saveItemAllocations(itemId, buildGroupAllocations(itemId, groupRows(itemId, hotelVendors)), successMsg);

  const saveItemAllocations = async (itemId, allocations, successMsg) => {
    setSavingItem(itemId);
    try {
      await ArcApi.saveAllocation(arc.id, { item_id: itemId, allocations });
      if (successMsg) toast.success(successMsg);
      await reload();
      await onRefresh(); // timeline counts (items_allocated) move
      return true;
    } catch (e) { return false; } finally {
      setSavingItem(null);
    }
  };

  // Awarding is a TOGGLE on the product × vendor cell. The award set divides
  // the item equally: 1 vendor → 100%, 2 → 50/50, 3 → thirds. Rounding
  // residues land on the first vendor so totals are EXACTLY 100% / the
  // indicative qty (the server enforces this invariant).
  const equalRows = (itemId, vendorIds) => {
    const it = itemById.get(itemId);
    const indicative = toNum(it?.indicative_qty);
    const n = vendorIds.length;
    if (!it || !n) return [];
    const basePct = Math.floor(10000 / n) / 100;
    const baseQty = Math.floor((indicative / n) * 100) / 100;
    const rows = [];
    vendorIds.forEach((vid) => {
      const v = vendorById.get(vid);
      const l = v?.lines.find((x) => x.arc_item_id === itemId);
      if (v && l) rows.push({ vendor: v, line: l, pct: basePct, qty: baseQty });
    });
    if (!rows.length) return [];
    rows[0].pct = Math.round((rows[0].pct + (100 - basePct * rows.length)) * 100) / 100;
    rows[0].qty = Math.round((rows[0].qty + (indicative - baseQty * rows.length)) * 100) / 100;
    return rows;
  };

  const awardedSet = (itemId) => itemAllocations(itemId).rows.map((r) => r.vendor.vendor_id);

  // Add a vendor to the item's award set (saved immediately).
  const awardCell = async (vid, itemId) => {
    if (!editable || savingItem) return;
    if (!isQualified(vid, itemId)) {
      toast.error("This vendor is not technically qualified for this item.");
      return;
    }
    if (isGroup) {
      // Every hotel this vendor was invited for goes to it.
      const next = currentHotelVendors(itemId);
      let n = 0;
      hotelRowsFor(itemId).forEach((r) => {
        if (canAwardAt(vid, itemId, r.hotel_id)) { next[r.hotel_id] = vid; n++; }
      });
      if (!n) { toast.error("This vendor was not invited for any hotel that needs this item."); return; }
      const gv = vendorById.get(vid);
      await postGroupAllocation(itemId, next, `Awarded ${n} hotel${n === 1 ? "" : "s"} to ${gv?.vendor_name || "vendor"}`);
      return;
    }
    const set = awardedSet(itemId);
    if (set.includes(vid)) return;
    const next = [...set, vid];
    const rows = equalRows(itemId, next);
    if (!rows.length) return;
    const v = vendorById.get(vid);
    await postAllocation(itemId, rows,
      next.length === 1
        ? `Awarded 100% to ${v?.vendor_name || "vendor"}`
        : `Split equally — ${rows[0].pct}% / ${rows.length} vendors`);
  };

  // Override one vendor's share on a SPLIT item — the remaining percentage
  // re-distributes pro-rata across the other awarded vendors, so the item
  // always stays at exactly 100%.
  const setShare = async (vid, itemId, rawPct) => {
    if (!editable || savingItem) return;
    const it = itemById.get(itemId);
    const indicative = toNum(it?.indicative_qty);
    const { rows: current } = itemAllocations(itemId);
    if (!it || current.length < 2) return;
    const mine = current.find((r) => r.vendor.vendor_id === vid);
    if (!mine) return;
    let pct = Math.round(Number(rawPct) * 100) / 100;
    if (!Number.isFinite(pct) || pct < 0.01 || pct > 99.99) {
      toast.error("Share must be between 0.01% and 99.99% — to give a vendor everything, remove the others.");
      return;
    }
    const othersQty = current.filter((r) => r.vendor.vendor_id !== vid)
      .reduce((s, r) => s + r.qty, 0);
    const remaining = 100 - pct;
    const rows = current.map((r) => {
      if (r.vendor.vendor_id === vid) return { vendor: r.vendor, line: r.line, pct, qty: Math.round(indicative * pct) / 100 };
      const share = othersQty > 0 ? r.qty / othersQty : 1 / (current.length - 1);
      const p = Math.round(remaining * share * 100) / 100;
      return { vendor: r.vendor, line: r.line, pct: p, qty: Math.round(indicative * p) / 100 };
    });
    // absorb the rounding residues into the largest OTHER share — the edited
    // vendor keeps exactly the % that was typed
    const others = rows.filter((r) => r.vendor.vendor_id !== vid);
    const biggest = others.reduce((a, b) => (b.pct > a.pct ? b : a), others[0]);
    biggest.pct = Math.round((biggest.pct + (100 - rows.reduce((s, r) => s + r.pct, 0))) * 100) / 100;
    biggest.qty = Math.round((biggest.qty + (indicative - rows.reduce((s, r) => s + r.qty, 0))) * 100) / 100;
    await postAllocation(itemId, rows, `Share set to ${pct}% — others re-balanced`);
  };

  // Override one vendor's share by QUANTITY on a SPLIT item — the remaining qty
  // re-distributes pro-rata across the other awarded vendors, so SUM(qty) always
  // stays EXACTLY == indicative_qty (server invariant). Mirror of setShare.
  const setShareByQty = async (vid, itemId, rawQty) => {
    if (!editable || savingItem) return;
    const it = itemById.get(itemId);
    const indicative = toNum(it?.indicative_qty);
    const { rows: current } = itemAllocations(itemId);
    if (!it || indicative <= 0 || current.length < 2) return;
    const mine = current.find((r) => r.vendor.vendor_id === vid);
    if (!mine) return;
    let qty = Math.round(Number(rawQty) * 100) / 100;
    if (!Number.isFinite(qty) || qty < 0.01 || qty > indicative - 0.01) {
      toast.error(`Quantity must be between 0.01 and ${Math.round((indicative - 0.01) * 100) / 100} — to give a vendor everything, remove the others.`);
      return;
    }
    const othersQty = current.filter((r) => r.vendor.vendor_id !== vid).reduce((s, r) => s + r.qty, 0);
    const remaining = indicative - qty;
    const pctOfQ = (q) => Math.round((q / indicative) * 10000) / 100;
    const rows = current.map((r) => {
      if (r.vendor.vendor_id === vid) return { vendor: r.vendor, line: r.line, qty, pct: pctOfQ(qty) };
      const share = othersQty > 0 ? r.qty / othersQty : 1 / (current.length - 1);
      const q = Math.round(remaining * share * 100) / 100;
      return { vendor: r.vendor, line: r.line, qty: q, pct: pctOfQ(q) };
    });
    // absorb rounding residue into the largest OTHER share — the edited vendor keeps
    // exactly the qty that was typed (mirrors setShare residue handling)
    const others = rows.filter((r) => r.vendor.vendor_id !== vid);
    const biggest = others.reduce((a, b) => (b.qty > a.qty ? b : a), others[0]);
    biggest.qty = Math.round((biggest.qty + (indicative - rows.reduce((s, r) => s + r.qty, 0))) * 100) / 100;
    biggest.pct = pctOfQ(biggest.qty);
    await postAllocation(itemId, rows, `Quantity set to ${qty} ${it.uom || ""} — others re-balanced`);
  };

  // Remove a vendor from the award set; the rest re-divide equally.
  // Removing the last holder clears the item back to Pending.
  const unawardCell = async (vid, itemId) => {
    if (!editable || savingItem) return;
    if (isGroup) {
      const next = currentHotelVendors(itemId);
      Object.keys(next).forEach((hotelId) => { if (Number(next[hotelId]) === Number(vid)) delete next[hotelId]; });
      await postGroupAllocation(itemId, next,
        Object.keys(next).length ? "Vendor removed from every hotel" : "Award cleared — item is back to pending");
      return;
    }
    const set = awardedSet(itemId);
    if (!set.includes(vid)) return;
    const next = set.filter((x) => x !== vid);
    if (next.length === 0) {
      await postAllocation(itemId, [], "Award cleared — item is back to pending");
      return;
    }
    const rows = equalRows(itemId, next);
    await postAllocation(itemId, rows,
      next.length === 1 ? "Back to a single vendor at 100%" : `Re-divided across ${next.length} vendors`);
  };

  // GROUP: give one hotel's quantity of an item to a vendor invited for it
  // (replacing whoever held it), or take it back.
  const awardHotel = async (vid, itemId, hotelId) => {
    if (!editable || savingItem || !canAwardAt(vid, itemId, hotelId)) return;
    const next = { ...currentHotelVendors(itemId), [hotelId]: vid };
    const gv = vendorById.get(vid);
    await postGroupAllocation(itemId, next, `${hotelById.get(Number(hotelId))?.name || "Hotel"} awarded to ${gv?.vendor_name || "vendor"}`);
  };
  const unawardHotel = async (itemId, hotelId) => {
    if (!editable || savingItem) return;
    const next = currentHotelVendors(itemId);
    delete next[hotelId];
    await postGroupAllocation(itemId, next,
      Object.keys(next).length
        ? `${hotelById.get(Number(hotelId))?.name || "Hotel"} has no supplier now`
        : "Award cleared — item is back to pending");
  };
  // GROUP L1: the cheapest vendor invited for each hotel.
  const groupL1HotelVendors = (itemId) => {
    const next = {};
    hotelRowsFor(itemId).forEach((r) => {
      let best = null;
      vendors.forEach((v) => {
        if (!canAwardAt(v.vendor_id, itemId, r.hotel_id)) return;
        const lan = engineLanded(lineFor(v.vendor_id, itemId), includeCharges);
        if (lan === null) return;
        if (best === null || lan < best.landed) best = { vendor_id: v.vendor_id, landed: lan };
      });
      if (best) next[r.hotel_id] = best.vendor_id;
    });
    return next;
  };

  // Award L1 on every item — persists each, then refreshes once.
  const autoPickL1 = async () => {
    // ref guard: state updates are async, so a same-tick double-click would
    // slip past a savingItem check alone and fire the API run twice
    if (!editable || savingItem || autoPickBusyRef.current) return;
    autoPickBusyRef.current = true;
    setSavingItem("all");
    try {
      let done = 0, failed = 0;
      for (const it of items) {
        const itemId = it.id || it.arc_item_id;
        if (isGroup) {
          const next = groupL1HotelVendors(itemId);
          if (!Object.keys(next).length) continue;
          try {
            await ArcApi.saveAllocation(arc.id, {
              item_id: itemId,
              allocations: buildGroupAllocations(itemId, groupRows(itemId, next)),
            });
            done++;
          } catch (e) { failed++; }
          continue;
        }
        const indicative = toNum(it.indicative_qty);
        const l1 = l1ForItem(itemId);
        if (!l1) continue;
        const v = vendorById.get(l1.vendor_id);
        try {
          await ArcApi.saveAllocation(arc.id, {
            item_id: itemId,
            allocations: buildAllocations(itemId, [{ vendor: v, line: l1.line, qty: indicative, pct: 100 }]),
          });
          done++;
        } catch (e) { failed++; }
      }
      if (done) toast.success(`L1 awarded on ${done} item${done === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}`);
      else if (failed) toast.error("Could not save L1 awards.");
      await reload();
      await onRefresh();
    } finally {
      autoPickBusyRef.current = false;
      setSavingItem(null);
    }
  };

  const handleFinalize = async () => {
    const c = counts();
    if (c.awarded < c.total) { toast.error("Allocate every item before finalising."); return; }
    setFinalizing(true);
    try {
      const resp = await ArcApi.finalizeCommEval(arc.id);
      toast.success("Finalized — sent to the ARC committee");
      // GROUP: hotels no invited vendor quoted for are finalized without a supplier.
      const unawarded = (resp?.data || resp || {}).unawarded || [];
      if (unawarded.length > 0) {
        toast.warn(`${unawarded.length} hotel ${unawarded.length === 1 ? "line" : "lines"} left without a supplier — no invited vendor quoted. Those hotels buy these items outside this contract.`);
      }
      await onRefresh({ advance: true }); // jump to Awarding
    } catch (e) { /* interceptor */ } finally {
      setFinalizing(false);
    }
  };

  const handleSendBack = async () => {
    if (!sendBackReason.trim()) { toast.error("Add a reason before sending back."); return; }
    setSendingBack(true);
    try {
      await ArcApi.sendBackCommEvalToTech(arc.id, sendBackReason.trim());
      toast.success("Sent back to technical evaluation");
      setSendBackOpen(false);
      setSendBackReason("");
      await reload();
      await onRefresh();
    } catch (e) { /* interceptor */ } finally {
      setSendingBack(false);
    }
  };

  const openClarifications = useMemo(
    () => clarifications.filter((c) => c.status === "open"),
    [clarifications]
  );

  const resolveClar = async (clar, mode) => {
    const draft = clarDraft[clar.id] || {};
    if (mode === "revise" && (draft.value === undefined || draft.value === "")) {
      toast.error("Enter the revised value."); return;
    }
    if (mode === "uphold" && !(draft.response || "").trim()) {
      toast.error("Add a short response for the vendor."); return;
    }
    setClarBusy(clar.id);
    try {
      const value = clar.field === "payment_terms" || clar.field === "delivery_terms"
        ? draft.value : Number(draft.value);
      let resp;
      if (mode === "revise") {
        resp = await ArcApi.reviseClarification(arc.id, clar.id, { value, response: draft.response || "" });
      } else {
        resp = await ArcApi.upholdClarification(arc.id, clar.id, { response: draft.response.trim() });
      }
      const remaining = resp?.data?.open_remaining ?? resp?.open_remaining ?? 0;
      toast.success(
        remaining === 0
          ? "Resolved — award re-routed to the committee for approval"
          : `${mode === "revise" ? "Term revised" : "Original upheld"} · ${remaining} clarification(s) left`
      );
      setClarDraft((s) => { const n = { ...s }; delete n[clar.id]; return n; });
      await reload();
      await onRefresh();
    } catch (e) { /* interceptor */ } finally {
      setClarBusy(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────────
  if (!canRead) return <StageNoPermission stageLabel="Commercial" />;
  if (loading) return <StageSkeleton />;

  const c = counts();

  return (
    <StageColumns aside={<ActorFlowCard stage={stage} />}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: editable ? 88 : 0 }}>
      {/* status banners */}
      {isComplete && (
        <StageReadOnlyBanner>
          <strong>Commercial evaluation is finalized and locked.</strong>{" "}
          The award allocation below is with the committee (or already approved) — changes require a committee send-back.
        </StageReadOnlyBanner>
      )}
      {!isComplete && sentBack && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
          </div>
          <div>
            <strong>Sent back for re-work.</strong> The proposal was returned — rebalance the
            allocations below and finalize again to restart the committee vote.
          </div>
        </div>
      )}
      {!isComplete && !canEvaluate && (
        <StageReadOnlyBanner>
          <strong>View only.</strong> You can see all quoted rates, the L1 ranking and any saved
          allocations — awarding requires the commercial evaluate permission.
        </StageReadOnlyBanner>
      )}
      {editable && !sentBack && isGroup && (
        <div className="guide">
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </div>
          <div>
            <strong>Group rate contract — award hotel by hotel.</strong> Each item lists the hotels that need it.
            Use <strong>Award</strong> on a hotel row to give that hotel&apos;s quantity to a vendor, or <strong>Award</strong> on
            the item to give a vendor every hotel it was invited for. A vendor can win only the hotels it was invited for.
            The cheapest landed rate is <strong>L1</strong>. Award every hotel that has an invited vendor to finalize; a hotel
            no invited vendor quoted for stays without a supplier.
          </div>
        </div>
      )}
      {editable && !sentBack && !isGroup && (
        <div className="guide">
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </div>
          <div>
            <strong>Award</strong> a vendor to give them 100% of an item. Award more vendors on the same item
            and the share re-divides equally — use <strong>Adjust&nbsp;share</strong> on any awarded cell to set an
            exact share by percentage or quantity (the others re-balance automatically). Click an awarded pill&apos;s ✕ to drop that vendor.
            The cheapest landed rate is highlighted as <strong>L1</strong>. Every item must sit at exactly
            <strong> 100%</strong>; once all items are allocated, <strong>Awarding</strong> opens as a preview and
            finalize starts the committee vote.
          </div>
        </div>
      )}

      {/* VENDOR CLARIFICATIONS — surgical: award stays locked, only the disputed
          value is revised or upheld; resolving routes the award back through the
          committee. */}
      {openClarifications.length > 0 && (
        <section className="clar-panel">
          <div className="clar-panel-head">
            <span className="clar-dot" />
            <div>
              <div className="clar-panel-title">
                {openClarifications.length} vendor clarification{openClarifications.length === 1 ? "" : "s"} need your decision
              </div>
              <div className="clar-panel-sub">
                The award is locked — only the disputed term can change. Revise the value or uphold it; the
                award then re-routes through the committee and back to the vendor.
              </div>
            </div>
          </div>
          <div className="clar-list">
            {openClarifications.map((cl) => {
              const draft = clarDraft[cl.id] || {};
              const busy = clarBusy === cl.id;
              const freeText = CLAR_FREE_TEXT.has(cl.field);
              return (
                <div key={cl.id} className="clar-item">
                  <div className="clar-item-head">
                    <span className="clar-field-pill">{CLAR_FIELD_LABEL[cl.field] || cl.field}</span>
                    <span className="clar-line">{cl.variant_name || `Item #${cl.arc_item_id}`}</span>
                    <span className="clar-vendor">· {cl.vendor_name || `Vendor ${cl.vendor_id}`}</span>
                  </div>
                  <div className="clar-quote">
                    <span className="clar-quote-ic">“</span>
                    <span className="clar-quote-text">{cl.vendor_comment}</span>
                  </div>
                  <div className="clar-row">
                    <div className="clar-grp">
                      <label className="clar-lbl">{freeText ? "Revised term" : "Revised value"}</label>
                      <input
                        className="clar-input"
                        type={freeText ? "text" : "number"}
                        step="any"
                        placeholder={freeText ? "e.g. Net 30 from GRN" : "New value"}
                        value={draft.value ?? ""}
                        onChange={(e) => setClarDraft((s) => ({ ...s, [cl.id]: { ...s[cl.id], value: e.target.value } }))}
                        disabled={busy || !canEvaluate}
                      />
                    </div>
                    <div className="clar-grp">
                      <label className="clar-lbl">Note to vendor <span className="clar-lbl-hint">(required to uphold)</span></label>
                      <input
                        className="clar-input"
                        type="text"
                        placeholder="Reason / response…"
                        value={draft.response ?? ""}
                        onChange={(e) => setClarDraft((s) => ({ ...s, [cl.id]: { ...s[cl.id], response: e.target.value } }))}
                        disabled={busy || !canEvaluate}
                      />
                    </div>
                    <div className="clar-btns">
                      <button className="btn btn-ghost btn-sm" disabled={busy || !canEvaluate} onClick={() => resolveClar(cl, "uphold")}>
                        Uphold
                      </button>
                      <button className="btn btn-primary btn-sm" disabled={busy || !canEvaluate} onClick={() => resolveClar(cl, "revise")}>
                        {busy ? "Saving…" : "Revise"}
                      </button>
                    </div>
                  </div>
                  {!canEvaluate && (
                    <div className="clar-noperm">Resolving clarifications requires the commercial evaluate permission.</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* METRICS STRIP */}
      <section className="stat-strip">
        <div className="stat-card">
          <div className="s-ic blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </div>
          <div><div className="s-val mono">{c.total}</div><div className="s-label">Total items</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div><div className="s-val mono">{c.awarded}</div><div className="s-label">Awarded</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div><div className="s-val mono">{c.pending + c.partial}</div><div className="s-label">Pending / partial</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic indigo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" /></svg>
          </div>
          <div><div className="s-val mono">{fmtLakh(contractedValue())}</div><div className="s-label">Contracted value</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><polyline points="20 9 12 17 8 13 4 17" /></svg>
          </div>
          <div><div className="s-val mono">{vendors.length}</div><div className="s-label">Vendors quoted</div></div>
        </div>
      </section>

      {/* NEGOTIATION SUB-PANEL */}
      <ArcNegotiationPanel
        arc={arc}
        items={items}
        vendors={vendors}
        qualifiedMap={qualifiedMap}
        canEvaluate={canEvaluate}
        editable={editable}
        onAfterChange={async () => { await reload(); await onRefresh(); }}
      />

      {/* COMPARE TOOLBAR */}
      <div className="compare-toolbar">
        <div className="view-tabs">
          <button className={activeView === "product" ? "is-active" : ""} onClick={() => setActiveView("product")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /></svg>
            Item-wise
          </button>
          <button className={activeView === "overall" ? "is-active" : ""} onClick={() => setActiveView("overall")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="9" width="3" height="8" /><rect x="14" y="5" width="3" height="12" /></svg>
            Overall cost
          </button>
        </div>
        <div className="tool-meta">
          <label className="toggle-line">
            <span>Landed cost</span>
            <span className={"toggle" + (includeCharges ? " on" : "")} onClick={() => setIncludeCharges((v) => !v)} />
            <span className="em fs-12">{includeCharges ? "(rate + charges)" : "(rate only)"}</span>
          </label>
          {editable && (
            <button className="btn btn-sm btn-secondary" onClick={autoPickL1} disabled={!!savingItem} style={{ marginLeft: 10 }}>
              {savingItem === "all" ? (
                <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              )}
              {savingItem === "all" ? "Picking L1…" : "Auto-pick L1 everywhere"}
            </button>
          )}
        </div>
      </div>

      {/* MATRIX (item-wise) */}
      {activeView === "product" && (
        <div className="matrix-wrap">
          <div className="matrix-scroll">
            <table className="matrix comm-matrix">
              <thead>
                <tr>
                  <th className="col-item">
                    <div className="matrix-item-head">
                      <span className="lbl">Item</span>
                      <span className="qty-lbl">Indicative qty</span>
                    </div>
                  </th>
                  {vendors.map((v) => {
                    const rank = vendorRank(v.vendor_id);
                    const elig = eligibleLines(v).length;
                    return (
                      <th key={v.vendor_id} className="vendor-head">
                        <div className="vh-row">
                          <div className={"v-av " + avClass(v.vendor_id)}>{initialsOf(v.vendor_name)}</div>
                          <div className="vh-main">
                            <div className="vh-name-row">
                              <span className="v-name">{v.vendor_name}</span>
                              {rank != null && (
                                <span className={"v-rank " + (rank === 1 ? "l1" : rank === 2 ? "l2" : "l3")}>L{rank}</span>
                              )}
                              <VendorProfileLink vendorId={v.vendor_id} vendorName={v.vendor_name} />
                            </div>
                            <div className="v-total mono">{fmtINR(Math.round(vendorTotal(v.vendor_id)))}</div>
                            <div className="v-meta">
                              <span className="vm-item">
                                {elig === v.lines.length
                                  ? `${v.lines.length} item${v.lines.length === 1 ? "" : "s"} quoted`
                                  : `${elig} of ${v.lines.length} quoted items eligible`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const itemId = it.id || it.arc_item_id;
                  return (
                    <ItemRow
                      key={itemId}
                      it={it}
                      itemId={itemId}
                      itemName={it.variant_name || it.name || it.title || it.product_name || `Item ${itemId}`}
                      uom={it.uom || ""}
                      indicative={toNum(it.indicative_qty)}
                      isExp={!!expanded[itemId]}
                      status={itemStatus(itemId)}
                      vendors={vendors}
                      lineFor={lineFor}
                      effLineFor={effLineFor}
                      revisionFor={revisionFor}
                      isL1={isL1}
                      isQualified={isQualified}
                      landed={(l) => engineLanded(l, includeCharges)}
                      includeCharges={includeCharges}
                      allocatedFor={allocatedFor}
                      awardCell={awardCell}
                      unawardCell={unawardCell}
                      setShare={setShare}
                      setShareByQty={setShareByQty}
                      allocMode={allocMode}
                      setAllocMode={setAllocMode}
                      toggleExpand={() => setExpanded((s) => ({ ...s, [itemId]: !s[itemId] }))}
                      saving={savingItem === itemId || savingItem === "all"}
                      editable={editable}
                      lockedByApproval={isComplete}
                      group={isGroup ? {
                        hotelRows: hotelRowsFor(itemId),
                        hotelAwards: hotelAwardsFor(itemId),
                        canAwardAt: (vid, hotelId) => canAwardAt(vid, itemId, hotelId),
                        invitedFor,
                        awardHotel: (vid, hotelId) => awardHotel(vid, itemId, hotelId),
                        unawardHotel: (hotelId) => unawardHotel(itemId, hotelId),
                      } : null}
                    />
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="lowest-row">
                  <td className="col-item">Indicative total across {items.length} items</td>
                  {vendors.map((v) => {
                    const elig = eligibleLines(v).length;
                    return (
                      <td key={v.vendor_id}>
                        <span className="t-val">{fmtINR(Math.round(vendorTotal(v.vendor_id)))}</span>
                        <span className="t-sub">
                          {elig === items.length ? `across ${items.length} items` : `across ${elig} eligible item${elig === 1 ? "" : "s"}`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* OVERALL COST view */}
      {activeView === "overall" && (
        <div className="matrix-wrap">
          <div className="matrix-scroll">
            <table className="matrix">
              <thead>
                <tr>
                  <th className="col-item">
                    <div className="matrix-item-head">
                      <span className="lbl">Vendor</span>
                      <span className="qty-lbl">Rank</span>
                    </div>
                  </th>
                  <th className="vendor-head" style={{ minWidth: 140 }}>
                    <div className="vh-row"><div className="vh-main"><div className="v-name">Items quoted</div></div></div>
                  </th>
                  <th className="vendor-head" style={{ minWidth: 180 }}>
                    <div className="vh-row"><div className="vh-main"><div className="v-name">Landed total</div></div></div>
                  </th>
                  <th className="vendor-head" style={{ minWidth: 160 }}>
                    <div className="vh-row"><div className="vh-main"><div className="v-name">Position</div></div></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendors
                  .slice()
                  .sort((a, b) => vendorTotal(a.vendor_id) - vendorTotal(b.vendor_id))
                  .map((v) => {
                    const rank = vendorRank(v.vendor_id);
                    const elig = eligibleLines(v).length;
                    return (
                      <tr key={v.vendor_id} className={rank === 1 ? "row-awarded" : "row-pending"}>
                        <td className="col-item">
                          <div className="m-item-cell">
                            <div className="vendor-cell">
                              <div className={"vc-av " + avClass(v.vendor_id)}>{initialsOf(v.vendor_name)}</div>
                              <div className="vc-meta">
                                <div className="vc-name" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                  <span>{v.vendor_name}</span>
                                  <VendorProfileLink vendorId={v.vendor_id} vendorName={v.vendor_name} />
                                </div>
                                <div className="vc-sub">
                                  {elig === v.lines.length ? `${v.lines.length} items quoted` : `${elig} of ${v.lines.length} quoted eligible`}
                                </div>
                              </div>
                            </div>
                            <div className="qty-block"><div className="q mono">{rank != null ? `L${rank}` : "—"}</div></div>
                          </div>
                        </td>
                        <td className="cell">
                          <div className="price-cell"><span className="mono fw-700">{elig} / {items.length}</span></div>
                        </td>
                        <td className="cell">
                          <div className="price-cell">
                            <span className={"price mono" + (rank === 1 ? " text-success" : "")}>
                              {fmtINR(Math.round(vendorTotal(v.vendor_id)))}
                            </span>
                          </div>
                        </td>
                        <td className="cell">
                          <div className="price-cell">
                            <span className={"pill " + (rank === 1 ? "success" : "neutral")}>
                              {rank === 1 ? "L1 · ideal candidate" : rank != null ? "Higher cost" : "Partial basket · per-item only"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEND-BACK MODAL */}
      {sendBackOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2050 }}
          onClick={() => !sendingBack && setSendBackOpen(false)}
        >
          <div
            className="dash-panel"
            style={{ width: 480, maxWidth: "92vw", background: "#fff", padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dash-panel-head" style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              Send back to technical evaluation
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.5 }}>
                This reopens <strong>technical evaluation</strong> so the evaluator can re-score and re-approve
                qualification. Your award allocation is kept — once technical is re-approved, commercial reopens
                and any award to a now-disqualified vendor is flagged for re-allocation.
              </p>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-3)", marginBottom: 6 }}>Reason for the technical evaluator</label>
              <textarea
                value={sendBackReason}
                onChange={(e) => setSendBackReason(e.target.value)}
                rows={4}
                style={{ width: "100%", padding: 8, border: "1px solid var(--border-input)", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}
                placeholder="What's wrong with the qualification? e.g. Vendor X was wrongly disqualified on clause 2…"
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" disabled={sendingBack} onClick={() => setSendBackOpen(false)}>Cancel</button>
                <button className="btn btn-warn btn-sm" disabled={sendingBack} onClick={handleSendBack}>
                  {sendingBack ? "Sending..." : "Send back to Technical"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STICKY ACTION DOCK — evaluators only */}
      {editable && (
        <div className="action-dock">
          <div className="inner">
            <div className="left">
              <span className="fs-13 text-fg-2">
                <span className="fw-600 text-fg">{c.awarded} / {c.total}</span> {isGroup ? "items awarded" : "items at 100%"}
                {c.awarded < c.total && (isGroup
                  ? <> — award every hotel that has an invited vendor to finalize</>
                  : <> — every item must be fully allocated to finalize</>)}
              </span>
              <span className="text-fg-4">·</span>
              <span className="fs-13 text-fg-2">Contracted: <span className="mono fw-600 text-fg">{fmtLakh(contractedValue())}</span></span>
              {c.partial > 0 && (<><span className="text-fg-4">·</span><span className="fs-13 text-fg-2"><span className="fw-600">{c.partial}</span> partial</span></>)}
            </div>
            <div className="right">
              {commEvaluation && technicalApplies && (
                <button
                  className="btn btn-secondary btn-sm"
                  title="Qualification looks wrong? Bounce this back to technical evaluation to re-score."
                  onClick={() => setSendBackOpen(true)}
                >
                  Send back to Technical
                </button>
              )}
              <button className="btn btn-success" disabled={c.awarded < c.total || finalizing} onClick={handleFinalize}>
                {finalizing ? "Finalising..." : "Finalize & send to Committee"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </StageColumns>
  );
}

// ── ItemRow — one item row + split editor + expanded breakdowns ──────────
function ItemRow({
  it, itemId, itemName, uom, indicative, isExp, status, vendors,
  lineFor, effLineFor, revisionFor, isL1, isQualified, landed, includeCharges, allocatedFor,
  awardCell, unawardCell, setShare, setShareByQty, allocMode, setAllocMode, toggleExpand, saving, editable, lockedByApproval,
  group = null,
}) {
  // Inline share override — { vid, value } while one cell's % is being edited.
  const [editShare, setEditShare] = useState(null);
  const rowClass = status.kind === "awarded" ? "row-awarded" : "row-pending";
  const pctOf = (qty) => (indicative > 0 ? Math.round((qty / indicative) * 1000) / 10 : 0);
  const statusLabel =
    status.kind === "no_quotes" ? "No quotes"
    : group && status.kind === "awarded"
      ? (status.noSupplier > 0 ? `Awarded · ${status.awardedHotels} of ${status.hotels} hotels` : status.splitCount > 1 ? `Split · ${status.splitCount} vendors` : "Awarded")
    : group && status.kind === "partial" ? `Partial · ${status.awardedHotels} of ${status.hotels} hotels`
    : status.kind === "awarded"
      ? (status.splitCount > 1 ? `Split · ${status.splitCount} vendors` : "Awarded")
    : status.kind === "partial" ? `Partial · ${pctOf(status.allocated)}%`
    : "Pending";
  const showLock = lockedByApproval && status.kind === "awarded";

  return (
    <>
      <tr className={rowClass}>
        <td className="col-item">
          <div className="m-item-cell">
            <button className={"expand-btn" + (isExp ? " is-open" : "")} onClick={toggleExpand}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div className="meta">
              <div className="name">{itemName}</div>
              <div className={"m-item-state " + (status.kind === "awarded" ? "awarded" : "pending")} title={showLock ? "Locked — with the committee" : undefined}>
                <span>{statusLabel}</span>
                {showLock && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                )}
              </div>
            </div>
            <div className="qty-block">
              <div className="q mono">{indicative.toLocaleString("en-IN")}</div>
              <div className="u">{uom}</div>
            </div>
          </div>
        </td>
        {vendors.map((v) => {
          const l = lineFor(v.vendor_id, itemId);
          if (!l) {
            return (
              <td key={v.vendor_id} className="cell">
                <div className="price-cell"><div className="awaiting">— no quote —</div></div>
              </td>
            );
          }
          // Effective line overlays any clarification-revised values; the quote
          // line `l` stays the struck-through original baseline.
          const eff = (effLineFor && effLineFor(v.vendor_id, itemId)) || l;
          const ov = eff._ov || null;
          const rev = revisionFor ? revisionFor(v.vendor_id, itemId) : null;
          const lan = landed(eff);
          const qualified = isQualified(v.vendor_id, itemId);
          const l1 = isL1(v.vendor_id, itemId);
          const allocated = allocatedFor(itemId, v.vendor_id);
          const isAwarded = allocated > 0;
          const fullAwarded = isAwarded && Math.abs(allocated - indicative) <= 0.0001;
          if ((!qualified || l.disqualified) && !isAwarded) {
            // Server redacts these rates — render a locked placeholder so it
            // is obvious the terms exist but are sealed for this evaluator.
            return (
              <td key={v.vendor_id} className="cell cell-dq">
                <div className="price-cell is-dq">
                  <div className="p-top">
                    <span className="price mono dq-blur" aria-hidden="true">₹ ••••</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                  <div className="landed">rates sealed</div>
                  <span className="dq-chip">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Not technically qualified
                  </span>
                </div>
              </td>
            );
          }
          return (
            <td key={v.vendor_id} className={"cell" + (isAwarded ? " cell-awarded" : l1 ? " cell-l1" : "")}>
              <div className={"price-cell" + (l1 ? " is-l1" : "") + (isAwarded ? " is-awarded" : "")}>
                <div className="p-top">
                  {ov ? (
                    <><span className="price mono price-old">{fmtINR(landed(l))}</span><span className="price mono price-new">{fmtINR(lan)}</span></>
                  ) : (
                    <span className="price mono">{fmtINR(lan)}</span>
                  )}
                  {l1 && !isAwarded && <span className="l1-badge">L1</span>}
                  {l.rate_source === "NEGOTIATED" && l.pre_negotiation_rate != null && (
                    <span className="neg-rate-tag">NEGOTIATED · was {fmtINR(l.pre_negotiation_rate)}</span>
                  )}
                  {rev && rev.length > 0 && (
                    <span className="rev-info" tabIndex={0} aria-label="Why this changed">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                      <span className="rev-tip" role="tooltip">
                        <span className="rev-tip-head">Revised by clarification</span>
                        {rev.map((c) => (
                          <span key={c.id} className="rev-tip-row">
                            <span className="rev-tip-label">{CLAR_FIELD_LABEL[c.field] || c.field}</span>
                            <span className="rev-tip-change">
                              <span className="rate-old">{fmtClarVal(c.field, c.old_value)}</span> <span className="rev-tip-arrow">→</span> <span className="rate-new">{fmtClarVal(c.field, c.new_value)}</span>
                            </span>
                            {c.vendor_comment && <span className="rev-tip-why">Vendor: “{c.vendor_comment}”</span>}
                            {c.buyer_response && <span className="rev-tip-resp">You: {c.buyer_response}</span>}
                            <span className="rev-tip-by">{c.resolved_by_name || "Evaluator"}{c.resolved_at ? ` · ${fmtClarDate(c.resolved_at)}` : ""}</span>
                          </span>
                        ))}
                      </span>
                    </span>
                  )}
                </div>
                <div className="landed">
                  rate{" "}
                  {ov?.base_price ? (
                    <><span className="mono rate-old">{fmtINR(ov.base_price.before)}</span>{" "}<span className="mono rate-new">{fmtINR(ov.base_price.after)}</span></>
                  ) : (
                    <span className="mono">{fmtINR(l.rate)}</span>
                  )}
                  {includeCharges && (
                    <>{" · chg "}
                      {ov?.charges ? (
                        <><span className="mono rate-old">{fmtINR(ov.charges.before)}</span>{" "}<span className="mono rate-new">{fmtINR(ov.charges.after)}</span></>
                      ) : (
                        <span className="mono">{fmtINR(l.charges)}</span>
                      )}
                    </>
                  )}
                  {/* §1.4 — compact authoritative landed (engine basis; ranked on this number) */}
                  {(() => { const el = engineLanded(eff, includeCharges); return el != null ? <>{" · "}<span className="mono" style={{ fontWeight: 600 }}>{fmtINR(el)}</span></> : null; })()}
                </div>
                {group ? (
                  <GroupVendorCellControls
                    vendor={v}
                    group={group}
                    editable={editable}
                    saving={saving}
                    onAward={() => awardCell(v.vendor_id, itemId)}
                    onUnaward={() => unawardCell(v.vendor_id, itemId)}
                  />
                ) : editable ? (
                  !isAwarded ? (
                    <button className="cell-select-btn" disabled={saving} title="Award this vendor — shares re-divide equally" onClick={(e) => { e.stopPropagation(); awardCell(v.vendor_id, itemId); }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Award
                    </button>
                  ) : editShare?.vid === v.vendor_id ? (
                    (() => {
                      // OQ6 — a degenerate item (indicative <= 0) can't do amount-mode
                      // (division by zero), so force '%' and disable the qty toggle.
                      const qtyDisabled = indicative <= 0;
                      const effMode = qtyDisabled ? "pct" : allocMode;
                      const raw = Number(editShare.value);
                      const hasVal = editShare.value !== "" && Number.isFinite(raw);
                      // Apply is mode-branched — qty types allocated_qty directly, pct
                      // types the share; both reduce to the SAME allocations[] payload.
                      const applyEdit = () => {
                        if (effMode === "qty") setShareByQty(v.vendor_id, itemId, editShare.value);
                        else setShare(v.vendor_id, itemId, editShare.value);
                        setEditShare(null);
                      };
                      // Switching units re-seeds the box from the vendor's CURRENT
                      // allocation in the new unit — never carry a half-typed number across.
                      const switchMode = (m) => {
                        if (m === effMode) return;
                        setAllocMode(m);
                        setEditShare({ vid: v.vendor_id, value: m === "qty" ? String(allocated) : String(pctOf(allocated)) });
                      };
                      return (
                    <div className="awarded-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="alloc-mode-toggle" role="group" aria-label="Split input mode">
                        <button type="button" className={effMode === "pct" ? "is-active" : ""} title="Enter a percentage share" onClick={() => switchMode("pct")}>%</button>
                        <button type="button" className={effMode === "qty" ? "is-active" : ""} disabled={qtyDisabled} title={qtyDisabled ? "Indicative qty unavailable — percentage only" : "Enter a quantity"} onClick={() => switchMode("qty")}>Qty</button>
                      </div>
                      <div className="share-edit">
                        <input
                          autoFocus
                          type="number"
                          min={0.01}
                          max={effMode === "qty" ? Math.round((indicative - 0.01) * 100) / 100 : 99.99}
                          step={effMode === "qty" ? "1" : "0.5"}
                          value={editShare.value}
                          onChange={(e) => setEditShare({ vid: v.vendor_id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") applyEdit();
                            if (e.key === "Escape") setEditShare(null);
                          }}
                        />
                        <span className="suffix">{effMode === "qty" ? (uom || "units") : "%"}</span>
                        <button type="button" className="se-ok" disabled={saving} title="Apply — others re-balance pro-rata" onClick={applyEdit}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                        <button type="button" className="se-cancel" title="Cancel" onClick={() => setEditShare(null)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                      {/* live derived value in the OTHER unit — the auto-calculated
                          companion. SUM always reconciles to indicative_qty after apply. */}
                      {hasVal && (
                        <div className="share-derived">
                          {effMode === "qty"
                            ? `≈ ${indicative > 0 ? Math.round((raw / indicative) * 10000) / 100 : 0}% of ${indicative.toLocaleString("en-IN")} ${uom || "units"}`
                            : `≈ ${Math.round((indicative * raw / 100) * 100) / 100} of ${indicative.toLocaleString("en-IN")} ${uom || "units"}`}
                        </div>
                      )}
                      <button type="button" className="share-adjust" onClick={() => setEditShare(null)}>
                        Close adjustment
                      </button>
                    </div>
                      );
                    })()
                  ) : (
                    <div className="awarded-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="cell-pill-awarded" disabled={saving} title="Remove this vendor — the rest re-divide equally" onClick={() => unawardCell(v.vendor_id, itemId)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {fullAwarded
                          ? "Awarded · 100%"
                          : allocMode === "qty" && indicative > 0
                            ? `Awarded · ${allocated.toLocaleString("en-IN")} ${uom || "units"}`
                            : `Awarded · ${pctOf(allocated)}%`}
                        <span className="pill-x" aria-hidden="true">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </span>
                      </button>
                      {status.splitCount > 1 && (
                        <button
                          type="button"
                          className="share-adjust"
                          disabled={saving}
                          title="Set this vendor's exact share — the others re-balance pro-rata"
                          onClick={() => setEditShare({ vid: v.vendor_id, value: (indicative > 0 && allocMode === "qty") ? String(allocated) : String(pctOf(allocated)) })}
                        >
                          Adjust share
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  isAwarded && (
                    <span className="cell-pill-awarded" style={{ pointerEvents: "none" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      {fullAwarded ? "Awarded · 100%" : `Awarded · ${pctOf(allocated)}% · ${allocated.toLocaleString("en-IN")} ${uom || ""}`}
                    </span>
                  )
                )}
              </div>
            </td>
          );
        })}
      </tr>

      {/* GROUP — one row per hotel that needs this item: its quantity, and who
          supplies it. A vendor can be awarded only hotels it was invited for. */}
      {group && group.hotelRows.map((r) => {
        const at = group.hotelAwards[r.hotel_id] || [];
        const anyEligible = vendors.some((v) => group.canAwardAt(v.vendor_id, r.hotel_id));
        return (
          <tr key={`hotel-${r.hotel_id}`} className="bd-row">
            <td className="bd-label" style={{ textTransform: "none", letterSpacing: 0, fontSize: 12.5, color: "var(--fg-2)" }}>
              <div className="fw-600 text-fg">{r.hotel.name}</div>
              <div className="fs-12 text-fg-4">
                <span className="mono">{r.qty.toLocaleString("en-IN")}</span> {uom}{r.hotel.is_lead ? " · Lead hotel" : ""}
              </div>
              {!anyEligible && at.length === 0 && (
                <div className="fs-12" style={{ color: "var(--warn)" }}>No invited vendor quoted</div>
              )}
            </td>
            {vendors.map((v) => {
              const mine = at.some((x) => x.vendor_id === Number(v.vendor_id));
              const quotedHere = !!lineFor(v.vendor_id, itemId);
              return (
                <td key={v.vendor_id} className="bd-cell">
                  {mine ? (
                    editable ? (
                      <button type="button" className="cell-pill-awarded" style={{ marginTop: 0 }} disabled={saving} aria-label={`Remove ${v.vendor_name} from ${r.hotel.name}`} title="Take this hotel back — it will have no supplier" onClick={() => group.unawardHotel(r.hotel_id)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Awarded
                        <span className="pill-x" aria-hidden="true">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </span>
                      </button>
                    ) : (
                      <span className="cell-pill-awarded" style={{ marginTop: 0, pointerEvents: "none" }}>Awarded</span>
                    )
                  ) : group.canAwardAt(v.vendor_id, r.hotel_id) ? (
                    editable ? (
                      <button type="button" className="cell-select-btn" style={{ marginTop: 0, opacity: 1 }} disabled={saving} aria-label={`Award ${r.hotel.name} to ${v.vendor_name}`} title="Give this hotel's quantity to this vendor" onClick={() => group.awardHotel(v.vendor_id, r.hotel_id)}>
                        Award
                      </button>
                    ) : (
                      <span className="bd-dash">—</span>
                    )
                  ) : quotedHere && !group.invitedFor(v.vendor_id, r.hotel_id) ? (
                    <span className="bd-dash">Not invited</span>
                  ) : (
                    <span className="bd-dash">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}

      {/* Expanded quote details — one spacious row per attribute, values
          aligned under their vendor columns. Sealed / missing lines show
          a quiet em-dash (the price cell above explains why). */}
      {isExp && [
        ["GST", (l) => <><span className="v mono">{toNum(l.gst_pct)}%</span></>],
        ["Charges", (l) => <span className="v mono">{fmtINR(l.charges)}</span>],
        ["Lead time", (l) => (l.lead_time_days != null
          ? <><span className="v mono">{l.lead_time_days}</span><span className="u">days</span></>
          : <span className="bd-dash">—</span>)],
        ["MOQ", (l) => (l.moq != null
          ? <span className="v mono">{Number(l.moq).toLocaleString("en-IN")}</span>
          : <span className="bd-dash">—</span>)],
        // §1.3 — engine breakdown rows (base, base_tax, charges_total, landed all-in).
        // Each null-guards l.line_pricing; disqualified lines are already em-dashed by
        // the `sealed` check. Non-disqualified legacy rows (line_pricing absent) also
        // show em-dash gracefully (l.line_pricing == null).
        ["Base (engine)", (l) => l.line_pricing != null
          ? <span className="v mono">{fmtINR(l.line_pricing.base)}</span>
          : <span className="bd-dash">—</span>],
        ["Base tax (engine)", (l) => l.line_pricing != null
          ? <span className="v mono">{fmtINR(l.line_pricing.base_tax)}</span>
          : <span className="bd-dash">—</span>],
        ["Charges (engine)", (l) => {
          if (l.line_pricing == null) return <span className="bd-dash">—</span>;
          const chgs = l.line_pricing.charges || [];
          return (
            <span>
              <span className="v mono">{fmtINR(l.line_pricing.charges_total)}</span>
              {chgs.length > 0 && (
                <span style={{ display: "block", fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>
                  {chgs.map((c, ci) => (
                    <span key={ci} style={{ display: "block" }}>
                      {c.name || "Charge"}: {fmtINR(c.amount)}{c.tax != null ? ` + tax ${fmtINR(c.tax)}` : ""}
                    </span>
                  ))}
                </span>
              )}
            </span>
          );
        }],
        ["Landed / unit (engine)", (l) => l.line_pricing != null
          ? <span className="v mono" style={{ fontWeight: 600 }}>{fmtINR(l.line_pricing.total)}</span>
          : <span className="bd-dash">—</span>],
      ].map(([label, render], rowIdx, arr) => (
        <tr key={label} className={"bd-row" + (rowIdx === arr.length - 1 ? " bd-last" : "")}>
          <td className="bd-label">{label}</td>
          {vendors.map((v) => {
            const l = lineFor(v.vendor_id, itemId);
            const sealed = !l || l.disqualified;
            const l1col = !sealed && isL1(v.vendor_id, itemId);
            return (
              <td key={v.vendor_id} className={"bd-cell" + (l1col ? " is-l1col" : "") + (sealed ? " muted" : "")}>
                {sealed ? <span className="bd-dash">—</span> : render(l)}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// GROUP — the item-row controls for one vendor: how many hotels it holds, and
// a quick way to give it every hotel it was invited for.
function GroupVendorCellControls({ vendor, group, editable, saving, onAward, onUnaward }) {
  const vid = Number(vendor.vendor_id);
  const eligible = group.hotelRows.filter((r) => group.canAwardAt(vendor.vendor_id, r.hotel_id));
  const won = group.hotelRows.filter((r) => (group.hotelAwards[r.hotel_id] || []).some((x) => x.vendor_id === vid));
  if (eligible.length === 0 && won.length === 0) {
    return <div className="landed">Not invited for these hotels</div>;
  }
  const canTakeMore = eligible.some((r) => !won.includes(r));
  const wonLabel = `Awarded · ${won.length} of ${group.hotelRows.length} hotel${group.hotelRows.length === 1 ? "" : "s"}`;
  return (
    <div className="awarded-actions" onClick={(e) => e.stopPropagation()}>
      {won.length > 0 && (editable ? (
        <button className="cell-pill-awarded" disabled={saving} aria-label={`Remove ${vendor.vendor_name} from every hotel`} title="Remove this vendor from every hotel" onClick={onUnaward}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          {wonLabel}
          <span className="pill-x" aria-hidden="true">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </span>
        </button>
      ) : (
        <span className="cell-pill-awarded" style={{ pointerEvents: "none" }}>{wonLabel}</span>
      ))}
      {editable && canTakeMore && (
        <button className="cell-select-btn" disabled={saving} aria-label={`Award every invited hotel to ${vendor.vendor_name}`} title="Award this vendor every hotel it was invited for" onClick={onAward}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          {eligible.length === group.hotelRows.length ? "Award all hotels" : `Award ${eligible.length} invited hotel${eligible.length === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}
