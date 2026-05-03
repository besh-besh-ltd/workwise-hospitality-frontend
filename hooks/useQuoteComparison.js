import { useEffect, useRef, useState, useCallback } from "react";
import { getQuoteComparison } from "@/services/pricing";

// Returns { data, isLoading, error, refetch } for the server-computed
// quote-compare view model.
//
// `opts` mirrors the query-param shape: { normalize, freightFilter,
// rfq_product_id, include_negotiation, pageSource }. Changes to opts
// re-fetch automatically.
export default function useQuoteComparison(rfq_id, opts = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const optsKey = JSON.stringify(opts || {});

  const fetchData = useCallback(async () => {
    if (!rfq_id) return;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const response = await getQuoteComparison(rfq_id, opts);
      if (requestId !== requestIdRef.current) return;
      setData(response?.data || null);
      setMeta(response?.meta || null);
      setError(null);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e);
      setData(null);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfq_id, optsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, meta, isLoading, error, refetch: fetchData };
}
