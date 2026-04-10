import React, { useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import { FiFileText, FiDownload } from "react-icons/fi";
import { downloadPaymentDocument } from "@/services/subscription";
import styles from "./Subscription.module.css";

const triggerDownload = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const PaymentHistorySection = ({ payments = [] }) => {
  const [downloading, setDownloading] = useState({});

  if (payments.length === 0) return null;

  const typeClass = (type) => {
    switch (type) {
      case "registration": return styles.typeRegistration;
      case "renewal": return styles.typeRenewal;
      case "modification": return styles.typeModification;
      default: return styles.typeRegistration;
    }
  };

  const handleDownload = async (paymentId, type) => {
    const key = `${paymentId}-${type}`;
    if (downloading[key]) return;

    setDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      const blob = await downloadPaymentDocument(paymentId, type);
      const fileName = type === "invoice"
        ? `tax-invoice-${paymentId}.pdf`
        : `payment-receipt-${paymentId}.pdf`;
      triggerDownload(blob, fileName);
    } catch (err) {
      toast.error("Failed to download document. Please try again.");
      console.error("Download error:", err);
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  /** Build a compact summary for the meta line of each payment */
  const buildMetaSummary = (p) => {
    const md = p.modification_details;
    if (p.type === 'modification' && md) {
      const parts = [];
      const added = [...(md.added_categories || []), ...(md.added_subcategories || []), ...(md.added_hotels || [])];
      const removed = [...(md.removed_categories || []), ...(md.removed_subcategories || []), ...(md.removed_hotels || [])];
      if (added.length > 0) parts.push(`Added: ${added.join(', ')}`);
      if (removed.length > 0) parts.push(`Removed: ${removed.join(', ')}`);
      return parts.length > 0 ? parts.join('  ·  ') : null;
    }
    // Non-modification: show item names
    if (p.items?.length > 0) {
      const names = p.items.map(i => i.name).filter(Boolean);
      return names.length > 0 ? names.join(', ') : null;
    }
    return null;
  };

  return (
    <div className={styles.historySection}>
      <div className={styles.historyHeader}>
        <h3 className={styles.historyTitle}>
          Payment History
          <span className={styles.historyBadge}>{payments.length}</span>
        </h3>
      </div>

      <div className={styles.historyList}>
        {payments.map((p) => {
          const md = p.modification_details;
          const metaSummary = buildMetaSummary(p);

          // Build inline chips for modification details
          const addedItems = md ? [...(md.added_categories || []), ...(md.added_subcategories || []), ...(md.added_hotels || [])] : [];
          const removedItems = md ? [...(md.removed_categories || []), ...(md.removed_subcategories || []), ...(md.removed_hotels || [])] : [];
          const hasModChips = addedItems.length > 0 || removedItems.length > 0;

          return (
          <div key={p.payment_id} className={styles.historyRow}>
            <div className={styles.historyFileIcon}>
              <FiFileText size={16} />
            </div>
            <div className={styles.historyInfo}>
              <p className={styles.historyFileName}>
                {p.razorpay_payment_id || `Payment #${p.payment_id}`}
              </p>
              <p className={styles.historyFileMeta}>
                {moment(p.created_at).format("MMM DD, YYYY")}
                {metaSummary && !hasModChips && <> &middot; {metaSummary}</>}
              </p>
            </div>
            {hasModChips && (
              <div className={styles.modInline}>
                {addedItems.map((n, i) => <span key={`a${i}`} className={styles.modChipAdded}>+ {n}</span>)}
                {removedItems.map((n, i) => <span key={`r${i}`} className={styles.modChipRemoved}>- {n}</span>)}
              </div>
            )}
            <span className={`${styles.historyType} ${typeClass(p.type)}`}>
              {p.type}
            </span>
            <span className={styles.historyAmount}>
              {Number(p.amount) > 0 ? `₹${Number(p.amount).toLocaleString("en-IN")}` : 'Free'}
            </span>
            <div className={styles.historyActions}>
              <button
                className={styles.historyDownloadBtn}
                onClick={() => handleDownload(p.payment_id, "invoice")}
                disabled={downloading[`${p.payment_id}-invoice`]}
              >
                <FiDownload size={12} />
                Invoice
              </button>
              <button
                className={styles.historyDownloadBtn}
                onClick={() => handleDownload(p.payment_id, "receipt")}
                disabled={downloading[`${p.payment_id}-receipt`]}
              >
                <FiDownload size={12} />
                Receipt
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentHistorySection;
