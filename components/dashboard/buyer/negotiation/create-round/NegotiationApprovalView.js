import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Check, Clock, ShieldCheck, ShieldX } from 'lucide-react';
import {
  formatNegotiationDateTime,
  formatNegotiationDeadline,
  parseNegotiationTime,
  roundTimeLeft,
} from '@/utils/negotiationTime';
import ApprovalActionModal from '../../approval/ApprovalActionModal';
import StepReview, { RFQ_WHOLE_SCOPE } from './StepReview';
import MobileActionBar, { MobileActionButton } from '@/components/shared/mobile/MobileActionBar';
import { removalReasonLabel } from '@/components/dashboard/buyer/rfq/stages/StageShared';
import RoundRemarks from '../RoundRemarks';
import styles from './CreateRound.module.scss';

// The negotiation approval page, minus where its data comes from. RFQ rounds
// (ApproveRoundPage) and ARC rounds (ArcApproveRoundPage) load their own
// bundle and products and hand them here, so an approver sees the same page —
// who opened the round and why, the approver chips, every target per vendor in
// the wizard's own read-only review, the deadline and the time left — whichever
// module the round came from.
//
// Props:
//   bundle             { rounds_history, negotiation_instances } — the RFQ
//                      approval bundle's shape
//   products           RFQ-shaped products StepReview renders against
//   toReviewEntries    (round, products) => the queued-round entries StepReview
//                      renders (see roundToReviewEntries in ApproveRoundPage)
//   allowLineWithhold  per-line withholding (RFQ only — the ARC approval API
//                      decides a round as a whole)
//   onApprove          (round, comment, lines) => Promise<response>
//   onReject           (round, comment) => Promise
//   refetchBundle      () => Promise<bundle>, after an action
//   onDone             called when nothing is left awaiting this user
//   focusRoundId       a round to list first (the one a notification linked)
//   emptyExtra         extra content for the "nothing awaiting you" state
//   wholeScope         how a round on the whole parent is named (StepReview)

// Rounds awaiting THIS user's approval, still pending and not yet expired.
const pendingRoundsOf = (bundle) => {
  if (!bundle) return [];
  const instancesByRound = bundle.negotiation_instances || {};
  const now = new Date();
  return (bundle.rounds_history || [])
    .filter((r) =>
      r.status === 'PENDING_APPROVAL'
      && parseNegotiationTime(r.end_date) > now
      && (instancesByRound[String(r.id)] || [])
        .some((i) => i.status === 'PENDING' && i.can_user_approve));
};

// How long the vendors have left. The deadline itself is printed by the
// read-only review below (End date … IST); this chip adds the time left and
// turns amber once it is inside the minimum round window, because approval
// time comes out of the vendors' window.
const DeadlineChip = ({ endDate }) => {
  const left = roundTimeLeft(endDate);
  if (!left) return null;
  return (
    <p
      className={`${styles.deadlineChip} ${left.urgent ? styles.deadlineChipUrgent : ''}`}
      data-testid="round-deadline"
      data-urgent={left.urgent ? 'true' : 'false'}
      title={formatNegotiationDeadline(endDate)}
    >
      <Clock size={11} strokeWidth={2.5} />
      {left.passed ? "Vendors' deadline has passed" : `Vendors' deadline in ${left.text}`}
    </p>
  );
};

