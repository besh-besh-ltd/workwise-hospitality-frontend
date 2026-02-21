import React from "react";
import {
  formatDisplayDate,
  formatRFQNumber,
  getEntityLabel,
} from "@/utils/sharedFunctions";
import styles from "./QuoteCompareRevamp.module.scss";

const QuoteCompareHeaderCard = ({ currentRFQ, actions }) => {
  if (!currentRFQ) return null;

  const entityLabel = getEntityLabel(currentRFQ?.is_tender);
  const isClosed = Number(currentRFQ?.status) === 2;

  const meta = [
    { label: "Project", value: currentRFQ?.project_name || "-" },
    { label: "Company", value: currentRFQ?.company_name || "-" },
    { label: "Hotel", value: currentRFQ?.hotel_name || "-" },
    { label: "Contact Person", value: currentRFQ?.contact_name || "-" },
    { label: "Contact Number", value: currentRFQ?.contact_number || "-" },
    { label: "Response Email", value: currentRFQ?.response_email || "-" },
    {
      label: "Submission Deadline",
      value: formatDisplayDate(currentRFQ?.bid_end_date, { includeTime: true }) || "-",
    },
    {
      label: "Reverse Auction",
      value: Number(currentRFQ?.reverse_auction) === 1 ? "Enabled" : "Disabled",
    },
    { label: "Delivery Location", value: currentRFQ?.location || "-" },
  ];

  return (
    <div className={styles.heroCard}>
      <div className={styles.heroTop}>
        <div className={styles.heroTitleBlock}>
          <div className={styles.heroEntity}>
            <span>{entityLabel}</span>
            <span className={`${styles.badge} ${styles.badgeLight}`}>
              {formatRFQNumber(currentRFQ?.rfq_no, currentRFQ?.is_tender) || "-"}
            </span>
            <span
              className={`${styles.badge} ${
                isClosed ? styles.badgeWarning : styles.badgeSuccess
              }`}
            >
              {isClosed ? "Closed" : "Open"}
            </span>
          </div>
          <h3 className={styles.heroTitle}>{currentRFQ?.title || "Quote Comparison"}</h3>
          <p className={styles.heroSubTitle}>
            {currentRFQ?.comment || "Compare vendors side-by-side across costs, terms, and risk signals."}
          </p>
        </div>
        {actions ? <div className={styles.actionRail}>{actions}</div> : null}
      </div>
      <div className={styles.heroMetaGrid}>
        {meta.map((item) => (
          <div className={styles.heroMetaItem} key={item.label}>
            <span className={styles.metaLabel}>{item.label}</span>
            <span className={styles.metaValue}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuoteCompareHeaderCard;
