import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Check, ShieldCheck, ShieldX } from 'lucide-react';
import { getQuoteComparison, getQuoteComparisonView } from '@/services/pricing';
import {
  getNegotiationApprovalBundle,
  approveNegotiationRound,
  rejectNegotiationRound,
} from '@/services/negotiation';
import { getChargeNames } from '@/services/rfq';
import { formatNegotiationDateTime, parseNegotiationTime } from '@/utils/negotiationTime';
import ApprovalActionModal from '../../approval/ApprovalActionModal';
import StepReview from './StepReview';
import { removalReasonLabel } from '@/components/dashboard/buyer/rfq/stages/StageShared';
import styles from './CreateRound.module.scss';

// This page carried the last of four private copies of the naive-UTC parser,
// and it is the page that made the duplication visible: it parsed `created_at`
// correctly two inches above an end date it handed to StepReview unparsed, so
// "created 12 Aug 2026, 12:35 PM" sat over "End date 13 Aug 2026 · 07:00 AM" —
// same row, same screen, 5h30m apart. utils/negotiationTime is the one parser
// now, imported above.

// Map a STORED round row into the queued-round entries StepReview already
// renders (same shape the wizard's queue holds). Multi rounds carry their
// per-product targets in `products[]`; legacy rounds in
// `vendor_approvals[].negotiation_fields`.
const roundToReviewEntries = (round, productsList = []) => {
  const nameOf = (pid) => {
    const fromRound = (round.product_names || []).find(
      (p) => Number(p?.rfq_product_id) === Number(pid)
    )?.product_name;
    if (fromRound) return fromRound;
    const product = productsList.find((p) => String(p.id) === String(pid));
    return product?.product_details?.[0]?.product_name
      || product?.product_details?.[0]?.name
      || `Product ${pid}`;
  };

  if (Array.isArray(round.products) && round.products.length > 0) {
    return round.products.map((p) => (p?.is_rfq_level === true
      ? {
          mode: 'rfq',
          vendor_targets: p.vendor_targets || [],
          productName: 'RFQ-level round',
        }
      : {
          mode: 'product',
          rfq_product_id: p.rfq_product_id,
          vendor_targets: p.vendor_targets || [],
          productName: nameOf(p.rfq_product_id),
        }));
  }

  // Legacy single-product round.
  return [{
    mode: 'product',
    rfq_product_id: round.rfq_product_id,
    vendor_targets: (round.vendor_approvals || []).map((va) => ({
      vendor_id: va.vendor_id,
      fields: va.negotiation_fields || [],
    })),
    productName: round.product_name || nameOf(round.rfq_product_id),
  }];
};

