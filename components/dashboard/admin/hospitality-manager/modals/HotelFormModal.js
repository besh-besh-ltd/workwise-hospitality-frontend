import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { HiX } from "react-icons/hi";
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
    maxWidth: "800px",
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

const defaultHotelForm = {
  name: "",
  city: "",
  status: "Pending Onboarding",
  full_address: "",
  state: "",
  gst: "",
  pan: "",
  bank_account_number: "",
  bank_name: "",
  ifsc_code: "",
  account_holder_name: "",
  msme: "",
  delivery_address: "",
  email: "",
  fee_amount: "500",
};

const HotelFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  editingHotel,
  companyName,
  existingDocuments,
}) => {
  const [form, setForm] = useState(defaultHotelForm);
  const [documents, setDocuments] = useState({
    gst: null,
    pan: null,
    cancelled_cheque: null,
    msme: null,
  });

  useEffect(() => {
    if (editingHotel) {
      setForm({
        name: editingHotel.name || "",
        city: editingHotel.city || "",
        status: editingHotel.status || "Pending Onboarding",
        full_address: editingHotel.full_address || "",
        state: editingHotel.state || "",
        gst: editingHotel.gst || "",
        pan: editingHotel.pan || "",
        bank_account_number: editingHotel.bank_account_number || "",
        bank_name: editingHotel.bank_name || "",
        ifsc_code: editingHotel.ifsc_code || "",
        account_holder_name: editingHotel.account_holder_name || "",
        msme: editingHotel.msme || "",
        delivery_address: editingHotel.delivery_address || "",
        email: editingHotel.email || "",
        fee_amount: editingHotel.fee_amount || "500",
      });
    } else {
      setForm(defaultHotelForm);
    }
    setDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
  }, [editingHotel, isOpen]);

  const handleClose = () => {
    setForm(defaultHotelForm);
    setDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form, documents, () => {
      setForm(defaultHotelForm);
      setDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
    });
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const isEditing = !!editingHotel;
  const isPaid = isEditing && editingHotel.payment_status === "active";

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} ariaHideApp={false} style={modalOverlayStyles}>
      <div className={styles.modalHeader}>
        <div>
          <h5 className={styles.modalTitle}>
            {isEditing ? "Edit Business Unit" : "Add New Business Unit"}
          </h5>
          <div className={styles.modalSubtitle}>
            {isEditing ? "Editing" : "Adding to"}: <strong>{companyName}</strong>
          </div>
        </div>
        <button type="button" className={styles.modalClose} onClick={handleClose}>
          <HiX size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.modalForm}>
        <div className={styles.modalBody}>
          {/* Basic Information */}
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>Basic Information</div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className={styles.formLabel}>
                  Business Unit Name <span className={styles.formRequired}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ex: UrbanStay Lakeside"
                  required
                />
              </div>
              <div className="col-md-3">
                <label className={styles.formLabel}>City</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Ex: Udaipur"
                />
              </div>
              <div className="col-md-3">
                <label className={styles.formLabel}>State</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                  placeholder="Ex: Rajasthan"
                />
              </div>
              {isEditing && (
                <div className="col-md-6">
                  <label className={styles.formLabel}>Status</label>
                  <select
                    className={styles.formSelect}
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option value="Pending Onboarding">Pending Onboarding</option>
                    <option value="Pending Payment">Pending Payment</option>
                    <option value="Active">Active</option>
                  </select>
                  <div className={styles.formSmallHint}>
                    Status can be adjusted here for exceptional cases. It will also be updated automatically after successful payment.
                  </div>
                </div>
              )}
              <div className="col-md-6">
                <label className={styles.formLabel}>Contact Email</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="business-unit@example.com"
                  disabled={isPaid}
                />
                <div className={styles.formSmallHint}>
                  {isPaid ? "Cannot change email after payment is completed" : "Payment link will be sent to this email"}
                </div>
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>Onboarding Fee (Rs.)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={form.fee_amount}
                  onChange={(e) => update("fee_amount", e.target.value)}
                  placeholder="500"
                  min="0"
                  disabled={isPaid}
                />
                {isPaid && (
                  <div className={styles.formSmallHint}>Cannot change fee after payment is completed</div>
                )}
              </div>
              <div className="col-12">
                <label className={styles.formLabel}>Full Address</label>
                <textarea
                  className={styles.formTextarea}
                  rows="2"
                  value={form.full_address}
                  onChange={(e) => update("full_address", e.target.value)}
                  placeholder="Complete property address"
                />
              </div>
              <div className="col-12">
                <label className={styles.formLabel}>Delivery Address</label>
                <textarea
                  className={styles.formTextarea}
                  rows="2"
                  value={form.delivery_address}
                  onChange={(e) => update("delivery_address", e.target.value)}
                  placeholder="Address for deliveries"
                />
              </div>
            </div>
          </div>

          {/* Tax & Compliance */}
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>
              Tax & Compliance <span className={styles.formHint}>(Optional)</span>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className={styles.formLabel}>PAN</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.pan}
                  onChange={(e) => update("pan", e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength="10"
                />
                {form.pan && (
                  <div style={{ marginTop: "8px" }}>
                    <label className={styles.formLabel} style={{ fontSize: "11px" }}>PAN Document</label>
                    <input
                      type="file"
                      className={styles.formFileInput}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDocuments((prev) => ({ ...prev, pan: e.target.files[0] || null }))}
                    />
                    {existingDocuments?.pan && typeof existingDocuments.pan === "string" && (
                      <div className={styles.formSmallHint}>
                        Existing document uploaded. Upload new to replace.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>GST</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.gst}
                  onChange={(e) => update("gst", e.target.value.toUpperCase())}
                  placeholder="27AABCU9603R1ZX"
                  maxLength="15"
                />
                {form.gst && (
                  <div style={{ marginTop: "8px" }}>
                    <label className={styles.formLabel} style={{ fontSize: "11px" }}>GST Document</label>
                    <input
                      type="file"
                      className={styles.formFileInput}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDocuments((prev) => ({ ...prev, gst: e.target.files[0] || null }))}
                    />
                    {existingDocuments?.gst && typeof existingDocuments.gst === "string" && (
                      <div className={styles.formSmallHint}>
                        Existing document uploaded. Upload new to replace.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>MSME</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.msme}
                  onChange={(e) => update("msme", e.target.value)}
                  placeholder="MSME registration"
                />
                {form.msme && (
                  <div style={{ marginTop: "8px" }}>
                    <label className={styles.formLabel} style={{ fontSize: "11px" }}>MSME Document</label>
                    <input
                      type="file"
                      className={styles.formFileInput}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDocuments((prev) => ({ ...prev, msme: e.target.files[0] || null }))}
                    />
                    {existingDocuments?.msme && typeof existingDocuments.msme === "string" && (
                      <div className={styles.formSmallHint}>
                        Existing document uploaded. Upload new to replace.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>
              Bank Details <span className={styles.formHint}>(Optional)</span>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className={styles.formLabel}>Account Holder Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.account_holder_name}
                  onChange={(e) => update("account_holder_name", e.target.value)}
                  placeholder="Account holder name"
                />
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>Bank Account Number</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.bank_account_number}
                  onChange={(e) => update("bank_account_number", e.target.value)}
                  placeholder="Account number"
                />
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>Bank Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.bank_name}
                  onChange={(e) => update("bank_name", e.target.value)}
                  placeholder="Bank name"
                />
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>IFSC Code</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.ifsc_code}
                  onChange={(e) => update("ifsc_code", e.target.value.toUpperCase())}
                  placeholder="IFSC code"
                  maxLength="11"
                />
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>Cancelled Cheque</label>
                <input
                  type="file"
                  className={styles.formFileInput}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setDocuments((prev) => ({ ...prev, cancelled_cheque: e.target.files[0] || null }))}
                />
                {existingDocuments?.cancelled_cheque && typeof existingDocuments.cancelled_cheque === "string" && (
                  <div className={styles.formSmallHint}>
                    Existing document uploaded. Upload new to replace.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
              ? "Update Business Unit"
              : "Add Business Unit"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default HotelFormModal;
