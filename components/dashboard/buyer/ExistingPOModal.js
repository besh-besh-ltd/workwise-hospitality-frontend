import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import styles from "./ExistingPOModal.module.scss";

/**
 * Two-step decision UI:
 * 1. Pick (or skip) one of the available draft POs.
 * 2. Choose how to proceed — group into the selected PO, or draft a new one.
 *
 * The "decision" cards in step 2 act as toggle buttons. A single Confirm in
 * the footer commits whichever decision is active.
 *
 * Selecting a PO row also implicitly arms the "merge" decision; clicking the
 * "Draft separate" card explicitly clears any PO selection (with a small
 * inline notice) so the user can't accidentally merge into a PO they meant
 * to leave alone.
 */
const ExistingPOModal = ({
  show,
  onHide,
  existingPos,
  selectedPo,
  setSelectedPo,
  onConfirm,
  loading = false,
}) => {
  const hasPos = Array.isArray(existingPos) && existingPos.length > 0;

  // Decision: 'merge' | 'separate' | null. When the modal opens with no POs,
  // separate is the only sensible action so we pre-arm it. Otherwise the user
  // must explicitly pick.
  const [decision, setDecision] = useState(null);
  const [showDeselectNotice, setShowDeselectNotice] = useState(false);

  // Reset decision + notice whenever the modal reopens or the PO list changes.
  // When POs exist, pre-select the first one and arm the merge decision so the
  // happy path is one click away — the user can override either by picking a
  // different PO or by clicking the "Draft separate" card.
  useEffect(() => {
    if (!show) return;
    setShowDeselectNotice(false);
    if (!hasPos) {
      setDecision('separate');
      return;
    }
    setSelectedPo(existingPos[0]);
    setDecision('merge');
  }, [show, hasPos, existingPos, setSelectedPo]);

  const handlePickPo = (po) => {
    setSelectedPo(po);
    setDecision('merge');
    setShowDeselectNotice(false);
  };

  const handlePickMerge = () => {
    if (!selectedPo) return; // disabled state covers this; defensive
    setDecision('merge');
    setShowDeselectNotice(false);
  };

  const handlePickSeparate = () => {
    if (selectedPo) {
      setSelectedPo(null);
      setShowDeselectNotice(true);
    } else {
      setShowDeselectNotice(false);
    }
    setDecision('separate');
  };

  const confirmLabel = decision === 'merge' && selectedPo
    ? `Confirm: Group into PO #${selectedPo.po_number}`
    : decision === 'separate'
      ? 'Confirm: Draft a separate PO'
      : 'Confirm';

  const confirmDisabled =
    decision === null ||
    (decision === 'merge' && !selectedPo);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    if (decision === 'separate') {
      onConfirm(null);
    } else {
      onConfirm(selectedPo?.id);
    }
  };

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
      <div className={styles.head}>
        <div className={styles.headTopRow}>
          <span className={styles.kicker}>Existing draft Purchase Orders</span>
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
        <h2 className={styles.title}>This vendor has draft Purchase Orders</h2>
        <p className={styles.subtitle}>
          Group into an existing draft, or start a fresh PO.
        </p>
      </div>

      <div className={styles.body}>
        {/* Step 1: pick (or skip) an existing draft */}
        <p className={styles.stepLabel}>
          <span className={styles.stepIndex}>1</span>
          {hasPos ? 'Available draft Purchase Orders' : 'No draft Purchase Orders found'}
        </p>

        {hasPos ? (
          <div className={styles.list}>
            {existingPos.map((po) => {
              const isSelected = selectedPo?.id === po.id;
              return (
                <div
                  key={po.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePickPo(po)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePickPo(po);
                    }
                  }}
                  className={`${styles.poRow} ${isSelected ? styles.poRowSelected : ''}`}
                >
                  <span className={styles.radio} aria-hidden="true">
                    <span className={styles.radioDot} />
                  </span>
                  <div className={styles.poInfo}>
                    <p className={styles.poNumber}>PO #{po.po_number}</p>
                    <p className={styles.poMeta}>
                      Created {formatDisplayDate(po.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            No draft Purchase Orders exist for this vendor on this RFQ. A new
            PO will be drafted for this product.
          </div>
        )}

        {/* Step 2: pick the action */}
        <p className={styles.stepLabel}>
          <span className={styles.stepIndex}>2</span>
          What would you like to do?
        </p>

        <div className={styles.decisionGrid}>
          <button
            type="button"
            className={`${styles.decisionCard} ${decision === 'merge' ? styles.decisionCardActive : ''}`}
            onClick={handlePickMerge}
            disabled={!selectedPo}
            aria-pressed={decision === 'merge'}
          >
            <div className={styles.decisionTitleRow}>
              <h3 className={styles.decisionTitle}>Group into selected PO</h3>
              <span className={styles.decisionCheck} aria-hidden="true">✓</span>
            </div>
            <p className={styles.decisionHint}>
              {selectedPo ? (
                <>
                  Adds this product to{' '}
                  <strong className={styles.decisionHintHighlight}>
                    PO #{selectedPo.po_number}
                  </strong>{' '}
                  — keeps the same approval flow.
                </>
              ) : (
                'Pick a PO above first to enable this option.'
              )}
            </p>
          </button>

          <button
            type="button"
            className={`${styles.decisionCard} ${decision === 'separate' ? styles.decisionCardActive : ''}`}
            onClick={handlePickSeparate}
            aria-pressed={decision === 'separate'}
          >
            <div className={styles.decisionTitleRow}>
              <h3 className={styles.decisionTitle}>Draft a separate PO</h3>
              <span className={styles.decisionCheck} aria-hidden="true">✓</span>
            </div>
            <p className={styles.decisionHint}>
              Starts a fresh PO with its own approval cycle.
            </p>
          </button>
        </div>

        {showDeselectNotice && (
          <div className={styles.notice}>
            <span className={styles.noticeIcon} aria-hidden="true">⚠️</span>
            <span className={styles.noticeBody}>
              <b>PO de-selected</b> - a brand-new PO will be drafted instead.
            </span>
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
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleConfirm}
          disabled={confirmDisabled || loading}
        >
          {loading ? (
            <span className={styles.btnInner}>
              <span className={styles.spinner} aria-hidden="true" />
              Finalizing…
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  );
};

export default ExistingPOModal;