const ApproveRoundPage = () => {
  const router = useRouter();
  const { rfqId: rawRfqId } = router.query;
  const rfqId = useMemo(() => {
    if (!rawRfqId) return null;
    const n = parseInt(rawRfqId);
    return Number.isFinite(n) ? n : null;
  }, [rawRfqId]);

  const [products, setProducts] = useState([]);
  const [chargeNamesList, setChargeNamesList] = useState([]);
  const [bundle, setBundle] = useState(null);
  const [rfqInfo, setRfqInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // { round, actionType: 'APPROVE' | 'REJECT' } while the modal is open.
  const [actionState, setActionState] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Same portal-into-shell trick as the wizard so the dock spans the column.
  const [shellMainEl, setShellMainEl] = useState(null);
  useEffect(() => {
    setShellMainEl(document.querySelector('[class*="DashboardShell_main"]'));
  }, []);

  const load = async () => {
    if (!rfqId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [qcRes, bundleRes, viewRes, chargesRes] = await Promise.all([
        getQuoteComparison(rfqId).catch(() => null),
        getNegotiationApprovalBundle(rfqId),
        getQuoteComparisonView(rfqId).catch(() => null),
        getChargeNames().catch(() => null),
      ]);
      setProducts(qcRes?.data?.products || qcRes?.products || []);
      setBundle(bundleRes?.data || bundleRes || {});
      setRfqInfo(viewRes?.rfq || viewRes?.data?.rfq || null);
      const charges = chargesRes?.data || chargesRes || [];
      setChargeNamesList(Array.isArray(charges) ? charges : []);
    } catch (err) {
      console.error('ApproveRoundPage load error:', err);
      setLoadError(err?.message || 'Failed to load approval data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && rfqId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, rfqId]);

  // Rounds awaiting THIS user's approval, still pending and not yet expired.
  const pendingRounds = useMemo(() => {
    if (!bundle) return [];
    const instancesByRound = bundle.negotiation_instances || {};
    const now = new Date();
    return (bundle.rounds_history || [])
      .filter((r) =>
        r.status === 'PENDING_APPROVAL'
        && parseNegotiationTime(r.end_date) > now
        && (instancesByRound[String(r.id)] || [])
          .some((i) => i.status === 'PENDING' && i.can_user_approve))
      .sort((a, b) => (b.round_number || 0) - (a.round_number || 0));
  }, [bundle]);

  const pendingInstanceOf = (round) =>
    (bundle?.negotiation_instances?.[String(round.id)] || [])
      .find((i) => i.status === 'PENDING');

  const backToComparison = () =>
    router.push(`/dashboard/buyer/quote-comparison?rfq=${rfqId}`);

  const handleAction = async (comment) => {
    if (!actionState) return;
    const { round, actionType } = actionState;
    setActionLoading(true);
    try {
      if (actionType === 'REJECT') {
        await rejectNegotiationRound(round.id, comment);
        toast.success(`Round ${round.round_number} rejected`);
      } else {
        const res = await approveNegotiationRound(round.id, comment || null);
        const published = res?.data?.published;
        toast.success(published
          ? `Round ${round.round_number} approved — now live for vendors`
          : `Round ${round.round_number} approved`);
      }
      setActionState(null);
      // Refresh; leave the page when nothing remains for this user.
      const bundleRes = await getNegotiationApprovalBundle(rfqId).catch(() => null);
      const fresh = bundleRes?.data || bundleRes || {};
      setBundle(fresh);
      const instancesByRound = fresh.negotiation_instances || {};
      const stillPending = (fresh.rounds_history || []).some((r) =>
        r.status === 'PENDING_APPROVAL'
        && parseNegotiationTime(r.end_date) > new Date()
        && (instancesByRound[String(r.id)] || [])
          .some((i) => i.status === 'PENDING' && i.can_user_approve));
      if (!stillPending) backToComparison();
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

  if (loadError || !rfqId) {
    return (
      <div className={styles.page}>
        <div className={styles.pageInner}>
          <section className={styles.card}>
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Unable to load approval data</p>
              <p className={styles.emptySub}>{loadError || 'Invalid RFQ id.'}</p>
              <div style={{ marginTop: 16 }}>
                <button type="button" className={styles.btnSecondary} onClick={backToComparison}>
                  Back to Quote Comparison
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
                Approve negotiation round
                {rfqInfo?.number && (
                  <span className={styles.heroRfqNum}>RFQ #{rfqInfo.number}</span>
                )}
                {rfqInfo?.status && (
                  <span className={styles.heroStatusChip}>{rfqInfo.status}</span>
                )}
              </h1>
              <p className={styles.subtitle}>
                {rfqInfo ? (
                  <>
                    {rfqInfo.title && <span>{rfqInfo.title}</span>}
                    {rfqInfo.title && <span className={styles.heroSep}>·</span>}
                    <span className={styles.heroEm}>{rfqInfo.company}</span>
                    {(rfqInfo.hotel || rfqInfo.department) && (
                      <span> · {rfqInfo.hotel}{rfqInfo.department ? ` · ${rfqInfo.department}` : ''}</span>
                    )}
                  </>
                ) : (
                  'Review the round targets below, then approve or reject.'
                )}
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
              <div style={{ marginTop: 16 }}>
                <button type="button" className={styles.btnSecondary} onClick={backToComparison}>
                  Back to Quote Comparison
                </button>
              </div>
            </div>
          </section>
        ) : (
          pendingRounds.map((round) => {
            const instance = pendingInstanceOf(round);
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
                  <div>
                    <p className={styles.approveRoundTitle}>
                      Round {round.round_number}
                      <span className={styles.approveRoundMeta}>
                        · created by {round.created_by_name || '—'}
                        {round.created_at ? ` · ${formatNegotiationDateTime(round.created_at)}` : ''}
                      </span>
                    </p>
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
                      onClick={() => setActionState({ round, actionType: 'APPROVE' })}
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
                  queuedRounds={roundToReviewEntries(round, products)}
                  chargeNamesList={chargeNamesList}
                  mode="product"
                  readOnly
                  step3Errors={[]}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Footer dock — mounted into DashboardShell's main column. */}
      {(() => {
        const footerEl = (
          <footer className={styles.footer}>
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
                  onClick={backToComparison}
                  disabled={actionLoading}
                >
                  Back to Quote Comparison
                </button>
              </div>
            </div>
          </footer>
        );
        return shellMainEl ? createPortal(footerEl, shellMainEl) : footerEl;
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

export default ApproveRoundPage;
