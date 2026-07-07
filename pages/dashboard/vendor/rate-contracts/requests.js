// Vendor portal — Rate Contracts Received page.
// Ported from prototypes/arc_ui/vendor-requests.html. Tabs across the three
// vendor list endpoints (requests, pending-acceptance, active) and derives a
// per-card "my status" from invitation + contract metadata. Uses inline SVGs
// + the prototype's CSS class names (provided globally by styles/arc_v2.css).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";

// ---- helpers ------------------------------------------------------------

const fmtL = (n) => {
  if (n == null || isNaN(n)) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (Math.abs(v) >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
  if (Math.abs(v) >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Submission deadline (submission_end_at) is `timestamp without time zone` —
// an IST wall-clock string. Slice it directly instead of going through
// Date(), which would render in the viewer's local timezone.
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDateTime = (d) => {
  if (!d) return "—";
  const m = String(d).replace("T", " ").match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})/);
  if (!m) return fmtDate(d);
  const [, y, mo, da, hh, mi] = m;
  const h = Number(hh);
  const h12 = ((h + 11) % 12) + 1;
  return `${da} ${MON_SHORT[Number(mo) - 1]} ${y}, ${h12}:${mi} ${h >= 12 ? "PM" : "AM"}`;
};

const daysFromNow = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((dt - today) / (1000 * 60 * 60 * 24));
  return diff;
};

// Map a backend row (from any of the three vendor endpoints) into a
// uniform card view-model with a synthetic "myStatus" used to filter +
// label the card.
const buildItems = ({ requests, pending, active }) => {
  const out = [];

  // This page is the PENDING workspace only — open invitations, quotes
  // under evaluation, and contracts awaiting the vendor's signature.
  // Active/expired contracts live on the Active Contracts page; the stat
  // tile links there. (`active` is still fetched for that count.)

  // 1) Pending vendor acceptance / sign.
  (pending || []).forEach((c) => {
    out.push({
      key: `p-${c.id}`,
      id: c.id,
      arc_id: c.arc_id,
      arc_number: c.arc_number,
      title: c.arc_title || c.title,
      category: c.category_title,
      submission_end_at: c.submission_end_at,
      term_start: c.contract_start_at,
      term_end: c.contract_end_at,
      awaiting_deadline: c.awaiting_until || c.contract_start_at,
      buyer_name: c.buyer_name || c.created_by_name,
      committed: c.committed_value,
      myStatus: "awaiting-sign",
    });
  });

  // 2) Invitations / quote requests. Derive my status from invitation +
  //    quote + arc status. Closed/declined/not-awarded rows are excluded —
  //    nothing pending on them.
  (requests || []).forEach((r) => {
    // Skip if this arc is already represented as an awaiting-sign card.
    const dupe = out.find((x) => x.arc_id === r.id || x.arc_id === r.arc_id);
    if (dupe) return;

    let myStatus = "open";
    if (r.quote_submitted_at) myStatus = "submitted";
    if (r.status === "evaluation" || r.status === "eval" || r.status === "committee") {
      myStatus = "evaluating";
    }
    if (r.status === "closed" || r.status === "completed" || r.status === "expired"
        || r.invitation_status === "declined"
        || r.status === "contract_active" || r.status === "expiring_soon") {
      return; // not pending — lives on the Active Contracts page (or is closed)
    }

    out.push({
      key: `r-${r.id}`,
      id: r.id,
      arc_id: r.id,
      arc_number: r.arc_number,
      title: r.title,
      category: r.category_title,
      submission_end_at: r.submission_end_at,
      term_start: r.contract_start_at,
      term_end: r.contract_end_at,
      buyer_name: r.created_by_name,
      item_count: r.item_count || (r.items && r.items.length) || 0,
      invited_count: r.invited_count,
      submitted_count: r.submitted_count,
      invitation_status: r.invitation_status,
      myStatus,
    });
  });

  return out;
};

const STATUS_LABEL = {
  "awaiting-sign": "Contract awaiting your sign",
  active: "Active contract",
  past: "Past contract",
  submitted: "Submitted",
  evaluating: "Under evaluation",
  open: "Awaiting your quote",
  "not-awarded": "Not awarded",
};

const BADGE_CLASS = {
  "awaiting-sign": "awaiting",
  active: "active",
  past: "expired",
  submitted: "floated",
  evaluating: "eval",
  open: "floated",
  "not-awarded": "expired",
};

