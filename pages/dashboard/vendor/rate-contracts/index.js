// Vendor · Rate Contracts dashboard.
// Port of prototypes/arc_ui/vendor-dashboard.html, aligned with the buyer
// dashboard's section grammar (action banner → KPI tiles → donut → spend
// ranks → 3-col rollups → 2-col action/activity → fulfilment card).
// All numbers come from GET /v1/arc-v2/vendor/dashboard — real aggregates,
// no synthesised data. The range segment re-queries call-off-derived
// figures (count, fulfilment) server-side.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";
import { Seg } from "@/components/dashboard/shared";

const RANGE_OPTIONS = [
  { label: "QTD",      value: "qtd" },
  { label: "FY 26",    value: "fy"  },
  { label: "All-time", value: "all" },
];

// ── helpers ──────────────────────────────────────────────────────────────
function fmtL(n) {
  const v = Number(n || 0);
  if (!isFinite(v)) return "₹0";
  if (Math.abs(v) >= 1e7) return "₹" + (v / 1e7).toFixed(2) + "Cr";
  if (Math.abs(v) >= 1e5) return "₹" + (v / 1e5).toFixed(2) + "L";
  if (Math.abs(v) >= 1e3) return "₹" + (v / 1e3).toFixed(1) + "k";
  return "₹" + v.toFixed(0);
}
function maxOf(rows) { return Math.max(1, ...rows.map((r) => Number(r.value || 0))); }
function shortDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function timeAgo(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const mins = Math.round((Date.now() - dt.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.round(hrs / 24);
  if (days < 30) return days + "d ago";
  return Math.round(days / 30) + "mo ago";
}
function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}
const CATEGORY_PALETTE = ["#15803d","#2563eb","#b45309","#4338ca","#6d28d9","#0f766e","#be123c","#0369a1"];
function categoryColorFor(name) {
  if (!name) return "#71717a";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(h) % CATEGORY_PALETTE.length];
}

// Invitation-state vocabulary (mirrors the requests page).
const STATE_LABEL = {
  awaiting_sign: "Contract awaiting your sign",
  open:          "Quote requested",
  submitted:     "Submitted · with buyer",
  evaluating:    "Under evaluation",
};
const STATE_PILL = { awaiting_sign: "awaiting", open: "floated", submitted: "eval", evaluating: "eval" };
function needsActionHref(row) {
  if (row.status === "awaiting_sign" && row.contract_id) return `/dashboard/vendor/rate-contracts/${row.contract_id}/accept`;
  return `/dashboard/vendor/rate-contracts/${row.arc_id}/quote`;
}

// Vendor-perspective PO status (same map as the contract detail page).
const PO_VIEW = {
  sent: { label: "Received", tone: "info" }, approved: { label: "Received", tone: "info" },
  acceptance_pending: { label: "Received", tone: "info" }, dispatched: { label: "In transit", tone: "warn" },
  GRN: { label: "Delivered", tone: "success" }, completed: { label: "Delivered", tone: "success" },
  invoice_raised: { label: "Invoiced", tone: "success" }, rejected: { label: "Rejected", tone: "danger" },
  rejected_by_vendor: { label: "Rejected", tone: "danger" }, cancelled: { label: "Cancelled", tone: "danger" },
};

