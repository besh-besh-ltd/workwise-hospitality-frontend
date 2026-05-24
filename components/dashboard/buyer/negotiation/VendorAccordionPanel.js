import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { NEGOTIATION_FIELD_OPTIONS, FIELD_TARGET_KEYS, TEXT_FIELDS, buildChargeFieldOption, getChargeTargetKey } from './NegotiationFieldsSelect';
import styles from './NegotiationUI.module.scss';

/**
 * Format a charge value based on its mode (percentage or amount)
 */
const formatCharge = (value, mode) => {
  if (value == null || value === '' || value === 0) return null;
  if (mode === 'percentage') return `${value}%`;
  return `₹${Number(value).toLocaleString('en-IN')}`;
};

/**
 * Format payment terms array or string into readable text
 */
const formatPaymentTerms = (terms) => {
  if (!terms) return null;
  if (typeof terms === 'string') return terms;
  if (Array.isArray(terms) && terms.length > 0) {
    return terms.map(t => {
      if (typeof t === 'string') return t;
      const parts = [];
      if (t.value) parts.push(`${t.value}%`);
      if (t.type) parts.push(t.type);
      if (t.days) parts.push(`${t.days} days`);
      if (t.comment) parts.push(t.comment);
      return parts.join(' ');
    }).filter(Boolean).join(', ');
  }
  return null;
};

/**
 * Get the display value for a field from vendor quote data
 */
const getFieldDisplayValue = (vendorData, fieldKey) => {
  if (!vendorData) return '--';

  switch (fieldKey) {
    case 'base_price':
      return vendorData.unitPrice
        ? `₹${Number(vendorData.unitPrice).toLocaleString('en-IN')}`
        : '--';
    case 'payment_terms':
      return formatPaymentTerms(vendorData.paymentTerms) || '--';
    case 'vendor_tc':
      return vendorData.vendorTC || '--';
    case 'comments':
      return vendorData.comment || '--';
    case 'documents': {
      const docs = vendorData.documentFiles || [];
      return docs.length > 0 ? `${docs.length} document${docs.length > 1 ? 's' : ''}` : '--';
    }
    case 'delivery_period':
      return vendorData.deliveryPeriod ? `${vendorData.deliveryPeriod}` : '--';
    default: {
      // Dynamic charge fields — match by slug or name
      const charge = (vendorData.otherCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey);
      if (charge) return formatCharge(charge.amount, charge.amount_mode) || '--';
      return '--';
    }
  }
};

/**
 * Convert a target value between percentage and amount based on vendor's base price.
 * - If target is in ₹ but vendor quoted in %, convert ₹ to % of base price
 * - If target is in % but vendor quoted in ₹, convert % to ₹ of base price
 */
const convertTargetForDisplay = (targetValue, targetMode, vendorMode, basePrice) => {
  if (!targetValue || !basePrice || basePrice <= 0) return targetValue;
  const val = parseFloat(targetValue);
  if (isNaN(val)) return targetValue;

  if (targetMode === vendorMode) return targetValue;

  if (targetMode === 'amount' && vendorMode === 'percentage') {
    // Target is ₹, vendor quotes in % → convert ₹ to %
    const pct = (val / basePrice) * 100;
    return pct % 1 === 0 ? `${pct}` : `${pct.toFixed(2)}`;
  }
  if (targetMode === 'percentage' && vendorMode === 'amount') {
    // Target is %, vendor quotes in ₹ → convert % to ₹
    const amt = (val / 100) * basePrice;
    return amt % 1 === 0 ? `${amt}` : `${amt.toFixed(2)}`;
  }
  return targetValue;
};

/**
 * Format a global target value with its unit for placeholder display
 */
const formatValueWithUnit = (value, mode, fieldKey) => {
  if (!value) return '';
  if (fieldKey === 'freight' || fieldKey === 'packaging') {
    return mode === 'percentage' ? `${value}%` : `₹${value}`;
  }
  if (fieldKey === 'base_price') return `₹${value}`;
  return `${value}`;
};

/**
 * Compare target value against vendor's quoted value for a given field.
 * Normalizes both to the same unit (using base price for conversion) before comparing.
 * Returns: { result: 'greater'|'equal'|'lower', diffAmt, diffPct } | null
 */
