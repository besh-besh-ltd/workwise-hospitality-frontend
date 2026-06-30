// ArcApproveRoundPanel — routed approve/reject page for an ARC negotiation round.
// Mirrors ApproveRoundPage.js: load round + quotes, show hero + comment box + Approve/Reject.
// Uses arc_v2.css tokens only.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";

const STATUS_MAP = {
  PENDING_APPROVAL: { cls: "warn", label: "Pending approval" },
  ACTIVE:           { cls: "info", label: "Active" },
  ENDED:            { cls: "neutral", label: "Ended" },
  COMPLETED:        { cls: "success", label: "Completed" },
  CANCELLED:        { cls: "danger", label: "Rejected" },
  EXPIRED:          { cls: "danger", label: "Expired" },
};

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
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

export default function ArcApproveRoundPanel({ arcId, roundId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [round, setRound] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [comment, setComment] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const returnUrl = `/dashboard/buyer/rate-contracts/${arcId}?stage=commercial`;

  const load = useCallback(async () => {
    if (!arcId || !roundId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [roundsRes, quotesRes] = await Promise.all([
        ArcApi.getArcNegotiationRounds(arcId),
        ArcApi.getArcNegotiationRoundQuotes(arcId, roundId),
      ]);
      const rounds = Array.isArray(roundsRes?.data) ? roundsRes.data : [];
      const found = rounds.find((r) => String(r.id) === String(roundId));
      setRound(found || null);
      const qData = quotesRes?.data || {};
      setQuotes(Array.isArray(qData.quotes) ? qData.quotes : []);
    } catch (err) {
      setLoadError(err?.message || "Failed to load round data");
    } finally {
      setLoading(false);
    }
  }, [arcId, roundId]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await ArcApi.approveArcNegotiationRound(arcId, roundId, comment.trim() ? { comment: comment.trim() } : {});
      toast.success(`Round ${round?.round_number} approved`);
      router.push(returnUrl);
    } catch (e) { /* interceptor */ } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error("A comment is required when rejecting.");
      return;
    }
    setRejecting(true);
    try {
      await ArcApi.rejectArcNegotiationRound(arcId, roundId, { comment: comment.trim() });
      toast.success(`Round ${round?.round_number} rejected`);
      router.push(returnUrl);
    } catch (e) { /* interceptor */ } finally {
      setRejecting(false);
    }
  };

  const busy = approving || rejecting;

  const roundStatus = useMemo(() => {
    if (!round) return null;
    return STATUS_MAP[round.effective_status] || { cls: "neutral", label: round.effective_status };
  }, [round]);

  if (loading) {
    return (
      <main className="main-body">
        <div className="arc-neg-page">
          <div className="empty-state">
            <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
            <span style={{ marginLeft: 10 }}>Loading round…</span>
          </div>
        </div>
      </main>
    );
  }

  if (loadError || !round) {
    return (
      <main className="main-body">
        <div className="arc-neg-page">
          <div className="empty-state">
            <p style={{ fontWeight: 700 }}>{loadError ? "Unable to load round" : "Round not found"}</p>
            <p style={{ fontSize: 13 }}>{loadError || "The round may not exist or you may not have access."}</p>
            <button className="btn btn-secondary" onClick={() => router.push(returnUrl)} style={{ marginTop: 12 }}>Back</button>
          </div>
        </div>
      </main>
    );
  }

  const isPendingApproval = round.effective_status === "PENDING_APPROVAL";

  return (
    <main className="main-body" style={{ paddingBottom: 80 }}>
      <div className="arc-neg-page">
        {/* Hero */}
        <div className="arc-neg-page-hero">
          <div className="arc-neg-page-eyebrow">Negotiation approval</div>
          <h1 className="arc-neg-page-title">
            Review round {round.round_number}
          </h1>
          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
            Approve to make the round live for vendors, or reject (with a comment) to cancel it.
          </div>
        </div>

        {!isPendingApproval && (
          <div className="guide warn" style={{ alignItems: "center" }}>
            <div className="g-ic" style={{ marginTop: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            </div>
            <div>
              <strong>Already decided.</strong> This round is <strong>{roundStatus?.label}</strong> — no further approval action is needed.
              {" "}<button className="btn btn-sm btn-ghost" onClick={() => router.push(returnUrl)} style={{ display: "inline" }}>Back to commercial evaluation</button>
            </div>
          </div>
        )}

        {/* Round detail card */}
        <div className="arc-neg-approve-block">
          <div className="arc-neg-approve-head">
            <div>
              <div className="arc-neg-approve-title">
                Round {round.round_number}
                {" "}
                {roundStatus && (
                  <span className={"pill " + roundStatus.cls} style={{ fontSize: 12, marginLeft: 6 }}>{roundStatus.label}</span>
                )}
              </div>
              <div className="arc-neg-approve-meta">
                <span>Scope: <strong>{scopeLabel(round)}</strong></span>
                {" · "}
                <span>Deadline: <strong>{fmtDate(round.end_date)}</strong></span>
                {" · "}
                <span><strong>{(round.vendor_ids || []).length}</strong> vendor{(round.vendor_ids || []).length === 1 ? "" : "s"} invited</span>
                {round.target_price != null && <>{" · "}<span>Target: <strong>{fmtINR(round.target_price)}</strong></span></>}
              </div>
              {round.remarks && (
                <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 6, fontStyle: "italic" }}>
                  "{round.remarks}"
                </div>
              )}
            </div>
          </div>

          {/* Vendor targets if any */}
          {quotes.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Submitted quotes so far
              </div>
              <table className="arc-neg-round-quotes">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Item</th>
                    <th style={{ textAlign: "right" }}>Previous rate</th>
                    <th style={{ textAlign: "right" }}>Revised rate</th>
                    <th style={{ textAlign: "right" }}>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q, i) => {
                    const prev = q.previous_price != null ? Number(q.previous_price) : null;
                    const next = q.quoted_price != null ? Number(q.quoted_price) : null;
                    const delta = prev !== null && next !== null ? ((next - prev) / prev * 100).toFixed(1) : null;
                    return (
                      <tr key={i}>
                        <td>{q.vendor_name || `Vendor ${q.vendor_id}`}</td>
                        <td style={{ color: "var(--fg-3)" }}>{q.arc_item_name || (q.arc_item_id ? `Item #${q.arc_item_id}` : "ARC-level")}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--fg-3)" }}>{fmtINR(prev)}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtINR(next)}</td>
                        <td style={{ textAlign: "right", color: delta !== null && Number(delta) < 0 ? "var(--success)" : "var(--danger)" }}>
                          {delta !== null ? `${Number(delta) > 0 ? "+" : ""}${delta}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Comment box */}
          {isPendingApproval && (
            <div>
              <div className="arc-neg-comment-label">
                Comment <span style={{ color: "var(--fg-4)", fontWeight: 400 }}>(required when rejecting)</span>
              </div>
              <textarea
                className="arc-neg-comment-area"
                placeholder="Add a comment for the record…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={busy}
              />
            </div>
          )}

          {/* Action buttons */}
          {isPendingApproval && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={handleReject}
              >
                {rejecting ? "Rejecting…" : "Reject"}
              </button>
              <button
                className="btn btn-success btn-sm"
                disabled={busy}
                onClick={handleApprove}
              >
                {approving ? "Approving…" : "Approve"}
              </button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => router.push(returnUrl)}>
                Cancel
              </button>
            </div>
          )}
          {!isPendingApproval && (
            <button className="btn btn-secondary btn-sm" onClick={() => router.push(returnUrl)}>
              Back to commercial evaluation
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
