import React from "react";
import { Badge } from "react-bootstrap";
import { BsArrowLeft } from "react-icons/bs";
import {
  formatDisplayDate,
  formatRFQNumber,
  getEntityLabel,
} from "@/utils/sharedFunctions";
import styles from "./QuoteCompareRevamp.module.scss";

const QuoteCompareHeaderCard = ({ currentRFQ, actions, onBack }) => {
  if (!currentRFQ) return null;

  const entityLabel = getEntityLabel(currentRFQ?.is_tender);
  const isClosed = Number(currentRFQ?.status) === 2;

  const meta = [
    { label: "Project", value: currentRFQ?.project_name || "-" },
    { label: "Company", value: currentRFQ?.company_name || "-" },
    { label: "Hotel", value: currentRFQ?.hotel_name || "-" },
    { label: "Department", value: currentRFQ?.department_name || "-" },
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
        <div className={styles.heroCenter}>
          <div className={styles.heroNumberRow}>
            <span>{entityLabel}</span>
            <span className={styles.heroNum}>#{currentRFQ?.rfq_no}</span>
            <Badge bg={isClosed ? "warning" : "success"} className={styles.heroStatusBadge}>
              {isClosed ? "Closed" : "Open"}
            </Badge>
          </div>
          {currentRFQ?.title && (
            <p className={styles.heroSubTitle}>{currentRFQ.title}</p>
          )}
          {currentRFQ?.comment && currentRFQ.comment !== currentRFQ.title && (
            <p className={styles.heroDescription}>{currentRFQ.comment}</p>
          )}
        </div>

        {actions && <div className={styles.heroActions}>{actions}</div>}
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
