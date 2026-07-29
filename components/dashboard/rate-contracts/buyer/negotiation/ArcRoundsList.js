// ArcRoundsList — inline rounds list + expandable per-round quotes.
// Mirrors NegotiationListPage.js card visual (arc_v2 tokens) + NegotiationRoundsModal.js per-round detail.
// Shown inside ArcNegotiationPanel within CommercialStage.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";

const STATUS_MAP = {
  PENDING_APPROVAL: { cls: "warn", label: "Pending approval" },
  ACTIVE:           { cls: "info", label: "Active" },
  ENDED:            { cls: "neutral", label: "Ended" },
  COMPLETED:        { cls: "success", label: "Completed" },
  CANCELLED:        { cls: "danger", label: "Rejected" },
  EXPIRED:          { cls: "danger", label: "Expired" },
};

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function scopeLabel(round) {
  if (round.arc_item_id && round.arc_item_name) return round.arc_item_name;
  if (round.arc_item_id) return `Item #${round.arc_item_id}`;
  if (round.products) {
    const prods = typeof round.products === "string" ? JSON.parse(round.products) : round.products;
    if (Array.isArray(prods) && prods.some((p) => p.is_arc_level)) return "ARC-level";
    if (Array.isArray(prods) && prods.length > 0) return `${prods.length} items`;
  }
  return "ARC-level";
}

