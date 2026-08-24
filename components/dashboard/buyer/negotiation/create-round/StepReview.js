import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Trash2, ArrowRight } from 'lucide-react';
import { previewTotals } from '@/services/pricing';
import {
  formatNegotiationDeadline,
  formatUtcDateTime,
  localDateTimeInputMin,
  parseLocalDateTimeInput,
} from '@/utils/negotiationTime';
import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import {
  getProductDetails,
  getVendorPriceData,
  TEXT_ONLY_NEG_FIELDS,
  compareTargetToQuoted,
  aggregateRfqVendors,
  computeVendorGrandTotals,
} from './negotiationHelpers';

// Signed rupee change for a field comparison: negative = saving, positive =
// increase, 0 = no change / no comparison.
const signedDelta = (cmp) => {
  if (!cmp || !Number.isFinite(cmp.diffValue)) return 0;
  if (cmp.result === 'lower') return -cmp.diffValue;
  if (cmp.result === 'greater') return cmp.diffValue;
  return 0;
};
import { buildPreviewItem, buildPreviewItemFromQueuedFields } from './buildPreviewItems';
import styles from './CreateRound.module.scss';

const FIELD_LABELS = {
  base_price: 'Base Price',
  payment_terms: 'Payment Terms',
  vendor_tc: 'Vendor T&C',
  comment: 'Comment',
  global_comment: 'Global Comment',
  delivery_period: 'Delivery Period',
  documents: 'RFQ Documents',
  freight: 'Freight',
  packaging: 'Packaging',
};

const labelFor = (fieldKey) =>
  FIELD_LABELS[fieldKey] || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const fmtINR = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtINRDecimal = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Vendor's `paymentTerms` arrives as a structured array
// (`[{ id, type, value, days, comment, ... }, ...]`). Flatten to a display
// string so JSX doesn't render the raw objects as `[object Object]`.
// Mirrors the same logic in NegotiationModal.formatVendorFieldValue.
const formatPaymentTermsToString = (pt) => {
  if (!pt) return '';
  if (typeof pt === 'string') return pt;
  if (Array.isArray(pt)) {
    return pt.map(t => {
      const parts = [];
      if (t?.value) parts.push(`${t.value}%`);
      if (t?.type) parts.push(t.type);
      if (t?.days) parts.push(`${t.days} days`);
      if (t?.comment) parts.push(t.comment);
      return parts.join(' ');
    }).filter(Boolean).join(', ');
  }
  return '';
};

// Render a target/quoted token: amount (₹) or percentage. Falls back to raw
// string for text-only fields. When `basePrice` is supplied and the field is
// a percentage, append the bare rupee equivalent in brackets — `5% (₹105)`.
// Tax is shown separately by `fmtTaxValue` so the bracket here equals the
// user-visible amount (not amount + tax).
const fmtFieldValue = (fieldKey, value, mode, basePrice = 0) => {
  if (value == null || value === '') return '—';
  if (fieldKey === 'documents') {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(parsed)) {
        return parsed.length > 0
          ? `${parsed.length} document comment${parsed.length > 1 ? 's' : ''}`
          : '—';
      }
      const docCount = Object.keys(parsed || {}).filter(k => k !== 'demand' && parsed[k]).length;
      const demand = parsed?.demand ? ` (demand: ${parsed.demand})` : '';
      return docCount > 0 ? `${docCount} document comment${docCount > 1 ? 's' : ''}${demand}` : (demand || '—');
    } catch { return String(value); }
  }
  if (TEXT_ONLY_NEG_FIELDS.has(fieldKey)) return String(value);
  if (fieldKey === 'delivery_period') return `${value} day(s)`;
  if (fieldKey === 'base_price') return `₹${value}`;
  if (mode === 'amount' || mode === 'absolute') return `₹${value}`;
  const pctText = `${value}%`;
  const amount = basePrice > 0 ? (Number(value) / 100) * basePrice : 0;
  return amount > 0
    ? `${pctText} (₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })})`
    : pctText;
};

