// Awarding stage — extracted from the old committee.js page.
//
// Two modes driven by the lifecycle stage:
//   reason === 'preview'  → commercial is partially allocated but NOT finalized
//     yet: show the award proposals shaping up, read-only, with no decide
//     controls (there is no approval instance to act on).
//   otherwise             → the real committee gate. Only the CURRENT pending
//     approver (server-computed can_user_approve) sees the decision controls;
//     everyone else gets a view-only chain showing exactly which level the
//     approval has reached and what previous approvers decided.
// Decisions go through POST /committee/:arcId/decide — the engine re-validates
// server-side regardless of what the UI shows.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import * as ArcApi from "@/services/arc_v2";
import { StageNoPermission } from "./StageShared";
import { ActorFlowCard, ApprovalDecisionCard } from "./StageAside";

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

export default function AwardingStage({ arc, stage, permissions, onRefresh }) {
  const committeePerms = permissions["arc-committee"] || [];
  const arcPerms = permissions["arc"] || [];
  const isAdmin = arcPerms.includes("admin");
  // Award summary is visible to anyone who can read the ARC; committee
  // approvers may come purely from the policy, so can_user_approve also opens
  // the stage even without a module role.
  const canRead =
    isAdmin ||
    committeePerms.includes("read") ||
    committeePerms.includes("approve") ||
    arcPerms.includes("read") ||
    !!stage?.approval?.can_user_approve;
  const isPreview = stage?.reason === "preview";

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
    const res = await ArcApi.getCommitteeView(arc.id);
    setData(res?.data || null);
  }, [arc.id]);

  useEffect(() => {
    if (!arc?.id || !canRead) { setLoading(false); return; }
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
  }, [arc?.id, canRead, load]);

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

  // Product-grouped proposals: one entry per item, the awarded vendor(s) within
  // sorted by their share (then rate). Drives the single "Award proposals"
  // surface that embeds each product's split — replacing the old flat
  // product×vendor list + separate Split-award allocation section.
  const productGroups = useMemo(() => {
    const order = (data?.items || []).map((it) => it.id);
    const groups = {};
    for (const p of proposals) (groups[p.itemId] = groups[p.itemId] || []).push(p);
    const arr = Object.entries(groups).map(([itemId, list]) => {
      const sorted = list.slice().sort((a, b) => (b.allocatedQty - a.allocatedQty) || (a.rate - b.rate));
      return {
        itemId: Number(itemId),
        proposals: sorted,
        totalQty: sorted.reduce((s, p) => s + p.allocatedQty, 0),
        totalValue: sorted.reduce((s, p) => s + (p.rate * p.allocatedQty), 0),
        vendorCount: sorted.length,
      };
    });
    arr.sort((a, b) => {
      const ia = order.indexOf(a.itemId); const ib = order.indexOf(b.itemId);
      return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
    });
    return arr;
  }, [proposals, data]);

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
  const mayAct = !!approval?.can_user_approve && isPending && !isPreview;

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
      await ArcApi.decideCommittee(arc.id, { decision, comment: comment.trim() || null });
      showToast(decision === "approve" ? "Approval recorded" : "Sent back to commercial evaluation");
      setComment("");
      setCommentError(false);
      await load();
      // Approve advances to Contract Active; send-back re-opens Commercial —
      // either way the fresh default stage is where the action landed.
      await onRefresh({ advance: true });
    } catch (e) {
      showToast(e?.response?.data?.message || e?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────
  if (!canRead) return <StageNoPermission stageLabel="Awarding" />;
  if (loading) return <AwardingSkeleton />;
  if (error) {
    return (
      <div className="guide danger">
        <div className="g-ic">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>{error}</div>
      </div>
    );
  }
  if (!data) return <div className="empty-state"><h2>No committee data</h2></div>;

  const { comm_evaluation, approval_instance } = data;
  const decided = instanceStatus === "APPROVED" || instanceStatus === "REJECTED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 94 }}>
      {/* ── STATUS BANNER — one plain-language line on where things stand ── */}
      {isPreview && (
        <div className="guide">
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <strong>Preview — committee vote hasn&apos;t started.</strong> These are the award
            proposals shaping up in Commercial. Once the commercial evaluator allocates every item
            and <strong>finalizes</strong>, the committee approval starts and decisions happen here.
          </div>
        </div>
      )}
      {!isPreview && !approval_instance && (
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
            rate contract moved to <em>{STATUS_LABEL[arc?.status] || arc?.status}</em>. This stage is
            now locked — the record below is the authoritative award trail.
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
            the reviewer&apos;s reason is recorded in the Approval progress panel.
          </div>
        </div>
      )}

      {/* ── METRICS STRIP (replaces the old page hero) ── */}
      <section className="stat-strip">
        <div className="stat-card">
          <div className="s-ic green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
          </div>
          <div><div className="s-val mono">{fmtLakhs(totalCommitted)}</div><div className="s-label">Committed value <span style={{ color: "var(--fg-4)", fontWeight: 500 }}>(excl. taxes)</span></div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
          </div>
          <div><div className="s-val mono">{(data.items || []).length}</div><div className="s-label">Items on contract</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic violet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88"/><path d="M14.47 14.48L20 20"/><path d="M8.12 8.12L12 12"/></svg>
          </div>
          <div><div className="s-val mono">{splitGroups.length}</div><div className="s-label">Items split across vendors</div></div>
        </div>
        <div className="stat-card">
          <div className="s-ic amber">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div>
            <div className="s-val">
              {isPreview ? "Preview" : approval ? (decided ? instanceStatus.toLowerCase() : `Level ${Math.min(currentStepNo, totalSteps)} of ${totalSteps}`) : "Not started"}
            </div>
            <div className="s-label">Approval progress</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="s-ic indigo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div><div className="s-val">{fmtDate(comm_evaluation?.finalized_at)}</div><div className="s-label">Finalized by commercial</div></div>
        </div>
      </section>

      {/* ── TWO-COLUMN BODY ── */}
      <div className="ccm-grid">
        {/* LEFT — proposals + supporting info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* Award proposals — grouped by product; each product's awarded
              vendor(s) and their split are embedded, so no separate
              split-allocation section is needed. */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
              Award proposals
            </h2>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, marginBottom: 12 }}>
              Grouped by product — each shows the awarded vendor(s) and their split{isPreview ? ", as currently allocated in commercial evaluation" : ", finalized in commercial evaluation"}
              {!isPreview && comm_evaluation?.finalized_at && <> on <span className="mono">{fmtDate(comm_evaluation.finalized_at)}</span></>}.
              The committee decision covers all of them together. All values are <strong>excl. taxes</strong>.
            </div>
            <div className="prop-list">
              {productGroups.length === 0 && (
                <div className="empty-state">
                  <h2>No award proposals yet</h2>
                  <p>Once the commercial evaluator saves per-item allocations{isPreview ? "" : " and finalizes"}, proposals appear here.</p>
                </div>
              )}
              {productGroups.map((g, idx) => {
                const split = g.vendorCount > 1;
                return (
                  <div key={g.itemId} className="prop-card">
                    {/* product header */}
                    <div className="prop-head">
                      <div className="prop-id">
                        <div className="prop-num">{String(idx + 1).padStart(2, "0")}</div>
                        <div className="prop-title-row">
                          <div className="ptt">{itemName(g.itemId)}</div>
                          <div className="ptm">
                            {itemSlug(g.itemId) && <span className="mono">{itemSlug(g.itemId)}</span>}
                            <span><span className="mono fw-600">{g.totalQty.toLocaleString("en-IN")}</span> {itemUom(g.itemId)} committed</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600, color: split ? "var(--primary)" : "var(--success)" }}>
                              <span style={{ width: 5, height: 5, borderRadius: 99, background: "currentColor" }} />
                              {split ? `Split across ${g.vendorCount} vendors` : "Single source"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>{fmtLakhs(g.totalValue)}</div>
                        <div style={{ fontSize: 9, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Line value · excl. taxes</div>
                      </div>
                    </div>
                    {/* per-vendor split + metrics */}
                    <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {g.proposals.map((p) => {
                        const pct = g.totalQty > 0 ? Math.round((p.allocatedQty / g.totalQty) * 100) : 0;
                        return (
                          <div key={p.vendorId} style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "10px 13px", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                                <div className="sr-av">{initials(p.vendorName)}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span>{p.vendorName}</span>
                                  <span className={`l-rank ${(p.lRank || "L1").toLowerCase()}`}>{p.lRank}</span>
                                  {p.isL1Default && <span style={{ fontSize: 10.5, color: "var(--fg-3)", fontWeight: 500 }}>lowest-rate default</span>}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto", minWidth: 170 }}>
                                <div style={{ flex: 1, height: 7, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden", minWidth: 80 }}>
                                  <div style={{ width: pct + "%", height: "100%", borderRadius: 99, background: split ? "var(--primary)" : "var(--success)" }} />
                                </div>
                                <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)", minWidth: 70, textAlign: "right" }}>{pct}% of vol</span>
                              </div>
                            </div>
                            <div className="prop-metrics" style={{ border: "none", borderTop: "1px solid var(--border)", borderRadius: 0 }}>
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
                                  <span style={{ fontFamily: "'Geist',sans-serif", fontWeight: 500, fontSize: 11, color: "var(--fg-3)" }}>{itemUom(g.itemId)}</span>
                                </div>
                              </div>
                              <div className="pm-cell">
                                <div className="pm-k">Lead time</div>
                                <div className="pm-v sub">{p.leadTime == null ? "—" : `${p.leadTime} d`}</div>
                              </div>
                              <div className="pm-cell">
                                <div className="pm-k">Line value</div>
                                <div className="pm-v success">{fmtLakhs(p.rate * p.allocatedQty)}</div>
                              </div>
                              <div className="pm-cell">
                                <div className="pm-k">Share of ARC</div>
                                <div className="pm-v sub">{totalCommitted ? Math.round(((p.rate * p.allocatedQty) / totalCommitted) * 100) + "%" : "—"}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
                    <div className="h-sub">What each vendor walks away with {isPreview ? "as allocated so far" : "if you approve"}</div>
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
          <ActorFlowCard stage={stage} />
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div>
                  <h2>Approval progress</h2>
                  <div className="h-sub">
                    {isPreview
                      ? "Starts when commercial is finalized"
                      : approval
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
                  {isPreview
                    ? "The committee approval chain spawns when the commercial evaluator finalizes. Until then this stage is a read-only preview."
                    : "No approval instance found. Configure the ARC_COMMITTEE policy and re-finalize commercial evaluation to spawn one."}
                </div>
              )}

              {mayAct && (
                <ApprovalDecisionCard
                  stepLabel={stage?.actors?.approver?.step_label}
                  approvers={stage?.actors?.approver?.people}
                  comment={comment}
                  setComment={(v) => { setComment(v); if (commentError && v.trim()) setCommentError(false); }}
                  commentError={commentError}
                  onApprove={() => decide("approve")}
                  onReject={() => decide("reject")}
                  busy={busy}
                  approveLabel="Approve award proposals"
                  rejectLabel="Send back"
                />
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
              {isPreview
                ? <>Preview — <strong>{proposals.length}</strong> proposal(s) shaping up. Finalize in Commercial to start the committee vote.</>
                : !approval_instance
                ? "Committee approval not started."
                : decided
                ? <>Committee decision: <strong>{instanceStatus === "APPROVED" ? "approved" : "sent back"}</strong>.</>
                : mayAct
                ? <>Level <strong>{currentStepNo} of {totalSteps}</strong> — your decision is pending.</>
                : <>Level <strong>{Math.min(currentStepNo, totalSteps)} of {totalSteps}</strong>{waitingOnNames.length ? <> — waiting on <strong>{waitingOnNames.join(", ")}</strong></> : null}.</>}
            </span>
          </div>
          <div className="right">
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — shape-aware: banner, proposal cards + sticky aside.
// ──────────────────────────────────────────────────────────────────────────
const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function AwardingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
        <Sk w={44} h={44} r={11} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Sk w="45%" h={15} style={{ marginBottom: 7 }} />
          <Sk w="70%" h={11} />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="arc-sk-tile" style={{ padding: 14 }}>
            <Sk w="60%" h={16} style={{ marginBottom: 8 }} />
            <Sk w="80%" h={10} />
          </div>
        ))}
      </div>

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
    </div>
  );
}
