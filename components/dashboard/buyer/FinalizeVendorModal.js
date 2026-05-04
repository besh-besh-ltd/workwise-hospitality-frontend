import React from 'react';
import { Modal } from 'react-bootstrap';
import { addCommasToNumber, formatDisplayDate } from '@/utils/sharedFunctions';
import styles from './FinalizeVendorModal.module.scss';

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `Rs. ${addCommasToNumber(Math.round(Number(n)))}`;
};

const formatDateTime = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const FinalizeVendorModal = ({
  show,
  onHide,
  onConfirm,
  vendorName,
  vendorDetails,
  vendorId,
  quotedPrice,
  productDetails,
  alreadyFinalized,
  availableBudget,
  rfqId,
  loading = false,
  vendorRejections = [],
  finalizationHistory = [],
}) => {
  const isReFinalize = Array.isArray(alreadyFinalized) && alreadyFinalized.length > 0;
  const productName = productDetails?.[0]?.product_name || '—';
  const quoted = Number(quotedPrice) || 0;

  const totalBudget = Number(availableBudget?.total_budget) || 0;
  const available = Number(availableBudget?.available_budget) || 0;
  const remaining = available - quoted;
  const showBudget = totalBudget > 0;
  const overBudget = showBudget && remaining < 0;

  // Re-finalize-of-rejected: this vendor previously had a PO rejected (either
  // by themselves or by an internal approver). Switch to warning treatment so
  // the buyer doesn't repeat a known-failing path without intent.
  const targetVendorIdStr = vendorId != null ? String(vendorId) : null;
  const vendorRejectionEntries = (Array.isArray(vendorRejections) ? vendorRejections : [])
    .filter((r) => targetVendorIdStr && String(r.vendor_id) === targetVendorIdStr);
  const isRejectedVendor = vendorRejectionEntries.length > 0;
  // Backend orders DESC by rejected_at, so [0] is the latest event.
  const latestRejection = vendorRejectionEntries[0] || null;
  const wasApproverRejection = latestRejection?.rejection_type === 'approver';

  // Prior finalization records for this vendor — surfaced under the warning
  // so the buyer sees when this vendor was last picked + by whom.
  const vendorPriorFinalizations = (Array.isArray(finalizationHistory) ? finalizationHistory : [])
    .filter((entry) => targetVendorIdStr && String(entry.vendor_id) === targetVendorIdStr)
    .slice(0, 3);

  const isWarning = isRejectedVendor;

  const steps = [
    { label: 'Vendor finalized', hint: 'Selected for this product' },
    { label: 'Approval routing', hint: 'Goes through configured approvers' },
    { label: 'Purchase Order', hint: 'PO drafted on full approval' },
  ];

  const titleText = isWarning
    ? 'Re-finalize a previously-rejected vendor?'
    : isReFinalize
      ? 'Re-finalize this vendor?'
      : 'Confirm finalization';

  const subtitleText = isWarning
    ? `This vendor's last Purchase Order ${wasApproverRejection ? 'was rejected by an internal approver' : 'was rejected by the vendor'}. Picking them again will start a fresh approval cycle that could fail the same way unless the underlying reason has been addressed.`
    : isReFinalize
      ? 'Changing the finalized vendor will discard the current draft Purchase Order and restart approvals from the first step.'
      : 'This locks the selected vendor for this product and starts the Purchase Order approval workflow.';

  const ctaText = loading
    ? null
    : isWarning
      ? 'Yes, re-finalize anyway'
      : isReFinalize
        ? 'Re-finalize vendor'
        : 'Confirm finalization';

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="md"
      contentClassName={styles.content}
      dialogClassName={styles.dialog}
      backdrop="static"
      keyboard={!loading}
    >
      <div className={`${styles.head} ${isWarning ? styles.headWarning : ''}`}>
        <div className={styles.headTopRow}>
          <span className={`${styles.kicker} ${isWarning ? styles.kickerWarning : ''}`}>
            {isWarning ? 'Caution · Previously rejected' : 'Finalize Vendor'}
          </span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onHide}
            aria-label="Close"
            disabled={loading}
          >
            ×
          </button>
        </div>
        <h2 className={styles.title}>{titleText}</h2>
        <p className={styles.subtitle}>{subtitleText}</p>
      </div>

      <div className={styles.body}>
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Product</span>
            <span className={styles.summaryValue}>{productName}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Vendor</span>
            <span className={styles.summaryValue}>{vendorName || '—'}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Quoted price</span>
            <span className={styles.summaryValue}>{formatCurrency(quoted)}</span>
          </div>
        </div>

        {isWarning && latestRejection && (
          <div className={styles.warnPanel}>
            <div className={styles.warnPanelHead}>
              <span className={styles.warnPanelIcon} aria-hidden="true">⚠️</span>
              <div>
                <div className={styles.warnPanelTitle}>
                  Last PO {wasApproverRejection ? 'rejected by approver' : 'rejected by vendor'}
                </div>
                <div className={styles.warnPanelSub}>
                  {latestRejection.po_number ? `PO #${latestRejection.po_number} · ` : ''}
                  {formatDateTime(latestRejection.rejected_at)}
                </div>
              </div>
            </div>
            {(latestRejection.rejected_by_name || latestRejection.rejection_reason) && (
              <div className={styles.warnPanelMeta}>
                {latestRejection.rejected_by_name && (
                  <div>
                    <strong>Rejected by:</strong> {latestRejection.rejected_by_name}
                    {wasApproverRejection && latestRejection.rejected_by_email
                      ? ` (${latestRejection.rejected_by_email})`
                      : ''}
                  </div>
                )}
                {latestRejection.rejection_reason && (
                  <div>
                    <strong>Reason:</strong> {latestRejection.rejection_reason}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isWarning && (
          <div className={styles.steps}>
            {steps.map((s, i) => (
              <div className={styles.step} key={s.label}>
                <span className={styles.stepIndex}>Step {i + 1}</span>
                <div className={styles.stepLabel}>{s.label}</div>
                <div className={styles.stepHint}>{s.hint}</div>
              </div>
            ))}
          </div>
        )}

        {isReFinalize && !isWarning && (
          <div className={styles.warn}>
            <span className={styles.warnIcon}>⚠️</span>
            <span>
              <b>Heads up:</b> the existing draft PO for this product will be
              cancelled and a new approval cycle will begin.
            </span>
          </div>
        )}

        {isWarning && vendorPriorFinalizations.length > 0 && (
          <div className={styles.priorList}>
            <p className={styles.priorListTitle}>
              Previous finalizations of this vendor
            </p>
            <ul className={styles.priorListItems}>
              {vendorPriorFinalizations.map((entry, idx) => (
                <li key={`${entry.vendor_id || 'v'}_${idx}`} className={styles.priorListItem}>
                  <div>
                    <span className={styles.priorListWhen}>
                      {formatDateTime(entry.finalized_at)}
                    </span>
                    {entry.changed_by && (
                      <span className={styles.priorListWho}>
                        by {entry.changed_by}
                      </span>
                    )}
                  </div>
                  {entry.changed_at && (
                    <span className={styles.priorListReplaced}>
                      Replaced {formatDateTime(entry.changed_at)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showBudget && (
          <div className={styles.budget}>
            <p className={styles.budgetTitle}>Budget check</p>
            <div className={styles.budgetGrid}>
              <div className={styles.budgetCell}>
                <div className={styles.budgetCellLabel}>Total</div>
                <div className={styles.budgetCellValue}>
                  {formatCurrency(totalBudget)}
                </div>
              </div>
              <div className={styles.budgetCell}>
                <div className={styles.budgetCellLabel}>Available</div>
                <div className={styles.budgetCellValue}>
                  {formatCurrency(available)}
                </div>
              </div>
              <div
                className={`${styles.budgetCell} ${
                  overBudget ? styles.budgetCellNegative : styles.budgetCellPositive
                }`}
              >
                <div className={styles.budgetCellLabel}>After this PO</div>
                <div className={styles.budgetCellValue}>
                  {formatCurrency(remaining)}
                </div>
              </div>
            </div>
            {overBudget && (
              <div className={styles.budgetWarning}>
                <span>⚠️</span>
                <span>This will exceed your available budget.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onHide}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`${styles.btn} ${isWarning ? styles.btnWarning : styles.btnPrimary}`}
          onClick={() => onConfirm(null)}
          disabled={loading}
        >
          {loading ? (
            <span className={styles.btnInner}>
              <span className={styles.spinner} aria-hidden="true" />
              Finalizing…
            </span>
          ) : (
            ctaText
          )}
        </button>
      </div>
    </Modal>
  );
};

export default FinalizeVendorModal;
