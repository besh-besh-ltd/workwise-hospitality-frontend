// RFQ lifecycle stage rail — the slim, connected JOURNEY driving the single
// authoritative RFQ workspace page. States come from the server-computed
// lifecycle (GET /rfq/:id/lifecycle): locked | active | complete | skipped.
// Selection ≠ current: users can open any unlocked stage (past stages render
// read-only). Cloned from ArcStageTimeline (same CSS / journey framing).

import { Fragment } from "react";

const I = {
  tick:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  lock:  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  pen:   <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg>,
  clock: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  bolt:  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  skip:  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 6 11 12 5 18" /><polyline points="13 6 19 12 13 18" /></svg>,
};

const SETTLED = ["complete", "skipped", "ended"];

// Default "done" line per stage when the server didn't give a summary.
const DONE_TEXT = {
  overview: "Published",
  technical: "Approved",
  "negotiation-award": "Finalized",
  "purchase-order": "Completed",
};

// Everything the renderer needs for one stage, from (state, reason, summary,
// action).
function describe(stage) {
  const action = stage.action || null;
  const yourCall = !!action?.required;
  const yourApproval = !!action?.can_approve;

  switch (stage.state) {
    case "complete":
      return { node: "done", icon: I.tick, tone: "ok", text: stage.summary || DONE_TEXT[stage.key] || "Done" };
    case "skipped":
      return { node: "skipped", icon: I.skip, tone: "neutral", text: "Skipped · not applicable" };
    case "ended":
      return { node: "ended", icon: I.skip, tone: "slate", text: stage.summary || "Closed" };
    case "locked":
      return { node: "locked", icon: I.lock, tone: "dim", text: "Not reached" };
    case "active":
    default: {
      if (yourCall) {
        return {
          node: "act", icon: I.bolt, tone: "act",
          text: yourApproval ? "Your approval needed" : "Action needed",
        };
      }
      const text = stage.summary
        || (stage.reason === "expired_pending" ? "Awaiting approval"
          : stage.key === "overview" ? "Collecting quotes"
          : stage.key === "technical" ? "Evaluation in progress"
          : stage.key === "negotiation-award" ? "Negotiation in progress"
          : "In progress");
      return { node: "current", icon: I.clock, tone: "info", text };
    }
  }
}

export default function RfqStageTimeline({ stages, selectedKey, onSelect }) {
  const described = stages.map((s) => ({ stage: s, d: describe(s) }));
  const journeyDone = stages.every((s) => SETTLED.includes(s.state));
  const journeyEnded = stages.some((s) => s.state === "ended");

  // Where the user stands: the LAST in-motion stage (matches default_stage).
  let hereIdx = -1;
  stages.forEach((s, i) => {
    if (["active", "partial"].includes(s.state)) hereIdx = i;
  });
  const here = hereIdx >= 0 ? described[hereIdx] : null;

  const settledCount = stages.filter((s) => SETTLED.includes(s.state)).length;
  const progressPct = journeyDone ? 100 : Math.round((settledCount / stages.length) * 100);

  return (
    <div className={`stage-rail-wrap${journeyDone ? " is-settled" : ""}`}>
      <div className="rail-head">
        <span className="rh-eyebrow">Lifecycle journey</span>
        <span className="rh-pos">
          {journeyEnded ? (
            <>Journey ended</>
          ) : journeyDone ? (
            <>Journey complete</>
          ) : here ? (
            <>Stage {hereIdx + 1} of {stages.length} — <span className={`em ${here.d.tone === "act" ? "act" : ""}`}>{here.stage.label}</span></>
          ) : (
            <>Stage 1 of {stages.length}</>
          )}
        </span>
      </div>

      <div className="stage-rail" role="tablist" aria-label="RFQ lifecycle stages">
        {described.map(({ stage, d }, idx) => {
          const locked = stage.state === "locked";
          const selected = stage.key === selectedKey;

          let rail = null;
          if (idx > 0) {
            const prevSettled = SETTLED.includes(stages[idx - 1].state);
            rail = !prevSettled ? "todo" : SETTLED.includes(stage.state) ? "done" : "flow";
          }

          const pct = d.frac != null ? Math.max(10, Math.min(95, Math.round(d.frac * 100))) : null;

          return (
            <Fragment key={stage.key}>
              {rail && <span className={`rail-seg rail-${rail}`} aria-hidden="true" />}
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                aria-disabled={locked}
                className={`stg n-${d.node}${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}${idx === hereIdx ? " is-here" : ""}`}
                title={`${stage.label} — ${d.text}`}
                onClick={() => { if (!locked) onSelect(stage.key); }}
              >
                <span className="stg-node" style={pct != null ? { "--frac": pct + "%" } : undefined}>
                  <span className="stg-node-ic">{d.icon}</span>
                </span>
                <span className="stg-txt">
                  <span className="stg-title">{stage.label}</span>
                  <span className={`stg-status t-${d.tone}`}>{d.text}</span>
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>

      <div className="rail-progress" aria-hidden="true">
        <span style={{ width: progressPct + "%" }} />
      </div>
    </div>
  );
}
