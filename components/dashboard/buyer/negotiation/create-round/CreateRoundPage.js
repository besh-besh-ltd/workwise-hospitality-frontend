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
  // Cancel confirmation modal — opened only when there are queued rounds to
  // protect, offering "cancel whole" vs "cancel this selection, keep queue".
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

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

  // RFQ-level meta for the Step 1 card. Field count = static RFQ-level slugs
  // (payment_terms, global_comment, documents) + any is_global charge slug
  // from the charge registry. Vendor count = unique vendors who quoted any
  // product on the RFQ.
  const rfqFieldCount = useMemo(() => {
    const slugs = new Set(['payment_terms', 'global_comment', 'documents']);
    chargeNamesList.forEach(c => {
      if (c.is_global) slugs.add(c.slug || c.name);
    });
    return slugs.size;
  }, [chargeNamesList]);

  const rfqVendorCount = useMemo(
    () => (wizard.aggregatedPriceData?.vendors || []).filter(v => v.vendorId && !v.isRegret).length,
    [wizard.aggregatedPriceData]
  );

  // Can the user still queue another round? Three signals: there's an
  // eligible product the buyer hasn't already queued, OR they can still add
  // an RFQ-level round (only one allowed per submission).
  const canQueueMore = otherEligibleCount > 0 || (!wizard.hasQueuedRfqRound && wizard.mode !== 'rfq');

  const exitWizard = () => {
    if (rfqId) {
      router.push(`/dashboard/buyer/quote-compare?rfq=${rfqId}&tab=product`);
    } else {
      router.back();
    }
  };

  const handleCancel = () => {
    // With queued rounds, offer a choice: drop everything, or just drop the
    // current in-progress selection and continue with what's queued.
    if (wizard.queuedRounds.length > 0) {
      setCancelModalOpen(true);
      return;
    }
    exitWizard();
  };

  // Modal option 1 — discard everything and leave the wizard.
  const handleCancelWhole = () => {
    setCancelModalOpen(false);
    wizard.clearQueue();
    exitWizard();
  };

  // Modal option 2 — discard the current selection (if any) and return to
  // the Review step with the queued rounds intact. Works from any step:
  // cancelCurrentRound resets the in-progress state and lands on Step 3.
  const handleContinueWithQueued = () => {
    setCancelModalOpen(false);
    wizard.cancelCurrentRound();
    setQueueExpanded(false);
    toast.info('Continuing with your queued rounds.');
  };

  const handleAddMoreProduct = () => {
    // Queue-only review (current selection was cancelled) — nothing to queue,
    // just go pick another product/RFQ.
    if (!wizard.hasCurrentRound) {
      wizard.goToStep(1);
      setQueueExpanded(false);
      return;
    }
    // Queueing only needs Step 2 valid (vendors + targets). End date is
    // collected once and applied at submit time.
    if (!wizard.canAddToQueue) {
      toast.error('Pick vendors and set at least one target before adding the round.');
      return;
    }
    const ok = wizard.addCurrentToQueue({ quoteApprovalStatuses });
    if (!ok) {
      toast.error('Nothing to queue — check the current round.');
      return;
    }
    setQueueExpanded(false);
    toast.success('Round added to queue');
  };

  // Pull a queued round back into the wizard for editing. If another round is
  // currently in progress, park it in the queue first (when valid) so no work
  // is lost; if it isn't valid yet, ask the buyer to finish or discard it.
  const handleEditQueuedRound = (idx) => {
    if (wizard.hasCurrentRound) {
      if (!wizard.canAddToQueue) {
        toast.error('Finish or cancel your current selection before editing a queued round.');
        return;
      }
      const queued = wizard.addCurrentToQueue({ quoteApprovalStatuses });
      if (!queued) {
        toast.error('Could not park the current round — check its targets.');
        return;
      }
    }
    const ok = wizard.editQueuedRound(idx);
    if (!ok) toast.error('This round can’t be edited — remove and re-add it instead.');
  };

  const handleSendForApproval = async () => {
    if (!wizard.canSubmit) {
      if (!wizard.formData.end_date) wizard.setEndDateError(true);
      toast.error('Please complete the round before submitting.');
      return;
    }

    // Build the current round's payload only when there's a current selection.
    // In "queue-only" state (the buyer cancelled their current selection but
    // kept the queue) we submit exactly what's queued.
    let currentPayload = null;
    if (wizard.hasCurrentRound) {
      const built = wizard.buildCurrentRoundPayload({ quoteApprovalStatuses });
      if (!built) {
        toast.error('No vendor targets to submit. Please set at least one target.');
        return;
      }
      currentPayload = built.payload;
    } else if (wizard.queuedRounds.length === 0) {
      toast.error('Nothing to submit.');
      return;
    }

    // ONE round for the whole submission: every queued entry plus the current
    // selection becomes a products[] entry on a single POST. One approval,
    // one email, the vendor updates all covered products at once.
    const toEntry = (r) => (r.mode === 'rfq' || r.is_rfq_level
      ? { is_rfq_level: true, vendor_targets: r.vendor_targets }
      : { rfq_product_id: r.rfq_product_id, vendor_targets: r.vendor_targets });
    const products = [
      ...wizard.queuedRounds.map(toEntry),
      ...(currentPayload ? [toEntry(currentPayload)] : []),
    ];

    const sharedEndDate = currentPayload?.end_date || wizard.endDateUtc;

    setSubmitProgress({ index: 1, total: 1 });
    try {
      await createNegotiationRound({
        rfq_id: rfqId,
        end_date: sharedEndDate,
        products,
      });
    } catch (error) {
      console.error('Create round error:', error);
      // Single transaction — nothing was committed, queue stays intact.
      toast.error(`Failed to create the negotiation round: ${error?.message || 'unknown error'}`);
      setSubmitProgress(null);
      return;
    }

    setSubmitProgress(null);
    wizard.clearQueue();
    toast.success(
      products.length === 1
        ? 'Negotiation round created successfully'
        : `Negotiation round created covering ${products.length} item(s)`
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

  const totalRoundsForSubmit = wizard.queuedRounds.length + (wizard.hasCurrentRound ? 1 : 0);
  const primaryLabel = wizard.step === 3
    ? (submitting
        ? 'Sending…'
        : `Send for approval${totalRoundsForSubmit > 1 ? ` (${totalRoundsForSubmit})` : ''}`)
    : 'Next';

  // +Add More gating. RFQ mode adds a second axis: the RFQ-level slot is
  // single-use, so once it's queued there's no "another RFQ" to add — only
  // remaining products count. Queueing only needs Step 2 valid (end date is
  // applied later at submit time).
  // In queue-only review there's no current round to complete, so the
  // canAddToQueue gate only applies when a current round exists.
  const addMoreDisabled = submitting
    || !canQueueMore
    || (wizard.hasCurrentRound && !wizard.canAddToQueue);
  const addMoreTooltip = !canQueueMore
    ? (wizard.hasQueuedRfqRound && otherEligibleCount < 1
        ? 'RFQ-level round queued and no other eligible products to add.'
        : 'No other eligible rounds left to add to this submission.')
    : (wizard.hasCurrentRound && !wizard.canAddToQueue
        ? 'Pick vendors and set at least one target before adding this round.'
        : 'Add another round to this submission.');

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
            // Step 2 has no content without a current round (queue-only state),
            // so it isn't a valid revisit target then.
            const isDeadStep = s.idx === 2 && !wizard.hasCurrentRound;
            const clickable = isDone && !isDeadStep;
            return (
              <React.Fragment key={s.idx}>
                <div
                  role="listitem"
                  className={`${styles.stepperItem} ${clickable ? styles.stepperItemClickable : ''}`}
                  onClick={() => {
                    if (s.idx < wizard.step && clickable) wizard.goToStep(s.idx);
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
            mode={wizard.mode}
            onSelectRfqMode={() => wizard.setMode('rfq')}
            hasQueuedRfqRound={wizard.hasQueuedRfqRound}
            rfqFieldCount={rfqFieldCount}
            rfqVendorCount={rfqVendorCount}
          />
        )}

        {wizard.step === 2 && (wizard.selectedProduct || wizard.mode === 'rfq') && (
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
            mode={wizard.mode}
          />
        )}

        {wizard.step === 3 && (wizard.selectedProduct || wizard.mode === 'rfq' || wizard.queuedRounds.length > 0) && (
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
            onEditQueuedRound={handleEditQueuedRound}
            chargeNamesList={chargeNamesList}
            mode={wizard.mode}
          />
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerStepInfo}>
            <span><span className={styles.footerStepNum}>Step {wizard.step} of 3</span></span>
            {wizard.mode === 'rfq' && (
              <span className={styles.footerProductTag} title="RFQ-level fields">
                RFQ-level fields
              </span>
            )}
            {wizard.mode !== 'rfq' && selectedDetails && (
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
                onClick={() => {
                  // Queue-only review has no current round, so Step 2 is empty —
                  // Back jumps to the product picker instead.
                  if (wizard.step === 3 && !wizard.hasCurrentRound) wizard.goToStep(1);
                  else wizard.goBack();
                }}
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

      {cancelModalOpen && (
        <div
          className={styles.cancelModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-negotiation-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCancelModalOpen(false);
          }}
        >
          <div className={styles.cancelModal}>
            <button
              type="button"
              className={styles.cancelModalClose}
              onClick={() => setCancelModalOpen(false)}
              aria-label="Close"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
            <h3 id="cancel-negotiation-title" className={styles.cancelModalTitle}>
              Cancel negotiation?
            </h3>
            <p className={styles.cancelModalBody}>
              You have <strong>{wizard.queuedRounds.length}</strong> round
              {wizard.queuedRounds.length === 1 ? '' : 's'} queued. You can keep
              {wizard.queuedRounds.length === 1 ? ' it' : ' them'} and review, or
              discard everything.
            </p>
            <div className={styles.cancelModalActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleContinueWithQueued}
              >
                Continue with queued products
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleCancelWhole}
              >
                Cancel the whole negotiation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRoundPage;
