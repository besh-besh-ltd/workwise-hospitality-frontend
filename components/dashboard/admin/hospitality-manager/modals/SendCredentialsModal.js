import React, { useMemo, useState } from "react";
import Modal from "react-modal";
import { BsEnvelope, BsExclamationTriangle } from "react-icons/bs";
import styles from "../HospitalityManager.module.css";

const overlayStyles = {
  overlay: { backgroundColor: "rgba(15, 23, 42, 0.62)", zIndex: 9999 },
  content: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: "560px",
    width: "94%",
    maxHeight: "88vh",
    border: "none",
    borderRadius: "14px",
    padding: 0,
    overflow: "hidden",
    background: "#fff",
  },
};

/**
 * Choose who receives login credentials (UM-12).
 *
 * This was a raw window.confirm that mailed everyone mapped to the unit. The
 * dangerous part is not the noise: the mail contains a plaintext password for
 * anyone still on the shared default, so a mistaken click had every account at
 * the unit as its blast radius — and there was no way to help one person who
 * had lost their details.
 *
 * Nobody is selected by default. "Send to everyone" remains available, but as
 * a deliberate choice rather than the only one.
 */
const SendCredentialsModal = ({ isOpen, onClose, hotel, users = [], isSending, onSend }) => {
  const [selected, setSelected] = useState([]);

  const eligible = useMemo(
    () => (users || []).filter((u) => u.user_id || u.id),
    [users]
  );

  const idOf = (u) => u.user_id || u.id;

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const close = () => {
    setSelected([]);
    onClose();
  };

  const send = (all) => {
    onSend(all ? null : selected);
    setSelected([]);
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={close} style={overlayStyles} ariaHideApp={false}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>
          <BsEnvelope size={16} /> Send login credentials
        </h3>
        <button type="button" className="btn-close" aria-label="Close" onClick={close} />
      </div>

      <div className={styles.modalBody}>
        <p className={styles.sendCredsIntro}>
          Choose who should receive their login details for{" "}
          <strong>{hotel?.name || "this business unit"}</strong>.
        </p>

        <div className={styles.sendCredsWarning}>
          <BsExclamationTriangle size={14} />
          <span>
            Anyone still using the default password will receive it in plain
            text. Send only to the people who need it.
          </span>
        </div>

        {eligible.length === 0 ? (
          <p className={styles.sendCredsEmpty}>
            No users are mapped to this business unit yet.
          </p>
        ) : (
          <ul className={styles.sendCredsList}>
            {eligible.map((user) => {
              const id = idOf(user);
              return (
                <li key={id} className={styles.sendCredsItem}>
                  <label className={styles.sendCredsLabel}>
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggle(id)}
                    />
                    <span className={styles.sendCredsName}>
                      {user.name || user.user_name || `User #${id}`}
                    </span>
                    <span className={styles.sendCredsEmail}>{user.email}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={styles.modalFooter}>
        <button type="button" className={styles.outlineBtn} onClick={close} disabled={isSending}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.outlineBtn}
          onClick={() => send(true)}
          disabled={isSending || eligible.length === 0}
        >
          Send to everyone ({eligible.length})
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => send(false)}
          disabled={isSending || selected.length === 0}
        >
          {isSending
            ? "Sending…"
            : `Send to ${selected.length} selected`}
        </button>
      </div>
    </Modal>
  );
};

export default SendCredentialsModal;