const compareTargetToQuoted = (targetValue, targetMode, quoteData, fieldKey) => {
  if (!targetValue || !quoteData) return null;
  const target = parseFloat(targetValue);
  if (isNaN(target)) return null;

  let quotedValue, quotedMode;
  // Percentage charges (freight, packaging, etc.) are applied to the line
  // subtotal (unit_price × quantity) — same as the quote engine. Using just
  // unit_price here made e.g. 5% on (500 × 4) look like ₹25 instead of ₹100,
  // which flipped the lower/greater verdict and showed a bogus "quoted is
  // lower than target" warning.
  const unitPrice = parseFloat(quoteData.unitPrice) || 0;
  const quantity = parseFloat(quoteData.quantity) || 1;
  const basePrice = unitPrice * quantity;

  switch (fieldKey) {
    case 'base_price':
      quotedValue = parseFloat(quoteData.unitPrice);
      if (isNaN(quotedValue) || quotedValue <= 0) return null;
      {
        const diff = Math.abs(target - quotedValue);
        const diffPct = ((diff / quotedValue) * 100);
        const fmtDiff = `₹${diff.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
        const fmtPct = `${diffPct.toFixed(2)}%`;
        if (target > quotedValue) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct };
        if (target === quotedValue) return { result: 'equal', diffAmt: '₹0', diffPct: '0%' };
        return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct };
      }
    default: {
      // Dynamic charges — look up from otherCharges by slug or name
      const charge = (quoteData.otherCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey);
      if (!charge) return null;
      quotedValue = parseFloat(charge.amount);
      quotedMode = charge.amount_mode || 'percentage';
      break;
    }
  }

  if (isNaN(quotedValue) || quotedValue <= 0 || !basePrice) return null;

  // Normalize both to amount for comparison
  const quotedAmt = quotedMode === 'percentage' ? (quotedValue / 100) * basePrice : quotedValue;
  const targetAmt = targetMode === 'percentage' ? (target / 100) * basePrice : target;

  const diffAmt = Math.abs(targetAmt - quotedAmt);
  const diffPct = quotedAmt > 0 ? ((diffAmt / quotedAmt) * 100) : 0;
  const fmtDiff = `₹${diffAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtPct = `${diffPct.toFixed(2)}%`;

  if (Math.abs(targetAmt - quotedAmt) < 0.01) return { result: 'equal', diffAmt: '₹0', diffPct: '0%' };
  if (targetAmt > quotedAmt) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct };
  return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct };
};

/**
 * VendorAccordionPanel — Vendor selection with accordion for quote details and local target inputs.
 * Selected vendors have their accordion permanently open.
 * Unselected vendors can expand on hover (desktop) or tap (mobile).
 */
const VendorAccordionPanel = ({
  product,
  selectedVendorIds = [],
  onVendorToggle,
  onSelectAll,
  getVendorDisplayName,
  selectedFields = [],
  vendorPriceData = { vendors: [], l1: null },
  vendorTargets = {},
  onVendorTargetChange,
  onVendorLocalFieldToggle,
  globalFormData = {},
  chargeNamesList = [],
  onOpenTextFieldModal,
}) => {
  const [hoveredVendorId, setHoveredVendorId] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [tappedVendorId, setTappedVendorId] = useState(null);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: none)');
    setIsTouchDevice(mq.matches);
    const handler = (e) => setIsTouchDevice(e.matches);
    mq.addEventListener('change', handler);
    return () => {
      mq.removeEventListener('change', handler);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const vendors = useMemo(() => {
    const productVendors = product?.product_vendors || [];
    const quotations = product?.quotations || [];
    const activeRound = product?.active_round;
    const vendorApprovals = activeRound?.vendor_approvals || [];
    const roundVendorIds = new Set((activeRound?.vendor_ids || []).map(Number));

    return productVendors.filter(v => {
      const vid = Number(v.id || v.user_id);
      return quotations.some(q => {
        const vd = q.quote_details?.vendor_details;
        return Number(vd?.id || vd?.user_id || q.vendor_id || q.created_by) === vid;
      });
    }).map(v => {
      const vendorId = Number(v.id || v.user_id);

      const matchedQuote = quotations.find(q => {
        const vd = q.quote_details?.vendor_details;
        const qVendorId = vd?.id || vd?.user_id || q.vendor_id || q.created_by;
        return Number(qVendorId) === vendorId;
      });

      const isInRound = roundVendorIds.has(vendorId) || !!v.in_active_round;
      const approval = vendorApprovals.find(va => Number(va.vendor_id) === vendorId);
      let approvalStatus = null;
      if (isInRound) {
        approvalStatus = approval?.status || 'PENDING';
      }
      const priceInfo = vendorPriceData.vendors.find(vp => vp.vendorId === vendorId);
      const isRegret = priceInfo?.isRegret || false;
      // Per-field negotiation: vendor can be in a round for some fields but still eligible for others
      const isDisabled = isRegret;

      return {
        id: vendorId,
        name: getVendorDisplayName(v),
        totalPrice: parseFloat(matchedQuote?.engine_grand_total ?? matchedQuote?.total_price ?? 0),
        activeRoundInfo: v.active_round_info || null,
        approvalStatus,
        isDisabled,
        isRegret,
        quoteData: priceInfo || null,
      };
    }).sort((a, b) => a.totalPrice - b.totalPrice);
  }, [product, getVendorDisplayName, vendorPriceData]);

  const availableVendors = vendors.filter(v => !v.isDisabled);
  const allAvailableSelected = availableVendors.length > 0 &&
    availableVendors.every(v => selectedVendorIds.includes(v.id));

  const handleMouseEnter = useCallback((vendorId) => {
    if (isTouchDevice) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredVendorId(vendorId);
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredVendorId(null);
    }, 200);
  }, [isTouchDevice]);

  const handleTap = useCallback((vendorId, e) => {
    if (!isTouchDevice) return;
    if (e.target.type === 'checkbox' || e.target.closest('input') || e.target.closest('button')) return;
    e.stopPropagation();
    setTappedVendorId(prev => prev === vendorId ? null : vendorId);
  }, [isTouchDevice]);

  const handleLocalTargetChange = (vendorId, fieldKey, value) => {
    if (onVendorTargetChange) {
      onVendorTargetChange(vendorId, fieldKey, value);
    }
  };

  const handleLocalModeToggle = (vendorId, fieldKey, currentMode) => {
    const modeKey = `${fieldKey}_mode`;
    const newMode = currentMode === 'percentage' ? 'amount' : 'percentage';
    if (onVendorTargetChange) {
      onVendorTargetChange(vendorId, modeKey, newMode);
    }
  };

  const handleLocalCardClick = (vendorId, fieldKey) => {
    if (onVendorLocalFieldToggle) {
      onVendorLocalFieldToggle(vendorId, fieldKey);
    }
  };

  if (vendors.length === 0) return null;

  return (
    <section className={styles.vendorSelectionSurface}>
      <div className={styles.vendorSelectionHeader}>
        <div>
          <p className={styles.vendorSelectionTitle}>Select Vendors</p>
          <p className={styles.vendorSelectionSub}>
            Choose which vendors to include in this negotiation round. Set per-vendor targets to override global values.
          </p>
        </div>
        <span className={styles.vendorSelectionMeta}>
          {vendors.length} vendor{vendors.length > 1 ? 's' : ''}
        </span>
      </div>

      {availableVendors.length > 0 && (
        <div className={styles.vendorSelectAllRow}>
          <input
            type="checkbox"
            checked={allAvailableSelected}
            onChange={onSelectAll}
            className={styles.vendorSelectAllCheckbox}
            id="vendor-accordion-select-all"
          />
          <label htmlFor="vendor-accordion-select-all" className={styles.vendorSelectAllLabel}>
            Select All
          </label>
        </div>
      )}

      <div className={styles.vendorList}>
        {vendors.map(vendor => {
          const isSelected = selectedVendorIds.includes(vendor.id);
          // Selected vendors are always expanded; unselected expand on hover/tap
          const isExpanded = isSelected || hoveredVendorId === vendor.id || tappedVendorId === vendor.id;
          const { isDisabled, isRegret, quoteData } = vendor;
          const thisVendorTargets = vendorTargets[vendor.id] || {};

          return (
            <div
              key={vendor.id}
              className={`${styles.vendorAccordionRow} ${isSelected ? styles.vendorRowSelected : ''} ${isDisabled ? styles.vendorRowDisabled : ''} ${isExpanded ? styles.vendorAccordionRowExpanded : ''}`}
              onMouseEnter={() => handleMouseEnter(vendor.id)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleTap(vendor.id, e)}
            >
              <div
                className={styles.vendorAccordionHeader}
                onClick={() => !isDisabled && onVendorToggle(vendor.id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={(e) => { e.stopPropagation(); if (!isDisabled) onVendorToggle(vendor.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.vendorCheckbox}
                />
                <div className={styles.vendorInfo}>
                  <p className={styles.vendorName}>{vendor.name}</p>
                  {isRegret && (
                    <span className="badge bg-danger ms-2" style={{ fontSize: "0.7rem", verticalAlign: "middle" }}>Regretted</span>
                  )}
                  {vendor.approvalStatus && !isRegret && vendor.approvalStatus === 'PENDING' && (
                    <span className={`${styles.vendorApprovalBadge} ${styles.vendorApprovalPending}`}>
                      Pending Approval{vendor.activeRoundInfo?.round_number ? ` · Round ${vendor.activeRoundInfo.round_number}` : ''}
                    </span>
                  )}
                  {isRegret ? (
                    <p className={styles.vendorPrice} style={{ color: "#dc3545" }}>Regretted</p>
                  ) : vendor.totalPrice > 0 ? (
                    <p className={styles.vendorPrice}>
                      ₹{vendor.totalPrice.toLocaleString('en-IN')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={`${styles.vendorAccordionBody} ${isExpanded ? styles.vendorAccordionBodyOpen : ''}`}>
                <div className={styles.vendorQuoteCardsGrid}>
                  {(() => {
                    // Vendor accordion shows: comment, payment_terms, vendor-specific custom charges,
                    // and global default charges ONLY when selected in the Negotiation Fields section
                    const defaultCharges = chargeNamesList.filter(c => c.created_by === null && !c.is_global);
                    const defaultChargeSlugs = new Set(defaultCharges.map(c => c.slug || c.name));
                    const vendorCustomCharges = (quoteData?.otherCharges || [])
                      .filter(c => !defaultChargeSlugs.has(c.slug || c.name))
                      .map(c => ({ name: c.name, slug: c.slug || c.name }))
                      .map(buildChargeFieldOption);
                    // Include global fields (base_price, default charges) that are selected in the Negotiation Fields section — read-only
                    const selectedGlobalFields = [
                      ...(selectedFields.includes('base_price') ? [{ ...NEGOTIATION_FIELD_OPTIONS.find(f => f.value === 'base_price'), isGlobalReadOnly: true }] : []),
                      ...defaultCharges
                        .filter(c => selectedFields.includes(c.slug || c.name))
                        .map(c => ({ ...buildChargeFieldOption(c), isGlobalReadOnly: true })),
                    ];
                    const vendorFields = [
                      ...selectedGlobalFields,
                      NEGOTIATION_FIELD_OPTIONS.find(f => f.value === 'payment_terms'),
                      { value: 'comments', label: 'Comments', inputType: 'text', placeholder: 'Enter target comments' },
                      { value: 'documents', label: 'Documents', inputType: 'text', placeholder: 'Set target for documents' },
                      ...vendorCustomCharges,
                    ].filter(Boolean);
                    return vendorFields;
                  })().map(field => {
                    const isGlobalSelected = selectedFields.includes(field.value);
                    const localFields = thisVendorTargets._localFields || [];
                    const isLocalSelected = localFields.includes(field.value);
                    const isActive = isGlobalSelected || isLocalSelected;
                    const displayValue = getFieldDisplayValue(quoteData, field.value);
                    const globalTargetKey = getChargeTargetKey(field.value);
                    const globalTarget = globalFormData[globalTargetKey] || '';
                    const localTarget = thisVendorTargets[field.value] || '';
                    const localMode = thisVendorTargets[`${field.value}_mode`] || 'percentage';

                    // Compute validation: compare effective target vs vendor's quoted value
                    const effectiveTarget = localTarget || (isGlobalSelected ? globalTarget : '');
                    const effectiveMode = localTarget
                      ? localMode
                      : (field.modeKey ? (globalFormData[field.modeKey] || 'percentage') : 'amount');
                    const comparison = (isActive && isSelected && effectiveTarget)
                      ? compareTargetToQuoted(effectiveTarget, effectiveMode, quoteData, field.value)
                      : null;

                    const compResult = comparison?.result;

                    const validationClass = compResult === 'greater'
                      ? styles.vendorQuoteCardDanger
                      : compResult === 'equal'
                        ? styles.vendorQuoteCardWarning
                        : '';

                    const tooltipText = compResult === 'greater'
                      ? `Quoted value is lower than the target price (${comparison.diffAmt} / ${comparison.diffPct} higher)`
                      : compResult === 'equal'
                        ? 'Vendor already agreed with your value'
                        : null;

                    // Build placeholder
                    let placeholder = 'Target value';
                    if (isGlobalSelected && globalTarget && field.hasMode) {
                      const globalMode = globalFormData[field.modeKey] || 'percentage';
                      const vendorMode = field.value === 'freight' ? quoteData?.freightMode : quoteData?.packageMode;
                      // Charges are % of line subtotal (unit_price × quantity),
                      // matching the engine — see compareTargetToQuoted above.
                      const basePrice = (parseFloat(quoteData?.unitPrice) || 0) * (parseFloat(quoteData?.quantity) || 1);
                      if (vendorMode && globalMode !== localMode) {
                        const converted = convertTargetForDisplay(globalTarget, globalMode, localMode, basePrice);
                        placeholder = formatValueWithUnit(converted, localMode, field.value);
                      } else {
                        placeholder = formatValueWithUnit(globalTarget, globalMode, field.value);
                      }
                    } else if (isGlobalSelected && globalTarget) {
                      placeholder = formatValueWithUnit(globalTarget, 'amount', field.value);
                    }

                    const isTextField = TEXT_FIELDS.includes(field.value);

                    const cardEl = (
                      <div
                        key={field.value}
                        className={`${styles.vendorQuoteCard} ${
                          isActive ? styles.vendorQuoteCardSelected : styles.vendorQuoteCardMuted
                        } ${validationClass}`}
                        onClick={(e) => {
                          if (field.isGlobalReadOnly) return;
                          if (!isSelected || e.target.closest('input') || e.target.closest('button')) return;
                          e.stopPropagation();
                          if (isTextField) {
                            // Text fields: toggle on and open modal directly
                            if (!isActive) handleLocalCardClick(vendor.id, field.value);
                            if (onOpenTextFieldModal) onOpenTextFieldModal(vendor.id, field.value, field.label);
                          } else {
                            handleLocalCardClick(vendor.id, field.value);
                          }
                        }}
                        style={isSelected && !field.isGlobalReadOnly ? { cursor: 'pointer' } : undefined}
                      >
                        <div className={styles.negFieldCardHeader}>
                          <p className={styles.vendorQuoteCardLabel}>{field.label}</p>
                        </div>

                        <div
                          className={styles.vendorCardValueRow}
                          onClick={(e) => { if (isActive && isSelected && !isTextField) e.stopPropagation(); }}
                          style={isSelected && !isActive ? { cursor: 'pointer' } : undefined}
                        >
                          {!isTextField && (
                            <span className={`${styles.vendorQuoteCardValue} ${
                              displayValue === '--' ? styles.vendorQuoteCardMissing : ''
                            }`}>
                              {displayValue}
                            </span>
                          )}
                          {isTextField && (
                            <span className={styles.vendorQuoteCardValue} style={{ fontSize: '0.7rem' }}>
                              {localTarget || globalTarget ? 'Target set' : 'Click to set target'}
                            </span>
                          )}
                          {isActive && isSelected && field.isGlobalReadOnly && globalTarget && (
                            <>
                              <span className={styles.vendorCardArrow}>→</span>
                              <span style={{ fontWeight: 600, color: 'var(--primary-color)', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                                {field.hasMode
                                  ? ((globalFormData[field.modeKey] || 'percentage') === 'percentage' ? `${globalTarget}%` : `₹${globalTarget}`)
                                  : `₹${globalTarget}`
                                }
                              </span>
                            </>
                          )}
                          {isActive && isSelected && !field.isGlobalReadOnly && !TEXT_FIELDS.includes(field.value) && (
                            <>
                              <span className={styles.vendorCardArrow}>→</span>
                              <input
                                type={field.inputType}
                                step={field.step}
                                min={field.min}
                                value={localTarget}
                                onChange={(e) => handleLocalTargetChange(vendor.id, field.value, e.target.value)}
                                placeholder={placeholder}
                                className={styles.vendorLocalTargetInput}
                              />
                              {field.hasMode && (
                                <div className={styles.modeToggle}>
                                  <button
                                    type="button"
                                    className={`${styles.modeToggleBtn} ${localMode === 'percentage' ? styles.modeToggleBtnActive : ''}`}
                                    onClick={() => handleLocalModeToggle(vendor.id, field.value, localMode)}
                                  >
                                    %
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.modeToggleBtn} ${localMode === 'amount' ? styles.modeToggleBtnActive : ''}`}
                                    onClick={() => handleLocalModeToggle(vendor.id, field.value, localMode)}
                                  >
                                    ₹
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );

                    if (tooltipText) {
                      return (
                        <OverlayTrigger
                          key={field.value}
                          placement="top"
                          overlay={<Tooltip>{tooltipText}</Tooltip>}
                        >
                          {cardEl}
                        </OverlayTrigger>
                      );
                    }

                    return cardEl;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedVendorIds.length > 0 && (
        <p className={styles.vendorSelectedNote}>
          {selectedVendorIds.length} vendor{selectedVendorIds.length > 1 ? 's' : ''} selected
        </p>
      )}
    </section>
  );
};

export default VendorAccordionPanel;
