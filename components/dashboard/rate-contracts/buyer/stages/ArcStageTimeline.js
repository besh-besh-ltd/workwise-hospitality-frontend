// ARC lifecycle stage rail — a slim, connected JOURNEY driving the single
// authoritative buyer page. States come from the server-computed lifecycle
// (GET /v1/arc-v2/:id/lifecycle): locked | active | partial | complete |
// skipped | ended. Selection ≠ current: users can open any unlocked stage
// (past stages render read-only).
//
// Journey framing (compact, one card):
//   · an orientation row on top — "Lifecycle journey · Stage 4 of 5 — Awarding"
//     — so the user always knows where they stand
//   · numbered milestones connected by a thread: green where settled,
//     animated + arrow-tipped flowing into the stage being worked, dashed
//     beyond it
//   · a thin progress track along the bottom shows how much of the journey
//     is behind you
//   · status text per stage: green = done/healthy, amber = needs work,
//     breathing amber chip = YOUR decision, blue = moving elsewhere,
//     grey = locked/skipped · nothing moves once nothing is left to do

import { Fragment } from "react";

const I = {
  tick:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  lock:  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  flag:  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
  pen:   <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></svg>,
  clock: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  bolt:  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  skip:  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 6 11 12 5 18" /><polyline points="13 6 19 12 13 18" /></svg>,
};

const SETTLED = ["complete", "skipped", "ended"];

// Everything the renderer needs for one stage, derived from (state, reason,
// counts, approval): the node treatment, the status line, the partial fraction.
function describe(stage) {
  const c = stage.counts || {};
  const ap = stage.approval || null;
  const yourCall = !!ap?.can_user_approve && ap?.status === "PENDING";

  switch (stage.state) {
    case "complete": {
      const text =
        stage.key === "overview" ? "Window closed"
        : stage.key === "technical" ? "Approved"
        : stage.key === "commercial" ? "Finalized"
        : stage.key === "awarding" ? "Contracts generated"
        : "Done";
      return { node: "done", icon: I.tick, text, tone: "ok" };
    }
    case "skipped":
      return { node: "skipped", icon: I.skip, text: "Skipped · no clauses", tone: "neutral" };
    case "locked": {
      const text =
        stage.reason === "window_open" ? "Opens after quotes close"
        : stage.reason === "technical_incomplete" ? "After Technical"
        : stage.reason === "commercial_incomplete" ? "After Commercial"
        : "Not reached";
      return { node: "locked", icon: I.lock, text, tone: "dim" };
    }
    case "ended": {
      const text =
        stage.reason === "terminated" ? "Terminated"
        : stage.reason === "closed_no_award" ? "Closed · no award"
        : "Expired";
      return { node: "ended", icon: I.flag, text, tone: "slate" };
    }
    case "partial": {
      if (stage.reason === "awaiting_approval") {
        return yourCall
          ? { node: "act", icon: I.bolt, text: "Your decision needed", tone: "act" }
          : { node: "wait", icon: I.clock, text: "With approvers", tone: "info" };
      }
      if (stage.reason === "sent_back") {
        return { node: "partial", icon: I.pen, text: "Sent back · rework", tone: "warn", frac: 0.66 };
      }
      if (stage.key === "technical") {
        const total = Number(c.vendors_in_play) || 0;
        const done = Number(c.vendors_fully_scored) || 0;
        return {
          node: "partial", icon: I.pen, tone: "warn",
          text: total ? `${done} of ${total} vendors scored` : "Scoring underway",
          frac: total ? done / total : 0.4,
        };
      }
      // commercial · awaiting_finalize
      const total = Number(c.items_total) || 0;
      const done = Number(c.items_allocated) || 0;
      return {
        node: "partial", icon: I.pen, tone: "warn",
        text: total ? `${done}/${total} allocated · finalize` : "Allocation underway",
        frac: total ? done / total : 0.8,
      };
    }
    case "active":
    default: {
      if (stage.key === "overview") {
        if (stage.reason === "draft") return { node: "current", icon: I.pen, text: "Draft", tone: "neutral" };
        const inv = Number(c.invited) || 0, sub = Number(c.submitted) || 0;
        return { node: "current", icon: I.clock, text: inv ? `Window open · ${sub}/${inv} quotes` : "Window open", tone: "info" };
      }
      if (stage.key === "technical") {
        if (stage.reason === "approval_rejected") return { node: "act", icon: I.pen, text: "Rejected · re-evaluate", tone: "danger" };
        return { node: "current", icon: I.pen, text: "Scoring in progress", tone: "warn" };
      }
      if (stage.key === "commercial") {
        if (stage.reason === "sent_back") return { node: "act", icon: I.pen, text: "Sent back · rework", tone: "act" };
        return { node: "current", icon: I.pen, text: "Allocation in progress", tone: "warn" };
      }
      if (stage.key === "awarding") {
        if (stage.reason === "preview") return { node: "current", icon: I.clock, text: "Preview · pending finalize", tone: "neutral" };
        return yourCall
          ? { node: "act", icon: I.bolt, text: "Your decision needed", tone: "act" }
          : { node: "wait", icon: I.clock, text: "Committee in review", tone: "info" };
      }
      // active stage
      if (stage.reason === "live") return { node: "live", icon: I.tick, text: "Contract live", tone: "ok" };
      return { node: "current", icon: I.clock, text: "Awaiting vendor signatures", tone: "info" };
    }
  }
}

export default function ArcStageTimeline({ stages, selectedKey, onSelect }) {
  const described = stages.map((s) => ({ stage: s, d: describe(s) }));
  // Nothing left to do anywhere → the whole journey settles (calm, no motion).
  const journeyDone = stages.every((s) => SETTLED.includes(s.state) || (s.key === "active" && s.reason === "live"));
  const journeyEnded = stages.some((s) => s.state === "ended");

  // Where the user stands: the LAST in-motion stage (matches default_stage).
  let hereIdx = -1;
  stages.forEach((s, i) => { if (["active", "partial"].includes(s.state)) hereIdx = i; });
  const here = hereIdx >= 0 ? described[hereIdx] : null;

  // Journey progress = settled stages (a live contract counts as journey done).
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
            <>Journey complete — <span className="em ok">contract live</span></>
          ) : here ? (
            <>Stage {hereIdx + 1} of {stages.length} — <span className={`em ${here.d.tone === "act" ? "act" : ""}`}>{here.stage.label}</span></>
          ) : (
            <>Stage 1 of {stages.length}</>
          )}
        </span>
      </div>

      <div className="stage-rail" role="tablist" aria-label="ARC lifecycle stages">
        {described.map(({ stage, d }, idx) => {
          const locked = stage.state === "locked";
          const selected = stage.key === selectedKey;

          // Connector ENTERING this node, judged by the journey to its left:
          //   done → solid green · flow → animated into the working stage · todo → dashed
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
