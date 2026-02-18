import React from "react";
import { Field } from "formik";
import FileUploadField from "../FileUploadField";
import styles from "../Register.module.css";

const BankDetailsStep = ({
  values,
  errors,
  touched,
  documentFiles,
  handleDocumentUpload,
}) => {
  return (
    <>
      <div className={styles.sectionTitle}>Bank Account Details</div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="account_holder_name" className={styles.formLabel}>
            Account Holder Name <span className={styles.formRequired}>*</span>
          </label>
          <Field
            type="text"
            id="account_holder_name"
            name="account_holder_name"
            placeholder="Ex. John Doe"
            className={styles.formInput}
          />
          {touched.account_holder_name && errors.account_holder_name && (
            <div className={styles.formError}>{errors.account_holder_name}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="bank_name" className={styles.formLabel}>
            Bank Name <span className={styles.formRequired}>*</span>
          </label>
          <Field
            type="text"
            id="bank_name"
            name="bank_name"
            placeholder="Ex. State Bank of India"
            className={styles.formInput}
          />
          {touched.bank_name && errors.bank_name && (
            <div className={styles.formError}>{errors.bank_name}</div>
          )}
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="bank_account_number" className={styles.formLabel}>
            Bank Account Number <span className={styles.formRequired}>*</span>
          </label>
          <Field
            type="text"
            id="bank_account_number"
            name="bank_account_number"
            placeholder="Ex. 1234567890"
            className={styles.formInput}
          />
          {touched.bank_account_number && errors.bank_account_number && (
            <div className={styles.formError}>{errors.bank_account_number}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="ifsc_code" className={styles.formLabel}>
            IFSC Code <span className={styles.formRequired}>*</span>
          </label>
          <Field name="ifsc_code">
            {({ field, form }) => (
              <input
                {...field}
                type="text"
                id="ifsc_code"
                placeholder="Ex. SBIN0001234"
                className={styles.formInput}
                maxLength="11"
                onChange={(e) => form.setFieldValue("ifsc_code", e.target.value.toUpperCase())}
              />
            )}
          </Field>
          {touched.ifsc_code && errors.ifsc_code && (
            <div className={styles.formError}>{errors.ifsc_code}</div>
          )}
        </div>
      </div>

      <FileUploadField
        label="Cancelled Cheque"
        required
        file={documentFiles.cancelled_cheque}
        onChange={(file) => handleDocumentUpload("cancelled_cheque", file)}
        error={!documentFiles.cancelled_cheque ? "Cancelled cheque upload is required" : null}
        hint="PDF, JPG, or PNG"
      />
    </>
  );
};

export default BankDetailsStep;
