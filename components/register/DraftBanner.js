import React from "react";
import { BsInfoCircle } from "react-icons/bs";
import styles from "./Register.module.css";

const DraftBanner = ({ draftAge, onContinue, onStartFresh }) => {
  return (
    <div className={styles.draftBanner}>
      <BsInfoCircle size={18} className={styles.draftIcon} />
      <div className={styles.draftText}>
        You have an unfinished registration from <strong>{draftAge}</strong>.
      </div>
      <div className={styles.draftActions}>
        <button
          type="button"
          className={styles.btnSmPrimary}
          onClick={onContinue}
        >
          Continue
        </button>
        <button
          type="button"
          className={styles.btnSmOutline}
          onClick={onStartFresh}
        >
          Start Fresh
        </button>
      </div>
    </div>
  );
};

export default DraftBanner;
