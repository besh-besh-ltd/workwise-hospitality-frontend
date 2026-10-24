// ArcApproveRoundPage — approve or reject an ARC negotiation round on the RFQ
// negotiation approval page (NegotiationApprovalView).
//
// The ARC approver used to get a separate page that read the legacy
// tbl_negotiation_rounds.target_price column. The create wizard stopped writing
// it — targets live per vendor and per item in products[].vendor_targets[] —
// so no ARC approver ever saw a target ("No revised quotes submitted yet",
// Phileein, 22 Oct 2026). This loader feeds the shared view from the ARC
// approval bundle, mapped onto the RFQ product shape by the same adapter the
// ARC create wizard uses.
//
// The URL names one round (it is the notification link); that round is listed
// first, alongside any other round on this ARC awaiting the same approver. The
// ARC approval API decides a round as a whole, so there is no per-line
// withholding.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";
import { getChargeNames } from "@/services/rfq";
import { getApiErrorMessage } from "@/utils/apiError";
import NegotiationApprovalView from "@/components/dashboard/buyer/negotiation/create-round/NegotiationApprovalView";
import {
  arcRoundToReviewEntries,
  normalizeArcProducts,
} from "@/components/dashboard/buyer/negotiation/create-round/adapters/arcNegotiationAdapter";
import { arcStatusLabel } from "@/components/dashboard/rate-contracts/shared/StatusBadge";
import styles from "@/components/dashboard/buyer/negotiation/create-round/CreateRound.module.scss";

const bundleOf = (res) => res?.data || res || {};

export default function ArcApproveRoundPage({ arcId, roundId }) {
  const router = useRouter();
  const [bundle, setBundle] = useState(null);
  const [chargeNamesList, setChargeNamesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const backUrl = `/dashboard/buyer/rate-contracts/${arcId}?stage=commercial`;
  const back = () => router.push(backUrl);

  const load = useCallback(async () => {
    if (!arcId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [bundleRes, chargesRes] = await Promise.all([
        ArcApi.getArcNegotiationApprovalBundle(arcId),
        getChargeNames().catch(() => null),
      ]);
      setBundle(bundleOf(bundleRes));
      const charges = chargesRes?.data || chargesRes || [];
      setChargeNamesList(Array.isArray(charges) ? charges : []);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Failed to load approval data"));
    } finally {
      setLoading(false);
    }
  }, [arcId]);

  useEffect(() => { load(); }, [load]);

  const products = useMemo(
    () => normalizeArcProducts({
      items: bundle?.items || [],
      quotes: bundle?.quotes || [],
      qualifiedMap: bundle?.qualified_by_item || {},
    }),
    [bundle]
  );

  const refetchBundle = async () => {
    const fresh = bundleOf(await ArcApi.getArcNegotiationApprovalBundle(arcId).catch(() => null));
    setBundle(fresh);
    return fresh;
  };

  const arc = bundle?.arc;
  const subtitle = arc ? (
    <>
      {arc.title && <span>{arc.title}</span>}
      {arc.title && <span className={styles.heroSep}>·</span>}
      <span className={styles.heroEm}>{arc.company_name}</span>
      {(arc.hotel_name || arc.department_title) && (
        <span> · {arc.hotel_name}{arc.department_title ? ` · ${arc.department_title}` : ""}</span>
      )}
    </>
  ) : null;

  return (
    <NegotiationApprovalView
      loading={loading}
      loadError={loadError}
      header={{
        title: "Approve negotiation round",
        number: arc?.arc_number || null,
        status: arc?.status ? arcStatusLabel(arc.status) : null,
        subtitle,
      }}
      bundle={bundle}
      products={products}
      chargeNamesList={chargeNamesList}
      toReviewEntries={arcRoundToReviewEntries}
      allowLineWithhold={false}
      onApprove={(round, comment) =>
        ArcApi.approveArcNegotiationRound(arcId, round.id, comment ? { comment } : {})}
      onReject={(round, comment) =>
        ArcApi.rejectArcNegotiationRound(arcId, round.id, { comment })}
      refetchBundle={refetchBundle}
      onDone={back}
      backLabel="Back to the rate contract"
      onBack={back}
      focusRoundId={roundId}
      emptyExtra={roundId ? (
        <Link href={`/dashboard/buyer/negotiation/round/${roundId}`} className={styles.btnSecondary}>
          View round
        </Link>
      ) : null}
    />
  );
}
