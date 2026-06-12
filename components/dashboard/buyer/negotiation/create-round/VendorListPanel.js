import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import VendorChargeCard from './VendorChargeCard';
import { getVendorDisplayName } from './negotiationHelpers';
import useVendorProjection from './useVendorProjection';
import styles from './VendorListPanel.module.scss';

const TINT_PALETTE = [
  { bg: '#e8edff', text: '#3b4ec1' },
  { bg: '#ffe5e5', text: '#b9462a' },
  { bg: '#e3f5e8', text: '#3d7a4f' },
  { bg: '#fff1d6', text: '#a06600' },
  { bg: '#ede5fa', text: '#5d3b9c' },
  { bg: '#dbf2f7', text: '#0c6b80' },
];

const initialsOf = (name) => {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const tintFor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TINT_PALETTE[Math.abs(hash) % TINT_PALETTE.length];
};

const titleCase = (s) =>
  String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Fields hidden from the per-vendor card grid because they are surfaced by a
// separate UI elsewhere on the page.
const DEFERRED_FIELDS = new Set(['payment_terms', 'global_comment']);

// Static label table for known field keys. Anything outside this table is
// resolved against `chargeNamesList` (slug/name lookup).
const STATIC_LABELS = {
  base_price: 'Base Price',
  delivery_period: 'Delivery Period',
  vendor_tc: 'Vendor T&C',
  comment: 'Comment',
};

const AMOUNT_ONLY_KEYS = new Set(['base_price', 'delivery_period']);
const TEXT_KEYS = new Set(['vendor_tc', 'comment']);

const resolveLabel = (slug, chargeNamesList) => {
  if (STATIC_LABELS[slug]) return STATIC_LABELS[slug];
  const c = (chargeNamesList || []).find(x => (x.slug || x.name) === slug);
  return c?.name || titleCase(slug);
};

const resolveChargeMeta = (slug, chargeNamesList) => {
  const c = (chargeNamesList || []).find(x => (x.slug || x.name) === slug);
  return c || null;
};

// `vendor.paymentTerms` can be a string OR an array of structured entries
// `{ id, type, value, days, comment, … }`. The vendor accordion / charge card
// needs a plain string for display. Mirrors the modal's existing formatting
// in NegotiationModal.formatVendorFieldValue.
const formatPaymentTerms = (pt) => {
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

// Defensive string coercion for other potentially-structured text fields.
const safeText = (v) => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(safeText).filter(Boolean).join(', ');
  // Object — pick the most likely human-readable property.
  return v.value || v.text || v.details || v.comment || '';
};

