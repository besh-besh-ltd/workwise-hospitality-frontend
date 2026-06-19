// Vendor portal — Active Contracts list page.
// Ported from prototypes/arc_ui/vendor-active.html (list view). Contracts you
// are currently servicing — track consumption, fulfil call-off POs, and stay
// ahead of renewals. The prototype also includes an inline detail view via
// ?c=<id>; that lives at /dashboard/vendor/rate-contracts/[contractId] in this
// app, so this file renders only the LIST view.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

// ---- helpers ------------------------------------------------------------

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtCr = (n) => {
  if (n == null || isNaN(n)) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (Math.abs(v) >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
  if (Math.abs(v) >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

const fmtL = fmtCr;

const daysFromNow = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dt - today) / (1000 * 60 * 60 * 24));
};

// Derive a list-row status: active | expiring | expired.
// Backend "active" endpoint returns contracts that are signed + currently
// servicing. We split by remaining-days vs term-end to mark expiring (<= 60d)
// and expired (past).
const deriveStatus = (c) => {
  if (c.status === "expired" || c.status === "ended" || c.status === "closed") return "expired";
  const d = daysFromNow(c.contract_end_at);
  if (d == null) return "active";
  if (d < 0) return "expired";
  if (d <= 60) return "expiring";
  return "active";
};

const STATUS_LABEL = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
};

const STATUS_TONE = {
  active: "active",
  expiring: "expiring",
  expired: "expired",
};

const consumptionTone = (pct) => {
  if (pct >= 110) return "danger";
  if (pct >= 90)  return "warn";
  return "";
};

const StatusGlyph = ({ status }) => {
  if (status === "active") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
  );
  if (status === "expiring") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
  if (status === "expired") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
  );
  return null;
};

// =========================================================================

