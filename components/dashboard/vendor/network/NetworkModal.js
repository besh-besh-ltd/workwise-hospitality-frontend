import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * The arc_v2 modal shell (.arc-modal-backdrop / .arc-modal) used by the
 * vendor-network pages. Escape and a backdrop click close it unless `busy`.
 */
export default function NetworkModal({ title, sub, onClose, busy = false, size, footer, children }) {
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
      <div className={`arc-modal${size ? ` ${size}` : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {sub && <div className="sub">{sub}</div>}
          </div>
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

/** A yes/no confirmation in the same shell. */
export function ConfirmModal({ title, body, confirmLabel, tone = "danger", busy, onConfirm, onCancel }) {
  return (
    <NetworkModal
      title={title}
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn btn-${tone}`} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>{body}</p>
    </NetworkModal>
  );
}
