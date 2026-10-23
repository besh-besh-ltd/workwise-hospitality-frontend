// The reference a vendor uses to talk about a PO: the RFQ it came from, or for a
// released (call-off) order the rate contract (ARC) and the material request.
// Fields come from the vendor PO list / attention list; each may be null or
// absent (older backend during a deploy) and then renders nothing.
import React from "react";
import styles from "@/components/dashboard/buyer/purchase-orders/shared";
import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

const clean = (v) => decodeHtmlEntities(v).trim();

/* "ARC-77" already says ARC; a bare "77" does not. */
export const arcLabel = (no) => (/^arc\b/i.test(no) ? no : `ARC ${no}`);

const PoReference = ({ po, clamp = true }) => {
  const rfqNo = clean(po?.rfq_no);
  const rfqTitle = clean(po?.rfq_title);
  const arcNo = clean(po?.arc_number);
  const arcTitle = clean(po?.arc_title);
  const mrNo = clean(po?.mr_number);

  if (po?.is_call_off === true) {
    if (!arcNo && !mrNo) return null;
    return (
      <>
        {arcNo && (
          <div className={styles.poNum}>
            <strong>{arcLabel(arcNo)}</strong>
          </div>
        )}
        {arcTitle && (
          <div className={clamp ? styles.refTitle : undefined} title={arcTitle}>
            {arcTitle}
          </div>
        )}
        {mrNo && <div className={styles.ago}>{`MR ${mrNo}`}</div>}
      </>
    );
  }

  if (!rfqNo) return null;
  return (
    <>
      <div className={styles.poNum}>
        <strong>{`RFQ #${rfqNo}`}</strong>
      </div>
      {rfqTitle && (
        <div className={clamp ? styles.refTitle : undefined} title={rfqTitle}>
          {rfqTitle}
        </div>
      )}
    </>
  );
};

export default PoReference;
