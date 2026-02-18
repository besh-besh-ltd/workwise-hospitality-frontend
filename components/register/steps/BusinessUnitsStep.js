import React from "react";
import Select from "react-select";
import styles from "../Register.module.css";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#158993" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(21,137,147,0.1)" : "none",
    borderRadius: 8,
    minHeight: 42,
    fontSize: 14,
    "&:hover": { borderColor: "#158993" },
  }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 14 }),
  multiValue: (base) => ({
    ...base,
    background: "#f0fdfa",
    borderRadius: 6,
    border: "1px solid #ccfbf1",
  }),
  multiValueLabel: (base) => ({ ...base, color: "#0f766e", fontSize: 13 }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#0f766e",
    "&:hover": { background: "#ccfbf1", color: "#ef4444" },
  }),
  option: (base) => ({ ...base, padding: "8px 12px" }),
};

const BusinessUnitsStep = ({
  values,
  errors,
  touched,
  setFieldValue,
  hotelOptions,
  loadingHotels,
  registerAs,
  tncAccepted,
  cocAccepted,
  handleTnCClick,
  handleCoCClick,
}) => {
  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Select Business Units <span className={styles.formRequired}>*</span>
        </label>
        <div className={touched.hotels && errors.hotels ? styles.selectInvalid : ""}>
          <Select
            isMulti
            name="hotels"
            options={hotelOptions}
            value={hotelOptions.filter((opt) =>
              values.hotels?.includes(opt.value)
            )}
            onChange={(selected) => {
              const ids = selected ? selected.map((opt) => opt.value) : [];
              setFieldValue("hotels", ids);
            }}
            placeholder="Search and select business units"
            isClearable
            isSearchable
            isLoading={loadingHotels}
            styles={selectStyles}
            formatOptionLabel={(option) => (
              <div>
                <div className={styles.hotelOptionMain}>{option.label}</div>
                {(option.company_name || option.city) && (
                  <div className={styles.hotelOptionSub}>
                    {option.company_name}
                    {option.company_name && option.city ? " \u2022 " : ""}
                    {option.city}
                  </div>
                )}
              </div>
            )}
          />
        </div>
        {touched.hotels && errors.hotels && (
          <div className={styles.formError}>{errors.hotels}</div>
        )}
      </div>

      {/* T&C / CoC */}
      {registerAs === "vendor" && (
        <div className={styles.tncGroup}>
          <div
            className={`${styles.tncItem} ${tncAccepted ? styles.accepted : ""}`}
            onClick={handleTnCClick}
          >
            <input
              type="checkbox"
              checked={!!tncAccepted}
              disabled
              readOnly
              className={styles.tncCheckbox}
              onChange={() => {}}
            />
            <span className={styles.tncLabel}>
              I agree to the <strong>Terms & Conditions</strong>
            </span>
          </div>
          <div
            className={`${styles.tncItem} ${cocAccepted ? styles.accepted : ""}`}
            onClick={handleCoCClick}
          >
            <input
              type="checkbox"
              checked={!!cocAccepted}
              disabled
              readOnly
              className={styles.tncCheckbox}
              onChange={() => {}}
            />
            <span className={styles.tncLabel}>
              I agree to the <strong>Ethical Code of Conduct</strong>
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default BusinessUnitsStep;
