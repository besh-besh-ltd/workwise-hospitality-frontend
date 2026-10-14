// One confirm dialog for every PR action that asks for text: cancel PR /
// cancel line (reason), send back (note), reject (reason), approve and
// withdraw (optional / no text). Says what the action does before it runs.
// Render it inside the page's .main-body so the arc_v2 form styles apply.

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/** The arc_v2 modal shell. Escape and a backdrop click close it unless `busy`. */
export function PrModal({ title, onClose, busy, footer, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="arc-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div className="arc-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div><h3>{title}</h3></div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export default function PrReasonModal({
  title,
  explain,
  label = "Reason",
  required = true,
  maxLength = 2000,
  withText = true,
  placeholder,
  confirmLabel,
  tone = "danger",
  busy = false,
  error = "",
  onConfirm,
  onClose,
}) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const tooLong = text.length > maxLength;
  const blocked = busy || tooLong || (withText && required && !trimmed);

  return (
    <PrModal
      title={title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className={`btn btn-${tone}`} disabled={blocked} onClick={() => onConfirm(trimmed || undefined)}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {explain && <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>{explain}</p>}
      {withText && (
        <div>
          <label className="label" htmlFor="pr-reason-text">
            {label} {required ? <span className="req">*</span> : <span className="text-fg-3">(optional)</span>}
          </label>
          <textarea
            id="pr-reason-text"
            aria-label={label}
            className="textarea"
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="fs-11" style={{ marginTop: 4, textAlign: "right", color: tooLong ? "var(--danger)" : "var(--fg-4)" }}>
            {text.length}/{maxLength}
          </div>
        </div>
      )}
      {error && <div role="alert" className="guide danger" style={{ marginTop: 10 }}><div>{error}</div></div>}
    </PrModal>
  );
}
