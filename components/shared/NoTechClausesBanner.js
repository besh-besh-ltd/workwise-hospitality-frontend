import React from "react";
import { BsInfoCircleFill } from "react-icons/bs";
import styles from "./NoTechClausesBanner.module.scss";

const NoTechClausesBanner = ({ entityLabel = "RFQ" }) => {
  return (
    <div className={styles.banner}>
      <div className={styles.iconWrap}>
        <BsInfoCircleFill />
      </div>
      <div className={styles.textWrap}>
        <p className={styles.title}>No Technical Clauses</p>
        <p className={styles.subtitle}>
          This {entityLabel} does not have any technical evaluation clauses configured.
          Quote comparison will not include technical scores.
        </p>
      </div>
    </div>
  );
};

export default NoTechClausesBanner;
