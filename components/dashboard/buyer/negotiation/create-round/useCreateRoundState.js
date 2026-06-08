import { useCallback, useMemo, useState, useEffect } from 'react';
import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import {
  getVendorPriceData,
  isFieldTargetInvalid,
  getVendorIdsForProduct,
  getProductDetails,
  buildVendorTargetsPayload,
  toUtcEndDate,
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

  const productPriceData = useMemo(
    () => (selectedProduct ? getVendorPriceData(selectedProduct) : { vendors: [], l1: null }),
    [selectedProduct]
  );

  // Default to base_price when nothing is picked yet (matches modal).
  const effectiveFields = useMemo(() => {
    return formData.negotiation_fields.length > 0 ? formData.negotiation_fields : ['base_price'];
  }, [formData.negotiation_fields]);

  // Product selection: auto-select all available (non-regretted) vendors so
  // the user can move straight into target entry, same as modal line 456-470.
  // Falls back to quotation-derived vendor ids when product_vendors is empty
  // (some RFQs only carry vendors through quotations).
  const handleSelectProduct = useCallback((productId) => {
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

  // Step gating
  const canGoToStep2 = !!selectedProductId;

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
        const hasOwnTarget = Object.keys(vt).some(k =>
          k !== '_localFields' && !k.endsWith('_mode') && vt[k]
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

  // Step 3 holds the end-date pick so submission is gated on it here.
  const step3Errors = useMemo(() => {
    const errors = [];
    if (!formData.end_date) errors.push('Set an end date for the round.');
    return errors;
  }, [formData.end_date]);

  const canSubmit = step2Errors.length === 0 && step3Errors.length === 0;

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
    if (!selectedProduct) return;
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

  // Reset everything for the next product, keeping `end_date` since all rounds
  // on the same RFQ usually share the deadline.
  const resetForAnotherProduct = useCallback(() => {
    setStep(1);
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

  // Build the current Step-3-ready payload using the same builder used at
  // submission time. Returns `null` if the wizard isn't in a submittable state.
  const buildCurrentRoundPayload = useCallback(() => {
    if (!selectedProduct || !formData.end_date) return null;
    if (selectedVendorIds.length === 0) return null;

    const vendor_targets = buildVendorTargetsPayload({
      selectedVendorIds,
      vendorTargets,
      effectiveFields,
      formData,
      productPriceData,
    });
    if (vendor_targets.length === 0) return null;

    const details = getProductDetails(selectedProduct);
    return {
      payload: {
        rfq_product_id: parseInt(selectedProduct.id),
        end_date: toUtcEndDate(formData.end_date),
        vendor_targets,
      },
      productName: details.name || `Product ${selectedProduct.id}`,
      summary: {
        vendorCount: selectedVendorIds.length,
        fieldCount: vendor_targets.reduce((acc, v) => Math.max(acc, v.fields.length), 0),
      },
    };
  }, [selectedProduct, selectedVendorIds, vendorTargets, effectiveFields, formData, productPriceData]);

  const addCurrentToQueue = useCallback(() => {
    const built = buildCurrentRoundPayload();
    if (!built) return false;
    setQueuedRounds(prev => [
      ...prev,
      {
        ...built.payload,
        productName: built.productName,
        summary: built.summary,
      },
    ]);
    resetForAnotherProduct();
    return true;
  }, [buildCurrentRoundPayload, resetForAnotherProduct]);

  const removeFromQueue = useCallback((idx) => {
    setQueuedRounds(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // After a sequential submit fails mid-way, shrink the queue to remove any
  // entries that were already committed to the backend.
  const dropQueuePrefix = useCallback((count) => {
    if (count <= 0) return;
    setQueuedRounds(prev => prev.slice(Math.min(count, prev.length)));
  }, []);

  const clearQueue = useCallback(() => setQueuedRounds([]), []);

  const queuedProductIds = useMemo(
    () => new Set(queuedRounds.map(r => Number(r.rfq_product_id))),
    [queuedRounds]
  );

  return {
    // state
    step,
    selectedProductId,
    selectedProduct,
    productPriceData,
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
    canSubmit,
    queuedRounds,
    queuedProductIds,
    // mutators
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
    dropQueuePrefix,
    clearQueue,
    resetForAnotherProduct,
  };
}