const NegotiationApprovalView = ({
  loading,
  loadError,
  header = {},
  bundle,
  products = [],
  chargeNamesList = [],
  toReviewEntries,
  allowLineWithhold = false,
  onApprove,
  onReject,
  refetchBundle,
  onDone,
  backLabel,
  onBack,
  emptyExtra = null,
  focusRoundId = null,
  wholeScope = RFQ_WHOLE_SCOPE,
}) => {
  // { round, actionType: 'APPROVE' | 'REJECT' } while the modal is open.
  const [actionState, setActionState] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Same portal-into-shell trick as the wizard so the dock spans the column.
  const [shellMainEl, setShellMainEl] = useState(null);
  useEffect(() => {
    setShellMainEl(document.querySelector('[class*="DashboardShell_main"]'));
  }, []);

  // Newest first; the round a notification linked to leads.
  const pendingRounds = useMemo(() => {
    const focus = focusRoundId != null ? Number(focusRoundId) : null;
    return pendingRoundsOf(bundle).sort((a, b) => {
      if (focus != null && (Number(a.id) === focus) !== (Number(b.id) === focus)) {
        return Number(a.id) === focus ? -1 : 1;
      }
      return (b.round_number || 0) - (a.round_number || 0);
    });
  }, [bundle, focusRoundId]);

  const pendingInstanceOf = (round) =>
    (bundle?.negotiation_instances?.[String(round.id)] || [])
      .find((i) => i.status === 'PENDING');

  // Lines the approver is withholding from this round, keyed
  // `${roundId}:${rfqProductId|RFQ_LEVEL}:${vendorId}`. A withheld line is sent
  // as REJECTED and never reaches the vendor; the rest of the round goes live.
  // Client feedback item 8.
  const [withheld, setWithheld] = useState({});

  const lineKey = (roundId, entry, vendorId) =>
    `${roundId}:${entry.mode === 'rfq' ? 'RFQ_LEVEL' : entry.rfq_product_id}:${vendorId}`;

  const toggleWithheld = (key) =>
    setWithheld((m) => ({ ...m, [key]: !m[key] }));

  /** The `lines` payload for a round: only what is being withheld. */
  const withheldLinesFor = (round) => {
    if (!allowLineWithhold) return [];
    const out = [];
    for (const entry of toReviewEntries(round, products)) {
      for (const vt of (entry.vendor_targets || [])) {
        if (!withheld[lineKey(round.id, entry, vt.vendor_id)]) continue;
        out.push({
          ...(entry.mode === 'rfq'
            ? { is_rfq_level: true }
            : { rfq_product_id: Number(entry.rfq_product_id) }),
          vendor_id: Number(vt.vendor_id),
          decision: 'REJECTED',
        });
      }
    }
    return out;
  };

  /** Every (line, vendor) pair on the round — the denominator for "all withheld". */
  const totalLinesFor = (round) =>
    toReviewEntries(round, products)
      .reduce((n, e) => n + (e.vendor_targets || []).length, 0);

  // One Approve path for the in-page button and the phone action bar, so the
  // "everything withheld" guard can never be skipped from either.
  const requestApprove = (round) => {
    // Publishing a round with every line withheld would
    // invite the vendor to answer an empty negotiation.
    // The server refuses this too; saying so here saves the
    // round trip.
    if (
      totalLinesFor(round) > 0 &&
      withheldLinesFor(round).length >= totalLinesFor(round)
    ) {
      toast.error(
        'Every line on this round is withheld. Reject the round instead, so it is cancelled and the creator is told.'
      );
      return;
    }
    setActionState({ round, actionType: 'APPROVE' });
  };

  const handleAction = async (comment) => {
    if (!actionState) return;
    const { round, actionType } = actionState;
    setActionLoading(true);
    try {
      if (actionType === 'REJECT') {
        await onReject(round, comment);
        toast.success(`Round ${round.round_number} rejected`);
      } else {
        const lines = withheldLinesFor(round);
        const res = await onApprove(round, comment || null, lines);
        const published = res?.data?.published;
        toast.success(published
          ? `Round ${round.round_number} approved — now live for vendors`
          : `Round ${round.round_number} approved`);
      }
      setActionState(null);
      // Refresh; leave the page when nothing remains for this user.
      const fresh = await Promise.resolve(refetchBundle?.()).catch(() => null);
      if (pendingRoundsOf(fresh || {}).length === 0) onDone?.();
    } catch (err) {
      toast.error(err?.message || 'Action failed — please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.pageInner}>
          <div className={styles.fullLoader}>
            <Spinner animation="border" />
            <span>Loading approval data…</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.pageInner}>
          <section className={styles.card}>
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Unable to load approval data</p>
              <p className={styles.emptySub}>{loadError}</p>
              <div style={{ marginTop: 16 }}>
                <button type="button" className={styles.btnSecondary} onClick={onBack}>
                  {backLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <header className={styles.header}>
          <div className={styles.headerTopRow}>
            <div style={{ minWidth: 0 }}>
              <p className={styles.eyebrow}>Negotiation approval</p>
              <h1 className={styles.title}>
                {header.title || 'Approve negotiation round'}
                {header.number && (
                  <span className={styles.heroRfqNum}>{header.number}</span>
                )}
                {header.status && (
                  <span className={styles.heroStatusChip}>{header.status}</span>
                )}
              </h1>
              <p className={styles.subtitle}>
                {header.subtitle || 'Review the round targets below, then approve or reject.'}
              </p>
            </div>
          </div>
        </header>

        {pendingRounds.length === 0 ? (
          <section className={styles.card}>
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No rounds awaiting your approval</p>
              <p className={styles.emptySub}>
                Either everything is already actioned, or the pending round has expired.
              </p>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {emptyExtra}
                <button type="button" className={styles.btnSecondary} onClick={onBack}>
                  {backLabel}
                </button>
              </div>
            </div>
          </section>
        ) : (
          pendingRounds.map((round) => {
            const instance = pendingInstanceOf(round);
            const entries = toReviewEntries(round, products);
            const allApprovers = (instance?.steps || [])
              .flatMap((s) => (s.approvers || []).map((a) => ({ ...a, step_order: s.step_order })));
            // REMOVED rows are a mid-flight reconciler's soft-tombstone (role/scope
            // revoked while the approval was in flight) — kept for the audit trail
            // below, muted and separated, but never rendered as a live approver.
            const approvers = allApprovers.filter((a) => a.status !== 'REMOVED');
            const removedApprovers = allApprovers.filter((a) => a.status === 'REMOVED');
            return (
              <div key={round.id} className={styles.approveRoundBlock}>
                <div className={styles.approveRoundHead}>
                  <div className={styles.approveRoundHeadMain}>
                    <p className={styles.approveRoundTitle}>
                      Round {round.round_number}
                      <span className={styles.approveRoundMeta}>
                        · created by {round.created_by_name || '—'}
                        {round.created_at ? ` · ${formatNegotiationDateTime(round.created_at)}` : ''}
                      </span>
                    </p>
                    <DeadlineChip endDate={round.end_date} />
                    <RoundRemarks remarks={round.creator_remarks} creatorName={round.created_by_name} />
                    {(approvers.length > 0 || removedApprovers.length > 0) && (
                      <div className={styles.approveJourney}>
                        {approvers.map((a) => (
                          <span
                            key={`${a.id}-${a.approver_user_id}`}
                            className={`${styles.approverChip} ${
                              a.status === 'APPROVED' ? styles.approverChipDone : ''
                            }`}
                          >
                            {a.status === 'APPROVED' && <Check size={11} strokeWidth={3} />}
                            {a.user_name || `User ${a.approver_user_id}`}
                          </span>
                        ))}
                        {removedApprovers.map((a) => {
                          const reasonLabel = a.removal_reason ? removalReasonLabel(a.removal_reason) : null;
                          const whenLabel = a.removed_at
                            ? formatNegotiationDateTime(a.removed_at)
                            : null;
                          const title = [reasonLabel, whenLabel ? `Removed ${whenLabel}` : null]
                            .filter(Boolean)
                            .join(' · ') || 'Removed';
                          return (
                            <span
                              key={`removed-${a.id}-${a.approver_user_id}`}
                              className={`${styles.approverChip} ${styles.approverChipRemoved}`}
                              title={title}
                            >
                              {a.user_name || `User ${a.approver_user_id}`} · Removed
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Per-line withholding. A round covers many line items but
                      its approval was one yes/no: in production 22 approvals
                      each decided 2-18 lines with a single verdict, so an
                      approver happy with four of five targets had to reject the
                      whole round and have it rebuilt. Client feedback item 8.
                      Where the round is decided as a whole (ARC), the same rows
                      list the targets without the toggle. */}
                  <div className={styles.approveRoundLines}>
                    {entries.map((entry) => (
                      (entry.vendor_targets || []).map((vt) => {
                        const key = lineKey(round.id, entry, vt.vendor_id);
                        const targets = (vt.fields || []).map(fieldTargetLabel).join(' · ') || 'no target';
                        if (!allowLineWithhold) {
                          return (
                            <div key={key} className={`${styles.approveRoundLine} ${styles.approveRoundLineStatic}`}>
                              <span className={styles.approveRoundLineName}>{entry.productName}</span>
                              {vt.vendor_name && (
                                <span className={styles.approveRoundLineVendor}>{vt.vendor_name}</span>
                              )}
                              <span className={styles.approveRoundLineVendor}>{targets}</span>
                            </div>
                          );
                        }
                        const isOut = !!withheld[key];
                        const lineLabel = entry.mode === 'rfq' ? 'RFQ_LEVEL' : entry.rfq_product_id;
                        return (
                          <label
                            key={key}
                            className={`${styles.approveRoundLine} ${isOut ? styles.approveRoundLineOut : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isOut}
                              onChange={() => toggleWithheld(key)}
                              aria-label={`Withhold line ${lineLabel} for vendor ${vt.vendor_id}`}
                            />
                            <span className={styles.approveRoundLineName}>{entry.productName}</span>
                            <span className={styles.approveRoundLineVendor}>{targets}</span>
                            {isOut && <span className={styles.approveRoundLineTag}>Withheld</span>}
                          </label>
                        );
                      })
                    ))}
                  </div>

                  <div className={styles.approveRoundActions}>
                    <button
                      type="button"
                      className={styles.btnReject}
                      disabled={actionLoading}
                      onClick={() => setActionState({ round, actionType: 'REJECT' })}
                    >
                      <ShieldX size={14} strokeWidth={2.5} />
                      Reject
                    </button>
                    <button
                      type="button"
                      className={styles.btnApprove}
                      disabled={actionLoading}
                      onClick={() => requestApprove(round)}
                    >
                      <ShieldCheck size={14} strokeWidth={2.5} />
                      Approve
                    </button>
                  </div>
                </div>

                {/* The exact wizard review section, read-only. */}
                <StepReview
                  product={null}
                  productPriceData={{ vendors: [], l1: null }}
                  selectedVendorIds={[]}
                  vendorTargets={{}}
                  formData={{ end_date: round.end_date, negotiation_fields: [] }}
                  effectiveFields={[]}
                  products={products}
                  queuedRounds={entries}
                  chargeNamesList={chargeNamesList}
                  mode="product"
                  readOnly
                  step3Errors={[]}
                  wholeScope={wholeScope}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Footer dock — mounted into DashboardShell's main column. */}
      {(() => {
        const footerEl = (
          <footer className={`${styles.footer} ${pendingRounds.length > 0 ? styles.footerPhoneHidden : ''}`}>
            <div className={styles.footerInner}>
              <div className={styles.footerStepInfo}>
                <span className={styles.footerStepNum}>
                  {pendingRounds.length} round{pendingRounds.length === 1 ? '' : 's'} awaiting your approval
                </span>
              </div>
              <div className={styles.footerActions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={onBack}
                  disabled={actionLoading}
                >
                  {backLabel}
                </button>
              </div>
            </div>
          </footer>
        );
        return shellMainEl ? createPortal(footerEl, shellMainEl) : footerEl;
      })()}

      {/* Phone decision bar (<=768px only). A long read-only review sits
          under the in-page Reject / Approve, so an approver on a phone would
          otherwise scroll back up to decide. It acts on the first (newest)
          pending round through the same handlers and modal as the page. */}
      {pendingRounds.length > 0 && (() => {
        const round = pendingRounds[0];
        const total = totalLinesFor(round);
        const out = withheldLinesFor(round).length;
        return (
          <MobileActionBar
            label="Negotiation round decision"
            summary={
              <>
                <strong>Round {round.round_number}</strong>
                <span>
                  {total} line{total === 1 ? '' : 's'}
                  {out > 0 ? ` · ${out} withheld` : ''}
                  {pendingRounds.length > 1 ? ` · +${pendingRounds.length - 1} more below` : ''}
                </span>
              </>
            }
          >
            <MobileActionButton
              variant="reject"
              disabled={actionLoading}
              onClick={() => setActionState({ round, actionType: 'REJECT' })}
            >
              <ShieldX size={16} strokeWidth={2.5} />
              Reject
            </MobileActionButton>
            <MobileActionButton
              variant="approve"
              disabled={actionLoading}
              onClick={() => requestApprove(round)}
            >
              <ShieldCheck size={16} strokeWidth={2.5} />
              Approve
            </MobileActionButton>
          </MobileActionBar>
        );
      })()}

      <ApprovalActionModal
        show={!!actionState}
        actionType={actionState?.actionType}
        onClose={() => !actionLoading && setActionState(null)}
        onSubmit={handleAction}
        loading={actionLoading}
        entityLabel={actionState ? `negotiation round ${actionState.round.round_number}` : 'negotiation round'}
      />
    </div>
  );
};

// MRP (tax-inclusive) rounds store the ask as `tax_demand`, not `target`
// (46 stored fields at the time of writing); reading only `target` printed
// "base_price undefined" to the approver.
export const fieldTargetLabel = (f) => {
  if (f?.target !== undefined && f?.target !== null && f?.target !== '') return `${f.name} ${f.target}`;
  if (f?.tax_demand !== undefined && f?.tax_demand !== null && f?.tax_demand !== '') return `${f.name} ${f.tax_demand} (incl. tax)`;
  return `${f?.name}`;
};

export default NegotiationApprovalView;