// Extract the buyer's per-document comments + overall demand from a `documents`
// target so the review/approver view shows the ACTUAL text, not just a count.
//
// Two storage shapes feed this:
//   - SUBMITTED rounds (payload):  target = [{ document_index, file_url, comment }],
//                                  demand = "free text"
//   - LIVE wizard state:           value  = '{"0":"comment","demand":"free text"}'
// Both normalize to { comments: [{ label, comment, url }], demand }.
const buildDocDetail = (value, demand, vendorInfo, isRfqLevel = true) => {
  // Same scope rule as StepVendorsAndTargets: a product-scoped ask indexes into
  // the line's attachments, an RFQ-level one into the quote-wide set.
  const docFiles =
    (isRfqLevel ? vendorInfo?.documentFiles : vendorInfo?.lineDocumentFiles) || [];
  const comments = [];
  let dem = demand && String(demand).trim() ? String(demand).trim() : null;

  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { parsed = null; }
  }

  if (Array.isArray(parsed)) {
    // Payload shape — array of per-document entries.
    parsed.forEach((d) => {
      if (!d || !d.comment || !String(d.comment).trim()) return;
      const idx = Number.isInteger(d.document_index) ? d.document_index : null;
      comments.push({
        label: idx != null ? `Document ${idx + 1}` : 'Document',
        comment: String(d.comment).trim(),
        url: d.file_url || (idx != null ? docFiles[idx]?.file_url : null) || null,
      });
    });
  } else if (parsed && typeof parsed === 'object') {
    // Live wizard shape — keys are indices, plus a `demand` key.
    if (!dem && parsed.demand && String(parsed.demand).trim()) dem = String(parsed.demand).trim();
    Object.entries(parsed).forEach(([k, v]) => {
      if (k === 'demand') return;
      if (!v || !String(v).trim()) return;
      const idx = parseInt(k, 10);
      comments.push({
        label: Number.isInteger(idx) ? `Document ${idx + 1}` : k,
        comment: String(v).trim(),
        url: Number.isInteger(idx) ? (docFiles[idx]?.file_url || null) : null,
      });
    });
  }

  if (!comments.length && !dem) return null;
  return { comments, demand: dem };
};

// Format a tax token for the per-field row. Returns null when no tax to show.
const fmtTaxValue = (tax, taxMode) => {
  if (tax == null || tax === '') return null;
  const num = parseFloat(tax);
  if (!Number.isFinite(num) || num <= 0) return null;
  return (taxMode === 'amount' || taxMode === 'absolute') ? `Tax ₹${num}` : `Tax ${num}%`;
};

// Resolve `productPriceData` for a queued round so we can show the same
// product header (qty, L1) as the current round.
const resolveProduct = (productId, products = []) => {
  const p = products.find(x => String(x.id) === String(productId));
  if (!p) return null;
  return { product: p, details: getProductDetails(p), priceData: getVendorPriceData(p) };
};

// Pull the vendor's quoted value (+ mode + own tax) for a given negotiation
// field. Used to render the "Quoted X → Target Y" pair. The tax fields let the
// bracket display include the charge's actual contribution (amount + its tax)
// so `total − bracket` math matches what the projection engine returns.
const readQuotedForField = (vendorInfo, fieldKey) => {
  if (!vendorInfo) return null;
  if (fieldKey === 'base_price') {
    const v = parseFloat(vendorInfo.unitPrice);
    if (!Number.isFinite(v) || v <= 0) return null;
    return {
      value: v,
      mode: 'amount',
      tax: vendorInfo.tax,
      taxMode: vendorInfo.taxMode,
    };
  }
  if (fieldKey === 'delivery_period') {
    const v = parseFloat(vendorInfo.deliveryPeriod);
    return Number.isFinite(v) && v > 0 ? { value: v, mode: 'amount' } : null;
  }
  if (fieldKey === 'payment_terms') {
    const display = formatPaymentTermsToString(vendorInfo.paymentTerms);
    return display ? { value: display, mode: 'text' } : null;
  }
  if (fieldKey === 'vendor_tc') {
    return vendorInfo.vendorTC ? { value: vendorInfo.vendorTC, mode: 'text' } : null;
  }
  if (fieldKey === 'comment') {
    return vendorInfo.comment ? { value: vendorInfo.comment, mode: 'text' } : null;
  }
  if (fieldKey === 'global_comment') {
    return vendorInfo.globalComment ? { value: vendorInfo.globalComment, mode: 'text' } : null;
  }
  const charge = (vendorInfo.otherCharges || []).find(c =>
    (c.slug || c.name) === fieldKey || c.name === fieldKey
  );
  if (charge) {
    return {
      value: charge.amount,
      mode: charge.amount_mode || 'percentage',
      tax: charge.tax,
      taxMode: charge.tax_mode,
    };
  }
  const gCharge = (vendorInfo.globalCharges || []).find(c =>
    (c.slug || c.name) === fieldKey || c.name === fieldKey
  );
  if (gCharge) {
    return { value: gCharge.tax, mode: gCharge.tax_mode || 'percentage' };
  }
  return null;
};

