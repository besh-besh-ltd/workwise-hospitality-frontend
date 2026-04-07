import React from "react";
import styles from "../Register.module.css";

const formatLabel = (value) => {
  if (value === null || value === undefined || value === "") return "--";
  return value;
};

const maskAccountNumber = (value) => {
  if (!value) return "--";
  const account = String(value);
  if (account.length <= 4) return account;
  return `${"*".repeat(Math.max(account.length - 4, 0))}${account.slice(-4)}`;
};

const renderList = (items, emptyLabel) => {
  if (!items.length) {
    return <div className={styles.summaryEmpty}>{emptyLabel}</div>;
  }

  return (
    <div className={styles.summaryChipList}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className={styles.summaryChip}>
          {item}
        </span>
      ))}
    </div>
  );
};

const ReviewPayStep = ({
  values,
  categoryNames,
  subcategoryNames,
  hotelNames,
  locationLabel,
  documentFiles,
  totalAmount,
  perCategoryFee,
}) => {
  const documentEntries = [
    { label: "PAN Card", file: documentFiles.pan, required: true },
    { label: "GST Certificate", file: documentFiles.gst, required: false },
    { label: "MSME Certificate", file: documentFiles.msme, required: false },
    { label: "FSSAI Certificate", file: documentFiles.fssai, required: false },
    { label: "Cancelled Cheque", file: documentFiles.cancelled_cheque, required: true },
  ];

  const calculationText =
    hotelNames.length > 0
      ? `${categoryNames.length} categories × Rs. ${perCategoryFee} × ${hotelNames.length} business units`
      : `${categoryNames.length} categories × Rs. ${perCategoryFee}`;

  return (
    <div className={styles.reviewStep}>
      <div className={styles.reviewIntro}>
        <div>
          <div className={styles.reviewKicker}>Final step</div>
          <h3 className={styles.reviewTitle}>Review your registration</h3>
          <p className={styles.reviewText}>
            Verify the information below before proceeding to payment.
          </p>
        </div>
        <div className={styles.reviewAmountCard}>
          <div className={styles.reviewAmountLabel}>Total payable</div>
          <div className={styles.reviewAmountValue}>Rs. {totalAmount}</div>
        </div>
      </div>

      <div className={styles.reviewLayout}>
        <section className={styles.reviewCard}>
          <div className={styles.reviewCardTitle}>Account and business</div>
          <div className={styles.reviewDetailList}>
            <div className={styles.reviewDetailRow}>
              <span>Contact person</span>
              <strong>{formatLabel(values.name)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>Work email</span>
              <strong>{formatLabel(values.email)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>Mobile</span>
              <strong>{values.countryCode ? `${values.countryCode}-` : ""}{formatLabel(values.mobile)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>Organization</span>
              <strong>{formatLabel(values.organization_name)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>Location</span>
              <strong>{formatLabel(locationLabel)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>PAN</span>
              <strong>{formatLabel(values.pan)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>GSTIN</span>
              <strong>{formatLabel(values.gstin)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>MSME</span>
              <strong>{formatLabel(values.msme)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>FSSAI</span>
              <strong>{formatLabel(values.fssai)}</strong>
            </div>
          </div>
        </section>

        <section className={styles.reviewCard}>
          <div className={styles.reviewCardTitle}>Selected coverage</div>
          <div className={styles.reviewSection}>
            <div className={styles.reviewInfoLabel}>Categories</div>
            {renderList(categoryNames, "No categories selected")}
          </div>
          <div className={styles.reviewSection}>
            <div className={styles.reviewInfoLabel}>Subcategories</div>
            {renderList(subcategoryNames, "No subcategories selected")}
          </div>
          <div className={styles.reviewSection}>
            <div className={styles.reviewInfoLabel}>Business units</div>
            {renderList(hotelNames, "No business units selected")}
          </div>
        </section>

        <section className={styles.reviewCard}>
          <div className={styles.reviewCardTitle}>Banking and documents</div>
          <div className={styles.reviewDetailList}>
            <div className={styles.reviewDetailRow}>
              <span>Account holder</span>
              <strong>{formatLabel(values.account_holder_name)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>Bank name</span>
              <strong>{formatLabel(values.bank_name)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>Account number</span>
              <strong>{maskAccountNumber(values.bank_account_number)}</strong>
            </div>
            <div className={styles.reviewDetailRow}>
              <span>IFSC</span>
              <strong>{formatLabel(values.ifsc_code)}</strong>
            </div>
          </div>

          <div className={styles.reviewSection}>
            <div className={styles.reviewInfoLabel}>Uploaded documents</div>
            <div className={styles.documentList}>
              {documentEntries.map(({ label, file, required }) => (
                <div key={label} className={styles.documentRow}>
                  <span className={styles.documentLabel}>
                    {label}
                    {required ? " *" : ""}
                  </span>
                  <span className={styles.documentValue}>{file?.name || "--"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.reviewCard} ${styles.reviewPaymentCard}`}>
          <div className={styles.reviewCardTitle}>Payment summary</div>
          <div className={styles.paymentSummaryGrid}>
            <div className={styles.paymentSummaryRow}>
              <span>Selected categories</span>
              <strong>{categoryNames.length}</strong>
            </div>
            <div className={styles.paymentSummaryRow}>
              <span>Selected business units</span>
              <strong>{hotelNames.length}</strong>
            </div>
            <div className={styles.paymentSummaryRow}>
              <span>Category fee</span>
              <strong>Rs. {perCategoryFee}</strong>
            </div>
            <div className={`${styles.paymentSummaryRow} ${styles.paymentSummaryNote}`}>
              <span>Calculation</span>
              <strong>{calculationText}</strong>
            </div>
            <div className={`${styles.paymentSummaryRow} ${styles.paymentSummaryTotal}`}>
              <span>Total payable</span>
              <strong>Rs. {totalAmount}</strong>
            </div>
          </div>
          <p className={styles.reviewPaymentHint}>
            Subscription validity ends on 31 March of the ongoing financial year.
          </p>
        </section>
      </div>
    </div>
  );
};

export default ReviewPayStep;