// Layman rendering of the vendor-safe event feed.
const EVENT_VIEW = {
  floated:                       { icon: "inbox", tone: "info",    who: "Buyer",  text: "floated a new contract request" },
  deadline_extended:             { icon: "inbox", tone: "info",    who: "Buyer",  text: "extended the submission deadline" },
  submission_closed:             { icon: "inbox", tone: "",        who: "Buyer",  text: "closed submissions" },
  vendor_submitted:              { icon: "send",  tone: "info",    who: "You",    text: "submitted your quote" },
  vendor_withdrew:               { icon: "send",  tone: "warn",    who: "You",    text: "withdrew your quote" },
  vendor_declined:               { icon: "send",  tone: "",        who: "You",    text: "declined the invitation" },
  contract_generated:            { icon: "pen",   tone: "violet",  who: "Buyer",  text: "generated your contract" },
  contract_awaiting_acceptance:  { icon: "pen",   tone: "violet",  who: "Buyer",  text: "sent a contract for your signature" },
  contract_signed:               { icon: "pen",   tone: "violet",  who: "You",    text: "signed the contract" },
  contract_active:               { icon: "check", tone: "success", who: "System", text: "contract went live" },
  contract_declined:             { icon: "alert", tone: "warn",    who: "You",    text: "declined the contract" },
  amendment_requested:           { icon: "pen",   tone: "info",    who: "You",    text: "requested an amendment" },
  amendment_approved:            { icon: "check", tone: "success", who: "Buyer",  text: "approved your amendment" },
  amendment_rejected:            { icon: "alert", tone: "warn",    who: "Buyer",  text: "declined your amendment" },
  amendment_live:                { icon: "check", tone: "success", who: "System", text: "amendment went live" },
  amendment_ended:               { icon: "alert", tone: "",        who: "System", text: "amendment window ended" },
  expiring_soon:                 { icon: "alert", tone: "warn",    who: "System", text: "contract expiring soon" },
  expired:                       { icon: "alert", tone: "",        who: "System", text: "contract expired" },
  renewed:                       { icon: "check", tone: "success", who: "Buyer",  text: "renewed the contract" },
  call_off_released:             { icon: "truck", tone: "success", who: "Buyer",  text: "released a call-off PO" },
  call_off_rejected:             { icon: "alert", tone: "warn",    who: "System", text: "call-off PO was rejected" },
};

