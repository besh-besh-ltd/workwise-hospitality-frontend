import React from "react";
import styles from "./QuoteCompareTables.module.scss";

const statusClassMap = {
  success: styles.statusSuccess,
  warning: styles.statusWarning,
  danger: styles.statusDanger,
  info: styles.statusInfo,
  neutral: styles.statusNeutral,
};

const VendorStatusCell = ({
  rank,
  vendorName,
  vendorSubText = "",
  statuses = [],
  actionSlot = null,
  // Optional slot rendered directly under the vendor name + subtext,
  // ABOVE the status chip row. Used by the tender Quote Compare path
  // to surface a prominent Finalize button per vendor card without
  // burying it inside the 3-dots dropdown.
  belowNameSlot = null,
  centered = false,
  emphasizeName = false,
}) => {
  return (
    <div>
      {rank && rank !== "--" ? <span className={styles.rankChip}>{rank}</span> : null}
      <div className={`${styles.vendorIdentity} ${centered ? styles.vendorIdentityCentered : ""}`}>
        <div className={centered ? styles.vendorTextCentered : ""}>
          <p className={`${styles.vendorName} ${emphasizeName ? styles.vendorNameProminent : ""}`}>
            {vendorName}
          </p>
          {vendorSubText ? (
            <p className={`${styles.vendorSub} ${centered ? styles.vendorSubCentered : ""}`}>
              {vendorSubText}
            </p>
          ) : null}
          {belowNameSlot ? (
            <div style={{ marginTop: 6 }}>{belowNameSlot}</div>
          ) : null}
        </div>
        {actionSlot ? (
          <div className={centered ? styles.vendorActionSlot : ""}>{actionSlot}</div>
        ) : null}
      </div>
      {statuses?.length ? (
        <div className={`${styles.statusRow} ${centered ? styles.statusRowCentered : ""}`}>
          {statuses.map((status) => (
            <span
              key={`${vendorName}_${status.label}`}
              className={`${styles.statusChip} ${statusClassMap[status.tone] || styles.statusInfo}`}
            >
              {status.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default VendorStatusCell;
