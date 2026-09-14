import React from "react";
import { BsArchive, BsArrowCounterclockwise } from "react-icons/bs";
import styles from "./HospitalityManager.module.css";

/**
 * The business units that have been archived, and the way back.
 *
 * Archiving is meant to hide a unit without destroying the work that refers to
 * it. It did the hiding thoroughly — is_deleted = 1, and every list query
 * filtered on is_deleted = 0 — but nothing listed archived units and no screen
 * called the restore endpoint, so an archived unit left the product for good.
 * "Hides it everywhere" was accurate; "and you can bring it back" was not true
 * until this existed.
 *
 * Renders nothing when the list is empty: a company that has never archived a
 * unit should not be shown an empty section explaining a state it has never
 * been in.
 */
const ArchivedUnits = ({ units = [], onRestore, restoringId = null }) => {
  if (!units.length) return null;

  return (
    <div className={styles.archivedSection}>
      <div className={styles.archivedHead}>
        <BsArchive size={14} />
        <h3 className={styles.tabContentTitle}>
          {units.length} archived business unit{units.length !== 1 ? "s" : ""}
        </h3>
      </div>
      <p className={styles.refGroupNote}>
        Archived units are hidden from every list and from approval setup. The
        work that refers to them is untouched — restore one to bring it back.
      </p>

      <ul className={styles.archivedList}>
        {units.map((unit) => {
          const busy = restoringId === unit.id;
          return (
            <li key={unit.id} className={styles.archivedItem}>
              <div className={styles.archivedMeta}>
                <span className={styles.archivedName}>{unit.name}</span>
                {unit.city && <span className={styles.archivedCity}>{unit.city}</span>}
              </div>
              <button
                type="button"
                className={styles.outlineBtn}
                disabled={busy}
                onClick={() => onRestore(unit)}
              >
                <BsArrowCounterclockwise size={13} />
                {busy ? "Restoring…" : "Restore"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ArchivedUnits;
