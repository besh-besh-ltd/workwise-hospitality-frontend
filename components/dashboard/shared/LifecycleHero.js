// LifecycleHero — the prominent dark lifecycle header shared by the buyer RFQ
// details page and the ARC (rate-contract) details page, so both read as one
// standardized world rather than two. Built on the global arc_v2.css `.arc-hero`
// primitives (dark gradient, status-chip, .sub, .hero-actions, .hero-detail-grid)
// with a back chip + utilities folded inside the hero (top-right), and a
// metadata grid. Distinct data, identical structure + style.
//
// Props:
//   eyebrow  — small uppercase kicker (e.g. "RFQ · Lifecycle")
//   title    — main title string
//   status   — { label, tone }  tone ∈ active|draft|floated|eval|committee|expiring|expired|"" (status-chip variants)
//   idText   — monospace id (e.g. "#535906")
//   copy     — optional { copied, onCopy, label } → renders a copy button beside the id
//   sub      — React node rendered inside `.sub` (use <span className="em"> / "sep" / kv)
//   back     — optional { label, href } | { label, onClick } → back chip top-left
//   actions  — optional React node rendered in `.hero-actions` (buttons should use the GLOBAL `btn`/`btn-sm` classes so they pick up the on-dark treatment)
//   meta     — optional [{ label, value }] → the white-on-dark detail grid
import Link from "next/link";
import { ArrowLeft, Copy as CopyIcon, Check } from "lucide-react";

const BACK_STYLE = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "4px 11px 4px 8px", borderRadius: 7,
  background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)",
  color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: 500,
  cursor: "pointer", textDecoration: "none", lineHeight: 1.2,
};

const COPY_STYLE = {
  display: "inline-grid", placeItems: "center", width: 24, height: 24,
  borderRadius: 6, background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.85)",
  cursor: "pointer", flexShrink: 0,
};

export default function LifecycleHero({ eyebrow, title, status, idText, copy, sub, back, actions, meta }) {
  const backChip = !back ? null : back.href ? (
    <Link href={back.href} className="lh-back" style={BACK_STYLE}>
      <ArrowLeft size={13} strokeWidth={2} />{back.label}
    </Link>
  ) : (
    <button type="button" className="lh-back" style={BACK_STYLE} onClick={back.onClick}>
      <ArrowLeft size={13} strokeWidth={2} />{back.label}
    </button>
  );

  return (
    <section className="arc-hero">
      <div className="top">
        <div style={{ minWidth: 0, flex: 1 }}>
          {(backChip || eyebrow) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 9 }}>
              {backChip}
              {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            </div>
          )}
          <h1>
            {title && <span>{title}</span>}
            {status?.label && <span className={`status-chip ${status.tone || ""}`}>{status.label}</span>}
            {idText && <span className="num">{idText}</span>}
            {copy && (
              <button
                type="button"
                onClick={copy.onCopy}
                disabled={copy.copied}
                aria-label={copy.copied ? "Copied" : (copy.label || "Copy")}
                style={COPY_STYLE}
              >
                {copy.copied ? <Check size={13} strokeWidth={2} /> : <CopyIcon size={13} strokeWidth={2} />}
              </button>
            )}
          </h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {actions && <div className="hero-actions">{actions}</div>}
      </div>

      {Array.isArray(meta) && meta.length > 0 && (
        <div className="hero-detail-grid">
          {meta.map((m, i) => (
            <div className="cell" key={m.key || i}>
              <div className="k">{m.label}</div>
              <div className="v">{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
