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

const NegotiationFieldsSelect = ({ selectedFields = [], onToggleField, formData, onFormChange, disabled = false, dynamicChargeFields = [], defaultCharges = [], excludeKeys = [], l1Map = null, l1TaxMap = null, showTaxInput = false, includeOnlyKeys = null }) => {

  // Build the full list of fields: static options + default charges from API.
  // - `excludeKeys` hides specific options.
  // - `includeOnlyKeys` (when provided) RESTRICTS the list to those slugs.
  //   Used by the RFQ-level wizard mode, which surfaces only payment_terms,
  //   global_comment, documents, and quote-level global charges (is_global).
  const allFieldOptions = React.useMemo(() => {
    const excluded = new Set(excludeKeys);
    const includeOnly = includeOnlyKeys ? new Set(includeOnlyKeys) : null;
    const passes = (slug) =>
      !excluded.has(slug) && (!includeOnly || includeOnly.has(slug));

    const fields = NEGOTIATION_FIELD_OPTIONS.filter(f => passes(f.value));
    const existingSlugs = new Set(fields.map(f => f.value));

    // RFQ-level mode also needs `global_comment` and `documents` — they're
    // not in the static NEGOTIATION_FIELD_OPTIONS list, so synthesize them
    // when the caller has asked for them via `includeOnlyKeys`.
    const synthesizeText = (slug, label) => {
      if (!passes(slug)) return;
      if (existingSlugs.has(slug)) return;
      existingSlugs.add(slug);
      fields.push({
        value: slug,
        label,
        inputType: 'text',
        placeholder: `Enter target ${label.toLowerCase()}`,
      });
    };
    if (includeOnly?.has('global_comment')) synthesizeText('global_comment', 'Global Comment');
    // `documents` is offered in BOTH modes, under the label for the file set the
    // vendor answers with: quote-wide attachments at RFQ level, that line's
    // attachments per product. Offering it only at RFQ level left the per-line
    // uploader permanently shut — isFieldNegotiable reads the product's own
    // fields, so a quote-wide ask could never open it (reported on RFQ 536363).
    if (includeOnly) {
      if (includeOnly.has('documents')) synthesizeText('documents', 'RFQ Documents');
    } else {
      synthesizeText('documents', 'Documents');
    }

    // In RFQ-level mode we want is_global charges; otherwise per-product only.
    const wantGlobal = !!includeOnly;
    defaultCharges
      .filter(c => wantGlobal ? c.is_global : !c.is_global)
      .forEach(charge => {
        const slug = charge.slug || charge.name;
        if (!passes(slug)) return;
        if (!existingSlugs.has(slug)) {
          existingSlugs.add(slug);
          fields.push(buildChargeFieldOption(charge));
        }
      });
    return fields;
  }, [defaultCharges, excludeKeys, includeOnlyKeys]);

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
                  {showTaxInput && (field.hasMode || field.value === 'base_price') && (() => {
                    // Tax is no longer a numeric target at the global level —
                    // buyers raise tax demands per vendor via the card's
                    // Demand/Negotiate flow. Here we only anchor with the
                    // lowest quoted tax (L1).
                    const taxL1 = l1TaxMap && l1TaxMap[field.value];
                    if (!taxL1) return null;
                    return (
                      <label className={styles.negFieldInputLabel} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span>Tax (GST)</span>
                        <span
                          title={`Lowest tax from ${taxL1.vendorName || 'vendor'}`}
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: '#15803d',
                            background: '#dcfce7',
                            border: '1px solid #bbf7d0',
                            padding: '1px 6px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          L1: {taxL1.displayText}
                        </span>
                      </label>
                    );
                  })()}
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
