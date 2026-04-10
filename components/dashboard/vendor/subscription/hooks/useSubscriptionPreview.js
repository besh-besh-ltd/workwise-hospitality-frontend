import { useState, useEffect, useRef } from "react";
import { previewSubscriptionModification } from "@/services/subscription";

const useSubscriptionPreview = (targetCategories, targetSubcategories, targetHotels, enabled) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setPreview(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Debounce 400ms
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort?.();

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      try {
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await previewSubscriptionModification({
          target_categories: targetCategories,
          target_subcategories: targetSubcategories,
          target_hotels: targetHotels
        });
        if (res?.status === 1) {
          setPreview(res.data);
          setError(null);
        } else {
          setPreview(null);
          setError(res?.message || "Preview failed");
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setPreview(null);
          setError(err?.response?.data?.message || err?.message || "Preview failed");
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    JSON.stringify(targetCategories),
    JSON.stringify(targetSubcategories),
    JSON.stringify(targetHotels),
    enabled
  ]);

  return { preview, loading, error };
};

export default useSubscriptionPreview;