// Display rows for a SUBMITTED-shape vendor_targets[] (queued rounds).
const buildVendorRowsFromPayload = (vendorTargets, priceData, isRfqLevel = true) => {
  return (vendorTargets || []).map(vt => {
    const vendorInfo = priceData.vendors.find(v => v.vendorId === Number(vt.vendor_id));
    const vendorName = vendorInfo ? vendorInfo.vendorName : `Vendor ${vt.vendor_id}`;
    const quotedTotal = vendorInfo?.totalPrice || 0;
    const basePrice = (parseFloat(vendorInfo?.unitPrice) || 0) * (parseFloat(vendorInfo?.quantity) || 0);
    const targets = (vt.fields || []).map(f => {
      const targetMode = f.mode === 'absolute' ? 'amount' : (f.mode || 'percentage');
      const quoted = readQuotedForField(vendorInfo, f.name);
      const hasTarget = f.target != null && f.target !== '';
      const cmp = quoted && hasTarget
        ? compareTargetToQuoted(f.target, targetMode, vendorInfo, f.name)
        : null;
      return {
        fieldKey: f.name,
        label: labelFor(f.name),
        targetDisplay: hasTarget ? fmtFieldValue(f.name, f.target, targetMode, basePrice) : '—',
        quotedDisplay: quoted ? fmtFieldValue(f.name, quoted.value, quoted.mode, basePrice) : '—',
        quotedTaxDisplay: quoted ? fmtTaxValue(quoted.tax, quoted.taxMode) : null,
        targetTaxDisplay: f.tax_demand ? `Tax: “${f.tax_demand}”` : null,
        docDetail: f.name === 'documents' ? buildDocDetail(f.target, f.demand, vendorInfo, isRfqLevel) : null,
        deltaDisplay: cmp ? `${cmp.result === 'lower' ? '−' : (cmp.result === 'greater' ? '+' : '')}${cmp.diffAmt}` : null,
        deltaDirection: cmp?.result || null,
        deltaValue: signedDelta(cmp),
      };
    });
    return { vid: vt.vendor_id, vendorName, quotedTotal, targets };
  });
};

// Display rows for the LIVE wizard state (current round being edited).
const buildVendorRowsFromLiveState = ({
  selectedVendorIds,
  vendorTargets,
  formData,
  effectiveFields,
  priceData,
  isRfqLevel = true,
}) => {
  return (selectedVendorIds || []).map(vid => {
    const vt = vendorTargets[vid] || {};
    const vendorInfo = priceData.vendors.find(v => v.vendorId === vid);
    const vendorName = vendorInfo ? vendorInfo.vendorName : `Vendor ${vid}`;
    const quotedTotal = vendorInfo?.totalPrice || 0;
    const basePrice = (parseFloat(vendorInfo?.unitPrice) || 0) * (parseFloat(vendorInfo?.quantity) || 0);

    const localKeys = Object.keys(vt).filter(k =>
      k !== '_localFields'
      && k !== '_excludedFields'
      && !k.endsWith('_mode')
      && !k.endsWith('_tax')
      && vt[k] != null && vt[k] !== ''
    );

    // Fields where the buyer only raised a tax demand note (no amount target)
    // still need a row.
    const taxNoteFields = Object.keys(vt)
      .filter(k => k.endsWith('_tax') && vt[k] && String(vt[k]).trim())
      .map(k => k.slice(0, -4));

    const fieldKeys = [
      ...effectiveFields,
      ...localKeys.filter(k => !effectiveFields.includes(k)),
      ...taxNoteFields.filter(k => !effectiveFields.includes(k) && !localKeys.includes(k)),
    ];

    const targets = fieldKeys.map(fieldKey => {
      const localVal = vt[fieldKey];
      const targetKey = getChargeTargetKey(fieldKey);
      const globalVal = targetKey ? formData[targetKey] : '';
      const value = localVal != null && localVal !== '' ? localVal : globalVal;
      // Buyer's free-text tax note for this field+vendor.
      const taxNote = vt[`${fieldKey}_tax`];
      const hasTaxNote = taxNote && String(taxNote).trim();
      if (!value && !hasTaxNote) return null;
      const localMode = vt[`${fieldKey}_mode`];
      const globalMode = formData[`target_${fieldKey}_mode`];
      const mode = localMode || globalMode || 'percentage';
      const quoted = readQuotedForField(vendorInfo, fieldKey);
      const cmp = quoted && value
        ? compareTargetToQuoted(value, mode, vendorInfo, fieldKey)
        : null;
      return {
        fieldKey,
        label: labelFor(fieldKey),
        targetDisplay: value ? fmtFieldValue(fieldKey, value, mode, basePrice) : '—',
        quotedDisplay: quoted ? fmtFieldValue(fieldKey, quoted.value, quoted.mode, basePrice) : '—',
        quotedTaxDisplay: quoted ? fmtTaxValue(quoted.tax, quoted.taxMode) : null,
        targetTaxDisplay: hasTaxNote ? `Tax: “${String(taxNote).trim()}”` : null,
        docDetail: fieldKey === 'documents' ? buildDocDetail(value, null, vendorInfo, isRfqLevel) : null,
        deltaDisplay: cmp ? `${cmp.result === 'lower' ? '−' : (cmp.result === 'greater' ? '+' : '')}${cmp.diffAmt}` : null,
        deltaDirection: cmp?.result || null,
        deltaValue: signedDelta(cmp),
      };
    }).filter(Boolean);

    return { vid, vendorName, quotedTotal, targets };
  });
};

