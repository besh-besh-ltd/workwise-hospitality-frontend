// Buyer — ARC v2 Commercial Evaluation page.
// Quote-comparison matrix with L1 highlight and per-item allocation editor.
// Backs onto ArcApi.getCommEval / saveAllocation / finalizeCommEval / sendBackCommEval.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";

// ----------------------------------------------------------------
// formatting helpers (module-scoped so they're usable by both the
// page component and ItemRow without prop drilling)
// ----------------------------------------------------------------

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const v = Math.round(Number(n));
  return "₹" + v.toLocaleString("en-IN");
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
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}
const AV_CLASSES = ["av-blue", "av-green", "av-amber", "av-violet", "av-indigo", "av-pink"];
function avClass(id) {
  if (id === null || id === undefined) return AV_CLASSES[0];
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AV_CLASSES[Math.abs(h) % AV_CLASSES.length];
}
// landed unit cost = rate + (charges if toggle on)
function landedRate(line, includeCharges) {
  if (!line) return null;
  return toNum(line.rate) + (includeCharges ? toNum(line.charges) : 0);
}

// ----------------------------------------------------------------

export default function BuyerCommEvalPage() {
  const router = useRouter();
  const { contractId } = router.query;

  const [loading, setLoading] = useState(true);
  const [arc, setArc] = useState(null);
  const [commEvaluation, setCommEvaluation] = useState(null);
  const [items, setItems] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [awards, setAwards] = useState([]);
  // allocation editor keyed by `${item_id}::${quote_line_id}` → { qty }
  const [alloc, setAlloc] = useState({});
  const [activeView, setActiveView] = useState("product");
  const [expanded, setExpanded] = useState({});
  const [includeCharges, setIncludeCharges] = useState(true);
  const [savingItem, setSavingItem] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");
  const [sendingBack, setSendingBack] = useState(false);

  const applyPayload = (payload) => {
    setArc(payload.arc || null);
    setCommEvaluation(payload.comm_evaluation || null);
    setItems(Array.isArray(payload.items) ? payload.items : []);
    setQuotes(Array.isArray(payload.quotes) ? payload.quotes : []);
    const aw = Array.isArray(payload.awards) ? payload.awards : [];
    setAwards(aw);
    const seed = {};
    aw.forEach((a) => {
      if (!a || !a.arc_item_id || !a.awarded_quote_line_id) return;
      const key = `${a.arc_item_id}::${a.awarded_quote_line_id}`;
      seed[key] = { qty: toNum(a.allocated_qty) };
    });
    setAlloc(seed);
  };

  const reload = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const r = await ArcApi.getCommEval(contractId);
      applyPayload(r?.data || r || {});
    } catch (e) {
      // global axios interceptor handles toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!contractId) return;
      setLoading(true);
      try {
        const r = await ArcApi.getCommEval(contractId);
        if (cancelled) return;
        applyPayload(r?.data || r || {});
      } catch (e) {
        // interceptor handles toast
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  // ----------------------------------------------------------------
  // index lookups
  // ----------------------------------------------------------------

  const vendors = useMemo(() => {
    const map = new Map();
    quotes.forEach((q) => {
      const vid = q.vendor_id;
      if (!map.has(vid)) {
        map.set(vid, {
          vendor_id: vid,
          vendor_name: q.vendor_name || `Vendor ${vid}`,
          quote_id: q.quote_id,
          submitted_at: q.submitted_at,
          lines: [],
        });
      }
      map.get(vid).lines.push({
        quote_line_id: q.quote_line_id,
        arc_item_id: q.arc_item_id,
        rate: toNum(q.rate),
        gst_pct: toNum(q.gst_pct),
        charges: toNum(q.charges),
        lead_time_days: q.lead_time_days,
        moq: q.moq,
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
    if (!v) return null;
    return v.lines.find((l) => l.arc_item_id === itemId) || null;
  };

  const l1ForItem = (itemId) => {
    let best = null;
    vendors.forEach((v) => {
      const l = v.lines.find((x) => x.arc_item_id === itemId);
      if (!l) return;
      const lan = landedRate(l, includeCharges);
      if (lan === null) return;
      if (best === null || lan < best.landed) {
        best = { vendor_id: v.vendor_id, line: l, landed: lan };
      }
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
      const lan = landedRate(l, includeCharges);
      if (lan === null) return;
      s += lan * toNum(it.indicative_qty);
    });
    return s;
  };

  const vendorRank = (vid) => {
    const ranked = vendors.slice().sort((a, b) => vendorTotal(a.vendor_id) - vendorTotal(b.vendor_id));
    return ranked.findIndex((v) => v.vendor_id === vid) + 1;
  };

  // ----------------------------------------------------------------
  // allocation helpers
  // ----------------------------------------------------------------

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
      if (qty > 0) {
        rows.push({ vendor: v, line: l, qty });
        total += qty;
      }
    });
    return { rows, total };
  };

  const itemStatus = (itemId) => {
    const it = itemById.get(itemId);
    const indicative = it ? toNum(it.indicative_qty) : 0;
    const { total } = itemAllocations(itemId);
    if (total === 0) return { kind: "pending", indicative, allocated: 0 };
    if (Math.abs(total - indicative) < 0.0001) return { kind: "awarded", indicative, allocated: total };
    return { kind: "partial", indicative, allocated: total };
  };

  const counts = () => {
    const total = items.length;
    let awarded = 0;
    let partial = 0;
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
      const { rows } = itemAllocations(itemId);
      rows.forEach((r) => {
        const lan = landedRate(r.line, includeCharges);
        if (lan === null) return;
        s += lan * r.qty;
      });
    });
    return s;
  };

  // ----------------------------------------------------------------
  // allocation edit
  // ----------------------------------------------------------------

  const awardCell = (vid, itemId) => {
    const it = itemById.get(itemId);
    const indicative = it ? toNum(it.indicative_qty) : 0;
    const v = vendorById.get(vid);
    if (!v) return;
    const l = v.lines.find((x) => x.arc_item_id === itemId);
    if (!l) return;
    const next = { ...alloc };
    vendors.forEach((vv) => {
      const ll = vv.lines.find((x) => x.arc_item_id === itemId);
      if (!ll) return;
      const k = `${itemId}::${ll.quote_line_id}`;
      if (k in next) delete next[k];
    });
    next[`${itemId}::${l.quote_line_id}`] = { qty: indicative };
    setAlloc(next);
  };

  const clearItem = (itemId) => {
    const next = { ...alloc };
    vendors.forEach((vv) => {
      const ll = vv.lines.find((x) => x.arc_item_id === itemId);
      if (!ll) return;
      const k = `${itemId}::${ll.quote_line_id}`;
      if (k in next) delete next[k];
    });
    setAlloc(next);
  };

  const setSplitQty = (itemId, vid, qty) => {
    const v = vendorById.get(vid);
    if (!v) return;
    const l = v.lines.find((x) => x.arc_item_id === itemId);
    if (!l) return;
    const k = `${itemId}::${l.quote_line_id}`;
    const next = { ...alloc };
    if (!qty || toNum(qty) <= 0) delete next[k];
    else next[k] = { qty: toNum(qty) };
    setAlloc(next);
  };

  const autoPickL1 = () => {
    const next = { ...alloc };
    items.forEach((it) => {
      const itemId = it.id || it.arc_item_id;
      const indicative = toNum(it.indicative_qty);
      vendors.forEach((vv) => {
        const ll = vv.lines.find((x) => x.arc_item_id === itemId);
        if (!ll) return;
        const k = `${itemId}::${ll.quote_line_id}`;
        if (k in next) delete next[k];
      });
      const l1 = l1ForItem(itemId);
      if (l1) next[`${itemId}::${l1.line.quote_line_id}`] = { qty: indicative };
    });
    setAlloc(next);
    toast.success("Auto-picked L1 across all items");
  };

  // ----------------------------------------------------------------
  // save per-item allocation
  // ----------------------------------------------------------------

  const saveItemAllocation = async (itemId) => {
    const it = itemById.get(itemId);
    if (!it) return;
    const indicative = toNum(it.indicative_qty);
    const { rows, total } = itemAllocations(itemId);

    if (rows.length === 0) {
      toast.error("Allocate at least one vendor before saving.");
      return;
    }
    if (Math.abs(total - indicative) > 0.0001) {
      toast.error(`Allocated qty (${total}) must equal indicative qty (${indicative}).`);
      return;
    }

    const l1 = l1ForItem(itemId);
    const allocations = rows.map((r, idx) => {
      const lan = landedRate(r.line, includeCharges);
      return {
        awarded_vendor_id: r.vendor.vendor_id,
        awarded_quote_line_id: r.line.quote_line_id,
        allocated_qty: r.qty,
        l_rank: idx + 1,
        is_l1_default: !!(l1 && r.line.quote_line_id === l1.line.quote_line_id),
        awarded_quote_snapshot: {
          rate: r.line.rate,
          gst_pct: r.line.gst_pct,
          charges: r.line.charges,
          lead_time_days: r.line.lead_time_days,
          moq: r.line.moq,
          landed_rate: lan,
          include_charges: includeCharges,
        },
      };
    });

    setSavingItem(itemId);
    try {
      await ArcApi.saveAllocation(contractId, { item_id: itemId, allocations });
      toast.success("Allocation saved");
      await reload();
    } catch (e) {
      // interceptor
    } finally {
      setSavingItem(null);
    }
  };

  // ----------------------------------------------------------------
  // finalize / send back
  // ----------------------------------------------------------------

  const handleFinalize = async () => {
    const c = counts();
    if (c.awarded < c.total) {
      toast.error("Allocate every item before finalising.");
      return;
    }
    setFinalizing(true);
    try {
      await ArcApi.finalizeCommEval(contractId);
      toast.success("Sent to ARC Committee");
      router.push(`/dashboard/buyer/rate-contracts/${contractId}/committee`);
    } catch (e) {
      // interceptor
    } finally {
      setFinalizing(false);
    }
  };

  const handleSendBack = async () => {
    if (!sendBackReason.trim()) {
      toast.error("Add a reason before sending back.");
      return;
    }
    setSendingBack(true);
    try {
      await ArcApi.sendBackCommEval(contractId, sendBackReason.trim());
      toast.success("Commercial evaluation sent back");
      setSendBackOpen(false);
      setSendBackReason("");
      await reload();
    } catch (e) {
      // interceptor
    } finally {
      setSendingBack(false);
    }
  };

  // ----------------------------------------------------------------
  // render
  // ----------------------------------------------------------------

  if (loading) {
    return (
      <main className="main-body" style={{ paddingBottom: 108 }}>
        <div className="dash-panel">
          <div className="dash-panel-head">Loading commercial evaluation...</div>
        </div>
      </main>
    );
  }

  if (!arc) {
    return (
      <main className="main-body" style={{ paddingBottom: 108 }}>
        <div className="dash-panel">
          <div className="dash-panel-head">Rate contract not found</div>
        </div>
      </main>
    );
  }

  const c = counts();
  const subEnd = arc.submission_end_at ? new Date(arc.submission_end_at).toLocaleDateString() : "—";
  const termStart = arc.contract_start_at ? new Date(arc.contract_start_at).toLocaleDateString() : "—";
  const termEnd = arc.contract_end_at ? new Date(arc.contract_end_at).toLocaleDateString() : "—";

  return (
    <main className="main-body" style={{ paddingBottom: 108 }}>

      {/* breadcrumb */}
      <div style={{ fontSize: 12, color: "var(--fg-3, #6b7280)", marginBottom: 8 }}>
        <Link href="/dashboard/buyer/rate-contracts" style={{ color: "inherit" }}>Rate contracts</Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <Link href={`/dashboard/buyer/rate-contracts/${contractId}`} style={{ color: "inherit" }}>
          {arc.arc_number || `#${contractId}`}
        </Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <span className="here">Commercial evaluation</span>
      </div>

      {/* HERO */}
      <section className="arc-hero">
        <div className="top">
          <div>
            <div className="eyebrow">Commercial evaluation</div>
            <h1>
              <span>{arc.title}</span>
              <span className="num">{arc.arc_number ? `#${arc.arc_number}` : `#${arc.id}`}</span>
              <span className="status-chip eval">In evaluation · Commercial</span>
            </h1>
            <div className="sub">
              <span className="em">{arc.category_title || `Category ${arc.category_id}`}</span>
              <span className="sep">·</span>
              <span>
                <span className="em">Hotel</span> {arc.hotel_title || `#${arc.hotel_id}`}
              </span>
              <span className="sep">·</span>
              <span>
                <span>{items.length}</span> items · <span>{vendors.length}</span> vendors submitted
              </span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-sm" onClick={autoPickL1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Auto-pick L1 everywhere
            </button>
            <button className="btn btn-sm" onClick={() => setSendBackOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
              Send back
            </button>
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell"><div className="k">Submission closed</div><div className="v">{subEnd}</div></div>
          <div className="cell"><div className="k">Contract term</div><div className="v">{termStart} → {termEnd}</div></div>
          <div className="cell"><div className="k">Department</div><div className="v">{arc.department_title || (arc.department_id ? `#${arc.department_id}` : "—")}</div></div>
          <div className="cell"><div className="k">Tech eval</div><div className="v"><span className="em">Approved</span> · per-item qualification</div></div>
          <div className="cell"><div className="k">Items eligible for award</div><div className="v"><span className="em">{c.total}</span></div></div>
        </div>
      </section>

      {/* INFO BANNER */}
      <div className="guide">
        <div className="g-ic">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div>
          Each <strong>item</strong> can be awarded to a single vendor — or split across vendors — using the
          row editor. The cheapest landed rate is highlighted as <strong>L1</strong>. Allocated quantity per
          item must equal the indicative quantity before you can save.
        </div>
      </div>

      {/* METRICS STRIP */}
      <section className="stat-strip">
        <div className="stat-card">
          <div className="s-ic blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div><div className="s-val mono">{c.total}</div><div className="s-label">Total items</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div><div className="s-val mono">{c.awarded}</div><div className="s-label">Awarded</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div><div className="s-val mono">{c.pending + c.partial}</div><div className="s-label">Pending / partial</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic indigo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
            </svg>
          </div>
          <div><div className="s-val mono">{fmtLakh(contractedValue())}</div><div className="s-label">Contracted value</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <polyline points="20 9 12 17 8 13 4 17" />
            </svg>
          </div>
          <div><div className="s-val mono">{vendors.length}</div><div className="s-label">Vendors quoted</div></div>
        </div>
      </section>

      {/* COMPARE TOOLBAR */}
      <div className="compare-toolbar">
        <div className="view-tabs">
          <button className={activeView === "product" ? "is-active" : ""} onClick={() => setActiveView("product")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
            </svg>
            Item-wise
          </button>
          <button className={activeView === "overall" ? "is-active" : ""} onClick={() => setActiveView("overall")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <rect x="7" y="9" width="3" height="8" />
              <rect x="14" y="5" width="3" height="12" />
            </svg>
            Overall cost
          </button>
        </div>
        <div className="tool-meta">
          <label className="toggle-line">
            <span>Landed cost</span>
            <span
              className={"toggle" + (includeCharges ? " on" : "")}
              onClick={() => setIncludeCharges((v) => !v)}
            />
            <span className="em fs-12">{includeCharges ? "(rate + charges)" : "(rate only)"}</span>
          </label>
        </div>
      </div>

      {/* MATRIX (item-wise) */}
      {activeView === "product" && (
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
                  {vendors.map((v) => (
                    <th key={v.vendor_id} className="vendor-head">
                      <div className="vh-row">
                        <div className={"v-av " + avClass(v.vendor_id)}>{initialsOf(v.vendor_name)}</div>
                        <div className="vh-main">
                          <div className="vh-name-row">
                            <span className="v-name">{v.vendor_name}</span>
                            <span className={
                              "v-rank " + (vendorRank(v.vendor_id) === 1 ? "l1" : vendorRank(v.vendor_id) === 2 ? "l2" : "l3")
                            }>
                              L{vendorRank(v.vendor_id)}
                            </span>
                          </div>
                          <div className="v-total mono">{fmtINR(Math.round(vendorTotal(v.vendor_id)))}</div>
                          <div className="v-meta">
                            <span className="vm-item">
                              {v.lines.length} item{v.lines.length === 1 ? "" : "s"} quoted
                            </span>
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const itemId = it.id || it.arc_item_id;
                  const status = itemStatus(itemId);
                  const isExp = !!expanded[itemId];
                  const indicative = toNum(it.indicative_qty);
                  const itemName = it.name || it.title || it.product_name || `Item ${itemId}`;
                  const uom = it.uom || "";
                  return (
                    <ItemRow
                      key={itemId}
                      it={it}
                      itemId={itemId}
                      itemName={itemName}
                      uom={uom}
                      indicative={indicative}
                      isExp={isExp}
                      status={status}
                      vendors={vendors}
                      lineFor={lineFor}
                      isL1={isL1}
                      landed={(l) => landedRate(l, includeCharges)}
                      includeCharges={includeCharges}
                      allocatedFor={allocatedFor}
                      awardCell={awardCell}
                      clearItem={clearItem}
                      setSplitQty={setSplitQty}
                      toggleExpand={() => setExpanded((s) => ({ ...s, [itemId]: !s[itemId] }))}
                      saveItem={() => saveItemAllocation(itemId)}
                      saving={savingItem === itemId}
                    />
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="lowest-row">
                  <td className="col-item">Indicative total across {items.length} items</td>
                  {vendors.map((v) => (
                    <td key={v.vendor_id}>
                      <span className="t-val">{fmtINR(Math.round(vendorTotal(v.vendor_id)))}</span>
                      <span className="t-sub">across {items.length} items</span>
                    </td>
                  ))}
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
                  .map((v, idx) => (
                    <tr key={v.vendor_id} className={idx === 0 ? "row-awarded" : "row-pending"}>
                      <td className="col-item">
                        <div className="m-item-cell">
                          <div className="vendor-cell">
                            <div className={"vc-av " + avClass(v.vendor_id)}>{initialsOf(v.vendor_name)}</div>
                            <div className="vc-meta">
                              <div className="vc-name">{v.vendor_name}</div>
                              <div className="vc-sub">{v.lines.length} items quoted</div>
                            </div>
                          </div>
                          <div className="qty-block"><div className="q mono">L{idx + 1}</div></div>
                        </div>
                      </td>
                      <td className="cell">
                        <div className="price-cell">
                          <span className="mono fw-700">{v.lines.length} / {items.length}</span>
                        </div>
                      </td>
                      <td className="cell">
                        <div className="price-cell">
                          <span className={"price mono" + (idx === 0 ? " text-success" : "")}>
                            {fmtINR(Math.round(vendorTotal(v.vendor_id)))}
                          </span>
                        </div>
                      </td>
                      <td className="cell">
                        <div className="price-cell">
                          <span className={"pill " + (idx === 0 ? "success" : "neutral")}>
                            {idx === 0 ? "L1 · ideal candidate" : "Higher cost"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEND-BACK MODAL */}
      {sendBackOpen && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
          onClick={() => !sendingBack && setSendBackOpen(false)}
        >
          <div
            className="dash-panel"
            style={{ width: 480, maxWidth: "92vw", background: "#fff", padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dash-panel-head" style={{ padding: "14px 16px", borderBottom: "1px solid var(--bd, #e5e7eb)" }}>
              Send back commercial evaluation
            </div>
            <div style={{ padding: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--fg-3, #6b7280)", marginBottom: 6 }}>
                Reason
              </label>
              <textarea
                value={sendBackReason}
                onChange={(e) => setSendBackReason(e.target.value)}
                rows={4}
                style={{ width: "100%", padding: 8, border: "1px solid var(--bd, #e5e7eb)", borderRadius: 6, fontFamily: "inherit", fontSize: 13 }}
                placeholder="What needs to change before you can finalise?"
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" disabled={sendingBack} onClick={() => setSendBackOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-warn btn-sm" disabled={sendingBack} onClick={handleSendBack}>
                  {sendingBack ? "Sending..." : "Send back"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STICKY ACTION DOCK */}
      <div className="action-dock">
        <div className="inner">
          <div className="left">
            <span className="fs-13 text-fg-2">
              <span className="fw-600 text-fg">{c.awarded} / {c.total}</span> items awarded
            </span>
            <span className="text-fg-4">·</span>
            <span className="fs-13 text-fg-2">
              Contracted: <span className="mono fw-600 text-fg">{fmtLakh(contractedValue())}</span>
            </span>
            {c.partial > 0 && (
              <>
                <span className="text-fg-4">·</span>
                <span className="fs-13 text-fg-2">
                  <span className="fw-600">{c.partial}</span> partial
                </span>
              </>
            )}
          </div>
          <div className="right">
            <Link href={`/dashboard/buyer/rate-contracts/${contractId}`} className="btn btn-ghost btn-sm">
              Back to detail
            </Link>
            <button className="btn btn-secondary btn-sm" onClick={() => setSendBackOpen(true)}>
              Send back
            </button>
            <button
              className="btn btn-success"
              disabled={c.awarded < c.total || finalizing}
              onClick={handleFinalize}
            >
              {finalizing ? "Finalising..." : "Finalize & send to Committee"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ----------------------------------------------------------------
// ItemRow — one item row + split-allocation editor + expanded
// breakdown rows. Kept inside this file because it's not reused.
// ----------------------------------------------------------------

function ItemRow({
  it,
  itemId,
  itemName,
  uom,
  indicative,
  isExp,
  status,
  vendors,
  lineFor,
  isL1,
  landed,
  includeCharges,
  allocatedFor,
  awardCell,
  clearItem,
  setSplitQty,
  toggleExpand,
  saveItem,
  saving,
}) {
  const rowClass = status.kind === "awarded" ? "row-awarded" : "row-pending";

  const targetUnitRate =
    it.target_unit_rate !== undefined && it.target_unit_rate !== null
      ? toNum(it.target_unit_rate)
      : null;

  const deltaVsTarget = (rate) => {
    if (targetUnitRate === null || !targetUnitRate || rate === null) return null;
    return Math.round(((rate - targetUnitRate) / targetUnitRate) * 100);
  };

  const statusLabel =
    status.kind === "awarded"
      ? "Awarded"
      : status.kind === "partial"
      ? `Partial · ${status.allocated} / ${status.indicative}`
      : "Pending";

  return (
    <>
      <tr className={rowClass}>
        <td className="col-item">
          <div className="m-item-cell">
            <button className={"expand-btn" + (isExp ? " is-open" : "")} onClick={toggleExpand}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="meta">
              <div className="name">{itemName}</div>
              <div className="tags">
                {it.product_code && <span className="cat-tag">{it.product_code}</span>}
                {uom && <span className="per">per {uom}</span>}
              </div>
              {targetUnitRate !== null && targetUnitRate > 0 && (
                <div className="target">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  Target <span className="target-val mono">{fmtINR(targetUnitRate)}</span>
                </div>
              )}
              <div className={"m-item-state " + (status.kind === "awarded" ? "awarded" : "pending")}>
                <span>{statusLabel}</span>
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
          const lan = landed(l);
          const l1 = isL1(v.vendor_id, itemId);
          const allocated = allocatedFor(itemId, v.vendor_id);
          const isAwarded = allocated > 0;
          const fullAwarded =
            isAwarded && allocated >= indicative - 0.0001 && allocated <= indicative + 0.0001;
          const d = deltaVsTarget(lan);
          return (
            <td key={v.vendor_id} className="cell">
              <div
                className={"price-cell" + (l1 ? " is-l1" : "") + (isAwarded ? " is-awarded" : "")}
                onClick={() =>
                  fullAwarded ? clearItem(itemId) : awardCell(v.vendor_id, itemId)
                }
                style={{ cursor: "pointer" }}
              >
                <div className="p-top">
                  <span className="price mono">{fmtINR(lan)}</span>
                  {l1 && !isAwarded && <span className="l1-badge">L1</span>}
                </div>
                <div className="landed">
                  rate <span className="mono">{fmtINR(l.rate)}</span>
                  {includeCharges && (
                    <>
                      {" · chg "}
                      <span className="mono">{fmtINR(l.charges)}</span>
                    </>
                  )}
                </div>
                {d !== null && (
                  <div className={"delta-target " + (d > 0 ? "up" : "down")}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      {d > 0 ? (
                        <polyline points="18 9 12 15 6 9" />
                      ) : (
                        <polyline points="18 15 12 9 6 15" />
                      )}
                    </svg>
                    <span>{Math.abs(d)}% vs target</span>
                  </div>
                )}
                {!isAwarded ? (
                  <button
                    className="cell-select-btn"
                    onClick={(e) => { e.stopPropagation(); awardCell(v.vendor_id, itemId); }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Award
                  </button>
                ) : (
                  <button
                    className="cell-pill-awarded"
                    onClick={(e) => { e.stopPropagation(); clearItem(itemId); }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {fullAwarded ? "Awarded" : `Qty ${allocated}`}
                  </button>
                )}
              </div>
            </td>
          );
        })}
      </tr>

      {/* SPLIT-ALLOCATION EDITOR */}
      <tr className="bd-row">
        <td className="bd-label" style={{ verticalAlign: "top" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>Split allocation</span>
            <span style={{ fontSize: 11, color: "var(--fg-3, #6b7280)" }}>
              {status.allocated} / {indicative} {uom}
            </span>
            <button
              className="btn btn-sm btn-blue"
              onClick={saveItem}
              disabled={
                saving ||
                Math.abs(status.allocated - indicative) > 0.0001 ||
                status.allocated === 0
              }
              style={{ marginTop: 4 }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {Math.abs(status.allocated - indicative) > 0.0001 && status.allocated > 0 && (
              <span style={{ fontSize: 11, color: "var(--warn, #b45309)" }}>
                Must equal {indicative}
              </span>
            )}
          </div>
        </td>
        {vendors.map((v) => {
          const l = lineFor(v.vendor_id, itemId);
          if (!l) {
            return <td key={v.vendor_id} className="bd-cell muted"><span className="bd-dash">—</span></td>;
          }
          const allocated = allocatedFor(itemId, v.vendor_id);
          return (
            <td key={v.vendor_id} className="bd-cell" style={{ textAlign: "center" }}>
              <input
                type="number"
                min={0}
                max={indicative}
                value={allocated || ""}
                placeholder="0"
                onChange={(e) => setSplitQty(itemId, v.vendor_id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 84,
                  padding: "4px 6px",
                  border: "1px solid var(--bd, #e5e7eb)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "var(--font-mono, monospace)",
                  textAlign: "center",
                }}
              />
            </td>
          );
        })}
      </tr>

      {/* Expanded breakdown rows */}
      {isExp && (
        <>
          <tr className="bd-row">
            <td className="bd-label">GST</td>
            {vendors.map((v) => {
              const l = lineFor(v.vendor_id, itemId);
              const l1col = l && isL1(v.vendor_id, itemId);
              return (
                <td key={v.vendor_id} className={"bd-cell" + (l1col ? " is-l1col" : "") + (!l ? " muted" : "")}>
                  {l ? <span className="mono">{toNum(l.gst_pct)}%</span> : <span className="bd-dash">—</span>}
                </td>
              );
            })}
          </tr>
          <tr className="bd-row">
            <td className="bd-label">Charges</td>
            {vendors.map((v) => {
              const l = lineFor(v.vendor_id, itemId);
              const l1col = l && isL1(v.vendor_id, itemId);
              return (
                <td key={v.vendor_id} className={"bd-cell" + (l1col ? " is-l1col" : "") + (!l ? " muted" : "")}>
                  {l ? <span className="mono">{fmtINR(l.charges)}</span> : <span className="bd-dash">—</span>}
                </td>
              );
            })}
          </tr>
          <tr className="bd-row">
            <td className="bd-label">Lead time</td>
            {vendors.map((v) => {
              const l = lineFor(v.vendor_id, itemId);
              const l1col = l && isL1(v.vendor_id, itemId);
              return (
                <td key={v.vendor_id} className={"bd-cell" + (l1col ? " is-l1col" : "") + (!l ? " muted" : "")}>
                  {l && l.lead_time_days !== null && l.lead_time_days !== undefined
                    ? <span className="mono">{l.lead_time_days} d</span>
                    : <span className="bd-dash">—</span>}
                </td>
              );
            })}
          </tr>
          <tr className="bd-row bd-last">
            <td className="bd-label">MOQ</td>
            {vendors.map((v) => {
              const l = lineFor(v.vendor_id, itemId);
              const l1col = l && isL1(v.vendor_id, itemId);
              return (
                <td key={v.vendor_id} className={"bd-cell" + (l1col ? " is-l1col" : "") + (!l ? " muted" : "")}>
                  {l && l.moq !== null && l.moq !== undefined
                    ? <span className="mono">{l.moq}</span>
                    : <span className="bd-dash">—</span>}
                </td>
              );
            })}
          </tr>
        </>
      )}
    </>
  );
}
