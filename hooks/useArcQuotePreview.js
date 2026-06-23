import { useEffect, useRef, useState } from "react";
import { vendorPreviewQuote } from "@/services/arc_v2";

const DEFAULT_DEBOUNCE_MS = 600;

// Phase 2 — ARC-scoped quote preview hook.
//
// Mirrors usePreviewTotals but calls the ARC preview endpoint which:
//   (a) verifies vendor invitation server-side (security)
//   (b) re-derives qty from tbl_arc_item (never trusts client qty)
//   (c) runs pricingEngine.calculateDocumentTotals for all lines
//
// `draft` shape: { arc_id, lines: [...], global_charges?: [...] }
// Debounce default 600ms (longer than RFQ; ARC preview is heavier — qty lookup).
//
// Returns { preview, isLoading, error } where:
//   preview: { lines:[{arc_item_id,base,base_tax,charges,charges_total,total}],
//              grand_subtotal, global_charges, global_charges_total, grand_total }
//   isLoading: boolean
//   error: any
//
// Usage:
//   const previewDraft = useMemo(() => ({ arc_id, lines: items.map(...) }), [price, items, arc_id]);
//   const { preview, isLoading } = useArcQuotePreview(previewDraft);
export default function useArcQuotePreview(draft, options = {}) {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!draft || !draft.arc_id || !Array.isArray(draft.lines) || draft.lines.length === 0) {
      setPreview(null);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await vendorPreviewQuote(draft);
        if (requestId !== requestIdRef.current) return; // stale — discard
        setPreview(response?.data || null);
        setError(null);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e);
        setPreview(null);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(draft), debounceMs]);

  return { preview, isLoading, error };
}
