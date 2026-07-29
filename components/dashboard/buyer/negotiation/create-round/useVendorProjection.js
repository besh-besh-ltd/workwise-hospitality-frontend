import { useEffect, useMemo, useRef, useState } from 'react';
import { previewTotals } from '@/services/pricing';
import { buildPreviewItem } from './buildPreviewItems';

const DEBOUNCE_MS = 300;

// Reads the response from the /pricing/preview endpoint. Backend wraps as
// `{ status, message, data: { lines: [...], grand_subtotal, ... } }` but
// older callers also see the lines at the top level — accept both.
const readLines = (response) => {
  if (!response) return [];
  if (Array.isArray(response.lines)) return response.lines;
  if (Array.isArray(response?.data?.lines)) return response.data.lines;
  return [];
};

const readSubtotal = (line) => {
  if (!line) return null;
  const cands = [line.subtotal, line.total, line.line_subtotal, line.grand_total];
  for (const c of cands) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
};

// Hook that projects post-target line subtotals for the supplied vendors via
// the backend's /pricing/preview engine. Batches every vendor that actually
// has a target delta into one debounced POST.
//
// Returns:
//   projectionMap[vendorId] = { value, originalValue, delta, deltaPct, direction, isUnchanged }
//   isLoading                — true while a preview is in flight
export default function useVendorProjection({
  vendors = [],            // [{ id, vendorQuoteData, quotedTotal, isExpanded, isSelected }]
  formData,
  vendorTargets,
  globalSelectedFields,
  chargeNamesList,
}) {
  // Build the request shape. Only vendors that are selected, currently
  // expanded, and have any target delta participate in the POST.
  const { items, projectableVendorIds } = useMemo(() => {
    const localItems = [];
    const ids = [];
    vendors.forEach((v) => {
      if (!v.isSelected || !v.isExpanded) return;
      const item = buildPreviewItem({
        vendorQuoteData: v.vendorQuoteData,
        vendorId: v.id,
        formData,
        vendorTargets,
        globalSelectedFields,
        chargeNamesList,
      });
      if (!item) return;
      localItems.push(item);
      ids.push(v.id);
    });
    return { items: localItems, projectableVendorIds: ids };
  }, [vendors, formData, vendorTargets, globalSelectedFields, chargeNamesList]);

  const [projectionMap, setProjectionMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  // Clear stale projections for vendors that are no longer projectable so a
  // collapsed/cleared vendor doesn't keep showing yesterday's number.
  useEffect(() => {
    setProjectionMap((prev) => {
      const projectable = new Set(projectableVendorIds);
      const next = {};
      Object.keys(prev).forEach((vid) => {
        if (projectable.has(Number(vid)) || projectable.has(vid)) {
          next[vid] = prev[vid];
        }
      });
      return next;
    });
  }, [projectableVendorIds]);

  useEffect(() => {
    if (items.length === 0) {
      setIsLoading(false);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await previewTotals({ items });
        if (requestId !== requestIdRef.current) return;
        const lines = readLines(response);
        const updates = {};
        projectableVendorIds.forEach((vid, idx) => {
          const projected = readSubtotal(lines[idx]);
          if (projected == null) return;
          const original = vendors.find(v => v.id === vid)?.quotedTotal || 0;
          const delta = projected - original;
          const deltaPct = original > 0 ? (delta / original) * 100 : 0;
          updates[vid] = {
            value: projected,
            originalValue: original,
            delta,
            deltaPct,
            direction: Math.abs(delta) < 0.01 ? 'flat' : (delta < 0 ? 'down' : 'up'),
            isUnchanged: Math.abs(delta) < 0.01,
          };
        });
        setProjectionMap((prev) => ({ ...prev, ...updates }));
      } catch {
        // Swallow — projection is a presentation aid, not a gate.
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // We intentionally depend on `items` (its identity changes only when
    // useMemo above re-fires) and the vendor row metadata that maps subtotals
    // back to ids. eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, projectableVendorIds, vendors]);

  return { projectionMap, isLoading };
}
