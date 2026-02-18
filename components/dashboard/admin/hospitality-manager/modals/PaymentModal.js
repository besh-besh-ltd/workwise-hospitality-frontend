import React, { useState } from "react";
import Modal from "react-modal";
import { HiX } from "react-icons/hi";
import { BsEnvelope, BsCheckCircleFill } from "react-icons/bs";
import { toast } from "react-toastify";
import styles from "../HospitalityManager.module.css";

const modalOverlayStyles = {
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    position: "relative",
    inset: "auto",
    maxWidth: "700px",
    width: "95%",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    borderRadius: "16px",
    padding: "0",
    border: "none",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
};

const PaymentModal = ({ isOpen, onClose, hotels, company, selectedCompanyId, onSuccess }) => {
  const [paymentMode, setPaymentMode] = useState("bu");
  const [selectedHotels, setSelectedHotels] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const pendingHotels = hotels.filter((h) => {
    const isPending = h.payment_status !== "active" && parseFloat(h.fee_amount || 0) > 0;
    if (paymentMode === "bu") return isPending && h.email;
    return isPending;
  });

  const selectedHotelData = pendingHotels.filter((h) => selectedHotels.includes(h.id));
  const totalAmount = selectedHotelData.reduce((sum, h) => sum + parseFloat(h.fee_amount || 0), 0);

  const handleClose = () => {
    setSelectedHotels([]);
    setPaymentMode("bu");
    onClose();
  };

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    setSelectedHotels([]);
  };

  const toggleHotel = (hotelId) => {
    setSelectedHotels((prev) =>
      prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]
    );
  };

  const toggleAll = () => {
    if (selectedHotels.length === pendingHotels.length) {
      setSelectedHotels([]);
    } else {
      setSelectedHotels(pendingHotels.map((h) => h.id));
    }
  };

  const handleSend = async () => {
    if (selectedHotels.length === 0) {
      toast.warning("Please select at least one business unit");
      return;
    }
    setIsSending(true);
    try {
      const { sendBatchPaymentLinks } = await import("@/services/hospitality");
      await sendBatchPaymentLinks({
        company_id: selectedCompanyId,
        payment_mode: paymentMode,
        hotel_ids: selectedHotels,
      });
      const mode = paymentMode === "bu" ? "Individual payment links" : "Consolidated payment link";
      toast.success(`${mode} sent successfully!`);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.message || "Failed to send payment links");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} ariaHideApp={false} style={modalOverlayStyles}>
      <div className={styles.modalHeader}>
        <div>
          <h5 className={styles.modalTitle}>Send Payment Links</h5>
          <div className={styles.modalSubtitle}>
            Send onboarding payment links to <strong>{company?.name}</strong>
          </div>
        </div>
        <button type="button" className={styles.modalClose} onClick={handleClose}>
          <HiX size={16} />
        </button>
      </div>

      <div className={styles.modalBody}>
        {pendingHotels.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} style={{ background: "#dcfce7" }}>
              <BsCheckCircleFill size={36} color="#16a34a" />
            </div>
            <h3 className={styles.emptyTitle}>All caught up!</h3>
            <p className={styles.emptyDescription}>
              All business units are either paid or don't have payment details configured.
            </p>
          </div>
        ) : (
          <>
            {/* Payment Mode */}
            <div className={styles.modalSection}>
              <div className={styles.modalSectionTitle}>Who will pay?</div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div
                  className={`${styles.paymentModeCard} ${paymentMode === "bu" ? styles.paymentModeActive : ""}`}
                  onClick={() => handleModeChange("bu")}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.paymentModeTitle}>Business Unit</div>
                  <div className={styles.paymentModeDesc}>
                    Individual payment links sent to each BU's contact email
                  </div>
                </div>
                <div
                  className={`${styles.paymentModeCard} ${paymentMode === "company" ? styles.paymentModeActive : ""}`}
                  onClick={() => handleModeChange("company")}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.paymentModeTitle}>Company</div>
                  <div className={styles.paymentModeDesc}>
                    One consolidated payment link with total amount
                  </div>
                </div>
              </div>
            </div>

            {/* Select BUs */}
            <div className={styles.modalSection}>
              <div className={styles.modalSectionTitle}>Select Business Units</div>
              <div className={styles.hotelCheckList}>
                <div className={styles.hotelCheckAll} onClick={toggleAll} role="button" tabIndex={0}>
                  <input
                    type="checkbox"
                    checked={selectedHotels.length === pendingHotels.length && pendingHotels.length > 0}
                    onChange={toggleAll}
                    style={{ accentColor: "#2E5BA8" }}
                  />
                  <span className={styles.hotelCheckName}>
                    Select All ({pendingHotels.length})
                  </span>
                </div>
                {pendingHotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className={styles.hotelCheckItem}
                    onClick={() => toggleHotel(hotel.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <input
                      type="checkbox"
                      checked={selectedHotels.includes(hotel.id)}
                      onChange={() => toggleHotel(hotel.id)}
                      style={{ accentColor: "#2E5BA8" }}
                    />
                    <div style={{ flex: 1 }}>
                      <span className={styles.hotelCheckName}>
                        {hotel.name}
                        {hotel.city && <span className={styles.hotelCheckCity}>({hotel.city})</span>}
                      </span>
                      <div className={styles.hotelCheckEmail}>
                        {hotel.email || (paymentMode === "company" ? "No email (will use company email)" : "No email configured")}
                      </div>
                    </div>
                    <span className={styles.hotelCheckAmount}>Rs. {hotel.fee_amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedHotels.length > 0 && (
              <div className={styles.paymentSummary}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{selectedHotels.length} business unit(s) selected</strong>
                    {paymentMode === "company" && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                          One consolidated payment link will be sent to:
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <BsEnvelope size={13} color="#2E5BA8" />
                          <strong style={{ fontSize: "13px" }}>
                            {company?.contact_email || selectedHotelData[0]?.email || "Company email not configured"}
                          </strong>
                        </div>
                      </div>
                    )}
                    {paymentMode === "bu" && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                          Individual payment links will be sent to:
                        </div>
                        {selectedHotelData.slice(0, 3).map((hotel) => (
                          <div key={hotel.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                            <BsEnvelope size={11} color="#2E5BA8" />
                            <span style={{ fontSize: "12px" }}>
                              <strong>{hotel.name}:</strong> {hotel.email}
                            </span>
                          </div>
                        ))}
                        {selectedHotelData.length > 3 && (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            ... and {selectedHotelData.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: "16px" }}>
                    <div className={styles.paymentTotalLabel}>Total Amount</div>
                    <div className={styles.paymentTotal}>Rs. {totalAmount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {pendingHotels.length > 0 && (
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={isSending}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSend}
            disabled={isSending || selectedHotels.length === 0}
          >
            {isSending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Sending...
              </>
            ) : (
              <>
                <BsEnvelope size={14} style={{ marginRight: "6px" }} />
                Send Payment Link{selectedHotels.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      )}
    </Modal>
  );
};

export default PaymentModal;
