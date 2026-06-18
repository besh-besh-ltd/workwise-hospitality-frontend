// MR List page — port of prototypes/arc_ui/mr-list.html. Shared component
// used by index.js + the 5 filtered sibling pages (drafts / pending / approved
// / po-released / cancelled). Real data comes from @/services/mr.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import * as MrApi from "@/services/mr";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";
import { MrListSkeleton } from "./MrSkeletons";

// Map filterPreset → backend statusGroup parameter.
const PRESET_TO_STATUS_GROUP = {
  all:          "all",
  "needs-action": "all",
  drafts:       "drafts",
  pending:      "pending",
  approved:     "approved",
  "po-released":"po_released",
  cancelled:    "cancelled",
};

const STATUS_LABEL = {
  draft:            "Draft",
  pending_approval: "Pending approval",
  approved:         "Approved",
  po_released:      "PO released",
  rejected:         "Rejected",
  cancelled:        "Cancelled",
};

const STATUS_TONE = {
  draft:            "draft",
  pending_approval: "eval",
  approved:         "active",
  po_released:      "active",
  rejected:         "terminated",
  cancelled:        "terminated",
};

// Backend status → badge style modifier in the prototype CSS.
const STATUS_BADGE = {
  draft:            "draft",
  pending_approval: "dept-approval",
  approved:         "finance-approval",
  po_released:      "po-released",
  rejected:         "rejected",
  cancelled:        "rejected",
};

const fmtL = (n) => "₹" + (((Number(n) || 0)) / 100000).toFixed(2) + " L";

const formatDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch (_e) { return "—"; }
};

// ── Inline SVG icons (Lucide-style strokes) — keep parity with prototype.
const Icon = ({ d, w = 16, h = 16, sw = 2 }) => (
  <svg width={w} height={h} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
       dangerouslySetInnerHTML={{ __html: d }} />
);

const BADGE_PATHS = {
  "draft":              '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  "dept-approval":      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  "category-approval":  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  "finance-approval":   '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  "po-released":        '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>',
  "rejected":           '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
};

