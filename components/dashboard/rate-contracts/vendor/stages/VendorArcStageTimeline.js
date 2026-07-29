// Vendor-side ARC lifecycle stage rail. Mirrors the buyer's ArcStageTimeline
// structure and CSS classes verbatim, but with vendor-framed status text so
// buyer-internal nouns ("Scoring in progress", "Allocation in progress",
// "Your decision needed" for approvers) never surface here.
//
// Stage keys are the same 5 as the buyer state machine
// (overview → technical → commercial → awarding → active). Labels and status
// text are vendor-specific (set by the server projector):
//   overview   → "Tender & terms"
//   technical  → "Technical envelope"
//   commercial → "Your quote"
//   awarding   → "Award & sign"
//   active     → "Active contract"
//
// Props: stages (vendor-projected, from GET /vendor/requests/:arcId/lifecycle),
//        selectedKey, onSelect — identical to ArcStageTimeline props.

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

// Derive the display descriptor from a vendor-projected stage. The `vendor_action`
// field from the server drives the "your move" highlight; we never use buyer-
// internal state like scoring counts or approval objects.
function describe(stage) {
  const action = stage.vendor_action || "none";

  switch (stage.state) {
    case "complete": {
      const text =
        stage.key === "overview" ? "Terms reviewed"
        : stage.key === "technical"
          ? (stage.reason === "no_tech_required" ? "Not required" : "Envelope sealed")
        : stage.key === "commercial"
          ? (stage.reason === "quote_submitted" ? "Quote submitted" : "Done")
        : stage.key === "awarding"
          ? (stage.reason === "not_awarded" ? "Not awarded"
            : stage.reason === "declined" ? "Declined"
            : stage.reason === "active" || stage.reason === "expiring_soon" || stage.reason === "expired" ? "Awarded"
            : "Contract signed")
        : "Done";
      return { node: "done", icon: I.tick, text, tone: "ok" };
    }
    case "skipped":
      return { node: "skipped", icon: I.skip, text: "Not required", tone: "neutral" };
    case "locked":
      return { node: "locked", icon: I.lock, text: "Not reached yet", tone: "dim" };
    case "ended": {
      const text =
        stage.reason === "terminated" ? "Terminated"
        : stage.reason === "expired" ? "Expired"
        : stage.reason === "declined" ? "Declined"
        : "Ended";
      return { node: "ended", icon: I.flag, text, tone: "slate" };
    }
    case "active":
    default: {
      if (stage.key === "overview") {
        return action === "accept_terms"
          ? { node: "current", icon: I.pen, text: "Awaiting your review", tone: "warn" }
          : { node: "current", icon: I.clock, text: "Window open", tone: "info" };
      }
      if (stage.key === "technical") {
        return action === "submit_tech"
          ? { node: "act", icon: I.bolt, text: "Your response needed", tone: "act" }
          : { node: "current", icon: I.clock, text: "Under evaluation", tone: "info" };
      }
      if (stage.key === "commercial") {
        return action === "submit_quote"
          ? { node: "act", icon: I.bolt, text: "Awaiting your quote", tone: "act" }
          : { node: "current", icon: I.clock, text: "Quote window open", tone: "info" };
      }
      if (stage.key === "awarding") {
        return action === "sign_contract"
          ? { node: "act", icon: I.bolt, text: "Awarded — sign contract", tone: "act" }
          : { node: "wait", icon: I.clock, text: "Awaiting award decision", tone: "info" };
      }
      // active stage
      if (stage.reason === "live") return { node: "live", icon: I.tick, text: "Contract live", tone: "ok" };
      return { node: "current", icon: I.clock, text: "Awaiting signature", tone: "info" };
    }
  }
}

export default function VendorArcStageTimeline({ stages, selectedKey, onSelect }) {
  const described = stages.map((s) => ({ stage: s, d: describe(s) }));
  const journeyDone = stages.every((s) => SETTLED.includes(s.state) || (s.key === "active" && s.reason === "live"));
  const journeyEnded = stages.some((s) => s.state === "ended");

  // Where the vendor stands: last in-motion stage.
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
        <span className="rh-eyebrow">Your journey</span>
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

      <div className="stage-rail" role="tablist" aria-label="Rate contract journey stages">
        {described.map(({ stage, d }, idx) => {
          const locked = stage.state === "locked";
          const selected = stage.key === selectedKey;

          let rail = null;
          if (idx > 0) {
            const prevSettled = SETTLED.includes(stages[idx - 1].state);
            rail = !prevSettled ? "todo" : SETTLED.includes(stage.state) ? "done" : "flow";
          }

          return (
            <Fragment key={stage.key}>
              {rail && <span className={`rail-seg rail-${rail}`} aria-hidden="true" />}
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                aria-disabled={locked}
                className={`stg n-${d.node}${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}${idx === hereIdx ? " is-here" : ""}${stage.vendor_action === "accept_terms" && stage.state !== "complete" ? " is-action" : ""}`}
                title={`${stage.label} — ${d.text}`}
                onClick={() => { if (!locked) onSelect(stage.key); }}
              >
                <span className="stg-node">
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
