// Contract Active stage — extracted from the old active.js page (itself a
// prototype-faithful port of prototypes/arc_ui/buyer-active.html).
//   · 5-tile KPI strip
//   · Consumption matrix in 3 lenses (Sub-category → Product → Vendor)
//   · Call-off POs · Contract document (per vendor, L1/L2 banded) · Audit
//   · Amendments tab with the buyer review modal
//   · Sticky right aside with Renewal + Vendor contracts
// The page hero/breadcrumb were dropped — the lifecycle shell owns those.
// `?tab=` deep links still work (the listing page's "amendments pending"
// chip routes straight to the Amendments tab).
// When the lifecycle stage is ENDED (expired / terminated / closed) a
// read-only banner pins to the top; the data below stays the authoritative
// record of what the contract was.
//
// Client enhancements baked in (Nitin · 05/06/2026):
//   #253  Committed → Projected Value; Consumed → with/without taxes toggle
//   #254  Show Quantity (Projected vs Actual) on each cell
//   #256  Drill path: Consumption → Sub-cat → Product → Vendor
//   #257-259  B.P + Frt breakdown highlighted next to Awarded amount
//   #260-263  Excess (−) / Shortfall (+) sign convention; status pill follows
//   #264  Target column removed
//   #265-268  Contract Doc: download menu (signed contract / rate annexure /
//             vendor docs) + filter row by vendor / category / sub-cat / product
//   #269  L1 / L2 vendor highlight band on contract doc head

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as ArcApi from "@/services/arc_v2";
import { StageReadOnlyBanner } from "./StageShared";
import { AmendmentTooltip } from "@/components/dashboard/rate-contracts/shared/amendmentRate";

// Translate raw tbl_arc_event_log rows into plain language with a tone.
// Tones: success (milestones moving forward), info (neutral progress),
// warn (edits / send-backs / expiries), danger (rejections / declines /
// terminations). Unknown event types fall back to humanised snake_case.
function describeAuditEvent(e, vendorNameById = {}) {
  const p = e.payload || {};
  const vname = (id) => vendorNameById[Number(id)] || `Vendor #${id}`;
  switch (e.event_type) {
    case "created":             return { tone: "success", title: "ARC created" };
    case "floated":             return { tone: "success", title: p.invited ? `Floated to ${p.invited} vendor${Number(p.invited) === 1 ? "" : "s"} for quotations` : "Floated to vendors for quotations" };
    case "vendor_submitted":    return { tone: "info",    title: <><span className="em">{vname(p.vendor_id)}</span> submitted their quotation</> };
    case "submission_closed":   return { tone: "info",    title: "Quotation window closed", detail: "No further vendor submissions accepted" };
    case "tech_eval_submitted": return { tone: "info",    title: "Technical evaluation submitted for approval" };
    case "tech_eval_approved":  return { tone: "success", title: "Technical evaluation approved", detail: "Qualified vendors moved to commercial evaluation" };
    case "tech_eval_rejected":  return { tone: "warn",    title: "Technical evaluation rejected", detail: "Sent back for re-evaluation" };
    case "comm_eval_opened":    return { tone: "info",    title: "Commercial evaluation opened", detail: "Buyer began allocating awards across vendors" };
    case "comm_eval_allocation_updated": {
      const item = p.item_name || (p.item_id ? `item #${p.item_id}` : "an item");
      return { tone: "info", title: <>Award allocation updated for <span className="em">{item}</span></>, detail: p.vendor_count != null ? `Split across ${p.vendor_count} vendor${Number(p.vendor_count) === 1 ? "" : "s"}` : null };
    }
    case "contract_otp_requested": return { tone: "info", title: <><span className="em">{vname(p.vendor_id)}</span> requested a signing OTP</> };
    case "contract_signed":     return { tone: "success", title: <><span className="em">{vname(p.vendor_id)}</span> signed the contract</>, detail: "Signature verified via OTP" };
    case "comm_eval_finalized": return { tone: "info",    title: "Commercial evaluation finalised", detail: "Award proposal locked and routed to committee" };
    case "committee_opened":    return { tone: "info",    title: "Committee review started" };
    case "committee_sent_back": return { tone: "warn",    title: "Committee sent the proposal back", detail: "Commercial evaluation reopened for re-allocation" };
    case "committee_decision":
      return p.decision === "approved"
        ? { tone: "success", title: "Committee approved the award" }
        : { tone: "danger",  title: "Committee rejected the award" };
    case "contract_generated":  return { tone: "success", title: p.contracts ? `${p.contracts} contract document${Number(p.contracts) === 1 ? "" : "s"} generated` : "Contract documents generated", detail: "Sent to vendors for signature" };
    case "vendor_signed": {
      const ids = Array.isArray(p.vendor_ids) ? p.vendor_ids : (p.vendor_id ? [p.vendor_id] : []);
      const names = ids.map(vname).join(", ");
      return { tone: "success", title: names ? <><span className="em">{names}</span> signed the contract</> : "Vendor signed the contract", detail: "Signature verified via OTP" };
    }
    case "vendor_declined":     return { tone: "danger",  title: <><span className="em">{vname(p.vendor_id)}</span> declined the contract</> };
    case "contract_active":     return { tone: "success", title: "Contract is now active", detail: "Released POs can be raised against contracted items" };
    case "amendment_requested": return { tone: "warn",    title: p.vendor_id ? <><span className="em">{vname(p.vendor_id)}</span> requested an amendment</> : "Vendor requested an amendment" };
    case "amendment_approved":  return { tone: "success", title: "Amendment approved" };
    case "amendment_rejected":  return { tone: "danger",  title: "Amendment rejected" };
    case "call_off_released":   return { tone: "success", title: "Released PO issued and linked", detail: p.po_number ? `PO ${p.po_number}` : null };
    case "call_off_rejected":   return { tone: "danger",  title: "Released PO rejected by vendor", detail: "Consumption reversed; MR reopened" };
    case "terminated":          return { tone: "danger",  title: "Contract terminated", detail: p.reason || null };
    case "expired":             return { tone: "warn",    title: "Contract expired" };
    case "withdrawn":           return { tone: "warn",    title: "ARC withdrawn by creator" };
    default:
      return { tone: "info", title: String(e.event_type || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) };
  }
}

// Collapse consecutive same-type events (the noisy allocation-update churn
// especially) into a single expandable group so the trail stays readable —
// one entry that opens to reveal every individual edit underneath.
const GROUPABLE = new Set(["comm_eval_allocation_updated", "contract_otp_requested"]);
function groupAuditEvents(events) {
  const out = [];
  for (const e of events) {
    const last = out[out.length - 1];
    if (last && last.event_type === e.event_type && GROUPABLE.has(e.event_type)) {
      last.children.push(e);
    } else {
      out.push({ event_type: e.event_type, head: e, children: [e] });
    }
  }
  return out;
}

// Is the given user one of the approvers on the amendment's CURRENT step?
// Drives the row highlight and the modal's action gating — pure UX. The
// server is the real gate: submitApprovalAction rejects a decision from
// anyone who isn't a PENDING approver on the instance's current step.
function isCurrentApprover(am, userId) {
  if (!userId || am.status !== "requested") return false;
  const chain = Array.isArray(am.approval_chain) ? am.approval_chain : [];
  const step = chain[Math.max(0, (Number(am.current_step) || 1) - 1)];
  if (!step) return false;
  return (step.approver_user_ids || []).map(Number).includes(Number(userId));
}

