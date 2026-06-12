// Technical Evaluation stage — extracted from the old tech-eval.js page and
// extended with the lifecycle permission model:
//   no arc-tech read/evaluate → StageNoPermission
//   arc-tech.read            → view-only matrix (clauses, responses, marks, verdicts)
//   arc-tech.evaluate        → + scoring inputs and submit-for-approval
//   approval.can_user_approve → + approve / reject / AMEND bar (amend = edit
//     any marks inline; diffs ride the approve call and land in the edit
//     history + the engine comment)
// Once the stage is COMPLETE (ARC_TECH approved) everything renders read-only.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as ArcApi from "@/services/arc_v2";
import { StageNoPermission, StageReadOnlyBanner, StageSkeleton } from "./StageShared";

const Icon = ({ sw = 2, children }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const InfoIcon = () => (<Icon><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></Icon>);
const CheckCircleIcon = () => (<Icon><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></Icon>);
const WarnTriIcon = () => (<Icon><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>);
const ArrowRightIcon = () => (<Icon sw={2.2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>);
const PenIcon = () => (<Icon><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></Icon>);

const AV_CLASSES = ["av-1", "av-2", "av-3", "av-4", "av-5", "av-6"];
const vendorAvClass = (vendorId) => AV_CLASSES[Math.abs(Number(vendorId) || 0) % AV_CLASSES.length];
const vendorInitials = (name) => {
  if (!name) return "VN";
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0] || "").charAt(0) + (parts[1] || "").charAt(0)).toUpperCase() || name.slice(0, 2).toUpperCase();
};
const vendorShort = (name) => {
  if (!name) return "Vendor";
  const t = String(name).trim();
  return t.length > 12 ? t.slice(0, 12) + "…" : t;
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const clauseWeight = (cl) => Number(cl.weightage ?? cl.weight ?? 0);

export default function TechnicalStage({ arc, stage, permissions, onRefresh }) {
  const techPerms = permissions["arc-tech"] || [];
  const isAdmin = (permissions["arc"] || []).includes("admin");
  const canRead = isAdmin || techPerms.includes("read") || techPerms.includes("evaluate");
  const canEvaluate = isAdmin || techPerms.includes("evaluate");
  const approval = stage?.approval || null;
  const canApprove = !!approval?.can_user_approve && approval?.status === "PENDING";
  const isComplete = stage?.state === "complete";
  const isSkipped = stage?.state === "skipped";
  // Inputs editable: evaluators while not complete; approvers in amend mode.
  const [amendMode, setAmendMode] = useState(false);
  const editable = !isComplete && (canEvaluate || (canApprove && amendMode));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState(null);
  const [evalByItem, setEvalByItem] = useState({});
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  // Approval panel data (chain with names — buyer side) + edit history.
  const [approvalDetail, setApprovalDetail] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  // Approver amendments staged per response_id: { [id]: {buyer_marks, buyer_remark} }
  const [amends, setAmends] = useState({});
  const [decideComment, setDecideComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [decideBusy, setDecideBusy] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const loadEvals = useCallback(async (itemList) => {
    const next = {};
    await Promise.all(itemList.map(async (it) => {
      try {
        const res = await ArcApi.getTechEvalForItem(it.id);
        const d = res?.data || res || {};
        next[it.id] = {
          tech_evaluation: d.tech_evaluation || null,
          clauses: d.clauses || [],
          responses: d.responses || [],
        };
      } catch (e) {
        next[it.id] = { tech_evaluation: null, clauses: [], responses: [] };
      }
    }));
    setEvalByItem(next);
    // Hydrate staged marks/remarks from server rows.
    const m = {}, r = {};
    for (const it of itemList) {
      for (const resp of next[it.id]?.responses || []) {
        const k = `${it.id}|${resp.vendor_id}|${resp.clause_id}`;
        if (resp.buyer_marks != null) m[k] = Number(resp.buyer_marks);
        if (resp.buyer_remark != null) r[k] = resp.buyer_remark;
      }
    }
    setMarks(m);
    setRemarks(r);
  }, []);

  useEffect(() => {
    if (!arc?.id || !canRead) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ArcApi.getContractDetail(arc.id);
        if (cancelled) return;
        const d = res?.data || res || {};
        const list = d.items || [];
        setItems(list);
        setActiveItemId((prev) => prev || list[0]?.id || null);
        await loadEvals(list);
        if (stage?.approval?.instance_id) {
          const ap = await ArcApi.getTechEvalApproval(arc.id).catch(() => null);
          if (!cancelled && ap) {
            setApprovalDetail(ap?.data?.approval || null);
            setEditHistory(ap?.data?.edit_history || []);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arc?.id, canRead, stage?.approval?.instance_id]);

  // ── matrix derivations ─────────────────────────────────────────────────
  const activeItem = useMemo(() => items.find((it) => it.id === activeItemId) || items[0] || null, [items, activeItemId]);
  const activeBlock = activeItem ? evalByItem[activeItem.id] : null;

  const activeVendors = useMemo(() => {
    if (!activeBlock) return [];
    const seen = new Map();
    for (const r of activeBlock.responses || []) {
      const vid = Number(r.vendor_id);
      if (!seen.has(vid)) seen.set(vid, { vendor_id: vid, vendor_name: r.vendor_name || `Vendor #${vid}` });
    }
    return [...seen.values()];
  }, [activeBlock]);

  const responseFor = useCallback((vendorId, clauseId) => {
    if (!activeBlock) return null;
    return (activeBlock.responses || []).find(
      (r) => Number(r.vendor_id) === Number(vendorId) && Number(r.clause_id) === Number(clauseId)
    ) || null;
  }, [activeBlock]);

  const keyFor = (itemId, vendorId, clauseId) => `${itemId}|${vendorId}|${clauseId}`;
  const getMark = useCallback((itemId, vendorId, clauseId) => {
    const k = keyFor(itemId, vendorId, clauseId);
    return k in marks ? marks[k] : null;
  }, [marks]);

  const vendorMaxMarks = useCallback((itemId) => {
    const block = evalByItem[itemId];
    const sum = (block?.clauses || []).reduce((s, cl) => s + clauseWeight(cl), 0);
    return sum || 100;
  }, [evalByItem]);
  const vendorTotal = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    return (block?.clauses || []).reduce((sum, cl) => {
      const m = getMark(itemId, vendorId, cl.id);
      return sum + (m == null ? 0 : Number(m));
    }, 0);
  }, [evalByItem, getMark]);
  const vendorScore = useCallback((itemId, vendorId) => {
    const max = vendorMaxMarks(itemId);
    return max ? Math.round((vendorTotal(itemId, vendorId) / max) * 100) : 0;
  }, [vendorTotal, vendorMaxMarks]);
  const vendorEvaluatedCount = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    return (block?.clauses || []).filter((cl) => getMark(itemId, vendorId, cl.id) != null).length;
  }, [evalByItem, getMark]);
  const vendorFullyEvaluated = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    return vendorEvaluatedCount(itemId, vendorId) === (block?.clauses || []).length;
  }, [evalByItem, vendorEvaluatedCount]);
  const minPassFor = useCallback((itemId) => evalByItem[itemId]?.tech_evaluation?.minimum_passing_score ?? 60, [evalByItem]);
  const vendorQualified = useCallback((itemId, vendorId) => vendorScore(itemId, vendorId) >= Number(minPassFor(itemId)), [vendorScore, minPassFor]);
  const vendorVerdictClass = useCallback((itemId, vendorId) => {
    if (!vendorFullyEvaluated(itemId, vendorId)) return "pending";
    return vendorQualified(itemId, vendorId) ? "pass" : "fail";
  }, [vendorFullyEvaluated, vendorQualified]);
  const vendorsRespondingFor = useCallback((itemId) => {
    const set = new Set((evalByItem[itemId]?.responses || []).map((r) => Number(r.vendor_id)));
    return [...set];
  }, [evalByItem]);
  const itemTabState = useCallback((itemId) => {
    const vendors = vendorsRespondingFor(itemId);
    if (vendors.length === 0) return "pending";
    return vendors.every((vid) => vendorFullyEvaluated(itemId, vid)) ? "done" : "pending";
  }, [vendorsRespondingFor, vendorFullyEvaluated]);

  const progress = useMemo(() => {
    let total = 0, done = 0;
    for (const it of items) {
      const block = evalByItem[it.id];
      if (!block) continue;
      const vendors = vendorsRespondingFor(it.id);
      total += vendors.length * (block.clauses || []).length;
      done += vendors.reduce((sum, vid) => sum + vendorEvaluatedCount(it.id, vid), 0);
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [items, evalByItem, vendorsRespondingFor, vendorEvaluatedCount]);

  const qualifiedTally = useMemo(() => {
    let q = 0, dq = 0, pending = 0;
    for (const it of items) {
      for (const vid of vendorsRespondingFor(it.id)) {
        const verdict = vendorVerdictClass(it.id, vid);
        if (verdict === "pass") q++;
        else if (verdict === "fail") dq++;
        else pending++;
      }
    }
    return { q, dq, pending };
  }, [items, vendorsRespondingFor, vendorVerdictClass]);

  // ── input handlers ─────────────────────────────────────────────────────
  const setMarkLocal = (itemId, vendorId, clauseId, val, weight) => {
    const k = keyFor(itemId, vendorId, clauseId);
    const n = val === "" || val == null ? null : Math.max(0, Math.min(Number(weight), Math.round(Number(val))));
    setMarks((prev) => ({ ...prev, [k]: n }));
    if (amendMode && canApprove) {
      const resp = responseFor(vendorId, clauseId);
      if (resp?.response_id) {
        setAmends((prev) => ({ ...prev, [resp.response_id]: { ...prev[resp.response_id], buyer_marks: n } }));
      }
    }
  };
  const setRemarkLocal = (itemId, vendorId, clauseId, val) => {
    const k = keyFor(itemId, vendorId, clauseId);
    setRemarks((prev) => ({ ...prev, [k]: val }));
    if (amendMode && canApprove) {
      const resp = responseFor(vendorId, clauseId);
      if (resp?.response_id) {
        setAmends((prev) => ({ ...prev, [resp.response_id]: { ...prev[resp.response_id], buyer_remark: val } }));
      }
    }
  };

  // Evaluator path: persist on blur. (Approver amend mode stages instead.)
  const persistCell = async (itemId, vendorId, clauseId) => {
    if (!canEvaluate || isComplete || (amendMode && canApprove)) return;
    const resp = responseFor(vendorId, clauseId);
    if (!resp?.response_id) return;
    const k = keyFor(itemId, vendorId, clauseId);
    const marksVal = k in marks ? marks[k] : (resp.buyer_marks ?? null);
    if (marksVal == null) return;
    const remarkVal = k in remarks ? remarks[k] : (resp.buyer_remark ?? "");
    setSavingKey(k);
    try {
      await ArcApi.scoreResponse({ response_id: resp.response_id, buyer_marks: marksVal, buyer_remark: remarkVal });
    } catch (e) {
      // interceptor toast; 409 = immutable
    } finally {
      setSavingKey(null);
    }
  };

  const onSubmit = async () => {
    if (progress.done < progress.total || progress.total === 0) return;
    setSubmitting(true);
    try {
      await ArcApi.submitTechEval(arc.id);
      showToast("Evaluation submitted — routed to the approval chain");
      await onRefresh();
    } catch (e) {
      showToast(e?.response?.data?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (decision) => {
    if (decision === "reject" && !decideComment.trim()) {
      setCommentError(true);
      showToast("Add a reason before rejecting");
      return;
    }
    const amendMarks = Object.entries(amends).map(([response_id, v]) => ({ response_id: Number(response_id), ...v }));
    setDecideBusy(true);
    try {
      await ArcApi.techEvalDecide(arc.id, {
        decision,
        comment: decideComment.trim() || null,
        ...(decision === "approve" && amendMarks.length ? { amend: { marks: amendMarks } } : {}),
      });
      showToast(decision === "approve"
        ? (amendMarks.length ? "Marks amended & approval recorded" : "Approval recorded")
        : "Evaluation rejected — sent back to the evaluators");
      setAmends({});
      setAmendMode(false);
      setDecideComment("");
      await onRefresh({ advance: decision === "approve" });
    } catch (e) {
      showToast(e?.response?.data?.message || "Action failed");
    } finally {
      setDecideBusy(false);
    }
  };

  // ── render gates ───────────────────────────────────────────────────────
  if (!canRead) return <StageNoPermission stageLabel="Technical Evaluation" />;
  if (loading) return <StageSkeleton />;

  const amendCount = Object.keys(amends).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: canEvaluate || canApprove ? 88 : 0 }}>
      {/* status banners */}
      {isComplete && (
        <StageReadOnlyBanner>
          <strong>Technical evaluation is approved and locked.</strong>{" "}
          Scores below are the final record — qualified vendors moved to Commercial.
        </StageReadOnlyBanner>
      )}
      {isSkipped && (
        <div className="guide" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}><InfoIcon /></div>
          <div>
            <strong>Technical evaluation was skipped</strong> — no clauses are configured on any item,
            so all responding vendors proceeded directly to Commercial.
          </div>
        </div>
      )}
      {!isComplete && !isSkipped && stage?.reason === "approval_rejected" && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}><WarnTriIcon /></div>
          <div>
            <strong>The approver rejected this evaluation.</strong>{" "}
            Review the remarks in the approval panel, adjust the scores, and resubmit.
          </div>
        </div>
      )}
      {!isComplete && canEvaluate && stage?.reason !== "awaiting_approval" && !isSkipped && (
        <div className="guide">
          <div className="g-ic"><InfoIcon /></div>
          <div>
            Score each vendor&apos;s response per clause within the weight. Vendors scoring ≥{" "}
            <strong>minimum passing score</strong> on an item auto-qualify <strong>for that item only</strong>.
            Once one vendor is fully scored across all items, Commercial unlocks on the timeline.
          </div>
        </div>
      )}
      {!canEvaluate && !canApprove && !isComplete && !isSkipped && (
        <StageReadOnlyBanner>
          <strong>View only.</strong> You can see clauses, vendor responses and any marks given —
          scoring requires the evaluate permission.
        </StageReadOnlyBanner>
      )}

      {/* ITEM TABS */}
      {items.length > 0 && (
        <div className="item-tabs">
          <span className="lbl">Item</span>
          {items.map((it) => (
            <button key={it.id} type="button"
              className={`item-tab ${activeItem?.id === it.id ? "is-active" : ""}`}
              onClick={() => setActiveItemId(it.id)}>
              <span>{it.variant_name || `Variant #${it.product_variant_id ?? it.id}`}</span>
              <span className="it-code">{it.variant_slug || it.uom || ""}</span>
              <span className={`it-state ${itemTabState(it.id)}`}></span>
            </button>
          ))}
        </div>
      )}

      {/* MATRIX */}
      {activeItem && activeBlock ? (
        <div className="matrix-wrap">
          <div className="min-score-banner">
            <div className="ms-ic"><CheckCircleIcon /></div>
            <div>
              Item: <strong>{activeItem.variant_name || `Variant #${activeItem.product_variant_id ?? activeItem.id}`}</strong>
              {" · "}Minimum passing score: <strong>{minPassFor(activeItem.id)}%</strong>
              {" · "}Max marks: <strong><span className="mono">{vendorMaxMarks(activeItem.id)}</span></strong>
              {" · "}{(activeBlock.clauses || []).length} clauses
            </div>
            <div className="ms-right">
              {amendMode && canApprove && (
                <span className="your-action" style={{ fontSize: 10, padding: "2px 9px" }}>
                  Amending · {amendCount} change{amendCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          <div className="matrix-scroll">
            {(activeBlock.clauses || []).length === 0 ? (
              <div style={{ padding: 24, color: "var(--fg-3)", fontSize: 13 }}>
                No clauses configured for this item{isSkipped ? " — it rides the skip path" : ""}.
              </div>
            ) : activeVendors.length === 0 ? (
              <div style={{ padding: 24, color: "var(--fg-3)", fontSize: 13 }}>
                No vendor responses recorded yet for this item.
              </div>
            ) : (
              <table className="eval-table">
                <thead>
                  <tr>
                    <th className="col-clause"><div className="clause-head">Clause &amp; weight</div></th>
                    {activeVendors.map((v) => {
                      const verdict = vendorVerdictClass(activeItem.id, v.vendor_id);
                      const fully = vendorFullyEvaluated(activeItem.id, v.vendor_id);
                      const evaluated = vendorEvaluatedCount(activeItem.id, v.vendor_id);
                      const total = (activeBlock.clauses || []).length;
                      return (
                        <th key={v.vendor_id} className="ven-head">
                          <div className="vh-top">
                            <div className={`v-av ${vendorAvClass(v.vendor_id)}`}>{vendorInitials(v.vendor_name)}</div>
                            <div className="v-code">{vendorShort(v.vendor_name)}</div>
                          </div>
                          <div className="v-score-row">
                            <span className={`v-score ${verdict}`}>{fully ? vendorScore(activeItem.id, v.vendor_id) : "—"}</span>
                            <span className="v-score-max">/100</span>
                            <span className={`v-verdict ${verdict}`}>
                              {fully ? (vendorQualified(activeItem.id, v.vendor_id) ? "Qualified" : "Not qualified") : "In progress"}
                            </span>
                          </div>
                          <div className="v-pass-line">
                            Min <span className="mono">{minPassFor(activeItem.id)}%</span> · evaluated <span className="mono">{evaluated}/{total}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(activeBlock.clauses || []).map((cl, idx) => (
                    <tr key={cl.id}>
                      <td className="col-clause">
                        <div className="clause-cell">
                          <span className="c-num">{idx + 1}</span>
                          <span className="c-text">{cl.clause_text || cl.text}</span>
                          <div className="c-meta">
                            <span className="c-weight">weight <span className="mono">{clauseWeight(cl)}</span> marks</span>
                            <span className="c-type">{cl.clause_type || cl.type || "text"}</span>
                          </div>
                        </div>
                      </td>
                      {activeVendors.map((v) => {
                        const resp = responseFor(v.vendor_id, cl.id);
                        const k = keyFor(activeItem.id, v.vendor_id, cl.id);
                        const markVal = k in marks ? marks[k] : (resp?.buyer_marks ?? null);
                        const remarkVal = k in remarks ? remarks[k] : (resp?.buyer_remark ?? "");
                        const fully = vendorFullyEvaluated(activeItem.id, v.vendor_id);
                        const disq = fully && !vendorQualified(activeItem.id, v.vendor_id);
                        const isSaving = savingKey === k;
                        const amended = resp?.response_id && amends[resp.response_id];
                        return (
                          <td key={v.vendor_id} className={`score-cell ${disq ? "is-disq" : ""}`}>
                            <div className="resp">
                              <div className="response-text" style={!resp?.vendor_response ? { color: "var(--fg-4)" } : undefined}>
                                <span>{resp?.vendor_response || "No response submitted"}</span>
                              </div>
                              <div className="mark-block" style={amended ? { outline: "1.5px solid var(--warn)", outlineOffset: 2, borderRadius: 7 } : undefined}>
                                <div className="mark-label">
                                  {editable ? (amendMode && canApprove ? "Amend marks" : "Your marks") : "Marks"}
                                  {isSaving ? " · saving…" : ""}
                                  {amended ? " · edited" : ""}
                                </div>
                                <div className="mark-entry">
                                  <input
                                    type="number"
                                    max={clauseWeight(cl)}
                                    min={0}
                                    value={markVal ?? ""}
                                    placeholder={String(clauseWeight(cl))}
                                    className={markVal != null ? "filled" : ""}
                                    disabled={!editable || !resp?.response_id}
                                    onChange={(e) => setMarkLocal(activeItem.id, v.vendor_id, cl.id, e.target.value, clauseWeight(cl))}
                                    onBlur={() => persistCell(activeItem.id, v.vendor_id, cl.id)}
                                  />
                                  <span className="of-max">/ <span>{clauseWeight(cl)}</span></span>
                                  <span className={`mark-hint ${markVal != null ? "done" : ""}`}>
                                    {markVal != null ? "✓ scored" : "pending"}
                                  </span>
                                </div>
                                <textarea
                                  className="remark-input"
                                  placeholder={editable ? "Optional remark" : ""}
                                  value={remarkVal ?? ""}
                                  disabled={!editable || !resp?.response_id}
                                  onChange={(e) => setRemarkLocal(activeItem.id, v.vendor_id, cl.id, e.target.value)}
                                  onBlur={() => persistCell(activeItem.id, v.vendor_id, cl.id)}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <h2>No items to evaluate</h2>
          <p>No items are configured for technical evaluation on this contract.</p>
        </div>
      )}

      {/* ── APPROVAL PANEL ── */}
      {(approvalDetail || approval) && (
        <section className="section-card">
          <div className="section-head">
            <div className="h-left">
              <div className="ic"><PenIcon /></div>
              <div>
                <h2>Approval matrix</h2>
                <div className="h-sub">
                  {approval?.status === "PENDING"
                    ? `Level ${approvalDetail?.current_step || approval.current_step || 1} of ${approvalDetail?.total_steps || "—"} in review`
                    : approval?.status === "APPROVED" ? "Approved — technical record locked"
                    : approval?.status === "REJECTED" ? "Rejected — sent back to the evaluators"
                    : "—"}
                </div>
              </div>
            </div>
            {canApprove && (
              <div className="h-right">
                <span className="your-action" style={{ fontSize: 10, padding: "3px 9px" }}>Your approval needed</span>
              </div>
            )}
          </div>
          <div className="section-body">
            {(approvalDetail?.steps || []).map((step) => {
              const isCurrent = approval?.status === "PENDING" && Number(step.step_order) === Number(approvalDetail.current_step);
              return (
                <div key={step.step_order}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 2px" }}>
                    <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: isCurrent ? "var(--warn)" : "var(--fg-4)", fontWeight: 700 }}>
                      Level {step.step_order}{step.decision_rule ? (step.decision_rule === "ALL" ? " · all must approve" : " · any one approves") : ""}
                    </span>
                    <span className={`status-pill ${step.status === "APPROVED" ? "success" : step.status === "REJECTED" ? "danger" : isCurrent ? "warn" : "neutral"}`} style={{ fontSize: 9.5 }}>
                      <span className="dot" />
                      {step.status === "APPROVED" ? "cleared" : step.status === "REJECTED" ? "rejected" : isCurrent ? "reviewing now" : "waiting"}
                    </span>
                  </div>
                  {(step.approvers || []).map((ap) => (
                    <div key={ap.user_id} className={`mem-row${isCurrent && ap.status === "PENDING" ? " is-current" : ""}`}>
                      <div className="mr-av">{vendorInitials(ap.user_name)}</div>
                      <div className="mr-meta">
                        <div className="mr-name">{ap.user_name}</div>
                        <div className="mr-role">{ap.user_designation || ap.user_department || "Approver"}</div>
                        {ap.comment && <div className="mr-comment">{ap.comment}</div>}
                      </div>
                      <div className="mr-status">
                        <span className={`status-pill ${ap.status === "APPROVED" ? "success" : ap.status === "REJECTED" ? "danger" : "neutral"}`} style={{ fontSize: 9.5 }}>
                          <span className="dot" />{ap.status === "APPROVED" ? "approved" : ap.status === "REJECTED" ? "rejected" : "pending"}
                        </span>
                        {ap.acted_at && <span className="mr-time">{fmtDate(ap.acted_at)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Edit history — who amended which marks before approving */}
            {editHistory.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="section-label" style={{ marginBottom: 8 }}>Edit history</div>
                {editHistory.map((e, idx) => (
                  <div key={idx} className="rvm-edit-card">
                    <div className="eh-head">
                      <div className="eh-ic"><PenIcon /></div>
                      <div className="eh-who">
                        <span className="em">{e.changed_by_name || `User #${e.changed_by}`}</span> amended {String(e.field_changed).replace(/_/g, " ")} before approving
                      </div>
                      <div className="eh-time">{fmtDate(e.changed_at)}</div>
                    </div>
                    <div className="eh-body">
                      <span className="eh-field">Response #{e.response_id} · {String(e.field_changed).replace(/_/g, " ")}</span>
                      <span className="eh-val">{e.before_value == null ? "—" : String(JSON.parse(JSON.stringify(e.before_value)))}</span>
                      <span className="eh-arrow">→</span>
                      <span className="eh-val after">{e.after_value == null ? "—" : String(JSON.parse(JSON.stringify(e.after_value)))}</span>
                    </div>
                    {e.comment && <div className="eh-comment">"{e.comment}"</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Decision box — current approver only */}
            {canApprove && (
              <div className="you-row" style={{ marginTop: 14 }}>
                <div className="here-now">Your decision</div>
                <label className="cbx" style={{ margin: "11px 0 8px" }}>
                  <input type="checkbox" checked={amendMode} onChange={(e) => { setAmendMode(e.target.checked); if (!e.target.checked) setAmends({}); }} />
                  <span className="cbx-box" />
                  <span>Amend marks before approving — your edits are recorded in the edit history and the approval trail</span>
                </label>
                <label style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-4)", fontWeight: 600 }}>
                  Comment
                  <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid rgba(185,28,28,0.24)" }}>
                    required to reject
                  </span>
                </label>
                <textarea
                  value={decideComment}
                  onChange={(e) => { setDecideComment(e.target.value); if (commentError && e.target.value.trim()) setCommentError(false); }}
                  placeholder="Remark for the approval trail — mandatory if you reject…"
                  style={{
                    marginTop: 5, width: "100%", minHeight: 54, padding: "8px 11px",
                    border: `1px solid ${commentError ? "var(--danger)" : "var(--border-input)"}`,
                    boxShadow: commentError ? "0 0 0 3px rgba(185,28,28,0.14)" : "none",
                    borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "white", resize: "vertical",
                  }}
                />
                <div style={{ marginTop: 11, display: "flex", gap: 8 }}>
                  <button type="button" className="btn btn-danger" disabled={decideBusy} onClick={() => decide("reject")}>
                    Reject
                  </button>
                  <button type="button" className="btn btn-success" disabled={decideBusy} style={{ flex: 1 }} onClick={() => decide("approve")}>
                    {decideBusy ? "Submitting…" : amendCount > 0 ? `Save ${amendCount} edit${amendCount === 1 ? "" : "s"} & approve` : "Approve evaluation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* EDGE CASE WARNING */}
      {!isComplete && !isSkipped && (
        <div className="guide warn">
          <div className="g-ic"><WarnTriIcon /></div>
          <div>
            If zero vendors clear the minimum passing score for an item after all rounds, that item enters{" "}
            <strong>Closed · No-Award</strong>. Items that do qualify proceed to commercial evaluation independently.
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="arc-toast"><span className="t-ic">✓</span><span>{toast}</span></div>
      )}

      {/* STICKY ACTION DOCK — evaluators only, while editable */}
      {canEvaluate && !isComplete && (
        <div className="action-dock">
          <div className="inner">
            <div className="left">
              <span className="fs-13 text-fg-2">
                Scored: <span className="fw-600 text-fg mono">{progress.done} / {progress.total}</span> cells ({progress.pct}%)
              </span>
              <span className="text-fg-4">·</span>
              <span className="fs-13"><span className="mono fw-600 text-success">{qualifiedTally.q}</span> qualified</span>
              <span className="fs-13"><span className="mono fw-600 text-danger">{qualifiedTally.dq}</span> not qualified</span>
              <span className="fs-13 text-fg-3"><span className="mono fw-600">{qualifiedTally.pending}</span> pending</span>
            </div>
            <div className="right">
              <button
                className="btn btn-blue"
                type="button"
                disabled={submitting || progress.total === 0 || progress.done < progress.total || approval?.status === "PENDING"}
                onClick={onSubmit}
              >
                {approval?.status === "PENDING" ? "With approvers" : submitting ? "Submitting…" : "Submit evaluation"}
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
