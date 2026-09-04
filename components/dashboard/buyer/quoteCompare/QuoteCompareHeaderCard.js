import React, { useState } from "react";
import { Badge } from "react-bootstrap";
import { BsArrowLeft, BsChatLeftText } from "react-icons/bs";
import {
  formatDisplayDate,
  formatRFQNumber,
  getEntityLabel,
} from "@/utils/sharedFunctions";
import RfqTermsModal from "@/components/modal/RfqTermsModal";
import styles from "./QuoteCompareRevamp.module.scss";

const hasVisibleText = (html) =>
  typeof html === "string" && html.replace(/<[^>]*>/g, "").trim() !== "";

const QuoteCompareHeaderCard = ({ currentRFQ, actions, onBack }) => {
  const [showTncModal, setShowTncModal] = useState(false);

  if (!currentRFQ) return null;

  const entityLabel = getEntityLabel(currentRFQ?.is_tender);
  const isClosed = Number(currentRFQ?.status) === 2;

  const hasTnc =
    hasVisibleText(currentRFQ?.comment) && currentRFQ.comment !== currentRFQ.title;

  const meta = [
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
    ...(hasTnc
      ? [{ label: "Terms & Conditions", isTnc: true }]
      : []),
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
        </div>

        {actions && <div className={styles.heroActions}>{actions}</div>}
      </div>

      <div className={styles.heroMetaGrid}>
        {meta.map((item) =>
          item.isTnc ? (
            <button
              type="button"
              key={item.label}
              className={`${styles.heroMetaItem} ${styles.heroMetaItemTnc}`}
              onClick={() => setShowTncModal(true)}
            >
              <span className={styles.metaLabel}>{item.label}</span>
              <span className={`${styles.metaValue} ${styles.metaValueTnc}`}>
                <BsChatLeftText size={12} />
                View
              </span>
            </button>
          ) : (
            <div className={styles.heroMetaItem} key={item.label}>
              <span className={styles.metaLabel}>{item.label}</span>
              <span className={styles.metaValue}>{item.value}</span>
            </div>
          )
        )}
      </div>

      <div className={styles.heroDeliveryRow}>
        <span className={styles.metaLabel}>Delivery Location</span>
        <span className={styles.metaValue}>{currentRFQ?.location || "-"}</span>
      </div>

      <RfqTermsModal
        open={showTncModal}
        onClose={() => setShowTncModal(false)}
        rfq={currentRFQ}
      />
    </div>
  );
};

export default QuoteCompareHeaderCard;
