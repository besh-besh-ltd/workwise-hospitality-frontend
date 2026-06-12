import { useCallback, useMemo, useState, useEffect } from 'react';
import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import {
  getVendorPriceData,
  isFieldTargetInvalid,
  getVendorIdsForProduct,
  getProductDetails,
  buildVendorTargetsPayload,
  toUtcEndDate,
  aggregateRfqVendors,
} from './negotiationHelpers';

// Owns all wizard state for the Create Negotiation Round page. Returns a
// single object the page splits into props for each step component.
//
// Mirrors the modal's create-mode behavior:
//   - step 1 picks a product
//   - step 2 picks vendors, negotiation fields, end date, per-vendor targets
//   - step 3 reviews + submits
export default function useCreateRoundState({ products = [], preSelectedProductId = null } = {}) {
  const [step, setStep] = useState(1);
  // `mode` controls whether the CURRENT round being built targets one product
  // ('product') or RFQ-wide settings ('rfq'). Queued rounds carry their own
  // `mode` so the submit loop can branch per entry.
  const [mode, setModeState] = useState('product');
  const [selectedProductId, setSelectedProductId] = useState(preSelectedProductId);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [vendorTargets, setVendorTargets] = useState({});
  const [formData, setFormData] = useState({
    end_date: '',
    negotiation_fields: [],
  });
  const [endDateError, setEndDateError] = useState(false);
  const [showTargetWarning, setShowTargetWarning] = useState(false);
  // Local queue of completed-but-not-yet-submitted rounds. Each entry is a
  // ready-to-send `createNegotiationRound` payload + display metadata.
  const [queuedRounds, setQueuedRounds] = useState([]);

  const selectedProduct = useMemo(
    () => products.find(p => String(p.id) === String(selectedProductId)) || null,
    [products, selectedProductId]
  );

  // RFQ-wide vendor data (union across all products). Built only when mode=rfq
  // is in play, since aggregation walks every product's quote list.
  const aggregatedPriceData = useMemo(
    () => aggregateRfqVendors(products),
    [products]
  );

  // The "active" price data that Step 2 / Step 3 consumes — switches based on
  // the current round's mode. Downstream code stays mode-agnostic.
  const productPriceData = useMemo(() => {
    if (mode === 'rfq') return aggregatedPriceData;
    return selectedProduct ? getVendorPriceData(selectedProduct) : { vendors: [], l1: null };
  }, [mode, aggregatedPriceData, selectedProduct]);

  // Default to base_price when nothing is picked yet (matches modal).
  const effectiveFields = useMemo(() => {
    return formData.negotiation_fields.length > 0 ? formData.negotiation_fields : ['base_price'];
  }, [formData.negotiation_fields]);

  // Product selection: auto-select all available (non-regretted) vendors so
  // the user can move straight into target entry, same as modal line 456-470.
  // Falls back to quotation-derived vendor ids when product_vendors is empty
  // (some RFQs only carry vendors through quotations).
  const handleSelectProduct = useCallback((productId) => {
    setModeState('product');
    setSelectedProductId(productId);
    const product = products.find(p => String(p.id) === String(productId));
    if (product) {
      const priceData = getVendorPriceData(product);
      const fromProductVendors = Array.from(getVendorIdsForProduct(product))
        .filter(vid => {
          const priceInfo = priceData.vendors.find(vp => vp.vendorId === vid);
          return !priceInfo?.isRegret;
        });
      const fromQuotations = priceData.vendors
        .filter(v => v.vendorId && !v.isRegret)
        .map(v => v.vendorId);
      const availableIds = fromProductVendors.length > 0 ? fromProductVendors : fromQuotations;
      setSelectedVendorIds(availableIds);
    } else {
      setSelectedVendorIds([]);
    }
    setVendorTargets({});
  }, [products]);

  const toggleVendor = useCallback((vendorId) => {
    setSelectedVendorIds(prev => {
      const idx = prev.indexOf(vendorId);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return [...prev, vendorId];
    });
  }, []);

  const selectAllVendors = useCallback(() => {
    if (!selectedProduct) return;
    const allVendorIds = Array.from(getVendorIdsForProduct(selectedProduct));
    const availableIds = allVendorIds.filter(vid => {
      const priceInfo = productPriceData.vendors.find(vp => vp.vendorId === vid);
      return !priceInfo?.isRegret;
    });
    setSelectedVendorIds(prev => {
      const allSelected = availableIds.every(id => prev.includes(id));
      return allSelected ? [] : availableIds;
    });
  }, [selectedProduct, productPriceData]);

  const toggleNegotiationField = useCallback((fieldValue) => {
    setFormData(prev => {
      const current = prev.negotiation_fields;
      const next = current.includes(fieldValue)
        ? current.filter(f => f !== fieldValue)
        : [...current, fieldValue];
      return { ...prev, negotiation_fields: next };
    });
  }, []);

  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
    if (updates.end_date) setEndDateError(false);
  }, []);

  const setVendorTarget = useCallback((vendorId, fieldKey, value) => {
    setVendorTargets(prev => ({
      ...prev,
      [vendorId]: { ...(prev[vendorId] || {}), [fieldKey]: value },
    }));
  }, []);

  const toggleVendorLocalField = useCallback((vendorId, fieldKey) => {
    setVendorTargets(prev => {
      const vendorData = prev[vendorId] || {};
      const localFields = vendorData._localFields || [];
      const nextFields = localFields.includes(fieldKey)
        ? localFields.filter(f => f !== fieldKey)
        : [...localFields, fieldKey];
      return { ...prev, [vendorId]: { ...vendorData, _localFields: nextFields } };
    });
  }, []);

  // Drive the inline warning in real time (modal lines 671-674).
  useEffect(() => {
    if (selectedVendorIds.length === 0) {
      setShowTargetWarning(false);
      return;
    }
    const offending = selectedVendorIds.some((vid) => {
      const vendorData = productPriceData.vendors.find((v) => v.vendorId === vid);
      const vt = vendorTargets[vid] || {};
      return effectiveFields.some((fieldKey) => isFieldTargetInvalid(fieldKey, vt, vendorData, formData));
    });
    setShowTargetWarning(offending);
  }, [vendorTargets, formData, selectedVendorIds, effectiveFields, productPriceData]);

  // Switching to RFQ-level mode clears product-specific state so per-product
  // selections / targets / fields don't leak into the RFQ submission. The
  // end date is preserved (rounds typically share the deadline).
  const setMode = useCallback((nextMode) => {
    setModeState(nextMode);
    setSelectedProductId(null);
    setSelectedVendorIds(() => {
      // When entering RFQ mode, preselect every non-regretted vendor across
      // the RFQ — saves the user a tedious manual selection on Step 2.
      if (nextMode === 'rfq') {
        return aggregatedPriceData.vendors
          .filter(v => v.vendorId && !v.isRegret)
          .map(v => v.vendorId);
      }
      return [];
    });
    setVendorTargets({});
    setFormData(prev => ({ end_date: prev.end_date || '', negotiation_fields: [] }));
    setEndDateError(false);
    setShowTargetWarning(false);
  }, [aggregatedPriceData]);

  // Step gating — RFQ mode skips product selection.
  const canGoToStep2 = mode === 'rfq' || !!selectedProductId;

  const step2Errors = useMemo(() => {
    const errors = [];
    if (selectedVendorIds.length === 0) errors.push('Select at least one vendor.');

    // Every selected vendor needs at least one effective target
    if (selectedVendorIds.length > 0) {
      const hasAnyGlobalTarget = effectiveFields.some(f => {
        const targetKey = getChargeTargetKey(f);
        return targetKey && formData[targetKey];
      });
      const vendorsWithoutTarget = selectedVendorIds.filter(vid => {
        const vt = vendorTargets[vid] || {};
        // Any per-vendor value counts: amount targets AND free-text tax
        // demand notes (`<field>_tax`). A round with only tax demands is
        // valid. Bookkeeping keys (_localFields/_excludedFields/_mode)
        // don't count.
        const hasOwnTarget = Object.keys(vt).some(k =>
          k !== '_localFields'
          && k !== '_excludedFields'
          && !k.endsWith('_mode')
          && vt[k] != null && String(vt[k]).trim() !== ''
        );
        return !hasOwnTarget && !hasAnyGlobalTarget;
      });
      if (vendorsWithoutTarget.length > 0) {
        errors.push('Every selected vendor needs at least one target (global or per-vendor).');
      }
    }
    return errors;
  }, [selectedVendorIds, formData, effectiveFields, vendorTargets]);

  const canGoToStep3 = step2Errors.length === 0;

  // Queueing a round requires Step 2 to be valid (vendors + targets), but NOT
  // the end date — the end date is a single value applied to every round in
  // the submission at the moment Send is clicked.
  const canAddToQueue = step2Errors.length === 0;

  // Step 3 holds the end-date pick so submission is gated on it here.
  const step3Errors = useMemo(() => {
    const errors = [];
    if (!formData.end_date) errors.push('Set an end date for the round.');
    return errors;
  }, [formData.end_date]);

  // Is there an in-progress current round (a product picked, or RFQ mode)?
  // When false but the queue is non-empty, the wizard is in "queue-only"
  // state — the buyer cancelled the current selection but can still submit
  // the rounds they already queued.
  const hasCurrentRound = mode === 'rfq' || !!selectedProductId;

  const canSubmit = !!formData.end_date && (
    hasCurrentRound
      ? step2Errors.length === 0
      : queuedRounds.length > 0
  );

  // UTC end date — applied uniformly to every round (queued + current) at
  // submit time. Null when the buyer hasn't picked a date yet.
  const endDateUtc = useMemo(
    () => (formData.end_date ? toUtcEndDate(formData.end_date) : null),
    [formData.end_date]
  );

  const goNext = useCallback(() => {
    if (step === 1 && canGoToStep2) setStep(2);
    else if (step === 2 && canGoToStep3) setStep(3);
  }, [step, canGoToStep2, canGoToStep3]);

  const goBack = useCallback(() => {
    setStep(prev => Math.max(1, prev - 1));
  }, []);

  const goToStep = useCallback((target) => {
    setStep(target);
  }, []);

  const selectAllVendorsExplicit = useCallback(() => {
    // In RFQ mode there's no `selectedProduct` — fall back to every
    // non-regretted vendor in the aggregated price data.
    if (!selectedProduct) {
      const ids = productPriceData.vendors
        .filter(v => v.vendorId && !v.isRegret)
        .map(v => v.vendorId);
      setSelectedVendorIds(ids);
      return;
    }
    const allVendorIds = Array.from(getVendorIdsForProduct(selectedProduct));
    const availableIds = allVendorIds.filter(vid => {
      const priceInfo = productPriceData.vendors.find(vp => vp.vendorId === vid);
      return !priceInfo?.isRegret;
    });
    // Fall back to quotation-derived vendor ids if product_vendors is empty
    const finalIds = availableIds.length > 0
      ? availableIds
      : productPriceData.vendors.filter(v => v.vendorId && !v.isRegret).map(v => v.vendorId);
    setSelectedVendorIds(finalIds);
  }, [selectedProduct, productPriceData]);

  const deselectAllVendors = useCallback(() => setSelectedVendorIds([]), []);

  // Reset everything for the next round, keeping `end_date` since all rounds
  // on the same RFQ usually share the deadline. Mode falls back to 'product'.
  const resetForAnotherProduct = useCallback(() => {
    setStep(1);
    setModeState('product');
    setSelectedProductId(null);
    setSelectedVendorIds([]);
    setVendorTargets({});
    setFormData(prev => ({
      end_date: prev.end_date || '',
      negotiation_fields: [],
    }));
    setEndDateError(false);
    setShowTargetWarning(false);
  }, []);

  // Discard the in-progress current round (not yet queued) and jump straight
  // to the Review step. Used when the buyer backs out of adding another
  // product but still has queued rounds to submit. Same reset as
  // resetForAnotherProduct but lands on Step 3 instead of Step 1.
  const cancelCurrentRound = useCallback(() => {
    setModeState('product');
    setSelectedProductId(null);
    setSelectedVendorIds([]);
    setVendorTargets({});
    setFormData(prev => ({
      end_date: prev.end_date || '',
      negotiation_fields: [],
    }));
    setEndDateError(false);
    setShowTargetWarning(false);
    setStep(3);
  }, []);

  // Build the current Step-3-ready payload. Returns `null` if the wizard
  // doesn't have enough to queue (no vendors / no targets / no product in
  // product mode). Note: end_date is NOT required to build — it's applied at
  // submit time uniformly across every queued round.
  const buildCurrentRoundPayload = useCallback((opts = {}) => {
    if (selectedVendorIds.length === 0) return null;
    if (mode === 'product' && !selectedProduct) return null;

    const vendor_targets = buildVendorTargetsPayload({
      selectedVendorIds,
      vendorTargets,
      effectiveFields,
      formData,
      productPriceData,
    });
    if (vendor_targets.length === 0) return null;

    const endDate = formData.end_date ? toUtcEndDate(formData.end_date) : null;

    if (mode === 'rfq') {
      // RFQ-level entries carry no product id — the backend stores them as an
      // `is_rfq_level` entry inside the single round's products array.
      return {
        payload: {
          end_date: endDate,
          vendor_targets,
          is_rfq_level: true,
        },
        mode: 'rfq',
        productName: 'RFQ-level round',
        summary: {
          vendorCount: selectedVendorIds.length,
          fieldCount: vendor_targets.reduce((acc, v) => Math.max(acc, v.fields.length), 0),
        },
      };
    }

    const details = getProductDetails(selectedProduct);
    return {
      payload: {
        rfq_product_id: parseInt(selectedProduct.id),
        end_date: endDate,
        vendor_targets,
      },
      mode: 'product',
      productName: details.name || `Product ${selectedProduct.id}`,
      summary: {
        vendorCount: selectedVendorIds.length,
        fieldCount: vendor_targets.reduce((acc, v) => Math.max(acc, v.fields.length), 0),
      },
    };
  }, [mode, selectedProduct, selectedVendorIds, vendorTargets, effectiveFields, formData, productPriceData]);

  const addCurrentToQueue = useCallback((opts = {}) => {
    const built = buildCurrentRoundPayload(opts);
    if (!built) return false;
    setQueuedRounds(prev => [
      ...prev,
      {
        ...built.payload,
        mode: built.mode,
        productName: built.productName,
        summary: built.summary,
        // Live wizard-state snapshot so the entry can be restored for editing
        // (the payload above is the flattened submit shape — lossy to reverse).
        // Stripped before POST by the submit loop's explicit field mapping.
        _snapshot: {
          mode,
          selectedProductId,
          selectedVendorIds,
          vendorTargets,
          formData: { ...formData },
        },
      },
    ]);
    resetForAnotherProduct();
    return true;
  }, [buildCurrentRoundPayload, resetForAnotherProduct, mode, selectedProductId, selectedVendorIds, vendorTargets, formData]);

  const removeFromQueue = useCallback((idx) => {
    setQueuedRounds(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Pop a queued round back into the wizard for editing: restore its snapshot
  // as the current round, drop it from the queue, land on Step 2. The shared
  // end date keeps whatever the buyer typed most recently.
  const editQueuedRound = useCallback((idx) => {
    const entry = queuedRounds[idx];
    if (!entry?._snapshot) return false;
    const snap = entry._snapshot;
    setModeState(snap.mode || 'product');
    setSelectedProductId(snap.selectedProductId ?? null);
    setSelectedVendorIds(snap.selectedVendorIds || []);
    setVendorTargets(snap.vendorTargets || {});
    setFormData(prev => ({
      ...snap.formData,
      end_date: prev.end_date || snap.formData?.end_date || '',
    }));
    setEndDateError(false);
    setQueuedRounds(prev => prev.filter((_, i) => i !== idx));
    setStep(2);
    return true;
  }, [queuedRounds]);

  // After a sequential submit fails mid-way, shrink the queue to remove any
  // entries that were already committed to the backend.
  const dropQueuePrefix = useCallback((count) => {
    if (count <= 0) return;
    setQueuedRounds(prev => prev.slice(Math.min(count, prev.length)));
  }, []);

  const clearQueue = useCallback(() => setQueuedRounds([]), []);

  // Product-only queue lookup (the RFQ-level entry has no product id semantic,
  // so it's tracked separately via `hasQueuedRfqRound`).
  const queuedProductIds = useMemo(
    () => new Set(
      queuedRounds
        .filter(r => r.mode !== 'rfq')
        .map(r => Number(r.rfq_product_id))
    ),
    [queuedRounds]
  );

  const hasQueuedRfqRound = useMemo(
    () => queuedRounds.some(r => r.mode === 'rfq'),
    [queuedRounds]
  );

  return {
    // state
    step,
    mode,
    selectedProductId,
    selectedProduct,
    productPriceData,
    aggregatedPriceData,
    selectedVendorIds,
    vendorTargets,
    formData,
    effectiveFields,
    showTargetWarning,
    endDateError,
    step2Errors,
    step3Errors,
    canGoToStep2,
    canGoToStep3,
    canAddToQueue,
    canSubmit,
    hasCurrentRound,
    endDateUtc,
    queuedRounds,
    queuedProductIds,
    hasQueuedRfqRound,
    // mutators
    setMode,
    cancelCurrentRound,
    handleSelectProduct,
    toggleVendor,
    selectAllVendors,
    selectAllVendorsExplicit,
    deselectAllVendors,
    toggleNegotiationField,
    updateFormData,
    setVendorTarget,
    toggleVendorLocalField,
    setVendorTargets,
    setSelectedVendorIds,
    setFormData,
    goNext,
    goBack,
    goToStep,
    setEndDateError,
    buildCurrentRoundPayload,
    addCurrentToQueue,
    removeFromQueue,
    editQueuedRound,
    dropQueuePrefix,
    clearQueue,
    resetForAnotherProduct,
  };
}
