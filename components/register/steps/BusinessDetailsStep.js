import React from "react";
import { Field } from "formik";
import Select from "react-select";
import FileUploadField from "../FileUploadField";
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
};

const BusinessDetailsStep = ({
  values,
  errors,
  touched,
  setFieldValue,
  isHospitality,
  registerAs,
  locationOptions,
  categoryOptions,
  subcategoryOptions,
  loadingSubcategories,
  handleCountrySelect,
  handleStateSelect,
  handleCategoryChange,
  documentFiles,
  handleDocumentUpload,
  tncAccepted,
  cocAccepted,
  handleTnCClick,
  handleCoCClick,
  requiresFssaiForSelection,
}) => {
  return (
    <>
      {/* ── Location Section ──────────────────────── */}
      <div className={styles.sectionTitle}>Location</div>
      <div className={styles.formRow3}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Country <span className={styles.formRequired}>*</span>
          </label>
          <select
            className={styles.formSelect}
            value={values.country}
            onChange={(e) => handleCountrySelect(e.target.value, setFieldValue)}
          >
            <option value="">Select country</option>
            {locationOptions.countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.country_name}
              </option>
            ))}
          </select>
          {touched.country && errors.country && (
            <div className={styles.formError}>{errors.country}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            State <span className={styles.formRequired}>*</span>
          </label>
          <select
            className={styles.formSelect}
            value={values.state}
            onChange={(e) => handleStateSelect(e.target.value, setFieldValue)}
            disabled={!values.country}
          >
            <option value="">Select state</option>
            {locationOptions.states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.state_name}
              </option>
            ))}
          </select>
          {touched.state && errors.state && (
            <div className={styles.formError}>{errors.state}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            City <span className={styles.formRequired}>*</span>
          </label>
          <select
            className={styles.formSelect}
            value={values.city}
            onChange={(e) => setFieldValue("city", e.target.value)}
            disabled={!values.state}
          >
            <option value="">Select city</option>
            {locationOptions.cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.city_name}
              </option>
            ))}
          </select>
          {touched.city && errors.city && (
            <div className={styles.formError}>{errors.city}</div>
          )}
        </div>
      </div>

      {/* ── Categories Section ────────────────────── */}
      <div className={styles.sectionTitle}>Categories</div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Select Categories <span className={styles.formRequired}>*</span>
        </label>
        <div className={touched.categories && errors.categories ? styles.selectInvalid : ""}>
          <Select
            isMulti
            name="categories"
            options={categoryOptions}
            value={categoryOptions.filter((opt) =>
              values.categories?.includes(opt.value)
            )}
            onChange={(selected) =>
              handleCategoryChange(selected, setFieldValue, values)
            }
            placeholder="Search and select categories"
            isClearable
            isSearchable
            styles={selectStyles}
          />
        </div>
        {touched.categories && errors.categories && (
          <div className={styles.formError}>{errors.categories}</div>
        )}
      </div>

      {/* Subcategories per selected category */}
      {values.categories && values.categories.length > 0 && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Select Subcategories
          </label>
          {values.categories.map((categoryId) => {
            const subs = subcategoryOptions[categoryId] || [];
            const isLoading = loadingSubcategories[categoryId];

            if (isLoading) {
              return (
                <div key={categoryId} className={styles.formHint} style={{ marginBottom: 8 }}>
                  Loading subcategories...
                </div>
              );
            }

            if (subs.length === 0) return null;

            const categoryName =
              categoryOptions.find((opt) => opt.value === categoryId)?.label || "Category";
            const selectedSubs = (values.subcategories || []).filter((subId) =>
              subs.some((sub) => sub.value === subId)
            );

            return (
              <div key={categoryId} style={{ marginBottom: 10 }}>
                <div className={styles.formHint} style={{ marginBottom: 4 }}>
                  {categoryName}
                </div>
                <Select
                  isMulti
                  options={subs}
                  value={subs.filter((opt) => selectedSubs.includes(opt.value))}
                  onChange={(selected) => {
                    const allSubs = values.subcategories || [];
                    const otherSubs = allSubs.filter(
                      (subId) => !subs.some((sub) => sub.value === subId)
                    );
                    const newSubs = selected ? selected.map((opt) => opt.value) : [];
                    setFieldValue("subcategories", [...otherSubs, ...newSubs]);
                  }}
                  placeholder={`Select ${categoryName} subcategories`}
                  isClearable
                  isSearchable
                  styles={selectStyles}
                />
              </div>
            );
          })}
          {touched.subcategories && errors.subcategories && (
            <div className={styles.formError}>{errors.subcategories}</div>
          )}
        </div>
      )}

      {/* ── Documents Section (Hospitality) ───────── */}
      {isHospitality && (
        <>
          <div className={styles.sectionTitle}>Documents</div>

          {/* GSTIN */}
          <div className={styles.formGroup}>
            <label htmlFor="gstin" className={styles.formLabel}>
              GSTIN
            </label>
            <Field
              type="text"
              id="gstin"
              name="gstin"
              placeholder="Ex. 27AABCU9603R1ZX"
              maxLength="15"
              className={styles.formInput}
            />
            {touched.gstin && errors.gstin && (
              <div className={styles.formError}>{errors.gstin}</div>
            )}
            {values.gstin && (
              <div style={{ marginTop: 10 }}>
                <FileUploadField
                  label="GST Certificate"
                  required
                  file={documentFiles.gst}
                  onChange={(file) => handleDocumentUpload("gst", file)}
                  hint="PDF, JPG, or PNG"
                />
              </div>
            )}
          </div>

          {/* PAN */}
          <div className={styles.formGroup}>
            <label htmlFor="pan" className={styles.formLabel}>
              PAN Number <span className={styles.formRequired}>*</span>
            </label>
            <Field name="pan">
              {({ field, form }) => (
                <input
                  {...field}
                  type="text"
                  id="pan"
                  placeholder="Ex. ABCDE1234F"
                  maxLength="10"
                  className={styles.formInput}
                  onChange={(e) => form.setFieldValue("pan", e.target.value.toUpperCase())}
                />
              )}
            </Field>
            {touched.pan && errors.pan && (
              <div className={styles.formError}>{errors.pan}</div>
            )}
            <div style={{ marginTop: 10 }}>
              <FileUploadField
                label="PAN Card"
                required
                file={documentFiles.pan}
                onChange={(file) => handleDocumentUpload("pan", file)}
                hint="PDF, JPG, or PNG"
              />
            </div>
          </div>

          {/* FSSAI */}
          <div className={styles.formGroup}>
            <label htmlFor="fssai" className={styles.formLabel}>
              FSSAI License Number
            </label>
            <Field
              type="text"
              id="fssai"
              name="fssai"
              placeholder="Ex. 11234567000123"
              className={styles.formInput}
            />
            {touched.fssai && errors.fssai && (
              <div className={styles.formError}>{errors.fssai}</div>
            )}
            {(values.fssai || requiresFssaiForSelection(values.categories || [])) && (
              <div style={{ marginTop: 10 }}>
                <FileUploadField
                  label="FSSAI License"
                  required
                  file={documentFiles.fssai}
                  onChange={(file) => handleDocumentUpload("fssai", file)}
                  hint="PDF, JPG, or PNG"
                />
              </div>
            )}
          </div>

          {/* MSME */}
          <div className={styles.formGroup}>
            <label htmlFor="msme" className={styles.formLabel}>
              MSME Certificate Number
            </label>
            <Field
              type="text"
              id="msme"
              name="msme"
              placeholder="Ex. UDYAM-XX-XXXXXX-XXXXX"
              className={styles.formInput}
            />
            {touched.msme && errors.msme && (
              <div className={styles.formError}>{errors.msme}</div>
            )}
            {values.msme && (
              <div style={{ marginTop: 10 }}>
                <FileUploadField
                  label="MSME Certificate"
                  required
                  file={documentFiles.msme}
                  onChange={(file) => handleDocumentUpload("msme", file)}
                  hint="PDF, JPG, or PNG"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ── T&C / CoC (Non-hospitality final step) ── */}
      {!isHospitality && registerAs === "vendor" && (
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

export default BusinessDetailsStep;
