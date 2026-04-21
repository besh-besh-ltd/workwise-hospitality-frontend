import React from 'react';
import styles from './NegotiationUI.module.scss';

export const NEGOTIATION_FIELD_OPTIONS = [
  { value: 'base_price', label: 'Base Price', inputType: 'number', placeholder: 'Enter target base price', step: '0.01', min: '0', hasMode: false },
  { value: 'freight', label: 'Freight', inputType: 'number', placeholder: 'Enter target freight', step: '0.01', min: '0', hasMode: true, modeKey: 'target_freight_mode' },
  { value: 'packaging', label: 'Packaging', inputType: 'number', placeholder: 'Enter target packaging', step: '0.01', min: '0', hasMode: true, modeKey: 'target_packaging_mode' },
  { value: 'delivery_period', label: 'Delivery Period', inputType: 'date', placeholder: '' },
  { value: 'payment_terms', label: 'Payment Terms', inputType: 'text', placeholder: 'Enter target payment terms' },
  { value: 'vendor_tc', label: 'Vendor T&C', inputType: 'text', placeholder: 'Enter target T&C' },
  { value: 'comments', label: 'Comments', inputType: 'text', placeholder: 'Enter target comments' },
];

export const NUMERIC_FIELDS = ['base_price', 'freight', 'packaging', 'delivery_period'];
export const TEXT_FIELDS = ['payment_terms', 'vendor_tc', 'comments'];

// Map field value to its formData target key
export const FIELD_TARGET_KEYS = {
  base_price: 'target_base_price',
  freight: 'target_freight',
  packaging: 'target_packaging',
  delivery_period: 'target_delivery_date',
  payment_terms: 'target_payment_terms',
  vendor_tc: 'target_vendor_tc',
  comments: 'target_comments',
};

const NegotiationFieldsSelect = ({ selectedFields = [], onToggleField, formData, onFormChange, disabled = false }) => {

  const handleCardClick = (fieldValue) => {
    if (disabled) return;
    onToggleField(fieldValue);
  };

  const handleInputChange = (targetKey, value) => {
    onFormChange({ [targetKey]: value });
  };

  const handleModeToggle = (modeKey, currentMode) => {
    const newMode = currentMode === 'percentage' ? 'amount' : 'percentage';
    onFormChange({ [modeKey]: newMode });
  };

  return (
    <section className={`${styles.negotiationFieldsSection} ${disabled ? styles.negotiationFieldsDisabled : ''}`}>
      <div className={styles.negotiationFieldsHeader}>
        <div>
          <p className={styles.negotiationFieldsTitle}>Negotiation Fields</p>
          <p className={styles.negotiationFieldsHint}>
            {disabled
              ? 'Select a vendor first to configure negotiation fields.'
              : 'Select fields to negotiate and set global target values for selected vendors.'}
          </p>
        </div>
      </div>
      <div className={styles.negFieldCardsGrid}>
        {NEGOTIATION_FIELD_OPTIONS.map(field => {
          const isSelected = selectedFields.includes(field.value);
          const targetKey = FIELD_TARGET_KEYS[field.value];
          const targetValue = formData[targetKey] || '';
          const mode = field.modeKey ? (formData[field.modeKey] || 'percentage') : null;

          return (
            <div
              key={field.value}
              className={`${styles.negFieldCard} ${isSelected ? styles.negFieldCardSelected : ''} ${disabled ? styles.negFieldCardDisabled : ''}`}
              onClick={() => handleCardClick(field.value)}
            >
              <div className={styles.negFieldCardHeader}>
                <p className={styles.negFieldCardLabel}>{field.label}</p>
                <span className={`${styles.negFieldCardCheck} ${isSelected ? styles.negFieldCardCheckActive : ''}`}>
                  {isSelected ? '✓' : ''}
                </span>
              </div>

              {isSelected && (
                <div
                  className={styles.negFieldCardInputArea}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className={styles.negFieldInputLabel}>
                    Global Target
                    {field.hasMode && mode && (
                      <span className={styles.modeLabelHint}>
                        ({mode === 'percentage' ? '%' : '₹'})
                      </span>
                    )}
                  </label>
                  <div className={styles.negFieldInputRow}>
                    <input
                      type={field.inputType}
                      step={field.step}
                      min={field.min}
                      value={targetValue}
                      onChange={(e) => handleInputChange(targetKey, e.target.value)}
                      placeholder={field.placeholder}
                      className={styles.negFieldInput}
                    />
                    {field.hasMode && (
                      <div className={styles.modeToggle}>
                        <button
                          type="button"
                          className={`${styles.modeToggleBtn} ${mode === 'percentage' ? styles.modeToggleBtnActive : ''}`}
                          onClick={() => handleModeToggle(field.modeKey, mode)}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={`${styles.modeToggleBtn} ${mode === 'amount' ? styles.modeToggleBtnActive : ''}`}
                          onClick={() => handleModeToggle(field.modeKey, mode)}
                        >
                          ₹
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default NegotiationFieldsSelect;
