import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { CalendarDays, X, ArrowRight } from 'lucide-react';
import { previewTotals } from '@/services/pricing';
import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import {
  getProductDetails,
  getVendorPriceData,
  TEXT_ONLY_NEG_FIELDS,
  compareTargetToQuoted,
  aggregateRfqVendors,
} from './negotiationHelpers';
import { buildPreviewItem, buildPreviewItemFromQueuedFields } from './buildPreviewItems';
import styles from './CreateRound.module.scss';

const FIELD_LABELS = {
  base_price: 'Base Price',
  payment_terms: 'Payment Terms',
  vendor_tc: 'Vendor T&C',
  comment: 'Comment',
  global_comment: 'Global Comment',
  delivery_period: 'Delivery Period',
  documents: 'Documents',
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
  if (fieldKey === 'base_price') return `₹${value}`;
  if (mode === 'amount' || mode === 'absolute') return `₹${value}`;
  const pctText = `${value}%`;
  const amount = basePrice > 0 ? (Number(value) / 100) * basePrice : 0;
  return amount > 0
    ? `${pctText} (₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })})`
    : pctText;
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
const buildVendorRowsFromPayload = (vendorTargets, priceData) => {
  return (vendorTargets || []).map(vt => {
    const vendorInfo = priceData.vendors.find(v => v.vendorId === Number(vt.vendor_id));
    const vendorName = vendorInfo ? vendorInfo.vendorName : `Vendor ${vt.vendor_id}`;
    const quotedTotal = vendorInfo?.totalPrice || 0;
    const basePrice = (parseFloat(vendorInfo?.unitPrice) || 0) * (parseFloat(vendorInfo?.quantity) || 0);
    const targets = (vt.fields || []).map(f => {
      const targetMode = f.mode === 'absolute' ? 'amount' : (f.mode || 'percentage');
      const quoted = readQuotedForField(vendorInfo, f.name);
      const cmp = quoted
        ? compareTargetToQuoted(f.target, targetMode, vendorInfo, f.name)
        : null;
      const targetTaxMode = f.tax_mode === 'absolute' ? 'amount' : f.tax_mode;
      return {
        fieldKey: f.name,
        label: labelFor(f.name),
        targetDisplay: fmtFieldValue(f.name, f.target, targetMode, basePrice),
        quotedDisplay: quoted ? fmtFieldValue(f.name, quoted.value, quoted.mode, basePrice) : '—',
        quotedTaxDisplay: quoted ? fmtTaxValue(quoted.tax, quoted.taxMode) : null,
        targetTaxDisplay: fmtTaxValue(f.tax, targetTaxMode),
        deltaDisplay: cmp ? `${cmp.result === 'lower' ? '−' : (cmp.result === 'greater' ? '+' : '')}${cmp.diffAmt}` : null,
        deltaDirection: cmp?.result || null,
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
      && vt[k] != null && vt[k] !== ''
    );

    const fieldKeys = [
      ...effectiveFields,
      ...localKeys.filter(k => !effectiveFields.includes(k)),
    ];

    const targets = fieldKeys.map(fieldKey => {
      const localVal = vt[fieldKey];
      const targetKey = getChargeTargetKey(fieldKey);
      const globalVal = targetKey ? formData[targetKey] : '';
      const value = localVal != null && localVal !== '' ? localVal : globalVal;
      if (!value) return null;
      const localMode = vt[`${fieldKey}_mode`];
      const globalMode = formData[`target_${fieldKey}_mode`];
      const mode = localMode || globalMode || 'percentage';
      // Target tax: per-vendor wins, else global. Mode stored as 'percentage'
      // or 'amount' in the live state.
      const localTax = vt[`${fieldKey}_tax`];
      const globalTax = formData[`target_${fieldKey}_tax`];
      const targetTax = localTax != null && localTax !== '' ? localTax : globalTax;
      const targetTaxMode = vt[`${fieldKey}_tax_mode`]
        || formData[`target_${fieldKey}_tax_mode`]
        || 'percentage';
      const quoted = readQuotedForField(vendorInfo, fieldKey);
      const cmp = quoted
        ? compareTargetToQuoted(value, mode, vendorInfo, fieldKey)
        : null;
      return {
        fieldKey,
        label: labelFor(fieldKey),
        targetDisplay: fmtFieldValue(fieldKey, value, mode, basePrice),
        quotedDisplay: quoted ? fmtFieldValue(fieldKey, quoted.value, quoted.mode, basePrice) : '—',
        quotedTaxDisplay: quoted ? fmtTaxValue(quoted.tax, quoted.taxMode) : null,
        targetTaxDisplay: fmtTaxValue(targetTax, targetTaxMode),
        deltaDisplay: cmp ? `${cmp.result === 'lower' ? '−' : (cmp.result === 'greater' ? '+' : '')}${cmp.diffAmt}` : null,
        deltaDirection: cmp?.result || null,
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
const ReviewProductCard = ({ round, projection, onEdit, onRemove }) => {
  const productHeader = round.productMeta || {};
  const isRfq = round.mode === 'rfq';

  // Per-vendor projected totals, falling back to quoted when no projection
  // (e.g. vendor had no in-scope deltas, or the API hasn't returned yet).
  const vendorRowsWithTotals = round.vendorRows.map((vr) => {
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
            {round.isCurrent ? 'Current round' : 'Queued round'}
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
              <X size={14} />
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
                  {fmtINR(productHeader.l1Total)}
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
                  {/* Vendor-level totals are only meaningful for product
                      rounds — the line subtotal we display doesn't include
                      RFQ-wide globals, so projecting an RFQ-level change on
                      top of it produces a misleading number. Per-field
                      deltas (below) carry the real comparison. */}
                  {!isRfq && (
                    <div className={styles.reviewVendorTotals}>
                      {vr.hasProjection && Math.abs(vendorDelta) > 0.5 ? (
                        <>
                          <span className={styles.reviewVendorTotalQuoted}>
                            {fmtINR(vr.quotedTotal)}
                          </span>
                          <ArrowRight size={12} className={styles.reviewArrow} />
                          <span className={styles.reviewVendorTotalProjected}>
                            {fmtINR(vr.projectedTotal)}
                          </span>
                          <span className={`${styles.reviewDeltaPill} ${vendorDeltaClass}`}>
                            {vendorDelta < 0 ? '−' : '+'}{fmtINR(Math.abs(vendorDelta))}
                          </span>
                        </>
                      ) : (
                        <span className={styles.reviewVendorTotalProjected}>
                          {fmtINR(vr.quotedTotal)}
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
  mode = 'product',
}) => {
  const endDateUtc = useMemo(() => {
    if (!formData.end_date) return null;
    return moment(formData.end_date).utc().format('DD MMM YYYY, HH:mm') + ' UTC';
  }, [formData.end_date]);

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
        vendorRows: buildVendorRowsFromPayload(r.vendor_targets, priceData),
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

  return (
    <div className={styles.reviewGrid}>
      {/* 1 — Round timeline (top, shared by every round in this submission) */}
      <section className={styles.reviewBlock}>
        <div className={styles.reviewBlockHead}>
          <p className={styles.reviewBlockTitle}>Round timeline</p>
        </div>
        <p className={styles.endDateTitle}>
          <CalendarDays size={16} style={{ marginRight: 6, verticalAlign: -3, color: '#64748b' }} />
          End date <span style={{ color: '#dc2626' }}>*</span>
        </p>
        <p className={styles.endDateHint}>
          Vendors can submit one quote per product until this date.
        </p>
        <input
          type="datetime-local"
          value={formData.end_date || ''}
          onChange={(e) => updateFormData && updateFormData({ end_date: e.target.value })}
          min={new Date().toISOString().slice(0, 16)}
          className={`${styles.endDateInput} ${endDateError ? styles.endDateInputError : ''}`}
          required
        />
        {formData.end_date && (
          <p className={styles.endDateHint} style={{ marginTop: 8 }}>
            Will be sent as <strong>{endDateUtc}</strong>.
          </p>
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

        {step3Errors.length > 0 && (
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
            onEdit={r.isCurrent ? onEditProduct : undefined}
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
