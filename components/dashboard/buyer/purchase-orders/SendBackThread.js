import React, { useState } from "react";
import styles from "./SendBack.module.scss";
import { FilePicker } from "./SendBackDialog";
import { fmtDateTime } from "./shared";
import {
  REASON_LABELS,
  TARGET_LABELS,
  levelText,
  isRejectionRoute,
  SIDE_REQUEST,
  SIDE_RESPONSE,
} from "./sendBackReasons";

const isRejection = (row) => isRejectionRoute(row.route);

const STATUS_TEXT = {
  OPEN: "Waiting for an answer",
  ANSWERED: "Answered",
  RESUMED: "Answered",
  WITHDRAWN: "Withdrawn",
  SUPERSEDED: "No longer needed",
  CLOSED: "Closed",
};

function Files({ files }) {
  if (!files || files.length === 0) return null;
  return (
    <ul className={styles.files}>
      {files.map((f) => (
        <li key={f.id ?? f.url}>
          <a href={f.url} target="_blank" rel="noopener noreferrer">
            {f.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

function RespondBox({ row, stepLabel, onRespond, busy }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [touched, setTouched] = useState(false);
  const empty = !text.trim() && files.length === 0;

  const send = async () => {
    setTouched(true);
    if (empty || busy) return;
    await onRespond(row.id, { response_text: text.trim(), files });
  };

  return (
    <div className={styles.respond}>
      <label className={styles.legend} htmlFor={`sb-answer-${row.id}`}>
        Your answer
      </label>
      <textarea
        id={`sb-answer-${row.id}`}
        className={styles.textarea}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />
      <FilePicker files={files} onChange={setFiles} label="Files (optional)" />
      <p className={styles.respondNote}>
        Editing the PO restarts approval from Level 1. Answering without editing keeps it at{" "}
        {levelText(stepLabel)}.
      </p>
      {touched && empty && (
        <span className={styles.error} role="alert">
          Write an answer or attach a file.
        </span>
      )}
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={send} disabled={busy}>
          {busy ? "Sending…" : "Send answer"}
        </button>
      </div>
    </div>
  );
}

/**
 * The history of questions and rejections on a PO, newest first.
 *
 * Props:
 *   rows           GET /po/:id/send-backs
 *   currentUserId  the signed-in user
 *   canWithdraw    the existing can-approve condition (a pending approver)
 *   stepLabel      the PO's current step label, for the "Level n" note
 *   onRespond(id, {response_text, files}), onWithdraw(id)
 */
export default function SendBackThread({ rows, currentUserId, canWithdraw, stepLabel, onRespond, onWithdraw, busy }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <section className={styles.thread} aria-label="Questions and rejections on this PO">
      <h3 className={styles.threadHead}>Questions and rejections</h3>
      {rows.map((row) => {
        const open = row.status === "OPEN";
        const rejection = isRejection(row);
        const reason = REASON_LABELS[row.reason_category] || row.reason_category;
        const targetName = row.target?.name;
        const targetRole = TARGET_LABELS[row.target_role] || row.target_role;
        const isTarget = open && row.target?.id != null && row.target.id === currentUserId;
        const mayWithdraw =
          open && ((row.requested_by?.id != null && row.requested_by.id === currentUserId) || canWithdraw);
        const reqFiles = (row.files || []).filter((f) => f.side === SIDE_REQUEST);
        const respFiles = (row.files || []).filter((f) => f.side === SIDE_RESPONSE);
        const tone = open ? styles.entryOpen : rejection ? styles.entryRejected : styles.entryDone;

        return (
          <article key={row.id} className={`${styles.entry} ${tone}`}>
            <div className={styles.entryTitle}>
              {rejection
                ? row.route === "CANCEL"
                  ? `Cancelled: ${reason}`
                  : `Rejected: ${reason}`
                : `Asked for information: ${reason}`}
            </div>
            <div className={styles.meta}>
              {row.requested_by?.name || "An approver"}
              {!rejection && targetName ? ` asked ${targetName} (${targetRole})` : ""}
              {" · "}
              {fmtDateTime(row.created_at)}
              {!rejection && STATUS_TEXT[row.status] ? ` · ${STATUS_TEXT[row.status]}` : ""}
            </div>
            {row.comment && <p className={styles.quote}>{row.comment}</p>}
            <Files files={reqFiles} />

            {row.response_text && (
              <>
                <div className={styles.meta}>
                  {row.responded_by?.name || "Answer"} · {fmtDateTime(row.responded_at)}
                </div>
                <p className={styles.answer}>{row.response_text}</p>
              </>
            )}
            <Files files={respFiles} />

            {isTarget && <RespondBox row={row} stepLabel={stepLabel} onRespond={onRespond} busy={busy} />}
            {mayWithdraw && (
              <div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnCancel}`}
                  onClick={() => onWithdraw(row.id)}
                  disabled={busy}
                >
                  Withdraw this request
                </button>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