const ctaFor = (item) => {
  const s = item.myStatus;
  if (s === "awaiting-sign") return { href: `/dashboard/vendor/rate-contracts/${item.id}/accept`, label: "Review & sign →", cls: "btn-warn" };
  if (s === "open")          return { href: `/dashboard/vendor/rate-contracts/${item.arc_id}/quote`, label: "Submit quote →", cls: "btn-blue" };
  if (s === "submitted")     return { href: `/dashboard/vendor/rate-contracts/${item.arc_id}/quote`, label: "View submission", cls: "btn-secondary" };
  if (s === "evaluating")    return { href: `/dashboard/vendor/rate-contracts/${item.arc_id}/quote`, label: "View submission", cls: "btn-secondary" };
  // Active/past cards open THAT contract's detail page (item.id is the
  // tbl_arc_contract id for cards built from the active/pending endpoints).
  if (s === "active")        return { href: `/dashboard/vendor/rate-contracts/${item.id}`, label: "Open", cls: "btn-secondary" };
  if (s === "past")          return { href: `/dashboard/vendor/rate-contracts/${item.id}`, label: "View archive", cls: "btn-ghost" };
  return { href: "#", label: "View", cls: "btn-ghost" };
};

const StatusIcon = ({ status }) => {
  if (status === "awaiting-sign") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></svg>
  );
  if (status === "active") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
  );
  if (status === "evaluating") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21h14"/><path d="M12 4v17"/><path d="M5 4l-2 5c0 2 1 3 2 3s2-1 2-3l-2-5z"/><path d="M19 4l-2 5c0 2 1 3 2 3s2-1 2-3l-2-5z"/></svg>
  );
  if (status === "submitted") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  );
  if (status === "open") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
  );
  if (status === "past") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
  if (status === "not-awarded") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
  );
  return null;
};

// Map a tab query param to the prototype's filter id.
const FILTER_FOR_TAB = {
  received: "open",
  submitted: "evaluating",
  "awaiting-sign": "awaiting",
  all: "all",
};
const TAB_FOR_FILTER = {
  open: "received",
  evaluating: "submitted",
  awaiting: "awaiting-sign",
  all: "all",
};

// =========================================================================

