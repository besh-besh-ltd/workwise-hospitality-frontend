import { useEffect, useState } from "react";
import { getPolicyCoverage } from "@/services/approval";
import { coverageFromResponse, mergeCoverages } from "@/utils/policyCoverage";

/**
 * Which entity types have a working approval policy at ALL of `hotelIds` (or
 * across the caller's units when none are given: one call, no hotel_id).
 * `coverage` is null while loading, after a failure, and immediately after the
 * unit selection changes, so consumers fall back to today's behaviour rather
 * than acting on the previous unit's answer. Coverage never blocks creating an
 * RFQ.
 */
const usePolicyCoverage = ({ hotelIds = [], enabled = true } = {}) => {
  const key = JSON.stringify([...hotelIds].sort());
  const [state, setState] = useState({ key: null, coverage: null, failed: false });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const ids = JSON.parse(key);
    const calls = ids.length ? ids.map((id) => getPolicyCoverage({ hotel_id: id })) : [getPolicyCoverage({})];
    Promise.all(calls)
      .then((responses) => {
        if (cancelled) return;
        const coverage = mergeCoverages(responses.map(coverageFromResponse));
        setState({ key, coverage, failed: !coverage });
      })
      .catch(() => {
        if (!cancelled) setState({ key, coverage: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  if (!enabled) return { coverage: null, loading: false, failed: false };
  if (state.key !== key) return { coverage: null, loading: true, failed: false };
  return { coverage: state.coverage, loading: false, failed: state.failed };
};

export default usePolicyCoverage;