export default function VendorActiveContractsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [addenda, setAddenda] = useState([]); // addenda awaiting this vendor's signature

  useEffect(() => {
    ArcApi.vendorListAddendums()
      .then((res) => setAddenda(res?.data?.addendums || []))
      .catch(() => setAddenda([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.vendorListActiveContracts();
        if (cancelled) return;
        setRows(res?.data?.contracts || []);
      } catch (e) {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Normalise + decorate rows
  const items = useMemo(() => {
    return (rows || []).map((c) => {
      const status = deriveStatus(c);
      const committed = Number(c.committed_value || 0);
      const consumed  = Number(c.consumed_value || 0);
      const pct = committed > 0 ? Math.round((consumed / committed) * 100) : 0;
      return {
        id: c.id,
        arc_id: c.arc_id,
        arc_number: c.arc_number || c.number,
        title: c.arc_title || c.title || "Untitled contract",
        category: c.category_title || c.category,
        buyer_name: c.buyer_name || c.created_by_name || "Workwise Hospitality",
        term_start: c.contract_start_at,
        term_end: c.contract_end_at,
        committed_value: committed,
        consumed_value: consumed,
        consumption_pct: pct,
        call_off_count: c.call_off_count || 0,
        last_po_number: c.last_call_off_number,
        last_po_date: c.last_call_off_at,
        days_to_expiry: daysFromNow(c.contract_end_at),
        status,
      };
    });
  }, [rows]);

  const counts = useMemo(() => ({
    all: items.length,
    active:   items.filter((c) => c.status === "active").length,
    expiring: items.filter((c) => c.status === "expiring").length,
    expired:  items.filter((c) => c.status === "expired").length,
  }), [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((c) => c.status === filter);
  }, [items, filter]);

  // contract_id → count of addenda awaiting this vendor's signature.
  const pendingByContract = useMemo(() => {
    const m = {};
    addenda.forEach((a) => { m[a.arc_contract_id] = (m[a.arc_contract_id] || 0) + 1; });
    return m;
  }, [addenda]);

  // KPI totals
  const totalCommitted = useMemo(
    () => items.filter((c) => c.status !== "expired")
                .reduce((s, c) => s + (c.committed_value || 0), 0),
    [items]
  );

  const callOffsThisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let n = 0;
    items.forEach((c) => {
      if (c.last_po_date && String(c.last_po_date).startsWith(ym)) n += 1;
    });
    return n;
  }, [items]);

  if (loading) {
    return <ActiveContractsSkeleton />;
  }

  return (
    <main className="main-body">

      {/* HEADING */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Active Contracts</h1>
          <p className="page-sub">Contracts you're servicing now and recently. Track consumption, fulfil released POs, and stay ahead of renewals.</p>
        </div>
        <Link href="/dashboard/vendor/rate-contracts/requests" className="btn btn-secondary btn-lg">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          New requests
        </Link>
      </div>

      {/* KPI strip */}
      <section className="stat-strip" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="stat-card">
          <div className="s-ic green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div>
            <div className="s-val mono">{counts.active + counts.expiring}</div>
            <div className="s-label">Active contracts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="s-ic indigo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
          </div>
          <div>
            <div className="s-val mono">{fmtCr(totalCommitted)}</div>
            <div className="s-label">Committed to you</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="s-ic blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div>
            <div className="s-val mono">{callOffsThisMonth}</div>
            <div className="s-label">Recent released POs</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="s-ic violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div className="s-val mono">N/A</div>
            <div className="s-label">On-time delivery</div>
          </div>
        </div>
      </section>

      {/* Filter tabs + list */}
      <div className="section-card">
        <div className="section-head">
          <div className="tab-row">
            <button className={`tab${filter === "all" ? " active" : ""}`}      onClick={() => setFilter("all")}>All <span className="ct">{counts.all}</span></button>
            <button className={`tab${filter === "active" ? " active" : ""}`}   onClick={() => setFilter("active")}>Active <span className="ct">{counts.active}</span></button>
            <button className={`tab${filter === "expiring" ? " active" : ""}`} onClick={() => setFilter("expiring")}>Expiring <span className="ct">{counts.expiring}</span></button>
            <button className={`tab${filter === "expired" ? " active" : ""}`}  onClick={() => setFilter("expired")}>Expired <span className="ct">{counts.expired}</span></button>
          </div>
          <div className="h-right">
            <span className="pill outline">Viewing as <strong style={{ marginLeft: 4, color: "var(--fg)" }}>Vendor</strong></span>
          </div>
        </div>

        {addenda.length > 0 && (
          <div style={{ margin: "0 18px 0", background: "var(--surface)", border: "1px solid #f0c14b", borderLeft: "3px solid #eab308", borderRadius: "var(--radius-lg)", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
                {addenda.length} addendum{addenda.length > 1 ? "a" : ""} awaiting your signature
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                A buyer-approved change to your contract takes effect only after you sign the addendum. Sign to apply the new terms.
              </div>
            </div>
            <Link href="/dashboard/vendor/rate-contracts/amendments" className="btn btn-blue btn-sm" style={{ flexShrink: 0 }}>
              Review &amp; sign
            </Link>
          </div>
        )}

        <div className="section-body flush">
          <div className="contract-list" style={{ padding: "14px 18px 18px" }}>

            {filtered.map((k) => {
              const pendingSign = pendingByContract[k.id] || 0;
              const pct = Math.max(0, Math.min(999, Number(k.consumption_pct || 0)));
              const tone = consumptionTone(pct);
              return (
                <Link
                  key={k.id}
                  href={`/dashboard/vendor/rate-contracts/${k.id}`}
                  className={`contract-card my-active-card${k.status === "expiring" ? " is-expiring" : ""}`}
                >
                  <div className="cc-head">
                    <div className="cc-left">
                      <div className={`cc-badge ${k.status}`}>
                        <StatusGlyph status={k.status} />
                      </div>
                      <div className="cc-meta">
                        <div className="cc-title">
                          <span>{k.title}</span>
                          <span className="cc-num">#{k.arc_number}</span>
                          {pendingSign > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#a16207", background: "rgba(234,179,8,0.16)", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
                              ✎ {pendingSign} addendum to sign
                            </span>
                          )}
                        </div>
                        <div className="cc-sub">
                          <span>Buyer: <span className="em">{k.buyer_name}</span></span>
                          {k.category && <><span className="sep">·</span><span>{k.category}</span></>}
                          {k.term_start && (
                            <>
                              <span className="sep">·</span>
                              <span>Term: <span className="em">{fmtDate(k.term_start)} → {fmtDate(k.term_end)}</span></span>
                            </>
                          )}
                          {k.status === "expiring" && k.days_to_expiry != null && k.days_to_expiry >= 0 && (
                            <span className="text-warn fw-600"> · {k.days_to_expiry}d to expiry</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="cc-right">
                      <span className={`status-pill ${STATUS_TONE[k.status]}${k.status === "expiring" ? " pulse" : ""}`}>
                        <span className="dot"></span><span>{STATUS_LABEL[k.status]}</span>
                      </span>
                      <span className="mono text-fg-3 fs-12">{fmtL(k.committed_value)} committed</span>
                    </div>
                  </div>

                  {/* Footer with consumption + last call-off + Open btn */}
                  <div className="cc-foot">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="fs-12 text-fg-3">Delivered</span>
                      <div className="progress-bar">
                        <div
                          className={`fill${tone ? " " + tone : ""}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="progress-label">
                        <span className="mono">{pct}%</span> ·{" "}
                        <span className="mono">{fmtL(k.consumed_value)}</span> of{" "}
                        <span className="mono">{fmtL(k.committed_value)}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {k.last_po_number ? (
                        <span className="last-po">
                          Last PO: <span className="em">{k.last_po_number}</span>
                          {k.last_po_date ? <> · {fmtDate(k.last_po_date)}</> : null}
                        </span>
                      ) : (
                        <span className="last-po">No released POs yet</span>
                      )}
                      <span className="btn btn-secondary btn-sm">
                        Open
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="ic">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                </div>
                <h2>No contracts in this view</h2>
                <p>Try a different filter or check the New Requests inbox for upcoming opportunities.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — shape-aware: header, 4 stat tiles, tab-row card, contract
//  cards with the consumption footer strip. Mirrors the loaded layout 1:1.
// ──────────────────────────────────────────────────────────────────────────
const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function ActiveContractsSkeleton() {
  return (
    <main className="main-body">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Sk w={240} h={26} style={{ marginBottom: 10 }} />
          <Sk w={460} h={13} />
        </div>
        <Sk w={150} h={38} r={8} />
      </div>

      {/* Stat strip */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="arc-sk-kpi">
            <Sk w={38} h={38} r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Sk w="50%" h={18} style={{ marginBottom: 6 }} />
              <Sk w="70%" h={10} />
            </div>
          </div>
        ))}
      </section>

      {/* Tab-row + contract cards */}
      <div className="section-card">
        <div className="section-head" style={{ padding: "10px 14px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} w={86} h={28} r={99} />
            ))}
          </div>
        </div>
        <div className="section-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 13, flex: 1, minWidth: 0 }}>
                  <Sk w={40} h={40} r={11} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Sk w="55%" h={17} style={{ marginBottom: 8 }} />
                    <Sk w="75%" h={11} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
                  <Sk w={78} h={22} r={99} />
                  <Sk w={110} h={11} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <Sk w={60} h={11} />
                <Sk w={220} h={6} r={99} />
                <Sk w={140} h={11} />
                <span style={{ flex: 1 }} />
                <Sk w={200} h={11} />
                <Sk w={70} h={28} r={7} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
