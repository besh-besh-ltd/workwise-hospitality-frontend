import React, { useCallback } from "react";
import { Check, Link2, ShieldAlert, Sparkles } from "lucide-react";

/**
 * The shared AI vocabulary. Every one of the five features is built from these
 * five pieces, which is what makes them read as one assistant rather than five
 * unrelated buttons that happen to say "AI".
 */

/* ── the card every feature lives in ─────────────────────────── */
export const AiPanel = ({ title, blurb, icon: Icon = Sparkles, action, footer, children }) => (
  <section className="ai-panel">
    <div className="ai-panel-head">
      <div className="ai-panel-title">
        <span className="ai-panel-ic"><Icon size={16} strokeWidth={1.9} /></span>
        <div>
          <h3>
            {title}
            <span className="ai-beta">Beta</span>
          </h3>
          {blurb && <p className="ai-panel-sub">{blurb}</p>}
        </div>
      </div>
      {action}
    </div>
    {children && <div className="ai-panel-body">{children}</div>}
    {footer && <div className="ai-panel-foot">{footer}</div>}
  </section>
);

/* ── the steps ticking past while it works ───────────────────── */
export const ReasoningTrace = ({ steps }) => (
  <div className="ai-trace">
    {steps.map((s, i) => (
      <div key={i} className={`ai-step ${s.state}`}>
        <span className="ai-step-dot">
          {s.state === "done" && <Check size={9} strokeWidth={3.2} />}
        </span>
        <span className="ai-step-label">
          {s.label}
          {s.state !== "pending" && s.detail && <span className="ai-step-detail">{s.detail}</span>}
        </span>
      </div>
    ))}
  </div>
);

/**
 * A citation you can click. Scrolls its source into view on the same page and
 * flashes it — the rule being that no claim the assistant makes is allowed to
 * be unverifiable from the screen you are already looking at.
 */
export const EvidenceChip = ({ targetId, label, title }) => {
  const jump = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const el = document.getElementById(targetId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("ev-target");
      // Force a reflow so the animation replays on a repeat click.
      void el.offsetWidth;
      el.classList.add("ev-target");
    },
    [targetId]
  );

  return (
    <button type="button" className="ev-chip" onClick={jump} title={title || `Jump to ${label}`}>
      <Link2 size={9} strokeWidth={2.6} />
      {label}
    </button>
  );
};

/* ── how sure it is, stated rather than implied ──────────────── */
export const ConfidenceBar = ({ value, label = "Confidence" }) => {
  const tone = value >= 85 ? "high" : value >= 65 ? "" : "low";
  return (
    <div className="conf">
      <span className="conf-label">{label}</span>
      <span className="conf-track">
        <span className={`conf-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
      <span className="conf-val">{value}%</span>
    </div>
  );
};

/* ── the thing it will not decide on its own ─────────────────── */
export const HumanCheckFlag = ({ children = "Needs your check" }) => (
  <span className="human-check">
    <ShieldAlert size={11} strokeWidth={2.2} />
    {children}
  </span>
);

/* ── a 0–100 factor bar, used in score breakdowns ────────────── */
export const ScoreRow = ({ name, value, display }) => {
  const tone = value >= 80 ? "good" : value >= 55 ? "mid" : "bad";
  return (
    <div className="score-row">
      <div className="score-top">
        <span className="score-name">{name}</span>
        <span className="score-num">{display ?? value}</span>
      </div>
      <span className="score-track">
        <span className={`score-bar ${tone}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </span>
    </div>
  );
};
