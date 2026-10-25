import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { getQuoteComparison, getQuoteComparisonView } from '@/services/pricing';
import {
  getNegotiationApprovalBundle,
  approveNegotiationRound,
  rejectNegotiationRound,
} from '@/services/negotiation';
import { getChargeNames } from '@/services/rfq';
import NegotiationApprovalView, { fieldTargetLabel } from './NegotiationApprovalView';
import styles from './CreateRound.module.scss';
import { getApiErrorMessage } from '@/utils/apiError';

// This page carried the last of four private copies of the naive-UTC parser,
// and it is the page that made the duplication visible: it parsed `created_at`
// correctly two inches above an end date it handed to StepReview unparsed, so
// "created 12 Aug 2026, 12:35 PM" sat over "End date 13 Aug 2026 · 07:00 AM" —
// same row, same screen, 5h30m apart. utils/negotiationTime is the one parser
// now, used by NegotiationApprovalView, which renders this page.

// Map a STORED round row into the queued-round entries StepReview already
// renders (same shape the wizard's queue holds). Multi rounds carry their
// per-product targets in `products[]`; legacy rounds in
// `vendor_approvals[].negotiation_fields`.
export const roundToReviewEntries = (round, productsList = []) => {
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

// Kept on this module's surface: callers and tests import it from here.
export { fieldTargetLabel };

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
      setLoadError(getApiErrorMessage(err, 'Failed to load approval data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady && rfqId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, rfqId]);

  const backToComparison = () =>
    router.push(`/dashboard/buyer/quote-comparison?rfq=${rfqId}`);

  const refetchBundle = async () => {
    const bundleRes = await getNegotiationApprovalBundle(rfqId).catch(() => null);
    const fresh = bundleRes?.data || bundleRes || {};
    setBundle(fresh);
    return fresh;
  };

  const subtitle = rfqInfo ? (
    <>
      {rfqInfo.title && <span>{rfqInfo.title}</span>}
      {rfqInfo.title && <span className={styles.heroSep}>·</span>}
      <span className={styles.heroEm}>{rfqInfo.company}</span>
      {(rfqInfo.hotel || rfqInfo.department) && (
        <span> · {rfqInfo.hotel}{rfqInfo.department ? ` · ${rfqInfo.department}` : ''}</span>
      )}
    </>
  ) : null;

  return (
    <NegotiationApprovalView
      loading={loading}
      loadError={loadError || (!rfqId ? 'Invalid RFQ id.' : null)}
      header={{
        title: 'Approve negotiation round',
        number: rfqInfo?.number ? `RFQ #${rfqInfo.number}` : null,
        status: rfqInfo?.status || null,
        subtitle,
      }}
      bundle={bundle}
      products={products}
      chargeNamesList={chargeNamesList}
      toReviewEntries={roundToReviewEntries}
      allowLineWithhold
      onApprove={(round, comment, lines) => approveNegotiationRound(round.id, comment, null, lines)}
      onReject={(round, comment) => rejectNegotiationRound(round.id, comment)}
      refetchBundle={refetchBundle}
      onDone={backToComparison}
      backLabel="Back to Quote Comparison"
      onBack={backToComparison}
    />
  );
};

export default ApproveRoundPage;