export default function VendorRequestsPage() {
  const router = useRouter();
  const initialFilter = FILTER_FOR_TAB[router.query.tab] || "all";
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [pending, setPending]   = useState([]);
  const [active, setActive]     = useState([]);

  // Keep filter in sync with the tab query param (back/forward navigation).
  useEffect(() => {
    const next = FILTER_FOR_TAB[router.query.tab];
    if (next && next !== filter) setFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.tab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [a, b, c] = await Promise.all([
          ArcApi.vendorListRequests().catch(() => ({ data: { requests: [] } })),
          ArcApi.vendorListPendingAcceptance().catch(() => ({ data: { contracts: [] } })),
          ArcApi.vendorListActiveContracts().catch(() => ({ data: { contracts: [] } })),
        ]);
        if (cancelled) return;
        setRequests(a?.data?.requests || []);
        setPending(b?.data?.contracts || []);
        setActive(c?.data?.contracts || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(
    () => buildItems({ requests, pending, active }),
    [requests, pending, active]
  );

  const counts = useMemo(() => ({
    all: items.length,
    open:       items.filter((c) => c.myStatus === "open").length,
    submitted:  items.filter((c) => c.myStatus === "submitted" || c.myStatus === "evaluating").length,
    awaiting:   items.filter((c) => c.myStatus === "awaiting-sign").length,
    // Active contracts aren't cards here — the stat tile links to /active.
    active:     (active || []).filter((c) => c.status !== "expired").length,
  }), [items, active]);

  // Sr 30(b): "new" = invitation not yet opened by this vendor
  // (tbl_arc_invitation.status flips 'invited' → 'viewed' on first open, see
  // arcVendorController.getRequestDetail). Badge the Received tab so unseen
  // invitations stand out; it auto-clears once the vendor opens the request.
  const newCount = useMemo(
    () => items.filter((c) => c.myStatus === "open" && c.invitation_status === "invited").length,
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      const s = c.myStatus;
      if (filter === "open"        && s !== "open") return false;
      if (filter === "evaluating"  && s !== "evaluating" && s !== "submitted") return false;
      if (filter === "awaiting"    && s !== "awaiting-sign") return false;
      if (!q) return true;
      return (c.title || "").toLowerCase().includes(q)
          || (c.arc_number || "").toLowerCase().includes(q);
    });
  }, [items, filter, search]);

  const nextAction = useMemo(() => {
    return items.find((c) => c.myStatus === "awaiting-sign")
        || items.find((c) => c.myStatus === "open")
        || null;
  }, [items]);

  const onTab = (next) => {
    setFilter(next);
    const tab = TAB_FOR_FILTER[next] || "all";
    const q = { ...router.query, tab };
    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
  };

  if (loading) {
    return (
      <main className="main-body">
        <div>
          <span className="arc-sk" style={{ display: "block", width: 280, height: 26, marginBottom: 10 }} />
          <span className="arc-sk" style={{ display: "block", width: 430, height: 13 }} />
        </div>
        <span className="arc-sk" style={{ display: "block", height: 84, borderRadius: 14 }} />
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="arc-sk-kpi">
              <span className="arc-sk" style={{ display: "block", width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span className="arc-sk" style={{ display: "block", width: "55%", height: 18, marginBottom: 6 }} />
                <span className="arc-sk" style={{ display: "block", width: "40%", height: 10 }} />
              </div>
            </div>
          ))}
        </section>
        <div className="arc-sk-tile">
          <span className="arc-sk" style={{ display: "block", width: 420, height: 32, borderRadius: 8, marginBottom: 16 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="arc-sk" style={{ display: "block", height: 96, borderRadius: 12, marginBottom: 10 }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="main-body">
      {/* Heading */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Rate Contracts · Received</h1>
          <p className="page-sub">Tenders you've been invited to. Open the active or pending ones to quote, sign, or fulfil.</p>
        </div>
      </div>

      {/* Action banner */}
      {nextAction ? (
        <section className={`action-center${nextAction.myStatus === "awaiting-sign" ? "" : " info-blue"}`}>
          <div className="ac-icon">
            {nextAction.myStatus === "awaiting-sign" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            )}
          </div>
          <div className="ac-body">
            <div className="ac-title">
              {nextAction.myStatus === "awaiting-sign"
                ? <span>Contract awarded — your signature required</span>
                : <span>Quote requested — {nextAction.title}</span>}
            </div>
            <div className="ac-sub">
              {nextAction.myStatus === "awaiting-sign" ? (
                <span>
                  <strong>{nextAction.title}</strong> · ARC <span className="mono">#{nextAction.arc_number}</span>
                  {" "}· countersign by <strong>{fmtDate(nextAction.awaiting_deadline || nextAction.term_start)}</strong> to activate.
                </span>
              ) : (
                <span>
                  <strong>#{nextAction.arc_number}</strong>{nextAction.category ? <> · {nextAction.category}</> : null}
                  {" "}· submission closes <strong>{fmtDateTime(nextAction.submission_end_at)}</strong>
                  {daysFromNow(nextAction.submission_end_at) != null && (
                    <span>
                      {" "}· {daysFromNow(nextAction.submission_end_at) > 0
                        ? `${daysFromNow(nextAction.submission_end_at)} days remaining`
                        : "closing today"}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="ac-actions">
            {nextAction.myStatus === "awaiting-sign" ? (
              <Link className="btn btn-warn" href={`/dashboard/vendor/rate-contracts/${nextAction.id}/accept`}>Review &amp; sign →</Link>
            ) : (
              <Link className="btn btn-blue" href={`/dashboard/vendor/rate-contracts/${nextAction.arc_id}/quote`}>Submit quote →</Link>
            )}
          </div>
        </section>
      ) : (
        <section className="action-center all-clear">
          <div className="ac-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div className="ac-body">
            <div className="ac-title">All caught up</div>
            <div className="ac-sub">
              No quotes or signatures pending.{" "}
              <strong>{counts.submitted}{counts.submitted === 1 ? " submission is" : " submissions are"}</strong>
              {" "}with the buyer for review and{" "}
              <strong>{counts.active}{counts.active === 1 ? " contract is" : " contracts are"}</strong>
              {" "}currently active.
            </div>
          </div>
        </section>
      )}

      {/* Stat strip */}
      <section className="stat-strip" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="stat-card">
          <div className="s-ic amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          </div>
          <div><div className="s-val mono">{counts.open}</div><div className="s-label">Open invitations</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div><div className="s-val mono">{counts.submitted}</div><div className="s-label">With buyer</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic indigo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
          </div>
          <div><div className="s-val mono">{counts.awaiting}</div><div className="s-label">Awaiting your sign</div></div>
        </div>
        <Link href="/dashboard/vendor/rate-contracts/active" className="stat-card" style={{ cursor: "pointer" }}>
          <div className="s-ic green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/></svg>
          </div>
          <div><div className="s-val mono">{counts.active}</div><div className="s-label">Active contracts →</div></div>
        </Link>
      </section>

      {/* Filter + search row */}
      <div className="section-card">
        <div className="section-head">
          <div className="tab-row">
            <button className={`tab${filter === "all" ? " active" : ""}`}        onClick={() => onTab("all")}>All <span className="ct">{counts.all}</span></button>
            <button className={`tab${filter === "open" ? " active" : ""}`}       onClick={() => onTab("open")}>
              Received
              {newCount > 0
                ? <span className="your-action" style={{ fontSize: 10, padding: "2px 8px" }}>{newCount} new</span>
                : <span className="ct">{counts.open}</span>}
            </button>
            <button className={`tab${filter === "evaluating" ? " active" : ""}`} onClick={() => onTab("evaluating")}>Under evaluation <span className="ct">{counts.submitted}</span></button>
            <button className={`tab${filter === "awaiting" ? " active" : ""}`}   onClick={() => onTab("awaiting")}>Awaiting sign <span className="ct">{counts.awaiting}</span></button>
          </div>
          <div className="h-right">
            <div className="search-input" style={{ width: 260 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="input" placeholder="Search invitations…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="section-body flush">
          <div className="contract-list" style={{ padding: "14px 18px 18px" }}>
            {filtered.map((k) => {
              const cta = ctaFor(k);
              const cardCls = (() => {
                let cls = "contract-card";
                if (k.myStatus === "awaiting-sign" || k.myStatus === "open") cls += " needs-action";
                else if (k.myStatus === "active") cls += " is-active";
                return cls;
              })();
              const pulse = (k.myStatus === "awaiting-sign" || k.myStatus === "open" || k.myStatus === "evaluating") ? " pulse" : "";
              const daysToClose = daysFromNow(k.submission_end_at);
              const consumptionPct = Math.max(0, Math.min(999, Number(k.consumption_pct ?? 0)));

              return (
                <Link key={k.key} href={cta.href} className={cardCls}>
                  <div className="cc-head">
                    <div className="cc-left">
                      <div className={`cc-badge ${BADGE_CLASS[k.myStatus] || "draft"}`}>
                        <StatusIcon status={k.myStatus} />
                      </div>
                      <div className="cc-meta">
                        <div className="cc-title">
                          <span>{k.title}</span>
                          <span className="cc-num">#{k.arc_number}</span>
                          {(k.myStatus === "awaiting-sign" || k.myStatus === "open") && (
                            <span className="your-action">Your action</span>
                          )}
                        </div>
                        <div className="cc-sub">
                          <span className="em">Workwise Hospitality</span>
                          {k.category ? <><span className="sep">·</span><span>{k.category}</span></> : null}
                          {k.term_start ? (
                            <>
                              <span className="sep">·</span>
                              <span>Term: {fmtDate(k.term_start)} → {fmtDate(k.term_end)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="cc-right">
                      <span className={`status-pill ${BADGE_CLASS[k.myStatus] || "draft"}${pulse}`}>
                        <span className="dot"></span><span>{STATUS_LABEL[k.myStatus]}</span>
                      </span>
                      <span className={`btn btn-sm ${cta.cls}`}>
                        <span>{cta.label}</span>
                      </span>
                      {(k.myStatus === "active" || k.myStatus === "past") && k.committed != null && (
                        <span className="mono text-fg-3 fs-12">{fmtL(k.committed)} committed</span>
                      )}
                      {k.myStatus === "open" && (
                        <span className="text-fg-3 fs-12">
                          <span className="mono fw-600 text-fg">{k.item_count || 0}</span> line item{k.item_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>

                  {k.myStatus === "open" && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-3">
                        <span className="fs-12 text-fg-3">Submission window</span>
                        <div className="progress-bar">
                          <div
                            className="fill warn"
                            style={{ width: `${daysToClose != null ? Math.max(8, Math.min(100, 100 - (daysToClose * 10))) : 50}%` }}
                          />
                        </div>
                        <span className="progress-label">
                          {daysToClose != null && daysToClose > 0 && (
                            <span>Closes in <span className="mono fw-600 text-fg">{daysToClose}</span> days · {fmtDateTime(k.submission_end_at)}</span>
                          )}
                          {daysToClose === 0 && (
                            <span className="text-warn fw-600">Closes today · {fmtDateTime(k.submission_end_at)}</span>
                          )}
                          {daysToClose != null && daysToClose < 0 && (
                            <span className="text-danger fw-600">Closed · {fmtDateTime(k.submission_end_at)}</span>
                          )}
                        </span>
                      </div>
                      {k.buyer_name && (
                        <span className="fs-12 text-fg-3">Buyer · <span className="fw-600 text-fg">{k.buyer_name}</span></span>
                      )}
                    </div>
                  )}

                  {(k.myStatus === "submitted" || k.myStatus === "evaluating") && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--info)" }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span className="fs-12 text-fg-3">
                          {k.myStatus === "submitted"
                            ? <span>Quote submitted · awaiting buyer to open evaluation</span>
                            : <span>Evaluation in progress</span>}
                        </span>
                      </div>
                      {(k.submitted_count != null && k.invited_count != null) && (
                        <span className="fs-12 text-fg-3">
                          <span className="fw-600 text-fg">{k.submitted_count}</span> of {k.invited_count} vendors submitted
                          {k.term_start && <> · result expected by <span className="fw-600 text-fg">{fmtDate(k.term_start)}</span></>}
                        </span>
                      )}
                    </div>
                  )}

                  {k.myStatus === "awaiting-sign" && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--warn)" }}><path d="M12 9v2m0 4h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                        <span className="fs-12">
                          <span className="text-warn fw-600">Countersign by {fmtDate(k.awaiting_deadline || k.term_start)}</span>
                          {(() => {
                            const days = daysFromNow(k.awaiting_deadline || k.term_start);
                            return days != null
                              ? <span className="text-fg-3"> · <span className="mono">{days}</span> days left</span>
                              : null;
                          })()}
                        </span>
                      </div>
                      <span className="fs-12 text-fg-3">
                        {k.committed != null && <>Award value <span className="mono fw-600 text-fg">{fmtL(k.committed)}</span> · </>}
                        term <span className="fw-600 text-fg">{fmtDate(k.term_start)} → {fmtDate(k.term_end)}</span>
                      </span>
                    </div>
                  )}

                  {k.myStatus === "active" && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-3">
                        <span className="fs-12 text-fg-3">Your fulfilment</span>
                        <div className="progress-bar">
                          <div
                            className={`fill${consumptionPct >= 110 ? " danger" : consumptionPct >= 90 ? " warn" : ""}`}
                            style={{ width: `${Math.min(100, consumptionPct)}%` }}
                          />
                        </div>
                        <span className="progress-label">
                          <span className="mono">{consumptionPct}%</span>
                          {k.consumed != null && k.committed != null && (
                            <> · <span className="mono">{fmtL(k.consumed)}</span> of <span className="mono">{fmtL(k.committed)}</span></>
                          )}
                        </span>
                      </div>
                      {k.call_off_count ? (
                        <span className="fs-12 text-fg-3">
                          <span className="mono fw-600 text-fg">{k.call_off_count}</span> Released PO{k.call_off_count === 1 ? "" : "s"} served
                        </span>
                      ) : null}
                    </div>
                  )}

                  {k.myStatus === "past" && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-3">
                        <span className="fs-12 text-fg-3">Closed contract</span>
                        <div className="progress-bar">
                          <div className="fill" style={{ width: `${Math.min(100, consumptionPct)}%` }} />
                        </div>
                        <span className="progress-label">Final consumption <span className="mono">{consumptionPct}%</span></span>
                      </div>
                      <span className="fs-12 text-fg-3">Closed <span className="fw-600 text-fg">{fmtDate(k.term_end)}</span></span>
                    </div>
                  )}

                  {k.myStatus === "not-awarded" && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-4)" }}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        <span className="fs-12 text-fg-3">
                          Award went to another vendor · closed <span className="fw-600 text-fg">{fmtDate(k.term_end || k.submission_end_at)}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="ic">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                </div>
                <h2>No invitations in this view</h2>
                <p>Try another filter or clear the search box. New rate-contract invitations will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
