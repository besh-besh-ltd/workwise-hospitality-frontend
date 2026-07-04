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
import { StageColumns, ActorFlowCard, ApprovalDecisionCard } from "./StageAside";

const Icon = ({ sw = 2, children }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const InfoIcon = () => (<Icon><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></Icon>);
const CheckCircleIcon = () => (<Icon><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></Icon>);
const WarnTriIcon = () => (<Icon><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>);
const ArrowRightIcon = () => (<Icon sw={2.2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Icon>);
const PenIcon = () => (<Icon><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></Icon>);

const AV_CLASSES = ["av-1", "av-2", "av-3", "av-4", "av-5", "av-6"];
// BLIND EVAL: the avatar colour seed is the small per-ARC alias index, NOT the
// real vendor_id (which never reaches this component during technical eval).
const vendorAvClass = (aliasKey) => AV_CLASSES[Math.abs(Number(aliasKey) || 0) % AV_CLASSES.length];
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
  // Per-cell mandatory pass/fail verdict for mandatory clauses (true/false/null).
  const [verdicts, setVerdicts] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  // Defaults ON — only evaluate vendors who also submitted a commercial quote.
  // Tech-only vendors never reach commercial, so showing/scoring them wastes the
  // evaluator's time and can stall the item's "done" state. Toggle off to see all.
  const [onlyQuoted, setOnlyQuoted] = useState(true);
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
          // Server-authoritative per-vendor qualification (incl. mandatory gate).
          scores: d.scores || [],
        };
      } catch (e) {
        next[it.id] = { tech_evaluation: null, clauses: [], responses: [], scores: [] };
      }
    }));
    setEvalByItem(next);
    // Hydrate staged marks/remarks/verdicts from server rows. BLIND EVAL: the
    // matrix is keyed on the stable per-ARC alias key (vendor_alias_key), never
    // the real vendor_id (which is no longer present in the payload).
    const m = {}, r = {}, v = {};
    for (const it of itemList) {
      for (const resp of next[it.id]?.responses || []) {
        const k = `${it.id}|${resp.vendor_alias_key}|${resp.clause_id}`;
        if (resp.buyer_marks != null) m[k] = Number(resp.buyer_marks);
        if (resp.buyer_remark != null) r[k] = resp.buyer_remark;
        if (resp.mandatory_passed != null) v[k] = !!resp.mandatory_passed;
      }
    }
    setMarks(m);
    setRemarks(r);
    setVerdicts(v);
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

  // BLIND EVAL: vendor columns are built from the stable per-ARC alias
  // (vendor_alias_key + vendor_alias = "Vendor A/B…"), never the real
  // vendor_id/name (which the server no longer sends during technical eval).
  const activeVendors = useMemo(() => {
    if (!activeBlock) return [];
    const seen = new Map();
    for (const r of activeBlock.responses || []) {
      const vid = r.vendor_alias_key;
      // Keep the raw flag (true/false/undefined). Older backends omit it; we
      // treat "undefined" as "show" so a deploy gap never hides every vendor.
      if (!seen.has(vid)) seen.set(vid, { vendor_key: vid, vendor_alias: r.vendor_alias || `Vendor ${vid}`, has_submitted_quote: r.has_submitted_quote });
    }
    const all = [...seen.values()];
    return onlyQuoted ? all.filter((v) => v.has_submitted_quote !== false) : all;
  }, [activeBlock, onlyQuoted]);

  // How many responding vendors on the active item are technical-only (no
  // commercial quote, has_submitted_quote === false) — i.e. hidden by the toggle.
  const techOnlyCount = useMemo(() => {
    if (!activeBlock) return 0;
    const seen = new Map();
    for (const r of activeBlock.responses || []) {
      if (!seen.has(r.vendor_alias_key)) seen.set(r.vendor_alias_key, r.has_submitted_quote);
    }
    return [...seen.values()].filter((q) => q === false).length;
  }, [activeBlock]);

  const responseFor = useCallback((vendorKey, clauseId) => {
    if (!activeBlock) return null;
    return (activeBlock.responses || []).find(
      (r) => Number(r.vendor_alias_key) === Number(vendorKey) && Number(r.clause_id) === Number(clauseId)
    ) || null;
  }, [activeBlock]);

  const keyFor = (itemId, vendorId, clauseId) => `${itemId}|${vendorId}|${clauseId}`;
  const getMark = useCallback((itemId, vendorId, clauseId) => {
    const k = keyFor(itemId, vendorId, clauseId);
    return k in marks ? marks[k] : null;
  }, [marks]);
  const getVerdict = useCallback((itemId, vendorId, clauseId) => {
    const k = keyFor(itemId, vendorId, clauseId);
    return k in verdicts ? verdicts[k] : null; // true | false | null(unjudged)
  }, [verdicts]);
  const clauseIsMandatory = (cl) => !!(cl?.is_mandatory);

  // Server-authoritative per-vendor score row for an item (carries the
  // mandatory gate — qualifies / mandatory_failed). Falls back to null.
  // BLIND EVAL: matched on the alias key, not the real vendor_id.
  const serverScoreFor = useCallback((itemId, vendorKey) => {
    const block = evalByItem[itemId];
    return (block?.scores || []).find((s) => Number(s.vendor_alias_key) === Number(vendorKey)) || null;
  }, [evalByItem]);
  // True when this item has at least one mandatory clause.
  const itemHasMandatory = useCallback((itemId) => {
    const block = evalByItem[itemId];
    return (block?.clauses || []).some((cl) => clauseIsMandatory(cl));
  }, [evalByItem]);
  // A mandatory clause is failed (FALSE) or not-yet-judged (NULL) for this vendor.
  const vendorMandatoryBlocked = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    return (block?.clauses || []).some((cl) =>
      clauseIsMandatory(cl) && getVerdict(itemId, vendorId, cl.id) !== true);
  }, [evalByItem, getVerdict]);

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
  // Fully evaluated = every clause marked AND every mandatory clause judged.
  const vendorFullyEvaluated = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    const allMarked = vendorEvaluatedCount(itemId, vendorId) === (block?.clauses || []).length;
    if (!allMarked) return false;
    // A mandatory clause still unjudged (NULL) means not fully evaluated.
    const mandatoryUnjudged = (block?.clauses || []).some((cl) =>
      clauseIsMandatory(cl) && getVerdict(itemId, vendorId, cl.id) == null);
    return !mandatoryUnjudged;
  }, [evalByItem, vendorEvaluatedCount, getVerdict]);
  const minPassFor = useCallback((itemId) => evalByItem[itemId]?.tech_evaluation?.minimum_passing_score ?? 60, [evalByItem]);
  // Qualification honours the mandatory gate. Prefer the server's authoritative
  // verdict when present; otherwise compute locally (weighted ≥ min AND no
  // mandatory clause failed/unjudged).
  const vendorQualified = useCallback((itemId, vendorId) => {
    const srv = serverScoreFor(itemId, vendorId);
    if (srv && typeof srv.qualifies === "boolean") return srv.qualifies;
    if (vendorMandatoryBlocked(itemId, vendorId)) return false;
    return vendorScore(itemId, vendorId) >= Number(minPassFor(itemId));
  }, [serverScoreFor, vendorMandatoryBlocked, vendorScore, minPassFor]);
  // Did the vendor fail specifically because of the mandatory gate?
  const vendorMandatoryFailed = useCallback((itemId, vendorId) => {
    const srv = serverScoreFor(itemId, vendorId);
    if (srv && typeof srv.mandatory_failed === "boolean") return srv.mandatory_failed;
    // Local fallback: a judged mandatory FALSE (not merely unjudged).
    const block = evalByItem[itemId];
    return (block?.clauses || []).some((cl) =>
      clauseIsMandatory(cl) && getVerdict(itemId, vendorId, cl.id) === false);
  }, [serverScoreFor, evalByItem, getVerdict]);
  const vendorVerdictClass = useCallback((itemId, vendorId) => {
    if (!vendorFullyEvaluated(itemId, vendorId)) return "pending";
    return vendorQualified(itemId, vendorId) ? "pass" : "fail";
  }, [vendorFullyEvaluated, vendorQualified]);
  // BLIND EVAL: the set of "vendors responding" is a set of alias keys.
  const vendorsRespondingFor = useCallback((itemId) => {
    const resps = evalByItem[itemId]?.responses || [];
    const scoped = onlyQuoted ? resps.filter((r) => r.has_submitted_quote !== false) : resps;
    const set = new Set(scoped.map((r) => Number(r.vendor_alias_key)));
    return [...set];
  }, [evalByItem, onlyQuoted]);
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
  // Mandatory pass/fail verdict. Persists immediately (evaluator) or stages
  // into the amend payload (approver amend mode).
  const setVerdictLocal = (itemId, vendorId, clauseId, val) => {
    const k = keyFor(itemId, vendorId, clauseId);
    setVerdicts((prev) => ({ ...prev, [k]: val }));
    if (amendMode && canApprove) {
      const resp = responseFor(vendorId, clauseId);
      if (resp?.response_id) {
        setAmends((prev) => ({ ...prev, [resp.response_id]: { ...prev[resp.response_id], mandatory_passed: val } }));
      }
    } else {
      // Evaluator: persist the verdict (mandatory clauses still need a mark too,
      // but the verdict can be recorded independently as it's set).
      persistCell(itemId, vendorId, clauseId, val);
    }
  };

  // Evaluator path: persist on blur. (Approver amend mode stages instead.)
  // verdictOverride lets the mandatory Pass/Fail control persist its verdict.
  const persistCell = async (itemId, vendorId, clauseId, verdictOverride = undefined) => {
    if (!canEvaluate || isComplete || (amendMode && canApprove)) return;
    const resp = responseFor(vendorId, clauseId);
    if (!resp?.response_id) return;
    const k = keyFor(itemId, vendorId, clauseId);
    const marksVal = k in marks ? marks[k] : (resp.buyer_marks ?? null);
    if (marksVal == null) return; // marks are required by the backend
    const remarkVal = k in remarks ? remarks[k] : (resp.buyer_remark ?? "");
    // Mandatory clause → must send a pass/fail verdict.
    const block = evalByItem[itemId];
    const cl = (block?.clauses || []).find((c) => Number(c.id) === Number(clauseId));
    const isMandatory = clauseIsMandatory(cl);
    let mandatory_passed;
    if (isMandatory) {
      const v = verdictOverride !== undefined ? verdictOverride
        : (k in verdicts ? verdicts[k] : (resp.mandatory_passed ?? null));
      if (typeof v !== "boolean") return; // can't score a mandatory clause without a verdict yet
      mandatory_passed = v;
    }
    setSavingKey(k);
    try {
      await ArcApi.scoreResponse({
        response_id: resp.response_id, buyer_marks: marksVal, buyer_remark: remarkVal,
        ...(isMandatory ? { mandatory_passed } : {}),
      });
      // Refresh server scores for this item so the verdict/gate reflects truth.
      try {
        const r = await ArcApi.getTechEvalForItem(itemId);
        const d = r?.data || r || {};
        setEvalByItem((prev) => ({ ...prev, [itemId]: { ...prev[itemId], scores: d.scores || [], responses: d.responses || prev[itemId]?.responses || [] } }));
      } catch (_) { /* best-effort */ }
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
    <StageColumns aside={<>
      <ActorFlowCard stage={stage} />
      {canApprove && (
        <ApprovalDecisionCard
          stepLabel={stage?.actors?.approver?.step_label}
          approvers={stage?.actors?.approver?.people}
          comment={decideComment}
          setComment={(v) => { setDecideComment(v); if (commentError && v.trim()) setCommentError(false); }}
          commentError={commentError}
          onApprove={() => decide("approve")}
          onReject={() => decide("reject")}
          busy={decideBusy}
          approveLabel={amendCount > 0 ? `Save ${amendCount} edit${amendCount === 1 ? "" : "s"} & approve` : "Approve evaluation"}
        >
          <label className="cbx" style={{ margin: "0 0 8px", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input type="checkbox" checked={amendMode} onChange={(e) => { setAmendMode(e.target.checked); if (!e.target.checked) setAmends({}); }} />
            <span className="cbx-box" />
            <span style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>Amend marks before approving — edits recorded in edit history</span>
          </label>
        </ApprovalDecisionCard>
      )}
    </>}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: canEvaluate ? 88 : 0 }}>
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
            <div className="ms-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label
                style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--fg-2)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                title="Hide vendors who submitted only a technical envelope but no commercial quote — they won't reach the commercial stage, so scoring them wastes time."
              >
                <input type="checkbox" checked={onlyQuoted} onChange={(e) => setOnlyQuoted(e.target.checked)} />
                <span>Only vendors with a quote</span>
                {onlyQuoted && techOnlyCount > 0 && (
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)", background: "var(--surface-2)", borderRadius: 5, padding: "1px 6px" }}>
                    {techOnlyCount} hidden
                  </span>
                )}
              </label>
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
                {onlyQuoted && techOnlyCount > 0
                  ? <>No vendors with a submitted commercial quote yet for this item — {techOnlyCount} technical-only vendor{techOnlyCount === 1 ? "" : "s"} hidden. Turn off <strong>Only vendors with a quote</strong> to review them.</>
                  : "No vendor responses recorded yet for this item."}
              </div>
            ) : (
              <table className="eval-table">
                <thead>
                  <tr>
                    <th className="col-clause"><div className="clause-head">Clause &amp; weight</div></th>
                    {activeVendors.map((v) => {
                      const verdict = vendorVerdictClass(activeItem.id, v.vendor_key);
                      const fully = vendorFullyEvaluated(activeItem.id, v.vendor_key);
                      const evaluated = vendorEvaluatedCount(activeItem.id, v.vendor_key);
                      const total = (activeBlock.clauses || []).length;
                      return (
                        <th key={v.vendor_key} className="ven-head">
                          <div className="vh-top">
                            <div className={`v-av ${vendorAvClass(v.vendor_key)}`}>{vendorInitials(v.vendor_alias)}</div>
                            <div className="v-code">{vendorShort(v.vendor_alias)}</div>
                          </div>
                          <div className="v-score-row">
                            <span className={`v-score ${verdict}`}>{fully ? vendorScore(activeItem.id, v.vendor_key) : "—"}</span>
                            <span className="v-score-max">/100</span>
                            <span className={`v-verdict ${verdict}`}>
                              {fully ? (vendorQualified(activeItem.id, v.vendor_key) ? "Qualified" : "Not qualified") : "In progress"}
                            </span>
                          </div>
                          {fully && !vendorQualified(activeItem.id, v.vendor_key) && vendorMandatoryFailed(activeItem.id, v.vendor_key) && (
                            <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 999, padding: "1px 8px", display: "inline-block" }}>
                              Disqualified · failed mandatory clause
                            </div>
                          )}
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
                            {clauseIsMandatory(cl) && (
                              <span className="c-type" style={{ background: "var(--danger-soft, #fee2e2)", color: "var(--danger, #b91c1c)", fontWeight: 700 }}>
                                Mandatory · gate
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {activeVendors.map((v) => {
                        const resp = responseFor(v.vendor_key, cl.id);
                        const k = keyFor(activeItem.id, v.vendor_key, cl.id);
                        const markVal = k in marks ? marks[k] : (resp?.buyer_marks ?? null);
                        const remarkVal = k in remarks ? remarks[k] : (resp?.buyer_remark ?? "");
                        const verdictVal = k in verdicts ? verdicts[k] : (resp?.mandatory_passed ?? null);
                        const fully = vendorFullyEvaluated(activeItem.id, v.vendor_key);
                        const disq = fully && !vendorQualified(activeItem.id, v.vendor_key);
                        const isSaving = savingKey === k;
                        const amended = resp?.response_id && amends[resp.response_id];
                        return (
                          <td key={v.vendor_key} className={`score-cell ${disq ? "is-disq" : ""}`}>
                            <div className="resp">
                              <div className="response-text" style={!resp?.vendor_response ? { color: "var(--fg-4)" } : undefined}>
                                <span>{resp?.vendor_response || "No response submitted"}</span>
                              </div>
                              {/* Vendor-submitted evidence files (ownership-checked proxy links) */}
                              {Array.isArray(resp?.files) && resp.files.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "4px 0 2px" }}>
                                  {resp.files.map((f) => (
                                    <a key={f.file_id}
                                       href={`${process.env.NEXT_PUBLIC_API_URL || ""}${ArcApi.techEvidenceUrl(f.file_id)}`}
                                       target="_blank" rel="noreferrer"
                                       style={{ fontSize: 11, color: "var(--accent, #1d4ed8)", background: "var(--accent-soft, #eff6ff)", border: "1px solid #bfdbfe", borderRadius: 6, padding: "2px 7px", textDecoration: "none" }}>
                                      Evidence #{f.file_id}
                                    </a>
                                  ))}
                                </div>
                              )}
                              <div className="mark-block" style={amended ? { outline: "1.5px solid var(--warn)", outlineOffset: 2, borderRadius: 7 } : undefined}>
                                {clauseIsMandatory(cl) && (
                                  <div style={{ marginBottom: 6 }}>
                                    <div className="mark-label">
                                      {editable ? (amendMode && canApprove ? "Amend verdict" : "Pass / Fail (mandatory)") : "Verdict"}
                                    </div>
                                    <div style={{ display: "inline-flex", gap: 6, marginTop: 3 }}>
                                      <button type="button"
                                        disabled={!editable || !resp?.response_id}
                                        onClick={() => setVerdictLocal(activeItem.id, v.vendor_key, cl.id, true)}
                                        style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, cursor: editable ? "pointer" : "default",
                                          border: "1px solid " + (verdictVal === true ? "#047857" : "var(--border-input, #d1d5db)"),
                                          background: verdictVal === true ? "#ecfdf5" : "white", color: verdictVal === true ? "#047857" : "var(--fg-3, #6b7280)" }}>
                                        Pass
                                      </button>
                                      <button type="button"
                                        disabled={!editable || !resp?.response_id}
                                        onClick={() => setVerdictLocal(activeItem.id, v.vendor_key, cl.id, false)}
                                        style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, cursor: editable ? "pointer" : "default",
                                          border: "1px solid " + (verdictVal === false ? "#b91c1c" : "var(--border-input, #d1d5db)"),
                                          background: verdictVal === false ? "#fef2f2" : "white", color: verdictVal === false ? "#b91c1c" : "var(--fg-3, #6b7280)" }}>
                                        Fail
                                      </button>
                                    </div>
                                  </div>
                                )}
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
                                    onChange={(e) => setMarkLocal(activeItem.id, v.vendor_key, cl.id, e.target.value, clauseWeight(cl))}
                                    onBlur={() => persistCell(activeItem.id, v.vendor_key, cl.id)}
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
                                  onChange={(e) => setRemarkLocal(activeItem.id, v.vendor_key, cl.id, e.target.value)}
                                  onBlur={() => persistCell(activeItem.id, v.vendor_key, cl.id)}
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

          </div>
        </section>
      )}

      {/* EDGE CASE WARNING */}
      {!isComplete && !isSkipped && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}><WarnTriIcon /></div>
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
  </StageColumns>
  );
}
