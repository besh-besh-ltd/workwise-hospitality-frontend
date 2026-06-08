import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Check, Plus, X } from 'lucide-react';
import { getQuoteComparison } from '@/services/pricing';
import { createNegotiationRound, getAllActiveNegotiationRounds, getQuoteApprovalStatus } from '@/services/negotiation';
import { getChargeNames } from '@/services/rfq';
import useCreateRoundState from './useCreateRoundState';
import StepProduct from './StepProduct';
import StepVendorsAndTargets from './StepVendorsAndTargets';
import StepReview from './StepReview';
import { getProductDetails, getProductRoundStatus } from './negotiationHelpers';
import styles from './CreateRound.module.scss';

const STEPS = [
  { idx: 1, label: 'Product' },
  { idx: 2, label: 'Vendors & targets' },
  { idx: 3, label: 'Review' },
];

const CreateRoundPage = () => {
  const router = useRouter();
  const { rfqId: rawRfqId, preSelectProductId } = router.query;
  const rfqId = useMemo(() => {
    if (!rawRfqId) return null;
    const n = parseInt(rawRfqId);
    return Number.isFinite(n) ? n : null;
  }, [rawRfqId]);

  const [products, setProducts] = useState([]);
  const [quoteApprovalStatuses, setQuoteApprovalStatuses] = useState({});
  const [chargeNamesList, setChargeNamesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // Sequential-submit progress. Null when idle; otherwise `{ index, total }`.
  const [submitProgress, setSubmitProgress] = useState(null);
  const submitting = submitProgress != null;
  const [queueExpanded, setQueueExpanded] = useState(false);

  const wizard = useCreateRoundState({
    products,
    preSelectedProductId: preSelectProductId ? Number(preSelectProductId) : null,
  });

  // Load RFQ products + active rounds + charge names
  useEffect(() => {
    if (!router.isReady || !rfqId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [qcRes, activeRoundsRes, chargesRes] = await Promise.all([
          getQuoteComparison(rfqId).catch(() => null),
          getAllActiveNegotiationRounds(rfqId).catch(() => null),
          getChargeNames().catch(() => null),
        ]);

        if (cancelled) return;

        const productList = qcRes?.data?.products || qcRes?.products || [];
        const activeRounds = activeRoundsRes?.data || (Array.isArray(activeRoundsRes) ? activeRoundsRes : []);
        const charges = chargesRes?.data || chargesRes || [];

        // Stitch active_round into each product so eligibility logic matches the modal
        const activeByProduct = {};
        (Array.isArray(activeRounds) ? activeRounds : []).forEach(r => {
          if (r?.rfq_product_id != null) activeByProduct[r.rfq_product_id] = r;
        });
        const stitched = productList.map(p => ({
          ...p,
          active_round: p.active_round || activeByProduct[p.id] || null,
        }));

        setProducts(stitched);
        setChargeNamesList(Array.isArray(charges) ? charges : []);

        // Fetch quote approval statuses per product (parallel)
        const statuses = {};
        await Promise.all(stitched.map(async (product) => {
          try {
            const res = await getQuoteApprovalStatus(product.id);
            if (res?.status === 1 && res?.data?.approval_instance) {
              statuses[product.id] = res.data.approval_instance;
            }
          } catch { /* product may have no instance — that's fine */ }
        }));
        if (!cancelled) setQuoteApprovalStatuses(statuses);
      } catch (err) {
        console.error('CreateRoundPage load error:', err);
        if (!cancelled) setLoadError(err?.message || 'Failed to load RFQ data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [router.isReady, rfqId]);

  // Eligible products on Step 1's terms: not approved, not in active round,
  // has quotes — minus anything already queued. Used to gate "+ Add More
  // Product" so the user can't queue when there's nothing else to do.
  const eligibleAfterQueue = useMemo(() => {
    return products.filter(p => {
      if (wizard.queuedProductIds?.has(Number(p.id))) return false;
      return !getProductRoundStatus(p, quoteApprovalStatuses).isDisabled;
    });
  }, [products, quoteApprovalStatuses, wizard.queuedProductIds]);

  // Other-than-current eligible count. Drives the +Add More button.
  const otherEligibleCount = useMemo(() => {
    if (!wizard.selectedProductId) return eligibleAfterQueue.length;
    return eligibleAfterQueue.filter(p => String(p.id) !== String(wizard.selectedProductId)).length;
  }, [eligibleAfterQueue, wizard.selectedProductId]);

  const handleCancel = () => {
    if (wizard.queuedRounds.length > 0) {
      const ok = window.confirm(
        `You have ${wizard.queuedRounds.length} round(s) queued. They will be discarded if you leave. Continue?`
      );
      if (!ok) return;
    }
    if (rfqId) {
      router.push(`/dashboard/buyer/quote-compare?rfq=${rfqId}&tab=product`);
    } else {
      router.back();
    }
  };

  const handleAddMoreProduct = () => {
    if (!wizard.canSubmit || !wizard.selectedProduct) {
      if (!wizard.formData.end_date) wizard.setEndDateError(true);
      toast.error('Complete the current round before adding another product.');
      return;
    }
    const ok = wizard.addCurrentToQueue();
    if (!ok) {
      toast.error('Nothing to queue — check the current round.');
      return;
    }
    setQueueExpanded(false);
    toast.success('Round added to queue');
  };

  const handleSendForApproval = async () => {
    if (!wizard.canSubmit || !wizard.selectedProduct) {
      if (!wizard.formData.end_date) wizard.setEndDateError(true);
      toast.error('Please complete the current round before submitting.');
      return;
    }
    const built = wizard.buildCurrentRoundPayload();
    if (!built) {
      toast.error('No vendor targets to submit. Please set at least one target.');
      return;
    }
    const all = [
      ...wizard.queuedRounds.map(r => ({
        rfq_product_id: r.rfq_product_id,
        end_date: r.end_date,
        vendor_targets: r.vendor_targets,
      })),
      built.payload,
    ];

    let committed = 0;
    for (let i = 0; i < all.length; i++) {
      setSubmitProgress({ index: i + 1, total: all.length });
      try {
        await createNegotiationRound({ rfq_id: rfqId, ...all[i] });
        committed++;
      } catch (error) {
        console.error('Create round error:', error);
        // Anything submitted before this point is already on the server —
        // shrink the local queue so a retry doesn't double-submit.
        const submittedFromQueue = Math.min(committed, wizard.queuedRounds.length);
        wizard.dropQueuePrefix(submittedFromQueue);
        toast.error(
          `Submitted ${committed} of ${all.length}. Round ${i + 1} failed: ${error?.message || 'unknown error'}`
        );
        setSubmitProgress(null);
        return;
      }
    }

    setSubmitProgress(null);
    wizard.clearQueue();
    toast.success(
      all.length === 1
        ? 'Negotiation round created successfully'
        : `All ${all.length} negotiation rounds created`
    );
    router.push(`/dashboard/buyer/quote-compare?rfq=${rfqId}&tab=product`);
  };

  const onPrimaryClick = () => {
    if (wizard.step === 3) handleSendForApproval();
    else wizard.goNext();
  };

  const primaryDisabled = useMemo(() => {
    if (submitting) return true;
    if (wizard.step === 1) return !wizard.canGoToStep2;
    if (wizard.step === 2) return !wizard.canGoToStep3;
    if (wizard.step === 3) return !wizard.canSubmit;
    return false;
  }, [wizard.step, wizard.canGoToStep2, wizard.canGoToStep3, wizard.canSubmit, submitting]);

  const totalRoundsForSubmit = wizard.queuedRounds.length + 1;
  const primaryLabel = wizard.step === 3
    ? (submitting
        ? `Sending ${submitProgress.index} of ${submitProgress.total}…`
        : `Send for approval${wizard.queuedRounds.length > 0 ? ` (${totalRoundsForSubmit})` : ''}`)
    : 'Next';

  // +Add More Product gating
  const addMoreDisabled = submitting || !wizard.canSubmit || otherEligibleCount < 1;
  const addMoreTooltip = otherEligibleCount < 1
    ? 'No other eligible products left to add to this submission.'
    : (!wizard.canSubmit ? 'Complete the current round first.' : 'Add this round to the queue and pick another product.');

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageInner}>
          <div className={styles.fullLoader}>
            <Spinner animation="border" />
            <span>Loading RFQ data…</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !rfqId) {
    return (
      <div className={styles.page}>
        <div className={styles.pageInner}>
          <section className={styles.card}>
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Unable to load this RFQ</p>
              <p className={styles.emptySub}>
                {loadError || 'Invalid RFQ id. Please return to Quote Compare and try again.'}
              </p>
              <div style={{ marginTop: 16 }}>
                <button type="button" className={styles.btnSecondary} onClick={handleCancel}>
                  Back to Quote Compare
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const selectedDetails = wizard.selectedProduct
    ? getProductDetails(wizard.selectedProduct)
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <header className={styles.header}>
          <div className={styles.headerTopRow}>
            <div>
              <p className={styles.eyebrow}>New negotiation round</p>
              <h1 className={styles.title}>Create a round</h1>
              <p className={styles.subtitle}>
                Pick a product, choose the fields to improve, set targets per vendor, then send it for approval.
              </p>
            </div>
            {wizard.queuedRounds.length > 0 && (
              <div className={styles.queueChipWrap}>
                <button
                  type="button"
                  className={styles.queueChip}
                  onClick={() => setQueueExpanded(v => !v)}
                  aria-expanded={queueExpanded}
                >
                  Queue ({wizard.queuedRounds.length})
                  <span className={styles.queueChipCaret}>{queueExpanded ? '▴' : '▾'}</span>
                </button>
                {queueExpanded && (
                  <ul className={styles.queueList}>
                    {wizard.queuedRounds.map((r, idx) => (
                      <li key={`${r.rfq_product_id}-${idx}`} className={styles.queueListItem}>
                        <span className={styles.queueListName} title={r.productName}>
                          {r.productName}
                        </span>
                        <span className={styles.queueListMeta}>
                          {r.summary?.vendorCount || 0} vendor{r.summary?.vendorCount === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          className={styles.queueListRemove}
                          onClick={() => wizard.removeFromQueue(idx)}
                          aria-label={`Remove ${r.productName} from queue`}
                          disabled={submitting}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </header>

        <div className={styles.stepper} role="list">
          {STEPS.map((s, i) => {
            const isActive = wizard.step === s.idx;
            const isDone = wizard.step > s.idx;
            const clickable = isDone; // only past steps can be revisited; forward gated by validation
            return (
              <React.Fragment key={s.idx}>
                <div
                  role="listitem"
                  className={`${styles.stepperItem} ${clickable ? styles.stepperItemClickable : ''}`}
                  onClick={() => {
                    if (s.idx < wizard.step) wizard.goToStep(s.idx);
                  }}
                >
                  <span
                    className={`${styles.stepperBadge} ${isActive ? styles.stepperBadgeActive : ''} ${isDone ? styles.stepperBadgeDone : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isDone ? <Check size={14} strokeWidth={3} /> : s.idx}
                  </span>
                  <span className={`${styles.stepperLabel} ${isActive ? styles.stepperLabelActive : ''}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <span className={styles.stepperConnector} />}
              </React.Fragment>
            );
          })}
        </div>

        {wizard.step === 1 && (
          <StepProduct
            products={products}
            quoteApprovalStatuses={quoteApprovalStatuses}
            queuedProductIds={wizard.queuedProductIds}
            selectedProductId={wizard.selectedProductId}
            onSelectProduct={wizard.handleSelectProduct}
          />
        )}

        {wizard.step === 2 && wizard.selectedProduct && (
          <StepVendorsAndTargets
            product={wizard.selectedProduct}
            productPriceData={wizard.productPriceData}
            selectedVendorIds={wizard.selectedVendorIds}
            onVendorToggle={wizard.toggleVendor}
            onSelectAllVendors={wizard.selectAllVendorsExplicit}
            onDeselectAllVendors={wizard.deselectAllVendors}
            vendorTargets={wizard.vendorTargets}
            setVendorTargets={wizard.setVendorTargets}
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
            toggleNegotiationField={wizard.toggleNegotiationField}
            showTargetWarning={wizard.showTargetWarning}
            step2Errors={wizard.step2Errors}
            chargeNamesList={chargeNamesList}
          />
        )}

        {wizard.step === 3 && wizard.selectedProduct && (
          <StepReview
            product={wizard.selectedProduct}
            productPriceData={wizard.productPriceData}
            selectedVendorIds={wizard.selectedVendorIds}
            vendorTargets={wizard.vendorTargets}
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
            effectiveFields={wizard.effectiveFields}
            products={products}
            queuedRounds={wizard.queuedRounds}
            endDateError={wizard.endDateError}
            step3Errors={wizard.step3Errors}
            onEditProduct={() => wizard.goToStep(1)}
            onEditVendors={() => wizard.goToStep(2)}
            onRemoveQueuedRound={wizard.removeFromQueue}
            chargeNamesList={chargeNamesList}
          />
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerStepInfo}>
            <span><span className={styles.footerStepNum}>Step {wizard.step} of 3</span></span>
            {selectedDetails && (
              <span className={styles.footerProductTag} title={selectedDetails.name}>
                {selectedDetails.name}
              </span>
            )}
          </div>
          <div className={styles.footerActions}>
            {wizard.step > 1 && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={wizard.goBack}
                disabled={submitting}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className={styles.btnGhost}
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            {wizard.step === 3 && (
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="add-more-product-tooltip">{addMoreTooltip}</Tooltip>}
              >
                <span className="d-inline-block">
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={handleAddMoreProduct}
                    disabled={addMoreDisabled}
                    style={addMoreDisabled ? { pointerEvents: 'none' } : undefined}
                  >
                    <Plus size={14} strokeWidth={2.5} style={{ marginRight: 4, verticalAlign: -2 }} />
                    Add More Product
                  </button>
                </span>
              </OverlayTrigger>
            )}
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onPrimaryClick}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CreateRoundPage;
