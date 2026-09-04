import React, { useState } from "react";
import Modal from "react-modal";
import { HiX } from "react-icons/hi";
import { BsBuilding } from "react-icons/bs";
import { validateMapping } from "./accessUtils";
import { dedupeHospitalityMappings } from "@/components/dashboard/admin/shared/hospitalityMappings";
import styles from "./ManageAccounts.module.scss";

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
    maxWidth: "720px",
    width: "95%",
    maxHeight: "88vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    borderRadius: "16px",
    padding: "0",
    border: "none",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
};

const AssignAccessModal = ({
  isOpen,
  onClose,
  user,
  hospitalityCompanies,
  hotelsByCompany,
  userMappings,
  onMapUser,
  onRemoveMapping,
  onLoadHotels,
}) => {
  const [form, setForm] = useState({
    selectedCompanyId: "",
    accessLevel: "all", // "all" = all business units, "specific" = specific business unit
    hotelId: "",
    submitting: false,
  });

  const dedupedMappings = dedupeHospitalityMappings(userMappings || []);

  // Companies already mapped at company-level should be excluded from the add form
  const companyLevelMappedIds = new Set(
    dedupedMappings
      .filter((m) => m.mapping_type === 0)
      .map((m) => String(m.hospitality_company_id))
  );

  // Hotels already individually mapped
  const mappedHotelKeys = new Set(
    dedupedMappings
      .filter((m) => m.mapping_type === 1 && m.hospitality_hotel_id)
      .map((m) => `${m.hospitality_company_id}-${m.hospitality_hotel_id}`)
  );

  const availableCompanies = (hospitalityCompanies || []).filter(
    (c) => !companyLevelMappedIds.has(String(c.id))
  );

  const allHotelsForCompany = form.selectedCompanyId
    ? hotelsByCompany?.[form.selectedCompanyId] || []
    : [];

  const selectedCompanyHotels = allHotelsForCompany.filter(
    (h) => !mappedHotelKeys.has(`${form.selectedCompanyId}-${h.id}`)
  );

  const handleSubmit = async () => {
    const error = validateMapping({
      selectedCompanyId: form.selectedCompanyId,
      mappingLevel: form.accessLevel === "all" ? "company" : "hotel",
      hotelId: form.hotelId,
    });
    if (error) return;
    setForm((prev) => ({ ...prev, submitting: true }));
    try {
      await onMapUser({
        companyId: form.selectedCompanyId,
        mappingLevel: form.accessLevel === "all" ? "company" : "hotel",
        hotelId: form.hotelId,
        autoMapProjects: true,
      });
      setForm((prev) => ({
        ...prev,
        hotelId: "",
      }));
    } finally {
      setForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} ariaHideApp={false} style={modalOverlayStyles}>
      <div className={styles.modalHeader}>
        <div>
          <h5 className={styles.modalTitle}>Manage Access</h5>
          <div className={styles.modalSubtitle}>
            Control which companies and business units <strong>{user.name}</strong> can access
          </div>
        </div>
        <button type="button" className={styles.modalClose} onClick={onClose}>
          <HiX size={16} />
        </button>
      </div>

      <div className={styles.modalBody}>
        {/* Current Access */}
        <div className={styles.modalSection}>
          <div className={styles.modalSectionTitle}>Current Access</div>

          {dedupedMappings.length === 0 ? (
            <div className={styles.accessEmptyState}>
              <div className={styles.accessEmptyIcon}>
                <BsBuilding size={28} />
              </div>
              <div>This user doesn't have access to any companies yet.</div>
              <div style={{ marginTop: 4 }}>Grant access below to get started.</div>
            </div>
          ) : (
            <div className={styles.accessList}>
              {dedupedMappings.map((mapping) => (
                <div
                  key={`${mapping.mapping_type}-${mapping.hospitality_hotel_id || "co"}-${mapping.hospitality_company_id}`}
                  className={styles.accessRow}
                >
                  <div className={styles.accessRowInfo}>
                    <span className={styles.accessRowCompany}>
                      {mapping.company_name || "Company"}
                    </span>
                    <span className={styles.accessRowScope}>
                      {mapping.mapping_type === 0
                        ? "All Business Units"
                        : mapping.hotel_name || "Business Unit"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.accessRowRemove}
                    onClick={() => onRemoveMapping(mapping)}
                    title="Remove access"
                  >
                    <HiX size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grant Access */}
        {availableCompanies.length > 0 && (
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>Grant New Access</div>
            <div className={styles.addAccessSection}>
              {/* Step 1: Company */}
              <div className={styles.stepRow}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepLabel}>Which company?</span>
              </div>
              <div style={{ marginBottom: 14 }}>
                <select
                  className={styles.formSelect}
                  value={form.selectedCompanyId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      selectedCompanyId: val,
                      hotelId: "",
                    }));
                    if (val && onLoadHotels) onLoadHotels(val);
                  }}
                >
                  <option value="" disabled>Choose a company...</option>
                  {availableCompanies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Access Level */}
              <div className={styles.stepRow}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepLabel}>What level of access?</span>
              </div>
              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="accessLevel"
                    value="all"
                    checked={form.accessLevel === "all"}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        accessLevel: "all",
                        hotelId: "",
                      }))
                    }
                  />
                  All business units in this company
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="accessLevel"
                    value="specific"
                    checked={form.accessLevel === "specific"}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        accessLevel: "specific",
                      }))
                    }
                  />
                  Only a specific business unit
                </label>
              </div>

              {/* Step 3: Business Unit (conditional) */}
              {form.accessLevel === "specific" && (
                <>
                  <div className={styles.stepRow}>
                    <span className={styles.stepNumber}>3</span>
                    <span className={styles.stepLabel}>Which business unit?</span>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <select
                      className={styles.formSelect}
                      value={form.hotelId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, hotelId: e.target.value }))
                      }
                    >
                      <option value="">Choose a business unit...</option>
                      {selectedCompanyHotels.map((hotel) => (
                        <option key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                type="button"
                className={styles.primaryBtn}
                disabled={form.submitting || !form.selectedCompanyId}
                onClick={handleSubmit}
              >
                {form.submitting ? "Granting access..." : "Grant Access"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.modalFooter}>
        <button type="button" className={styles.submitBtn} onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
};

export default AssignAccessModal;
