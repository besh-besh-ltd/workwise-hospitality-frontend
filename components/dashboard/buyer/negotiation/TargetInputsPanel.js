import React from 'react';
import { NUMERIC_FIELDS } from './NegotiationFieldsSelect';
import styles from './NegotiationUI.module.scss';

const FIELD_CONFIG = {
  base_price: {
    label: 'Target Base Price (₹)',
    key: 'target_base_price',
    type: 'number',
    placeholder: 'Enter target base price',
    step: '0.01',
    min: '0',
  },
  freight: {
    label: 'Target Freight',
    key: 'target_freight',
    modeKey: 'target_freight_mode',
    type: 'number',
    placeholder: 'Enter target freight',
    step: '0.01',
    min: '0',
    hasMode: true,
  },
  packaging: {
    label: 'Target Packaging',
    key: 'target_packaging',
    modeKey: 'target_packaging_mode',
    type: 'number',
    placeholder: 'Enter target packaging',
    step: '0.01',
    min: '0',
    hasMode: true,
  },
  delivery_period: {
    label: 'Target Delivery Date',
    key: 'target_delivery_date',
    type: 'date',
    placeholder: '',
  },
};

const TargetInputsPanel = ({ selectedFields = [], formData, onFormChange, disabled = false }) => {
  const numericSelected = selectedFields.filter(f => NUMERIC_FIELDS.includes(f));

  const handleInputChange = (key, value) => {
    onFormChange({ [key]: value });
  };

  const handleModeToggle = (modeKey, currentMode) => {
    const newMode = currentMode === 'percentage' ? 'amount' : 'percentage';
    onFormChange({ [modeKey]: newMode });
  };

  return (
    <section className={`${styles.targetInputsSection} ${disabled ? styles.targetInputsDisabled : ''}`}>
      <div className={styles.targetInputsGrid}>
        {numericSelected.map(fieldKey => {
          const config = FIELD_CONFIG[fieldKey];
          if (!config) return null;

          const value = formData[config.key] || '';
          const mode = config.modeKey ? (formData[config.modeKey] || 'percentage') : null;

          return (
            <div key={fieldKey} className={styles.targetInputCard}>
              <label className={styles.formLabel}>
                {config.label}
                {config.hasMode && mode && (
                  <span className={styles.modeLabelHint}>
                    ({mode === 'percentage' ? '%' : '₹'})
                  </span>
                )}
                <span className={styles.requiredMark}>*</span>
              </label>

              <div className={styles.targetInputRow}>
                <input
                  type={config.type}
                  step={config.step}
                  min={config.min}
                  value={value}
                  onChange={(e) => handleInputChange(config.key, e.target.value)}
                  placeholder={config.placeholder}
                  disabled={disabled}
                  className={styles.fieldInput}
                />

                {config.hasMode && (
                  <div className={styles.modeToggle}>
                    <button
                      type="button"
                      className={`${styles.modeToggleBtn} ${mode === 'percentage' ? styles.modeToggleBtnActive : ''}`}
                      onClick={() => handleModeToggle(config.modeKey, mode)}
                      disabled={disabled}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      className={`${styles.modeToggleBtn} ${mode === 'amount' ? styles.modeToggleBtnActive : ''}`}
                      onClick={() => handleModeToggle(config.modeKey, mode)}
                      disabled={disabled}
                    >
                      ₹
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className={styles.targetInputCard}>
          <label htmlFor="neg-end-date" className={styles.formLabel}>
            End Date <span className={styles.requiredMark}>*</span>
          </label>
          <input
            id="neg-end-date"
            type="datetime-local"
            value={formData.end_date || ''}
            onChange={(e) => onFormChange({ end_date: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
            required
            disabled={disabled}
            className={styles.fieldInput}
          />
          <p className={styles.formHint}>
            Vendors can submit one quote per product until this date.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TargetInputsPanel;