// Turn a vendor's quotation into a list of {kind,fieldKey,label,value,...}
// charge descriptors that VendorChargeCard can render.
//
// `mode` controls which slice of the vendor's quote we surface:
//   - 'product' (default): base price + per-product other charges, plus
//     vendor_tc / comment / delivery_period / documents and demand cards.
//   - 'rfq': quote-level global charges (TCS etc.) + payment_terms +
//     global_comment + documents. No base price, no delivery period, no
//     per-product other_charges.
const buildChargeList = (vendor, globalSelectedFields = [], chargeNamesList = [], mode = 'product') => {
  const list = [];
  const seen = new Set();

  if (mode === 'rfq') {
    // Quote-level global charges — pulled either from `globalCharges` (the
    // quote's `q.global_charges`) or from `is_global` entries in otherCharges.
    const seenGlobalSlug = new Set();
    const pushGlobal = (slug, name, amount, amountMode, tax, taxMode) => {
      if (!slug || seenGlobalSlug.has(slug)) return;
      seenGlobalSlug.add(slug);
      list.push({
        kind: 'numeric',
        fieldKey: slug,
        label: name || titleCase(slug),
        value: amount,
        mode: amountMode || 'percentage',
        tax,
        taxMode,
        unitHint: amountMode === 'amount' ? 'flat' : '% of base',
        supportsTarget: true,
      });
      seen.add(slug);
    };
    (vendor.globalCharges || []).forEach((c) => {
      const slug = c.slug || c.name;
      // global_charges entries from the engine use `tax` for the charge
      // value and `additional_tax` for the GST on top (when present).
      pushGlobal(slug, c.name, c.tax, c.tax_mode, c.additional_tax, c.additional_tax_mode);
    });
    (vendor.otherCharges || []).forEach((c) => {
      if (!c.is_global) return;
      const slug = c.slug || c.name;
      pushGlobal(slug, c.name, c.amount, c.amount_mode, c.tax, c.tax_mode);
    });

    // Payment terms — text field, vendor-quoted (or demand if not quoted).
    // `vendor.paymentTerms` can be an array of structured entries; flatten
    // to a plain display string here so VendorChargeCard renders cleanly.
    const ptDisplay = formatPaymentTerms(vendor.paymentTerms);
    if (ptDisplay) {
      list.push({
        kind: 'text',
        fieldKey: 'payment_terms',
        label: 'Payment Terms',
        value: ptDisplay,
        supportsTarget: true,
      });
      seen.add('payment_terms');
    }

    // Global comment — text field
    const gcDisplay = safeText(vendor.globalComment);
    if (gcDisplay) {
      list.push({
        kind: 'text',
        fieldKey: 'global_comment',
        label: 'Global Comment',
        value: gcDisplay,
        supportsTarget: true,
      });
      seen.add('global_comment');
    }

    // Documents — same shape as the product flow
    if (Array.isArray(vendor.documentFiles) && vendor.documentFiles.length > 0) {
      list.push({
        kind: 'text',
        fieldKey: 'documents',
        label: 'Documents',
        value: `${vendor.documentFiles.length} file${vendor.documentFiles.length > 1 ? 's' : ''}`,
        supportsTarget: true,
      });
      seen.add('documents');
    }

    // Demand cards — RFQ-level slugs the buyer added that this vendor
    // didn't quote. Mirrors the product-mode demand handling below.
    (globalSelectedFields || []).forEach((slug) => {
      if (!slug || seen.has(slug)) return;
      if (slug === 'payment_terms' || slug === 'global_comment' || slug === 'documents') {
        list.push({
          kind: 'demand-text',
          fieldKey: slug,
          label: STATIC_LABELS[slug]
            || (slug === 'payment_terms' ? 'Payment Terms'
                : slug === 'global_comment' ? 'Global Comment'
                : resolveLabel(slug, chargeNamesList)),
          isDemand: true,
          supportsTarget: true,
        });
        return;
      }
      const meta = resolveChargeMeta(slug, chargeNamesList);
      const defaultMode = meta?.amount_mode || 'percentage';
      list.push({
        kind: 'demand-numeric',
        fieldKey: slug,
        label: resolveLabel(slug, chargeNamesList),
        mode: defaultMode,
        unitHint: defaultMode === 'amount' ? 'flat' : '% of base',
        isDemand: true,
        supportsTarget: true,
      });
    });

    return list;
  }

  // ─── Product mode (existing behaviour) ──────────────────────────────────

  // Base Price — amount only, supports per-vendor override
  if (vendor.unitPrice > 0) {
    list.push({
      kind: 'base_price',
      fieldKey: 'base_price',
      label: 'Base Price',
      unitPrice: vendor.unitPrice,
      unitHint: 'per unit',
      supportsTarget: true,
    });
    seen.add('base_price');
  }

  // Per-product other charges
  (vendor.otherCharges || []).forEach((c) => {
    const slug = c.slug || c.name;
    if (!slug || DEFERRED_FIELDS.has(slug)) return;
    if (c.is_global) return; // handled elsewhere
    list.push({
      kind: 'numeric',
      fieldKey: slug,
      label: c.name || titleCase(slug),
      value: c.amount,
      mode: c.amount_mode || 'percentage',
      tax: c.tax,
      taxMode: c.tax_mode,
      unitHint: c.amount_mode === 'amount' ? 'flat' : '% of base',
      supportsTarget: true,
    });
    seen.add(slug);
  });

  // Quote-level global charges (TCS etc.) — handled in a separate surface,
  // skip on this page.

  // Delivery period — numeric in days, amount-only
  if (vendor.deliveryPeriod) {
    list.push({
      kind: 'info',
      fieldKey: 'delivery_period',
      label: 'Delivery Period',
      value: `${vendor.deliveryPeriod}`,
      supportsTarget: true,
    });
    seen.add('delivery_period');
  }

  // Payment terms — surfaced separately, intentionally omitted here.

  // Vendor T&C — text
  if (vendor.vendorTC) {
    list.push({
      kind: 'text',
      fieldKey: 'vendor_tc',
      label: 'Vendor T&C',
      value: vendor.vendorTC,
      supportsTarget: true,
    });
    seen.add('vendor_tc');
  }

  // Comment — text
  const commentDisplay = safeText(vendor.comment);
  if (commentDisplay) {
    list.push({
      kind: 'text',
      fieldKey: 'comment',
      label: 'Comment',
      value: commentDisplay,
      supportsTarget: true,
    });
    seen.add('comment');
  }

  // Documents — special
  if (Array.isArray(vendor.documentFiles) && vendor.documentFiles.length > 0) {
    list.push({
      kind: 'text',
      fieldKey: 'documents',
      label: 'Documents',
      value: `${vendor.documentFiles.length} file${vendor.documentFiles.length > 1 ? 's' : ''}`,
      supportsTarget: true,
    });
    seen.add('documents');
  }

  // "Demand" cards — fields the buyer added at the global level that this
  // vendor didn't quote. We still surface them so the user can see what's
  // being asked of this vendor in the round (and skip per vendor if needed).
  (globalSelectedFields || []).forEach((slug) => {
    if (!slug || seen.has(slug) || DEFERRED_FIELDS.has(slug)) return;

    if (TEXT_KEYS.has(slug) || slug === 'documents') {
      list.push({
        kind: 'demand-text',
        fieldKey: slug,
        label: STATIC_LABELS[slug] || resolveLabel(slug, chargeNamesList),
        isDemand: true,
        supportsTarget: true,
      });
      return;
    }

    if (slug === 'base_price') {
      list.push({
        kind: 'demand-base',
        fieldKey: 'base_price',
        label: 'Base Price',
        isDemand: true,
        unitHint: 'per unit',
        supportsTarget: true,
      });
      return;
    }

    // Dynamic numeric demand (freight, packaging, insurance, …)
    const meta = resolveChargeMeta(slug, chargeNamesList);
    const defaultMode = AMOUNT_ONLY_KEYS.has(slug)
      ? 'amount'
      : (meta?.amount_mode || 'percentage');
    list.push({
      kind: 'demand-numeric',
      fieldKey: slug,
      label: resolveLabel(slug, chargeNamesList),
      mode: defaultMode,
      unitHint: defaultMode === 'amount' ? 'flat' : '% of base',
      isDemand: true,
      supportsTarget: true,
    });
  });

  return list;
};

