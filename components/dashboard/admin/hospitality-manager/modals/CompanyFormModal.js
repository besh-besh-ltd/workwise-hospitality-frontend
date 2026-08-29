import React, { useEffect, useState } from "react";
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

const defaultCompanyForm = {
  name: "",
  region: "",
  contact_email: "",
  registered_office_address: "",
  corporate_office_address: "",
  gst: "",
  pan: "",
  bank_account_number: "",
  bank_name: "",
  ifsc_code: "",
  account_holder_name: "",
  msme: "",
};

/**
 * Create *or* edit. The edit branch did not exist: `updateHospitalityCompany`
 * had been sitting in the service layer with no caller, so a company created
 * with a typo in its GST or bank details could never be corrected from the
 * product — only by asking Workwise.
 *
 * One form for both, because the fields are the same and a second modal would
 * be two things to keep in step. `company` being present is what switches it.
 */
const CompanyFormModal = ({ isOpen, onClose, onSubmit, isSubmitting, company = null }) => {
  const isEdit = Boolean(company?.id);
  const [form, setForm] = useState(defaultCompanyForm);
  const [documents, setDocuments] = useState({
    gst: null,
    pan: null,
    cancelled_cheque: null,
    msme: null,
  });

  // Loaded when the modal opens on a company, and cleared when it opens on
  // none — otherwise the previous company's details would linger into a
  // "Create" and be saved as a new one.
  useEffect(() => {
    if (!isOpen) return;
    if (!company) {
      setForm(defaultCompanyForm);
      return;
    }
    setForm({
      ...defaultCompanyForm,
      ...Object.fromEntries(
        Object.keys(defaultCompanyForm).map((k) => [k, company[k] ?? ""])
      ),
    });
  }, [isOpen, company]);

  const handleClose = () => {
    setForm(defaultCompanyForm);
    setDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form, documents, () => {
      setForm(defaultCompanyForm);
      setDocuments({ gst: null, pan: null, cancelled_cheque: null, msme: null });
    });
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} ariaHideApp={false} style={modalOverlayStyles}>
      <div className={styles.modalHeader}>
        <div>
          <h5 className={styles.modalTitle}>
            {isEdit ? `Edit ${company.name}` : "Create New Company"}
          </h5>
          <div className={styles.modalSubtitle}>
            {isEdit
              ? "Changes apply to this company and every business unit under it"
              : "Fill in the company details to get started"}
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
                  Company Name <span className={styles.formRequired}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ex: UrbanStay Hotels"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>Region</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.region}
                  onChange={(e) => update("region", e.target.value)}
                  placeholder="Ex: North India"
                />
              </div>
              <div className="col-12">
                <label className={styles.formLabel}>Contact Email</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={form.contact_email}
                  onChange={(e) => update("contact_email", e.target.value)}
                  placeholder="Ex: contact@company.com"
                />
              </div>
              <div className="col-12">
                <label className={styles.formLabel}>Registered Office Address</label>
                <textarea
                  className={styles.formTextarea}
                  rows="2"
                  value={form.registered_office_address}
                  onChange={(e) => update("registered_office_address", e.target.value)}
                  placeholder="Enter registered office address"
                />
              </div>
              <div className="col-12">
                <label className={styles.formLabel}>Corporate Office Address</label>
                <textarea
                  className={styles.formTextarea}
                  rows="2"
                  value={form.corporate_office_address}
                  onChange={(e) => update("corporate_office_address", e.target.value)}
                  placeholder="Enter corporate office address"
                />
              </div>
            </div>
          </div>

          {/* Tax & Compliance */}
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>Tax & Compliance</div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className={styles.formLabel}>
                  PAN <span className={styles.formRequired}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.pan}
                  onChange={(e) => {
                    const pos = e.target.selectionStart;
                    const val = e.target.value.toUpperCase();
                    update("pan", val);
                    setTimeout(() => e.target.setSelectionRange(pos, pos), 0);
                  }}
                  placeholder="ABCDE1234F"
                  maxLength="10"
                  required
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
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>
                  GST <span className={styles.formHint}>(Optional)</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.gst}
                  onChange={(e) => {
                    const pos = e.target.selectionStart;
                    const val = e.target.value.toUpperCase();
                    update("gst", val);
                    setTimeout(() => e.target.setSelectionRange(pos, pos), 0);
                  }}
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
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className={styles.formLabel}>
                  MSME <span className={styles.formHint}>(Optional)</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.msme}
                  onChange={(e) => update("msme", e.target.value)}
                  placeholder="MSME registration number"
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>Bank Details</div>
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
                {(form.bank_account_number || form.ifsc_code) && (
                  <div style={{ marginTop: "8px" }}>
                    <label className={styles.formLabel} style={{ fontSize: "11px" }}>Cancelled Cheque</label>
                    <input
                      type="file"
                      className={styles.formFileInput}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDocuments((prev) => ({ ...prev, cancelled_cheque: e.target.files[0] || null }))}
                    />
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
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save changes"
                : "Create Company"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CompanyFormModal;
