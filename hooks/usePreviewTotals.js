import { useEffect, useRef, useState } from "react";
import { previewTotals } from "@/services/pricing";

const DEBOUNCE_MS = 300;

// Returns { totals, isLoading, error } for a draft pricing payload.
//
// The hook debounces input changes (300ms) so rapid typing in unit_price /
// charge fields doesn't fire a request per keystroke. In-flight responses
// from a stale draft are discarded — only the latest debounced payload's
// response is committed to state.
//
// `draft` should be memoised by the caller so the same logical payload doesn't
// retrigger on unrelated re-renders.
export default function usePreviewTotals(draft) {
  const [totals, setTotals] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!draft || !Array.isArray(draft.items)) {
      setTotals(null);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await previewTotals(draft);
        if (requestId !== requestIdRef.current) return; // stale
        setTotals(response?.data || null);
        setError(null);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e);
        setTotals(null);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [JSON.stringify(draft)]);

  return { totals, isLoading, error };
}