// ──────────────────────────────────────────────────────────────────────────
//  Small format helpers
// ──────────────────────────────────────────────────────────────────────────
const fmtL = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "₹0";
  if (Math.abs(v) >= 1e7) return "₹" + (v / 1e7).toFixed(2) + " Cr";
  if (Math.abs(v) >= 1e5) return "₹" + (v / 1e5).toFixed(2) + " L";
  if (Math.abs(v) >= 1e3) return "₹" + (v / 1e3).toFixed(1) + "k";
  return "₹" + v.toFixed(0);
};
const fmt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "₹0";
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(String(iso).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const daysBetween = (iso) => {
  if (!iso) return 0;
  const d = new Date(String(iso).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
};
const initials = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const AV_PALETTE = ["av-indigo", "av-sky", "av-green", "av-warm", "av-violet", "av-teal", "av-rose"];
const avClass = (id) => AV_PALETTE[Math.abs(Number(id) || 0) % AV_PALETTE.length];

// Derive a "B.P + Frt" pair from a line's rate + charges blob.
//   B.P  = unit_rate (basic price, pre-tax, pre-charges)
//   Frt  = sum of absolute freight from charges[] (label includes "freight"
//          OR the abs-typed value, divided by 100 for pct).
function extractBpFrt(line) {
  const rate = Number(line.unit_rate ?? line.rate ?? 0);
  let frt = 0;
  const charges = Array.isArray(line.charges) ? line.charges : (() => {
    try { return JSON.parse(line.charges || "[]"); } catch (_) { return []; }
  })();
  for (const c of charges) {
    if (!c) continue;
    const lbl = String(c.label || "").toLowerCase();
    if (lbl.includes("freight") || lbl === "frt") {
      const v = Number(c.value || 0);
      if (c.type === "pct") frt += (rate * v) / 100;
      else frt += v;
    }
  }
  return { bp: rate, frt: Math.round(frt * 100) / 100 };
}

// Classify a line's drawn-pct → balance state (#261-263).
//   on-track   : 0–99%
//   shortfall  : 0% drawn but contract within burn-window (under-utilised)  *display: +diff*
//   excess     : drawn > 100%                                               *display: −diff*
function balanceState(line) {
  const c = Number(line.committed_qty || 0);
  const u = Number(line.consumed_qty || 0);
  if (c <= 0) return { tone: "on-track", label: "On track", delta: 0 };
  if (u > c)  return { tone: "excess",   label: "Excess",   delta: u - c };
  // Within range. Distance from goal is "shortfall remaining" — show shortfall
  // (+) only when we're past 100% time but below quota. For seed data we
  // simplify: surface "Shortfall" if drawn < 25% — proxy for under-utilised.
  const pct = c > 0 ? (u / c) * 100 : 0;
  if (pct < 25) return { tone: "shortfall", label: "Shortfall", delta: c - u };
  return { tone: "on-track", label: "On track", delta: c - u };
}

function pctTone(pct) {
  if (pct >= 100) return "danger";
  if (pct >= 75)  return "warn";
  return "ok";
}

// ──────────────────────────────────────────────────────────────────────────
//  Tiny inline icons (kept inline so the stage has no extra import cost)
// ──────────────────────────────────────────────────────────────────────────
const Icon = ({ size = 16, sw = 2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const I = {
  consumption:   () => <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>,
  callOff:       () => <Icon><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></Icon>,
  file:          () => <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>,
  clock:         () => <Icon><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>,
  list:          () => <Icon><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Icon>,
  box:           () => <Icon><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></Icon>,
  user:          () => <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>,
  edit:          () => <Icon><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>,
  renew:         () => <Icon><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Icon>,
  rupee:         () => <Icon><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon>,
  download:      () => <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></Icon>,
  chevron:       () => <Icon size={11}><polyline points="6 9 12 15 18 9" /></Icon>,
  check:         () => <Icon size={11} sw={2.6}><polyline points="20 6 9 17 4 12" /></Icon>,
  info:          () => <Icon><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></Icon>,
  filter:        () => <Icon size={12}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></Icon>,
  search:        () => <Icon size={12}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>,
};

// ──────────────────────────────────────────────────────────────────────────
//  Stage
// ──────────────────────────────────────────────────────────────────────────
export default function ActiveStage({ arc: arcProp, stage }) {
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("consumption");

  // Honour ?tab= deep links (e.g. the listing page's "amendments pending"
  // chip routes straight to the Amendments tab).
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    if (typeof q === "string" && ["consumption", "pos", "doc", "audit", "amendments"].includes(q)) {
      setTab(q);
    }
  }, [router.isReady, router.query.tab]);
  const [view, setView] = useState("sub");                 // sub | product | vendor
  const [withTaxes, setWithTaxes] = useState(false);        // #253 toggle
  const [docFilter, setDocFilter] = useState({ vendor: "", product: "", subCat: "" });
  const [downloadOpenFor, setDownloadOpenFor] = useState(null); // contract id
  const [expandedAudit, setExpandedAudit] = useState({});       // grouped-event id → open
  const dlMenuRef = useRef(null);
  // Amendments tab
  const [amendSub, setAmendSub]       = useState("requested");  // "active" | "requested"
  const [reviewing, setReviewing]     = useState(null);          // amendment row being reviewed
  const [reviewBusy, setReviewBusy]   = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [toast, setToast]             = useState("");
  // Logged-in user — from the global Redux profile (populated at layout mount).
  const userProfile = useSelector((s) => s.userProfile);
  const me = Number(userProfile?.id) || null;

  // Fetch
  useEffect(() => {
    if (!arcProp?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await ArcApi.getActiveSummary(arcProp.id);
        const payload = res?.data ?? res ?? null;
        if (!cancelled) setData(payload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [arcProp?.id]);

  // Click-outside for the download menu
  useEffect(() => {
    function onClick(e) {
      if (dlMenuRef.current && !dlMenuRef.current.contains(e.target)) setDownloadOpenFor(null);
    }
    if (downloadOpenFor != null) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [downloadOpenFor]);

  // Derived ───────────────────────────────────────────────────────────────
  const arc        = data?.arc        || null;
  const contracts  = data?.contracts  || [];
  const events     = data?.events     || [];
  const callOffs   = data?.callOffs   || [];
  const amendments = data?.amendments || [];
  const addendums  = data?.addendums  || [];
  // Addenda grouped per contract for the documents tab (original + addenda).
  const addendaByContract = useMemo(() => {
    const m = {};
    addendums.forEach((a) => { (m[a.arc_contract_id] = m[a.arc_contract_id] || []).push(a); });
    return m;
  }, [addendums]);

  const isEnded = stage?.state === "ended";

  // vendor_id → display name, for the audit trail's plain-language lines.
  const vendorNameById = useMemo(() => {
    const map = {};
    contracts.forEach(({ contract }) => { map[Number(contract.vendor_id)] = contract.vendor_name; });
    return map;
  }, [contracts]);

  // arc_item_id → product name, for enriching allocation-update audit rows.
  const itemNameById = useMemo(() => {
    const map = {};
    contracts.forEach(({ consumption }) => (consumption || []).forEach((l) => {
      if (l.arc_item_id) map[Number(l.arc_item_id)] = l.variant_name || `item #${l.arc_item_id}`;
    }));
    return map;
  }, [contracts]);

  // Per-vendor signature state — the single source of truth for who has
  // signed. A contract is signed once it reaches 'active' (verifyOtp seals it).
  const isSigned = (contract) => contract?.status === "active" || !!contract?.signed_by_vendor_at;
  const vendorSignedById = useMemo(() => {
    const m = {};
    contracts.forEach(({ contract }) => { m[Number(contract.vendor_id)] = contract?.status === "active" || !!contract?.signed_by_vendor_at; });
    return m;
  }, [contracts]);
  const signTally = useMemo(() => {
    const signed = contracts.filter(({ contract }) => isSigned(contract)).length;
    const pending = contracts.filter(({ contract }) => !isSigned(contract)).map(({ contract }) => contract.vendor_name || `Vendor #${contract.vendor_id}`);
    return { total: contracts.length, signed, pending, allSigned: contracts.length > 0 && pending.length === 0 };
  }, [contracts]);

  // Audit trail with the noisy allocation churn collapsed into groups.
  const groupedEvents = useMemo(() => {
    const enriched = events.map((e) => {
      if (e.event_type === "comm_eval_allocation_updated" && e.payload?.item_id && !e.payload.item_name) {
        return { ...e, payload: { ...e.payload, item_name: itemNameById[Number(e.payload.item_id)] } };
      }
      return e;
    });
    return groupAuditEvents(enriched);
  }, [events, itemNameById]);

  // arc_contract_line_id → count of OPEN (requested) amendments. Drives the
  // "N amendments open" chip on the matching item × vendor consumption cell.
  // Contract-wide amendments (term extension — no line id) don't pin to a
  // cell; they're covered by the Amendments tab badge.
  const openAmendCountByLine = useMemo(() => {
    const map = {};
    amendments.forEach((a) => {
      if (a.status !== "requested") return;
      const lid = a.payload?.arc_contract_line_id;
      if (!lid) return;
      map[String(lid)] = (map[String(lid)] || 0) + 1;
    });
    return map;
  }, [amendments]);

  // Flatten every consumption line across vendor contracts with vendor meta.
  const allLines = useMemo(() => {
    const out = [];
    contracts.forEach(({ contract, consumption }) => {
      (consumption || []).forEach((ln) => {
        const rate = Number(ln.unit_rate ?? 0);
        const gst = Number(ln.gst_pct ?? 0);
        const committed = Number(ln.committed_qty ?? 0);
        const consumed = Number(ln.consumed_qty ?? 0);
        const remaining = Number(ln.remaining_qty != null ? ln.remaining_qty : Math.max(0, committed - consumed));
        const pct = Number(ln.pct_used != null ? ln.pct_used : committed ? (consumed / committed) * 100 : 0);
        const { bp, frt } = extractBpFrt(ln);
        // Live amendment overlay (from consumptionForContract): the effective
        // rate a call-off released today would use. cl.unit_rate stays the
        // committed baseline; effective_unit_rate is the amended rate.
        const effectiveRate = Number(ln.effective_unit_rate ?? rate);
        const amended = !!ln.amendment_id && effectiveRate !== rate;
        // Awarded rate per unit = Basic Price + Freight. This is the unit
        // value the client wants reflected in every ₹ figure (#258, #259):
        // values must "include all the charges" before tax.
        const awardedRate = bp + frt;
        const lineBase    = awardedRate * committed;
        const lineTax     = lineBase * (gst / 100);
        const lineTotal   = lineBase + lineTax;
        const consumedBase  = awardedRate * consumed;
        const consumedTax   = consumedBase * (gst / 100);
        const consumedTotal = consumedBase + consumedTax;
        out.push({
          ...ln,
          rate, gst, committed, consumed, remaining, pct, bp, frt,
          effectiveRate, amended,
          awardedRate,
          lineBase, lineTax, lineTotal,
          consumedBase, consumedTax, consumedTotal,
          vendorId:   contract.vendor_id,
          vendorName: contract.vendor_name || `Vendor #${contract.vendor_id}`,
          contractId: contract.id,
        });
      });
    });
    return out;
  }, [contracts]);

  // KPI rollups
  const kpi = useMemo(() => {
    const projected     = allLines.reduce((s, l) => s + l.lineBase, 0);
    const projectedTax  = allLines.reduce((s, l) => s + l.lineTax, 0);
    const consumedBase  = allLines.reduce((s, l) => s + l.consumedBase, 0);
    const consumedTax   = allLines.reduce((s, l) => s + l.consumedTax, 0);
    const totalCommittedQty = allLines.reduce((s, l) => s + l.committed, 0);
    const totalConsumedQty  = allLines.reduce((s, l) => s + l.consumed,  0);
    const drawnPct  = projected > 0 ? Math.round((consumedBase / projected) * 100) : 0;
    return {
      projected, projectedTotal: projected + projectedTax,
      consumed: consumedBase, consumedTotal: consumedBase + consumedTax,
      drawnPct, totalCommittedQty, totalConsumedQty,
    };
  }, [allLines]);

  // Group lines by vendor → for the Vendor lens.
  const byVendor = useMemo(() => {
    return contracts.map(({ contract }) => {
      const lines = allLines.filter((l) => l.contractId === contract.id);
      const total    = lines.reduce((s, l) => s + l.lineBase, 0);
      const consumed = lines.reduce((s, l) => s + l.consumedBase, 0);
      return {
        vendorId: contract.vendor_id,
        contract, lines, total, consumed,
        vendor: {
          id: contract.vendor_id,
          name: contract.vendor_name || `Vendor #${contract.vendor_id}`,
          email: contract.vendor_email || "",
          short: (contract.vendor_name || "").split(/\s+/)[0] || "Vendor",
          city:  "—",
          gstin: "—",
          rating:"—",
          initials: initials(contract.vendor_name),
          avClass: avClass(contract.vendor_id),
        },
      };
    });
  }, [contracts, allLines]);

  // Distinct vendor + product list for the vendor-header strip of the matrix.
  const vendorColumns = byVendor.map((b) => ({
    vendorId: b.vendorId,
    vendor:   b.vendor,
    total:    b.total,
    consumed: b.consumed,
    items:    b.lines,
  }));

  // Distinct items across all contracts (one row per arc_item_id).
  const itemRows = useMemo(() => {
    const seen = new Map();
    allLines.forEach((l) => {
      const id = String(l.arc_item_id);
      if (!seen.has(id)) {
        seen.set(id, {
          itemId: id,
          name: l.variant_name || `Item #${id}`,
          code: l.variant_slug || l.arc_item_id,
          uom:  l.uom || "—",
          subCategory: "Items",       // backend doesn't expose per-item sub-cat yet
          targetPrice: Number(l.target_price ?? 0),
          indicativeQty: Number(l.indicative_qty ?? l.committed ?? 0),
        });
      }
    });
    return Array.from(seen.values());
  }, [allLines]);

  // award-line lookup: itemId × vendorId → line
  function lineFor(itemId, vendorId) {
    return allLines.find((l) => String(l.arc_item_id) === String(itemId) && Number(l.vendorId) === Number(vendorId));
  }
  function rowStatus(itemId) {
    const lines = allLines.filter((l) => String(l.arc_item_id) === String(itemId));
    if (lines.length === 0) return "neutral";
    const totals = lines.reduce((acc, l) => ({ c: acc.c + l.committed, u: acc.u + l.consumed }), { c: 0, u: 0 });
    if (totals.c <= 0) return "neutral";
    if (totals.u > totals.c) return "excess";
    if (totals.u / totals.c < 0.25) return "shortfall";
    return "on-track";
  }
  function rowStatusLabel(s) {
    if (s === "excess")    return "Excess";
    if (s === "shortfall") return "Shortfall";
    if (s === "on-track")  return "On track";
    return "—";
  }

  // Items grouped by sub-category (single bucket fallback when not surfaced)
  const itemsBySub = useMemo(() => {
    const map = {};
    itemRows.forEach((r) => {
      const sub = r.subCategory || "Items";
      if (!map[sub]) map[sub] = [];
      map[sub].push(r);
    });
    return Object.entries(map).map(([sub, items]) => ({ sub, items }));
  }, [itemRows]);

  // L-ranks are PER PRODUCT (#269 refined): for each item, vendors are
  // ranked by landed rate (B.P + Frt) ascending — L1 is cheapest. A vendor
  // can be L1 on one item and L3 on another, so:
  //   · itemRankByVendor  — "<itemId>:<vendorId>" → rank, drives per-line tags
  //   · vendorHeaderRank  — header band ONLY when the vendor holds that rank
  //                         on more than 70% of their awarded items
  //   · vendorAvgRank     — mean item rank, used to order docs L1-first
  const { itemRankByVendor, vendorHeaderRank, vendorAvgRank } = useMemo(() => {
    const byItem = {};
    allLines.forEach((l) => {
      const k = String(l.arc_item_id);
      if (!byItem[k]) byItem[k] = [];
      byItem[k].push(l);
    });
    const itemRank = {};
    Object.entries(byItem).forEach(([itemId, lines]) => {
      [...lines]
        .sort((a, b) => a.awardedRate - b.awardedRate)
        .forEach((l, i) => { itemRank[`${itemId}:${l.vendorId}`] = i + 1; });
    });
    const headerRank = {};
    const avgRank = {};
    byVendor.forEach((b) => {
      const ranks = b.lines.map((l) => itemRank[`${l.arc_item_id}:${b.vendorId}`] || 99);
      avgRank[b.vendorId] = ranks.length ? ranks.reduce((s, r) => s + r, 0) / ranks.length : 99;
      const l1Share = ranks.length ? ranks.filter((r) => r === 1).length / ranks.length : 0;
      const l2Share = ranks.length ? ranks.filter((r) => r <= 2).length / ranks.length : 0;
      headerRank[b.vendorId] = l1Share > 0.7 ? 1 : l2Share > 0.7 ? 2 : null;
    });
    return { itemRankByVendor: itemRank, vendorHeaderRank: headerRank, vendorAvgRank: avgRank };
  }, [allLines, byVendor]);

  // Contract Doc filter options (#266) — all selectable, derived from data.
  const docProductOptions = useMemo(() => {
    const map = new Map();
    allLines.forEach((l) => {
      const k = String(l.arc_item_id);
      if (!map.has(k)) map.set(k, l.variant_name || `Item #${k}`);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allLines]);
  const docSubCatOptions = useMemo(() => {
    const set = new Set();
    allLines.forEach((l) => { if (l.sub_category_title) set.add(l.sub_category_title); });
    return Array.from(set).sort();
  }, [allLines]);

  // Per-doc line predicate — vendor narrows the doc list; product/sub-cat
  // narrow both the list AND each doc's rendered item lines.
  const docLineMatch = (l) => {
    if (docFilter.product && String(l.arc_item_id) !== String(docFilter.product)) return false;
    if (docFilter.subCat && (l.sub_category_title || "") !== docFilter.subCat) return false;
    return true;
  };
  // Only SIGNED vendors have a finalised contract document — unsigned ones
  // show as "pending signature" instead of a downloadable document.
  const signedVendors = byVendor.filter((b) => isSigned(b.contract) || isEnded);
  const pendingDocVendors = byVendor.filter((b) => !isSigned(b.contract) && !isEnded);
  const filteredDocs = signedVendors
    .filter((b) => {
      if (docFilter.vendor && String(docFilter.vendor) !== String(b.vendorId)) return false;
      return b.lines.some(docLineMatch);
    })
    .map((b) => ({ ...b, docLines: b.lines.filter(docLineMatch) }))
    // L1-first ordering by mean per-item rank — a vendor who is L1 on most
    // of their items floats to the top even if they slip on one line.
    .sort((a, b) => (vendorAvgRank[a.vendorId] ?? 99) - (vendorAvgRank[b.vendorId] ?? 99));

  // ── downloads (client-side, no backend round-trip) ──────────────────────
  const dlAnnexure = (b) => {
    const rows = (b.docLines || b.lines).map((ln, i) => ({
      "#": i + 1,
      Item: ln.variant_name || `Item #${ln.arc_item_id}`,
      Code: ln.variant_slug || ln.arc_item_id,
      "Basic price (₹)": Number(ln.bp || 0),
      "Freight (₹)": Number(ln.frt || 0),
      "Awarded rate (₹)": Number((ln.bp || 0) + (ln.frt || 0)),
      "Amended rate (₹)": ln.amended ? Number(ln.effectiveRate) : "",
      "Amended effective until": ln.amended && ln.amendment_effective_to ? fmtDate(ln.amendment_effective_to) : "",
      UOM: ln.uom || "",
      "GST %": Number(ln.gst ?? ln.gst_pct ?? 0),
      "Committed qty": Number(ln.committed || 0),
      "Payment terms": ln.payment_terms || "Net 30",
      "Line value (₹)": Math.round(Number(ln.lineBase || 0)),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 20 }, { wch: 6 }, { wch: 7 }, { wch: 14 }, { wch: 16 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rate annexure");
    XLSX.writeFile(wb, `${arc.arc_number || "ARC"}_${b.vendor.short}_rate-annexure.xlsx`);
    setDownloadOpenFor(null);
  };
  const dlContractCopy = (b) => {
    // Prefer the actual stored PDF (its SHA-256 is the integrity source of
    // truth); fall back to a printable reconstruction if it isn't generated.
    if (b.contract?.document_s3_url) {
      window.open(b.contract.document_s3_url, "_blank");
      setDownloadOpenFor(null);
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    const linesHtml = (b.docLines || b.lines).map((ln) => `<tr>
        <td>${ln.variant_name || ""}<div class="mono sub">${ln.variant_slug || ln.arc_item_id}</div></td>
        <td class="r mono">₹${Number((ln.bp || 0) + (ln.frt || 0)).toLocaleString("en-IN")}/${ln.uom || ""}</td>
        <td class="r mono">${Number(ln.gst ?? ln.gst_pct ?? 0)}%</td>
        <td class="r mono">${Number(ln.committed || 0).toLocaleString("en-IN")} ${ln.uom || ""}</td>
        <td class="r">${ln.payment_terms || "Net 30"}</td>
        <td class="r mono">₹${Math.round(Number(ln.lineBase || 0)).toLocaleString("en-IN")}</td>
      </tr>`).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${arc.arc_number} · ${b.vendor.name}</title>
      <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a18;max-width:820px;margin:32px auto;padding:0 28px;}
      h1{font-size:20px;margin:0 0 4px;} .meta{color:#6b6b66;font-size:12px;margin-bottom:20px;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e2e2dd;border-radius:8px;overflow:hidden;margin-bottom:18px;}
      .grid>div{padding:12px 16px;} .grid>div:first-child{border-right:1px solid #e2e2dd;}
      .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a85;font-weight:600;} .v{margin-top:5px;font-size:13px;font-weight:500;}
      table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px;} th,td{padding:9px 10px;border-bottom:1px solid #eee;text-align:left;}
      th{background:#fafaf8;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#8a8a85;} .r{text-align:right;} .mono{font-family:ui-monospace,monospace;} .sub{font-size:10px;color:#9a9a95;}
      .sig{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:16px;} .sigbox{border:1px solid #e2e2dd;border-radius:8px;padding:14px 16px;}
      .seal{font-size:11px;color:#6b6b66;margin-top:18px;border-top:1px dashed #d6d6d0;padding-top:10px;}</style></head>
      <body>
      <h1>Rate Contract — ${arc.title || ""}</h1>
      <div class="meta">${arc.arc_number || ""} · ${b.vendor.name} · ${b.contract.signed_by_vendor_at ? "Signed " + fmtDate(b.contract.signed_by_vendor_at) : "Awaiting signature"}</div>
      <div class="grid">
        <div><div class="k">Buyer</div><div class="v">${arc.hotel_name || ""}${arc.hotel_city ? " · " + arc.hotel_city : ""}</div></div>
        <div><div class="k">Term</div><div class="v">${fmtDate(arc.contract_start_at)} → ${fmtDate(arc.contract_end_at)}</div></div>
      </div>
      <table><thead><tr><th>Item</th><th class="r">Awarded rate</th><th class="r">GST</th><th class="r">Committed</th><th class="r">Payment</th><th class="r">Line value</th></tr></thead><tbody>${linesHtml}</tbody></table>
      <div class="sig">
        <div class="sigbox"><div class="k">For buyer</div><div class="v">${arc.buyer_name || "Procurement Lead"}</div></div>
        <div class="sigbox"><div class="k">For vendor — signed via OTP</div><div class="v">${b.vendor.name}</div></div>
      </div>
      <div class="seal">Signed-document hash (SHA-256): ${b.contract.document_hash || "—"}</div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
    setDownloadOpenFor(null);
  };
  // Fetch the contracted vendor's uploaded compliance documents (GST, PAN,
  // cancelled cheque, MSME, FSSAI) — proxied + base64'd by the backend to skip
  // S3 CORS — and download them as one zip.
  const dlVendorBundle = async (b) => {
    setDownloadOpenFor(null);
    setToast("Preparing vendor documents…");
    try {
      const res = await ArcApi.getVendorDocumentsBundle(b.contract.id);
      const data = res?.data || res || {};
      const ok = (data.files || []).filter((f) => f.content_base64 && !f.error);
      if (!ok.length) {
        setToast("No documents on file for this vendor");
        setTimeout(() => setToast(""), 4500);
        return;
      }
      const zip = new JSZip();
      ok.forEach((f) => zip.file(f.filename, f.content_base64, { base64: true }));
      const blob = await zip.generateAsync({ type: "blob" });
      const vname = (data.vendor_name || b.vendor?.name || "vendor").replace(/[^a-zA-Z0-9_-]+/g, "_");
      saveAs(blob, `${vname}_documents.zip`);
      const failed = (data.files || []).length - ok.length;
      setToast(failed > 0 ? `Downloaded ${ok.length} document(s) · ${failed} unavailable` : `Downloaded ${ok.length} document(s)`);
      setTimeout(() => setToast(""), 4500);
    } catch (e) {
      setToast("Couldn't fetch vendor documents");
      setTimeout(() => setToast(""), 4500);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) return <ActiveSkeleton />;
  if (!arc) {
    return <div className="empty-state"><h2>Contract data not found</h2><p>Contract documents haven&apos;t been generated for this ARC yet.</p></div>;
  }

  const daysLeft = daysBetween(arc.contract_end_at);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ═════ ENDED BANNER ═════ */}
      {isEnded && (
        <StageReadOnlyBanner>
          <strong>
            {arc.status === "terminated" ? "This contract was terminated"
              : arc.status === "closed_no_award" ? "This ARC closed without an award"
              : "This contract has ended"}
            {arc.contract_end_at ? <> — term ran until {fmtDate(arc.contract_end_at)}</> : null}.
          </strong>{" "}
          Everything below is the final, read-only record: consumption, released POs, signed
          documents, amendments and the full audit trail.
        </StageReadOnlyBanner>
      )}

      {/* ═════ SIGNING-PROGRESS BANNER — until every vendor has signed ═════ */}
      {!isEnded && signTally.total > 0 && !signTally.allSigned && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div>
            <strong>{signTally.signed} of {signTally.total} vendor contract{signTally.total === 1 ? "" : "s"} signed.</strong>{" "}
            Awaiting signature from <strong>{signTally.pending.join(", ")}</strong> — their rates stay sealed and released POs can't be raised against their lines until they sign.
          </div>
        </div>
      )}

      {/* ═════ KPI STRIP ═════ */}
      <section className="stat-strip" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="stat-card">
          <div className="s-ic green"><I.rupee /></div>
          <div><div className="s-val mono">{fmtL(withTaxes ? kpi.projectedTotal : kpi.projected)}</div><div className="s-label">Projected value</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic blue"><I.consumption /></div>
          <div>
            <div className="s-val mono">{fmtL(withTaxes ? kpi.consumedTotal : kpi.consumed)}</div>
            <div className="s-label">Consumed
              <button onClick={() => setWithTaxes((v) => !v)} style={{ marginLeft: 7, fontSize: 9.5, padding: "1px 6px", borderRadius: 5, border: "1px solid var(--border)", background: withTaxes ? "var(--fg)" : "var(--surface-3)", color: withTaxes ? "white" : "var(--fg-3)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
                {withTaxes ? "incl. tax" : "excl. tax"}
              </button>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="s-ic amber"><I.clock /></div>
          <div><div className="s-val mono">{kpi.drawnPct}%</div><div className="s-label">Drawn</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic violet"><I.callOff /></div>
          <div><div className="s-val mono">{callOffs.length}</div><div className="s-label">Released POs</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic indigo"><I.clock /></div>
          <div><div className="s-val mono">{isEnded ? 0 : daysLeft}</div><div className="s-label">Days remaining</div></div>
        </div>
      </section>

      {/* ═════ BODY GRID ═════ */}
      <div className="active-grid">

        {/* ──── LEFT — Tabs + content ──── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

          <div className="tab-row">
            <button className={`tab ${tab === "consumption" ? "active" : ""}`} onClick={() => setTab("consumption")}><I.consumption /> Consumption</button>
            <button className={`tab ${tab === "pos" ? "active" : ""}`} onClick={() => setTab("pos")}><I.callOff /> Released POs <span className="ct">{callOffs.length}</span></button>
            <button className={`tab ${tab === "doc" ? "active" : ""}`} onClick={() => setTab("doc")}><I.file /> Contract document <span className="ct">{contracts.length}</span></button>
            <button className={`tab ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}><I.clock /> Audit trail</button>
            <button className={`tab ${tab === "amendments" ? "active" : ""}`} onClick={() => setTab("amendments")}>
              <I.edit /> Amendments
              {(() => {
                const pending = amendments.filter((a) => a.status === "requested").length;
                if (pending > 0) {
                  return <span className="your-action" style={{ fontSize: 10, padding: "2px 8px" }}>{pending} pending</span>;
                }
                return <span className="ct">{amendments.length}</span>;
              })()}
            </button>
          </div>

          {/* ═════ CONSUMPTION ═════ */}
          {tab === "consumption" && (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap" style={{ marginBottom: 14 }}>
                <div className="sub-tabs">
                  <button className={view === "sub" ? "is-active" : ""} onClick={() => setView("sub")}><I.list /> Sub-category wise</button>
                  <button className={view === "product" ? "is-active" : ""} onClick={() => setView("product")}><I.box /> Product wise</button>
                  <button className={view === "vendor" ? "is-active" : ""} onClick={() => setView("vendor")}><I.user /> Vendor wise</button>
                </div>
                <div className="fs-12 text-fg-3">Same data · 3 lenses</div>
              </div>

              {/* Sub-category lens + Product lens share the matrix; only the
                  group header changes. */}
              {(view === "sub" || view === "product") && (
                <div className="matrix-wrap">
                  <div className="matrix-scroll">
                    <table className="matrix">
                      <thead>
                        <tr>
                          <th className="col-item">
                            <div className="matrix-item-head">
                              <span className="lbl">Item</span>
                              <span className="qty-lbl">Indicative qty</span>
                            </div>
                          </th>
                          {vendorColumns.map((v) => {
                            const pct = v.total ? Math.round((v.consumed / v.total) * 100) : 0;
                            const vSigned = !!vendorSignedById[v.vendorId];
                            return (
                              <th key={v.vendorId} className="cons-vendor-head">
                                <div className="cvh-row">
                                  <div className={`cvh-av ${v.vendor.avClass}`}>{v.vendor.initials}</div>
                                  <div className="cvh-main">
                                    <div className="cvh-name">
                                      <span>{v.vendor.short}</span>
                                      {isEnded ? <span className="cvh-active"><I.check /> Ended</span>
                                        : vSigned ? <span className="cvh-active"><I.check /> Signed</span>
                                        : <span className="cvh-wait"><I.clock /> Awaiting sign</span>}
                                    </div>
                                    <div className="cvh-total">{vSigned || isEnded ? fmtL(v.total) : "—"}</div>
                                    <div className="cvh-meta">
                                      <span>{v.items.length} item{v.items.length === 1 ? "" : "s"}</span>
                                    </div>
                                    <div className="cvh-bar"><div className="fill" style={{ width: pct + "%" }} /></div>
                                    <div className="cvh-pct"><span className="em">{pct}%</span> drawn · <span className="em">{fmtL(v.consumed)}</span> consumed</div>
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {(view === "sub" ? itemsBySub : [{ sub: null, items: itemRows }]).map((group, gi) => (
                          <tbody key={gi} style={{ display: "contents" }}>
                            {view === "sub" && (
                              <tr className="sub-cat-row">
                                <td className="col-item" colSpan={vendorColumns.length + 1}>
                                  <div className="sub-cat-head">
                                    <div className="sc-ic"><I.list /></div>
                                    <span className="sc-name">{group.sub}</span>
                                    <span className="sc-count">{group.items.length} item{group.items.length === 1 ? "" : "s"}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {group.items.map((row) => {
                              const rs = rowStatus(row.itemId);
                              return (
                                <tr key={row.itemId} className={"row-" + rs}>
                                  <td className="col-item">
                                    <div className="m-item-cell">
                                      <div className="meta">
                                        <div className="name">{row.name}</div>
                                        <div className="tags">
                                          <span className="cat-tag">{row.code}</span>
                                          <span className="per">per {row.uom}</span>
                                        </div>
                                        <div className={`cons-item-status ${rs}`}>{rowStatusLabel(rs)}</div>
                                      </div>
                                      <div className="qty-block">
                                        <div className="q mono">{Number(row.indicativeQty || 0).toLocaleString("en-IN")}</div>
                                        <div className="u">{row.uom}</div>
                                      </div>
                                    </div>
                                  </td>
                                  {vendorColumns.map((v) => {
                                    const ln = lineFor(row.itemId, v.vendorId);
                                    if (!ln) return <td key={v.vendorId} className="cons-cell"><div className="cons-content not-awarded">— not awarded —</div></td>;
                                    if (!vendorSignedById[v.vendorId] && !isEnded) {
                                      return (
                                        <td key={v.vendorId} className="cons-cell">
                                          <div className="cons-content cons-sealed">
                                            <span className="cc-rate dq-blur" aria-hidden="true">₹ ••••</span>
                                            <span className="cons-seal-chip">
                                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                              Rates sealed · pending signature
                                            </span>
                                          </div>
                                        </td>
                                      );
                                    }
                                    const bal = balanceState(ln);
                                    const rmDisplay = (bal.tone === "excess" ? "−" : bal.tone === "shortfall" ? "+" : "") + Math.abs(bal.delta).toLocaleString("en-IN");
                                    return (
                                      <td key={v.vendorId} className="cons-cell">
                                        <div className={`cons-content ${ln.pct >= 100 ? "danger" : ln.pct >= 75 ? "warn" : "ok"}`}>
                                          <div className="cc-top">
                                            {ln.amended ? (
                                              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
                                                <span className="cc-rate" style={{ color: "var(--warn)", fontWeight: 700 }}>{fmt(ln.effectiveRate)}</span>
                                                <span style={{ fontSize: 10, color: "var(--fg-4)", textDecoration: "line-through" }}>{fmt(ln.rate)}</span>
                                                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#a16207", background: "rgba(234,179,8,0.16)", padding: "1px 6px", borderRadius: 999 }}>amended</span>
                                                <AmendmentTooltip line={ln} uom={ln.uom} />
                                              </span>
                                            ) : (
                                              <span className="cc-rate success">{fmt(ln.rate)}</span>
                                            )}
                                            <span className="cc-awarded-badge"><I.check /> Awarded</span>
                                            {itemRankByVendor[`${ln.arc_item_id}:${v.vendorId}`] && (
                                              <span className={`lrank-chip l${Math.min(itemRankByVendor[`${ln.arc_item_id}:${v.vendorId}`], 3)}`} title="Commercial rank for this item (by landed rate)">
                                                L{itemRankByVendor[`${ln.arc_item_id}:${v.vendorId}`]}
                                              </span>
                                            )}
                                          </div>
                                          <div className="bp-frt-block" style={{ marginTop: 6 }}>
                                            <span className="bp-k">Awarded</span>
                                            <span className="bp-v">{fmt(ln.bp + ln.frt)}</span>
                                            <span className="sep">·</span>
                                            <span className="bp-k">B.P</span>
                                            <span className="bp-v">{fmt(ln.bp)}</span>
                                            <span className="sep">·</span>
                                            <span className="bp-k">Frt</span>
                                            <span className="bp-v">{fmt(ln.frt)}</span>
                                          </div>
                                          {openAmendCountByLine[String(ln.arc_contract_line_id)] > 0 && (
                                            <button
                                              type="button"
                                              className="amend-open-chip"
                                              title="Open the Amendments tab to review"
                                              onClick={(ev) => { ev.stopPropagation(); setTab("amendments"); setAmendSub("requested"); }}
                                            >
                                              <AmendIcon size={10} />
                                              {openAmendCountByLine[String(ln.arc_contract_line_id)]} amendment{openAmendCountByLine[String(ln.arc_contract_line_id)] === 1 ? "" : "s"} open
                                            </button>
                                          )}
                                          <div className="cc-sub">GST <span className="mono">{ln.gst}%</span></div>
                                          {/* Both qty and ₹ value on each row. Value = qty × (B.P + Frt)
                                              (incl. GST when the "incl. tax" toggle is on). */}
                                          <div className="cc-nums">
                                            <div className="row">
                                              <span className="k">Projected</span>
                                              <span className="v">
                                                {ln.committed.toLocaleString("en-IN")} <span style={{ color: "var(--fg-4)" }}>{row.uom}</span>
                                                <span style={{ color: "var(--fg-3)", margin: "0 5px" }}>·</span>
                                                <span className="mono" style={{ color: "var(--fg)" }}>{fmtL(withTaxes ? ln.lineTotal : ln.lineBase)}</span>
                                              </span>
                                            </div>
                                            <div className="row">
                                              <span className="k">Actual</span>
                                              <span className="v">
                                                {ln.consumed.toLocaleString("en-IN")} <span style={{ color: "var(--fg-4)" }}>{row.uom}</span>
                                                <span style={{ color: "var(--fg-3)", margin: "0 5px" }}>·</span>
                                                <span className="mono" style={{ color: "var(--fg)" }}>{fmtL(withTaxes ? ln.consumedTotal : ln.consumedBase)}</span>
                                              </span>
                                            </div>
                                            <div className="row">
                                              <span className="k">{bal.tone === "excess" ? "Excess" : bal.tone === "shortfall" ? "Shortfall" : "Remaining"}</span>
                                              <span className={`v ${pctTone(ln.pct)}`}>
                                                {rmDisplay} <span style={{ color: "var(--fg-4)" }}>{row.uom}</span>
                                                <span style={{ color: "var(--fg-3)", margin: "0 5px" }}>·</span>
                                                <span className="mono">{(bal.tone === "excess" ? "−" : bal.tone === "shortfall" ? "+" : "")}{fmtL(Math.abs(bal.delta) * ln.awardedRate * (withTaxes ? (1 + ln.gst / 100) : 1)).replace("₹", "₹")}</span>
                                              </span>
                                            </div>
                                          </div>
                                          <div className="cc-bar"><div className={`fill ${pctTone(ln.pct)}`} style={{ width: Math.min(100, ln.pct) + "%" }} /></div>
                                          <div className="cc-pct"><span className={`em ${pctTone(ln.pct)}`}>{Math.round(ln.pct)}%</span> drawn · <span className={`balance-pill ${bal.tone}`}>{bal.label}</span></div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="cons-totals">
                          <td className="col-item">Vendor totals</td>
                          {vendorColumns.map((v) => {
                            const pct = v.total ? Math.round((v.consumed / v.total) * 100) : 0;
                            return (
                              <td key={v.vendorId}>
                                <div className="cons-tfoot-cell">
                                  <div className="ct-row"><span className="k">Projected</span><span className="v">{fmtL(v.total)}</span></div>
                                  <div className="ct-row"><span className="k">Consumed</span><span className="v success">{fmtL(v.consumed)}</span></div>
                                  <div className="ct-row"><span className="k">Drawn</span><span className="v">{pct}%</span></div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Vendor lens — one block per vendor */}
              {view === "vendor" && (
                <div>
                  {byVendor.map((block) => {
                    const pct = block.total ? Math.round((block.consumed / block.total) * 100) : 0;
                    const vSigned = isSigned(block.contract) || isEnded;
                    return (
                      <div key={block.vendorId} className="sub-block">
                        <div className="ven-head">
                          <div className={`vh-av ${block.vendor.avClass}`}>{block.vendor.initials}</div>
                          <div className="vh-meta">
                            <div className="vh-name">{block.vendor.name}
                              {!vSigned && <span className="sign-wait-pill" style={{ marginLeft: 8 }}><I.clock /> Awaiting sign</span>}
                            </div>
                            <div className="vh-sub">{block.vendor.email || "—"}</div>
                          </div>
                          <div className="vh-stats">
                            <div><div className="vh-s-k">Projected</div><div className="vh-s-v">{vSigned ? fmtL(block.total) : "—"}</div></div>
                            <div><div className="vh-s-k">Consumed</div><div className="vh-s-v">{vSigned ? fmtL(block.consumed) : "—"}</div></div>
                            <div><div className="vh-s-k">Drawn</div><div className={`vh-s-v ${pctTone(pct)}`}>{vSigned ? `${pct}%` : "—"}</div></div>
                          </div>
                        </div>
                        {!vSigned ? (
                          <div className="vendor-sealed-note">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            Rates &amp; quantities are sealed until <strong>{block.vendor.short}</strong> signs the contract.
                          </div>
                        ) : block.lines.map((line) => {
                          const bal = balanceState(line);
                          const itemName = line.variant_name || "Item";
                          const rmDisplay = (bal.tone === "excess" ? "−" : bal.tone === "shortfall" ? "+" : "") + Math.abs(bal.delta).toLocaleString("en-IN");
                          return (
                            <div key={line.arc_contract_line_id} className="ic-card">
                              <div className="ic-meta">
                                <div className="ic-thumb-sm"><I.box /></div>
                                <div className="ic-name-row">
                                  <div className="ic-n">{itemName}</div>
                                  <div className="ic-s">
                                    <span className="mono">{line.variant_slug || line.arc_item_id}</span>
                                    <span style={{ color: "var(--fg-4)" }}>·</span>
                                    <span>{fmt(line.rate)} / {line.uom || "unit"}</span>
                                    <span className="bp-frt-block">
                                      <span className="bp-k">B.P</span><span className="bp-v">{fmt(line.bp)}</span>
                                      <span className="sep">·</span>
                                      <span className="bp-k">Frt</span><span className="bp-v">{fmt(line.frt)}</span>
                                    </span>
                                    <span className={`balance-pill ${bal.tone}`}>{bal.label}</span>
                                    {openAmendCountByLine[String(line.arc_contract_line_id)] > 0 && (
                                      <button
                                        type="button"
                                        className="amend-open-chip"
                                        title="Open the Amendments tab to review"
                                        onClick={(ev) => { ev.stopPropagation(); setTab("amendments"); setAmendSub("requested"); }}
                                      >
                                        <AmendIcon size={10} />
                                        {openAmendCountByLine[String(line.arc_contract_line_id)]} amendment{openAmendCountByLine[String(line.arc_contract_line_id)] === 1 ? "" : "s"} open
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="ic-bar">
                                <div>
                                  <div className="ic-nums">
                                    <span><span className="lbl">Projected</span><span className="val">{line.committed.toLocaleString("en-IN")} {line.uom || ""} · {fmtL(withTaxes ? line.lineTotal : line.lineBase)}</span></span>
                                    <span><span className="lbl">Actual</span><span className="val">{line.consumed.toLocaleString("en-IN")} {line.uom || ""} · {fmtL(withTaxes ? line.consumedTotal : line.consumedBase)}</span></span>
                                    <span>
                                      <span className="lbl">{bal.tone === "excess" ? "Excess" : bal.tone === "shortfall" ? "Shortfall" : "Remaining"}</span>
                                      <span className={`val ${pctTone(line.pct)}`}>
                                        {rmDisplay} {line.uom || ""} · {(bal.tone === "excess" ? "−" : bal.tone === "shortfall" ? "+" : "")}{fmtL(Math.abs(bal.delta) * line.awardedRate * (withTaxes ? (1 + line.gst / 100) : 1))}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="consumption-bar" style={{ marginTop: 8 }}>
                                    <div className="cb-track"><div className={`cb-fill ${pctTone(line.pct)}`} style={{ width: Math.min(100, line.pct) + "%" }} /></div>
                                  </div>
                                </div>
                                <div className="ic-pct">
                                  <div className={`ip-val ${pctTone(line.pct)}`}>{Math.round(line.pct)}%</div>
                                  <div className="ip-lbl">drawn</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ═════ CALL-OFF POs ═════ */}
          {tab === "pos" && (
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><I.callOff /></div>
                  <div><h2>Released purchase orders</h2><div className="h-sub">Every PO released against this contract — each is backed by an approved MR.</div></div>
                </div>
                {!isEnded && (
                  <div className="h-right">
                    <button className="btn btn-sm btn-blue" onClick={() => router.push("/dashboard/buyer/material-requisitions/create")}><I.callOff /> Create new MR</button>
                  </div>
                )}
              </div>
              <div className="section-body flush">
                {callOffs.length === 0 ? (
                  <div className="empty-state">
                    <div className="ic"><I.callOff /></div>
                    <h2>No released POs yet</h2>
                    <p>{isEnded ? "No released POs were released against this contract." : "Create a material requisition (MR) to draw against this contract using the button above."}</p>
                  </div>
                ) : (
                  <>
                    <div className="po-row" style={{ background: "var(--surface-2)", borderTop: "none" }}>
                      <div className="po-h">PO #</div>
                      <div className="po-h">MR #</div>
                      <div className="po-h">Vendor</div>
                      <div className="po-h">Item</div>
                      <div className="po-h" style={{ textAlign: "right" }}>Qty</div>
                      <div className="po-h" style={{ textAlign: "right" }}>Value</div>
                      <div className="po-h" style={{ textAlign: "right" }}>Status</div>
                    </div>
                    {callOffs.map((co) => (
                      <div key={co.call_off_id} className="po-row">
                        <a className="po-id" href={`/dashboard/buyer/purchase-orders/${co.po_id}`}>{co.po_number || `PO-${co.po_id}`}</a>
                        <div className="mono" style={{ color: "var(--fg-3)", fontSize: 12 }}>{co.mr_number || `MR-${co.mr_id}`}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                          <div className="ic-vendor-pill" style={{ padding: "2px 7px 2px 3px" }}>
                            <div className={`vp-av ${avClass(co.vendor_id)}`} style={{ width: 16, height: 16, fontSize: 8 }}>{initials(co.vendor_name)}</div>
                            <span className="vp-name">{(co.vendor_name || "").split(/\s+/)[0]}</span>
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: "var(--fg)" }}>{co.variant_name || `Item #${co.arc_item_id}`}</div>
                          <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 1 }}>line #{co.arc_contract_line_id}</div>
                        </div>
                        <div className="po-num-mono" style={{ textAlign: "right" }}>
                          {Number(co.quantity).toLocaleString("en-IN")} <span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, fontSize: 11, color: "var(--fg-3)" }}>{co.uom}</span>
                        </div>
                        <div className="po-num-mono" style={{ textAlign: "right" }}>{fmtL(co.total_value)}</div>
                        <div style={{ textAlign: "right" }}>
                          <span className={`status-pill ${co.po_status === "sent" || co.po_status === "approved" || co.po_status === "dispatched" ? "success" : co.po_status === "completed" ? "info" : "warn"}`} style={{ fontSize: 10.5 }}>
                            <span className="dot" />{co.po_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ═════ CONTRACT DOCUMENT ═════ */}
          {tab === "doc" && (
            <>
              <div className="guide">
                <div className="g-ic"><I.info /></div>
                <div>The contract document is finalised <strong>per vendor on signature</strong>. Only signed vendors&apos; documents are available to download — a vendor still pending signature has no final document yet.</div>
              </div>

              {pendingDocVendors.length > 0 && (
                <div className="guide warn" style={{ alignItems: "center" }}>
                  <div className="g-ic" style={{ marginTop: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  </div>
                  <div>
                    Awaiting signature: <strong>{pendingDocVendors.map((b) => b.vendor.name).join(", ")}</strong>. Their contract document will appear here once they sign with OTP.
                  </div>
                </div>
              )}

              {/* Filter row — #266: product / sub-category / vendor, all
                  selectable. Docs sort L1-first below. */}
              <div className="section-card">
                <div className="section-head" style={{ padding: "10px 14px" }}>
                  <div className="h-left" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="text-fg-3 fs-12" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><I.filter /> Filter</span>
                    <select className="select" value={docFilter.product} onChange={(e) => setDocFilter((d) => ({ ...d, product: e.target.value }))} style={{ width: 220, padding: "6px 10px", fontSize: 12.5 }}>
                      <option value="">All products</option>
                      {docProductOptions.map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
                    </select>
                    <select className="select" value={docFilter.subCat} onChange={(e) => setDocFilter((d) => ({ ...d, subCat: e.target.value }))} style={{ width: 190, padding: "6px 10px", fontSize: 12.5 }} disabled={docSubCatOptions.length === 0} title={docSubCatOptions.length === 0 ? "No sub-categories on this contract" : undefined}>
                      <option value="">All sub-categories</option>
                      {docSubCatOptions.map((sc) => (<option key={sc} value={sc}>{sc}</option>))}
                    </select>
                    <select className="select" value={docFilter.vendor} onChange={(e) => setDocFilter((d) => ({ ...d, vendor: e.target.value }))} style={{ width: 200, padding: "6px 10px", fontSize: 12.5 }}>
                      <option value="">All signed vendors</option>
                      {signedVendors.map((b) => (<option key={b.vendorId} value={b.vendorId}>{b.vendor.name}</option>))}
                    </select>
                    {(docFilter.product || docFilter.subCat || docFilter.vendor) && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setDocFilter({ vendor: "", product: "", subCat: "" })}>Clear</button>
                    )}
                  </div>
                  <div className="h-right">
                    <span className="text-fg-3 fs-12">Sorted L1 → L{Math.max(1, byVendor.length)}</span>
                  </div>
                </div>
              </div>

              {filteredDocs.length === 0 && signedVendors.length > 0 && (
                <div className="empty-state">
                  <div className="ic"><I.file /></div>
                  <h2>No matching documents</h2>
                  <p>Clear the filters or pick a different combination.</p>
                </div>
              )}
              {signedVendors.length === 0 && (
                <div className="empty-state">
                  <div className="ic"><I.file /></div>
                  <h2>No signed documents yet</h2>
                  <p>Documents appear here as each awarded vendor signs their contract with OTP.</p>
                </div>
              )}

              {filteredDocs.map((b) => {
                // Header band only when the vendor holds that rank on >70%
                // of their items; mixed-rank vendors get per-line tags only.
                const rank = vendorHeaderRank[b.vendorId];
                const bandCls = rank === 1 ? "is-l1" : rank === 2 ? "is-l2" : "";
                const dlOpen  = downloadOpenFor === b.contract.id;
                return (
                  <div key={b.vendorId} className={`doc-vendor ${bandCls}`}>
                    <div className="doc-vendor-head">
                      <div>
                        {rank ? <span className="vd-rank-pill">L{rank} vendor</span> : <span className="vd-rank-pill" style={{ background: "rgba(255,255,255,0.12)" }}>Mixed ranks · see items</span>}
                        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>Rate contract document</div>
                        <h3 className="vd-name">{b.vendor.name}</h3>
                        <div className="vd-sub">
                          {b.vendor.email || "—"} · <span className="mono">{"#" + arc.arc_number}</span> · signed {fmtDate(b.contract.signed_by_vendor_at)}
                        </div>
                      </div>
                      <div style={{ position: "relative" }} ref={dlOpen ? dlMenuRef : null}>
                        <button className="vd-action" onClick={() => setDownloadOpenFor(dlOpen ? null : b.contract.id)}>
                          <I.download /> Download <I.chevron />
                        </button>
                        {dlOpen && (
                          <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: 250, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 10, boxShadow: "var(--shadow-md)", padding: 6, zIndex: 30 }}>
                            <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", color: "var(--fg)" }} onClick={() => dlContractCopy(b)}><I.download /> Signed contract copy (print / PDF)</button>
                            <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", color: "var(--fg)" }} onClick={() => dlAnnexure(b)}><I.download /> Approved rate annexure (.xlsx)</button>
                            <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", color: "var(--fg)" }} onClick={() => dlVendorBundle(b)}><I.download /> Vendor documents bundle</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="doc-vendor-body">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ padding: "14px 18px", borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
                          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600 }}>Buyer</div>
                          <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--fg)", fontWeight: 500 }}>{arc.company_name || arc.hotel_name || "—"}{arc.hotel_name && arc.company_name ? <> · {arc.hotel_name}</> : null}</div>
                          <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--fg-3)" }}>POC: <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>{arc.buyer_name || "Procurement Lead"}</span>{arc.buyer_designation ? ` · ${arc.buyer_designation}` : ""}</div>
                        </div>
                        <div style={{ padding: "14px 18px", background: "var(--surface)" }}>
                          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600 }}>Term</div>
                          <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--fg)", fontWeight: 500 }}><span className="mono">{fmtDate(arc.contract_start_at)}</span> → <span className="mono">{fmtDate(arc.contract_end_at)}</span></div>
                          <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--fg-3)" }}>Escalation: {(arc.escalation_clause_json && arc.escalation_clause_json.type) || "None"}{arc.escalation_clause_json?.cap_pct ? ` · cap ${arc.escalation_clause_json.cap_pct}%` : ""}</div>
                        </div>
                      </div>

                      <table style={{ marginTop: 18, width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
                        <thead>
                          <tr>
                            {["Item", "B.P", "Frt", "Awarded", "GST", "Committed", "Payment", "Line value"].map((h) => (
                              <th key={h} style={{ background: "var(--surface-2)", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600, textAlign: h === "Item" ? "left" : "right", borderBottom: "1px solid var(--border)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(b.docLines || b.lines).map((ln) => {
                            const lineRank = itemRankByVendor[`${ln.arc_item_id}:${b.vendorId}`];
                            return (
                            <tr key={ln.arc_contract_line_id}>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)" }}>
                                <div style={{ fontWeight: 500, color: "var(--fg)", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                                  {ln.variant_name}
                                  {lineRank && <span className={`lrank-chip l${Math.min(lineRank, 3)}`}>L{lineRank}</span>}
                                </div>
                                <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{ln.variant_slug || ln.arc_item_id}</div>
                              </td>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "'Geist Mono',monospace", color: "var(--fg-2)" }}>{fmt(ln.bp)}</td>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "'Geist Mono',monospace", color: "var(--fg-2)" }}>{fmt(ln.frt)}</td>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "'Geist Mono',monospace", fontWeight: 700, color: "var(--success)" }}>{fmt(ln.bp + ln.frt)}/{ln.uom}</td>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "'Geist Mono',monospace", color: "var(--fg-2)" }}>{ln.gst}%</td>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "'Geist Mono',monospace", fontWeight: 600, color: "var(--fg)" }}>{ln.committed.toLocaleString("en-IN")} <span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, fontSize: 11, color: "var(--fg-3)" }}>{ln.uom}</span></td>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", textAlign: "right" }}>{ln.payment_terms || "Net 30"}</td>
                              <td style={{ padding: "13px 14px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "'Geist Mono',monospace", fontWeight: 700, color: "var(--success)" }}>{fmtL(withTaxes ? ln.lineTotal : ln.lineBase)}</td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div className="sig-block">
                          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600, marginBottom: 8 }}>Buyer signed</div>
                          <div className="sig-name">{arc.buyer_name || "Procurement Lead"}</div>
                          <div className="sig-meta">e-signed on committee approval · <span className="mono">{fmtDate(b.contract.generated_at || arc.committee_approved_at || arc.updated_at)}</span></div>
                        </div>
                        <div className="sig-block">
                          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600, marginBottom: 8 }}>Vendor signed via OTP</div>
                          <div className="sig-name">{b.vendor.short}</div>
                          <div className="sig-meta">On <span className="mono">{fmtDate(b.contract.signed_by_vendor_at)}</span></div>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, padding: "10px 13px", background: "var(--surface-2)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 11.5, color: "var(--fg-3)" }}>
                        Signed-document hash: <span className="mono fw-600" style={{ color: "var(--fg)" }}>{b.contract.document_hash || "n/a"}</span>
                      </div>

                      {/* Addenda — per-amendment re-signed documents. Never
                          overwrite the original above; listed as supplements. */}
                      {(addendaByContract[b.contract.id] || []).length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600, marginBottom: 8 }}>Addenda</div>
                          {(addendaByContract[b.contract.id] || []).map((ad) => {
                            const tone = ad.status === "signed"
                              ? { bg: "rgba(16,185,129,0.12)", fg: "var(--success)", label: `Signed ${fmtDate(ad.signed_by_vendor_at)}` }
                              : ad.status === "awaiting_signature"
                                ? { bg: "rgba(234,179,8,0.16)", fg: "#a16207", label: "Awaiting vendor signature" }
                                : { bg: "var(--surface-2)", fg: "var(--fg-3)", label: "Voided" };
                            return (
                              <div key={ad.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 13px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: "var(--fg)", fontSize: 12.5 }}>Addendum No. {ad.addendum_number} <span style={{ color: "var(--fg-3)", fontWeight: 500 }}>· {ad.amendment_type}</span></div>
                                  <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>SHA-256: <span className="mono">{ad.document_hash || "—"}</span></div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: tone.fg, background: tone.bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>{tone.label}</span>
                                  {ad.document_s3_url && <a className="btn btn-ghost btn-sm" href={ad.document_s3_url} target="_blank" rel="noreferrer"><I.download /> PDF</a>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ═════ AUDIT ═════ */}
          {tab === "audit" && (
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><I.clock /></div>
                  <div><h2>Audit trail</h2><div className="h-sub">Everything that happened on this contract, newest first.</div></div>
                </div>
              </div>
              <div className="section-body">
                <div className="audit-tl">
                  {groupedEvents.length === 0 && <div className="empty-state"><h2>No events yet</h2></div>}
                  {groupedEvents.map((g) => {
                    const e = g.head;
                    const d = describeAuditEvent(e, vendorNameById);
                    const tone = d.tone;
                    const ToneIcon = ({ t }) =>
                      t === "success" ? <Icon size={11} sw={2.6}><polyline points="20 6 9 17 4 12" /></Icon>
                      : t === "danger" ? <Icon size={11} sw={2.4}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
                      : t === "warn" ? <Icon size={11} sw={2.2}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>
                      : <Icon size={11} sw={2.4}><circle cx="12" cy="12" r="1.5" /></Icon>;
                    const grouped = g.children.length > 1;
                    const open = !!expandedAudit[e.id];

                    if (!grouped) {
                      return (
                        <div key={e.id} className="audit-tl-row">
                          <div className={`tl-ic ${tone}`}><ToneIcon t={tone} /></div>
                          <div className="tl-main">
                            <div className="tl-title">{d.title}</div>
                            {(d.detail || e.actor_name) && (
                              <div className="tl-detail">
                                {d.detail}{d.detail && e.actor_name ? " · " : ""}{e.actor_name ? <>by {e.actor_name}</> : null}
                              </div>
                            )}
                          </div>
                          <div className="tl-time">{fmtDate(e.at)}</div>
                        </div>
                      );
                    }

                    // Grouped: a single collapsible entry for repeated edits.
                    const label = e.event_type === "comm_eval_allocation_updated" ? "Award allocations updated"
                      : e.event_type === "contract_otp_requested" ? "Signing OTP requested"
                      : (d.title || "Updates");
                    return (
                      <div key={e.id} className="audit-tl-row is-group">
                        <div className={`tl-ic ${tone}`}><ToneIcon t={tone} /></div>
                        <div className="tl-main">
                          <button type="button" className="tl-group-head" onClick={() => setExpandedAudit((s) => ({ ...s, [e.id]: !s[e.id] }))}>
                            <span className="tl-title">{label} <span className="tl-count">{g.children.length}×</span></span>
                            <svg className={"tl-chev" + (open ? " is-open" : "")} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                          </button>
                          <div className="tl-detail">
                            {e.actor_name ? <>by {e.actor_name} · </> : null}
                            {fmtDate(g.children[g.children.length - 1].at)} → {fmtDate(e.at)}
                          </div>
                          {open && (
                            <div className="tl-children">
                              {g.children.map((c) => {
                                const cd = describeAuditEvent(c, vendorNameById);
                                return (
                                  <div key={c.id} className="tl-child">
                                    <span className="tl-child-dot" />
                                    <span className="tl-child-main">{cd.title}{cd.detail ? <span className="tl-child-detail"> · {cd.detail}</span> : null}</span>
                                    <span className="tl-child-time">{fmtDate(c.at)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="tl-time">{fmtDate(e.at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═════ AMENDMENTS ═════ */}
          {tab === "amendments" && (
            <AmendmentsTab
              arc={arc}
              amendments={amendments}
              allLines={allLines}
              me={me}
              sub={amendSub}
              setSub={setAmendSub}
              onReview={(am) => { setReviewError(""); setReviewing(am); }}
            />
          )}

        </div>

        {/* ──── RIGHT — Sticky aside ──── */}
        <aside className="active-aside">
          {!isEnded && (
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><I.renew /></div>
                  <div><h2>{daysLeft <= 60 ? "Renewal due" : "Renewal"}</h2></div>
                </div>
              </div>
              <div className="section-body">
                <div style={{ fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.5 }}>
                  Contract ends <strong style={{ color: "var(--fg)" }}>{fmtDate(arc.contract_end_at)}</strong> · <strong style={{ color: "var(--fg)" }}>{daysLeft} days</strong> remaining.
                </div>
                <button className="btn btn-blue btn-block btn-sm" style={{ marginTop: 11 }}>Start renewal draft</button>
              </div>
            </div>
          )}

          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic"><I.list /></div>
                <div><h2>Vendor contracts</h2></div>
              </div>
            </div>
            <div className="section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {byVendor.map((b) => {
                const signed = isSigned(b.contract);
                return (
                  <div key={b.vendorId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className={`va-chip ${b.vendor.avClass}`}>{b.vendor.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", lineHeight: 1.2 }}>{b.vendor.short}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                        {b.lines.length} item{b.lines.length === 1 ? "" : "s"} · <span className="mono">{fmtL(b.total)}</span>
                      </div>
                      {signed && b.contract.signed_by_vendor_at && (
                        <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>signed {fmtDate(b.contract.signed_by_vendor_at)}</div>
                      )}
                    </div>
                    {isEnded ? (
                      <span className="balance-pill shortfall" style={{ flexShrink: 0 }}><I.check /> Ended</span>
                    ) : signed ? (
                      <span className="balance-pill on-track" style={{ flexShrink: 0 }}><I.check /> Signed</span>
                    ) : (
                      <span className="sign-wait-pill" style={{ flexShrink: 0 }}><I.clock /> Awaiting sign</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* ═════ REVIEW MODAL (buyer reviews a vendor's amendment) ═════ */}
      {reviewing && (
        <ReviewAmendmentModal
          amendment={reviewing}
          arc={arc}
          allLines={allLines}
          me={me}
          busy={reviewBusy}
          error={reviewError}
          onClose={() => setReviewing(null)}
          onSubmit={async ({ decision, comment, edit }) => {
            setReviewError("");
            setReviewBusy(true);
            try {
              const reviewRes = await ArcApi.reviewAmendment(reviewing.id, { decision, comment, edit });
              const updated = reviewRes?.data?.amendment ?? reviewRes?.amendment ?? null;
              setReviewing(null);

              // Tell the user exactly what their decision did: rejected,
              // fully approved, or advanced to the next approval step.
              let msg;
              if (decision === "reject") {
                msg = `Rejection recorded — AMD-${reviewing.id} is closed`;
              } else if (updated?.status === "approved") {
                msg = `Approval recorded — AMD-${reviewing.id} is fully approved and will go live on its effective date`;
              } else {
                const chainLen = Array.isArray(updated?.approval_chain) ? updated.approval_chain.length : null;
                msg = chainLen
                  ? `Approval recorded — AMD-${reviewing.id} moved to step ${updated.current_step} of ${chainLen}`
                  : `Approval recorded for AMD-${reviewing.id}`;
              }
              setToast(msg);
              setTimeout(() => setToast(""), 4500);

              const res = await ArcApi.getActiveSummary(arcProp.id);
              const p = res?.data ?? res ?? null;
              setData(p);
            } catch (err) {
              const msg = err?.response?.data?.message || err?.message || "Could not submit decision";
              setReviewError(msg);
            } finally {
              setReviewBusy(false);
            }
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="arc-toast">
          <span className="t-ic"><I.check /></span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  AmendmentsTab — buyer side. Two sub-tabs:
//    · Requested — pending vendor amendments awaiting buyer action
//    · Active    — approved/live amendments currently overlaying contract terms
//  Click any row to open the ReviewAmendmentModal.
// ──────────────────────────────────────────────────────────────────────────
// Human label for an amendment status pill (awaiting_signature → readable).
function amStatusLabel(s) {
  if (s === "awaiting_signature") return "awaiting signature";
  if (s === "voided") return "voided";
  return s;
}

function AmendmentsTab({ arc, amendments, allLines, me, sub, setSub, onReview }) {
  const requested = amendments.filter((a) => a.status === "requested");
  // 'awaiting_signature' = approved, pending the vendor's addendum re-sign.
  const active    = amendments.filter((a) => a.status === "approved" || a.status === "awaiting_signature" || a.status === "live");
  const rest      = amendments.filter((a) => a.status === "rejected" || a.status === "ended" || a.status === "voided");
  const list = sub === "requested" ? requested : sub === "active" ? active : rest;

  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <div className="ic"><AmendIcon /></div>
          <div>
            <h2>Amendments</h2>
            <div className="h-sub">Vendor-initiated. Review the chain and approve, reject, or edit-then-approve.</div>
          </div>
        </div>
        <div className="h-right">
          <div className="sub-tabs">
            <button className={sub === "requested" ? "is-active" : ""} onClick={() => setSub("requested")}>
              Requested <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({requested.length})</span>
            </button>
            <button className={sub === "active" ? "is-active" : ""} onClick={() => setSub("active")}>
              Active <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({active.length})</span>
            </button>
            <button className={sub === "rest" ? "is-active" : ""} onClick={() => setSub("rest")}>
              Past <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({rest.length})</span>
            </button>
          </div>
        </div>
      </div>
      <div className="section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.length === 0 && (
          <div className="empty-state">
            <div className="ic"><AmendIcon size={22} /></div>
            <h2>No {sub} amendments</h2>
            <p>{sub === "requested" ? "Nothing waiting on your action." : sub === "active" ? "No amendments are live right now." : "Closed amendments will show up here."}</p>
          </div>
        )}
        {list.map((am) => (
          <AmendmentRow key={am.id} am={am} arc={arc} allLines={allLines} me={me} onClick={() => onReview(am)} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Proposed-vs-edited helpers. When a reviewer edits an amendment before
//  approving (counter-offer), the backend OVERWRITES am.payload with the new
//  value and preserves the vendor's ORIGINAL proposal only in edit_history
//  (the before_value of the first edit for that field). So am.payload always
//  reflects the *current* value; to surface what the vendor actually proposed
//  we trace edit_history. Both the row and the review modal use these.
// ──────────────────────────────────────────────────────────────────────────
function firstEditFor(am, field) {
  const eh = Array.isArray(am.edit_history) ? am.edit_history : [];
  const forField = eh
    .filter((e) => e.field_changed === field)
    .sort((a, b) => new Date(a.changed_at || 0) - new Date(b.changed_at || 0));
  return forField[0] || null;
}
// What the vendor originally proposed for a field (pre any internal edit).
function vendorProposedValue(am, field) {
  const first = firstEditFor(am, field);
  if (first) return first.before_value;
  if (field === "amendment_from" || field === "amendment_to") return am[field];
  return am.payload?.[field];
}
// Current (possibly edited) value of a field.
function currentValue(am, field) {
  if (field === "amendment_from" || field === "amendment_to") return am[field];
  return am.payload?.[field];
}
function wasFieldEdited(am, field) {
  return !!firstEditFor(am, field);
}

function AmendmentRow({ am, arc, allLines, me, onClick }) {
  const target = am.payload?.arc_contract_line_id
    ? allLines.find((l) => String(l.arc_contract_line_id) === String(am.payload.arc_contract_line_id))
    : null;
  const chain = Array.isArray(am.approval_chain) ? am.approval_chain : [];
  const total = chain.length || 0;
  const stepIdx = Math.max(0, (Number(am.current_step) || 1) - 1);
  const currentStep = chain[stepIdx] || null;
  const myTurn = isCurrentApprover(am, me);
  const statusTone = am.status === "requested" || am.status === "awaiting_signature" ? "warn" : am.status === "approved" || am.status === "live" ? "success" : am.status === "rejected" ? "danger" : "info";

  // What changed — headline + the original→proposed delta in one glance.
  const itemLabel = target ? target.variant_name
    : am.amendment_type === "term" ? "Contract term"
    : am.amendment_type === "item_add" ? "New item"
    : "—";
  // Small "· edited ₹X" tail shown when a reviewer counter-offered before
  // approving — so the row reflects BOTH the vendor's proposal and the edit.
  const editedTail = (field, render) =>
    wasFieldEdited(am, field)
      ? <span style={{ color: "var(--fg-4)", fontWeight: 500 }}> · edited <span className="mono fw-700" style={{ color: "var(--fg)" }}>{render(currentValue(am, field))}</span></span>
      : null;
  const delta = am.amendment_type === "price" && target
    ? <>₹{target.rate} <span style={{ color: "var(--fg-4)" }}>→</span> <span className="mono fw-700" style={{ color: "var(--warn)" }}>₹{vendorProposedValue(am, "new_rate")}</span> / {target.uom || "unit"}{editedTail("new_rate", (v) => `₹${v}`)}</>
    : am.amendment_type === "qty" && target
    ? <>{Number(target.committed).toLocaleString("en-IN")} <span style={{ color: "var(--fg-4)" }}>→</span> <span className="mono fw-700" style={{ color: "var(--warn)" }}>{Number(vendorProposedValue(am, "new_qty") || 0).toLocaleString("en-IN")}</span> {target.uom || ""}{editedTail("new_qty", (v) => Number(v || 0).toLocaleString("en-IN"))}</>
    : am.amendment_type === "term"
    ? <>{fmtDate(arc.contract_end_at)} <span style={{ color: "var(--fg-4)" }}>→</span> <span className="mono fw-700" style={{ color: "var(--warn)" }}>{fmtDate(vendorProposedValue(am, "amendment_from"))}</span>{editedTail("amendment_from", (v) => fmtDate(v))}</>
    : am.amendment_type === "item_add"
    ? <>₹{vendorProposedValue(am, "new_rate")} × {Number(vendorProposedValue(am, "new_qty") || 0).toLocaleString("en-IN")}{editedTail("new_rate", (v) => `₹${v}`)}</>
    : <>removal</>;

  const waitingOn = currentStep && am.status === "requested"
    ? (Array.isArray(currentStep.approver_names) && currentStep.approver_names.length
        ? currentStep.approver_names.join(", ")
        : currentStep.role || `Step ${stepIdx + 1}`)
    : null;

  return (
    <div onClick={onClick} role="button" tabIndex={0}
         onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
         style={{
           background: myTurn ? "linear-gradient(135deg,#fffdf7 0%,var(--surface) 55%)" : "var(--surface)",
           border: myTurn ? "1px solid rgba(180,83,9,0.34)" : "1px solid var(--border)",
           borderLeft: myTurn ? "3px solid var(--warn)" : undefined,
           borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.13s ease",
           display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
         }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
          <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>AMD-{am.id}</span>
          <span className="pill" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em" }}>{am.amendment_type.replace("_", " ")}</span>
          <span className={`status-pill ${statusTone}`} style={{ fontSize: 10.5 }}><span className="dot" />{amStatusLabel(am.status)}</span>
          {myTurn && <span className="your-action" style={{ fontSize: 10, padding: "2px 9px" }}>Your approval needed</span>}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", lineHeight: 1.35, display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
          <span>{itemLabel}</span>
          <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{delta}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span>Effective <span className="mono">{fmtDate(am.amendment_from)}</span>{am.amendment_to ? <> → <span className="mono">{fmtDate(am.amendment_to)}</span></> : null}</span>
          {am.vendor_name && (
            <>
              <span style={{ color: "var(--fg-4)" }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span className={`va-chip ${avClass(am.vendor_id)}`} style={{ width: 16, height: 16, fontSize: 7.5, borderRadius: 4 }}>{initials(am.vendor_name)}</span>
                {am.vendor_name}
              </span>
            </>
          )}
          <span style={{ color: "var(--fg-4)" }}>·</span>
          <span>{fmtDate(am.created_at)}</span>
          {waitingOn && !myTurn && (
            <>
              <span style={{ color: "var(--fg-4)" }}>·</span>
              <span>Waiting on <strong style={{ color: "var(--fg-2)" }}>{waitingOn}</strong></span>
            </>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
        {total > 0 && am.status === "requested" && (
          <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
            Step <span className="mono" style={{ fontWeight: 700, color: "var(--fg)" }}>{Math.min(stepIdx + 1, total)} / {total}</span>
          </div>
        )}
        <span className={`btn btn-sm ${myTurn ? "btn-warn" : "btn-secondary"}`} style={{ pointerEvents: "none" }}>
          {myTurn ? "Review & decide" : am.status === "requested" ? "View" : "Open"}
        </span>
      </div>
    </div>
  );
}

const AmendIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ──────────────────────────────────────────────────────────────────────────
//  ReviewAmendmentModal — buyer reviews a vendor's amendment request.
//  Shows summary, side-by-side original vs proposed, the locked approval
//  chain (vertical step list), comment box, and approve/reject/edit actions.
// ──────────────────────────────────────────────────────────────────────────
function ReviewAmendmentModal(props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(<ReviewAmendmentModalInner {...props} />, document.body);
}

const AMENDMENT_TYPE_LABEL = {
  price: "Price revision",
  qty: "Quantity revision",
  item_add: "Item addition",
  item_remove: "Item removal",
  term: "Term extension",
};

function ReviewAmendmentModalInner({ amendment, arc, allLines, me, busy, error, onClose, onSubmit }) {
  const am = amendment;
  const target = am.payload?.arc_contract_line_id
    ? allLines.find((l) => String(l.arc_contract_line_id) === String(am.payload.arc_contract_line_id))
    : null;
  const chain = Array.isArray(am.approval_chain) ? am.approval_chain : [];
  const editHistory = Array.isArray(am.edit_history) ? am.edit_history : [];
  const stepIdx = Math.max(0, (Number(am.current_step) || 1) - 1);
  const isPending = am.status === "requested";
  // Strict gate: Approve/Reject/Edit only for the current step's approver.
  // Everyone else gets a read-only view. (The server re-checks regardless.)
  const mayAct = isCurrentApprover(am, me);

  const [mtab, setMtab] = useState("details");   // details | chain | history
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const commentRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editPayload, setEditPayload] = useState({ ...(am.payload || {}) });
  const [editTermDate, setEditTermDate] = useState(am.amendment_from ? String(am.amendment_from).slice(0, 10) : "");

  // Which fields the reviewer may counter-offer on, per amendment type.
  // item_remove has nothing editable; everything else exposes its proposal.
  const editableFields =
    am.amendment_type === "price"    ? ["new_rate"]
    : am.amendment_type === "qty"      ? ["new_qty"]
    : am.amendment_type === "item_add" ? ["new_rate", "new_qty"]
    : am.amendment_type === "term"     ? ["amendment_from"]
    : [];
  const canEdit = isPending && mayAct && editableFields.length > 0;

  function editValid() {
    if (!editing) return true;
    if (am.amendment_type === "term") return !!editTermDate;
    return editableFields.every((f) => Number(editPayload[f]) > 0);
  }

  function commitDecision(decision) {
    // Rejection demands a reason — fail loudly instead of a silently
    // disabled button: mark the textarea, scroll it into view, focus it.
    if (decision === "reject" && !comment.trim()) {
      setCommentError(true);
      setMtab("details");
      setTimeout(() => commentRef.current?.focus(), 50);
      return;
    }
    let edit = null;
    if (decision === "approve" && editing && editableFields.length) {
      edit = {};
      for (const f of editableFields) {
        if (f === "amendment_from") edit.amendment_from = editTermDate;
        else edit[f] = Number(editPayload[f]);
      }
    }
    onSubmit({ decision, comment: comment.trim() || null, edit });
  }

  const statusTone = isPending || am.status === "awaiting_signature" ? "warn" : am.status === "approved" || am.status === "live" ? "success" : am.status === "rejected" ? "danger" : "info";

  // Did a reviewer counter-offer (edit) any of the proposed fields before
  // approving? If so we show the vendor's proposal AND the edited value.
  const proposedIsEdited = editableFields.some((f) => wasFieldEdited(am, f));

  const originalDisplay =
    am.amendment_type === "term"  ? fmtDate(arc.contract_end_at)
    : !target ? "—"
    : am.amendment_type === "price" ? `₹${target.rate} / ${target.uom || "unit"}`
    : am.amendment_type === "qty"   ? `${Number(target.committed).toLocaleString("en-IN")} ${target.uom || ""}`
    : am.amendment_type === "item_add" ? "Not on contract"
    : "—";
  // Format a per-type display given a value picker (vendor proposal vs current).
  const fmtTypeValue = (pick) =>
    am.amendment_type === "price" ? `₹${pick("new_rate")} / ${target?.uom || "unit"}`
    : am.amendment_type === "qty" ? `${Number(pick("new_qty") || 0).toLocaleString("en-IN")} ${target?.uom || ""}`
    : am.amendment_type === "term" ? fmtDate(pick("amendment_from"))
    : am.amendment_type === "item_add" ? `₹${pick("new_rate")} × ${Number(pick("new_qty") || 0).toLocaleString("en-IN")}`
    : "—";
  // "Proposed" = what the vendor originally asked for; "Edited" = current value.
  const proposedDisplay = fmtTypeValue((f) => vendorProposedValue(am, f));
  const editedDisplay = fmtTypeValue((f) => currentValue(am, f));

  // % change for a given price value vs the contract original.
  const pctOf = (rateVal) => {
    if (am.amendment_type !== "price" || !target) return null;
    const cur = Number(target.rate);
    const nv = Number(rateVal);
    if (!cur || !Number.isFinite(nv)) return null;
    return ((nv - cur) / cur) * 100;
  };
  const pctChange = pctOf(vendorProposedValue(am, "new_rate"));
  const pctEdited = proposedIsEdited ? pctOf(currentValue(am, "new_rate")) : null;

  return (
    <div className="arc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="arc-modal lg">
        {/* ── Header ── */}
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <div className="t" style={{ flexWrap: "wrap", gap: 8 }}>
              <h3>Review amendment <span className="mono" style={{ color: "var(--fg-3)", fontWeight: 600 }}>AMD-{am.id}</span></h3>
              <span className="pill" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em" }}>{AMENDMENT_TYPE_LABEL[am.amendment_type] || am.amendment_type}</span>
              <span className={`status-pill ${statusTone}`} style={{ fontSize: 10.5 }}><span className="dot" />{amStatusLabel(am.status)}</span>
            </div>
            <div className="sub">
              Vendor <strong style={{ color: "var(--fg)" }}>{am.vendor_name || am.requested_by_name || `User #${am.requested_by}`}</strong>
              {/* Only surface the requester separately when a different vendor-side
                  user raised it on the vendor's behalf. */}
              {am.requested_by_name && am.vendor_name && am.requested_by_name !== am.vendor_name
                ? <> · raised by <strong style={{ color: "var(--fg)" }}>{am.requested_by_name}</strong></>
                : null}
              {" · requested "}{fmtDate(am.created_at)}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── Tab row ── */}
        <div style={{ padding: "12px 22px 0", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <div className="sub-tabs" style={{ border: "none", background: "transparent", padding: 0, marginBottom: 10 }}>
            <button className={mtab === "details" ? "is-active" : ""} onClick={() => setMtab("details")}>Details</button>
            <button className={mtab === "chain" ? "is-active" : ""} onClick={() => setMtab("chain")}>
              Approval matrix <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({chain.length})</span>
            </button>
            <button className={mtab === "history" ? "is-active" : ""} onClick={() => setMtab("history")}>
              Edit history <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({editHistory.length})</span>
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* ═════ DETAILS ═════ */}
          {mtab === "details" && (
            <>
              <div className="kv-grid" style={{ rowGap: 9 }}>
                <div className="k">Item</div>
                <div className="v">{target ? <>{target.variant_name} <span className="mono" style={{ color: "var(--fg-4)", fontSize: 11 }}>{target.variant_slug || target.arc_item_id}</span></> : (am.amendment_type === "term" ? "Whole contract" : "—")}</div>
                <div className="k">Effective</div>
                <div className="v"><span className="mono">{fmtDate(am.amendment_from)}</span>{am.amendment_to ? <> → <span className="mono">{fmtDate(am.amendment_to)}</span></> : <span style={{ color: "var(--fg-4)" }}> (open-ended)</span>}</div>
                <div className="k">Reason</div>
                <div className="v" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{am.reason || "—"}</div>
              </div>

              {/* Original vs proposed compare */}
              {am.amendment_type !== "item_remove" && (
                <div style={{ marginTop: 18 }}>
                  <div className="section-label" style={{ marginBottom: 10 }}>
                    {proposedIsEdited && !editing ? "Original · proposed · edited" : "Original vs proposed"}
                  </div>
                  <div className="rvm-compare">
                    <div className="rvm-card">
                      <div className="k">Original</div>
                      <div className="v">{originalDisplay}</div>
                    </div>
                    <div className="arrow">→</div>
                    <div className="rvm-card proposed">
                      <div className="k">{proposedIsEdited && !editing ? "Vendor proposed" : "Proposed"}{editing ? " · editing" : ""}</div>
                      {editing && am.amendment_type === "term" ? (
                        <input
                          type="date"
                          className="input mono"
                          style={{ marginTop: 8, background: "white" }}
                          value={editTermDate}
                          onChange={(e) => setEditTermDate(e.target.value)}
                          autoFocus
                        />
                      ) : editing && editableFields.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                          {editableFields.map((f, fi) => (
                            <div key={f} className="input-group" style={{ background: "white" }}>
                              {f === "new_rate" ? <div className="prefix">₹</div> : null}
                              <input
                                type="number"
                                className="input input-num"
                                value={editPayload[f] ?? ""}
                                onChange={(e) => setEditPayload((p) => ({ ...p, [f]: e.target.value }))}
                                min={0}
                                step={f === "new_rate" ? "0.01" : "1"}
                                autoFocus={fi === 0}
                              />
                              <div className="suffix">{f === "new_rate" ? `/ ${target?.uom || "unit"}` : (target?.uom || "qty")}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="v">{proposedDisplay}</div>
                      )}
                    </div>
                    {/* Internally-edited (counter-offer) value, shown only when a
                        reviewer changed the proposal before approving. */}
                    {proposedIsEdited && !editing && (
                      <>
                        <div className="arrow">→</div>
                        <div className="rvm-card proposed" style={{ borderColor: "rgba(180,83,9,0.34)" }}>
                          <div className="k" style={{ color: "var(--warn)" }}>Edited</div>
                          <div className="v">{editedDisplay}</div>
                        </div>
                      </>
                    )}
                  </div>
                  {!editing && (pctChange != null || pctEdited != null) && (
                    <div className="help-text" style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {pctChange != null && (
                        <span>
                          {proposedIsEdited ? "Proposed: " : "Change: "}
                          <span className="mono fw-600" style={{ color: "var(--fg)" }}>{pctChange.toFixed(1)}%</span>
                          <span style={{ color: pctChange > 0 ? "var(--danger)" : "var(--success)", marginLeft: 6, fontWeight: 600 }}>
                            ({pctChange > 0 ? "increase" : "decrease"})
                          </span>
                        </span>
                      )}
                      {pctEdited != null && (
                        <span>
                          Edited: <span className="mono fw-600" style={{ color: "var(--fg)" }}>{pctEdited.toFixed(1)}%</span>
                          <span style={{ color: pctEdited > 0 ? "var(--danger)" : "var(--success)", marginLeft: 6, fontWeight: 600 }}>
                            ({pctEdited > 0 ? "increase" : "decrease"})
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Decision inputs — only while pending AND for the current approver */}
              {isPending && mayAct && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                  {canEdit && (
                    <label className="cbx" style={{ marginBottom: 12 }}>
                      <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
                      <span className="cbx-box" />
                      <span>Edit before approving (counter-offer) — your change is recorded in the edit history and the approval trail</span>
                    </label>
                  )}
                  <label className="label">
                    Your comment
                    <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "1px 7px", borderRadius: 99, background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid rgba(185,28,28,0.24)" }}>
                      required to reject
                    </span>
                  </label>
                  <textarea
                    ref={commentRef}
                    className="textarea"
                    value={comment}
                    onChange={(e) => { setComment(e.target.value); if (commentError && e.target.value.trim()) setCommentError(false); }}
                    placeholder="Add a remark for the audit trail — mandatory if you reject…"
                    style={commentError ? { borderColor: "var(--danger)", boxShadow: "0 0 0 3px rgba(185,28,28,0.14)" } : undefined}
                  />
                  {commentError && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--danger)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      Add a reason before rejecting this amendment.
                    </div>
                  )}
                </div>
              )}

              {/* Read-only note for non-approvers while pending */}
              {isPending && !mayAct && (
                <div className="guide" style={{ marginTop: 18, alignItems: "center" }}>
                  <div className="g-ic" style={{ marginTop: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  </div>
                  <div>
                    <strong>View only.</strong>{" "}
                    This amendment is waiting on{" "}
                    <strong>{(chain[stepIdx]?.approver_names || []).join(", ") || chain[stepIdx]?.role || `step ${stepIdx + 1}`}</strong>
                    {" "}— you are not the current approver.
                  </div>
                </div>
              )}

              {error && (
                <div className="guide danger" style={{ marginTop: 12 }}>
                  <div className="g-ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  </div>
                  <div style={{ color: "var(--danger)" }}>{error}</div>
                </div>
              )}
            </>
          )}

          {/* ═════ APPROVAL MATRIX ═════ */}
          {mtab === "chain" && (
            <>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {chain.length === 0 && (
                  <div className="empty-state" style={{ padding: 28 }}>
                    <h2>No chain resolved</h2>
                    <p>This amendment has no approval instance attached.</p>
                  </div>
                )}
                {chain.map((step, i) => {
                  const isCurrent = i === stepIdx && isPending;
                  // "your turn" only when the logged-in user is actually one
                  // of this step's approvers — otherwise the current step is
                  // simply in review with someone else.
                  const isMine = isCurrent && (step.approver_user_ids || []).map(Number).includes(Number(me));
                  const tone = step.status === "approved" ? "success" : step.status === "rejected" ? "danger" : isCurrent ? "warn" : "neutral";
                  const names = Array.isArray(step.approver_names) && step.approver_names.length ? step.approver_names.join(", ") : (step.role || `Step ${i + 1}`);
                  return (
                    <div key={i} className="rvm-chain-step" style={isMine ? { background: "var(--warn-soft)" } : undefined}>
                      <div className={`av ${avClass(step.approver_user_ids?.[0] || i)}`}>{initials(step.approver_names?.[0] || step.role || `S${i + 1}`)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="nm">{names}</div>
                        <div className="meta">
                          Step <span className="mono">{i + 1} of {chain.length}</span>
                          {step.decision_rule ? <> · {step.decision_rule === "ALL" ? "all must approve" : "any one approves"}</> : null}
                          {step.decided_at ? <> · {fmtDate(step.decided_at)}</> : null}
                        </div>
                        {step.comment && <div className="comment">{step.comment}</div>}
                      </div>
                      <span className={`status-pill ${tone}`} style={{ fontSize: 10.5 }}>
                        <span className="dot" />{isMine ? "your turn" : isCurrent ? "in review" : step.status || "pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="help-text" style={{ marginTop: 10 }}>
                The matrix was locked when the vendor submitted this request. Edits made during review appear in the trail as part of the approving step's comment.
              </div>
            </>
          )}

          {/* ═════ EDIT HISTORY ═════ */}
          {mtab === "history" && (
            <>
              {editHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: 28 }}>
                  <div className="ic"><AmendIcon size={20} /></div>
                  <h2>No edits yet</h2>
                  <p>When a reviewer edits the proposed values before approving, each change lands here with a before/after diff.</p>
                </div>
              ) : (
                <div>
                  {editHistory.map((e) => {
                    // Human label + value formatting per field. Dates render
                    // through fmtDate; numeric proposals get their unit.
                    const FIELD_LABEL = {
                      new_rate: "Proposed rate",
                      new_qty: "Proposed quantity",
                      amendment_from: am.amendment_type === "term" ? "New end date" : "Effective from",
                      amendment_to: "Effective to",
                    };
                    const fmtVal = (v) => {
                      if (v == null || v === "") return "—";
                      if (e.field_changed === "amendment_from" || e.field_changed === "amendment_to") return fmtDate(v);
                      if (e.field_changed === "new_rate") return `₹${v}`;
                      return String(v);
                    };
                    return (
                      <div key={e.id} className="rvm-edit-card">
                        <div className="eh-head">
                          <div className="eh-ic"><AmendIcon size={13} /></div>
                          <div className="eh-who">
                            <span className="em">{e.changed_by_name || `User #${e.changed_by}`}</span> edited this amendment before approving
                          </div>
                          <div className="eh-time">{fmtDate(e.changed_at)}</div>
                        </div>
                        <div className="eh-body">
                          <span className="eh-field">{FIELD_LABEL[e.field_changed] || e.field_changed.replace(/_/g, " ")}</span>
                          <span className="eh-val">{fmtVal(e.before_value)}</span>
                          <span className="eh-arrow">→</span>
                          <span className="eh-val after">{fmtVal(e.after_value)}</span>
                        </div>
                        {e.comment && <div className="eh-comment">"{e.comment}"</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-foot" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{isPending && mayAct ? "Cancel" : "Close"}</button>
          {isPending && mayAct ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-danger btn-lg" onClick={() => commitDecision("reject")} disabled={busy}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Reject
              </button>
              <button className="btn btn-success btn-lg" onClick={() => commitDecision("approve")} disabled={busy || !editValid()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {busy ? "Submitting…" : editing ? "Save edit & approve" : "Approve"}
              </button>
            </div>
          ) : isPending ? (
            <div className="help-text" style={{ margin: 0 }}>
              View only — waiting on <strong>{(chain[stepIdx]?.approver_names || []).join(", ") || `step ${stepIdx + 1}`}</strong>.
            </div>
          ) : (
            <div className="help-text" style={{ margin: 0 }}>No further actions — amendment is <strong>{amStatusLabel(am.status)}</strong>.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — mirrors the real DOM tightly so the load feels structured.
// ──────────────────────────────────────────────────────────────────────────
const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function ActiveSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="arc-sk-kpi">
            <Sk w={38} h={38} r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Sk w="55%" h={18} style={{ marginBottom: 6 }} />
              <Sk w="40%" h={10} />
            </div>
          </div>
        ))}
      </section>

      <div className="active-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[120, 150, 180, 110].map((w, i) => <Sk key={i} w={w} h={32} r={8} />)}
          </div>
          <Sk w={360} h={36} r={9} />

          <div className="matrix-wrap">
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 1fr 1fr", gap: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                <div>
                  <Sk w={60} h={10} style={{ marginBottom: 8 }} />
                  <Sk w={120} h={20} />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 11 }}>
                    <Sk w={30} h={30} r={8} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Sk w="70%" h={14} style={{ marginBottom: 6 }} />
                      <Sk w="50%" h={18} style={{ marginBottom: 7 }} />
                      <Sk w="60%" h={10} style={{ marginBottom: 8 }} />
                      <Sk w="100%" h={6} r={99} />
                    </div>
                  </div>
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, ri) => (
                <div key={ri} style={{ display: "grid", gridTemplateColumns: "260px 1fr 1fr 1fr", gap: 14, padding: "16px 0", borderBottom: ri < 2 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <Sk w="80%" h={14} style={{ marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <Sk w={70} h={16} r={5} />
                      <Sk w={40} h={16} r={5} />
                    </div>
                    <Sk w={90} h={11} style={{ marginTop: 8 }} />
                  </div>
                  {Array.from({ length: 3 }).map((__, ci) => (
                    <div key={ci} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                      <Sk w="35%" h={18} style={{ marginBottom: 8 }} />
                      <Sk w="80%" h={22} r={7} style={{ marginBottom: 10 }} />
                      <Sk w="50%" h={10} style={{ marginBottom: 12 }} />
                      <Sk w="100%" h={10} style={{ marginBottom: 4 }} />
                      <Sk w="100%" h={10} style={{ marginBottom: 4 }} />
                      <Sk w="100%" h={10} style={{ marginBottom: 8 }} />
                      <Sk w="100%" h={6} r={99} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="active-aside">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="arc-sk-tile">
              <Sk w={120} h={14} style={{ marginBottom: 14 }} />
              <Sk w="100%" h={48} r={8} style={{ marginBottom: 11 }} />
              <Sk w={140} h={28} r={6} />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
