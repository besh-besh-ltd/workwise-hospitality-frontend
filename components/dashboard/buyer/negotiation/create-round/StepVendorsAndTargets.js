import React, { useCallback, useMemo, useRef, useState } from 'react';
import WwAiPanel from "@/components/wwai/WwAiPanel";
import {
  buildNegotiatorPlan,
  negotiatorOutcome,
  negotiatorVendorFor,
} from "@/lib/wwai/panels/negotiator";
import { Info, AlertTriangle, Check } from 'lucide-react';
import NegotiationFieldsSelect, { getChargeTargetKey } from '../NegotiationFieldsSelect';
import VendorListPanel from './VendorListPanel';
import TextFieldTargetModal from './TextFieldTargetModal';
import {
  getProductDetails,
  computeFieldL1,
  computeFieldTaxL1,
  buildVendorTargetsPayload,
} from './negotiationHelpers';
import { buildPreviewItem, previewItemTotal } from './buildPreviewItems';
import styles from './CreateRound.module.scss';

// Fields handled by a separate surface — hide them from both the global
// Negotiation Fields list and the per-vendor charge cards.
const DEFERRED_FIELD_KEYS = ['payment_terms', 'global_comment'];

// RFQ-level field set: payment_terms + global_comment + documents + every
// quote-level global charge slug. Used to restrict NegotiationFieldsSelect
// when `mode='rfq'`.
const RFQ_STATIC_KEYS = ['payment_terms', 'global_comment', 'documents'];

const fmtInr0 = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// Brief highlight on an element the AI just wrote — the prototype's
// "ai-applied" flash, run through the Web Animations API so it needs no
// keyframes anywhere.
const flashEl = (el) => {
  if (!el || typeof el.animate !== 'function') return;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [{ boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.38)' }, { boxShadow: '0 0 0 0 rgba(79, 70, 229, 0)' }],
    { duration: 1100, easing: 'cubic-bezier(.22, 1, .36, 1)' }
  );
};

