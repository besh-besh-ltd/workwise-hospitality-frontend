import React, { useState, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import { TrendingDown, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import ApprovalWorkflowSection from '../approval/ApprovalWorkflowSection';
import { approveNegotiationRound, rejectNegotiationRound } from '@/services/negotiation';
import { formatDisplayDate } from "@/utils/sharedFunctions";
import ProcessScopeErrorBanner from "@/components/shared/ProcessScopeErrorBanner";
import styles from './NegotiationUI.module.scss';

const STATUS_LABELS = {
  PENDING_APPROVAL: 'Pending Approval',
  ACTIVE: 'Active',
  ENDED: 'Ended',
  EXPIRED: 'Expired',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const NegotiationWorkflowModal = ({
  show,
  onHide,
  round,
  products = [],
  hospitalityCompanyId,
  hotelId,
  departmentId,
  onActionComplete
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [showAllVendors, setShowAllVendors] = useState(false);
  // Typed-code error from the backend (PROCESS_NOT_IN_USER_SCOPE,
  // NO_APPROVAL_POLICY_FOR_PROCESS). Surfaces via ProcessScopeErrorBanner.
  const [scopeError, setScopeError] = useState(null);

  // Extract vendor data from products for this round
  const { productName, productQty, productUnit, vendorsInRound, l1Price } = useMemo(() => {
    if (!round) return { productName: '', productQty: '', productUnit: '', vendorsInRound: [], l1Price: null };

    const product = products.find(p => String(p.id) === String(round.rfq_product_id));
    const details = product?.product_details?.[0] || {};
    const rfqDetails = details?.rfq_details || [];
    const name = round.product_name || details?.product_name || details?.name || `Product ${round.rfq_product_id}`;
    const qty = rfqDetails.find(d => d.title === 'Quantity')?.value || '';
    const unit = rfqDetails.find(d => d.title === 'Unit')?.value || '';

    const roundVendorIds = (round.vendor_ids || []).map(Number);
    const quotations = product?.quotations || [];
    const productVendors = product?.product_vendors || [];

    const vendors = roundVendorIds.map(vid => {
      const pv = productVendors.find(v => Number(v.id || v.user_id) === vid);
      const vendorName = pv
        ? (pv.organization_name || pv.company_name || pv.name || pv.email || 'Unknown Vendor')
        : 'Unknown Vendor';

      const matchedQuote = quotations.find(q => {
        const vd = q.quote_details?.vendor_details;
        const qVid = Number(vd?.id || vd?.user_id || q.vendor_id || q.created_by);
        return qVid === vid;
      });

      return {
        id: vid,
        name: vendorName,
        totalPrice: parseFloat(matchedQuote?.total_price || 0),
        unitPrice: parseFloat(matchedQuote?.unit_price || 0),
      };
    }).sort((a, b) => a.totalPrice - b.totalPrice);

    const lowest = vendors.length > 0 ? vendors[0].totalPrice : null;

    return { productName: name, productQty: qty, productUnit: unit, vendorsInRound: vendors, l1Price: lowest };
  }, [round, products]);

  if (!round) return null;

  const captureScopeError = (error) => {
    const payload = error?.response?.data || error?.data || error;
    if (payload?.code) {
      setScopeError(payload);
      return true;
    }
    return false;
  };

  const handleApprove = async (comment) => {
    setSubmitting(true);
    setScopeError(null);
    try {
      await approveNegotiationRound(round.id);
      return { success: true };
    } catch (error) {
      captureScopeError(error);
      return { success: false, error: error.message || 'Failed to approve' };
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (comment) => {
    setSubmitting(true);
    setScopeError(null);
    try {
      await rejectNegotiationRound(round.id, comment);
      return { success: true };
    } catch (error) {
      captureScopeError(error);
      return { success: false, error: error.message || 'Failed to reject' };
    } finally {
      setSubmitting(false);
    }
  };

  const targetPrice = parseFloat(round.target_price || 0);
  const statusLabel = STATUS_LABELS[round.status] || round.status;

  // Target vs quoted comparison: green down = buyer negotiating lower (good), red up = target exceeds quote
  const getTargetIndicator = (quotedPrice) => {
    if (!quotedPrice || quotedPrice === 0 || targetPrice === 0) return { tone: 'neutral' };
    if (targetPrice < quotedPrice) return { tone: 'down' };
    if (targetPrice > quotedPrice) return { tone: 'up' };
    return { tone: 'neutral' };
  };

  const headerIndicator = getTargetIndicator(l1Price);
  const targetValueClass = headerIndicator.tone === 'down' ? styles.wfInfoValueGreen
    : headerIndicator.tone === 'up' ? styles.wfInfoValueRed : '';

  return (
    <Modal show={show} onHide={onHide} size="lg" centered dialogClassName={styles.negotiationModalDialog}>
      <Modal.Header className={styles.modalHeader}>
        <div className={styles.modalTitleWrap}>
          <h5 className={styles.modalTitle}>
            Negotiation Round {round.round_number} - Approval Workflow
          </h5>
          <p className={styles.modalSubtitle}>
            {productName}{productQty ? ` \u00b7 ${productQty} ${productUnit}` : ''}
          </p>
        </div>
        <button type="button" className={styles.modalCloseBtn} onClick={onHide} aria-label="Close">
          ✕
        </button>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {/* Typed-error banner — surfaces scope / missing-policy errors raised
            by approve/reject so the user sees a structured explanation and (for
            admins) a deep link to fix the policy configuration. */}
        <ProcessScopeErrorBanner error={scopeError} onDismiss={() => setScopeError(null)} />
        {/* Round Info Card */}
        <div className={styles.wfInfoCard}>
          <div className={styles.wfInfoGrid}>
            <div className={styles.wfInfoItem}>
              <p className={styles.wfInfoLabel}>Target Price</p>
              <p className={`${styles.wfInfoValue} ${targetValueClass}`}>
                ₹{targetPrice.toLocaleString('en-IN')}
                {headerIndicator.tone === 'down' && (
                  <TrendingDown size={14} strokeWidth={2.5} className={styles.wfTrendDown} />
                )}
                {headerIndicator.tone === 'up' && (
                  <TrendingUp size={14} strokeWidth={2.5} className={styles.wfTrendUp} />
                )}
              </p>
            </div>
            {l1Price != null && l1Price > 0 && (
              <div className={styles.wfInfoItem}>
                <p className={styles.wfInfoLabel}>{vendorsInRound.length > 1 ? 'L1 Quote' : 'Quoted Price'}</p>
                <p className={styles.wfInfoValue}>₹{l1Price.toLocaleString('en-IN')}</p>
              </div>
            )}
            <div className={styles.wfInfoItem}>
              <p className={styles.wfInfoLabel}>End Date</p>
              <p className={styles.wfInfoValue} style={{ fontSize: '0.82rem' }}>
                {round.end_date ? formatDisplayDate(round.end_date, { includeTime: true }) : 'N/A'}
              </p>
            </div>
            <div className={styles.wfInfoItem}>
              <p className={styles.wfInfoLabel}>Status</p>
              <p className={styles.wfInfoValue} style={{ fontSize: '0.82rem' }}>{statusLabel}</p>
            </div>
          </div>
          {round.created_by_name && (
            <p className={styles.wfCreatedBy}>
              Created by <strong>{round.created_by_name}</strong>
            </p>
          )}
        </div>

        {/* Vendors in this Round */}
        {vendorsInRound.length > 0 && (
          <div className={styles.wfVendorSection}>
            <p className={styles.wfSectionLabel}>
              Vendors in this Round ({vendorsInRound.length})
            </p>
            <div className={styles.wfVendorList}>
              {(showAllVendors ? vendorsInRound : vendorsInRound.slice(0, 3)).map((vendor) => {
                const indicator = getTargetIndicator(vendor.totalPrice);
                return (
                  <div key={vendor.id} className={styles.wfVendorRow}>
                    <div>
                      <span className={styles.wfVendorName}>{vendor.name}</span>
                      {vendor.unitPrice > 0 && (
                        <span className={styles.wfVendorUnit}>
                          (₹{vendor.unitPrice.toLocaleString('en-IN')}/{productUnit || 'unit'})
                        </span>
                      )}
                    </div>
                    <div className={styles.wfVendorPrice}>
                      {vendor.totalPrice > 0 && (
                        <span className={styles.wfVendorPriceValue}>
                          ₹{vendor.totalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                      {vendor.totalPrice > 0 && indicator.tone !== 'neutral' && (
                        <span className={styles.wfTrendIcon}>
                          {indicator.tone === 'down' && <TrendingDown size={12} strokeWidth={2.5} className={styles.wfTrendDown} />}
                          {indicator.tone === 'up' && <TrendingUp size={12} strokeWidth={2.5} className={styles.wfTrendUp} />}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {vendorsInRound.length > 3 && (
                <button
                  type="button"
                  className={styles.wfLoadMoreBtn}
                  onClick={() => setShowAllVendors(prev => !prev)}
                >
                  {showAllVendors ? (
                    <><ChevronUp size={13} strokeWidth={2} /> Show less</>
                  ) : (
                    <><ChevronDown size={13} strokeWidth={2} /> {vendorsInRound.length - 3} more vendor{vendorsInRound.length - 3 > 1 ? 's' : ''}</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        <ApprovalWorkflowSection
          entityType="NEGOTIATION"
          entityId={round.id}
          allEntityIds={[round.id, round.rfq_product_id].filter(Boolean)}
          entityLabel={`Negotiation Round ${round.round_number}`}
          hospitalityCompanyId={hospitalityCompanyId}
          hotelId={hotelId}
          departmentId={departmentId}
          onCustomApprove={handleApprove}
          onCustomReject={handleReject}
          onActionComplete={() => {
            onHide();
            if (onActionComplete) onActionComplete();
          }}
        />
      </Modal.Body>
    </Modal>
  );
};

export default NegotiationWorkflowModal;
