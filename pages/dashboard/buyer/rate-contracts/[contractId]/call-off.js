import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

// ---------- formatters ----------
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (v) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtQty = (v) => {
  if (v == null || v === "") return "0";
  const n = Number(v);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-IN");
};

const fmtPct = (v) => {
  if (v == null || v === "") return "0";
  const n = Number(v);
  if (Number.isNaN(n)) return "0";
  return n.toFixed(0);
};

// ---------- icons ----------
const Icon = {
  Truck: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Check: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Lock: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Back: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Doc: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Approval: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

// ---------- helpers ----------
const initialsOf = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AV_PALETTE = ["av-warm", "av-sky", "av-indigo", "av-violet", "av-green", "av-zinc"];
const pickAv = (id) => {
  const n = String(id || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AV_PALETTE[n % AV_PALETTE.length];
};

// ============================================================
// PAGE
// ============================================================

export default function CallOffContext() {
  const router = useRouter();
  const { contractId } = router.query;

  const [arc, setArc] = useState(null);
  const [contracts, setContracts] = useState([]); // [{contract, consumption:[]}]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await ArcApi.getActiveSummary(contractId);
        if (cancelled) return;
        setArc(res?.data?.arc || null);
        setContracts(res?.data?.contracts || []);
      } catch (_) {
        if (!cancelled) {
          setArc(null);
          setContracts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  // Flatten all consumption lines across all vendor contracts for the "items
  // under this ARC" overview.
  const consumptionRows = useMemo(() => {
    const out = [];
    contracts.forEach(({ contract, consumption }) => {
      (consumption || []).forEach((line) => {
        out.push({ ...line, vendor_id: contract?.vendor_id, vendor_name: contract?.vendor_name, contract_id: contract?.id });
      });
    });
    return out;
  }, [contracts]);

  // Aggregate KPIs.
  const kpis = useMemo(() => {
    let committed = 0;
    let consumed = 0;
    let remaining = 0;
    consumptionRows.forEach((l) => {
      committed += Number(l.committed_qty || 0);
      consumed += Number(l.consumed_qty || 0);
      remaining += Number(l.remaining_qty || 0);
    });
    const pctUsed = committed > 0 ? Math.round((consumed / committed) * 100) : 0;
    return {
      vendorCount: contracts.length,
      lineCount: consumptionRows.length,
      committed,
      consumed,
      remaining,
      pctUsed,
    };
  }, [contracts.length, consumptionRows]);

  if (!contractId) return null;

  if (loading) {
    return (
      <div style={{ padding: 24, color: "var(--fg-3)" }}>Loading call-off context…</div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ padding: 20 }}>

      {/* ---------- Heading ---------- */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="page-eyebrow">
            <Icon.Truck />
            Call-off PO context
          </div>
          <h1 className="page-h1">Call-off PO release</h1>
          <p className="page-sub">
            Call-off POs are created <strong>automatically</strong> when a Material Requisition (MR) clears its approval chain.
            Use this page to view the contract context, remaining committed quantity, and the items that are eligible for fast-track PO release.
            To raise a new call-off, head to the{" "}
            <Link href="/dashboard/buyer/material-requisitions/create" style={{ color: "var(--primary)", fontWeight: 600 }}>
              Material Requisitions module
            </Link>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/buyer/material-requisitions/create" className="btn btn-blue btn-sm">
            <Icon.Plus />
            Raise an MR
          </Link>
          <Link href={`/dashboard/buyer/rate-contracts/${contractId}/active`} className="btn btn-ghost">
            <Icon.Back />
            Back to active contract
          </Link>
        </div>
      </div>

      {/* ---------- Info banner (Phase A read-only notice) ---------- */}
      <div className="guide info" style={{ padding: "14px 18px" }}>
        <div className="g-ic">
          <Icon.Info />
        </div>
        <div>
          <strong>Read-only view.</strong> Direct PO release from this screen is not enabled in this phase — call-off POs are dispatched
          automatically once an approved MR matches an active contract line. Approval routing, vendor selection and pricing are all derived
          from the underlying rate contract.
        </div>
      </div>

      {/* ---------- Sub-tabs decoration ---------- */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="sub-tabs">
          <button className="stab disabled" type="button" title="New RFQ flow (other path)">
            <Icon.Doc />
            New RFQ
          </button>
          <button className="stab active" type="button">
            <Icon.Check />
            Contracted Items
            <span className="nb">Fast-track</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill info">
            <span className="pdot"></span>
            <span>MR-driven · no quotes needed</span>
          </span>
        </div>
      </div>

      {/* ---------- 2-column body ---------- */}
      <div className="callof-grid">

        {/* LEFT */}
        <div className="flex flex-col gap-4">

          {/* Contract banner */}
          {arc && (
            <div className="cm-banner">
              <div className="cb-ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div className="cb-body">
                <span className="cb-tag">Active rate contract</span>
                <div className="cb-title">
                  <strong>{arc.title}</strong> — items under this contract are call-off eligible.
                </div>
                <div className="cb-meta">
                  <span>Contracted from <span className="mono">{fmtDate(arc.contract_start_at)}</span> till <span className="mono">{fmtDate(arc.contract_end_at)}</span></span>
                  <span className="sep">·</span>
                  <span>ARC #<span className="mono">{arc.arc_number}</span></span>
                  <span className="sep">·</span>
                  <span>Status: <strong style={{ textTransform: "capitalize" }}>{String(arc.status || "").replace(/_/g, " ")}</strong></span>
                </div>
              </div>
              <div className="cb-right">
                <div className="rate">{kpis.vendorCount}</div>
                <div className="label">Vendor contract{kpis.vendorCount === 1 ? "" : "s"}</div>
              </div>
            </div>
          )}

          {/* KPI row */}
          <div className="kpi-grid">
            <div className="kpi-tile">
              <div className="kt-row">
                <div className="kt-label">Total committed</div>
                <div className="kt-ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                </div>
              </div>
              <div className="kt-val mono">{fmtQty(kpis.committed)}</div>
              <div className="kt-sub">Across {kpis.lineCount} contracted line{kpis.lineCount === 1 ? "" : "s"}</div>
            </div>

            <div className="kpi-tile">
              <div className="kt-row">
                <div className="kt-label">Consumed via call-offs</div>
                <div className="kt-ic">
                  <Icon.Truck />
                </div>
              </div>
              <div className="kt-val mono">{fmtQty(kpis.consumed)}</div>
              <div className="kt-sub">{fmtPct(kpis.pctUsed)}% of total committed</div>
            </div>

            <div className="kpi-tile">
              <div className="kt-row">
                <div className="kt-label">Remaining capacity</div>
                <div className="kt-ic">
                  <Icon.Check />
                </div>
              </div>
              <div className="kt-val mono" style={{ color: kpis.remaining === 0 ? "var(--danger)" : undefined }}>{fmtQty(kpis.remaining)}</div>
              <div className="kt-sub">Available for future call-offs</div>
            </div>

            <div className="kpi-tile">
              <div className="kt-row">
                <div className="kt-label">PO total value</div>
                <div className="kt-ic">
                  <Icon.Doc />
                </div>
              </div>
              <div className="kt-val mono">N/A</div>
              <div className="kt-sub">Aggregated PO value pending PO module integration</div>
            </div>
          </div>

          {/* Items + per-vendor consumption */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h2>Contracted lines · per vendor</h2>
              </div>
              <span className="pill outline">
                <Icon.Lock />
                <span>{consumptionRows.length} line{consumptionRows.length === 1 ? "" : "s"}</span>
              </span>
            </div>
            <div className="section-body">
              {contracts.length === 0 && (
                <div className="guide warn" style={{ margin: 0 }}>
                  <div className="g-ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                    </svg>
                  </div>
                  <div>
                    No active vendor contracts found for this ARC. Once the contract is accepted by at least one vendor, call-off-eligible lines will appear here.
                  </div>
                </div>
              )}

              {contracts.map(({ contract, consumption }) => (
                <div key={contract.id} style={{ marginBottom: 18 }}>
                  <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                    <div
                      className={`sp-av ${pickAv(contract.vendor_id)}`}
                      style={{ width: 34, height: 34 }}
                    >
                      {initialsOf(contract.vendor_name || `V${contract.vendor_id}`)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>
                        {contract.vendor_name || `Vendor #${contract.vendor_id}`}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-3)" }} className="mono">
                        Contract #{contract.id} · {String(contract.status || "").replace(/_/g, " ")}
                      </div>
                    </div>
                    <span className="status active" style={{ fontSize: 10.5 }}>
                      <span className="pdot"></span>
                      <span>Call-off ready</span>
                    </span>
                  </div>

                  <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "var(--fg-4)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Item</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>Committed</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>Consumed</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>Remaining</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>% Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(consumption || []).length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "12px 8px", color: "var(--fg-4)", textAlign: "center" }}>
                            No lines on this vendor's contract.
                          </td>
                        </tr>
                      )}
                      {(consumption || []).map((line) => {
                        const pct = Number(line.pct_used || 0);
                        const depleted = Number(line.remaining_qty || 0) <= 0;
                        return (
                          <tr key={line.arc_contract_line_id} style={{ borderTop: "1px solid var(--border)" }}>
                            <td style={{ padding: "8px", fontWeight: 500, color: "var(--fg)" }}>
                              {line.variant_name || `Item #${line.arc_item_id}`}
                            </td>
                            <td style={{ padding: "8px", textAlign: "right" }} className="mono">{fmtQty(line.committed_qty)}</td>
                            <td style={{ padding: "8px", textAlign: "right" }} className="mono">{fmtQty(line.consumed_qty)}</td>
                            <td style={{ padding: "8px", textAlign: "right", color: depleted ? "var(--danger)" : (pct > 85 ? "var(--warn)" : "var(--success)"), fontWeight: 600 }} className="mono">
                              {fmtQty(line.remaining_qty)}
                            </td>
                            <td style={{ padding: "8px", textAlign: "right" }} className="mono">
                              {pct.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* Approval matrix preview (illustrative for Phase A) */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <Icon.Approval />
                </div>
                <h2>How call-off PO approval works</h2>
              </div>
              <span className="pill info">
                <span className="pdot"></span>Fast-track
              </span>
            </div>
            <div className="section-body" style={{ paddingTop: 6, paddingBottom: 14 }}>

              <div className="appr-step done">
                <div className="as-n"><Icon.Check /></div>
                <div className="as-body">
                  <div className="as-name">MR raised &amp; submitted</div>
                  <div className="as-meta">Requester picks contracted item(s) and submits the Material Requisition.</div>
                </div>
                <span className="as-stat">Initiated</span>
              </div>

              <div className="appr-step auto">
                <div className="as-n">2</div>
                <div className="as-body">
                  <div className="as-name">Department + Finance approval</div>
                  <div className="as-meta">Standard MR approval chain (per hotel configuration) — usually 4–8 hrs.</div>
                </div>
                <span className="as-stat">MR chain</span>
              </div>

              <div className="appr-step cond">
                <div className="as-n">3</div>
                <div className="as-body">
                  <div className="as-name">Elevated review (conditional)</div>
                  <div className="as-meta">Only triggered if quantity exceeds the vendor's remaining allocation — justification required.</div>
                </div>
                <span className="as-stat">If over-allocated</span>
              </div>

              <div className="appr-step done">
                <div className="as-n"><Icon.Check /></div>
                <div className="as-body">
                  <div className="as-name">Call-off PO auto-dispatched to vendor</div>
                  <div className="as-meta">Vendor + rate + terms inherited from the rate contract · GRN window opens.</div>
                </div>
                <span className="as-stat">Auto</span>
              </div>

              <div className="help-text" style={{ marginTop: 10 }}>
                Call-off approval is lighter than full RFQ awarding — only{" "}
                <strong style={{ color: "var(--fg)" }}>quantity/value gating</strong> applies.
                Vendor selection, rates, and terms were already approved as part of the rate contract.
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT (sticky aside) */}
        <aside className="aside-stack">

          {/* Contract context card */}
          {arc && (
            <div className="ctx-card">
              <div className="flex items-center justify-between gap-2">
                <span className="ct-num">#{arc.arc_number}</span>
                <span className="status active">
                  <span className="pdot"></span>
                  <span style={{ textTransform: "capitalize" }}>{String(arc.status || "").replace(/_/g, " ")}</span>
                </span>
              </div>
              <div className="ct-title">{arc.title}</div>
              <div className="ct-sub">
                <span className="mono">{fmtDate(arc.contract_start_at)}</span> → <span className="mono">{fmtDate(arc.contract_end_at)}</span>
              </div>

              <div className="stat-row">
                <div className="sb">
                  <div className="l">Vendors</div>
                  <div className="v mono">{kpis.vendorCount}</div>
                </div>
                <div className="sb">
                  <div className="l">Lines</div>
                  <div className="v mono">{kpis.lineCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Overall consumption block */}
          <div className="qty-block">
            <div className="lab">Overall remaining capacity</div>
            <div className="big mt-2">
              <span className="mono">{fmtQty(kpis.remaining)}</span>
              <span className="u"> units</span>
            </div>
            <div className="consumption-bar" style={{ marginTop: 10 }}>
              <div className="cb-track">
                <div
                  className={`cb-fill ${kpis.pctUsed >= 90 ? "warn" : ""} ${kpis.pctUsed >= 110 ? "danger" : ""}`}
                  style={{ width: `${Math.min(100, kpis.pctUsed)}%` }}
                />
              </div>
              <div className="cb-num">{fmtPct(kpis.pctUsed)}% used</div>
            </div>
            <div className="mini">
              <span>Consumed</span>
              <span className="v">
                <span className="mono">{fmtQty(kpis.consumed)}</span> / <span className="mono">{fmtQty(kpis.committed)}</span>
              </span>
            </div>
          </div>

          {/* Guardrails */}
          <div className="guide warn" style={{ padding: "11px 13px", fontSize: 11.5 }}>
            <div className="g-ic" style={{ width: 22, height: 22 }}>
              <Icon.Lock />
            </div>
            <div>
              <strong>Guardrails.</strong> If a requested quantity exceeds a vendor's remaining committed capacity,
              the call-off is routed to elevated approval. If the contract expires before approval, the PO is voided.
            </div>
          </div>

          {/* Quick links */}
          <div className="ctx-card">
            <div className="section-label" style={{ marginBottom: 8 }}>Related</div>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard/buyer/material-requisitions" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}>
                <Icon.Doc />
                View all Material Requisitions
              </Link>
              <Link href="/dashboard/buyer/material-requisitions/create" className="btn btn-blue" style={{ justifyContent: "flex-start" }}>
                <Icon.Plus />
                Raise a new MR
              </Link>
              <Link href={`/dashboard/buyer/rate-contracts/${contractId}`} className="btn btn-ghost" style={{ justifyContent: "flex-start" }}>
                <Icon.Back />
                Contract detail
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