// Hook: project per-vendor line subtotals for every round (queued + current)
// in one debounced batch call to /pricing/preview. Returns a map keyed by
// `${roundKey}:${vendorId}` → projectedTotal. Vendors with no items in the
// batch fall back to their quoted total so per-product math still works.
const useReviewProjections = ({ rounds, formData, vendorTargets, chargeNamesList }) => {
  const [projection, setProjection] = useState({});
  const reqIdRef = useRef(0);

  // Build a stable cache key for the items input so we don't re-POST on every
  // re-render. Stringify is fine here — the input is small.
  const itemsBundle = useMemo(() => {
    const flat = [];
    rounds.forEach((r) => {
      r.previewItems.forEach(({ vid, item }) => {
        flat.push({ roundKey: r.key, vid, item });
      });
    });
    return flat;
  }, [rounds]);

  const itemsSignature = useMemo(() => JSON.stringify(itemsBundle), [itemsBundle]);

  useEffect(() => {
    if (itemsBundle.length === 0) {
      setProjection({});
      return undefined;
    }
    const myReq = ++reqIdRef.current;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await previewTotals({ items: itemsBundle.map(b => b.item) });
        if (cancelled || myReq !== reqIdRef.current) return;
        const lines = Array.isArray(response?.lines)
          ? response.lines
          : Array.isArray(response?.data?.lines) ? response.data.lines : [];
        const next = {};
        itemsBundle.forEach((b, idx) => {
          const line = lines[idx];
          const candidates = [line?.subtotal, line?.total, line?.line_subtotal, line?.grand_total];
          const value = candidates.map(Number).find(n => Number.isFinite(n) && n > 0);
          if (value != null) next[`${b.roundKey}:${b.vid}`] = value;
        });
        setProjection(next);
      } catch {
        // Projection is a presentation aid — don't gate review on its failure.
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // itemsSignature controls when we re-POST; itemsBundle is the actual input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSignature]);

  return projection;
};

// Render a single round card — used for both queued and current, in either
// product or RFQ-level mode.
const ReviewProductCard = ({
  round,
  projection,
  vendorGrandTotals = {},
  productSavingByVendor = {},
  rfqSavingByVendor = {},
  onEdit,
  onRemove,
  readOnly = false,
}) => {
  const productHeader = round.productMeta || {};
  const isRfq = round.mode === 'rfq';

  // Per-vendor projected totals, falling back to quoted when no projection
  // (e.g. vendor had no in-scope deltas, or the API hasn't returned yet).
  // For the RFQ-wide card the relevant number is the vendor's whole-quote
  // grand total (incl. GST + TCS) with both product- and rfq-round savings
  // applied, NOT the line subtotal projection.
  const vendorRowsWithTotals = round.vendorRows.map((vr) => {
    if (isRfq) {
      const grand = Number(vendorGrandTotals[vr.vid]) || 0;
      const saving = (Number(productSavingByVendor[vr.vid]) || 0)
        + (Number(rfqSavingByVendor[vr.vid]) || 0);
      return {
        ...vr,
        grandQuoted: grand,
        grandProjected: grand - saving,
        grandSaving: saving,
      };
    }
    const projected = projection[`${round.key}:${vr.vid}`];
    return {
      ...vr,
      projectedTotal: projected != null ? projected : vr.quotedTotal,
      hasProjection: projected != null,
    };
  });

  return (
    <article className={`${styles.reviewProductCard} ${isRfq ? styles.reviewRfqCard : ''}`}>
      <div className={styles.reviewProductHead}>
        <div className={styles.reviewProductHeadMain}>
          <p className={styles.reviewProductTag}>
            {readOnly ? 'Round' : (round.isCurrent ? 'Current round' : 'Queued round')}
            {isRfq && <span className={styles.reviewRfqChip}>RFQ-WIDE</span>}
          </p>
          <h3 className={styles.reviewProductName}>{round.productName}</h3>
        </div>
        <div className={styles.reviewProductHeadActions}>
          {onEdit && (
            <button type="button" className={styles.reviewEditLink} onClick={onEdit}>
              Edit
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className={styles.reviewRemoveBtn}
              onClick={onRemove}
              aria-label={`Remove ${round.productName} from queue`}
              title="Remove from queue"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.reviewProductMetaGrid}>
        {isRfq ? (
          <>
            <div>
              <span className={styles.reviewKey}>Scope</span>
              <p className={styles.reviewVal}>RFQ-wide (no product)</p>
            </div>
            <div>
              <span className={styles.reviewKey}>Vendors</span>
              <p className={styles.reviewVal}>{vendorRowsWithTotals.length}</p>
            </div>
          </>
        ) : (
          <>
            {productHeader.spec && (
              <div>
                <span className={styles.reviewKey}>Spec</span>
                <p className={styles.reviewVal}>{productHeader.spec}</p>
              </div>
            )}
            <div>
              <span className={styles.reviewKey}>Quantity</span>
              <p className={styles.reviewVal}>
                {productHeader.quantity || '-'}{productHeader.unit ? ` ${productHeader.unit}` : ''}
              </p>
            </div>
            {productHeader.l1Total > 0 && (
              <div>
                <span className={styles.reviewKey}>L1 Total</span>
                <p className={styles.reviewVal}>
                  {fmtINRDecimal(productHeader.l1Total)}
                  {productHeader.l1VendorName ? ` · ${productHeader.l1VendorName}` : ''}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.reviewVendorsBlock}>
        <p className={styles.reviewVendorsLabel}>
          Vendors &amp; targets ({vendorRowsWithTotals.length})
        </p>
        {vendorRowsWithTotals.length === 0 ? (
          <p className={styles.emptySub}>No vendors selected.</p>
        ) : (
          vendorRowsWithTotals.map((vr) => {
            const vendorDelta = vr.projectedTotal - vr.quotedTotal;
            const vendorDeltaClass = vendorDelta < -0.5
              ? styles.deltaDown
              : (vendorDelta > 0.5 ? styles.deltaUp : styles.deltaFlat);
            return (
              <div key={vr.vid} className={styles.reviewVendorRow}>
                <div className={styles.reviewVendorHead}>
                  <p className={styles.reviewVendorName}>{vr.vendorName}</p>
                  {isRfq ? (
                    /* RFQ-wide card shows the vendor's whole-quote grand total
                       (incl. GST + TCS) with product- AND rfq-round savings
                       applied. */
                    vr.grandQuoted > 0 && (
                      <div className={styles.reviewVendorTotals}>
                        {vr.grandSaving > 0.5 ? (
                          <>
                            <span className={styles.reviewVendorTotalQuoted}>
                              {fmtINRDecimal(vr.grandQuoted)}
                            </span>
                            <ArrowRight size={12} className={styles.reviewArrow} />
                            <span className={styles.reviewVendorTotalProjected}>
                              {fmtINRDecimal(vr.grandProjected)}
                            </span>
                            <span className={`${styles.reviewDeltaPill} ${styles.deltaDown}`}>
                              −{fmtINRDecimal(vr.grandSaving)}
                            </span>
                          </>
                        ) : (
                          <span className={styles.reviewVendorTotalProjected}>
                            {fmtINRDecimal(vr.grandQuoted)}
                          </span>
                        )}
                      </div>
                    )
                  ) : (
                    <div className={styles.reviewVendorTotals}>
                      {vr.hasProjection && Math.abs(vendorDelta) > 0.5 ? (
                        <>
                          <span className={styles.reviewVendorTotalQuoted}>
                            {fmtINRDecimal(vr.quotedTotal)}
                          </span>
                          <ArrowRight size={12} className={styles.reviewArrow} />
                          <span className={styles.reviewVendorTotalProjected}>
                            {fmtINRDecimal(vr.projectedTotal)}
                          </span>
                          <span className={`${styles.reviewDeltaPill} ${vendorDeltaClass}`}>
                            {vendorDelta < 0 ? '−' : '+'}{fmtINRDecimal(Math.abs(vendorDelta))}
                          </span>
                        </>
                      ) : (
                        <span className={styles.reviewVendorTotalProjected}>
                          {fmtINRDecimal(vr.quotedTotal)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {vr.targets.length > 0 ? (
                  <ul className={styles.reviewFieldList}>
                    {vr.targets.map((t) => (
                      <li key={t.fieldKey} className={styles.reviewFieldRow}>
                        <span className={styles.reviewFieldLabel}>{t.label}</span>
                        <span className={styles.reviewFieldQuoted}>
                          {t.quotedDisplay}
                          {t.quotedTaxDisplay && (
                            <em className={styles.reviewFieldTaxNote}> · {t.quotedTaxDisplay}</em>
                          )}
                        </span>
                        <ArrowRight size={11} className={styles.reviewArrow} />
                        <span className={styles.reviewFieldTarget}>
                          {t.targetDisplay}
                          {t.targetTaxDisplay && (
                            <em className={styles.reviewFieldTaxNote}> · {t.targetTaxDisplay}</em>
                          )}
                        </span>
                        {t.deltaDisplay && (
                          <span className={`${styles.reviewFieldDelta} ${
                            t.deltaDirection === 'lower'
                              ? styles.deltaDown
                              : (t.deltaDirection === 'greater' ? styles.deltaUp : styles.deltaFlat)
                          }`}>
                            {t.deltaDisplay}
                          </span>
                        )}
                        {t.docDetail && (
                          <div className={styles.reviewDocDetail}>
                            {t.docDetail.comments.map((d, di) => (
                              <div key={di} className={styles.reviewDocItem}>
                                <span className={styles.reviewDocLabel}>
                                  {d.url ? (
                                    <a href={d.url} target="_blank" rel="noopener noreferrer">
                                      {d.label}
                                    </a>
                                  ) : d.label}
                                </span>
                                <span className={styles.reviewDocComment}>“{d.comment}”</span>
                              </div>
                            ))}
                            {t.docDetail.demand && (
                              <div className={styles.reviewDocItem}>
                                <span className={styles.reviewDocLabel}>Documents requested</span>
                                <span className={styles.reviewDocComment}>“{t.docDetail.demand}”</span>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.reviewFieldEmpty}>
                    No targets set — vendor will be skipped.
                  </p>
                )}
              </div>
            );
          })
        )}

      </div>
    </article>
  );
};

const StepReview = ({
  // Current round
  product,
  productPriceData,
  selectedVendorIds,
  vendorTargets,
  formData,
  effectiveFields,
  chargeNamesList = [],
  // Page-level
  products = [],
  queuedRounds = [],
  updateFormData,
  endDateError,
  step3Errors = [],
  onEditProduct,
  onEditVendors,
  onRemoveQueuedRound,
  onEditQueuedRound,
  mode = 'product',
  // Read-only review (approval page): end date renders as static text,
  // validation errors are suppressed. Default keeps wizard behavior intact.
  readOnly = false,
}) => {
  // `formData.end_date` arrives in TWO different shapes, and that seam is
  // ticket 1. From the wizard it is a LOCAL wall-clock string out of
  // <input type="datetime-local"> ("2026-08-13T12:30"); from the approval page
  // it is a UTC instant off the API. `readOnly` is the discriminator, so each
  // branch parses the shape it actually has instead of one parser guessing.
  //
  // This hint is wizard-only (it sits under the input), so it is computed only
  // there — fed an API value it would have read 07:00 UTC as 07:00 local and
  // announced "01:30 UTC" for a deadline that is 07:00 UTC.
  const endDateUtc = useMemo(() => {
    if (readOnly || !formData.end_date) return null;
    return formatUtcDateTime(parseLocalDateTimeInput(formData.end_date), null);
  }, [formData.end_date, readOnly]);

  // Build a uniform display shape for every round (queued + current).
  // `previewItems` is the per-vendor /pricing/preview input — used by the
  // projection hook to compute post-target totals across all rounds in one POST.
  const rounds = useMemo(() => {
    const list = [];

    queuedRounds.forEach((r, idx) => {
      const isQueuedRfq = r.mode === 'rfq';
      // For RFQ-level queued rounds, the `rfq_product_id` is a carrier — its
      // product details aren't meaningful. The aggregated vendor data (built
      // off every RFQ product) is what we use to render the vendor block.
      const resolved = isQueuedRfq
        ? { product: null, details: {}, priceData: aggregateRfqVendors(products) }
        : resolveProduct(r.rfq_product_id, products);
      const priceData = resolved?.priceData || { vendors: [], l1: null };
      const details = resolved?.details || {};
      const key = `queued-${idx}-${r.rfq_product_id}-${isQueuedRfq ? 'rfq' : 'prd'}`;
      const previewItems = [];
      (r.vendor_targets || []).forEach((vt) => {
        const vendorInfo = priceData.vendors.find(v => v.vendorId === Number(vt.vendor_id));
        const item = buildPreviewItemFromQueuedFields({
          vendorQuoteData: vendorInfo,
          fields: vt.fields || [],
          chargeNamesList,
        });
        if (item) previewItems.push({ vid: Number(vt.vendor_id), item });
      });
      list.push({
        key,
        isCurrent: false,
        queueIndex: idx,
        mode: isQueuedRfq ? 'rfq' : 'product',
        productName: r.productName || details.name || (isQueuedRfq ? 'RFQ-level round' : `Product ${r.rfq_product_id}`),
        productMeta: {
          spec: details.spec,
          quantity: details.quantity,
          unit: details.unit,
          l1Total: priceData.l1 || 0,
          l1VendorName: priceData.vendors[0]?.vendorName || null,
        },
        vendorRows: buildVendorRowsFromPayload(r.vendor_targets, priceData, isQueuedRfq),
        previewItems,
      });
    });

    const isCurrentRfq = mode === 'rfq';
    if (product || isCurrentRfq) {
      const details = product ? getProductDetails(product) : {};
      const priceData = productPriceData || { vendors: [], l1: null };
      const key = isCurrentRfq ? 'current-rfq' : `current-${product.id}`;
      const globalSelectedFields = formData.negotiation_fields || [];
      const previewItems = [];
      (selectedVendorIds || []).forEach((vid) => {
        const vendorInfo = priceData.vendors.find(v => v.vendorId === vid);
        const item = buildPreviewItem({
          vendorQuoteData: vendorInfo,
          vendorId: vid,
          formData,
          vendorTargets,
          globalSelectedFields,
          chargeNamesList,
        });
        if (item) previewItems.push({ vid, item });
      });
      list.push({
        key,
        isCurrent: true,
        mode: isCurrentRfq ? 'rfq' : 'product',
        productName: isCurrentRfq
          ? 'RFQ-level round'
          : (details.name || `Product ${product.id}`),
        productMeta: {
          spec: details.spec,
          quantity: details.quantity,
          unit: details.unit,
          l1Total: priceData.l1 || 0,
          l1VendorName: priceData.vendors[0]?.vendorName || null,
        },
        vendorRows: buildVendorRowsFromLiveState({
          selectedVendorIds,
          vendorTargets,
          formData,
          effectiveFields,
          priceData,
          isRfqLevel: isCurrentRfq,
        }),
        previewItems,
      });
    }

    // RFQ-level card sorts first; product rounds keep queue order; the current
    // round appears last (unless it's the RFQ one, which pops to the top).
    list.sort((a, b) => {
      if (a.mode === 'rfq' && b.mode !== 'rfq') return -1;
      if (b.mode === 'rfq' && a.mode !== 'rfq') return 1;
      return 0;
    });

    return list;
  }, [queuedRounds, products, product, productPriceData, selectedVendorIds, vendorTargets, formData, effectiveFields, chargeNamesList, mode]);

  const projection = useReviewProjections({ rounds, formData, vendorTargets, chargeNamesList });

  // Union of every negotiation field actually in play across all rounds —
  // shown in the timeline summary so the buyer sees the full scope.
  const allFieldsInScope = useMemo(() => {
    const seen = new Set();
    rounds.forEach(r => {
      r.vendorRows.forEach(vr => {
        vr.targets.forEach(t => seen.add(t.fieldKey));
      });
    });
    return Array.from(seen);
  }, [rounds]);

  // Grand total across product rounds in this submission. Excludes RFQ-level
  // rounds — those edit globals (TCS etc.) whose contribution isn't captured
  // in the line subtotal, so summing them would be misleading.
  const { grandQuoted, grandProjected } = useMemo(() => {
    let quoted = 0;
    let projected = 0;
    rounds.forEach((r) => {
      if (r.mode === 'rfq') return;
      r.vendorRows.forEach((vr) => {
        const p = projection[`${r.key}:${vr.vid}`];
        quoted += vr.quotedTotal || 0;
        projected += (p != null ? p : (vr.quotedTotal || 0));
      });
    });
    return { grandQuoted: quoted, grandProjected: projected };
  }, [rounds, projection]);
  const grandDelta = grandProjected - grandQuoted;

  // ── RFQ-wide grand total per vendor ──────────────────────────────────────
  // The RFQ-level card shows each vendor's whole-quote grand total (incl. GST
  // + TCS) with BOTH the product-round savings and the RFQ-round savings
  // applied, per the spec: grand − Σ(product savings) − Σ(rfq savings).
  const vendorGrandTotals = useMemo(() => computeVendorGrandTotals(products), [products]);

  // Product savings per vendor = Σ over product rounds of (quoted − projected).
  const productSavingByVendor = useMemo(() => {
    const out = {};
    rounds.forEach((r) => {
      if (r.mode === 'rfq') return;
      r.vendorRows.forEach((vr) => {
        const p = projection[`${r.key}:${vr.vid}`];
        const projected = p != null ? p : (vr.quotedTotal || 0);
        const saving = (vr.quotedTotal || 0) - projected; // +ve = saving
        out[vr.vid] = (out[vr.vid] || 0) + saving;
      });
    });
    return out;
  }, [rounds, projection]);

  // RFQ savings per vendor = Σ of per-field savings in the RFQ round (only
  // fields whose target beats the quote, i.e. negative signed delta).
  const rfqSavingByVendor = useMemo(() => {
    const out = {};
    const rfqRound = rounds.find((r) => r.mode === 'rfq');
    if (!rfqRound) return out;
    rfqRound.vendorRows.forEach((vr) => {
      const saving = (vr.targets || []).reduce((s, t) => {
        return s + (Number.isFinite(t.deltaValue) && t.deltaValue < 0 ? -t.deltaValue : 0);
      }, 0);
      out[vr.vid] = saving;
    });
    return out;
  }, [rounds]);

  return (
    <div className={styles.reviewGrid}>
      {/* 1 — Round timeline (top, shared by every round in this submission) */}
      <section className={styles.reviewBlock}>
        <div className={styles.reviewBlockHead}>
          <p className={styles.reviewBlockTitle}>Round timeline</p>
        </div>
        <p className={styles.endDateTitle}>
          <CalendarDays size={16} style={{ marginRight: 6, verticalAlign: -3, color: '#64748b' }} />
          End date {!readOnly && <span style={{ color: '#dc2626' }}>*</span>}
        </p>
        <p className={styles.endDateHint}>
          Vendors can submit one quote per product until this date.
        </p>
        {readOnly ? (
          <p className={styles.reviewVal} style={{ fontSize: 15, fontWeight: 600 }}>
            {/* THE ticket-1 line. `moment(formData.end_date)` read the API's
                naive UTC "2026-08-13 07:00:00" as local wall clock and printed
                the digits back unchanged — 07:00 AM for a 12:30 PM deadline,
                on the one screen whose entire job is approving that deadline. */}
            {formatNegotiationDeadline(formData.end_date)}
          </p>
        ) : (
          <>
            {/* The control reads LOCAL wall clock, so a UTC `min` is 5h30m
                adrift of the thing it constrains and lets an Indian buyer pick
                a deadline in the past. */}
            <input
              type="datetime-local"
              value={formData.end_date || ''}
              onChange={(e) => updateFormData && updateFormData({ end_date: e.target.value })}
              min={localDateTimeInputMin()}
              className={`${styles.endDateInput} ${endDateError ? styles.endDateInputError : ''}`}
              required
            />
            {formData.end_date && (
              <p className={styles.endDateHint} style={{ marginTop: 8 }}>
                Will be sent as <strong>{endDateUtc}</strong>.
              </p>
            )}
          </>
        )}
        <div className={styles.reviewKeyValue} style={{ marginTop: 16 }}>
          <span className={styles.reviewKey}>Negotiation fields</span>
          <span className={styles.reviewVal}>
            {allFieldsInScope.map(labelFor).join(', ') || '—'}
          </span>
          <span className={styles.reviewKey}>Rounds in this submission</span>
          <span className={styles.reviewVal}>{rounds.length}</span>
        </div>

        {grandQuoted > 0 && (
          <div className={styles.reviewGrandTotal}>
            <span className={styles.reviewGrandLabel}>
              Grand total across all rounds
            </span>
            <span className={styles.reviewGrandQuoted}>{fmtINRDecimal(grandQuoted)}</span>
            <ArrowRight size={14} className={styles.reviewArrow} />
            <span className={styles.reviewGrandProjected}>{fmtINRDecimal(grandProjected)}</span>
            {Math.abs(grandDelta) > 0.5 && (
              <span className={`${styles.reviewDeltaPill} ${
                grandDelta < 0 ? styles.deltaDown : styles.deltaUp
              }`}>
                {grandDelta < 0 ? '−' : '+'}{fmtINRDecimal(Math.abs(grandDelta))}
              </span>
            )}
          </div>
        )}

        {!readOnly && step3Errors.length > 0 && (
          <ul className={styles.errorList} style={{ marginTop: 12 }}>
            {step3Errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        )}
      </section>

      {/* 2 — One white product card per round (current + queued), each with
              a gray vendor + targets block nested below. */}
      {rounds.length === 0 ? (
        <section className={styles.reviewBlock}>
          <p className={styles.emptySub}>
            Pick a product on Step 1 to start your first round.
          </p>
        </section>
      ) : (
        rounds.map(r => (
          <ReviewProductCard
            key={r.key}
            round={r}
            projection={projection}
            vendorGrandTotals={vendorGrandTotals}
            productSavingByVendor={productSavingByVendor}
            rfqSavingByVendor={rfqSavingByVendor}
            readOnly={readOnly}
            onEdit={r.isCurrent
              ? onEditProduct
              : (onEditQueuedRound ? () => onEditQueuedRound(r.queueIndex) : undefined)}
            onRemove={!r.isCurrent && onRemoveQueuedRound
              ? () => onRemoveQueuedRound(r.queueIndex)
              : undefined}
          />
        ))
      )}
    </div>
  );
};

export default StepReview;
