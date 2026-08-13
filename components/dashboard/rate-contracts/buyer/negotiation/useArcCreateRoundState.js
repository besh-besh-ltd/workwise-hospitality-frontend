// useArcCreateRoundState — wizard state machine for ARC negotiation round creation.
// Mirrors useCreateRoundState.js (RFQ) but drastically simplified:
//   - No charge slugs / projection / tax
//   - scope = 'item' (one arc_item_id) | 'arc' (whole-ARC, is_arc_level:true)
//   - per-vendor target = ONE optional numeric "target rate"
//   - buildPayload() → { end_date, products:[] } for createArcNegotiationRound
import { useCallback, useMemo, useState } from "react";
import { parseLocalDateTimeInput } from "@/utils/negotiationTime";

// The control holds LOCAL wall clock; the API wants an instant.
function toUtcEndDate(localDatetimeStr) {
  const d = parseLocalDateTimeInput(localDatetimeStr);
  return d ? d.toISOString() : null;
}

export default function useArcCreateRoundState({ items = [], vendors = [], qualifiedMap = {}, busyItemIds = [], arcLevelBusy = false } = {}) {
  const [step, setStep] = useState(1);
  const [level, setLevelState] = useState("item"); // 'item' | 'arc'
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [vendorTargets, setVendorTargetsState] = useState({}); // { [vid]: string }
  const [endDate, setEndDate] = useState(""); // datetime-local string
  const [queue, setQueue] = useState([]); // Entry[]

  // ── derived ──────────────────────────────────────────────────────────
  const queuedItemIds = useMemo(
    () => new Set(queue.filter((e) => e.kind === "item").map((e) => e.arc_item_id)),
    [queue]
  );
  const hasQueuedArcLevel = useMemo(() => queue.some((e) => e.kind === "arc"), [queue]);

  // Eligible vendors for the current scope selection.
  // item-level: vendors with a non-disqualified line for the item AND technically qualified.
  // arc-level: all vendors with ≥1 line (any item).
  const eligibleVendors = useMemo(() => {
    if (level === "arc") {
      // all vendors who have at least one line
      return vendors;
    }
    if (!selectedItemId) return [];
    const allowed = qualifiedMap[selectedItemId];
    return vendors.filter((v) => {
      const line = v.lines && v.lines.find((l) => l.arc_item_id === selectedItemId);
      if (!line || line.disqualified) return false;
      if (allowed && !allowed.includes(Number(v.vendor_id))) return false;
      return true;
    });
  }, [level, selectedItemId, vendors, qualifiedMap]);

  const canGoStep2 = level === "arc" || !!selectedItemId;
  const canGoStep3 = selectedVendorIds.length > 0;
  const canAddToQueue = selectedVendorIds.length > 0;
  const canSubmit = !!endDate && (queue.length > 0 || (canGoStep2 && canGoStep3));

  // ── actions ───────────────────────────────────────────────────────────
  const setLevel = useCallback((nextLevel) => {
    setLevelState(nextLevel);
    setSelectedItemId(null);
    setSelectedVendorIds([]);
    setVendorTargetsState({});
  }, []);

  const selectItem = useCallback((id) => {
    setLevelState("item");
    setSelectedItemId(id);
    // Auto-select all eligible vendors for this item (mirror useCreateRoundState:67-87)
    // (eligibleVendors not yet updated at call time so compute inline)
    setSelectedVendorIds((prev) => {
      // Just reset — eligibleVendors will be derived; caller can re-selectAll if needed
      void prev;
      return [];
    });
    setVendorTargetsState({});
  }, []);

  // Separately: auto-select eligible vendors after item pick (called by ArcStepItem)
  const autoSelectEligibleVendors = useCallback((eligVendors) => {
    setSelectedVendorIds(eligVendors.map((v) => v.vendor_id));
  }, []);

  const toggleVendor = useCallback((vid) => {
    setSelectedVendorIds((prev) => {
      const idx = prev.indexOf(vid);
      if (idx >= 0) { const next = [...prev]; next.splice(idx, 1); return next; }
      return [...prev, vid];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedVendorIds(eligibleVendors.map((v) => v.vendor_id));
  }, [eligibleVendors]);

  const deselectAll = useCallback(() => setSelectedVendorIds([]), []);

  const setVendorTarget = useCallback((vid, value) => {
    setVendorTargetsState((prev) => ({ ...prev, [vid]: value }));
  }, []);

  // Build a queue entry from current state.
  const _buildCurrentEntry = useCallback(() => {
    const vtList = selectedVendorIds.map((vid) => {
      const raw = vendorTargets[vid];
      const n = raw !== undefined && raw !== "" ? Number(raw) : null;
      return n !== null && Number.isFinite(n) ? { vendor_id: vid, target_rate: n } : { vendor_id: vid };
    });
    if (level === "arc") {
      const label = "ARC-level";
      return { kind: "arc", vendor_targets: vtList, _label: label, _vendorCount: vtList.length };
    }
    const item = items.find((it) => (it.id || it.arc_item_id) === selectedItemId);
    const label = item ? (item.variant_name || item.name || item.title || `Item ${selectedItemId}`) : `Item ${selectedItemId}`;
    return { kind: "item", arc_item_id: selectedItemId, vendor_targets: vtList, _label: label, _vendorCount: vtList.length };
  }, [level, selectedItemId, selectedVendorIds, vendorTargets, items]);

  const addCurrentToQueue = useCallback(() => {
    if (!canAddToQueue) return false;
    const entry = _buildCurrentEntry();
    setQueue((prev) => [...prev, entry]);
    // Reset scope but keep endDate
    setLevelState("item");
    setSelectedItemId(null);
    setSelectedVendorIds([]);
    setVendorTargetsState({});
    setStep(1);
    return true;
  }, [canAddToQueue, _buildCurrentEntry]);

  const removeFromQueue = useCallback((idx) => {
    setQueue((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const editQueuedEntry = useCallback((idx) => {
    const entry = queue[idx];
    if (!entry) return false;
    setQueue((prev) => prev.filter((_, i) => i !== idx));
    if (entry.kind === "arc") {
      setLevelState("arc");
      setSelectedItemId(null);
    } else {
      setLevelState("item");
      setSelectedItemId(entry.arc_item_id);
    }
    const vids = (entry.vendor_targets || []).map((vt) => vt.vendor_id);
    setSelectedVendorIds(vids);
    const targets = {};
    (entry.vendor_targets || []).forEach((vt) => {
      if (vt.target_rate != null) targets[vt.vendor_id] = String(vt.target_rate);
    });
    setVendorTargetsState(targets);
    setStep(2);
    return true;
  }, [queue]);

  const clearQueue = useCallback(() => setQueue([]), []);

  const goNext = useCallback(() => {
    if (step === 1 && canGoStep2) setStep(2);
    else if (step === 2 && canGoStep3) setStep(3);
  }, [step, canGoStep2, canGoStep3]);

  const goBack = useCallback(() => setStep((p) => Math.max(1, p - 1)), []);
  const goToStep = useCallback((t) => setStep(t), []);

  // Build the final POST payload.
  // Mirror spec: { end_date: UTC ISO, products: [...queue, currentIfValid].map(toProduct) }
  const buildPayload = useCallback(() => {
    const endDateUtc = toUtcEndDate(endDate);
    const toProduct = (e) => e.kind === "arc"
      ? { is_arc_level: true, vendor_targets: e.vendor_targets }
      : { arc_item_id: e.arc_item_id, vendor_targets: e.vendor_targets };

    const allEntries = [...queue];
    // Include the current in-progress entry if it's valid (has vendors selected)
    if (canGoStep2 && selectedVendorIds.length > 0) {
      allEntries.push(_buildCurrentEntry());
    }

    return {
      end_date: endDateUtc,
      products: allEntries.map(toProduct),
    };
  }, [endDate, queue, canGoStep2, selectedVendorIds, _buildCurrentEntry]);

  return {
    // state
    step,
    level,
    selectedItemId,
    selectedVendorIds,
    vendorTargets,
    endDate,
    queue,
    // derived
    eligibleVendors,
    queuedItemIds,
    hasQueuedArcLevel,
    canGoStep2,
    canGoStep3,
    canAddToQueue,
    canSubmit,
    // actions
    setLevel,
    selectItem,
    autoSelectEligibleVendors,
    toggleVendor,
    selectAll,
    deselectAll,
    setVendorTarget,
    setEndDate,
    addCurrentToQueue,
    removeFromQueue,
    editQueuedEntry,
    clearQueue,
    goNext,
    goBack,
    goToStep,
    buildPayload,
  };
}
