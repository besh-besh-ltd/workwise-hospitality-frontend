import React from 'react';
import styles from './NegotiationUI.module.scss';

export const NEGOTIATION_FIELD_OPTIONS = [
  { value: 'base_price', label: 'Base Price', inputType: 'number', placeholder: 'Enter target base price', step: '0.01', min: '0', hasMode: false },
  { value: 'payment_terms', label: 'Payment Terms', inputType: 'text', placeholder: 'Enter target payment terms' },
];

// Build dynamic charge field option from charge object { name, slug } or string
export const buildChargeFieldOption = (charge) => {
  const name = typeof charge === 'string' ? charge : charge.name;
  const slug = typeof charge === 'string' ? charge : (charge.slug || charge.name);
  return {
    value: slug,
    label: name,
    inputType: 'number',
    placeholder: `Enter target ${name.toLowerCase()}`,
    step: '0.01',
    min: '0',
    hasMode: true,
    modeKey: `target_${slug}_mode`,
    isDynamic: true,
  };
};

export const NUMERIC_FIELDS = ['base_price', 'delivery_period'];
export const TEXT_FIELDS = ['payment_terms', 'vendor_tc', 'comment', 'global_comment', 'documents'];

// Map field value to its formData target key
export const FIELD_TARGET_KEYS = {
  base_price: 'target_base_price',
  delivery_period: 'target_delivery_date',
  payment_terms: 'target_payment_terms',
  vendor_tc: 'target_vendor_tc',
  comment: 'target_comment',
  global_comment: 'target_global_comment',
};

// Get target key for dynamic charge fields
export const getChargeTargetKey = (fieldValue) => {
  if (FIELD_TARGET_KEYS[fieldValue]) return FIELD_TARGET_KEYS[fieldValue];
  return `target_${fieldValue}`;
};

const NegotiationFieldsSelect = ({ selectedFields = [], onToggleField, formData, onFormChange, disabled = false, dynamicChargeFields = [], defaultCharges = [], excludeKeys = [], l1Map = null }) => {

  // Build the full list of fields: static options + default charges from API (created_by === null)
  // `excludeKeys` lets callers hide options (e.g. fields handled by a separate UI surface).
  const allFieldOptions = React.useMemo(() => {
    const excluded = new Set(excludeKeys);
    const fields = NEGOTIATION_FIELD_OPTIONS.filter(f => !excluded.has(f.value));
    const existingSlugs = new Set(fields.map(f => f.value));
    defaultCharges.filter(c => !c.is_global).forEach(charge => {
      const slug = charge.slug || charge.name;
      if (excluded.has(slug)) return;
      if (!existingSlugs.has(slug)) {
        existingSlugs.add(slug);
        fields.push(buildChargeFieldOption(charge));
      }
    });
    return fields;
  }, [defaultCharges, excludeKeys]);

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
      <div style={{ position: 'relative' }}>
        {disabled && (
          <div className={styles.negFieldsOverlay}>
            <p className={styles.negFieldsOverlayText}>Please select at least one vendor to start negotiation</p>
          </div>
        )}
        <div className={styles.negFieldCardsGrid}>
        {allFieldOptions.map(field => {
          const isSelected = selectedFields.includes(field.value);
          const targetKey = getChargeTargetKey(field.value);
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
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {l1Map && l1Map[field.value] && (
                    <span
                      title={`Lowest from ${l1Map[field.value].vendorName || 'vendor'}`}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: '#15803d',
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        padding: '2px 8px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      L1: {l1Map[field.value].displayText}
                    </span>
                  )}
                  <span className={`${styles.negFieldCardCheck} ${isSelected ? styles.negFieldCardCheckActive : ''}`}>
                    {isSelected ? '✓' : ''}
                  </span>
                </div>
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
      </div>
    </section>
  );
};

export default NegotiationFieldsSelect;
