import { useState, useCallback, useEffect } from "react";
import { getVendorSubscriptionSummary } from "@/services/subscription";

const useSubscriptionData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getVendorSubscriptionSummary();
      if (res?.status === 1) {
        setData(res.data);
      } else {
        setError(res?.message || "Failed to load subscription data");
      }
    } catch (err) {
      setError(err?.message || "Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
};

export default useSubscriptionData;