const VendorListPanel = ({
  productName,
  productPriceData = { vendors: [] },
  selectedVendorIds = [],
  vendorTargets = {},
  formData = {},
  chargeNamesList = [],
  onVendorToggle,
  onSelectAll,
  onSelectNone,
  onVendorTargetChange,
  onVendorLocalFieldToggle,
  onVendorFieldExcludeToggle,
  onOpenTextFieldModal,
  mode = 'product',
}) => {
  const vendors = useMemo(() => {
    return (productPriceData.vendors || [])
      .filter(v => v.vendorId && !v.isRegret)
      .map(v => ({
        id: v.vendorId,
        name: v.vendorName || getVendorDisplayName({ id: v.vendorId }),
        total: v.totalPrice || 0,
        raw: v,
      }))
      .sort((a, b) => a.total - b.total);
  }, [productPriceData]);

  const [manualOpen, setManualOpen] = useState(() => new Set());

  useEffect(() => {
    setManualOpen(prev => {
      const next = new Set(prev);
      selectedVendorIds.forEach(id => next.add(id));
      return next;
    });
  }, [selectedVendorIds.join(',')]);

  const isOpen = (id) => selectedVendorIds.includes(id) || manualOpen.has(id);

  // Live projection of each expanded selected vendor's line subtotal via the
  // backend pricing engine. See useVendorProjection for the debounce + abort
  // semantics — this never blocks editing.
  const projectionRows = useMemo(() => vendors.map(v => ({
    id: v.id,
    vendorQuoteData: v.raw,
    quotedTotal: v.total,
    isExpanded: isOpen(v.id),
    isSelected: selectedVendorIds.includes(v.id),
  })), [vendors, selectedVendorIds, manualOpen]);

  const { projectionMap } = useVendorProjection({
    vendors: projectionRows,
    formData,
    vendorTargets,
    globalSelectedFields: formData?.negotiation_fields || [],
    chargeNamesList,
  });

  const toggleRow = (id) => {
    setManualOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = vendors.length > 0 && vendors.every(v => selectedVendorIds.includes(v.id));
  const selectAllLabel = allSelected ? 'Deselect all' : 'Select all';

  return (
    <section className={styles.surface}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Vendors</span>
        {vendors.length > 0 && (
          <button
            type="button"
            className={styles.selectAllBtn}
            onClick={allSelected ? onSelectNone : onSelectAll}
          >
            {selectAllLabel}
          </button>
        )}
      </div>

      {vendors.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No vendor quotes yet</p>
          <p className={styles.emptySub}>
            This product has no valid vendor quotes available for negotiation.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {vendors.map((vendor) => {
            const isSelected = selectedVendorIds.includes(vendor.id);
            const open = isOpen(vendor.id);
            const tint = tintFor(vendor.name);
            const charges = open
              ? buildChargeList(vendor.raw, formData?.negotiation_fields || [], chargeNamesList, mode)
              : [];

            return (
              <li
                key={vendor.id}
                className={`${styles.item} ${isSelected ? styles.itemSelected : ''} ${open ? styles.itemOpen : ''}`}
              >
                <div className={styles.row}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => { e.stopPropagation(); onVendorToggle(vendor.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className={styles.checkbox}
                    aria-label={`Select ${vendor.name}`}
                  />
                  <button
                    type="button"
                    className={styles.rowBody}
                    onClick={() => toggleRow(vendor.id)}
                    aria-expanded={open}
                  >
                    <span
                      className={styles.avatar}
                      style={{ background: tint.bg, color: tint.text }}
                      aria-hidden="true"
                    >
                      {initialsOf(vendor.name)}
                    </span>
                    <span className={styles.name} title={vendor.name}>{vendor.name}</span>
                    {(() => {
                      const projection = projectionMap[vendor.id];
                      const quoted = vendor.total > 0
                        ? `₹${vendor.total.toLocaleString('en-IN')}`
                        : '—';

                      // In RFQ mode the displayed line subtotal excludes the
                      // quote-level globals being negotiated, so projecting an
                      // RFQ change on top of it is misleading. Show the plain
                      // line subtotal as a neutral reference, no old→new delta.
                      if (mode === 'rfq') {
                        return <span className={styles.total}>{quoted}</span>;
                      }

                      if (!projection || projection.isUnchanged) {
                        return <span className={styles.total}>{quoted}</span>;
                      }

                      const projected = `₹${Number(projection.value)
                        .toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                      const deltaSign = projection.delta < 0 ? '−' : '+';
                      const absDelta = Math.abs(projection.delta);
                      const tooltipText = `${deltaSign}₹${absDelta.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${Math.abs(projection.deltaPct).toFixed(2)}%) vs quoted`;
                      const projectedClass = projection.direction === 'down'
                        ? styles.totalProjectedDown
                        : styles.totalProjectedUp;

                      return (
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip id={`vproj-${vendor.id}`}>{tooltipText}</Tooltip>}
                        >
                          <span
                            className={styles.totalCluster}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <s className={styles.totalStruck}>{quoted}</s>
                            <span className={`${styles.totalProjected} ${projectedClass}`}>
                              {projected}
                            </span>
                          </span>
                        </OverlayTrigger>
                      );
                    })()}
                    <ChevronDown
                      size={16}
                      strokeWidth={2}
                      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {open && (
                  <div className={styles.body}>
                    {charges.length === 0 ? (
                      <p className={styles.bodyEmpty}>No quote details available.</p>
                    ) : (
                      <div className={styles.cardGrid}>
                        {charges.map((charge) => (
                          <VendorChargeCard
                            key={`${vendor.id}::${charge.fieldKey}`}
                            vendorId={vendor.id}
                            charge={charge}
                            vendorQuoteData={vendor.raw}
                            vendorTargets={vendorTargets}
                            formData={formData}
                            globalSelectedFields={formData?.negotiation_fields || []}
                            onVendorTargetChange={onVendorTargetChange}
                            onVendorLocalFieldToggle={onVendorLocalFieldToggle}
                            onVendorFieldExcludeToggle={onVendorFieldExcludeToggle}
                            onOpenTextFieldModal={onOpenTextFieldModal}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {vendors.length > 0 && (
        <p className={styles.footnote}>
          {selectedVendorIds.length} vendor(s) selected{productName ? ` · ${productName}` : ''}
        </p>
      )}
    </section>
  );
};

export default VendorListPanel;
