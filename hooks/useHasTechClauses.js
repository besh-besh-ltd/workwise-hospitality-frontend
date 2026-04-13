import { useState, useEffect, useCallback } from "react";
import { getAllClauses } from "@/services/rfq";

/**
 * Custom hook to check whether an RFQ has any technical evaluation clauses.
 *
 * @param {Object} options
 * @param {number|string} [options.rfq_id] - RFQ ID to fetch clauses for
 * @param {boolean}       [options.preloaded] - If defined, skips the API call and uses this value directly
 * @returns {{ hasClauses: boolean|null, loading: boolean }}
 */
const useHasTechClauses = ({ rfq_id, preloaded } = {}) => {
  const [hasClauses, setHasClauses] = useState(
    preloaded !== undefined ? preloaded : null
  );
  const [loading, setLoading] = useState(preloaded === undefined && !!rfq_id);

  const fetchClauses = useCallback(async () => {
    if (preloaded !== undefined) {
      setHasClauses(preloaded);
      setLoading(false);
      return;
    }

    if (!rfq_id) {
      setHasClauses(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getAllClauses(rfq_id);
      setHasClauses(res.data && res.data.length > 0);
    } catch (err) {
      console.error("useHasTechClauses: failed to fetch clauses", err);
      setHasClauses(null);
    } finally {
      setLoading(false);
    }
  }, [rfq_id, preloaded]);

  useEffect(() => {
    fetchClauses();
  }, [fetchClauses]);

  return { hasClauses, loading };
};

export default useHasTechClauses;
