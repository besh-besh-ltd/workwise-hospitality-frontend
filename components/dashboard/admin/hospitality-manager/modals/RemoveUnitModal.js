"use client";
import React, { useCallback, useEffect, useState } from "react";
import Modal from "react-modal";
import { BsExclamationTriangle, BsArchive, BsTrash } from "react-icons/bs";
import { previewHotelDeletion } from "@/services/hospitality";
import Loader from "@/components/shared/Loader";
import styles from "../HospitalityManager.module.css";

// Same shape the sibling modals use — there is no shared wrapper in this area.
const modalOverlayStyles = {
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    position: "relative",
    inset: "auto",
    maxWidth: "560px",
    width: "95%",
    maxHeight: "90vh",
    overflow: "auto",
    borderRadius: "16px",
    padding: "0",
    border: "none",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
};

/**
 * HN-2 — removing a business unit that was created by mistake.
 *
 * There was no delete at any layer, so a typo stayed in the estate forever.
 * The reason this is a screen rather than a confirm dialog is that the honest
 * answer is usually "you cannot delete this, but you can archive it", and that
 * only helps if it comes with what is in the way.
 *
 * The three kinds of reference are shown apart because they mean different
 * things to the person deciding: work that lives here, rows a delete would
 * take with it, and rows a delete would leave pointing at nothing. The last
 * group is the one the database would not have caught — two tables reference
 * a unit with no foreign key, one of them deciding which vendors can be
 * solicited for it.
 */

const KIND_HEADINGS = {
  blocks: {
    title: "Work lives here",
    note: "This unit is referenced by real procurement activity.",
  },
  destroys: {
    title: "Would be deleted along with it",
    note: "These rows exist only for this unit and would go with it.",
  },
  orphans: {
    title: "Would be left pointing at nothing",
    note: "The database would not stop this — these rows have no link back to protect them.",
  },
};

const RemoveUnitModal = ({ isOpen, companyId, hotel, onClose, onRemove, onArchive, busy }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isOpen || !hotel?.id) return;
    setLoading(true);
    setPreview(null);
    try {
      const res = await previewHotelDeletion(companyId, hotel.id);
      setPreview(res?.data || null);
      setError(null);
    } catch (err) {
      setError("Could not check what this unit is used for.");
    } finally {
      setLoading(false);
    }
  }, [isOpen, companyId, hotel?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const references = preview?.references || [];
  const groups = ["blocks", "destroys", "orphans"]
    .map((kind) => ({ kind, rows: references.filter((r) => r.kind === kind) }))
    .filter((g) => g.rows.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      style={modalOverlayStyles}
      contentLabel="Remove business unit"
    >
      <div className={styles.modalHeader}>
        <div>
          <h5 className={styles.modalTitle}>
            Remove {hotel?.name || "this business unit"}?
          </h5>
        </div>
      </div>

      <div className={styles.modalBody}>

      {loading && <Loader />}
      {error && <div className={styles.removeError}>{error}</div>}

      {!loading && preview?.can_hard_delete && (
        <>
          <p className={styles.removeNote}>
            Nothing refers to this unit, so it can be removed completely. This
            cannot be undone.
          </p>
          <div className={styles.removeActions}>
            <button type="button" className={styles.removeCancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.removeDeleteBtn}
              disabled={busy}
              onClick={() => onRemove(hotel)}
            >
              <BsTrash size={13} /> {busy ? "Removing…" : "Delete permanently"}
            </button>
          </div>
        </>
      )}

      {!loading && preview && !preview.can_hard_delete && (
        <>
          <p className={styles.removeWarn}>
            <BsExclamationTriangle size={14} />
            This unit cannot be deleted — {preview.total.toLocaleString()}{" "}
            {preview.total === 1 ? "record refers" : "records refer"} to it. You
            can archive it instead, which hides it everywhere without touching
            any of them.
          </p>

          {groups.map(({ kind, rows }) => (
            <div key={kind} className={styles.refGroup}>
              <h3 className={styles.refGroupTitle}>{KIND_HEADINGS[kind].title}</h3>
              <p className={styles.refGroupNote}>{KIND_HEADINGS[kind].note}</p>
              <ul className={styles.refList}>
                {rows.map((r) => (
                  <li key={r.key} className={styles.refItem}>
                    <span>{r.label}</span>
                    <strong>{r.count.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className={styles.removeActions}>
            <button type="button" className={styles.removeCancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.removeArchiveBtn}
              disabled={busy}
              onClick={() => onArchive(hotel)}
            >
              <BsArchive size={13} /> {busy ? "Archiving…" : "Archive instead"}
            </button>
          </div>
        </>
      )}
      </div>
    </Modal>
  );
};

export default RemoveUnitModal;
