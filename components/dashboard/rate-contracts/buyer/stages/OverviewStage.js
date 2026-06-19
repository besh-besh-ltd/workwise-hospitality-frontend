// Overview stage — extracted from the old [contractId]/index.js detail page.
// Vendor response tracker, items-in-scope (with past-consumption expanders),
// attachments, tender stats and key dates. The page hero, workflow stepper
// and quick-action links moved to the lifecycle shell / stage timeline.

import { useEffect, useMemo, useState } from "react";
import * as ArcApi from "@/services/arc_v2";
import { StageSkeleton } from "./StageShared";

const AV_PALETTE = ["av-warm", "av-sky", "av-indigo", "av-violet", "av-green", "av-zinc"];
const pickAv = (id) => {
  const n = String(id || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AV_PALETTE[n % AV_PALETTE.length];
};
const initialsOf = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
};
const fmtMoney = (v) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
};
const fmtQty = (v) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
};
const daysUntil = (iso) => {
  if (!iso) return 0;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
};

function classifyInvitation(inv, quoteByVendor) {
  const q = quoteByVendor[inv.vendor_id];
  if (q && q.submitted_at) return "submitted";
  if (q) return "draft";
  if (inv.responded_at) return "submitted";
  return "none";
}

export default function OverviewStage({ arc, stage }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!arc?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.getContractDetail(arc.id);
        if (cancelled) return;
        setData(res?.data || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [arc?.id]);

  const items = data?.items || [];
  const invitations = data?.invitations || [];
  const quotes = data?.quotes || [];
  const vendors = data?.vendors || {};

  const quoteByVendor = useMemo(() => {
    const map = {};
    quotes.forEach((q) => { if (q.vendor_id != null) map[q.vendor_id] = q; });
    return map;
  }, [quotes]);

  const invitedCount = invitations.length;
  const submittedCount = useMemo(
    () => invitations.filter((inv) => classifyInvitation(inv, quoteByVendor) === "submitted").length,
    [invitations, quoteByVendor]
  );
  const responsePct = invitedCount > 0 ? Math.round((submittedCount / invitedCount) * 100) : 0;
  const daysToClose = daysUntil(arc?.submission_end_at);
  const isFloated = arc?.status === "floated";
  const windowClosed = !!stage?.window?.closed;

  const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  if (loading) return <StageSkeleton />;
  if (!data?.arc) return <div className="empty-state"><h2>Contract not found</h2></div>;

  return (
    <>
      <style jsx>{`
        @media (min-width: 980px) {
          .detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 18px; align-items: start; }
          .detail-aside { position: sticky; top: 78px; }
        }
        @media (max-width: 979px) {
          .detail-grid { display: flex; flex-direction: column; gap: 18px; }
        }
        .vendor-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); transition: background 0.13s ease; }
        .vendor-row:last-child { border-bottom: none; }
        .vendor-row:hover { background: var(--surface-2); }
        .vendor-row :global(.vc-av) { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .vc-meta { min-width: 0; flex: 1; }
        .vc-meta .vc-name { font-size: 13.5px; font-weight: 500; color: var(--fg); }
        .vc-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11.5px; color: var(--fg-3); margin-top: 2px; }
        .vc-sub .gst { font-family: 'Geist Mono', monospace; font-size: 10.5px; color: var(--fg-4); }
        .vr-time { font-size: 11.5px; color: var(--fg-3); white-space: nowrap; }
        .vr-time .em { color: var(--fg-2); font-weight: 500; }
        .vr-status { margin-left: auto; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .expand-btn { background: transparent; border: 1px solid var(--border); border-radius: 6px; width: 24px; height: 24px; display: grid; place-items: center; color: var(--fg-3); cursor: pointer; transition: all 0.15s ease; flex-shrink: 0; }
        .expand-btn:hover { background: var(--surface-3); color: var(--fg); border-color: var(--border-strong); }
        .expand-btn.open { background: var(--fg); color: white; border-color: var(--fg); transform: rotate(180deg); }
        .item-expand-row > td { background: var(--surface-2); padding: 0 !important; border-top: none !important; }
        .iex-inner { padding: 14px 16px 16px 60px; border-top: 1px dashed var(--border); }
        .stat-mini { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .stat-mini:last-child { border-bottom: none; }
        .stat-mini .sm-k { font-size: 12px; color: var(--fg-3); display: flex; align-items: center; gap: 7px; }
        .stat-mini .sm-ic { width: 22px; height: 22px; border-radius: 6px; background: var(--surface-3); display: grid; place-items: center; color: var(--fg-3); border: 1px solid var(--border); }
        .stat-mini .sm-v { font-family: 'Geist Mono', monospace; font-weight: 700; color: var(--fg); font-size: 13px; }
        .stat-mini .sm-v.warn { color: var(--warn); }
        .stat-mini .sm-v.success { color: var(--success); }
        .qty-chip { display: inline-flex; align-items: baseline; gap: 4px; padding: 3px 8px; background: var(--surface-3); border: 1px solid var(--border); border-radius: 6px; font-size: 11px; }
        .qty-chip .qc-code { font-weight: 700; color: var(--fg-2); letter-spacing: 0.02em; }
        .qty-chip .qc-qty { font-family: 'Geist Mono', monospace; font-weight: 600; color: var(--fg); }
        .file-chip { display: inline-flex; align-items: center; gap: 9px; padding: 9px 13px; background: var(--surface); border: 1px solid var(--border); border-radius: 9px; font-size: 12.5px; color: var(--fg-2); cursor: pointer; transition: all 0.15s ease; text-decoration: none; }
        .file-chip:hover { border-color: var(--border-strong); background: var(--surface-2); color: var(--fg); }
        .file-chip .fc-ic { width: 30px; height: 30px; border-radius: 7px; background: var(--primary-soft); color: var(--primary); display: grid; place-items: center; flex-shrink: 0; border: 1px solid rgba(37,99,235,0.18); }
        .file-chip .fc-meta { display: flex; flex-direction: column; gap: 1px; line-height: 1.3; text-align: left; }
        .file-chip .fc-name { font-weight: 600; color: var(--fg); }
        .file-chip .fc-sub { font-size: 10.5px; color: var(--fg-4); font-family: 'Geist Mono', monospace; }
        .ico-attach { color: var(--fg-3); }
      `}</style>

      {/* GUIDE BANNER */}
      {isFloated && !windowClosed && (
        <div className="guide">
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <strong>Tender is open</strong> — <strong>{daysToClose} days</strong> remaining. Vendors are submitting quotes. Once submission closes, <strong>Technical Evaluation</strong> unlocks on the timeline above.
          </div>
        </div>
      )}
      {windowClosed && (
        <div className="guide success" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div>
            <strong>Quotation window closed.</strong>{" "}
            <span className="mono fw-600">{submittedCount} of {invitedCount}</span> invited vendors submitted.
            This snapshot is now read-only — the journey continues in the next stages.
          </div>
        </div>
      )}

      {/* TWO-COLUMN BODY */}
      <div className="detail-grid" style={{ marginTop: 4 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* VENDOR RESPONSE TRACKER */}
          <section className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h2>Vendor response tracker</h2>
                  <div className="h-sub">
                    <span className="mono fw-600 text-fg">{submittedCount} of {invitedCount}</span> vendors have submitted ·{" "}
                    <span className="text-warn fw-600">{Math.max(0, invitedCount - submittedCount)} awaiting</span>
                  </div>
                </div>
              </div>
              <div className="h-right">
                <div className="progress-bar" style={{ width: 120, maxWidth: "none" }}>
                  <div className="fill warn" style={{ width: `${responsePct}%` }} />
                </div>
                <span className="mono fs-12 fw-600 text-fg">{responsePct}%</span>
              </div>
            </div>
            <div className="section-body flush">
              {invitations.length === 0 ? (
                <div style={{ padding: 18, color: "var(--fg-3)", fontSize: 13 }}>No vendors have been invited yet.</div>
              ) : (
                invitations.map((inv) => {
                  const vendor = vendors[inv.vendor_id] || {};
                  const status = classifyInvitation(inv, quoteByVendor);
                  const q = quoteByVendor[inv.vendor_id];
                  const vendorName = inv.vendor_name || vendor.name || `Vendor #${inv.vendor_id}`;
                  const email = inv.vendor_email || vendor.email || null;
                  const mobile = inv.vendor_mobile || vendor.mobile || null;
                  return (
                    <div key={inv.id || inv.vendor_id} className="vendor-row">
                      <div className="vendor-cell" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                        <div className={`vc-av ${pickAv(inv.vendor_id)}`}>{initialsOf(vendorName)}</div>
                        <div className="vc-meta">
                          <div className="vc-name">{vendorName}</div>
                          <div className="vc-sub">
                            {email ? <span>{email}</span> : null}
                            {email && mobile ? <span className="sep">·</span> : null}
                            {mobile ? <span className="mono">{mobile}</span> : null}
                            {!email && !mobile ? <span>—</span> : null}
                          </div>
                        </div>
                      </div>
                      <div className="vr-status">
                        {status === "submitted" && <span className="pill success"><span className="pdot" />Submitted</span>}
                        {status === "draft" && <span className="pill warn"><span className="pdot" />In draft</span>}
                        {status === "none" && <span className="pill neutral"><span className="pdot" />Not started</span>}
                        <span className="vr-time">
                          {status === "submitted" && (
                            <span><span className="em">Submitted</span> · {fmtDateTime(q?.submitted_at || inv.responded_at)}</span>
                          )}
                          {status === "draft" && <span>Last edited {fmtDateTime(q?.updated_at)}</span>}
                          {status === "none" && <span>No activity yet</span>}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* ITEMS IN SCOPE */}
          <section className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <h2>Items in scope</h2>
                  <div className="h-sub">{items.length} line item{items.length === 1 ? "" : "s"} · committed quantities</div>
                </div>
              </div>
              <div className="h-right">
                <span className="pill outline">Click row to view past consumption</span>
              </div>
            </div>
            <div className="section-body flush">
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}></th>
                      <th>Item</th>
                      <th>Spec</th>
                      <th>Per-BU committed qty</th>
                      <th className="right">Target price</th>
                      <th className="center">Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 18, color: "var(--fg-3)", fontSize: 13 }}>No items in scope.</td></tr>
                    ) : items.map((it) => {
                      const itemKey = it.id || it.arc_item_id;
                      const isOpen = !!expanded[itemKey];
                      const itemName = it.variant_name || it.name || `Item #${itemKey}`;
                      const itemCode = it.variant_slug || it.code || "—";
                      const uom = it.uom || "—";
                      const qty = it.committed_qty != null ? it.committed_qty : it.indicative_qty ?? it.quantity;
                      const past = it.past_consumption || [];
                      return (
                        <tbody key={itemKey} style={{ display: "contents" }}>
                          <tr onClick={() => toggleExpand(itemKey)} style={{ cursor: "pointer" }}>
                            <td className="center">
                              <button
                                type="button"
                                className={`expand-btn ${isOpen ? "open" : ""}`}
                                onClick={(e) => { e.stopPropagation(); toggleExpand(itemKey); }}
                                title={isOpen ? "Collapse" : "Expand past consumption"}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            </td>
                            <td>
                              <div className="item-cell">
                                <div className="ic-thumb">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                  </svg>
                                </div>
                                <div className="ic-meta">
                                  <div className="ic-name">{itemName}</div>
                                  <div className="ic-code"><span>{itemCode}</span> · <span>{uom}</span></div>
                                </div>
                              </div>
                            </td>
                            <td style={{ maxWidth: 240, color: "var(--fg-3)", fontSize: 12, lineHeight: 1.5 }}>
                              {it.spec_text || it.spec || it.specification || "—"}
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-1" style={{ maxWidth: 300 }}>
                                <span className="qty-chip">
                                  <span className="qc-code">{arc.hotel_code || "BU"}</span>
                                  <span className="qc-qty">{fmtQty(qty)}</span>
                                </span>
                              </div>
                            </td>
                            <td className="right">
                              <span>{fmtMoney(it.target_price)}</span>
                              <span className="text-fg-4 fs-11 fw-500" style={{ marginLeft: 3 }}>{`/ ${uom}`}</span>
                            </td>
                            <td className="center">
                              <svg className="ico-attach" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                              </svg>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="item-expand-row">
                              <td colSpan={6}>
                                <div className="iex-inner">
                                  <div className="section-label" style={{ marginBottom: 10 }}>
                                    Past 3-year consumption (units in <span>{uom}</span>)
                                  </div>
                                  {past.length === 0 ? (
                                    <div style={{ color: "var(--fg-4)", fontSize: 12 }}>Consumption history not available.</div>
                                  ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                      {past.map((p, idx) => (
                                        <div key={idx} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: "11.5px", fontWeight: 600 }}>{p.hotel_name || "Hotel"}</div>
                                            <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "'Geist Mono',monospace" }}>{p.hotel_code || ""}</div>
                                          </div>
                                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 10px", fontSize: "11.5px" }}>
                                            <div>FY {p.fy1_label || "—"}</div>
                                            <div>FY {p.fy2_label || "—"}</div>
                                            <div>FY {p.fy3_label || "—"}</div>
                                            <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{p.fy1 != null ? Number(p.fy1).toLocaleString("en-IN") : "—"}</div>
                                            <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{p.fy2 != null ? Number(p.fy2).toLocaleString("en-IN") : "—"}</div>
                                            <div style={{ fontFamily: "'Geist Mono',monospace", fontWeight: 600 }}>{p.fy3 != null ? Number(p.fy3).toLocaleString("en-IN") : "—"}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ATTACHMENTS */}
          {Array.isArray(arc.attachments) && arc.attachments.length > 0 && (
            <section className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </div>
                  <div>
                    <h2>Attachments &amp; documents</h2>
                    <div className="h-sub">RFQ pack shared with all invited vendors</div>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div className="flex flex-wrap gap-2">
                  {arc.attachments.map((f, idx) => (
                    <a key={f.id || idx} className="file-chip" href={f.url || "#"} target="_blank" rel="noopener noreferrer">
                      <div className="fc-ic">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="fc-meta">
                        <span className="fc-name">{f.name || f.filename || "Attachment"}</span>
                        <span className="fc-sub">{f.size_label || f.size || ""}{f.uploaded_at ? ` · ${fmtDate(f.uploaded_at)}` : ""}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT ASIDE */}
        <aside className="detail-aside" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* STATS CARD */}
          <section className="section-card">
            <div className="section-head" style={{ padding: "11px 16px" }}>
              <div className="h-left">
                <h2 style={{ fontSize: "12.5px" }}>Tender stats</h2>
              </div>
            </div>
            <div className="section-body" style={{ padding: "6px 16px 10px" }}>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </span>
                  Responses
                </div>
                <div className="sm-v">{submittedCount} <span className="text-fg-4 fw-500">/ {invitedCount}</span></div>
              </div>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  Days to close
                </div>
                <div className="sm-v warn">{windowClosed ? 0 : daysToClose}<span className="text-fg-4 fw-500 fs-11">d</span></div>
              </div>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </span>
                  Response rate
                </div>
                <div className="sm-v">{responsePct}%</div>
              </div>
              <div className="stat-mini">
                <div className="sm-k">
                  <span className="sm-ic">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </span>
                  Items in scope
                </div>
                <div className="sm-v">{items.length}</div>
              </div>
            </div>
          </section>

          {/* KEY DATES */}
          <section className="section-card">
            <div className="section-head" style={{ padding: "11px 16px" }}>
              <div className="h-left">
                <h2 style={{ fontSize: "12.5px" }}>Key dates</h2>
              </div>
            </div>
            <div className="section-body" style={{ padding: "12px 16px" }}>
              <div className="kv-grid">
                <div className="k">Created</div><div className="v">{fmtDate(arc.created_at)}</div>
                <div className="k">Subm. opens</div><div className="v">{fmtDate(arc.submission_start_at)}</div>
                <div className="k">Subm. closes</div>
                <div className="v">
                  <span>{fmtDate(arc.submission_end_at)}</span>
                  {isFloated && !windowClosed && <span className="text-warn fw-600 fs-11"> · {daysToClose}d</span>}
                </div>
                <div className="k">Term starts</div><div className="v">{fmtDate(arc.contract_start_at)}</div>
                <div className="k">Term ends</div><div className="v">{fmtDate(arc.contract_end_at)}</div>
                <div className="k">Last updated</div><div className="v fs-12">{fmtDate(arc.updated_at)}</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
