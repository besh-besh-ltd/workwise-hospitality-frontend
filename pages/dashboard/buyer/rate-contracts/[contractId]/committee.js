import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

// ─────────────────────────────────────────────────────────────────────────────
// ARC v2 — Committee Approval (buyer)
//
// Ported from prototypes/arc_ui/buyer-committee.html, wired to the central
// approval engine. The page is strictly gated: only the CURRENT pending
// approver (server-computed `can_user_approve`) sees the decision controls;
// everyone else gets a view-only page that shows exactly which level the
// approval has reached and what every previous approver decided, with their
// comments. Decisions go through POST /committee/:arcId/decide, which the
// engine re-validates server-side regardless of what the UI shows.
// ─────────────────────────────────────────────────────────────────────────────

function fmtINR(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}
function fmtLakhs(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  return "₹" + v.toLocaleString("en-IN");
}
function initials(name) {
  if (!name) return "··";
  return String(name).trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL = {
  committee_review: "Committee review",
  committee_approved: "Committee approved",
  committee_sent_back: "Sent back",
  awaiting_vendor_acceptance: "Awaiting vendor acceptance",
  contract_active: "Contract active",
};

export default function CommitteePage() {
  const router = useRouter();
  const { contractId } = router.query;

  const userProfile = useSelector((s) => s.userProfile);
  const me = Number(userProfile?.id) || null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const res = await ArcApi.getCommitteeView(contractId);
    setData(res?.data || null);
  }, [contractId]);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || "Failed to load committee view");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contractId, load]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(""), 2600);
  };

  // ── derived: proposals from awards ─────────────────────────────────────
  const proposals = useMemo(() => {
    if (!data) return [];
    return (data.awards || []).map((a) => {
      const snap = a.awarded_quote_snapshot || {};
      return {
        key: `${a.arc_item_id}.${a.awarded_vendor_id}`,
        itemId: a.arc_item_id,
        vendorId: a.awarded_vendor_id,
        vendorName: a.vendor_name || `Vendor ${a.awarded_vendor_id}`,
        lRank: a.l_rank || "L1",
        rate: Number(snap.rate ?? 0),
        gstPct: snap.gst_pct ?? null,
        leadTime: snap.lead_time_days ?? null,
        allocatedQty: Number(a.allocated_qty ?? 0),
        isL1Default: !!a.is_l1_default,
      };
    });
  }, [data]);

  const itemTotals = useMemo(() => {
    const m = {};
    for (const p of proposals) m[p.itemId] = (m[p.itemId] || 0) + p.allocatedQty;
    return m;
  }, [proposals]);

  const splitGroups = useMemo(() => {
    const groups = {};
    for (const p of proposals) (groups[p.itemId] = groups[p.itemId] || []).push(p);
    return Object.entries(groups)
      .filter(([, arr]) => arr.length > 1)
      .map(([itemId, arr]) => ({
        itemId: Number(itemId),
        proposals: arr.slice().sort((a, b) => a.rate - b.rate),
      }));
  }, [proposals]);

  const itemById = useMemo(() => {
    const m = {};
    for (const it of data?.items || []) m[it.id] = it;
    return m;
  }, [data]);
  const itemName = (id) => itemById[id]?.variant_name || `Item #${id}`;
  const itemUom  = (id) => itemById[id]?.uom || "";
  const itemSlug = (id) => itemById[id]?.variant_slug || "";

  const lineValue = (p) => p.rate * p.allocatedQty;
  const totalCommitted = useMemo(() => proposals.reduce((s, p) => s + lineValue(p), 0), [proposals]);

  const vendorAwards = useMemo(() => {
    const seen = new Map();
    for (const p of proposals) {
      const cur = seen.get(p.vendorId) || { vendorId: p.vendorId, vendorName: p.vendorName, items: 0, value: 0 };
      cur.items += 1;
      cur.value += lineValue(p);
      seen.set(p.vendorId, cur);
    }
    return Array.from(seen.values()).sort((a, b) => b.value - a.value);
  }, [proposals]);

  // ── approval chain (engine truth) ──────────────────────────────────────
  const approval = data?.approval || null;
  const steps = approval?.steps || [];
  const instanceStatus = approval?.status || data?.approval_instance?.status || null;
  const isPending = instanceStatus === "PENDING";
  const currentStepNo = Number(approval?.current_step) || 1;
  const totalSteps = Number(approval?.total_steps) || steps.length;
  // Strict gate: server-computed for the logged-in caller. The engine
  // re-checks on POST anyway — this only controls what the UI offers.
  const mayAct = !!approval?.can_user_approve && isPending;

  const currentStep = steps.find((s) => Number(s.step_order) === currentStepNo) || null;
  const waitingOnNames = (currentStep?.approvers || [])
    .filter((a) => a.status === "PENDING")
    .map((a) => a.user_name)
    .filter(Boolean);

  const doneSteps = steps.filter((s) => s.status === "APPROVED").length;

  // ── decision action ─────────────────────────────────────────────────────
  async function decide(decision) {
    if (decision === "reject" && !comment.trim()) {
      setCommentError(true);
      showToast("Add a reason before sending back");
      return;
    }
    setBusy(true);
    try {
      await ArcApi.decideCommittee(contractId, { decision, comment: comment.trim() || null });
      showToast(decision === "approve" ? "Approval recorded" : "Sent back to commercial evaluation");
      setComment("");
      setCommentError(false);
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────
  if (loading) return <CommitteeSkeleton />;
  if (error) {
    return (
      <main className="main-body">
        <div className="guide danger">
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>{error}</div>
        </div>
      </main>
    );
  }
  if (!data) return <main className="main-body"><div className="empty-state"><h2>No committee data</h2></div></main>;

  const { arc, comm_evaluation, approval_instance } = data;
  const statusLabel = STATUS_LABEL[arc?.status] || arc?.status || "Committee review";
  const decided = instanceStatus === "APPROVED" || instanceStatus === "REJECTED";

  return (
    <main className="main-body" style={{ paddingBottom: 108 }}>
      {/* ── HERO ── */}
      <section className="arc-hero">
        <div className="top">
          <div>
            <div className="eyebrow">Committee review · final approval gate</div>
            <h1>
              <span>{arc?.title || "Rate contract"}</span>
              {arc?.arc_number && <span className="num">#{arc.arc_number}</span>}
              <span className={`status-chip ${instanceStatus === "APPROVED" ? "active" : instanceStatus === "REJECTED" ? "expiring" : "committee"}`}>{statusLabel}</span>
            </h1>
            <div className="sub">
              {arc?.category_title && (<><span className="em">{arc.category_title}</span><span className="sep">·</span></>)}
              {arc?.hotel_name && (<><span>{arc.hotel_name}</span><span className="sep">·</span></>)}
              {arc?.department_title && (<><span>{arc.department_title}</span><span className="sep">·</span></>)}
              <span><span className="em">{proposals.length}</span> proposals · <span className="em">{vendorAwards.length}</span> vendor(s)</span>
            </div>
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell">
            <div className="k">Committed value</div>
            <div className="v"><span className="em mono">{fmtLakhs(totalCommitted)}</span></div>
          </div>
          <div className="cell">
            <div className="k">Items</div>
            <div className="v"><span className="em mono">{(data.items || []).length}</span> on contract</div>
          </div>
          <div className="cell">
            <div className="k">Split awards</div>
            <div className="v"><span className="em mono">{splitGroups.length}</span> item(s) split across vendors</div>
          </div>
          <div className="cell">
            <div className="k">Approval progress</div>
            <div className="v">
              {approval
                ? <span className="em">{decided ? instanceStatus.toLowerCase() : `Level ${Math.min(currentStepNo, totalSteps)} of ${totalSteps}`}</span>
                : <span>No instance</span>}
            </div>
          </div>
          <div className="cell">
            <div className="k">Finalized by commercial</div>
            <div className="v mono">{fmtDate(comm_evaluation?.finalized_at)}</div>
          </div>
        </div>
      </section>

      {/* ── STATUS BANNER — one plain-language line on where things stand ── */}
      {!approval_instance && (
        <div className="guide warn">
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <strong>No committee approval instance yet.</strong> Configure an ARC_COMMITTEE
            approval policy for this hotel/process and re-finalize commercial evaluation to start the vote.
          </div>
        </div>
      )}
      {approval_instance && isPending && mayAct && (
        <section className="action-center">
          <div className="ac-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9l-4 4"/><path d="M5 14l5-5"/><path d="M15 4l5 5"/><path d="M11 19l8-8"/><path d="M3 21h6"/></svg>
          </div>
          <div className="ac-body">
            <div className="ac-title">Your decision is required — approval level {currentStepNo} of {totalSteps}</div>
            <div className="ac-sub">
              Review the <strong>{proposals.length}</strong> award proposal(s) below, then approve or send back with a reason.
              Approving the final level generates the vendor contracts automatically.
            </div>
          </div>
        </section>
      )}
      {approval_instance && isPending && !mayAct && (
        <div className="guide" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <div>
            <strong>View only.</strong> This approval is at level{" "}
            <strong>{Math.min(currentStepNo, totalSteps)} of {totalSteps}</strong>
            {waitingOnNames.length > 0 && <> — waiting on <strong>{waitingOnNames.join(", ")}</strong></>}.
            You are not the current approver; earlier decisions and remarks are in the Approval progress panel.
          </div>
        </div>
      )}
      {instanceStatus === "APPROVED" && (
        <div className="guide success" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <strong>Committee approved.</strong> Contracts were generated per awarded vendor and the
            rate contract moved to <em>{STATUS_LABEL[arc?.status] || arc?.status}</em>.
          </div>
        </div>
      )}
      {instanceStatus === "REJECTED" && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </div>
          <div>
            <strong>Sent back to commercial evaluation.</strong> The committee declined this proposal —
            the reviewer's reason is recorded in the Approval progress panel.
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN BODY ── */}
      <div className="ccm-grid">
        {/* LEFT — proposals + supporting info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* Split allocation — read-only, locked in commercial evaluation */}
          {splitGroups.length > 0 && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
                  Split-award allocation
                </h2>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
                  Locked during commercial evaluation. If the split looks wrong, <strong>send back</strong> —
                  the commercial evaluator re-balances and resubmits.
                </div>
              </div>
              {splitGroups.map((group) => (
                <div key={group.itemId} className="split-card">
                  <div className="split-head">
                    <div>
                      <div className="sh-eyebrow">Allocation balanced · 100%</div>
                      <div className="sh-title">{itemName(group.itemId)}</div>
                      <div className="sh-sub">
                        Total committed:{" "}
                        <strong className="mono">{(itemTotals[group.itemId] || 0).toLocaleString("en-IN")}</strong> {itemUom(group.itemId)}
                        {" · split across "}<strong>{group.proposals.length}</strong> vendors
                      </div>
                    </div>
                    <div className="sh-total">Total <span className="v">100%</span></div>
                  </div>
                  <div className="split-rows">
                    {group.proposals.map((p) => {
                      const tot = itemTotals[group.itemId] || 0;
                      const pct = tot > 0 ? Math.round((p.allocatedQty / tot) * 100) : 0;
                      return (
                        <div key={p.vendorId} className="split-row">
                          <div className="sr-vendor">
                            <div className="sr-av">{initials(p.vendorName)}</div>
                            <div className="sr-meta">
                              <div className="sr-name">
                                <span>{p.vendorName}</span>
                                <span className={`l-rank ${(p.lRank || "L1").toLowerCase()}`}>{p.lRank}</span>
                              </div>
                              <div className="sr-stats">
                                <span>{fmtINR(p.rate)}/{itemUom(group.itemId)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="sr-rate">{fmtLakhs(lineValue(p))}</div>
                          <div className="sr-share">
                            <div className="track"><div className="fill" style={{ width: pct + "%" }} /></div>
                            <span className="pct">{pct}%</span>
                          </div>
                          <div className="sr-qty">
                            <span className="lbl">Committed qty</span>
                            {p.allocatedQty.toLocaleString("en-IN")} {itemUom(group.itemId)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Award proposals */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
              Award proposals
            </h2>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, marginBottom: 12 }}>
              One per product × vendor, finalized in commercial evaluation
              {comm_evaluation?.finalized_at && <> on <span className="mono">{fmtDate(comm_evaluation.finalized_at)}</span></>}.
              The committee decision covers all of them together.
            </div>
            <div className="prop-list">
              {proposals.length === 0 && (
                <div className="empty-state">
                  <h2>No award proposals yet</h2>
                  <p>Once the commercial evaluator saves per-item allocations and finalizes, proposals appear here.</p>
                </div>
              )}
              {proposals.map((p, idx) => (
                <div key={p.key} className="prop-card">
                  <div className="prop-head">
                    <div className="prop-id">
                      <div className="prop-num">{String(idx + 1).padStart(2, "0")}</div>
                      <div className="prop-title-row">
                        <div className="ptt">
                          <span>{itemName(p.itemId)}</span>
                          <span style={{ color: "var(--fg-3)", fontWeight: 450, margin: "0 6px" }}>·</span>
                          <span>{p.vendorName}</span>
                        </div>
                        <div className="ptm">
                          {itemSlug(p.itemId) && <span className="mono">{itemSlug(p.itemId)}</span>}
                          <span className={`l-rank ${(p.lRank || "L1").toLowerCase()}`}>{p.lRank}</span>
                          {p.isL1Default && <span>lowest-rate default</span>}
                          {itemTotals[p.itemId] > 0 && (
                            <span>
                              <span className="mono fw-600">{Math.round((p.allocatedQty / itemTotals[p.itemId]) * 100)}%</span> of item volume
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="prop-body">
                    <div className="prop-metrics">
                      <div className="pm-cell">
                        <div className="pm-k">Rate</div>
                        <div className="pm-v">{fmtINR(p.rate)}</div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">GST</div>
                        <div className="pm-v sub">{p.gstPct == null ? "—" : `${p.gstPct}%`}</div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">Committed qty</div>
                        <div className="pm-v">
                          {p.allocatedQty.toLocaleString("en-IN")}{" "}
                          <span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, fontSize: 11, color: "var(--fg-3)" }}>{itemUom(p.itemId)}</span>
                        </div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">Lead time</div>
                        <div className="pm-v sub">{p.leadTime == null ? "—" : `${p.leadTime} d`}</div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">Line value</div>
                        <div className="pm-v success">{fmtLakhs(lineValue(p))}</div>
                      </div>
                      <div className="pm-cell">
                        <div className="pm-k">Share of total</div>
                        <div className="pm-v sub">{totalCommitted ? Math.round((lineValue(p) / totalCommitted) * 100) + "%" : "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Awarded vendors rollup */}
          {vendorAwards.length > 0 && (
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  </div>
                  <div>
                    <h2>Awarded vendors</h2>
                    <div className="h-sub">What each vendor walks away with if you approve</div>
                  </div>
                </div>
              </div>
              <div className="section-body">
                {vendorAwards.map((va) => (
                  <div className="vp-card" key={va.vendorId}>
                    <div className="vp-head">
                      <div className="vp-av">{initials(va.vendorName)}</div>
                      <div className="vp-meta">
                        <div className="vp-name">{va.vendorName}</div>
                        <div className="vp-sub">Gets their own contract to countersign on approval</div>
                      </div>
                    </div>
                    <div className="vp-kpis">
                      <div className="kp-cell">
                        <div className="kp-k">Items awarded</div>
                        <div className="kp-v">{va.items}</div>
                      </div>
                      <div className="kp-cell">
                        <div className="kp-k">Awarded value</div>
                        <div className="kp-v">{fmtLakhs(va.value)}</div>
                      </div>
                      <div className="kp-cell">
                        <div className="kp-k">Share of ARC</div>
                        <div className="kp-v">{totalCommitted ? Math.round((va.value / totalCommitted) * 100) + "%" : "—"}</div>
                      </div>
                      <div className="kp-cell">
                        <div className="kp-k">Best rank</div>
                        <div className="kp-v">{proposals.filter((p) => p.vendorId === va.vendorId).map((p) => p.lRank).sort()[0] || "—"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — approval progress + decision */}
        <aside className="ccm-aside">
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div>
                  <h2>Approval progress</h2>
                  <div className="h-sub">
                    {approval
                      ? decided
                        ? `Concluded · ${instanceStatus.toLowerCase()}`
                        : `Level ${Math.min(currentStepNo, totalSteps)} of ${totalSteps} in review`
                      : "No instance"}
                  </div>
                </div>
              </div>
            </div>
            <div className="section-body">
              {approval ? (
                <>
                  {/* step progress bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div className="vp-bar">
                      {instanceStatus === "REJECTED" ? (
                        <div className="seg-r" style={{ width: "100%" }} />
                      ) : (
                        <>
                          <div className="seg-a" style={{ width: `${(doneSteps / Math.max(totalSteps, 1)) * 100}%` }} />
                          {isPending && <div className="seg-s" style={{ width: `${(1 / Math.max(totalSteps, 1)) * 100}%` }} />}
                        </>
                      )}
                    </div>
                  </div>

                  {steps.map((step) => {
                    const isCurrent = isPending && Number(step.step_order) === currentStepNo;
                    return (
                      <div key={step.step_order}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 2px" }}>
                          <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: isCurrent ? "var(--warn)" : "var(--fg-4)", fontWeight: 700 }}>
                            Level {step.step_order}
                            {step.decision_rule ? (step.decision_rule === "ALL" ? " · all must approve" : " · any one approves") : ""}
                          </span>
                          <span className={`status-pill ${step.status === "APPROVED" ? "success" : step.status === "REJECTED" ? "danger" : isCurrent ? "warn" : "neutral"}`} style={{ fontSize: 9.5 }}>
                            <span className="dot" />
                            {step.status === "APPROVED" ? "cleared" : step.status === "REJECTED" ? "sent back" : isCurrent ? "reviewing now" : "waiting"}
                          </span>
                        </div>
                        {(step.approvers || []).map((ap) => (
                          <div key={ap.user_id} className={`mem-row${isCurrent && ap.status === "PENDING" ? " is-current" : ""}`}>
                            <div className="mr-av">{initials(ap.user_name)}</div>
                            <div className="mr-meta">
                              <div className="mr-name">
                                {ap.user_name}
                                {Number(ap.user_id) === me && <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--warn)" }}>· You</span>}
                              </div>
                              <div className="mr-role">{ap.user_designation || ap.user_department || "Committee member"}</div>
                              {ap.comment && <div className="mr-comment">{ap.comment}</div>}
                            </div>
                            <div className="mr-status">
                              <span className={`status-pill ${ap.status === "APPROVED" ? "success" : ap.status === "REJECTED" ? "danger" : "neutral"}`} style={{ fontSize: 9.5 }}>
                                <span className="dot" />
                                {ap.status === "APPROVED" ? "approved" : ap.status === "REJECTED" ? "sent back" : "pending"}
                              </span>
                              {ap.acted_at && <span className="mr-time">{fmtDate(ap.acted_at)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "6px 0" }}>
                  No approval instance found. Configure the ARC_COMMITTEE policy and re-finalize commercial evaluation to spawn one.
                </div>
              )}

              {/* Decision box — ONLY for the current approver */}
              {mayAct && (
                <div className="you-row">
                  <div className="here-now">Your decision</div>
                  <div style={{ marginTop: 11 }}>
                    <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)", fontWeight: 600 }}>
                      Comment
                      <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid rgba(185,28,28,0.24)" }}>
                        required to send back
                      </span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => { setComment(e.target.value); if (commentError && e.target.value.trim()) setCommentError(false); }}
                      placeholder="e.g. 'Confirmed against FY26 budget envelope.'"
                      style={{
                        marginTop: 5, width: "100%", minHeight: 54, padding: "8px 11px",
                        border: `1px solid ${commentError ? "var(--danger)" : "var(--border-input)"}`,
                        boxShadow: commentError ? "0 0 0 3px rgba(185,28,28,0.14)" : "none",
                        borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "white", resize: "vertical",
                      }}
                    />
                    {commentError && (
                      <div style={{ marginTop: 5, fontSize: 11.5, color: "var(--danger)", fontWeight: 600 }}>
                        Add a reason before sending back.
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 11, display: "flex", flexDirection: "column", gap: 7 }}>
                    <button type="button" className="btn btn-success" disabled={busy} onClick={() => decide("approve")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{" "}
                      {busy ? "Submitting…" : "Approve award proposals"}
                    </button>
                    <button type="button" className="btn btn-warn" disabled={busy} onClick={() => decide("reject")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>{" "}
                      Send back to commercial eval
                    </button>
                  </div>
                  <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px dashed var(--border)", fontSize: 11, color: "var(--fg-3)", lineHeight: 1.5 }}>
                    Approving the final level auto-generates one contract per awarded vendor and moves the
                    ARC to <em>awaiting vendor acceptance</em>. Sending back re-opens commercial evaluation.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workflow context */}
          <div className="workflow">
            <div className="wf-head">
              <div className="t">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>{" "}
                Where this sits
              </div>
            </div>
            <div className={`wf-step ${comm_evaluation?.status === "finalized" ? "done" : "current"}`}>
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Commercial evaluation finalized</div>
                <div className="meta">Allocations locked per item × vendor</div>
              </div>
            </div>
            <div className={`wf-step ${instanceStatus === "APPROVED" ? "done" : instanceStatus === "REJECTED" ? "rejected" : approval_instance ? "current" : "pending"}`}>
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Committee approval</div>
                <div className="meta">
                  {approval ? (decided ? `Concluded ${fmtDate(approval.completed_at)}` : `Level ${Math.min(currentStepNo, totalSteps)} of ${totalSteps}`) : "Not started"}
                </div>
              </div>
            </div>
            <div className={`wf-step ${["awaiting_vendor_acceptance", "contract_active"].includes(arc?.status) ? "done" : "pending"}`}>
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Contracts generated &amp; sent to vendors</div>
                <div className="meta">One per awarded vendor · OTP signature</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div className="arc-toast">
          <span className="t-ic">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* STICKY ACTION DOCK */}
      <div className="action-dock">
        <div className="inner">
          <div className="left">
            <span className="fs-13 text-fg-2">
              {!approval_instance
                ? "Committee approval not started."
                : decided
                ? <>Committee decision: <strong>{instanceStatus === "APPROVED" ? "approved" : "sent back"}</strong>.</>
                : mayAct
                ? <>Level <strong>{currentStepNo} of {totalSteps}</strong> — your decision is pending.</>
                : <>Level <strong>{Math.min(currentStepNo, totalSteps)} of {totalSteps}</strong>{waitingOnNames.length ? <> — waiting on <strong>{waitingOnNames.join(", ")}</strong></> : null}.</>}
            </span>
          </div>
          <div className="right">
            <Link href="/dashboard/buyer/rate-contracts/all" className="btn btn-ghost btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>{" "}
              Back to contracts
            </Link>
            {mayAct && (
              <>
                <button className="btn btn-warn btn-sm" type="button" disabled={busy} onClick={() => decide("reject")}>
                  Send back
                </button>
                <button className="btn btn-success" type="button" disabled={busy} onClick={() => decide("approve")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{" "}
                  {busy ? "Submitting…" : "Approve"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — shape-aware: dark hero, banner, proposal cards + sticky aside.
// ──────────────────────────────────────────────────────────────────────────
const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function CommitteeSkeleton() {
  return (
    <main className="main-body">
      <section className="arc-sk-hero">
        <Sk w={210} h={11} style={{ marginBottom: 12 }} />
        <Sk w="50%" h={24} style={{ marginBottom: 10 }} />
        <Sk w="64%" h={12} style={{ marginBottom: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <Sk w="70%" h={9} style={{ marginBottom: 7 }} />
              <Sk w="85%" h={14} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
        <Sk w={44} h={44} r={11} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Sk w="45%" h={15} style={{ marginBottom: 7 }} />
          <Sk w="70%" h={11} />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 18, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="arc-sk-tile">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Sk w={30} h={24} r={6} />
                <Sk w="48%" h={15} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
                {Array.from({ length: 6 }).map((__, c) => (
                  <div key={c}>
                    <Sk w="70%" h={9} style={{ marginBottom: 6 }} />
                    <Sk w="85%" h={13} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="arc-sk-tile">
            <Sk w={150} h={14} style={{ marginBottom: 14 }} />
            <Sk w="100%" h={8} r={99} style={{ marginBottom: 14 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: i < 2 ? "1px dashed var(--border)" : "none" }}>
                <Sk w={30} h={30} r={8} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Sk w="60%" h={13} style={{ marginBottom: 6 }} />
                  <Sk w="40%" h={10} />
                </div>
                <Sk w={66} h={20} r={99} />
              </div>
            ))}
          </div>
          <div className="arc-sk-tile">
            <Sk w={120} h={14} style={{ marginBottom: 14 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 11, padding: "10px 0" }}>
                <Sk w={24} h={24} r={99} style={{ flexShrink: 0 }} />
                <Sk w="70%" h={12} style={{ flex: 1 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
