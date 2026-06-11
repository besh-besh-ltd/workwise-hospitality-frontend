import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";

// ---------- helpers ----------
const STATUS_LABEL = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  floated: "Floated",
  closed: "Closed",
  tech_eval: "Tech Eval",
  comm_eval: "Commercial Eval",
  committee: "Committee Review",
  awaiting_acceptance: "Awaiting Acceptance",
  active: "Active",
  expiring: "Expiring",
  expired: "Expired",
  ended: "Ended",
  cancelled: "Cancelled",
  withdrawn: "Withdrawn",
  terminated: "Terminated",
};

const STATUS_CHIP_CLASS = {
  draft: "draft",
  floated: "floated",
  tech_eval: "eval",
  comm_eval: "eval",
  committee: "committee",
  active: "active",
  expiring: "expiring",
  expired: "expired",
};

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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
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
  const today = new Date();
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

const monthsBetween = (a, b) => {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  const months =
    (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
  return Math.max(1, months);
};

// build a workflow stepper from the ARC status. Marks done/current/pending.
function buildWorkflowSteps(arc) {
  if (!arc) return [];
  const status = arc.status;
  const baseOrder = [
    "draft",
    "pending_approval",
    "floated",
    "tech_eval",
    "comm_eval",
    "committee",
    "awaiting_acceptance",
    "active",
  ];
  const stepDefs = [
    { key: "draft", name: "ARC drafted", avClass: "av-warm", initials: initialsOf(arc.created_by_name || "?"), at: fmtDate(arc.created_at) },
    { key: "pending_approval", name: "Approval", avClass: "av-violet", initials: "AP", at: "" },
    { key: "floated", name: "Submission window open", avClass: "av-sky", initials: "RFQ", at: arc.submission_end_at ? `closes ${fmtDate(arc.submission_end_at)}` : "" },
    { key: "tech_eval", name: "Tech evaluation", avClass: "av-indigo", initials: "TE", at: "" },
    { key: "comm_eval", name: "Commercial eval", avClass: "av-sky", initials: "CE", at: "" },
    { key: "committee", name: "ARC Committee", avClass: "av-violet", initials: "CM", at: "" },
    { key: "awaiting_acceptance", name: "Vendor acceptance", avClass: "av-green", initials: "V", at: "" },
    { key: "active", name: "Contract active", avClass: "av-zinc", initials: "WW", at: arc.contract_start_at ? `starts ${fmtDate(arc.contract_start_at)}` : "" },
  ];
  const idx = baseOrder.indexOf(status);
  return stepDefs.map((s, i) => ({
    ...s,
    state: i < idx ? "done" : i === idx ? "current" : "pending",
  }));
}

function classifyInvitation(inv, quoteByVendor) {
  // Determine vendor response status. We prefer explicit invitation_status if
  // backend already classifies; otherwise infer from a vendor's quote (if any).
  const q = quoteByVendor[inv.vendor_id];
  if (q && q.submitted_at) return "submitted";
  if (q) return "draft";
  if (inv.responded_at) return "submitted";
  return "none";
}

// ---------- page ----------
export default function FloatedContractDetail() {
  const router = useRouter();
  const { contractId } = router.query;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.getContractDetail(contractId);
        if (cancelled) return;
        setData(res?.data || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const arc = data?.arc;
  const items = data?.items || [];
  const invitations = data?.invitations || [];
  const quotes = data?.quotes || []; // optional; backend may or may not include
  const vendors = data?.vendors || {}; // optional vendor lookup map

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

  const workflowSteps = useMemo(() => buildWorkflowSteps(arc), [arc]);
  const statusChipClass = arc ? (STATUS_CHIP_CLASS[arc.status] || "floated") : "";
  const statusLabel = arc ? (STATUS_LABEL[arc.status] || arc.status) : "";
  const termMonths = arc ? monthsBetween(arc.contract_start_at, arc.contract_end_at) : null;

  const toggleExpand = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const handleWithdraw = async () => {
    if (!arc) return;
    if (!window.confirm("Withdraw this rate contract? Vendors will be notified.")) return;
    setActionBusy(true);
    try {
      await ArcApi.withdraw(arc.id);
      toast.success("Contract withdrawn");
      const res = await ArcApi.getContractDetail(arc.id);
      setData(res?.data || null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleTerminate = async () => {
    if (!arc) return;
    const reason = window.prompt("Termination reason (required):");
    if (!reason || !reason.trim()) return;
    setActionBusy(true);
    try {
      await ArcApi.terminate(arc.id, reason.trim());
      toast.success("Contract terminated");
      const res = await ArcApi.getContractDetail(arc.id);
      setData(res?.data || null);
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }
  if (!arc) {
    return <div style={{ padding: 24 }}>Contract not found.</div>;
  }

  const isFloated = arc.status === "floated";
  const canWithdraw = ["draft", "pending_approval", "approved", "floated"].includes(arc.status);
  const canTerminate = ["active", "expiring"].includes(arc.status);

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
        .countdown-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; background: rgba(34,197,94,0.18); color: #86efac; border: 1px solid rgba(134,239,172,0.30); border-radius: 99px; font-size: 11px; font-weight: 600; font-family: 'Geist Mono', monospace; margin-top: 4px; }
        .countdown-pill .pdot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
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

      <main className="main-body">

        {/* HERO BAND */}
        <section className="arc-hero">
          <div className="top">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow">Rate Contract</div>
              <h1>
                <span>{arc.title}</span>
                <span className={`status-chip ${statusChipClass}`}>{statusLabel}</span>
                <span className="num">#{arc.arc_number}</span>
              </h1>
              <div className="sub">
                <span>{arc.category_name || `Category #${arc.category_id}`}</span>
                <span className="sep">·</span>
                <span className="em">Single BU</span>
                <span className="sep">·</span>
                <span>{arc.hotel_code || arc.hotel_name || `Hotel #${arc.hotel_id}`}</span>
                <span className="sep">·</span>
                <span>
                  Created by <span className="em">{arc.created_by_name || `User #${arc.created_by}`}</span> · {fmtDate(arc.created_at)}
                </span>
              </div>
            </div>
            <div className="hero-actions">
              <Link href={`/dashboard/buyer/rate-contracts/${arc.id}/tech-eval`} legacyBehavior>
                <a className="btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Open Tech Eval
                </a>
              </Link>
              {canWithdraw && (
                <button className="btn" disabled={actionBusy} onClick={handleWithdraw}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Withdraw
                </button>
              )}
              {canTerminate && (
                <button className="btn" disabled={actionBusy} onClick={handleTerminate}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                  Terminate
                </button>
              )}
            </div>
          </div>

          <div className="hero-detail-grid">
            <div className="cell">
              <div className="k">Submission window</div>
              <div className="v">
                <span className="em">{fmtDate(arc.submission_start_at)}</span> → <span className="em">{fmtDate(arc.submission_end_at)}</span>
              </div>
              {isFloated && (
                <span className="countdown-pill"><span className="pdot" />{daysToClose}d remaining</span>
              )}
            </div>
            <div className="cell">
              <div className="k">Contract term</div>
              <div className="v">
                <span className="em">{fmtDate(arc.contract_start_at)}</span> → <span className="em">{fmtDate(arc.contract_end_at)}</span>
              </div>
              {termMonths != null && (
                <div className="v" style={{ marginTop: 4, fontSize: "11.5px", opacity: 0.75 }}>{termMonths}-month term</div>
              )}
            </div>
            <div className="cell">
              <div className="k">Scope</div>
              <div className="v">
                <span className="em">Single-BU</span>
                <div style={{ marginTop: 4, fontSize: "11.5px", opacity: 0.75 }}>1 property in scope</div>
              </div>
            </div>
            <div className="cell">
              <div className="k">Eligibility</div>
              <div className="v">
                <span className="em">{arc.eligibility === "open" ? "Open tender" : "Invitation-only"}</span>
                <div style={{ marginTop: 4, fontSize: "11.5px", opacity: 0.75 }}>{invitedCount} vendor{invitedCount === 1 ? "" : "s"} invited</div>
              </div>
            </div>
            <div className="cell">
              <div className="k">Category</div>
              <div className="v">
                <span className="em">{arc.category_name || `Cat #${arc.category_id}`}</span>
                <div style={{ marginTop: 4, fontSize: "11.5px", opacity: 0.75 }}>{items.length} line item{items.length === 1 ? "" : "s"}</div>
              </div>
            </div>
          </div>
        </section>

        {/* GUIDE BANNER */}
        {isFloated && (
          <div className="guide" style={{ marginTop: 18 }}>
            <div className="g-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <strong>Tender is open</strong> — <strong>{daysToClose} days</strong> remaining. Vendors are submitting quotes. Once submission closes, the contract automatically moves to <strong>Tech Evaluation</strong>, then commercial evaluation, then committee review.
            </div>
          </div>
        )}

        {/* TWO-COLUMN BODY */}
        <div className="detail-grid" style={{ marginTop: 18 }}>

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
                    const city = vendor.city || inv.vendor_city || "—";
                    const gstin = vendor.gstin || inv.vendor_gstin || "—";
                    const rating = vendor.rating || inv.vendor_rating;
                    return (
                      <div key={inv.id || inv.vendor_id} className="vendor-row">
                        <div className="vendor-cell" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                          <div className={`vc-av ${pickAv(inv.vendor_id)}`}>{initialsOf(vendorName)}</div>
                          <div className="vc-meta">
                            <div className="vc-name">{vendorName}</div>
                            <div className="vc-sub">
                              <span>{city}</span>
                              <span className="sep">·</span>
                              <span className="gst">{gstin}</span>
                              {rating != null && (
                                <>
                                  <span className="sep">·</span>
                                  <span>{`★ ${rating}`}</span>
                                </>
                              )}
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
                        const qty = it.committed_qty != null ? it.committed_qty : it.quantity;
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
                                {it.spec || it.specification || "—"}
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

            {/* WORKFLOW */}
            <div className="workflow">
              <div className="wf-head">
                <div className="t">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Workflow
                </div>
                {isFloated && <span className="pill info"><span className="pdot" />Live</span>}
              </div>
              {workflowSteps.map((step) => (
                <div key={step.key} className={`wf-step ${step.state}`}>
                  <div className="wf-node" />
                  <div className="body">
                    <div className="nm">{step.name}</div>
                    <div className="meta">
                      <span className={`ev-av ${step.avClass}`}>{step.initials}</span>
                      <span>{step.at || (step.state === "pending" ? "Pending" : "")}</span>
                    </div>
                  </div>
                  <div className="right-stat">{step.state === "done" ? "Done" : step.state === "current" ? "Live" : ""}</div>
                </div>
              ))}
            </div>

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
                  <div className="sm-v warn">{daysToClose}<span className="text-fg-4 fw-500 fs-11">d</span></div>
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
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                    </span>
                    Samples received
                  </div>
                  <div className="sm-v success">{submittedCount}</div>
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

            {/* QUICK ACTIONS */}
            <section className="section-card">
              <div className="section-head" style={{ padding: "11px 16px" }}>
                <div className="h-left">
                  <h2 style={{ fontSize: "12.5px" }}>Quick actions</h2>
                </div>
              </div>
              <div className="section-body" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href={`/dashboard/buyer/rate-contracts/${arc.id}/tech-eval`} legacyBehavior>
                  <a className="btn btn-primary btn-block">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Open Tech Evaluation
                  </a>
                </Link>
                <Link href={`/dashboard/buyer/rate-contracts/${arc.id}/comm-eval`} legacyBehavior>
                  <a className="btn btn-secondary btn-block">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    Open Commercial Eval
                  </a>
                </Link>
                <Link href={`/dashboard/buyer/rate-contracts/${arc.id}/committee`} legacyBehavior>
                  <a className="btn btn-ghost btn-block">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    </svg>
                    Committee Review
                  </a>
                </Link>
                <Link href={`/dashboard/buyer/rate-contracts/${arc.id}/active`} legacyBehavior>
                  <a className="btn btn-ghost btn-block">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    View Active Summary
                  </a>
                </Link>
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
                    {isFloated && <span className="text-warn fw-600 fs-11"> · {daysToClose}d</span>}
                  </div>
                  <div className="k">Term starts</div><div className="v">{fmtDate(arc.contract_start_at)}</div>
                  <div className="k">Term ends</div><div className="v">{fmtDate(arc.contract_end_at)}</div>
                  <div className="k">Last updated</div><div className="v fs-12">{fmtDate(arc.updated_at)}</div>
                </div>
              </div>
            </section>

          </aside>
        </div>

      </main>
    </>
  );
}
