import React from "react";
import dynamic from "next/dynamic";
import { Badge } from "react-bootstrap";
import { BsArrowLeft, BsChatLeftText } from "react-icons/bs";
import {
  formatDisplayDate,
  formatRFQNumber,
  getEntityLabel,
} from "@/utils/sharedFunctions";
import styles from "./QuoteCompareRevamp.module.scss";

const WysiwygEditor = dynamic(
  () => import("@/components/wysiwyg-editor/wysiwygeditor"),
  { ssr: false }
);

const hasVisibleText = (html) =>
  typeof html === "string" && html.replace(/<[^>]*>/g, "").trim() !== "";

const QuoteCompareHeaderCard = ({ currentRFQ, actions, onBack }) => {
  if (!currentRFQ) return null;

  const entityLabel = getEntityLabel(currentRFQ?.is_tender);
  const isClosed = Number(currentRFQ?.status) === 2;

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

      {hasVisibleText(currentRFQ?.comment) && currentRFQ.comment !== currentRFQ.title && (
        <div className={styles.heroCommentRow}>
          <div className={styles.heroCommentIcon}>
            <BsChatLeftText size={14} />
          </div>
          <div className={styles.heroCommentContent}>
            <span className={styles.metaLabel}>Comment</span>
            <div className={styles.heroCommentBody}>
              <WysiwygEditor
                value={currentRFQ.comment}
                readOnly
                showToolbar={false}
                minHeight="auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteCompareHeaderCard;
