// VendorArcNegotiationBanner — per-item active-round banner for vendor quote page.
// Mirrors NegotiationBanner.js ACTIVE treatment (amber-tinted, countdown, per-item input).
// Self-hides when no ACTIVE round exists. Rate-only V1 (no gst_pct/charges).

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";
import { parseNegotiationTime } from "@/utils/negotiationTime";

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

// Countdown hook. It used to carry its own copy of the naive-UTC parser
// (as did five other files); utils/negotiationTime is the one now.
function useCountdown(deadlineIso) {
  const [text, setText] = useState("");
  const compute = useCallback(() => {
    if (!deadlineIso) { setText(""); return; }
    const end = parseNegotiationTime(deadlineIso);
    if (!end) { setText(""); return; }
    const diff = end.getTime() - Date.now();
    if (diff <= 0) { setText("Round ended"); return; }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    setText(`${days}d ${hours}h ${mins}m left`);
  }, [deadlineIso]);

  useEffect(() => {
    compute();
    const iv = setInterval(compute, 60000);
    return () => clearInterval(iv);
  }, [compute]);

  return text;
}

// Per-round item row
function BannerItem({ item, roundId, onSubmitted }) {
  const [rateInput, setRateInput] = useState("");
  const [posting, setPosting] = useState(false);
  const isExpired = item.is_expired || !item.is_active;
  const alreadySubmitted = item.has_submitted_quote;
  const deadline = item.deadline;
  const countdownText = useCountdown(deadline);
  const roundEnded = isExpired || countdownText === "Round ended";

  const handleSubmit = async () => {
    const rate = Number(rateInput);
    if (!rate || rate <= 0) { toast.error("Enter a valid rate greater than 0."); return; }
    setPosting(true);
    try {
      await ArcApi.submitVendorArcNegotiationQuote(roundId, { arc_item_id: item.arc_item_id, rate });
      toast.success("Revised rate submitted");
      onSubmitted();
    } catch { /* interceptor */ }
    finally { setPosting(false); }
  };

  return (
    <div className="arc-neg-banner-item">
      <div className="arc-neg-banner-item-name">
        {item.item_name || `Item #${item.arc_item_id}`}
        {item.rate_source === "NEGOTIATED" && (
          <span className="neg-rate-tag" style={{ marginLeft: 8 }}>Negotiated</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="arc-neg-banner-item-rate">
          Current: <span style={{ fontWeight: 600, color: "var(--fg)" }}>{fmtINR(item.current_rate)}</span>
        </span>
        {item.target_rate != null && (
          <span className="arc-neg-banner-item-hint">Target ₹{Number(item.target_rate).toLocaleString("en-IN")}</span>
        )}
        {alreadySubmitted ? (
          <span className="pill success" style={{ fontSize: 12 }}>Revised ✓</span>
        ) : roundEnded ? (
          <input
            type="number"
            className="arc-neg-banner-input"
            value=""
            disabled
            placeholder="Round ended"
            style={{ opacity: 0.5 }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>₹</span>
            <input
              type="number"
              min={0}
              step="any"
              className="arc-neg-banner-input"
              placeholder="Revised rate"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              disabled={posting}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={handleSubmit}
              disabled={posting || !rateInput}
            >
              {posting ? "Submitting…" : "Submit revised rate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Per-active-round section
function RoundSection({ round, onRefetch }) {
  const deadlineIso = round.end_date || (round.items && round.items[0]?.deadline);
  const countdown = useCountdown(deadlineIso);

  const handleSubmitted = async () => {
    onRefetch();
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="arc-neg-banner-head">
        <div className="arc-neg-banner-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12l7-7 7 7" /></svg>
          Negotiation round {round.round_number}
          {countdown && (
            <span className="arc-neg-banner-countdown">{countdown}</span>
          )}
        </div>
        <div className="arc-neg-banner-meta">
          {round.target_price != null && (
            <span>Target: <span className="arc-neg-banner-target">{fmtINR(round.target_price)}</span></span>
          )}
          {round.remarks && <span style={{ fontStyle: "italic" }}>"{round.remarks}"</span>}
        </div>
      </div>
      <div className="arc-neg-banner-items">
        {(round.items || []).map((item) => (
          <BannerItem
            key={`${round.round_id}-${item.arc_item_id}`}
            item={item}
            roundId={round.round_id}
            onSubmitted={handleSubmitted}
          />
        ))}
        {(!round.items || round.items.length === 0) && (
          <div style={{ fontSize: 12.5, color: "var(--fg-3)", paddingTop: 8 }}>No items in this round.</div>
        )}
      </div>
    </div>
  );
}

export default function VendorArcNegotiationBanner({ arcId, onAfterSubmit }) {
  const [activeRounds, setActiveRounds] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    if (!arcId) return;
    cancelledRef.current = false;
    try {
      const res = await ArcApi.getVendorArcNegotiations(arcId);
      if (cancelledRef.current) return;
      const list = Array.isArray(res?.data) ? res.data : [];
      // Keep rounds where the round itself OR any item is_active
      const active = list.filter((r) => {
        if (r.effective_status === "ACTIVE") return true;
        return Array.isArray(r.items) && r.items.some((it) => it.is_active);
      });
      setActiveRounds(active);
    } catch { /* interceptor */ }
    finally {
      if (!cancelledRef.current) setLoaded(true);
    }
  }, [arcId]);

  useEffect(() => {
    load();
    return () => { cancelledRef.current = true; };
  }, [load]);

  const handleRefetch = useCallback(async () => {
    await load();
    onAfterSubmit && onAfterSubmit();
  }, [load, onAfterSubmit]);

  // Self-hide when no active rounds
  if (!loaded || activeRounds.length === 0) return null;

  return (
    <div className="arc-neg-banner">
      {activeRounds.map((round) => (
        <RoundSection
          key={round.round_id}
          round={round}
          onRefetch={handleRefetch}
        />
      ))}
    </div>
  );
}
