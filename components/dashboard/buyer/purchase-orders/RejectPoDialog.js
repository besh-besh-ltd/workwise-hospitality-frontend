import React, { useState } from "react";
import styles from "./SendBack.module.scss";
import { DialogShell, ReasonRadios } from "./SendBackDialog";
import {
  REJECT_REASONS,
  QUESTION_REASONS,
  TARGET_LABELS,
  DEFAULT_TARGET,
  findTarget,
} from "./sendBackReasons";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Reject a PO with a reason. "Not needed any more" cancels it; every other
 * reason sends it back to commercial evaluation for re-award.
 *
 * Props:
 *   targets    null if unavailable, else the /send-back/targets reply. Only used
 *              for names; a missing name falls back to the role words.
 *   onSubmit   ({ reason_category, comment }) => Promise
 *   onAskInstead  ({ reason, comment }) => void  (the nudge's switch)
 */
export default function RejectPoDialog({ isOpen, onClose, poNumber, targets, onSubmit, onAskInstead, busy }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  const errors = {
    reason: reason ? "" : "Choose a reason.",
    comment: comment.trim() ? "" : "Write why you are rejecting this PO.",
  };

  const submit = async () => {
    setTouched(true);
    if (errors.reason || errors.comment || busy) return;
    await onSubmit({ reason_category: reason, comment: comment.trim() });
  };

  const rfqCreator = findTarget(targets, "RFQ_CREATOR")?.user?.name || "";
  const poCreator = findTarget(targets, "PO_INITIATOR")?.user?.name || "";
  const rfqWords = rfqCreator || "the RFQ creator";
  const poWords = poCreator || "the PO creator";

  const consequence = !reason
    ? null
    : reason === "NOT_REQUIRED"
    ? `The PO is cancelled. ${cap(rfqWords)} will be asked to close the RFQ.`
    : `Back to commercial evaluation for re-award. ${cap(rfqWords)}, ${poWords} and the commercial evaluators will be told.`;

  const nudgeRole = DEFAULT_TARGET[reason];
  const showNudge = QUESTION_REASONS.includes(reason);
  const nudgeName = showNudge
    ? findTarget(targets, nudgeRole)?.user?.name ||
      (nudgeRole === "RFQ_CREATOR"
        ? "the RFQ creator"
        : nudgeRole === "PO_INITIATOR"
        ? "the PO creator"
        : `the ${(TARGET_LABELS[nudgeRole] || "person").toLowerCase()}`)
    : "";

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={onClose}
      accent="danger"
      busy={busy}
      title="Reject this purchase order?"
      label={`Reject PO ${poNumber || ""}`.trim()}
    >
      <ReasonRadios
        name="reject-reason"
        reasons={REJECT_REASONS}
        value={reason}
        onChange={setReason}
        error={touched ? errors.reason : ""}
        disabled={busy}
      />

      {showNudge && (
        <div className={styles.nudge} role="note">
          <span>
            This sounds like a question. Ask {nudgeName} instead? The PO keeps its approvals.
          </span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnLink}`}
            onClick={() => onAskInstead({ reason, comment })}
            disabled={busy}
          >
            Ask for info instead
          </button>
        </div>
      )}

      <div>
        <label className={styles.legend} htmlFor="reject-comment">
          Reason for rejection <span className={styles.req}>*</span>
        </label>
        <textarea
          id="reject-comment"
          className={styles.textarea}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Say why, so the people who pick this up know what to change."
          disabled={busy}
        />
        {touched && errors.comment && (
          <span className={styles.error} role="alert">
            {errors.comment}
          </span>
        )}
      </div>

      {consequence && <p className={styles.consequence}>{consequence}</p>}

      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={submit} disabled={busy}>
          {busy ? "Rejecting…" : "Reject PO"}
        </button>
      </div>
    </DialogShell>
  );
}
