import React, { useId, useState } from "react";
import Modal from "react-modal";
import styles from "./SendBack.module.scss";
import {
  INFO_REASONS,
  REASON_LABELS,
  TARGET_LABELS,
  DEFAULT_TARGET,
  MAX_FILES,
  MAX_FILE_BYTES,
  FILE_ACCEPT,
  isAllowedFile,
  targetList,
  findTarget,
  levelText,
} from "./sendBackReasons";

/* Shared modal shell for the send-back dialogs. Same react-modal setup as
   ConfirmationModal, with its own stylesheet because these dialogs carry a
   form, not just a sentence. */
export function DialogShell({ isOpen, onClose, title, label, accent = "info", busy, children }) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      contentLabel={label || title}
      shouldCloseOnOverlayClick={!busy}
      shouldCloseOnEsc={!busy}
      overlayClassName={styles.overlay}
      className={styles.content}
    >
      <div className={`${styles.accent} ${accent === "danger" ? styles.accentDanger : styles.accentInfo}`} />
      <div className={styles.inner}>
        <h4 className={styles.title}>{title}</h4>
        {children}
      </div>
    </Modal>
  );
}

/* Reason radios: real radios in a fieldset with a legend. */
export function ReasonRadios({ name, reasons, value, onChange, error, disabled }) {
  const errorId = `${name}-error`;
  return (
    <fieldset className={styles.fieldset} disabled={disabled} aria-describedby={error ? errorId : undefined}>
      <legend className={styles.legend}>
        What is this about? <span className={styles.req}>*</span>
      </legend>
      {reasons.map((r) => (
        <label key={r} className={styles.radio}>
          <input type="radio" name={name} value={r} checked={value === r} onChange={() => onChange(r)} />
          <span>{REASON_LABELS[r]}</span>
        </label>
      ))}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}

/* Optional attachments. Photos (JPG, PNG, WEBP, HEIC) and PDF only, up to 10
   files of 10 MB: the same limits the server enforces, checked here so the user
   hears it early. */
export function FilePicker({ files, onChange, label = "Attachments (optional)" }) {
  const [problem, setProblem] = useState("");
  const problemId = useId();
  const onPick = (e) => {
    const picked = Array.from(e.target.files || []);
    const next = [...files, ...picked];
    // Cleared on every path, refusals included, so the same file can be
    // picked again once it has been fixed.
    e.target.value = "";
    if (next.length > MAX_FILES) {
      setProblem(`You can attach up to ${MAX_FILES} files.`);
      return;
    }
    if (!picked.every(isAllowedFile)) {
      setProblem("Attach photos (JPG, PNG, WEBP or HEIC) or PDFs only.");
      return;
    }
    if (picked.some((f) => f.size > MAX_FILE_BYTES)) {
      setProblem("Each file must be 10 MB or smaller.");
      return;
    }
    setProblem("");
    onChange(next);
  };
  return (
    <div className={styles.fileRow}>
      <label>
        <span className={styles.legend}>{label}</span>
        <input
          type="file"
          multiple
          accept={FILE_ACCEPT}
          onChange={onPick}
          aria-describedby={problem ? problemId : undefined}
        />
      </label>
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {f.name}{" "}
              <button
                type="button"
                className={styles.btnLink}
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <span id={problemId} className={styles.error} role="alert">
          {problem}
        </span>
      )}
    </div>
  );
}

/**
 * Ask a named person for information. The PO is held at the approver's level;
 * approvals already given stay.
 *
 * Props:
 *   targets    null while loading / unavailable, else the /send-back/targets reply
 *   initial    { reason, comment } carried over from the reject dialog's nudge
 *   stepLabel  the PO's current step label, e.g. "L3"
 *   onSubmit   ({ target_role, reason_category, comment, files }) => Promise
 */