// Step 2 — pick fields + global targets, end date, vendors.
// Per-vendor overrides happen inside the vendor accordion: each charge card
// has a check toggle; turning it on enables a per-vendor target input that
// overrides the global value for that vendor on that field.
const StepVendorsAndTargets = ({
  product,
  productPriceData,
  selectedVendorIds,
  onVendorToggle,
  onSelectAllVendors,
  onDeselectAllVendors,
  vendorTargets,
  setVendorTargets,
  setSelectedVendorIds,
  formData,
  updateFormData,
  toggleNegotiationField,
  showTargetWarning,
  step2Errors,
  chargeNamesList = [],
  mode = 'product',
}) => {
  const productDetails = product ? getProductDetails(product) : null;
  const hasVendors = selectedVendorIds.length > 0;
  const isRfqMode = mode === 'rfq';

  // In RFQ mode the field grid is restricted to RFQ-level slugs: the static
  // text fields above + every distinct is_global charge slug pulled from the
  // chargeNamesList. NegotiationFieldsSelect's `includeOnlyKeys` filter
  // applies this on the rendered card grid.
  const includeOnlyKeys = useMemo(() => {
    if (!isRfqMode) return null;
    const out = new Set(RFQ_STATIC_KEYS);
    (chargeNamesList || []).forEach(c => {
      if (c.is_global) out.add(c.slug || c.name);
    });
    return Array.from(out);
  }, [isRfqMode, chargeNamesList]);

  // L1 (lowest quoted value) per field, computed across all vendors who
  // actually quoted it. Shown on each global Negotiation Fields card as a
  // quick anchor while the buyer types their target. The field set switches
  // on mode: product mode uses per-product slugs; RFQ mode uses is_global
  // slugs (TCS etc.) — text fields have no L1.
  const l1Map = useMemo(() => {
    const fields = new Set();
    if (isRfqMode) {
      (chargeNamesList || []).forEach(c => {
        if (c.is_global) fields.add(c.slug || c.name);
      });
    } else {
      fields.add('base_price');
      fields.add('delivery_period');
      (chargeNamesList || []).forEach(c => {
        if (c.is_global) return;
        const slug = c.slug || c.name;
        if (slug && !DEFERRED_FIELD_KEYS.includes(slug)) fields.add(slug);
      });
    }
    const out = {};
    fields.forEach(f => {
      const l1 = computeFieldL1(f, productPriceData);
      if (l1) out[f] = l1;
    });
    return out;
  }, [productPriceData, chargeNamesList, isRfqMode]);

  // L1 (lowest tax) per field — anchor for the Target Tax input.
  const l1TaxMap = useMemo(() => {
    const fields = new Set();
    if (isRfqMode) {
      (chargeNamesList || []).forEach(c => {
        if (c.is_global) fields.add(c.slug || c.name);
      });
    } else {
      fields.add('base_price');
      (chargeNamesList || []).forEach(c => {
        if (c.is_global) return;
        const slug = c.slug || c.name;
        if (slug && !DEFERRED_FIELD_KEYS.includes(slug)) fields.add(slug);
      });
    }
    const out = {};
    fields.forEach(f => {
      const l1 = computeFieldTaxL1(f, productPriceData);
      if (l1) out[f] = l1;
    });
    return out;
  }, [productPriceData, chargeNamesList, isRfqMode]);

  // ── AI Negotiator → form ──────────────────────────────────────────
  // "Apply suggested targets" writes the draft into this wizard's own state,
  // in the prototype's order: the three global targets, the vendor set, then
  // each vendor's overrides. VendorListPanel animates every row from quoted
  // to projected as the targets land.
  const [aiApplied, setAiApplied] = useState(false);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const applyAiTargets = useCallback((plan) => new Promise((resolve) => {
    const rows = (productPriceData?.vendors || []).filter(v => v.vendorId && !v.isRegret);
    const rowFor = (planVendor) => rows.find(r => negotiatorVendorFor(r.vendorName)?.id === planVendor.id) || null;
    const mapped = plan.vendors.map(pv => ({ pv, row: rowFor(pv) })).filter(x => x.row);
    const g = plan.globals;
    const steps = [];

    // a · fields + global targets
    steps.push(() => {
      const current = formDataRef.current?.negotiation_fields || [];
      const fields = Array.from(new Set([...current, ...plan.fields]));
      updateFormData({
        negotiation_fields: fields,
        [getChargeTargetKey('base_price')]: String(g.base_price),
        [getChargeTargetKey('freight')]: String(g.freight),
        target_freight_mode: 'percentage',
        [getChargeTargetKey('packaging')]: String(g.packaging),
        target_packaging_mode: 'percentage',
      });
      setTimeout(() => {
        document.querySelectorAll('[class*="negFieldInput"]').forEach(flashEl);
      }, 60);
    });

    // b · the vendor set — only when the rows on screen ARE the drafted vendors
    if (mapped.length && typeof setSelectedVendorIds === 'function') {
      steps.push(() => {
        const inRound = mapped.filter(x => x.pv.include).map(x => x.row.vendorId);
        const unmatched = rows.filter(r => !mapped.some(x => x.row === r)).map(r => r.vendorId);
        setSelectedVendorIds(prev => [
          ...inRound,
          ...prev.filter(id => unmatched.includes(id) && !inRound.includes(id)),
        ]);
      });
    }

    // c · per-vendor overrides, one vendor at a time
    mapped.filter(x => x.pv.include && x.pv.target).forEach(({ pv, row }) => {
      steps.push(() => {
        const t = pv.target;
        const entry = { _localFields: [], _excludedFields: [] };
        if (t.unit != null && Number(t.unit) !== Number(g.base_price)) entry.base_price = String(t.unit);
        if (pv.skip.includes('freight')) {
          entry._excludedFields.push('freight');
        } else if (t.freightPct != null && Number(t.freightPct) !== Number(g.freight)) {
          entry.freight = String(t.freightPct);
          entry.freight_mode = 'percentage';
        }
        if (t.packagingPct != null && Number(t.packagingPct) !== Number(g.packaging)) {
          entry.packaging = String(t.packagingPct);
          entry.packaging_mode = 'percentage';
        }
        if (t.deliveryDays) {
          entry.delivery_period = String(t.deliveryDays);
          entry._localFields.push('delivery_period');
        }
        setVendorTargets(prev => ({ ...prev, [row.vendorId]: entry }));
      });
    });

    steps.push(() => {
      setAiApplied(true);
      resolve();
    });

    let i = 0;
    const tick = () => {
      if (i >= steps.length) return;
      steps[i++]();
      setTimeout(tick, i === 1 ? 320 : 240);
    };
    tick();
  }), [productPriceData, updateFormData, setSelectedVendorIds, setVendorTargets]);

  // What the round on screen would send, and — when its vendors are the ones
  // the AI drafted — the expected saving recomputed from the form.
  const aiSummary = useMemo(() => {
    if (!aiApplied) return null;
    const fields = formData?.negotiation_fields?.length ? formData.negotiation_fields : ['base_price'];
    const payload = buildVendorTargetsPayload({
      selectedVendorIds, vendorTargets, effectiveFields: fields, formData, productPriceData,
    });
    const targets = payload.reduce((n, v) => n + v.fields.length, 0);
    const rows = (productPriceData?.vendors || []).filter(v => v.vendorId && !v.isRegret).map((v) => {
      const included = selectedVendorIds.includes(v.vendorId);
      const item = included
        ? buildPreviewItem({
          vendorQuoteData: v,
          vendorId: v.vendorId,
          formData,
          vendorTargets,
          globalSelectedFields: formData?.negotiation_fields || [],
          chargeNamesList,
        })
        : null;
      return { name: v.vendorName, quoted: v.totalPrice, projected: previewItemTotal(item) ?? v.totalPrice, included };
    });
    return { targets, vendors: payload.length, outcome: negotiatorOutcome(rows) };
  }, [aiApplied, formData, selectedVendorIds, vendorTargets, productPriceData, chargeNamesList]);

  // Text-field sub-modal state — used for payment_terms / vendor_tc /
  // comment / documents per-vendor overrides.
  const [textFieldModal, setTextFieldModal] = useState(null);
  const [tempTextTarget, setTempTextTarget] = useState('');

  const handleVendorTargetChange = useCallback((vendorId, fieldKey, value) => {
    setVendorTargets(prev => ({
      ...prev,
      [vendorId]: { ...(prev[vendorId] || {}), [fieldKey]: value },
    }));
  }, [setVendorTargets]);

  const handleVendorLocalFieldToggle = useCallback((vendorId, fieldKey) => {
    setVendorTargets(prev => {
      const vendorData = prev[vendorId] || {};
      const localFields = vendorData._localFields || [];
      const willEnable = !localFields.includes(fieldKey);
      const nextFields = willEnable
        ? [...localFields, fieldKey]
        : localFields.filter(f => f !== fieldKey);
      const next = { ...vendorData, _localFields: nextFields };
      // Turning the card off also clears the per-vendor value so we fall back
      // to the global target.
      if (!willEnable) {
        delete next[fieldKey];
        delete next[`${fieldKey}_mode`];
      }
      return { ...prev, [vendorId]: next };
    });
  }, [setVendorTargets]);

  // Inclusion toggle for fields whose target lives at the global level.
  // Default is "included" so the check is ON. Clicking it adds the field to
  // _excludedFields → that vendor will be skipped for this field in the payload.
  const handleVendorFieldExcludeToggle = useCallback((vendorId, fieldKey) => {
    setVendorTargets(prev => {
      const vendorData = prev[vendorId] || {};
      const excluded = vendorData._excludedFields || [];
      const isExcluded = excluded.includes(fieldKey);
      const nextExcluded = isExcluded
        ? excluded.filter(f => f !== fieldKey)
        : [...excluded, fieldKey];
      return { ...prev, [vendorId]: { ...vendorData, _excludedFields: nextExcluded } };
    });
  }, [setVendorTargets]);

  const handleOpenTextFieldModal = useCallback((vendorId, fieldKey, fieldLabel) => {
    if (fieldKey === 'documents') {
      const existing = vendorTargets[vendorId]?.[fieldKey];
      try {
        setTempTextTarget(typeof existing === 'string' ? JSON.parse(existing) : (existing || {}));
      } catch {
        setTempTextTarget({});
      }
    } else {
      const localTarget = vendorTargets[vendorId]?.[fieldKey];
      const globalTarget = formData?.[getChargeTargetKey(fieldKey)];
      setTempTextTarget(localTarget || globalTarget || '');
    }
    setTextFieldModal({ vendorId, fieldKey, fieldLabel });
  }, [vendorTargets, formData]);

  const handleCloseTextFieldModal = useCallback(() => {
    if (textFieldModal) {
      const { vendorId, fieldKey } = textFieldModal;
      const hasTarget = vendorTargets[vendorId]?.[fieldKey];
      if (!hasTarget) {
        setVendorTargets(prev => {
          const vendorData = prev[vendorId] || {};
          const localFields = (vendorData._localFields || []).filter(f => f !== fieldKey);
          return { ...prev, [vendorId]: { ...vendorData, _localFields: localFields } };
        });
      }
    }
    setTextFieldModal(null);
    setTempTextTarget('');
  }, [textFieldModal, vendorTargets, setVendorTargets]);

  const handleSaveTextFieldTarget = useCallback(() => {
    if (!textFieldModal) return;
    const { vendorId, fieldKey } = textFieldModal;

    if (fieldKey === 'documents') {
      const docComments = typeof tempTextTarget === 'object' ? tempTextTarget : {};
      const hasAny = Object.values(docComments).some(v => v && String(v).trim());
      if (hasAny) {
        setVendorTargets(prev => ({
          ...prev,
          [vendorId]: { ...(prev[vendorId] || {}), [fieldKey]: JSON.stringify(docComments) },
        }));
      } else {
        setVendorTargets(prev => {
          const vendorData = { ...(prev[vendorId] || {}) };
          delete vendorData[fieldKey];
          const localFields = (vendorData._localFields || []).filter(f => f !== fieldKey);
          return { ...prev, [vendorId]: { ...vendorData, _localFields: localFields } };
        });
      }
    } else if (typeof tempTextTarget === 'string' && tempTextTarget.trim()) {
      setVendorTargets(prev => ({
        ...prev,
        [vendorId]: { ...(prev[vendorId] || {}), [fieldKey]: tempTextTarget },
      }));
    } else {
      setVendorTargets(prev => {
        const vendorData = { ...(prev[vendorId] || {}) };
        delete vendorData[fieldKey];
        const localFields = (vendorData._localFields || []).filter(f => f !== fieldKey);
        return { ...prev, [vendorId]: { ...vendorData, _localFields: localFields } };
      });
    }

    setTextFieldModal(null);
    setTempTextTarget('');
  }, [textFieldModal, tempTextTarget, setVendorTargets]);

  // Read-only current vendor value for the sub-modal header (mirrors modal helper).
  const getVendorTextFieldValue = useCallback((vendorId, fieldKey) => {
    const vendorData = productPriceData.vendors.find(v => v.vendorId === vendorId);
    if (!vendorData) return '--';
    // Tax demand/negotiate sub-modal: surface the vendor's quoted tax on the
    // underlying field as the "current value".
    if (fieldKey.endsWith('_tax')) {
      const base = fieldKey.slice(0, -4);
      if (base === 'base_price') {
        const t = parseFloat(vendorData.tax);
        return Number.isFinite(t) && t > 0
          ? ((vendorData.taxMode === 'amount' || vendorData.taxMode === 'absolute') ? `₹${t}` : `${t}%`)
          : 'No tax was given';
      }
      const c = (vendorData.otherCharges || []).find(x => (x.slug || x.name) === base || x.name === base);
      if (c) {
        const t = parseFloat(c.tax);
        return Number.isFinite(t) && t > 0
          ? ((c.tax_mode === 'amount' || c.tax_mode === 'absolute') ? `₹${t}` : `${t}%`)
          : 'No tax was given';
      }
      // Quote-level global charge (e.g. TCS): the charge value lives in `.tax`
      // and the GST-on-charge in `.additional_tax` / `.additional_tax_mode`.
      const g = (vendorData.globalCharges || []).find(x => (x.slug || x.name) === base || x.name === base);
      if (g) {
        const gt = parseFloat(g.additional_tax);
        return Number.isFinite(gt) && gt > 0
          ? ((g.additional_tax_mode === 'amount' || g.additional_tax_mode === 'absolute') ? `₹${gt}` : `${gt}%`)
          : 'No tax was given';
      }
      return 'No tax was given';
    }
    switch (fieldKey) {
      case 'payment_terms':
        if (!vendorData.paymentTerms) return '--';
        if (typeof vendorData.paymentTerms === 'string') return vendorData.paymentTerms;
        if (Array.isArray(vendorData.paymentTerms)) {
          return vendorData.paymentTerms.map(t => {
            const parts = [];
            if (t.value) parts.push(`${t.value}%`);
            if (t.type) parts.push(t.type);
            if (t.days) parts.push(`${t.days} days`);
            if (t.comment) parts.push(t.comment);
            return parts.join(' ');
          }).filter(Boolean).join(', ');
        }
        return '--';
      case 'comment': return vendorData.comment || '--';
      case 'global_comment': return vendorData.globalComment || '--';
      case 'vendor_tc': return vendorData.vendorTC || '--';
      // Scope-matched: an RFQ-level ask is answered from the quote-wide
      // uploader, a product-scoped one from that line's uploader. Showing the
      // wrong set here would have the buyer commenting on files the vendor
      // cannot see against this ask.
      case 'documents':
        return (isRfqMode ? vendorData.documentFiles : vendorData.lineDocumentFiles) || [];
      default: return '--';
    }
  }, [productPriceData, isRfqMode]);

  return (
    <div className={styles.stepStack}>
      <div className={styles.infoBanner} role="note">
        <Info size={16} strokeWidth={2} className={styles.infoBannerIcon} aria-hidden="true" />
        <span>
          Pick the fields you want to negotiate and set a global target for each. Expand a vendor
          to override the target <strong>per vendor</strong> on any individual charge.
        </span>
      </div>

      {/* AI Negotiator — the prototype's round-drafting analysis, carried
          across whole. Above the field pickers, as in the prototype: the
          recommendation is read before targets are set. */}
      <WwAiPanel
        id="ai-negotiator"
        className="neg-ai-panel"
        title="AI Negotiator"
        sub="Drafts a round from vendor history, market rates and past concessions."
        runLabel="Draft this round"
        buildPlan={() => buildNegotiatorPlan({ onApply: isRfqMode ? null : applyAiTargets })}
      />

      {aiSummary && (
        <div className={styles.aiAppliedBar} role="status">
          <span className={styles.aiAppliedChip}>
            <Check size={13} strokeWidth={2.6} aria-hidden="true" />
            AI targets applied · {aiSummary.targets} fields
          </span>
          <span className={styles.aiAppliedStat}>
            <strong>{aiSummary.targets}</strong> targets across <strong>{aiSummary.vendors}</strong> vendor{aiSummary.vendors === 1 ? '' : 's'}
          </span>
          {aiSummary.outcome && (
            <span className={styles.aiAppliedSaving}>
              Expected landed saving <strong>{fmtInr0(aiSummary.outcome.expectedSaving)}</strong>
              {' '}against today’s L1 landed {fmtInr0(aiSummary.outcome.l1Total)}
            </span>
          )}
        </div>
      )}

      <NegotiationFieldsSelect
        selectedFields={formData.negotiation_fields}
        onToggleField={toggleNegotiationField}
        formData={formData}
        onFormChange={updateFormData}
        disabled={!hasVendors}
        defaultCharges={chargeNamesList.filter(c => c.created_by === null)}
        excludeKeys={isRfqMode ? [] : DEFERRED_FIELD_KEYS}
        includeOnlyKeys={includeOnlyKeys}
        l1Map={l1Map}
        l1TaxMap={l1TaxMap}
        showTaxInput
      />

      <VendorListPanel
        productName={isRfqMode ? 'RFQ-level round' : productDetails?.name}
        productPriceData={productPriceData}
        selectedVendorIds={selectedVendorIds}
        vendorTargets={vendorTargets}
        formData={formData}
        chargeNamesList={chargeNamesList}
        onVendorToggle={onVendorToggle}
        onSelectAll={onSelectAllVendors}
        onSelectNone={onDeselectAllVendors}
        onVendorTargetChange={handleVendorTargetChange}
        onVendorLocalFieldToggle={handleVendorLocalFieldToggle}
        onVendorFieldExcludeToggle={handleVendorFieldExcludeToggle}
        onOpenTextFieldModal={handleOpenTextFieldModal}
        mode={mode}
      />

      {showTargetWarning && (
        <div className={styles.dangerBanner} role="alert">
          <AlertTriangle size={16} className={styles.dangerBannerIcon} aria-hidden="true" />
          <span>
            The target must be <strong>better than the vendor’s quoted value</strong>
            (lower price / charges / days). If it isn’t, that field is dropped for that vendor and
            they can’t negotiate it.
          </span>
        </div>
      )}

      {step2Errors.length > 0 && (
        <ul className={styles.errorList}>
          {step2Errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}

      <TextFieldTargetModal
        open={textFieldModal}
        tempValue={tempTextTarget}
        setTempValue={setTempTextTarget}
        onSave={handleSaveTextFieldTarget}
        onClose={handleCloseTextFieldModal}
        getCurrentVendorValue={getVendorTextFieldValue}
      />
    </div>
  );
};

export default StepVendorsAndTargets;
