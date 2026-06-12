import React from 'react';
import { Check, Pencil, AlertTriangle, TrendingDown } from 'lucide-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import { compareTargetToQuoted } from './negotiationHelpers';
import styles from './VendorChargeCard.module.scss';

// Field keys that take free-text targets (open in a sub-modal).
const TEXT_FIELDS = new Set(['payment_terms', 'vendor_tc', 'comment', 'global_comment', 'documents']);

// Field keys that don't carry a %/₹ mode (always amount).
const AMOUNT_ONLY = new Set(['base_price', 'delivery_period']);

const fmtAmount = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Bracket shows the BARE amount (`5% × basePrice = ₹105`). Tax is shown
// separately so the bracket value stays equal to what the user typed —
// otherwise removing the charge would seem to drop the line by more than
// the bracket suggests.
const formatQuoted = (charge, basePrice = 0) => {
  if (!charge) return '—';
  if (charge.isDemand) return 'Not quoted';
  if (charge.kind === 'base_price') {
    return charge.unitPrice ? `₹${Number(charge.unitPrice).toLocaleString('en-IN')}` : '—';
  }
  if (charge.kind === 'info') {
    return charge.value != null ? String(charge.value) : '—';
  }
  if (charge.kind === 'text') {
    return charge.value || '—';
  }
  if (charge.kind === 'numeric') {
    if (charge.value == null || charge.value === '') return '—';
    const mode = charge.mode || 'percentage';
    if (mode !== 'percentage') return `₹${Number(charge.value).toLocaleString('en-IN')}`;
    const pctText = `${charge.value}%`;
    const amount = basePrice > 0 ? (Number(charge.value) / 100) * basePrice : 0;
    return amount > 0 ? `${pctText} (${fmtAmount(amount)})` : pctText;
  }
  return '—';
};

// Render the vendor's quoted tax on this charge as a small annotation.
// Returns null when the charge has no tax (text/info) or when the tax value
// isn't a positive number. For `base_price` we read the line-level tax from
// `vendorQuoteData` since that's where the base GST lives on the quote.
const formatQuotedTax = (charge, basePrice = 0, vendorQuoteData = null) => {
  if (!charge) return null;
  if (charge.kind === 'base_price') {
    const tax = parseFloat(vendorQuoteData?.tax);
    if (!Number.isFinite(tax) || tax <= 0) return null;
    const mode = vendorQuoteData?.taxMode || 'percentage';
    if (mode === 'amount' || mode === 'absolute') return `Tax ${fmtAmount(tax)}`;
    const taxRupees = basePrice > 0 ? (tax / 100) * basePrice : 0;
    return taxRupees > 0 ? `Tax ${tax}% (${fmtAmount(taxRupees)})` : `Tax ${tax}%`;
  }
  if (charge.kind !== 'numeric') return null;
  const tax = parseFloat(charge.tax);
  if (!Number.isFinite(tax) || tax <= 0) return null;
  const mode = charge.taxMode || 'percentage';
  if (mode === 'amount' || mode === 'absolute') return `Tax ${fmtAmount(tax)}`;
  // For percentage tax, compute the rupee amount against the charge's amount
  // (not the base) so `Tax 18% (₹18.90)` reads correctly.
  const amtVal = Number(charge.value) || 0;
  const chargeAmt = (charge.mode || 'percentage') === 'percentage'
    ? (basePrice > 0 ? (amtVal / 100) * basePrice : 0)
    : amtVal;
  const taxRupees = (tax / 100) * chargeAmt;
  return taxRupees > 0 ? `Tax ${tax}% (${fmtAmount(taxRupees)})` : `Tax ${tax}%`;
};

// `basePrice` lets us append the rupee equivalent of a percentage target in
// brackets — `8% (₹160)` — mirroring the quoted side so both read alike.
const formatTarget = (rawValue, mode, fieldKey, basePrice = 0) => {
  if (rawValue == null || rawValue === '') return null;
  if (TEXT_FIELDS.has(fieldKey)) {
    if (fieldKey === 'documents') {
      try {
        const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        const count = Object.keys(parsed || {}).filter(k => k !== 'demand' && parsed[k]).length;
        if (parsed?.demand) return count > 0 ? `${count} comments + demand` : 'demand only';
        return count > 0 ? `${count} comment(s)` : null;
      } catch { return String(rawValue); }
    }
    return String(rawValue);
  }
  if (AMOUNT_ONLY.has(fieldKey)) return `₹${rawValue}`;
  if (mode === 'amount') return `₹${rawValue}`;
  const pctText = `${rawValue}%`;
  const amount = basePrice > 0 ? (Number(rawValue) / 100) * basePrice : 0;
  return amount > 0 ? `${pctText} (${fmtAmount(amount)})` : pctText;
};

