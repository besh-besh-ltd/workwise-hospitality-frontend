// Vendor · Active contract detail.
// Port of prototypes/arc_ui/vendor-active.html (detail view — `?c=` branch):
// dark hero with 5-cell detail grid, 4-tile KPI strip, tabs
// (Consumption / Call-off POs / Contract document), sticky right aside
// (buyer contact, performance, status notice).
// Data: GET /v1/arc-v2/vendor/contracts/:contractId → { contract, lines, arc, callOffs }.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AddendumSignModal from "@/components/dashboard/rate-contracts/vendor/AddendumSignModal";
import { useRouter } from "next/router";
import * as XLSX from "xlsx";
import * as ArcApi from "@/services/arc_v2";

// ── format helpers ───────────────────────────────────────────────────────
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
const daysRemaining = (iso) => {
  if (!iso) return 0;
  const d = new Date(String(iso).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
};
const initials = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Icon = ({ size = 13, sw = 2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const I = {
  back:     () => <Icon><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Icon>,
  download: () => <Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Icon>,
  rupee:    () => <Icon size={18}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon>,
  activity: () => <Icon size={18}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon>,
  truck:    () => <Icon size={18}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></Icon>,
  clock:    () => <Icon size={18}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>,
  box:      () => <Icon size={14}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></Icon>,
  file:     () => <Icon size={12}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>,
  chart:    () => <Icon size={12}><path d="M3 3v18h18" /><rect x="7" y="9" width="3" height="8" /><rect x="14" y="5" width="3" height="12" /></Icon>,
  po:       () => <Icon size={12}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></Icon>,
  user:     () => <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>,
  mail:     () => <Icon size={12}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></Icon>,
  check:    () => <Icon size={11} sw={2.6}><polyline points="20 6 9 17 4 12" /></Icon>,
  healthy:  () => <Icon><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>,
  edit:     () => <Icon size={12}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>,
};

// Amendment display vocabulary — vendor perspective. The chain is anonymised
// server-side (numbered levels only), so every status line speaks in levels.
const AMEND_TYPE_LABEL = {
  price: "Price revision",
  qty: "Quantity revision",
  item_add: "Item addition",
  item_remove: "Item removal",
  term: "Term extension",
};

// One precise line per status: where exactly the request stands.
function amendStatusInfo(am) {
  const total = Number(am.total_steps) || (Array.isArray(am.chain) ? am.chain.length : 0);
  const cur = Math.min(Number(am.current_step) || 1, total || 1);
  if (am.status === "requested") {
    return { pill: "in review", tone: "warn",
             text: total ? `At approval level ${cur} of ${total}` : "With the buyer for review" };
  }
  if (am.status === "awaiting_signature") {
    return { pill: "awaiting signature", tone: "warn",
             text: "Approved — sign the addendum to apply the new terms" };
  }
  if (am.status === "approved") {
    return { pill: "approved", tone: "success",
             text: `Approved — effective ${fmtDate(am.amendment_from)}` };
  }
  if (am.status === "live") {
    return { pill: "live", tone: "success",
             text: am.amendment_to ? `Live until ${fmtDate(am.amendment_to)}` : "Live on the contract" };
  }
  if (am.status === "rejected") {
    const lvl = (Array.isArray(am.chain) ? am.chain : []).findIndex((s) => s.status === "rejected") + 1;
    return { pill: "declined", tone: "danger",
             text: lvl ? `Declined at level ${lvl} of ${total}` : "Declined by the buyer" };
  }
  if (am.status === "ended") {
    return { pill: "ended", tone: "neutral", text: `Window closed ${fmtDate(am.amendment_to)}` };
  }
  return { pill: am.status, tone: "neutral", text: "" };
}

// Vendor-perspective PO status: a PO the buyer "sent" is one the vendor
// has RECEIVED. Map raw po_status → display label + tone.
const PO_STATUS_VIEW = {
  sent:               { label: "received",   tone: "info" },
  approved:           { label: "received",   tone: "info" },
  acceptance_pending: { label: "received",   tone: "info" },
  dispatched:         { label: "in transit", tone: "warn" },
  GRN:                { label: "delivered",  tone: "success" },
  completed:          { label: "delivered",  tone: "success" },
  invoice_raised:     { label: "invoiced",   tone: "success" },
  rejected:           { label: "rejected",   tone: "danger" },
  rejected_by_vendor: { label: "rejected",   tone: "danger" },
  cancelled:          { label: "cancelled",  tone: "danger" },
};

const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

export default function VendorContractDetailPage() {
  const router = useRouter();
  const { contractId } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("consumption");
  const [amendSub, setAmendSub] = useState("requested");   // requested | active | past
  const [viewingAmend, setViewingAmend] = useState(null);  // amendment open in the modal
  const [signingAddendum, setSigningAddendum] = useState(null); // addendum open in the sign modal

  // Honour ?tab= deep links (My Amendments rows land straight on this tab).
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    if (typeof q === "string" && ["consumption", "pos", "doc", "amendments"].includes(q)) {
      setTab(q);
    }
  }, [router.isReady, router.query.tab]);

  const load = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const res = await ArcApi.vendorGetContract(contractId);
      setData(res?.data ?? res ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await ArcApi.vendorGetContract(contractId);
        const payload = res?.data ?? res ?? null;
        if (!cancelled) setData(payload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contractId]);

  // Vendor declines the addendum → the amendment is voided (terminal).
  const declineAddendum = async (am) => {
    if (!am?.addendum_id) return;
    const reason = window.prompt("Decline this addendum? The amendment will be voided and nothing on the contract changes. Optional reason:");
    if (reason === null) return;
    try { await ArcApi.vendorDeclineAddendum(am.addendum_id, reason || null); setViewingAmend(null); await load(); }
    catch (e) { window.alert("Could not decline the addendum. Please try again."); }
  };

  const contract   = data?.contract   || null;
  const arc        = data?.arc        || null;
  const lines      = data?.lines      || [];
  const callOffs   = data?.callOffs   || [];
  const amendments = data?.amendments || [];

  // On first load, land the amendments sub-tab on a non-empty bucket so an
  // approved-but-unsigned (awaiting_signature) amendment isn't hidden behind
  // the empty default "Requested" tab.
  const autoPickedSub = useRef(false);
  useEffect(() => {
    if (autoPickedSub.current || amendments.length === 0) return;
    autoPickedSub.current = true;
    const nRequested = amendments.filter((a) => a.status === "requested").length;
    const nActive = amendments.filter((a) => ["awaiting_signature", "approved", "live"].includes(a.status)).length;
    if (nRequested === 0 && nActive > 0) setAmendSub("active");
    else if (nRequested === 0 && nActive === 0) setAmendSub("rest");
  }, [amendments]);

  const totals = useMemo(() => {
    const committed = lines.reduce((s, l) => s + Number(l.unit_rate || 0) * Number(l.committed_qty || 0), 0);
    const consumed  = lines.reduce((s, l) => s + Number(l.unit_rate || 0) * Number(l.consumed_qty || 0), 0);
    const pct = committed > 0 ? Math.round((consumed / committed) * 100) : 0;
    return { committed, consumed, pct };
  }, [lines]);

  // ── downloads (client-side) ──────────────────────────────────────────────
  const dlAnnexure = () => {
    if (!contract) return;
    const rows = lines.map((l, i) => {
      const amended = l.amendment_id && Number(l.effective_unit_rate) !== Number(l.unit_rate);
      return {
        "#": i + 1,
        Item: l.variant_name || `Item #${l.arc_item_id}`,
        Code: l.variant_slug || l.arc_item_id,
        "Unit rate (₹)": Number(l.unit_rate || 0),
        "Amended rate (₹)": amended ? Number(l.effective_unit_rate) : "",
        "Amended effective until": amended && l.amendment_effective_to ? fmtDate(l.amendment_effective_to) : "",
        UOM: l.uom || "",
        "GST %": Number(l.gst_pct ?? 0),
        "Committed qty": Number(l.committed_qty || 0),
        "Payment terms": l.payment_terms || arc?.payment_terms_expected || "Net 30",
        "Line value (₹)": Math.round(Number(l.unit_rate || 0) * Number(l.committed_qty || 0)),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 13 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 7 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rate annexure");
    XLSX.writeFile(wb, `${arc?.arc_number || contract.arc_number || "ARC"}_rate-annexure.xlsx`);
  };
  const dlContractCopy = () => {
    if (!contract || typeof window === "undefined") return;
    // Prefer the stored, hashed PDF; fall back to a printable reconstruction.
    if (contract.document_s3_url) { window.open(contract.document_s3_url, "_blank"); return; }
    const win = window.open("", "_blank");
    if (!win) return;
    const linesHtml = lines.map((l) => `<tr>
        <td>${l.variant_name || ""}<div class="sub">${l.variant_slug || l.arc_item_id}</div></td>
        <td class="r mono">₹${Number(l.unit_rate || 0).toLocaleString("en-IN")}/${l.uom || ""}</td>
        <td class="r mono">${Number(l.gst_pct ?? 0)}%</td>
        <td class="r mono">${Number(l.committed_qty || 0).toLocaleString("en-IN")} ${l.uom || ""}</td>
        <td class="r mono">₹${Math.round(Number(l.unit_rate || 0) * Number(l.committed_qty || 0)).toLocaleString("en-IN")}</td>
      </tr>`).join("");
    const signed = contract.status === "active" || contract.signed_by_vendor_at;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${arc?.arc_number || ""}</title>
      <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a18;max-width:820px;margin:32px auto;padding:0 28px;}
      h1{font-size:20px;margin:0 0 4px;} .meta{color:#6b6b66;font-size:12px;margin-bottom:20px;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e2e2dd;border-radius:8px;overflow:hidden;margin-bottom:18px;} .grid>div{padding:12px 16px;} .grid>div:first-child{border-right:1px solid #e2e2dd;}
      .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a8a85;font-weight:600;} .v{margin-top:5px;font-size:13px;font-weight:500;}
      table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px;} th,td{padding:9px 10px;border-bottom:1px solid #eee;text-align:left;} th{background:#fafaf8;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#8a8a85;} .r{text-align:right;} .mono{font-family:ui-monospace,monospace;} .sub{font-size:10px;color:#9a9a95;}
      .seal{font-size:11px;color:#6b6b66;margin-top:22px;border-top:1px dashed #d6d6d0;padding-top:10px;}</style></head>
      <body>
      <h1>Rate Contract — ${arc?.title || ""}</h1>
      <div class="meta">${arc?.arc_number || ""} · ${contract.vendor_name || ""} · ${signed ? "Signed " + fmtDate(contract.signed_by_vendor_at) : "Unsigned draft"}</div>
      <div class="grid">
        <div><div class="k">Buyer</div><div class="v">${arc?.hotel_name || ""}${arc?.hotel_city ? " · " + arc.hotel_city : ""}</div></div>
        <div><div class="k">Term</div><div class="v">${fmtDate(arc?.contract_start_at)} → ${fmtDate(arc?.contract_end_at)}</div></div>
      </div>
      <table><thead><tr><th>Item</th><th class="r">Unit rate</th><th class="r">GST</th><th class="r">Committed</th><th class="r">Line value</th></tr></thead><tbody>${linesHtml}</tbody></table>
      <div class="seal">Signed-document hash (SHA-256): ${contract.document_hash || "—"}</div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  if (loading) return <DetailSkeleton />;
  if (!contract) {
    return (
      <main className="main-body">
        <div className="empty-state">
          <h2>Contract not found</h2>
          <p>It may belong to a different vendor account.</p>
          <Link href="/dashboard/vendor/rate-contracts/active" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Back to active contracts</Link>
        </div>
      </main>
    );
  }

  const statusChip = contract.status === "active" ? { cls: "active", label: "Active" }
    : contract.status === "expiring_soon" ? { cls: "expiring", label: "Expiring soon" }
    : contract.status === "expired" ? { cls: "expired", label: "Expired" }
    : { cls: "draft", label: contract.status };
  const daysLeft = daysRemaining(arc?.contract_end_at);
  const paymentTerms = lines[0]?.payment_terms || arc?.payment_terms_expected || "Net 30";

  return (
    <main className="main-body">
      {/* Breadcrumb */}
      <nav className="arc-crumb-strip" aria-label="Breadcrumb">
        <div className="inner">
          <button type="button" className="crumb-back" onClick={() => router.push("/dashboard/vendor/rate-contracts/active")}>
            <I.back /> Back
          </button>
          <span className="sep">/</span>
          <Link href="/dashboard/vendor/rate-contracts/requests">Rate contracts</Link>
          <span className="sep">/</span>
          <Link href="/dashboard/vendor/rate-contracts/active">Active</Link>
          <span className="sep">/</span>
          <span className="here">#{arc?.arc_number || contract.arc_number}</span>
        </div>
      </nav>

      {/* ═════ HERO ═════ */}
      <section className="arc-hero">
        <div className="top">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="eyebrow">Your active contract</div>
            <h1>
              <span>{arc?.title || contract.arc_title}</span>
              <span className={`status-chip ${statusChip.cls}`}>{statusChip.label}</span>
              <span className="num">#{arc?.arc_number || contract.arc_number}</span>
            </h1>
            <div className="sub">
              {arc?.buyer_name && <><span>Buyer: <span className="em">{arc.buyer_name}</span></span><span className="sep">·</span></>}
              {arc?.category_title && <><span>{arc.category_title}</span><span className="sep">·</span></>}
              <span className="em">Single-BU award</span>
              {arc?.hotel_name && <><span className="sep">·</span><span>{arc.hotel_name}{arc.hotel_city ? ` · ${arc.hotel_city}` : ""}</span></>}
            </div>
          </div>
          <div className="hero-actions">
            <Link href="/dashboard/vendor/rate-contracts/active" className="btn">
              <I.back /> Back to list
            </Link>
            {(contract.status === "active" || contract.status === "expiring_soon") && (
              <Link href={`/dashboard/vendor/rate-contracts/amendments/request?contract=${contractId}`} className="btn">
                <Icon><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>
                Request amendment
              </Link>
            )}
            <button className="btn cta" onClick={dlContractCopy}>
              <I.download /> Download PDF
            </button>
          </div>
        </div>

        <div className="hero-detail-grid">
          <div className="cell">
            <div className="k">Contract term</div>
            <div className="v"><span className="em">{fmtDate(arc?.contract_start_at)}</span> → <span className="em">{fmtDate(arc?.contract_end_at)}</span></div>
            <div className="v" style={{ marginTop: 4, fontSize: 11.5, opacity: 0.75 }}>{daysLeft} days remaining</div>
          </div>
          <div className="cell">
            <div className="k">Your committed value</div>
            <div className="v"><span className="em mono">{fmtL(totals.committed)}</span></div>
            <div className="v" style={{ marginTop: 4, fontSize: 11.5, opacity: 0.75 }}>{lines.length} line item{lines.length === 1 ? "" : "s"}</div>
          </div>
          <div className="cell">
            <div className="k">Consumed so far</div>
            <div className="v"><span className="em mono">{fmtL(totals.consumed)}</span></div>
            <div className="v" style={{ marginTop: 4, fontSize: 11.5, opacity: 0.75 }}>{totals.pct}% of commitment</div>
          </div>
          <div className="cell">
            <div className="k">Call-off POs</div>
            <div className="v"><span className="em mono">{callOffs.length}</span> received</div>
            <div className="v" style={{ marginTop: 4, fontSize: 11.5, opacity: 0.75 }}>across the term</div>
          </div>
          <div className="cell">
            <div className="k">Payment terms</div>
            <div className="v"><span className="em">{paymentTerms}</span></div>
            <div className="v" style={{ marginTop: 4, fontSize: 11.5, opacity: 0.75 }}>From PO date</div>
          </div>
        </div>
      </section>

      {/* ═════ KPI STRIP ═════ */}
      <section className="stat-strip" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="stat-card"><div className="s-ic indigo"><I.rupee /></div><div><div className="s-val mono">{fmtL(totals.committed)}</div><div className="s-label">Committed</div></div></div>
        <div className="stat-card"><div className="s-ic green"><I.activity /></div><div><div className="s-val mono">{fmtL(totals.consumed)}</div><div className="s-label">Consumed</div></div></div>
        <div className="stat-card"><div className="s-ic blue"><I.truck /></div><div><div className="s-val mono">{callOffs.length}</div><div className="s-label">Call-off POs</div></div></div>
        <div className="stat-card"><div className="s-ic amber"><I.clock /></div><div><div className="s-val mono">{daysLeft}</div><div className="s-label">Days remaining</div></div></div>
      </section>

      {/* ═════ TWO-COLUMN BODY ═════ */}
      <div className="detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>

          <div className="tab-row" style={{ alignSelf: "flex-start" }}>
            <button className={`tab ${tab === "consumption" ? "active" : ""}`} onClick={() => setTab("consumption")}><I.chart /> Consumption</button>
            <button className={`tab ${tab === "pos" ? "active" : ""}`} onClick={() => setTab("pos")}><I.po /> Call-off POs <span className="ct">{callOffs.length}</span></button>
            <button className={`tab ${tab === "doc" ? "active" : ""}`} onClick={() => setTab("doc")}><I.file /> Contract document</button>
            <button className={`tab ${tab === "amendments" ? "active" : ""}`} onClick={() => setTab("amendments")}>
              <I.edit /> Amendments
              {(() => {
                const pending = amendments.filter((a) => a.status === "requested").length;
                if (pending > 0) {
                  return <span className="your-action" style={{ fontSize: 10, padding: "2px 8px" }}>{pending} in review</span>;
                }
                return <span className="ct">{amendments.length}</span>;
              })()}
            </button>
          </div>

          {/* ── CONSUMPTION ── */}
          {tab === "consumption" && (
            <section className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><I.box /></div>
                  <div>
                    <h2>Your award lines · consumption</h2>
                    <div className="h-sub">Per-item committed quantities vs. what's been called off so far</div>
                  </div>
                </div>
              </div>
              <div className="section-body flush">
                <div style={{ overflowX: "auto" }}>
                  <table className="doc-rate-table" style={{ border: "none", borderRadius: 0 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: "right" }}>Rate</th>
                        <th style={{ textAlign: "right" }}>Committed</th>
                        <th style={{ textAlign: "right" }}>Consumed</th>
                        <th style={{ textAlign: "right" }}>Remaining</th>
                        <th style={{ minWidth: 180 }}>Consumption</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => {
                        const rate = Number(l.unit_rate || 0);
                        const effRate = Number(l.effective_unit_rate ?? l.unit_rate ?? 0);
                        const amended = l.amendment_id && effRate !== rate;
                        const uomL = l.uom || "unit";
                        const committed = Number(l.committed_qty || 0);
                        const consumed = Number(l.consumed_qty || 0);
                        const remaining = Math.max(0, committed - consumed);
                        const over = consumed > committed;
                        const pct = committed > 0 ? Math.round((consumed / committed) * 100) : 0;
                        const tone = pct >= 100 ? "danger" : pct >= 75 ? "warn" : "";
                        const QtyMoney = ({ qty, money, color }) => (
                          <>
                            <span style={color ? { color } : undefined}>{qty.toLocaleString("en-IN")} <span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, fontSize: 10.5, color: "var(--fg-3)" }}>{uomL}</span></span>
                            <div className="mono" style={{ marginTop: 2, fontSize: 10.5, color: color || "var(--fg-3)", fontWeight: 600 }}>{fmtL(qty * rate)}</div>
                          </>
                        );
                        return (
                          <tr key={l.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: "var(--fg)" }}>{l.variant_name}</div>
                              <div className="mono" style={{ marginTop: 2, fontSize: 10.5, color: "var(--fg-4)" }}>{l.variant_slug || l.arc_item_id}</div>
                            </td>
                            <td className="right">
                              {amended ? (
                                <>
                                  <span className="mono fw-700" style={{ color: "var(--warn)" }}>{fmt(effRate)}</span>
                                  <span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, fontSize: 10.5, color: "var(--fg-3)" }}> / {uomL}</span>
                                  <div style={{ marginTop: 2, fontSize: 10, color: "var(--fg-4)" }}>
                                    <span style={{ textDecoration: "line-through" }}>{fmt(rate)}</span> · amended{l.amendment_effective_to ? ` until ${fmtDate(l.amendment_effective_to)}` : ""}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {fmt(rate)}<span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, fontSize: 10.5, color: "var(--fg-3)" }}> / {uomL}</span>
                                </>
                              )}
                              <div style={{ marginTop: 2, fontSize: 10.5, color: "var(--fg-4)", fontWeight: 500 }}>+{Number(l.gst_pct || 0)}% GST</div>
                            </td>
                            <td className="right"><QtyMoney qty={committed} money /></td>
                            <td className="right"><QtyMoney qty={consumed} money /></td>
                            <td className="right">
                              <QtyMoney qty={remaining} money color={over ? "var(--danger)" : undefined} />
                              {over && <div style={{ marginTop: 2, fontSize: 10.5, color: "var(--danger)", fontWeight: 600 }}>+{(consumed - committed).toLocaleString("en-IN")} {uomL} over</div>}
                            </td>
                            <td>
                              <div className="consumption-bar">
                                <div className="cb-track"><div className={`cb-fill ${tone}`} style={{ width: Math.min(100, pct) + "%" }} /></div>
                                <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)", minWidth: 40, textAlign: "right" }}>{pct}%</span>
                              </div>
                              <div style={{ marginTop: 4, fontSize: 11, color: "var(--fg-3)" }}>
                                <span className="mono fw-600" style={{ color: "var(--fg)" }}>{fmtL(consumed * rate)}</span> delivered of <span className="mono">{fmtL(committed * rate)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ── CALL-OFF POs ── */}
          {tab === "pos" && (
            <section className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><I.po /></div>
                  <div>
                    <h2>Call-off POs received</h2>
                    <div className="h-sub"><span className="mono fw-600 text-fg">{callOffs.length}</span> POs issued against your award lines</div>
                  </div>
                </div>
              </div>
              <div className="section-body flush">
                {callOffs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 20px" }}>
                    <div className="ic"><I.truck /></div>
                    <h2>No call-offs yet</h2>
                    <p>You'll see release POs here as soon as the buyer raises them against this contract.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="doc-rate-table" style={{ border: "none", borderRadius: 0 }}>
                      <thead>
                        <tr>
                          <th>PO #</th>
                          <th>Date</th>
                          <th>Item</th>
                          <th style={{ textAlign: "right" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Value</th>
                          <th style={{ textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {callOffs.map((po) => (
                          <tr key={po.call_off_id}>
                            <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{po.po_number || `PO-${po.po_id}`}</td>
                            <td>{fmtDate(po.released_at)}</td>
                            <td>
                              <div style={{ fontWeight: 500, color: "var(--fg)" }}>{po.variant_name}</div>
                            </td>
                            <td className="right">{Number(po.quantity).toLocaleString("en-IN")} {po.uom}</td>
                            <td className="right">{fmt(po.total_value)}</td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`status-pill ${PO_STATUS_VIEW[po.po_status]?.tone || "neutral"}`} style={{ fontSize: 10.5 }}>
                                <span className="dot" />{PO_STATUS_VIEW[po.po_status]?.label || po.po_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── CONTRACT DOCUMENT ── */}
          {tab === "doc" && (
            <section className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><I.file /></div>
                  <div>
                    <h2>Signed contract document</h2>
                    <div className="h-sub">Read-only · countersigned <span className="em">{fmtDate(contract.signed_by_vendor_at)}</span></div>
                  </div>
                </div>
                <div className="h-right">
                  <span className="pill success"><span className="pdot" />e-signed</span>
                  <button className="btn btn-secondary btn-sm" onClick={dlAnnexure}><I.download /> Rate annexure (.xlsx)</button>
                  <button className="btn btn-secondary btn-sm" onClick={dlContractCopy}><I.download /> PDF copy</button>
                </div>
              </div>
              <div className="section-body">
                <div className="doc-section">
                  <div className="doc-h">Contract identity</div>
                  <div className="doc-p">
                    This Annual Rate Contract (ARC) <strong>#{arc?.arc_number}</strong> dated <strong>{fmtDate(contract.signed_by_vendor_at)}</strong> is entered into between the parties below for the supply of items in the category <strong>{arc?.category_title || "—"}</strong>.
                  </div>
                  <div className="doc-parties" style={{ marginTop: 14 }}>
                    <div className="party-block">
                      <div className="pb-label">Buyer (issuer)</div>
                      <div className="pb-name">{arc?.hotel_name || "Buyer"}</div>
                      <div className="pb-sub">Representative: {arc?.buyer_name || "—"}</div>
                      <div className="pb-sub">Property: {arc?.hotel_name}{arc?.hotel_city ? ` · ${arc.hotel_city}` : ""}</div>
                    </div>
                    <div className="party-block">
                      <div className="pb-label">Vendor (you)</div>
                      <div className="pb-name">{contract.vendor_name}</div>
                      <div className="pb-sub">{contract.vendor_email || "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="doc-section">
                  <div className="doc-h">Key terms</div>
                  <div className="doc-terms">
                    <div><div className="dt-k">Term start</div><div className="dt-v">{fmtDate(arc?.contract_start_at)}</div></div>
                    <div><div className="dt-k">Term end</div><div className="dt-v">{fmtDate(arc?.contract_end_at)}</div></div>
                    <div><div className="dt-k">Payment terms</div><div className="dt-v">{paymentTerms}</div></div>
                    <div><div className="dt-k">GST</div><div className="dt-v">{Number(lines[0]?.gst_pct || 0)}% extra on all line items</div></div>
                    <div><div className="dt-k">Escalation</div><div className="dt-v">{arc?.escalation_clause_json?.type && arc.escalation_clause_json.type !== "none" ? `${arc.escalation_clause_json.type}${arc.escalation_clause_json.cap_pct ? ` · cap ${arc.escalation_clause_json.cap_pct}%` : ""}` : "None"}</div></div>
                    <div><div className="dt-k">Eligibility</div><div className="dt-v">{arc?.eligibility_type === "invitation" ? "Invitation-only" : "Open tender"}</div></div>
                  </div>
                </div>

                <div className="doc-section">
                  <div className="doc-h">Schedule A — Awarded items &amp; rates</div>
                  <table className="doc-rate-table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: "right" }}>Rate</th>
                        <th style={{ textAlign: "right" }}>Committed qty</th>
                        <th>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--fg)" }}>{l.variant_name}</div>
                            <div className="mono" style={{ marginTop: 2, fontSize: 10.5, color: "var(--fg-4)" }}>{l.variant_slug || l.arc_item_id}</div>
                          </td>
                          <td className="right">{fmt(l.unit_rate)} / {l.uom || "unit"}</td>
                          <td className="right">{Number(l.committed_qty).toLocaleString("en-IN")} {l.uom}</td>
                          <td>{l.payment_terms || paymentTerms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {arc?.penalty_clause && (
                  <div className="doc-section">
                    <div className="doc-h">Penalty / LD clause</div>
                    <div className="doc-p">{arc.penalty_clause}</div>
                  </div>
                )}

                <div className="doc-section">
                  <div className="doc-h">Signatures</div>
                  <div className="doc-parties" style={{ marginTop: 8 }}>
                    <div>
                      <div className="pb-label" style={{ marginBottom: 8 }}>For buyer</div>
                      <div className="sig-block">
                        <div className="sig-name">{arc?.buyer_name || "—"}</div>
                        <div className="sig-meta">Authorised representative</div>
                      </div>
                    </div>
                    <div>
                      <div className="pb-label" style={{ marginBottom: 8 }}>For vendor (you)</div>
                      <div className="sig-block">
                        <div className="sig-name">{contract.vendor_name}</div>
                        <div className="sig-meta">Signed via OTP on {fmtDate(contract.signed_by_vendor_at)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="doc-p" style={{ marginTop: 10, fontSize: 11.5, color: "var(--fg-4)", textAlign: "center" }}>
                    Document hash · <span className="mono">{contract.document_hash || "—"}</span> · stored on the audit ledger
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── AMENDMENTS ── */}
          {tab === "amendments" && (
            <VendorAmendmentsTab
              amendments={amendments}
              lines={lines}
              arc={arc}
              contract={contract}
              contractId={contractId}
              sub={amendSub}
              setSub={setAmendSub}
              onOpen={setViewingAmend}
            />
          )}
        </div>

        {/* ── RIGHT ASIDE ── */}
        <aside className="detail-aside">
          <div className="aside-card">
            <div className="ac-head"><div className="ac-t"><I.user /> Buyer contact</div></div>
            <div className="ac-body">
              <div className="contact-row">
                <div className="cr-av av-warm">{initials(arc?.buyer_name)}</div>
                <div className="cr-meta">
                  <div className="cr-name">{arc?.buyer_name || "—"}</div>
                  <div className="cr-sub">{arc?.buyer_designation || "Procurement"}</div>
                  {arc?.buyer_email && <div className="cr-email">{arc.buyer_email}</div>}
                </div>
              </div>
              {arc?.buyer_email && (
                <div style={{ marginTop: 12 }}>
                  <a className="btn btn-secondary btn-sm btn-block" href={`mailto:${arc.buyer_email}`}>
                    <I.mail /> Email
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="aside-card">
            <div className="ac-head"><div className="ac-t"><I.activity /> This contract</div></div>
            <div className="ac-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="perf-bar">
                <div className="pb-head"><span className="pb-k">Consumption</span><span className="pb-v">{totals.pct}%</span></div>
                <div className="pb-track"><div className={`pb-fill ${totals.pct >= 100 ? "danger" : totals.pct >= 75 ? "warn" : ""}`} style={{ width: Math.min(100, totals.pct) + "%" }} /></div>
              </div>
              <div>
                <div className="stat-mini">
                  <div className="sm-k"><div className="sm-ic"><Icon size={11} sw={2.2}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon></div>Delivered value</div>
                  <div className="sm-v success">{fmtL(totals.consumed)}</div>
                </div>
                <div className="stat-mini">
                  <div className="sm-k"><div className="sm-ic"><I.check /></div>vs. Committed</div>
                  <div className="sm-v">{fmtL(totals.committed)}</div>
                </div>
                <div className="stat-mini">
                  <div className="sm-k"><div className="sm-ic"><Icon size={11} sw={2.2}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /></Icon></div>Call-off POs</div>
                  <div className="sm-v">{callOffs.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Amendments — the vendor's own requests on this contract */}
          <div className="aside-card">
            <div className="ac-head">
              <div className="ac-t">
                <Icon><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>
                Amendments
              </div>
            </div>
            <div className="ac-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {amendments.length === 0 && (
                <div style={{ fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.5 }}>
                  Need a price, quantity, or term revision? Request an amendment — it routes through the buyer's approval workflow.
                </div>
              )}
              {amendments.slice(0, 4).map((am) => {
                const tone = am.status === "requested" ? "warn"
                  : am.status === "approved" || am.status === "live" ? "success"
                  : am.status === "rejected" ? "danger" : "neutral";
                return (
                  <div key={am.id} role="button" tabIndex={0}
                       onClick={() => { setTab("amendments"); setViewingAmend(am); }}
                       onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setTab("amendments"); setViewingAmend(am); } }}
                       style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                    <span className="mono" style={{ fontWeight: 600, color: "var(--fg-3)", flexShrink: 0 }}>AMD-{am.id}</span>
                    <span style={{ flex: 1, minWidth: 0, color: "var(--fg-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "capitalize" }}>
                      {String(am.amendment_type).replace("_", " ")}
                    </span>
                    <span className={`status-pill ${tone}`} style={{ fontSize: 10, flexShrink: 0 }}>
                      <span className="dot" />{amendStatusInfo(am).pill}
                    </span>
                  </div>
                );
              })}
              {amendments.length > 4 && (
                <Link href="/dashboard/vendor/rate-contracts/amendments" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>+{amendments.length - 4} more in My Amendments</Link>
              )}
              {(contract.status === "active" || contract.status === "expiring_soon") && (
                <Link href={`/dashboard/vendor/rate-contracts/amendments/request?contract=${contractId}`} className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 4 }}>
                  Request amendment
                </Link>
              )}
            </div>
          </div>

          {contract.status === "expiring_soon" && (
            <div className="expiry-card">
              <div className="ec-head"><I.clock /> Renewal notice</div>
              <div className="ec-body">Contract expires in {daysLeft} days.</div>
              <div className="ec-sub">The buyer can initiate renewal at any time from their dashboard. Auto-renewal is not enabled on this contract.</div>
            </div>
          )}

          {contract.status === "active" && (
            <div className="aside-card">
              <div className="ac-head"><div className="ac-t"><I.healthy /> Contract healthy</div></div>
              <div className="ac-body">
                <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.5 }}>
                  Continue to fulfil call-off POs as they arrive. You'll be notified 60 days before expiry.
                </div>
              </div>
            </div>
          )}

          {contract.status === "expired" && (
            <div className="aside-card">
              <div className="ac-head"><div className="ac-t"><I.clock /> Contract closed</div></div>
              <div className="ac-body">
                <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.5 }}>
                  This contract has ended. View-only for historical reference and consumption reporting.
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* One modal at a time: hide the amendment modal while the sign overlay
          is up; cancelling the sign overlay brings the amendment modal back. */}
      {viewingAmend && !signingAddendum && (
        <VendorAmendmentModal
          amendment={viewingAmend}
          arc={arc}
          lines={lines}
          onClose={() => setViewingAmend(null)}
          onSign={(am) => setSigningAddendum({
            id: am.addendum_id,
            addendum_number: am.addendum_number,
            amendment_type: am.amendment_type,
            arc_number: arc?.arc_number,
          })}
          onDecline={declineAddendum}
        />
      )}

      {signingAddendum && (
        <AddendumSignModal
          addendum={signingAddendum}
          onClose={() => setSigningAddendum(null)}
          onDone={async () => { setSigningAddendum(null); setViewingAmend(null); await load(); }}
        />
      )}
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Amendments tab — the vendor's own requests on this contract, split into
//  Requested / Active / Past. Mirrors the buyer's tab, but everything reads
//  from the vendor's perspective and the approval chain is anonymised to
//  numbered levels (the server never sends buyer approver identities).
// ──────────────────────────────────────────────────────────────────────────
function VendorAmendmentsTab({ amendments, lines, arc, contract, contractId, sub, setSub, onOpen }) {
  const requested = amendments.filter((a) => a.status === "requested");
  // 'awaiting_signature' = buyer-approved, pending the vendor's addendum re-sign.
  const active    = amendments.filter((a) => a.status === "awaiting_signature" || a.status === "approved" || a.status === "live");
  const rest      = amendments.filter((a) => a.status === "rejected" || a.status === "ended" || a.status === "voided");
  const list = sub === "requested" ? requested : sub === "active" ? active : rest;
  const canRequest = contract.status === "active" || contract.status === "expiring_soon";

  return (
    <section className="section-card">
      <div className="section-head">
        <div className="h-left">
          <div className="ic"><I.edit /></div>
          <div>
            <h2>Amendments</h2>
            <div className="h-sub">Your change requests on this contract — track each one level by level.</div>
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
            <div className="ic"><I.edit /></div>
            <h2>No {sub === "rest" ? "past" : sub} amendments</h2>
            <p>
              {sub === "requested" ? "Nothing is with the buyer for review right now."
                : sub === "active" ? "No approved or live amendments on this contract."
                : "Declined and closed amendments will show up here."}
            </p>
            {sub === "requested" && canRequest && (
              <Link href={`/dashboard/vendor/rate-contracts/amendments/request?contract=${contractId}`} className="btn btn-blue btn-sm" style={{ marginTop: 12 }}>
                Request amendment
              </Link>
            )}
          </div>
        )}
        {list.map((am) => (
          <VendorAmendmentRow key={am.id} am={am} arc={arc} lines={lines} onClick={() => onOpen(am)} />
        ))}
      </div>
    </section>
  );
}

function VendorAmendmentRow({ am, arc, lines, onClick }) {
  const target = am.payload?.arc_contract_line_id
    ? lines.find((l) => String(l.id) === String(am.payload.arc_contract_line_id))
    : null;
  const info = amendStatusInfo(am);
  const total = Number(am.total_steps) || 0;
  const cur = Math.min(Number(am.current_step) || 1, total || 1);

  const itemLabel = target ? target.variant_name
    : am.amendment_type === "term" ? "Contract term"
    : am.amendment_type === "item_add" ? "New item"
    : "—";
  const delta = am.amendment_type === "price" && target
    ? <>₹{Number(target.unit_rate)} <span style={{ color: "var(--fg-4)" }}>→</span> <span className="mono fw-700" style={{ color: "var(--warn)" }}>₹{am.payload?.new_rate}</span> / {target.uom || "unit"}</>
    : am.amendment_type === "qty" && target
    ? <>{Number(target.committed_qty).toLocaleString("en-IN")} <span style={{ color: "var(--fg-4)" }}>→</span> <span className="mono fw-700" style={{ color: "var(--warn)" }}>{Number(am.payload?.new_qty || 0).toLocaleString("en-IN")}</span> {target.uom || ""}</>
    : am.amendment_type === "term"
    ? <>{fmtDate(arc?.contract_end_at)} <span style={{ color: "var(--fg-4)" }}>→</span> <span className="mono fw-700" style={{ color: "var(--warn)" }}>{fmtDate(am.amendment_from)}</span></>
    : am.amendment_type === "item_add"
    ? <>₹{am.payload?.new_rate} × {Number(am.payload?.new_qty || 0).toLocaleString("en-IN")}</>
    : <>removal</>;

  return (
    <div onClick={onClick} role="button" tabIndex={0}
         onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
         style={{
           background: "var(--surface)", border: "1px solid var(--border)",
           borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.13s ease",
           display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
         }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
          <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-3)" }}>AMD-{am.id}</span>
          <span className="pill" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em" }}>{String(am.amendment_type).replace("_", " ")}</span>
          <span className={`status-pill ${info.tone}`} style={{ fontSize: 10.5 }}><span className="dot" />{info.pill}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", lineHeight: 1.35, display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
          <span>{itemLabel}</span>
          <span className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{delta}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span>Effective <span className="mono">{fmtDate(am.amendment_from)}</span>{am.amendment_to ? <> → <span className="mono">{fmtDate(am.amendment_to)}</span></> : null}</span>
          <span style={{ color: "var(--fg-4)" }}>·</span>
          <span>Requested {fmtDate(am.created_at)}</span>
          {info.text && (
            <>
              <span style={{ color: "var(--fg-4)" }}>·</span>
              <span style={{ color: "var(--fg-2)", fontWeight: 600 }}>{info.text}</span>
            </>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
        {total > 0 && am.status === "requested" && (
          <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
            Level <span className="mono" style={{ fontWeight: 700, color: "var(--fg)" }}>{cur} / {total}</span>
          </div>
        )}
        <span className="btn btn-sm btn-secondary" style={{ pointerEvents: "none" }}>View</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  VendorAmendmentModal — read-only review of one amendment. Same shape as
//  the buyer's modal (Details / Approval matrix / Edit history) but with
//  anonymised levels: "Level 2 cleared", "Level 1 revised the proposal".
// ──────────────────────────────────────────────────────────────────────────
function VendorAmendmentModal(props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(<VendorAmendmentModalInner {...props} />, document.body);
}

function VendorAmendmentModalInner({ amendment, arc, lines, onClose, onSign, onDecline }) {
  const am = amendment;
  const needsSign = am.status === "awaiting_signature" && am.addendum_id;
  const target = am.payload?.arc_contract_line_id
    ? lines.find((l) => String(l.id) === String(am.payload.arc_contract_line_id))
    : null;
  const chain = Array.isArray(am.chain) ? am.chain : [];
  const editHistory = Array.isArray(am.edit_history) ? am.edit_history : [];
  const stepIdx = Math.max(0, (Number(am.current_step) || 1) - 1);
  const isPending = am.status === "requested";
  const info = amendStatusInfo(am);

  const [mtab, setMtab] = useState("details");   // details | chain | history

  const pctChange = (() => {
    if (am.amendment_type !== "price" || !target || !am.payload?.new_rate) return null;
    const cur = Number(target.unit_rate);
    if (!cur) return null;
    return ((Number(am.payload.new_rate) - cur) / cur) * 100;
  })();

  const originalDisplay =
    am.amendment_type === "term"  ? fmtDate(arc?.contract_end_at)
    : !target ? "—"
    : am.amendment_type === "price" ? `₹${Number(target.unit_rate)} / ${target.uom || "unit"}`
    : am.amendment_type === "qty"   ? `${Number(target.committed_qty).toLocaleString("en-IN")} ${target.uom || ""}`
    : am.amendment_type === "item_add" ? "Not on contract"
    : "—";
  const proposedDisplay =
    am.amendment_type === "price" ? `₹${am.payload?.new_rate} / ${target?.uom || "unit"}`
    : am.amendment_type === "qty" ? `${Number(am.payload?.new_qty || 0).toLocaleString("en-IN")} ${target?.uom || ""}`
    : am.amendment_type === "term" ? fmtDate(am.amendment_from)
    : am.amendment_type === "item_add" ? `₹${am.payload?.new_rate} × ${Number(am.payload?.new_qty || 0).toLocaleString("en-IN")}`
    : "—";

  const FIELD_LABEL = {
    new_rate: "Proposed rate",
    new_qty: "Proposed quantity",
    amendment_from: am.amendment_type === "term" ? "New end date" : "Effective from",
    amendment_to: "Effective to",
  };

  return (
    <div className="arc-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="arc-modal lg">
        {/* ── Header ── */}
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <div className="t" style={{ flexWrap: "wrap", gap: 8 }}>
              <h3>Amendment <span className="mono" style={{ color: "var(--fg-3)", fontWeight: 600 }}>AMD-{am.id}</span></h3>
              <span className="pill" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em" }}>{AMEND_TYPE_LABEL[am.amendment_type] || am.amendment_type}</span>
              <span className={`status-pill ${info.tone}`} style={{ fontSize: 10.5 }}><span className="dot" />{info.pill}</span>
            </div>
            <div className="sub">
              Requested {fmtDate(am.created_at)}{info.text ? <> · <strong style={{ color: "var(--fg)" }}>{info.text}</strong></> : null}
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
              Approval progress <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({chain.length})</span>
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
                <div className="k">Your reason</div>
                <div className="v" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{am.reason || "—"}</div>
              </div>

              {am.amendment_type !== "item_remove" && (
                <div style={{ marginTop: 18 }}>
                  <div className="section-label" style={{ marginBottom: 10 }}>Original vs proposed</div>
                  <div className="rvm-compare">
                    <div className="rvm-card">
                      <div className="k">Original</div>
                      <div className="v">{originalDisplay}</div>
                    </div>
                    <div className="arrow">→</div>
                    <div className="rvm-card proposed">
                      <div className="k">Proposed</div>
                      <div className="v">{proposedDisplay}</div>
                    </div>
                  </div>
                  {pctChange != null && (
                    <div className="help-text" style={{ marginTop: 8 }}>
                      Change: <span className="mono fw-600" style={{ color: "var(--fg)" }}>{pctChange.toFixed(1)}%</span>
                      <span style={{ color: pctChange > 0 ? "var(--danger)" : "var(--success)", marginLeft: 6, fontWeight: 600 }}>
                        ({pctChange > 0 ? "increase" : "decrease"})
                      </span>
                    </div>
                  )}
                  {editHistory.length > 0 && (
                    <div className="help-text" style={{ marginTop: 8 }}>
                      The buyer revised this proposal during review — see <strong>Edit history</strong> for the exact changes.
                    </div>
                  )}
                </div>
              )}

              {/* Status banner — one plain-language line on where things stand */}
              <div className={`guide${info.tone === "success" ? " success" : info.tone === "danger" ? " danger" : info.tone === "warn" ? "" : ""}`} style={{ marginTop: 18, alignItems: "center" }}>
                <div className="g-ic" style={{ marginTop: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div>
                  {isPending && (
                    <><strong>In review.</strong> {info.text}. You'll be notified the moment the buyer decides — no action is needed from you.</>
                  )}
                  {am.status === "awaiting_signature" && (
                    <><strong>Approved — your signature is required.</strong> Click <strong>Sign addendum</strong> below to seal the addendum and apply the new terms. Until you sign, the original terms stay in effect. You can also <strong>Decline</strong> to void this change.</>
                  )}
                  {am.status === "approved" && (
                    <><strong>Approved.</strong> The change takes effect for call-offs raised from <strong>{fmtDate(am.amendment_from)}</strong>.</>
                  )}
                  {am.status === "live" && (
                    <><strong>Live.</strong> Amended terms currently apply{am.amendment_to ? <> until <strong>{fmtDate(am.amendment_to)}</strong>, after which the original contract terms resume</> : null}.</>
                  )}
                  {am.status === "rejected" && (
                    <><strong>Declined.</strong> {info.text}. The original contract terms continue to apply — check Approval progress for the reviewer's note.</>
                  )}
                  {(am.status === "ended" || am.status === "voided") && (
                    <><strong>Closed.</strong> This amendment's window has ended; the original contract terms apply again.</>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═════ APPROVAL PROGRESS — anonymised levels ═════ */}
          {mtab === "chain" && (
            <>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                {chain.length === 0 && (
                  <div className="empty-state" style={{ padding: 28 }}>
                    <h2>No approval chain</h2>
                    <p>This request has no approval routing attached yet.</p>
                  </div>
                )}
                {chain.map((step, i) => {
                  const isCurrent = i === stepIdx && isPending;
                  const tone = step.status === "approved" ? "success" : step.status === "rejected" ? "danger" : isCurrent ? "warn" : "neutral";
                  return (
                    <div key={i} className="rvm-chain-step" style={isCurrent ? { background: "var(--warn-soft)" } : undefined}>
                      <div className="av" style={{ background: "var(--surface-3)", color: "var(--fg-3)" }}>L{i + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="nm">Approval level {i + 1}</div>
                        <div className="meta">
                          Level <span className="mono">{i + 1} of {chain.length}</span>
                          {step.decided_at ? <> · decided {fmtDate(step.decided_at)}</> : null}
                        </div>
                        {step.comment && <div className="comment">{step.comment}</div>}
                      </div>
                      <span className={`status-pill ${tone}`} style={{ fontSize: 10.5 }}>
                        <span className="dot" />
                        {step.status === "approved" ? "cleared" : step.status === "rejected" ? "declined" : isCurrent ? "reviewing now" : "waiting"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="help-text" style={{ marginTop: 10 }}>
                The buyer's approval route was locked when you submitted this request. Approver identities stay on the buyer's side — you see progress by level.
              </div>
            </>
          )}

          {/* ═════ EDIT HISTORY — anonymised levels ═════ */}
          {mtab === "history" && (
            <>
              {editHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: 28 }}>
                  <div className="ic"><I.edit /></div>
                  <h2>No edits</h2>
                  <p>If a reviewer adjusts your proposed values before approving, each change appears here with a before/after diff.</p>
                </div>
              ) : (
                <div>
                  {editHistory.map((e, idx) => {
                    const fmtVal = (v) => {
                      if (v == null || v === "") return "—";
                      if (e.field_changed === "amendment_from" || e.field_changed === "amendment_to") return fmtDate(v);
                      if (e.field_changed === "new_rate") return `₹${v}`;
                      return String(v);
                    };
                    return (
                      <div key={idx} className="rvm-edit-card">
                        <div className="eh-head">
                          <div className="eh-ic"><I.edit /></div>
                          <div className="eh-who">
                            <span className="em">{e.level ? `Level ${e.level}` : "The buyer"}</span> revised this proposal during review
                          </div>
                          <div className="eh-time">{fmtDate(e.changed_at)}</div>
                        </div>
                        <div className="eh-body">
                          <span className="eh-field">{FIELD_LABEL[e.field_changed] || String(e.field_changed).replace(/_/g, " ")}</span>
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
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {needsSign ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => onDecline && onDecline(am)}>Decline</button>
              <button className="btn btn-blue" onClick={() => onSign && onSign(am)}>Sign addendum</button>
            </div>
          ) : (
            <div className="help-text" style={{ margin: 0 }}>
              {info.text || <>Amendment is <strong>{am.status}</strong>.</>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <main className="main-body">
      <nav className="arc-crumb-strip" aria-hidden="true">
        <div className="inner">
          <Sk w={60} h={14} /><span className="sep">/</span><Sk w={110} h={14} /><span className="sep">/</span><Sk w={120} h={14} />
        </div>
      </nav>
      <section className="arc-sk-hero">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Sk w={130} h={11} style={{ marginBottom: 8 }} />
            <Sk w="58%" h={26} style={{ marginBottom: 12 }} />
            <Sk w="40%" h={14} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Sk w={110} h={30} r={6} /><Sk w={130} h={30} r={6} />
          </div>
        </div>
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.10)", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}><Sk w={80} h={10} style={{ marginBottom: 7 }} /><Sk w="80%" h={16} /></div>
          ))}
        </div>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="arc-sk-kpi">
            <Sk w={38} h={38} r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}><Sk w="55%" h={18} style={{ marginBottom: 6 }} /><Sk w="40%" h={10} /></div>
          </div>
        ))}
      </section>
      <div className="detail-grid">
        <div className="arc-sk-tile" style={{ minHeight: 320 }}>
          <Sk w={300} h={32} r={8} style={{ marginBottom: 16 }} />
          {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h={40} style={{ marginBottom: 8 }} />)}
        </div>
        <aside className="detail-aside">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="arc-sk-tile">
              <Sk w={120} h={12} style={{ marginBottom: 12 }} />
              <Sk h={60} />
            </div>
          ))}
        </aside>
      </div>
    </main>
  );
}