function MrCard({ m }) {
  const badgeKey = STATUS_BADGE[m.status] || "draft";
  const statusLabel = STATUS_LABEL[m.status] || m.status;
  const statusTone = STATUS_TONE[m.status] || "draft";

  const isUrgent = String(m.urgency || "").toLowerCase() === "urgent";
  const cardClass = "mr-card" + (isUrgent ? " urgent" : "");

  // Approval chain dots — derived from current status. Without per-step
  // detail on the row we surface: prior steps "done", current "current",
  // upcoming "pending"; rejected lights up rejected.
  const stepStates = useMemo(() => {
    const order = ["dept", "category", "finance"];
    if (m.status === "rejected" || m.status === "cancelled") {
      return ["rejected", "pending", "pending"];
    }
    if (m.status === "draft") return ["pending", "pending", "pending"];
    if (m.status === "pending_approval") return ["current", "pending", "pending"];
    if (m.status === "approved" || m.status === "po_released") {
      return ["done", "done", "done"];
    }
    return order.map(() => "pending");
  }, [m.status]);

  return (
    <Link href={`/dashboard/buyer/material-requisitions/${m.id}`}
          className={cardClass} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="mr-head">
        <div className={"mr-badge " + badgeKey}>
          <Icon d={BADGE_PATHS[badgeKey] || BADGE_PATHS.draft} w={20} h={20} />
        </div>
        <div className="mr-info">
          <div className="mr-title">
            <span>{m.title}</span>
            <span className="mr-num">{"#" + m.mr_number}</span>
            <span className={"mr-urgency-pill " + (m.urgency || "normal")}>
              {m.urgency || "normal"}
            </span>
          </div>
          <div className="mr-sub">
            {m.department_name && (
              <>
                <span className="em">{m.department_name}</span>
                <span className="sep">·</span>
              </>
            )}
            {m.hotel_name && (
              <>
                <span><span className="em">{m.hotel_name}</span></span>
                <span className="sep">·</span>
              </>
            )}
            <span>Required by <span className="em mono">{formatDate(m.required_by_date)}</span></span>
            <span className="sep">·</span>
            <span>Raised <span className="em mono">{formatDate(m.submitted_at || m.created_at)}</span></span>
          </div>
        </div>
        <div className="mr-right">
          <span className={"status-pill " + statusTone}>
            <span className="dot"></span><span>{statusLabel}</span>
          </span>
          {m.total_est_value != null && (
            <span className="mono fw-700 text-fg fs-13">{fmtL(m.total_est_value)}</span>
          )}
        </div>
      </div>
      <div className="mr-foot">
        <div className="mr-step-progress">
          <span>Approval chain</span>
          <span className="mr-dots">
            {stepStates.map((s, idx) => (
              <span key={idx} className={"mr-dot " + s}
                    title={["Dept","Category","Finance"][idx] + ": " + s} />
            ))}
          </span>
          <span>·</span>
          <span className="fs-12">
            Raised by <span className="em fw-600 text-fg">{m.raised_by_name || "—"}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function MrListPage({ filterPreset = "all" }) {
  const router = useRouter();
  const [rows, setRows]       = useState([]);
  const [counts, setCounts]   = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState(filterPreset);

  // Honour ?filter= override from the URL the way the prototype does.
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.filter;
    if (q && typeof q === "string") setFilter(q);
    else setFilter(filterPreset);
  }, [router.isReady, router.query.filter, filterPreset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const ctx = getStoredHospitalityContext() || {};
    const params = {
      page: 1,
      limit: 50,
      statusGroup: PRESET_TO_STATUS_GROUP[filter] || "all",
    };
    if (ctx.hospitality_company_id) params.hospitality_company_id = ctx.hospitality_company_id;
    if (ctx.hotel_id) params.hotel_ids = String(ctx.hotel_id);

    (async () => {
      try {
        const [listRes, kpiRes] = await Promise.all([
          MrApi.listMrs(params),
          MrApi.getDashboardKpis(
            ctx.hospitality_company_id
              ? { hospitality_company_id: ctx.hospitality_company_id }
              : {}
          ),
        ]);
        if (cancelled) return;
        setRows(Array.isArray(listRes?.data) ? listRes.data : (listRes?.data?.data || []));
        setCounts(kpiRes?.counts || kpiRes?.data?.counts || {});
      } catch (_err) {
        if (!cancelled) { setRows([]); setCounts({}); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  // Client-side search across already-loaded rows.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => (
      String(m.title || "").toLowerCase().includes(q) ||
      String(m.mr_number || "").toLowerCase().includes(q) ||
      String(m.department_name || "").toLowerCase().includes(q)
    ));
  }, [rows, search]);

  const c = {
    all:         counts.all         ?? 0,
    drafts:      counts.drafts      ?? 0,
    pending:     counts.pending     ?? 0,
    approved:    counts.approved    ?? 0,
    po_released: counts.po_released ?? 0,
    cancelled:   counts.cancelled   ?? 0,
  };

  const TAB = (key, label, count) => (
    <button key={key}
            className={"tab" + (filter === key ? " active" : "")}
            onClick={() => setFilter(key)}>
      {label} <span className="ct">{count}</span>
    </button>
  );

  if (loading) return <MrListSkeleton />;

  return (
    <div className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Material Requisitions</h1>
          <p className="page-sub">
            Primary demand path. Departmental approval → auto call-off PO when items match an active rate contract.
          </p>
        </div>
        <Link href="/dashboard/buyer/material-requisitions/create" className="btn btn-blue btn-lg">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Raise new MR
        </Link>
      </div>

      <div className="guide" style={{ padding: "12px 16px" }}>
        <div className="g-ic">
          <Icon w={14} h={14}
                d='<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>' />
        </div>
        <div>
          <strong>MR is the standard path for all material demand.</strong>{" "}
          Direct PO release is reserved for scheduled, system-reorder and emergency scenarios — every use is logged for audit.
        </div>
      </div>

      {/* KPI strip */}
      <section className="kpi-grid">
        <div className="kpi-tile accent">
          <div className="kt-row">
            <div className="kt-label">Total MRs</div>
            <div className="kt-ic">
              <Icon d='<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>' />
            </div>
          </div>
          <div className="kt-val mono">{c.all}</div>
          <div className="kt-sub">FY 26 to date</div>
        </div>
        <div className="kpi-tile warn">
          <div className="kt-row">
            <div className="kt-label">Pending approval</div>
            <div className="kt-ic">
              <Icon d='<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' />
            </div>
          </div>
          <div className="kt-val mono">{c.pending}</div>
          <div className="kt-sub">across all hotels in scope</div>
        </div>
        <div className="kpi-tile success">
          <div className="kt-row">
            <div className="kt-label">PO released</div>
            <div className="kt-ic">
              <Icon d='<polyline points="20 6 9 17 4 12"/>' />
            </div>
          </div>
          <div className="kt-val mono">{c.po_released}</div>
          <div className="kt-sub">converted to call-off POs</div>
        </div>
        <div className="kpi-tile violet">
          <div className="kt-row">
            <div className="kt-label">Approved</div>
            <div className="kt-ic">
              <Icon d='<polyline points="20 6 9 17 4 12"/>' />
            </div>
          </div>
          <div className="kt-val mono">{c.approved}</div>
          <div className="kt-sub">ready for PO release</div>
        </div>
      </section>

      {/* Filter row */}
      <div className="section-card">
        <div className="section-head">
          <div className="tab-row">
            {TAB("all",         "All",         c.all)}
            {TAB("drafts",      "Drafts",      c.drafts)}
            {TAB("pending",     "Pending",     c.pending)}
            {TAB("approved",    "Approved",    c.approved)}
            {TAB("po-released", "PO released", c.po_released)}
            {TAB("cancelled",   "Cancelled",   c.cancelled)}
          </div>
          <div className="h-right">
            <div className="search-input" style={{ width: 260 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="input"
                     placeholder="Search MRs…"
                     value={search}
                     onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="section-body flush">
          <div style={{ padding: "14px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

            {filtered.map((m) => (
              <MrCard key={m.id} m={m} />
            ))}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="ic">
                  <Icon w={22} h={22} sw={1.8}
                        d='<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' />
                </div>
                <h2>No MRs match this filter</h2>
                <p>Try another tab or clear the search box.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
