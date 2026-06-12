import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { Copy as CopyIcon, ChevronDown, Info, X } from "lucide-react";
import { copyRfq } from "@/services/rfq";
import styles from "./CopyRFQModal.module.scss";

const CopyRFQModal = ({ show, onClose, sourceRfq }) => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);

  // Hotel options come from the user's hospitality mappings — only rows that
  // are hotel-level (hospitality_hotel_id != null). Company-level mappings
  // (mapping_type=0) are surfaced via expanded hotel rows in the same array.
  const hotelOptions = useMemo(() => {
    const mappings = (userProfile?.hospitality_mappings || []).filter(
      (m) => m.hospitality_hotel_id != null
    );
    const seen = new Set();
    const out = [];
    for (const m of mappings) {
      if (seen.has(m.hospitality_hotel_id)) continue;
      seen.add(m.hospitality_hotel_id);
      out.push({
        value: m.hospitality_hotel_id,
        label: m.company_name
          ? `${m.company_name} — ${m.hotel_name}`
          : m.hotel_name,
      });
    }
    return out;
  }, [userProfile?.hospitality_mappings]);

  const defaultHotel = useMemo(() => {
    if (
      sourceRfq?.hotel_id &&
      hotelOptions.some((o) => o.value === sourceRfq.hotel_id)
    ) {
      return sourceRfq.hotel_id;
    }
    return hotelOptions[0]?.value ?? "";
  }, [sourceRfq?.hotel_id, hotelOptions]);

  const [targetHotelId, setTargetHotelId] = useState(defaultHotel);
  const [submitting, setSubmitting] = useState(false);

  // Reset selected hotel whenever the modal opens for a new source RFQ.
  useEffect(() => {
    if (show) setTargetHotelId(defaultHotel);
  }, [show, defaultHotel]);

  const isCrossUnit =
    sourceRfq?.hotel_id &&
    targetHotelId &&
    sourceRfq.hotel_id !== targetHotelId;

  const handleCopy = async () => {
    if (!sourceRfq?.id || !targetHotelId || submitting) return;
    setSubmitting(true);
    try {
      const res = await copyRfq({
        source_rfq_id: sourceRfq.id,
        target_hotel_id: Number(targetHotelId),
      });
      const data = res?.data || {};
      toast.success(
        data.new_rfq_no
          ? `Copied to draft RFQ #${data.new_rfq_no}`
          : "RFQ copied to a new draft"
      );
      onClose?.();
      router.push(
        `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${data.new_rfq_id}`
      );
    } catch (err) {
      const message =
        err?.message?.response?.data?.message ||
        err?.message?.message ||
        "Failed to copy RFQ. Please try again.";
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  return (
    <Modal
      isOpen={!!show}
      onRequestClose={handleClose}
      ariaHideApp={false}
      contentLabel="Copy RFQ"
      shouldCloseOnOverlayClick={!submitting}
      shouldCloseOnEsc={!submitting}
      overlayClassName={styles.overlay}
      className={styles.content}
    >
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>
            <CopyIcon size={16} className={styles.titleIcon} />
            Copy RFQ
          </h2>
          <p className={styles.subtitle}>
            Creates a draft with this RFQ&apos;s details, products, and
            technical clauses — vendors are refreshed for the chosen business
            unit.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className={styles.closeBtn}
          aria-label="Close"
          disabled={submitting}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.body}>
        {sourceRfq?.rfq_no && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Source</span>
            <span className={styles.metaStrong}>RFQ #{sourceRfq.rfq_no}</span>
            {sourceRfq.title ? (
              <span className={styles.metaTitle}>— {sourceRfq.title}</span>
            ) : null}
          </div>
        )}

        <div className={styles.fieldGroup}>
          <label htmlFor="copy-rfq-hotel" className={styles.fieldLabel}>
            Business Unit
          </label>
          <div className={styles.selectWrap}>
            <select
              id="copy-rfq-hotel"
              className={styles.select}
              value={targetHotelId || ""}
              onChange={(e) => setTargetHotelId(Number(e.target.value))}
              disabled={submitting || hotelOptions.length === 0}
            >
              {hotelOptions.length === 0 ? (
                <option value="">No accessible business units</option>
              ) : (
                hotelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              )}
            </select>
            <ChevronDown size={16} className={styles.selectChevron} />
          </div>
          <span className={styles.fieldHelp}>
            Defaults to the source RFQ&apos;s business unit. Switch to copy to
            a different hotel.
          </span>
        </div>

        {isCrossUnit && (
          <div className={styles.infoBanner} role="status">
            <Info size={14} className={styles.infoBannerIcon} />
            <span>
              Vendors will be re-resolved against this business unit&apos;s
              current eligible pool.
            </span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerHint}>
          {hotelOptions.length} business unit
          {hotelOptions.length === 1 ? "" : "s"} available
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnCancel}`}
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleCopy}
            disabled={
              submitting || !targetHotelId || hotelOptions.length === 0
            }
          >
            {submitting && <span className={styles.spinner} />}
            {submitting ? "Copying…" : "Copy RFQ"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CopyRFQModal;
