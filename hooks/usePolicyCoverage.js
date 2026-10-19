import { useEffect, useState } from "react";
import { getPolicyCoverage } from "@/services/approval";
import { coverageFromResponse } from "@/utils/policyCoverage";

/**
 * Which entity types have a working approval policy (at `hotelId`, or across
 * the caller's units when omitted). `coverage` stays null while loading AND
 * when the call fails, so consumers fall back to today's behaviour; `failed`
 * distinguishes the two. Coverage must never block creating an RFQ.
 */
const usePolicyCoverage = ({ hotelId = null, enabled = true } = {}) => {
  const [state, setState] = useState({ coverage: null, loading: enabled, failed: false });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    getPolicyCoverage(hotelId ? { hotel_id: hotelId } : {})
      .then((res) => {
        if (cancelled) return;
        const coverage = coverageFromResponse(res);
        setState({ coverage, loading: false, failed: !coverage });
      })
      .catch(() => {
        if (!cancelled) setState({ coverage: null, loading: false, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [hotelId, enabled]);

  return state;
};

export default usePolicyCoverage;