// ──────────────────────────────────────────────────────────────────────────
export default function VendorRateContractsDashboard() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!data) setLoading(true); // skeleton on first load only — range swaps in place
    ArcApi.vendorGetDashboard({ range })
      .then((res) => { if (!cancelled) setData(res?.data || null); })
      .catch(() => { if (!cancelled && !data) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const counts = data?.counts || { open: 0, submitted: 0, evaluating: 0, awaiting_sign: 0, active: 0, past: 0 };
  const totals = data?.totals || { awarded_value: 0, consumed_value: 0, call_off_count: 0 };
  const perf   = data?.performance || {};
  const withBuyer = counts.submitted + counts.evaluating;

  const donutSegments = useMemo(() => {
    const segs = [
      { key: "active",    label: "Active contract",        value: counts.active,        color: "#15803d" },
      { key: "awaiting",  label: "Awaiting your sign",     value: counts.awaiting_sign, color: "#4338ca" },
      { key: "submitted", label: "Submitted · with buyer", value: withBuyer,            color: "#2563eb" },
      { key: "open",      label: "Quote requested",        value: counts.open,          color: "#b45309" },
      { key: "past",      label: "Past · not awarded",     value: counts.past,          color: "#a1a1aa" },
    ].filter((s) => s.value > 0);
    const total = segs.reduce((s, x) => s + x.value, 0);
    return { segs, total };
  }, [counts, withBuyer]);

  const donutGradient = useMemo(() => {
    const { segs, total } = donutSegments;
    if (!total) return "var(--surface-3)";
    let acc = 0;
    const stops = segs.map((s) => {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      return `${s.color} ${start.toFixed(3)}deg ${end.toFixed(3)}deg`;
    });
    return `conic-gradient(from -90deg, ${stops.join(", ")})`;
  }, [donutSegments]);

  const spendCat = data?.spend_by_category || [];
  const spendCatTotal = spendCat.reduce((s, x) => s + Number(x.value || 0), 0);
  const spendBu = data?.spend_by_bu || [];
  const topProducts = data?.top_products || [];
  const recentCallOffs = data?.recent_call_offs || [];
  const needsAction = data?.needs_action || [];
  const next = data?.next_action || null;
  const activity = (data?.activity || []).map((e) => ({
    ...(EVENT_VIEW[e.event_type] || { icon: "check", tone: "", who: "System", text: String(e.event_type || "").replace(/_/g, " ") }),
    meta: `#${e.arc_number || e.arc_id}${e.title ? " · " + e.title : ""}`,
    at: timeAgo(e.at),
  }));

  if (loading) return <VendorDashboardSkeleton />;

  return (
    <main className="main-body">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Rate Contracts · Vendor Dashboard</h1>
          <p className="page-sub">Your performance with Workwise Hospitality — invitations, contracts, fulfilment, and what needs your action.</p>
        </div>
        <div className="flex items-center gap-2">
          <Seg options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <Link href="/dashboard/vendor/rate-contracts/requests" className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            Received requests
          </Link>
        </div>
      </div>

      {/* ── Action banner ──────────────────────────────────────── */}
      {next ? (
        <section className={`action-center${next.status === "awaiting_sign" ? "" : " info-blue"}`}>
          <div className="ac-icon">
            {next.status === "awaiting_sign" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            )}
          </div>
          <div className="ac-body">
            <div className="ac-title">
              {next.status === "awaiting_sign"
                ? <span>Contract awarded — your signature required</span>
                : <span>Quote requested — {next.title}</span>}
            </div>
            <div className="ac-sub">
              <strong className="mono">#{next.arc_number}</strong>
              {next.category_title ? <> · <span>{next.category_title}</span></> : null}
              {next.hotel_name ? <> · <span>{next.hotel_name}</span></> : null}
              {next.status === "awaiting_sign" && next.awaiting_until && (
                <> · Countersign by <strong>{shortDate(next.awaiting_until)}</strong></>
              )}
              {next.status === "open" && next.submission_end_at && (
                <> · Submission closes <strong>{shortDate(next.submission_end_at)}</strong></>
              )}
            </div>
          </div>
          <div className="ac-actions">
            <Link className={`btn ${next.status === "awaiting_sign" ? "btn-warn" : "btn-blue"}`} href={needsActionHref(next)}>
              {next.status === "awaiting_sign" ? "Review & sign →" : "Submit quote →"}
            </Link>
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
              No quotes or signatures pending. <strong>{withBuyer}</strong> submission(s) with the buyer · <strong>{counts.active}</strong> active contract(s).
            </div>
          </div>
        </section>
      )}

      {/* ── KPI tiles ─────────────────────────────────────────── */}
      <section className="kpi-grid">
        <div className="kpi-tile warn">
          <div className="kt-row">
            <div className="kt-label">Open invitations</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            </div>
          </div>
          <div className="kt-val mono">{counts.open}</div>
          <div className="kt-sub"><span className="em mono">{withBuyer}</span> submitted · with buyer</div>
        </div>
        <div className="kpi-tile violet">
          <div className="kt-row">
            <div className="kt-label">Awaiting your sign</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
            </div>
          </div>
          <div className="kt-val mono">{counts.awaiting_sign}</div>
          <div className="kt-sub">Award notifications ready</div>
        </div>
        <div className="kpi-tile success">
          <div className="kt-row">
            <div className="kt-label">Active contracts</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div className="kt-val mono">{counts.active}</div>
          <div className="kt-sub"><span className="em mono">{totals.call_off_count}</span> call-offs received</div>
        </div>
        <div className="kpi-tile accent">
          <div className="kt-row">
            <div className="kt-label">Awarded value · active</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="kt-val mono">{fmtL(totals.awarded_value)}</div>
          <div className="kt-sub">
            Delivered: <span className="em mono">{fmtL(totals.consumed_value)}</span> ·{" "}
            <span className="em mono">{totals.awarded_value ? Math.round((totals.consumed_value / totals.awarded_value) * 100) : 0}%</span>
          </div>
        </div>
      </section>

      {/* ── Invitations · current state (donut) ───────────────── */}
      <section className="dash-panel">
        <div className="dash-panel-head">
          <h3>
            <span className="ic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            </span>
            Invitations · current state
          </h3>
          <div className="h-sub"><span className="mono">{donutSegments.total}</span> total</div>
        </div>
        <div className="dash-panel-body">
          <div className="donut-wrap">
            <div className="donut">
              <div className="donut-ring" style={{ background: donutGradient }} />
              <div className="donut-hole" />
              <div className="donut-center">
                <div className="dc-val">{donutSegments.total}</div>
                <div className="dc-lbl">Total</div>
              </div>
            </div>
            <div className="donut-legend">
              {donutSegments.segs.map((seg) => (
                <div key={seg.key} className="donut-row">
                  <span className="dt" style={{ background: seg.color }} />
                  <span className="nm">{seg.label}</span>
                  <span className="ct-bar">
                    <span className="ct-fill" style={{ width: (seg.value / donutSegments.total * 100) + "%", background: seg.color }} />
                  </span>
                  <span className="ct">{seg.value}</span>
                </div>
              ))}
              {donutSegments.segs.length === 0 && (
                <div className="donut-row"><span className="nm" style={{ color: "var(--fg-3)" }}>No invitations yet.</span></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Spend with you · by category ───────────────────────── */}
      <section className="dash-panel">
        <div className="dash-panel-head">
          <h3>
            <span className="ic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </span>
            Workwise spend with you · by category
          </h3>
          <div className="h-sub">Active contracts only · committed value</div>
        </div>
        <div className="dash-panel-body">
          <div className="rank-list">
            {spendCat.filter((r) => Number(r.value) > 0).map((row, idx) => (
              <div key={row.category_title} className={`rank-row ${idx === 0 ? "r1" : idx === 1 ? "r2" : idx === 2 ? "r3" : ""}`}>
                <div className="rk">{String(idx + 1).padStart(2, "0")}</div>
                <div className="rl">
                  <div className="rl-name">{row.category_title}</div>
                  <div className="rl-bar">
                    <div className="fill" style={{ width: (row.value / maxOf(spendCat) * 100) + "%", background: categoryColorFor(row.category_title) }} />
                  </div>
                </div>
                <div className="rv">
                  <span>{fmtL(row.value)}</span>
                  <span className="sub">{spendCatTotal ? Math.round(row.value / spendCatTotal * 100) : 0}% of total</span>
                </div>
              </div>
            ))}
            {spendCat.filter((r) => Number(r.value) > 0).length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/></svg>
                </div>
                <h2>No active categories</h2>
                <p>Once a contract activates, it will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3-col: Top buyer locations · Top products · Recent call-offs ── */}
      <section className="dash-grid cols-3">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
              </span>
              Top buyer locations
            </h3>
            <div className="h-sub">by awarded value</div>
          </div>
          <div className="dash-panel-body">
            <div className="rank-list">
              {spendBu.filter((r) => Number(r.value) > 0).map((row, idx) => (
                <div key={row.hotel_id ?? idx} className={`rank-row ${idx === 0 ? "r1" : idx === 1 ? "r2" : idx === 2 ? "r3" : ""}`}>
                  <div className="rk">{buCodeFor(row.hotel_name)}</div>
                  <div className="rl">
                    <div className="rl-name">{row.hotel_name}</div>
                    <div className="rl-bar"><div className="fill" style={{ width: (row.value / maxOf(spendBu) * 100) + "%" }} /></div>
                  </div>
                  <div className="rv">{fmtL(row.value)}</div>
                </div>
              ))}
              {spendBu.filter((r) => Number(r.value) > 0).length === 0 && (
                <div style={{ fontSize: 12, color: "var(--fg-4)", padding: "8px 0" }}>No active locations yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4v10l8 4 8-4z"/></svg>
              </span>
              Top products you supply
            </h3>
            <div className="h-sub">by awarded spend</div>
          </div>
          <div className="dash-panel-body">
            <div className="rank-list">
              {topProducts.filter((r) => Number(r.value) > 0).map((row, idx) => (
                <div key={row.variant_name ?? idx} className={`rank-row ${idx === 0 ? "r1" : idx === 1 ? "r2" : idx === 2 ? "r3" : ""}`}>
                  <div className="rk">{String(idx + 1).padStart(2, "0")}</div>
                  <div className="rl">
                    <div className="rl-name">{row.variant_name || "—"}</div>
                    {row.uom && <div className="rl-sub"><span className="mono">{row.uom}</span> · delivered {fmtL(row.consumed)}</div>}
                    <div className="rl-bar"><div className="fill" style={{ width: (row.value / maxOf(topProducts) * 100) + "%" }} /></div>
                  </div>
                  <div className="rv">{fmtL(row.value)}</div>
                </div>
              ))}
              {topProducts.filter((r) => Number(r.value) > 0).length === 0 && (
                <div style={{ fontSize: 12, color: "var(--fg-4)", padding: "8px 0" }}>No products yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </span>
              Recent call-offs
            </h3>
            <div className="h-sub">Last 5 POs received</div>
          </div>
          <div className="dash-panel-body" style={{ padding: 0 }}>
            {recentCallOffs.map((po) => {
              const view = PO_VIEW[po.po_status] || { label: po.po_status || "—", tone: "neutral" };
              return (
                <div key={po.po_id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "11px 14px", borderBottom: "1px dashed var(--border)", alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/dashboard/vendor/rate-contracts/${po.arc_contract_id}?tab=pos`} className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--primary)" }}>
                      {po.po_number || `PO-${po.po_id}`}
                    </Link>
                    <div style={{ fontSize: 11.5, color: "var(--fg-2)", marginTop: 3 }}>{po.variant_name || "—"}</div>
                    <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 1 }}>
                      <span className="mono">{shortDate(po.released_at)}</span> · <span>{Number(po.quantity).toLocaleString("en-IN")}</span> {po.uom}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)" }}>{fmtL(po.value)}</div>
                    <span className={`status-pill ${view.tone}`} style={{ fontSize: 10, marginTop: 4 }}><span className="dot" /><span>{view.label}</span></span>
                  </div>
                </div>
              );
            })}
            {recentCallOffs.length === 0 && (
              <div style={{ padding: "18px 16px", fontSize: 12, color: "var(--fg-4)" }}>No call-offs received yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── 2-col: Needs your action · Recent activity ─────────── */}
      <section className="dash-grid">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              </span>
              Needs your action
            </h3>
            <div className="h-sub">Pending invitations &amp; sign requests</div>
          </div>
          <div className="dash-panel-body" style={{ padding: 0 }}>
            {needsAction.map((row) => (
              <div key={`${row.arc_id}-${row.status}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "13px 16px", borderBottom: "1px dashed var(--border)", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <Link href={needsActionHref(row)} style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{row.title || "Untitled contract"}</Link>
                  <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--fg-3)" }}>
                    <span className="mono">#{row.arc_number}</span>
                    {row.category_title ? <> · <span>{row.category_title}</span></> : null}
                    {row.hotel_name ? <> · <span>{buCodeFor(row.hotel_name)}</span></> : null}
                  </div>
                </div>
                <span className={`status-pill ${STATE_PILL[row.status] || "neutral"}`} style={{ fontSize: 10.5 }}>
                  <span className="dot" /><span>{STATE_LABEL[row.status] || row.status}</span>
                </span>
              </div>
            ))}
            {needsAction.length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2>Nothing pending</h2>
                <p>All requests have been responded to.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </span>
              Recent activity
            </h3>
            <div className="h-sub">From all your contracts</div>
          </div>
          <div className="dash-panel-body">
            <div className="activity-feed">
              {activity.map((a, idx) => (
                <div key={idx} className="activity-item">
                  <div className={`ai-ic ${a.tone}`}><ActivityIcon name={a.icon} /></div>
                  <div className="ai-body">
                    <div className="ai-text"><span className="em">{a.who}</span> <span>{a.text}</span></div>
                    <div className="ai-meta"><span>{a.meta}</span></div>
                  </div>
                  <div className="ai-time">{a.at}</div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="ic">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <h2>No recent activity</h2>
                  <p>Updates across your contracts will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Fulfilment card — computed from call-off POs, never mocked ── */}
      <section className="dash-panel">
        <div className="dash-panel-head">
          <h3>
            <span className="ic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </span>
            Your fulfilment card
          </h3>
          <div className="h-sub">{range === "qtd" ? "Quarter to date" : range === "fy" ? "This financial year" : "All-time"} · from call-off POs</div>
        </div>
        <div className="dash-panel-body">
          <div className="dash-grid cols-3">
            <div style={{ background: "var(--success-soft)", border: "1px solid rgba(21,128,61,0.18)", borderRadius: 10, padding: "13px 16px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600 }}>Delivered call-offs</div>
              <div className="mono" style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: "var(--success)" }}>
                {perf.delivered_pct != null ? perf.delivered_pct + "%" : "—"}
              </div>
            </div>
            <div style={{ background: "var(--primary-tint)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: 10, padding: "13px 16px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600 }}>Acceptance rate</div>
              <div className="mono" style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>
                {perf.accepted_pct != null ? perf.accepted_pct + "%" : "—"}
              </div>
            </div>
            <div style={{ background: "var(--violet-soft)", border: "1px solid rgba(109,40,217,0.18)", borderRadius: 10, padding: "13px 16px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", fontWeight: 600 }}>Call-off value</div>
              <div className="mono" style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: "var(--violet)" }}>{fmtL(perf.call_off_value)}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 9, fontSize: 11.5, color: "var(--fg-3)" }}>
            Based on <span className="fw-600 mono" style={{ color: "var(--fg)" }}>{perf.total_call_offs ?? 0}</span> call-off PO(s)
            {perf.total_call_offs ? <> — <span className="fw-600 mono" style={{ color: "var(--fg)" }}>{perf.delivered}</span> delivered</> : null}.
            Delivery and acceptance are tracked from PO statuses on your contracts.
          </div>
        </div>
      </section>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function ActivityIcon({ name }) {
  const p = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "truck": return (<svg {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>);
    case "inbox": return (<svg {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>);
    case "send":  return (<svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
    case "pen":   return (<svg {...p}><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>);
    case "alert": return (<svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
    default:      return (<svg {...p}><polyline points="20 6 9 17 4 12"/></svg>);
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — shape-aware: banner, 4 KPI tiles, donut + legend, rank lists,
//  3-col rollups, 2-col action/activity. Mirrors the loaded layout 1:1.
// ──────────────────────────────────────────────────────────────────────────
const SkBar = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function VendorDashboardSkeleton() {
  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <SkBar w={300} h={26} style={{ marginBottom: 10 }} />
          <SkBar w={440} h={13} />
        </div>
        <div className="flex items-center gap-2">
          <SkBar w={180} h={32} r={8} />
          <SkBar w={140} h={30} r={6} />
        </div>
      </div>

      {/* Action banner */}
      <section style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
        <SkBar w={44} h={44} r={11} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <SkBar w="42%" h={16} style={{ marginBottom: 7 }} />
          <SkBar w="60%" h={11} />
        </div>
        <SkBar w={130} h={34} r={8} />
      </section>

      {/* KPI tiles */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="arc-sk-kpi">
            <SkBar w={38} h={38} r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <SkBar w="55%" h={18} style={{ marginBottom: 6 }} />
              <SkBar w="70%" h={10} />
            </div>
          </div>
        ))}
      </section>

      {/* Donut + legend */}
      <section className="arc-sk-tile">
        <SkBar w={190} h={14} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
          <SkBar w={150} h={150} r={999} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < 3 ? "1px dashed var(--border)" : "none" }}>
                <SkBar w={12} h={12} r={3} />
                <SkBar w="40%" h={12} style={{ flex: 1 }} />
                <SkBar w={26} h={12} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spend rank list */}
      <section className="arc-sk-tile">
        <SkBar w={240} h={14} style={{ marginBottom: 14 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 3 ? "1px dashed var(--border)" : "none" }}>
            <SkBar w={24} h={24} r={6} />
            <SkBar w="50%" h={14} style={{ flex: 1 }} />
            <SkBar w={70} h={14} />
          </div>
        ))}
      </section>

      {/* 3-col rollups */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {Array.from({ length: 3 }).map((_, c) => (
          <div key={c} className="arc-sk-tile">
            <SkBar w={130} h={14} style={{ marginBottom: 14 }} />
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 3 ? "1px dashed var(--border)" : "none" }}>
                <SkBar w={20} h={11} r={3} />
                <SkBar w="55%" h={13} style={{ flex: 1 }} />
                <SkBar w={56} h={13} />
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* 2-col: needs action + activity */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {Array.from({ length: 2 }).map((_, c) => (
          <div key={c} className="arc-sk-tile">
            <SkBar w={150} h={14} style={{ marginBottom: 14 }} />
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i} style={{ display: "flex", gap: 11, padding: "11px 0", borderBottom: i < 3 ? "1px dashed var(--border)" : "none" }}>
                <SkBar w={24} h={24} r={7} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SkBar w="65%" h={13} style={{ marginBottom: 6 }} />
                  <SkBar w={120} h={10} />
                </div>
                <SkBar w={60} h={10} />
              </div>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}
