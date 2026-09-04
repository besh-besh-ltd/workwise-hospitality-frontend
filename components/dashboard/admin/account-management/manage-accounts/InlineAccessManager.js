import React, { useState, useEffect, useRef } from "react";
import { HiX } from "react-icons/hi";
import { BsBuilding, BsCheckCircleFill } from "react-icons/bs";
import { validateMapping } from "./accessUtils";
import styles from "./ManageAccounts.module.scss";

const InlineAccessManager = ({
  hospitalityCompanies,
  hotelsByCompany,
  pendingMappings,
  onAddMapping,
  onRemoveMapping,
  onLoadHotels,
}) => {
  const [form, setForm] = useState({
    selectedCompanyId: "",
    accessLevel: "all",
    hotelId: "",
  });
  const [successMsg, setSuccessMsg] = useState(null);
  const successTimer = useRef(null);

  useEffect(() => {
    return () => { if (successTimer.current) clearTimeout(successTimer.current); };
  }, []);

  // Companies already mapped at company-level (all BUs) should be excluded entirely
  const companyLevelMappedIds = new Set(
    pendingMappings
      .filter((m) => m.mappingLevel === "company")
      .map((m) => String(m.companyId))
  );

  // Hotels already individually mapped — keyed as "companyId-hotelId"
  const mappedHotelKeys = new Set(
    pendingMappings
      .filter((m) => m.mappingLevel !== "company" && m.hotelId)
      .map((m) => `${m.companyId}-${m.hotelId}`)
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

  const selectedCompanyName = hospitalityCompanies?.find(
    (c) => String(c.id) === String(form.selectedCompanyId)
  )?.name;

  const selectedHotelName = selectedCompanyHotels.find(
    (h) => String(h.id) === String(form.hotelId)
  )?.name;

  const handleAdd = () => {
    const mappingLevel = form.accessLevel === "all" ? "company" : "hotel";
    const error = validateMapping({
      selectedCompanyId: form.selectedCompanyId,
      mappingLevel,
      hotelId: form.hotelId,
    });
    if (error) return;

    const label = mappingLevel === "company"
      ? `${selectedCompanyName || "Company"} (All Business Units)`
      : `${selectedHotelName || "Business Unit"} — ${selectedCompanyName || "Company"}`;

    onAddMapping({
      companyId: form.selectedCompanyId,
      companyName: selectedCompanyName || "Company",
      mappingLevel,
      hotelId: form.hotelId,
      hotelName: selectedHotelName || "Business Unit",
      autoMapProjects: true,
    });

    setForm({ selectedCompanyId: "", accessLevel: "all", hotelId: "" });

    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccessMsg(label);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div>
      {/* Current Access */}
      {pendingMappings.length > 0 ? (
        <div className={styles.accessList} style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {pendingMappings.map((mapping, index) => (
            <div key={index} className={styles.accessRow}>
              <div className={styles.accessRowInfo}>
                <span className={styles.accessRowCompany}>{mapping.companyName}</span>
                <span className={styles.accessRowScope}>
                  {mapping.mappingLevel === "company"
                    ? "All Business Units"
                    : mapping.hotelName || "Business Unit"}
                </span>
              </div>
              <button
                type="button"
                className={styles.accessRowRemove}
                onClick={() => onRemoveMapping(index)}
                title="Remove access"
              >
                <HiX size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.accessEmptyState} style={{ marginBottom: 16 }}>
          <div className={styles.accessEmptyIcon}>
            <BsBuilding size={24} />
          </div>
          <div>This user doesn't have access to any companies yet.</div>
          <div style={{ marginTop: 4 }}>Grant access below to get started.</div>
        </div>
      )}

      {/* Grant Access Form */}
      {availableCompanies.length > 0 && (
        <div className={styles.addAccessSection}>
          <div className={styles.addAccessTitle}>Grant New Access</div>

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

          <div className={styles.stepRow}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepLabel}>What level of access?</span>
          </div>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="createAccessLevel"
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
                name="createAccessLevel"
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

          {successMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', marginBottom: 12, borderRadius: 8,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              fontSize: 13, color: '#166534', fontWeight: 500,
              animation: 'fadeInAccess 0.2s ease',
            }}>
              <BsCheckCircleFill size={14} style={{ flexShrink: 0 }} />
              <span>Access granted for {successMsg}</span>
            </div>
          )}

          <button
            type="button"
            className={styles.primaryBtn}
            disabled={!form.selectedCompanyId}
            onClick={handleAdd}
          >
            Grant Access
          </button>
          <style jsx>{`
            @keyframes fadeInAccess {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default InlineAccessManager;