// One card per charge on a vendor's quotation. Card has:
//   - Header: label + a tappable check that toggles per-vendor override
//   - Quoted value → effective target (per-vendor override else global)
//   - When the card is "selected" (override on): inline input + %/₹ toggle
//     (for numeric mode-able fields), or an "Edit target" button that opens
//     the text-field sub-modal (for text/documents fields).
//
// Effective target priority for display:
//   1. Per-vendor override (`vendorTargets[vid][fieldKey]`)
//   2. Global target (`formData[getChargeTargetKey(fieldKey)]`)
//   3. None — card just shows the quoted value.
const VendorChargeCard = ({
  vendorId,
  charge,            // { kind, fieldKey, label, value, mode?, unitPrice?, supportsTarget }
  vendorQuoteData,   // raw vendor row from productPriceData.vendors — drives comparisons
  vendorTargets,
  formData,
  globalSelectedFields = [],
  onVendorTargetChange,
  onVendorLocalFieldToggle,
  onVendorFieldExcludeToggle,
  onOpenTextFieldModal,
}) => {
  const fieldKey = charge.fieldKey;
  const supportsTarget = charge.supportsTarget !== false && charge.kind !== 'info';
  const basePrice = (parseFloat(vendorQuoteData?.unitPrice) || 0) * (parseFloat(vendorQuoteData?.quantity) || 0);

  const vt = vendorTargets[vendorId] || {};
  const localFields = vt._localFields || [];
  const excludedFields = vt._excludedFields || [];
  const localTarget = vt[fieldKey];
  const localMode = vt[`${fieldKey}_mode`];
  // Buyer's free-text tax demand/negotiation note for this field+vendor —
  // set via the Demand/Negotiate sub-modal, no numeric tax targets anymore.
  const taxNote = vt[`${fieldKey}_tax`];

  const globalKey = getChargeTargetKey(fieldKey);
  const globalTarget = formData?.[globalKey];
  const globalMode = formData?.[`target_${fieldKey}_mode`];

  // A field can be EITHER global (same target per vendor — vendor opts in/out
  // via the card check) OR per-vendor (target lives on the card).
  const isGloballyClaimed = supportsTarget && globalSelectedFields.includes(fieldKey);

  // For globally-claimed fields the default is INCLUDED; the check toggles
  // the field OFF for this specific vendor by adding it to _excludedFields.
  const isExcludedForVendor = isGloballyClaimed && excludedFields.includes(fieldKey);
  const isIncludedForVendor = isGloballyClaimed && !isExcludedForVendor;

  // For non-global fields the user opts a vendor IN by toggling the check,
  // which lights up _localFields and reveals the per-vendor target input.
  const isLocallyActive = !isGloballyClaimed &&
    (localFields.includes(fieldKey) || (localTarget != null && localTarget !== ''));

  // A per-vendor override can now win even for globally-claimed fields: if
  // the buyer types a value on this card it takes precedence over the global
  // target for this vendor; left blank, the global applies as before.
  const hasLocalOverride = localTarget != null && localTarget !== '';

  // Effective target shown on the card: per-vendor override first, then the
  // global value (claimed + included), then nothing.
  const effectiveTargetRaw = isGloballyClaimed
    ? (isIncludedForVendor ? (hasLocalOverride ? localTarget : (globalTarget || '')) : '')
    : (isLocallyActive ? localTarget : (globalTarget || ''));
  const effectiveMode = isGloballyClaimed
    ? (isIncludedForVendor && hasLocalOverride ? (localMode || globalMode || 'percentage') : (globalMode || 'percentage'))
    : (isLocallyActive ? (localMode || globalMode || 'percentage') : (globalMode || 'percentage'));
  const targetText = supportsTarget ? formatTarget(effectiveTargetRaw, effectiveMode, fieldKey, basePrice) : null;

  // Per-card validity: target must be strictly *better* than the vendor's
  // quoted value (i.e. lower price / lower charges / shorter days). The diff
  // is normalized to amount via base price so percentage charges compare on
  // the same axis as flat ones. Text fields (payment_terms, vendor_tc,
  // documents) skip this check.
  const comparison = supportsTarget
    ? compareTargetToQuoted(effectiveTargetRaw, effectiveMode, vendorQuoteData, fieldKey)
    : null;
  const isInvalidTarget = comparison && (comparison.result === 'greater' || comparison.result === 'equal');
  const tooltipText = comparison
    ? (comparison.result === 'greater'
        ? `Target is ${comparison.diffAmt} (${comparison.diffPct}) higher than the quoted ${comparison.quotedAmt} — vendor can’t negotiate this field.`
        : comparison.result === 'equal'
          ? `Target matches the quoted value (${comparison.quotedAmt}) — vendor can’t negotiate this field.`
          : `Target is ${comparison.diffAmt} (${comparison.diffPct}) lower than the quoted ${comparison.quotedAmt}.`)
    : null;

  // Base price is global-only: never editable per-vendor. When it's not in
  // the global selection the card is purely informational; when it IS in the
  // global selection the inclusion check still lets the user opt this vendor
  // out (handled below).
  const isBasePrice = fieldKey === 'base_price';

  // The check renders for both modes — for global fields it controls
  // inclusion ON/OFF; for per-vendor fields it controls the per-vendor
  // target's existence. Base Price hides the per-vendor check entirely.
  const showCheck = supportsTarget && !(isBasePrice && !isGloballyClaimed);
  const checkActive = isGloballyClaimed ? isIncludedForVendor : isLocallyActive;
  const isTextField = TEXT_FIELDS.has(fieldKey);
  const isAmountOnly = AMOUNT_ONLY.has(fieldKey);
  const hasMode = supportsTarget && !isTextField && !isAmountOnly;

  // Show the per-vendor override input when the field is locally active OR
  // when it's a globally-claimed field included for this vendor (the buyer can
  // override the global target for this specific vendor). Base Price stays
  // global-only.
  const showOverrideInput = supportsTarget && !isBasePrice &&
    (isLocallyActive || (isGloballyClaimed && isIncludedForVendor));

  const handleToggleSelected = (e) => {
    e.stopPropagation();
    if (!supportsTarget) return;
    if (isGloballyClaimed) {
      if (onVendorFieldExcludeToggle) onVendorFieldExcludeToggle(vendorId, fieldKey);
    } else {
      if (onVendorLocalFieldToggle) onVendorLocalFieldToggle(vendorId, fieldKey);
    }
  };

  const handleInputChange = (value) => {
    if (onVendorTargetChange) onVendorTargetChange(vendorId, fieldKey, value);
  };

  const handleModeToggle = () => {
    const next = (localMode || globalMode || 'percentage') === 'percentage' ? 'amount' : 'percentage';
    if (onVendorTargetChange) onVendorTargetChange(vendorId, `${fieldKey}_mode`, next);
  };

  const handleOpenSubModal = () => {
    if (!onOpenTextFieldModal) return;
    // Mark the field as locally active so closing without saving doesn't
    // leave it in a weird half-state.
    if (!localFields.includes(fieldKey) && onVendorLocalFieldToggle) {
      onVendorLocalFieldToggle(vendorId, fieldKey);
    }
    onOpenTextFieldModal(vendorId, fieldKey, charge.label);
  };

  const cardClass = [
    styles.card,
    isLocallyActive ? styles.cardSelected : '',
    isInvalidTarget ? styles.cardInvalid : '',
    isGloballyClaimed && !isIncludedForVendor ? styles.cardExcluded : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className={styles.head}>
        <span className={styles.label}>{charge.label}</span>
        <div className={styles.headRight}>
          {charge.isDemand && (
            <span className={styles.demandTag} title="Vendor didn't quote this — buyer demand">Demand</span>
          )}
          {tooltipText && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id={`vct-${vendorId}-${fieldKey}`}>{tooltipText}</Tooltip>}
            >
              <span
                className={`${styles.badge} ${isInvalidTarget ? styles.badgeInvalid : styles.badgeOk}`}
                aria-label={isInvalidTarget ? 'Invalid target' : 'Valid target'}
              >
                {isInvalidTarget
                  ? <AlertTriangle size={12} strokeWidth={2.5} />
                  : <TrendingDown size={12} strokeWidth={2.5} />}
              </span>
            </OverlayTrigger>
          )}
          {showCheck && (
            <button
              type="button"
              className={`${styles.check} ${checkActive ? styles.checkActive : ''}`}
              onClick={handleToggleSelected}
              aria-pressed={checkActive}
              aria-label={
                isGloballyClaimed
                  ? `${checkActive ? 'Exclude' : 'Include'} ${charge.label} for this vendor`
                  : `${checkActive ? 'Remove' : 'Set'} per-vendor target for ${charge.label}`
              }
              title={isGloballyClaimed
                ? (checkActive ? 'Click to skip this field for this vendor' : 'Click to include this field for this vendor')
                : (checkActive ? 'Remove per-vendor target' : 'Set per-vendor target')
              }
            >
              {checkActive ? <Check size={12} strokeWidth={3} /> : null}
            </button>
          )}
        </div>
      </div>

      <div className={styles.valueRow}>
        <span className={styles.quoted}>{formatQuoted(charge, basePrice)}</span>
        {charge.unitHint && <span className={styles.unitHint}>{charge.unitHint}</span>}
        {targetText && (
          <>
            <span className={styles.arrow} aria-hidden="true">→</span>
            <span className={`${styles.target} ${isInvalidTarget ? styles.targetInvalid : ''}`}>
              {targetText}
            </span>
          </>
        )}
        {isGloballyClaimed && !isIncludedForVendor && (
          <span className={styles.skippedTag}>Skipped for this vendor</span>
        )}
      </div>

      {(() => {
        // Tax is negotiated via free text per vendor: "Demand" when the
        // vendor gave no tax, "Negotiate" when they did, "Edit" once the
        // buyer has written a note. Text/info fields carry no tax.
        if (isTextField || charge.kind === 'info' || !supportsTarget) return null;
        if (isGloballyClaimed && !isIncludedForVendor) return null;
        const quotedTaxText = formatQuotedTax(charge, basePrice, vendorQuoteData);
        return (
          <>
            <div className={styles.taxRow}>
              <span className={styles.quotedTax}>
                {quotedTaxText || 'No tax was given'}
              </span>
              <button
                type="button"
                className={styles.taxActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenTextFieldModal) {
                    onOpenTextFieldModal(vendorId, `${fieldKey}_tax`, `${charge.label} — Tax`);
                  }
                }}
              >
                {taxNote ? 'Edit' : (quotedTaxText ? 'Negotiate' : 'Demand')}
              </button>
            </div>
            {taxNote ? <p className={styles.taxNoteText}>“{taxNote}”</p> : null}
          </>
        );
      })()}

      {comparison && comparison.result === 'greater' && (
        <p className={styles.invalidLine}>
          Target is {comparison.diffAmt} ({comparison.diffPct}) higher than the quoted {comparison.quotedAmt} — won’t be sent.
        </p>
      )}
      {comparison && comparison.result === 'equal' && (
        <p className={styles.invalidLine}>
          Target matches the quoted value ({comparison.quotedAmt}) — no improvement, won’t be sent.
        </p>
      )}

      {showOverrideInput && (
        isTextField ? (
          <button
            type="button"
            className={styles.editBtn}
            onClick={handleOpenSubModal}
          >
            <Pencil size={12} strokeWidth={2} />
            {hasLocalOverride ? 'Edit target' : (isGloballyClaimed ? 'Override for this vendor' : 'Set target')}
          </button>
        ) : (
          <>
            <div className={styles.inputRow}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={localTarget ?? ''}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={isGloballyClaimed ? 'Override for this vendor (optional)' : (isAmountOnly ? 'Target (₹)' : 'Target amount')}
                className={styles.input}
                onClick={(e) => e.stopPropagation()}
              />
              {hasMode && (
                <div className={styles.modeToggle} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${(localMode || globalMode || 'percentage') === 'percentage' ? styles.modeBtnActive : ''}`}
                    onClick={handleModeToggle}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${(localMode || globalMode || 'percentage') === 'amount' ? styles.modeBtnActive : ''}`}
                    onClick={handleModeToggle}
                  >
                    ₹
                  </button>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
};

export default VendorChargeCard;
