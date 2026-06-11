import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  getContractDetail,
  getTechEvalForItem,
  scoreResponse,
  submitTechEval,
} from "@/services/arc_v2";

// Inline icon components matching the prototype's Lucide-style strokes.
const Icon = ({ d, w = 14, h = 14, sw = 2, children }) => (
  <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children || (typeof d === "string" ? <path d={d} /> : null)}
  </svg>
);

const RefreshIcon = () => (
  <Icon>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Icon>
);

const FileIcon = () => (
  <Icon>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </Icon>
);

const InfoIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Icon>
);

const CheckCircleIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
);

const WarnTriIcon = () => (
  <Icon>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Icon>
);

const ArrowRightIcon = () => (
  <Icon sw={2.2}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </Icon>
);

const PaperclipIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

// Vendor avatar palette (mirrors prototype's "av-1..av-6" classes).
const AV_CLASSES = ["av-1", "av-2", "av-3", "av-4", "av-5", "av-6"];
const vendorAvClass = (vendorId) => AV_CLASSES[Math.abs(Number(vendorId) || 0) % AV_CLASSES.length];
const vendorInitials = (name) => {
  if (!name) return "VN";
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0] || "").charAt(0) + (parts[1] || "").charAt(0)).toUpperCase() || name.slice(0, 2).toUpperCase();
};
const vendorShort = (name) => {
  if (!name) return "Vendor";
  const trimmed = String(name).trim();
  return trimmed.length > 12 ? trimmed.slice(0, 12) + "…" : trimmed;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

export default function BuyerTechEvalPage() {
  const router = useRouter();
  const { contractId } = router.query;

  const [arc, setArc] = useState(null);
  const [items, setItems] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState(null);

  // Per-item tech eval data: { [itemId]: { tech_evaluation, clauses, scores } }
  const [evalByItem, setEvalByItem] = useState({});
  // Buyer-edited marks/remarks staged locally and saved on blur.
  // Key format: `${itemId}|${vendorId}|${clauseId}`
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  // Show a transient toast.
  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2400);
  }, []);

  // Load ARC header + items list once.
  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getContractDetail(contractId);
        if (cancelled) return;
        const d = res?.data || res || {};
        setArc(d.arc || null);
        setItems(d.items || []);
        setInvitations(d.invitations || []);
        if ((d.items || []).length && !activeItemId) {
          setActiveItemId(d.items[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  // Load tech eval for each item (clauses + vendor responses + existing scores).
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    (async () => {
      const next = {};
      await Promise.all(items.map(async (it) => {
        try {
          const res = await getTechEvalForItem(it.id);
          const d = res?.data || res || {};
          next[it.id] = {
            tech_evaluation: d.tech_evaluation || null,
            clauses: d.clauses || [],
            scores: d.scores || [],
          };
        } catch (e) {
          next[it.id] = { tech_evaluation: null, clauses: [], scores: [] };
        }
      }));
      if (cancelled) return;
      setEvalByItem(next);

      // Hydrate local marks/remarks from server-side scores so the inputs are pre-filled.
      const m = {};
      const r = {};
      for (const it of items) {
        const block = next[it.id];
        if (!block) continue;
        for (const s of block.scores || []) {
          const k = `${it.id}|${s.vendor_id}|${s.clause_id}`;
          if (s.buyer_marks != null) m[k] = s.buyer_marks;
          if (s.buyer_remark != null) r[k] = s.buyer_remark;
        }
      }
      setMarks(m);
      setRemarks(r);
    })();
    return () => { cancelled = true; };
  }, [items]);

  // Vendor name resolution from invitations.
  const vendorNameById = useMemo(() => {
    const map = new Map();
    for (const inv of invitations || []) {
      map.set(Number(inv.vendor_id), inv.vendor_name || inv.company_name || `Vendor #${inv.vendor_id}`);
    }
    return map;
  }, [invitations]);

  const activeItem = useMemo(() => items.find(it => it.id === activeItemId) || items[0] || null, [items, activeItemId]);
  const activeBlock = activeItem ? evalByItem[activeItem.id] : null;

  // Group the active block's scores by vendor; this is the column set for the matrix.
  const activeVendors = useMemo(() => {
    if (!activeBlock) return [];
    const seen = new Map();
    for (const s of activeBlock.scores || []) {
      const vid = Number(s.vendor_id);
      if (!seen.has(vid)) {
        seen.set(vid, {
          vendor_id: vid,
          vendor_name: s.vendor_name || vendorNameById.get(vid) || `Vendor #${vid}`,
        });
      }
    }
    return [...seen.values()];
  }, [activeBlock, vendorNameById]);

  // Lookup: response for a given (vendor, clause) cell.
  const responseFor = useCallback((vendorId, clauseId) => {
    if (!activeBlock) return null;
    return (activeBlock.scores || []).find(s =>
      Number(s.vendor_id) === Number(vendorId) && Number(s.clause_id) === Number(clauseId)
    ) || null;
  }, [activeBlock]);

  // Helpers for the per-item summary stats shown in the header strip and dock.
  const keyFor = (itemId, vendorId, clauseId) => `${itemId}|${vendorId}|${clauseId}`;

  const getMark = useCallback((itemId, vendorId, clauseId) => {
    const k = keyFor(itemId, vendorId, clauseId);
    if (k in marks) return marks[k];
    const block = evalByItem[itemId];
    if (!block) return null;
    const s = (block.scores || []).find(x =>
      Number(x.vendor_id) === Number(vendorId) && Number(x.clause_id) === Number(clauseId)
    );
    return s && s.buyer_marks != null ? Number(s.buyer_marks) : null;
  }, [marks, evalByItem]);

  const setMarkLocal = (itemId, vendorId, clauseId, val, weight) => {
    const k = keyFor(itemId, vendorId, clauseId);
    if (val === "" || val == null) {
      setMarks(prev => { const next = { ...prev }; next[k] = null; return next; });
      return;
    }
    const n = Math.max(0, Math.min(Number(weight), Math.round(Number(val))));
    setMarks(prev => ({ ...prev, [k]: n }));
  };

  const setRemarkLocal = (itemId, vendorId, clauseId, val) => {
    const k = keyFor(itemId, vendorId, clauseId);
    setRemarks(prev => ({ ...prev, [k]: val }));
  };

  // Persist the cell on blur.
  const persistCell = async (itemId, vendorId, clauseId) => {
    const block = evalByItem[itemId];
    if (!block) return;
    const resp = (block.scores || []).find(s =>
      Number(s.vendor_id) === Number(vendorId) && Number(s.clause_id) === Number(clauseId)
    );
    if (!resp || !resp.response_id) return; // no vendor response recorded yet — can't score.
    const k = keyFor(itemId, vendorId, clauseId);
    const marksVal = k in marks ? marks[k] : (resp.buyer_marks ?? null);
    const remarkVal = k in remarks ? remarks[k] : (resp.buyer_remark ?? "");
    setSavingKey(k);
    try {
      await scoreResponse({
        response_id: resp.response_id,
        buyer_marks: marksVal,
        buyer_remark: remarkVal,
      });
      // Patch local block so verdicts re-compute.
      setEvalByItem(prev => {
        const cur = prev[itemId];
        if (!cur) return prev;
        return {
          ...prev,
          [itemId]: {
            ...cur,
            scores: cur.scores.map(s =>
              Number(s.vendor_id) === Number(vendorId) && Number(s.clause_id) === Number(clauseId)
                ? { ...s, buyer_marks: marksVal, buyer_remark: remarkVal }
                : s
            ),
          },
        };
      });
    } catch (e) {
      // axios interceptor surfaces a toast already.
    } finally {
      setSavingKey(null);
    }
  };

  const vendorTotal = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    if (!block) return 0;
    return (block.clauses || []).reduce((sum, cl) => {
      const m = getMark(itemId, vendorId, cl.id);
      return sum + (m == null ? 0 : Number(m));
    }, 0);
  }, [evalByItem, getMark]);

  const vendorMaxMarks = useCallback((itemId) => {
    const block = evalByItem[itemId];
    if (!block) return 100;
    const sum = (block.clauses || []).reduce((s, cl) => s + Number(cl.weight || 0), 0);
    return sum || 100;
  }, [evalByItem]);

  const vendorScore = useCallback((itemId, vendorId) => {
    const max = vendorMaxMarks(itemId);
    return max ? Math.round((vendorTotal(itemId, vendorId) / max) * 100) : 0;
  }, [vendorTotal, vendorMaxMarks]);

  const vendorEvaluatedCount = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    if (!block) return 0;
    return (block.clauses || []).filter(cl => getMark(itemId, vendorId, cl.id) != null).length;
  }, [evalByItem, getMark]);

  const vendorFullyEvaluated = useCallback((itemId, vendorId) => {
    const block = evalByItem[itemId];
    if (!block) return false;
    return vendorEvaluatedCount(itemId, vendorId) === (block.clauses || []).length;
  }, [evalByItem, vendorEvaluatedCount]);

  const minPassFor = useCallback((itemId) => {
    const block = evalByItem[itemId];
    return block?.tech_evaluation?.minimum_passing_score ?? 60;
  }, [evalByItem]);

  const vendorQualified = useCallback((itemId, vendorId) => {
    return vendorScore(itemId, vendorId) >= minPassFor(itemId);
  }, [vendorScore, minPassFor]);

  const vendorVerdictClass = useCallback((itemId, vendorId) => {
    if (!vendorFullyEvaluated(itemId, vendorId)) return "pending";
    return vendorQualified(itemId, vendorId) ? "pass" : "fail";
  }, [vendorFullyEvaluated, vendorQualified]);

  // Vendors known to have responded for an item — taken from scores.
  const vendorsRespondingFor = useCallback((itemId) => {
    const block = evalByItem[itemId];
    if (!block) return [];
    const set = new Set((block.scores || []).map(s => Number(s.vendor_id)));
    return [...set];
  }, [evalByItem]);

  const itemTabState = useCallback((itemId) => {
    const block = evalByItem[itemId];
    if (!block) return "pending";
    const vendors = vendorsRespondingFor(itemId);
    if (vendors.length === 0) return "pending";
    const allDone = vendors.every(vid => vendorFullyEvaluated(itemId, vid));
    return allDone ? "done" : "pending";
  }, [evalByItem, vendorsRespondingFor, vendorFullyEvaluated]);

  const progress = useMemo(() => {
    let total = 0, done = 0;
    for (const it of items) {
      const block = evalByItem[it.id];
      if (!block) continue;
      const vendors = vendorsRespondingFor(it.id);
      const clauseCount = (block.clauses || []).length;
      total += vendors.length * clauseCount;
      done += vendors.reduce((sum, vid) => sum + vendorEvaluatedCount(it.id, vid), 0);
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [items, evalByItem, vendorsRespondingFor, vendorEvaluatedCount]);

  const qualifiedTally = useMemo(() => {
    let q = 0, dq = 0, pending = 0;
    for (const it of items) {
      const block = evalByItem[it.id];
      if (!block) continue;
      for (const vid of vendorsRespondingFor(it.id)) {
        const verdict = vendorVerdictClass(it.id, vid);
        if (verdict === "pass") q++;
        else if (verdict === "fail") dq++;
        else pending++;
      }
    }
    return { q, dq, pending };
  }, [items, evalByItem, vendorsRespondingFor, vendorVerdictClass]);

  // Active item header counts.
  const activeItemCounts = useMemo(() => {
    if (!activeItem) return { qualified: 0, notQualified: 0, pending: 0 };
    let qualified = 0, notQualified = 0, pending = 0;
    for (const vid of vendorsRespondingFor(activeItem.id)) {
      const verdict = vendorVerdictClass(activeItem.id, vid);
      if (verdict === "pass") qualified++;
      else if (verdict === "fail") notQualified++;
      else pending++;
    }
    return { qualified, notQualified, pending };
  }, [activeItem, vendorsRespondingFor, vendorVerdictClass]);

  const onSaveDraft = () => {
    // Scoring is persisted on blur; this is just feedback for the buyer.
    showToast("Draft saved");
  };

  const onSubmit = async () => {
    if (!contractId) return;
    if (progress.done < progress.total) return;
    setSubmitting(true);
    try {
      await submitTechEval(contractId);
      showToast("Evaluation submitted · routed to Tech Eval Approver");
      setTimeout(() => router.push(`/dashboard/buyer/rate-contracts/${contractId}`), 900);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !arc) {
    return <div style={{ padding: 24, color: "#6b7280" }}>Loading technical evaluation…</div>;
  }

  const submittedCount = (invitations || []).filter(i => i.invitation_status === "RESPONDED" || i.responded_at).length;
  const invitedCount = (invitations || []).length;

  return (
    <main className="main-body" style={{ paddingBottom: 108 }}>

      {/* HERO */}
      <section className="arc-hero">
        <div className="top">
          <div>
            <div className="eyebrow">Technical evaluation</div>
            <h1>
              <span>{arc.title}</span>
              <span className="num">#{arc.arc_number}</span>
              <span className="status-chip eval">In evaluation · Technical</span>
            </h1>
            <div className="sub">
              <span className="em">{arc.category_name || arc.category || "—"}</span>
              <span className="sep">·</span>
              <span>Single BU · {arc.hotel_name || arc.hotel_code || `Hotel #${arc.hotel_id ?? "—"}`}</span>
              <span className="sep">·</span>
              <span>{items.length} items requiring technical evaluation</span>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-sm" type="button"><RefreshIcon /> Request round 2</button>
            <button className="btn btn-sm" type="button"><FileIcon /> Export scores</button>
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell"><div className="k">Submission closed</div><div className="v">{formatDate(arc.submission_end_at)}</div></div>
          <div className="cell"><div className="k">Vendors submitted</div><div className="v"><span className="em">{submittedCount}</span> of {invitedCount}</div></div>
          <div className="cell"><div className="k">Eval round</div><div className="v">Round 1 · in progress</div></div>
          <div className="cell"><div className="k">Qualification model</div><div className="v">Score-based · per item</div></div>
          <div className="cell"><div className="k">Auto-routing</div><div className="v">Approved items → commercial eval</div></div>
        </div>
      </section>

      {/* INFO BANNER */}
      <div className="guide">
        <div className="g-ic"><InfoIcon /></div>
        <div>
          Score each vendor&apos;s response per clause within the weight. Vendors scoring ≥ <strong>minimum passing score</strong> on an item auto-qualify <strong>for that item only</strong> — a vendor can clear one item and not another within the same ARC. No manual override at the verdict step.
        </div>
      </div>

      {/* ITEM TABS */}
      <div className="item-tabs">
        <span className="lbl">Evaluate item</span>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`item-tab ${activeItemId === it.id ? "is-active" : ""}`}
            onClick={() => setActiveItemId(it.id)}
          >
            <span>{it.variant_name || `Variant #${it.product_variant_id ?? it.id}`}</span>
            <span className="it-code">{it.variant_slug || it.uom || ""}</span>
            <span className={`it-state ${itemTabState(it.id)}`}></span>
          </button>
        ))}
      </div>

      {/* MATRIX */}
      {activeItem && activeBlock ? (
        <div className="matrix-wrap">
          <div className="min-score-banner">
            <div className="ms-ic"><CheckCircleIcon /></div>
            <div>
              Item: <strong>{activeItem.variant_name || `Variant #${activeItem.product_variant_id ?? activeItem.id}`}</strong> · <span className="mono">{activeItem.variant_slug || activeItem.uom || ""}</span>
              · Minimum passing score: <strong>{minPassFor(activeItem.id)}%</strong>
              · Max marks: <strong><span className="mono">{vendorMaxMarks(activeItem.id)}</span></strong>
              · {(activeBlock.clauses || []).length} clauses
            </div>
            <div className="ms-right">
              <span><span className="em mono">{activeItemCounts.qualified}</span> qualified</span>
              <span>·</span>
              <span><span className="em mono">{activeItemCounts.notQualified}</span> not qualified</span>
              <span>·</span>
              <span><span className="em mono">{activeItemCounts.pending}</span> pending</span>
            </div>
          </div>

          <div className="matrix-scroll">
            {(activeBlock.clauses || []).length === 0 ? (
              <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
                No clauses configured for this item yet. Configure clauses via Setup to begin scoring.
              </div>
            ) : activeVendors.length === 0 ? (
              <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
                No vendor responses recorded yet. Once vendors respond to clauses, their answers appear here for scoring.
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
                            <span className="c-weight">weight <span className="mono">{cl.weight}</span> marks</span>
                            <span className="c-type">{cl.clause_type || cl.type || "text"}</span>
                          </div>
                        </div>
                      </td>
                      {activeVendors.map((v) => {
                        const resp = responseFor(v.vendor_id, cl.id);
                        const k = keyFor(activeItem.id, v.vendor_id, cl.id);
                        const markVal = (k in marks) ? marks[k] : (resp?.buyer_marks ?? null);
                        const remarkVal = (k in remarks) ? remarks[k] : (resp?.buyer_remark ?? "");
                        const fully = vendorFullyEvaluated(activeItem.id, v.vendor_id);
                        const disq = fully && !vendorQualified(activeItem.id, v.vendor_id);
                        const isSaving = savingKey === k;
                        return (
                          <td key={v.vendor_id} className={`score-cell ${disq ? "is-disq" : ""}`}>
                            <div className="resp">
                              {resp && (resp.vendor_response_text || resp.vendor_file_name) ? (
                                <div className="response-text">
                                  <span>{resp.vendor_response_text || "—"}</span>
                                  {resp.vendor_file_name ? (
                                    <span className="file-chip">
                                      <PaperclipIcon /> <span>{resp.vendor_file_name}</span>
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="response-text" style={{ color: "#9ca3af" }}>
                                  No response submitted
                                </div>
                              )}
                              <div className="mark-block">
                                <div className="mark-label">Your marks {isSaving ? "· saving…" : ""}</div>
                                <div className="mark-entry">
                                  <input
                                    type="number"
                                    max={cl.weight}
                                    min={0}
                                    value={markVal ?? ""}
                                    placeholder={String(cl.weight)}
                                    className={markVal != null ? "filled" : ""}
                                    disabled={!resp || !resp.response_id}
                                    onChange={(e) => setMarkLocal(activeItem.id, v.vendor_id, cl.id, e.target.value, cl.weight)}
                                    onBlur={() => persistCell(activeItem.id, v.vendor_id, cl.id)}
                                  />
                                  <span className="of-max">/ <span>{cl.weight}</span></span>
                                  <span className={`mark-hint ${markVal != null ? "done" : ""}`}>
                                    {markVal != null ? "✓ scored" : "pending"}
                                  </span>
                                </div>
                                <textarea
                                  className="remark-input"
                                  placeholder="Optional remark (visible to approver only)"
                                  value={remarkVal ?? ""}
                                  disabled={!resp || !resp.response_id}
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
        <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
          No items configured for technical evaluation on this contract.
        </div>
      )}

      {/* EDGE CASE WARNING */}
      <div className="guide warn">
        <div className="g-ic"><WarnTriIcon /></div>
        <div>
          If zero vendors clear the minimum passing score for an item after all rounds, that item enters <strong>Closed · No-Award</strong>. Items that do qualify proceed to commercial evaluation independently.
        </div>
      </div>

      {/* TOAST */}
      {toast ? (
        <div className="arc-toast">
          <span className="t-ic">✓</span><span>{toast}</span>
        </div>
      ) : null}

      {/* STICKY ACTION DOCK */}
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
            <Link href={`/dashboard/buyer/rate-contracts/${contractId}`} className="btn btn-secondary btn-sm">
              Back to contract
            </Link>
            <button className="btn btn-secondary btn-sm" type="button" onClick={onSaveDraft}>Save draft</button>
            <button
              className="btn btn-blue"
              type="button"
              disabled={submitting || progress.total === 0 || progress.done < progress.total}
              onClick={onSubmit}
            >
              {submitting ? "Submitting…" : "Submit evaluation"}
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