export default function SendBackDialog({ isOpen, onClose, targets, targetsFailed, initial, stepLabel, onSubmit, busy }) {
  const list = targetList(targets);
  const defaultFor = (reason) => {
    const role = DEFAULT_TARGET[reason];
    const t = role ? findTarget(targets, role) : null;
    return t && t.available ? role : "";
  };

  const [reason, setReason] = useState(initial?.reason || "");
  const [role, setRole] = useState(() => defaultFor(initial?.reason));
  const [comment, setComment] = useState(initial?.comment || "");
  const [files, setFiles] = useState([]);
  const [touched, setTouched] = useState(false);
  // Until the person picks someone by hand, the default follows the reason.
  const [pickedByHand, setPickedByHand] = useState(false);

  // Targets can arrive after the dialog opens (the nudge opens it at once).
  const effectiveRole = role || (!pickedByHand ? defaultFor(reason) : "");

  const pickReason = (r) => {
    setReason(r);
    if (!pickedByHand) setRole(defaultFor(r));
  };

  const chosen = effectiveRole ? findTarget(targets, effectiveRole) : null;
  const errors = {
    reason: reason ? "" : "Choose what this is about.",
    person: effectiveRole ? "" : "Choose who to ask.",
    comment: comment.trim() ? "" : "Write your question for them.",
  };
  const invalid = errors.reason || errors.person || errors.comment;

  const submit = async () => {
    setTouched(true);
    if (invalid || busy || targetsFailed) return;
    await onSubmit({
      target_role: effectiveRole,
      reason_category: reason,
      comment: comment.trim(),
      files,
    });
  };

  const name = chosen?.user?.name;
  return (
    <DialogShell isOpen={isOpen} onClose={onClose} title="Ask for information" busy={busy}>
      <ReasonRadios
        name="sendback-reason"
        reasons={INFO_REASONS}
        value={reason}
        onChange={pickReason}
        error={touched ? errors.reason : ""}
        disabled={busy}
      />

      <fieldset
        className={styles.fieldset}
        disabled={busy}
        aria-describedby={touched && errors.person ? "sendback-person-error" : targetsFailed ? "sendback-people-failed" : undefined}
      >
        <legend className={styles.legend}>
          Who should answer? <span className={styles.req}>*</span>
        </legend>
        {targets == null && !targetsFailed && (
          <span className={styles.meta} role="status" aria-live="polite">
            Loading people…
          </span>
        )}
        {targetsFailed && (
          <span id="sendback-people-failed" className={styles.error} role="alert">
            Couldn&apos;t load the people for this PO. Close and try again.
          </span>
        )}
        {list.map((t) => (
          <label key={t.target_role} className={`${styles.radio} ${t.available ? "" : styles.radioDisabled}`}>
            <input
              type="radio"
              name="sendback-person"
              value={t.target_role}
              checked={effectiveRole === t.target_role}
              disabled={!t.available}
              onChange={() => {
                setRole(t.target_role);
                setPickedByHand(true);
              }}
            />
            <span>
              {t.user?.name ? `${t.user.name} (${TARGET_LABELS[t.target_role] || t.target_role})` : TARGET_LABELS[t.target_role] || t.target_role}
              {!t.available && (
                <span className={styles.why}>{t.unavailable_reason || "Not available"}</span>
              )}
            </span>
          </label>
        ))}
        {touched && errors.person && (
          <span id="sendback-person-error" className={styles.error} role="alert">
            {errors.person}
          </span>
        )}
      </fieldset>

      <div>
        <label className={styles.legend} htmlFor="sendback-comment">
          Your question <span className={styles.req}>*</span>
        </label>
        <textarea
          id="sendback-comment"
          className={styles.textarea}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What do you need to know or see before you can decide?"
          disabled={busy}
          aria-describedby={touched && errors.comment ? "sendback-comment-error" : undefined}
        />
        {touched && errors.comment && (
          <span id="sendback-comment-error" className={styles.error} role="alert">
            {errors.comment}
          </span>
        )}
      </div>

      <FilePicker files={files} onChange={setFiles} />

      <p className={styles.consequence}>
        The PO waits with you at {levelText(stepLabel)}. Approvals already given stay.{" "}
        {name || "The person you pick"} gets an email and a notification.
      </p>

      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit} disabled={busy || targetsFailed}>
          {busy ? "Sending…" : "Ask for info"}
        </button>
      </div>
    </DialogShell>
  );
}