// Live countdown helper (mirrors NegotiationBanner.js:32-62)
function useCountdown(endDateIso, effectiveStatus) {
  const [text, setText] = useState("");

  const compute = useCallback(() => {
    if (!endDateIso || effectiveStatus !== "ACTIVE") { setText(""); return; }
    const s = String(endDateIso);
    const end = new Date(s.includes("+") || s.includes("Z") ? s : s.replace(" ", "T") + "Z");
    const diff = end - Date.now();
    if (diff <= 0) { setText("Expired"); return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    setText(`${days}d ${hours}h ${mins}m left`);
  }, [endDateIso, effectiveStatus]);

  useEffect(() => {
    compute();
    if (effectiveStatus !== "ACTIVE") return;
    const iv = setInterval(compute, 60000);
    return () => clearInterval(iv);
  }, [compute, effectiveStatus]);

  return text;
}

function RoundCard({ round, arcId, canEvaluate, onAfterChange }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [quotes, setQuotes] = useState(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const countdown = useCountdown(round.end_date, round.effective_status);

  const status = STATUS_MAP[round.effective_status] || { cls: "neutral", label: round.effective_status };

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && quotes === null) {
      setQuotesLoading(true);
      try {
        const res = await ArcApi.getArcNegotiationRoundQuotes(arcId, round.id);
        const d = res?.data || {};
        setQuotes(Array.isArray(d.quotes) ? d.quotes : []);
      } catch { setQuotes([]); }
      finally { setQuotesLoading(false); }
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await ArcApi.closeArcNegotiationRound(arcId, round.id);
      setShowCloseConfirm(false);
      onAfterChange && onAfterChange();
    } catch { /* interceptor */ }
    finally { setClosing(false); }
  };

  const canClose = ["ACTIVE", "ENDED"].includes(round.effective_status) && canEvaluate;
  // The approve action belongs to the round's designated approver (server-computed
  // can_user_approve from the approval instance), NOT to anyone with the
  // arc-comm.evaluate permission — otherwise a non-approver is shown the button and
  // the backend correctly 400s them ("not an approver for this step").
  const canApprove = round.effective_status === "PENDING_APPROVAL" && !!round.can_user_approve;
  const pendingForOther = round.effective_status === "PENDING_APPROVAL" && !round.can_user_approve;

  return (
    <div className="arc-neg-round">
      {/* Close confirm inline */}
      {showCloseConfirm && (
        <div style={{ background: "var(--warn-soft,rgba(254,243,199,0.7))", border: "1px solid rgba(180,83,9,0.25)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", flex: 1 }}>Close this round? Vendors can no longer revise their rates.</span>
          <button className="btn btn-sm btn-warn" onClick={handleClose} disabled={closing}>{closing ? "Closing…" : "Confirm close"}</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowCloseConfirm(false)} disabled={closing}>Cancel</button>
        </div>
      )}

      <div className="arc-neg-round-head">
        <span className="arc-neg-round-num">Round {round.round_number}</span>
        <span className={"pill " + status.cls}>{status.label}</span>
        <span className="arc-neg-round-scope">· {scopeLabel(round)}</span>
      </div>

      <div className="arc-neg-round-meta">
        <span>Deadline: {fmtDate(round.end_date)}</span>
        {countdown && <span style={{ color: "#b45309", fontWeight: 600 }}>· {countdown}</span>}
        <span>· {(round.vendor_ids || []).length} vendor{(round.vendor_ids || []).length === 1 ? "" : "s"}</span>
        {round.target_price != null && <span>· Target {fmtINR(round.target_price)}</span>}
        {round.remarks && <span style={{ fontStyle: "italic", color: "var(--fg-4)" }}>· "{round.remarks}"</span>}
      </div>

      <div className="arc-neg-round-actions">
        {canApprove && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => router.push(`/dashboard/buyer/rate-contracts/${arcId}/negotiation/${round.id}/approve`)}
          >
            Review &amp; approve
          </button>
        )}
        {pendingForOther && (
          <span style={{ fontSize: 12.5, color: "var(--fg-3)", display: "inline-flex", alignItems: "center" }}>
            Pending approval by <strong style={{ marginLeft: 4 }}>{round.pending_approver || "the assigned approver"}</strong>
          </span>
        )}
        {canClose && !showCloseConfirm && (
          <button className="btn btn-sm btn-secondary" onClick={() => setShowCloseConfirm(true)}>
            Close round
          </button>
        )}
        <button className="arc-neg-expand-btn" onClick={handleExpand}>
          {expanded ? "Hide quotes ▴" : "View quotes ▾"}
        </button>
      </div>

      {/* Expandable quotes */}
      {expanded && (
        <div>
          {quotesLoading ? (
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", padding: "8px 0" }}>Loading quotes…</div>
          ) : !quotes || quotes.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", padding: "8px 0" }}>No revised quotes submitted yet.</div>
          ) : (
            <table className="arc-neg-round-quotes">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Item</th>
                  <th style={{ textAlign: "right" }}>Previous</th>
                  <th style={{ textAlign: "right" }}>Revised</th>
                  <th style={{ textAlign: "right" }}>Δ</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q, i) => {
                  const prev = q.previous_price != null ? Number(q.previous_price) : null;
                  const next = q.quoted_price != null ? Number(q.quoted_price) : null;
                  const delta = prev !== null && next !== null && prev !== 0
                    ? ((next - prev) / prev * 100).toFixed(1) : null;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{q.vendor_name || `Vendor ${q.vendor_id}`}</td>
                      <td style={{ color: "var(--fg-3)" }}>{q.arc_item_name || (q.arc_item_id ? `Item #${q.arc_item_id}` : "—")}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--fg-3)" }}>{fmtINR(prev)}</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtINR(next)}</td>
                      <td style={{ textAlign: "right", fontSize: 11, fontWeight: 600, color: delta !== null && Number(delta) < 0 ? "var(--success)" : delta !== null && Number(delta) > 0 ? "var(--danger)" : "var(--fg-3)" }}>
                        {delta !== null ? `${Number(delta) > 0 ? "+" : ""}${delta}%` : "—"}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--fg-3)" }}>
                        {q.submitted_at ? new Date(q.submitted_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function ArcRoundsList({ rounds = [], arcId, canEvaluate, onAfterChange }) {
  if (rounds.length === 0) return null;

  // Sort newest-first by round_number
  const sorted = [...rounds].sort((a, b) => (b.round_number || 0) - (a.round_number || 0));

  return (
    <div>
      {sorted.map((round) => (
        <RoundCard
          key={round.id}
          round={round}
          arcId={arcId}
          canEvaluate={canEvaluate}
          onAfterChange={onAfterChange}
        />
      ))}
    </div>
  );
}
