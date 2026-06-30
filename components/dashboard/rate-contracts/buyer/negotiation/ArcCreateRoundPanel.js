// ArcCreateRoundPanel — routed wizard host for creating an ARC negotiation round.
// Mirrors CreateRoundPage.js: 3-step stepper, queue chip, sticky footer.
// Renders ArcStepItem → ArcStepVendorsTargets → ArcStepReview.
// Uses arc_v2.css tokens only (no RFQ CreateRound.module.scss).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";
import useArcCreateRoundState from "./useArcCreateRoundState";
import ArcStepItem from "./ArcStepItem";
import ArcStepVendorsTargets from "./ArcStepVendorsTargets";
import ArcStepReview from "./ArcStepReview";

const STEPS = [
  { idx: 1, label: "Scope" },
  { idx: 2, label: "Vendors & targets" },
  { idx: 3, label: "Review" },
];

function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return "₹" + Math.round(Number(n)).toLocaleString("en-IN");
}

function toNum(n) { const v = Number(n); return Number.isFinite(v) ? v : 0; }

// Replicate CommercialStage vendors useMemo mapping from quotes
function buildVendors(quotes = []) {
  const map = new Map();
  quotes.forEach((q) => {
    const vid = q.vendor_id;
    if (!map.has(vid)) {
      map.set(vid, { vendor_id: vid, vendor_name: q.vendor_name || `Vendor ${vid}`, lines: [] });
    }
    map.get(vid).lines.push({
      arc_item_id: q.arc_item_id,
      rate: q.rate == null ? null : toNum(q.rate),
      gst_pct: toNum(q.gst_pct),
      charges: toNum(q.charges),
      disqualified: !!q.technically_disqualified,
    });
  });
  return Array.from(map.values());
}

// Compute busyItemIds and arcLevelBusy from existing rounds
const NON_TERMINAL = new Set(["PENDING_APPROVAL", "ACTIVE"]);
function computeBusy(rounds = []) {
  const busyItemIds = [];
  let arcLevelBusy = false;
  rounds.forEach((r) => {
    if (!NON_TERMINAL.has(r.effective_status)) return;
    if (r.arc_item_id) {
      busyItemIds.push(r.arc_item_id);
    } else if (r.products) {
      // Multi-entry round
      const prods = typeof r.products === "string" ? JSON.parse(r.products) : r.products;
      if (Array.isArray(prods)) {
        prods.forEach((p) => {
          if (p.is_arc_level) arcLevelBusy = true;
          else if (p.arc_item_id) busyItemIds.push(p.arc_item_id);
        });
      }
    } else {
      arcLevelBusy = true;
    }
  });
  return { busyItemIds, arcLevelBusy };
}

export default function ArcCreateRoundPanel({ arcId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [qualifiedMap, setQualifiedMap] = useState({});
  const [busyItemIds, setBusyItemIds] = useState([]);
  const [arcLevelBusy, setArcLevelBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [queueExpanded, setQueueExpanded] = useState(false);
  const queueDropRef = useRef(null);

  const wizard = useArcCreateRoundState({ items, vendors, qualifiedMap, busyItemIds, arcLevelBusy });

  // Close queue dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (queueDropRef.current && !queueDropRef.current.contains(e.target)) setQueueExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!arcId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [evalRes, roundsRes] = await Promise.all([
          ArcApi.getCommEval(arcId),
          ArcApi.getArcNegotiationRounds(arcId),
        ]);
        if (cancelled) return;
        const payload = evalRes?.data || evalRes || {};
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setVendors(buildVendors(Array.isArray(payload.quotes) ? payload.quotes : []));
        setQualifiedMap(payload.qualified_by_item || {});
        const rounds = Array.isArray(roundsRes?.data) ? roundsRes.data : (Array.isArray(roundsRes) ? roundsRes : []);
        const { busyItemIds: busy, arcLevelBusy: arcBusy } = computeBusy(rounds);
        setBusyItemIds(busy);
        setArcLevelBusy(arcBusy);
      } catch (err) {
        if (!cancelled) setLoadError(err?.message || "Failed to load ARC data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [arcId]);

  const returnUrl = `/dashboard/buyer/rate-contracts/${arcId}?stage=commercial`;

  const handleCancel = useCallback(() => {
    router.push(returnUrl);
  }, [router, returnUrl]);

  // After item pick in step 1, auto-select eligible vendors
  const handleSelectItem = useCallback((id) => {
    wizard.selectItem(id);
    // We need to wait for eligibleVendors to update — do it after state settles
    // Actually we can compute inline here since we have the data
  }, [wizard]);

  // When item is selected and eligibleVendors changes, auto-select them
  const prevItemIdRef = useRef(null);
  useEffect(() => {
    if (wizard.selectedItemId && wizard.selectedItemId !== prevItemIdRef.current) {
      prevItemIdRef.current = wizard.selectedItemId;
      wizard.autoSelectEligibleVendors(wizard.eligibleVendors);
    }
    if (wizard.level === "arc" && wizard.selectedItemId === null && prevItemIdRef.current !== null) {
      prevItemIdRef.current = null;
    }
  }, [wizard.selectedItemId, wizard.eligibleVendors, wizard.level]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!wizard.canSubmit) {
      if (!wizard.endDate) toast.error("Set an end date for the round.");
      return;
    }
    const payload = wizard.buildPayload();
    if (!payload.products || !payload.products.length) {
      toast.error("Nothing to submit — add at least one entry.");
      return;
    }
    setSubmitting(true);
    try {
      await ArcApi.createArcNegotiationRound(arcId, payload);
      toast.success(
        payload.products.length === 1
          ? "Negotiation round created"
          : `Negotiation round created covering ${payload.products.length} entries`
      );
      wizard.clearQueue();
      router.push(returnUrl);
    } catch (e) {
      /* interceptor toasts the error */
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    if (!wizard.canAddToQueue) {
      toast.error("Select vendors before adding to queue.");
      return;
    }
    const ok = wizard.addCurrentToQueue();
    if (ok) {
      toast.success("Entry added to queue");
    }
  };

  // Can we add another entry? (more items available that aren't busy/queued)
  const canAddAnother = useMemo(() => {
    const availableItems = items.filter((it) => {
      const id = it.id || it.arc_item_id;
      return !busyItemIds.includes(id) && !(wizard.queuedItemIds && wizard.queuedItemIds.has(id));
    });
    return availableItems.length > 0 && !wizard.hasQueuedArcLevel;
  }, [items, busyItemIds, wizard.queuedItemIds, wizard.hasQueuedArcLevel]);

  const primaryLabel = wizard.step === 3
    ? (submitting ? "Creating…" : `Create Round${(wizard.queue.length + 1) > 1 ? ` (${wizard.queue.length + 1})` : ""}`)
    : "Next";

  const primaryDisabled = useMemo(() => {
    if (submitting) return true;
    if (wizard.step === 1) return !wizard.canGoStep2;
    if (wizard.step === 2) return !wizard.canGoStep3;
    if (wizard.step === 3) return !wizard.canSubmit;
    return false;
  }, [wizard.step, wizard.canGoStep2, wizard.canGoStep3, wizard.canSubmit, submitting]);

  if (loading) {
    return (
      <main className="main-body">
        <div className="arc-neg-page">
          <div className="empty-state">
            <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
            <span style={{ marginLeft: 10 }}>Loading ARC data…</span>
          </div>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="main-body">
        <div className="arc-neg-page">
          <div className="empty-state">
            <p style={{ fontWeight: 700 }}>Unable to load ARC data</p>
            <p style={{ fontSize: 13 }}>{loadError}</p>
            <button className="btn btn-secondary" onClick={handleCancel} style={{ marginTop: 12 }}>Back</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-body" style={{ paddingBottom: 80 }}>
      <div className="arc-neg-page">
        {/* Hero */}
        <div className="arc-neg-page-hero">
          <div className="arc-neg-page-eyebrow">New negotiation round</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="arc-neg-page-title">Create a round</h1>
            {/* Queue chip */}
            {wizard.queue.length > 0 && (
              <div style={{ position: "relative" }} ref={queueDropRef}>
                <button
                  className="arc-neg-queue-chip"
                  onClick={() => setQueueExpanded((v) => !v)}
                >
                  Queue ({wizard.queue.length})
                  <span>{queueExpanded ? "▴" : "▾"}</span>
                </button>
                {queueExpanded && (
                  <ul className="arc-neg-queue-list" style={{ listStyle: "none", margin: 0, padding: 6 }}>
                    {wizard.queue.map((entry, idx) => (
                      <li key={idx} className="arc-neg-queue-list-item">
                        <span className="arc-neg-queue-item-name">{entry._label || (entry.kind === "arc" ? "ARC-level" : `Item ${entry.arc_item_id}`)}</span>
                        <span className="arc-neg-queue-item-meta">{entry._vendorCount || 0} vendor{entry._vendorCount === 1 ? "" : "s"}</span>
                        <button
                          className="arc-neg-queue-item-remove"
                          onClick={() => wizard.removeFromQueue(idx)}
                          disabled={submitting}
                          title="Remove"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
            Pick a scope, choose vendors and set optional target rates, then send the round for approval.
          </div>
        </div>

        {/* Stepper */}
        <div className="arc-neg-stepper" role="list">
          {STEPS.map((s, i) => {
            const isActive = wizard.step === s.idx;
            const isDone = wizard.step > s.idx;
            return (
              <div key={s.idx} style={{ display: "flex", alignItems: "center" }}>
                <div className="arc-neg-step-item" role="listitem">
                  <div className={"arc-neg-step-badge" + (isActive ? " active" : isDone ? " done" : "")}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : s.idx}
                  </div>
                  <div className={"arc-neg-step-label" + (isActive ? " active" : "")}>{s.label}</div>
                </div>
                {i < STEPS.length - 1 && <div className="arc-neg-step-connector" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        {wizard.step === 1 && (
          <ArcStepItem
            items={items}
            vendors={vendors}
            qualifiedMap={qualifiedMap}
            busyItemIds={busyItemIds}
            arcLevelBusy={arcLevelBusy}
            level={wizard.level}
            selectedItemId={wizard.selectedItemId}
            queuedItemIds={wizard.queuedItemIds}
            hasQueuedArcLevel={wizard.hasQueuedArcLevel}
            onSelectLevel={(lv) => { wizard.setLevel(lv); if (lv === "arc") wizard.autoSelectEligibleVendors(wizard.eligibleVendors); }}
            onSelectItem={handleSelectItem}
            eligibleVendors={wizard.eligibleVendors}
            onAutoSelectVendors={wizard.autoSelectEligibleVendors}
          />
        )}

        {wizard.step === 2 && (
          <ArcStepVendorsTargets
            level={wizard.level}
            selectedItemId={wizard.selectedItemId}
            items={items}
            eligibleVendors={wizard.eligibleVendors}
            selectedVendorIds={wizard.selectedVendorIds}
            vendorTargets={wizard.vendorTargets}
            onToggleVendor={wizard.toggleVendor}
            onSelectAll={wizard.selectAll}
            onDeselectAll={wizard.deselectAll}
            onSetVendorTarget={wizard.setVendorTarget}
          />
        )}

        {wizard.step === 3 && (
          <ArcStepReview
            level={wizard.level}
            selectedItemId={wizard.selectedItemId}
            items={items}
            vendors={vendors}
            eligibleVendors={wizard.eligibleVendors}
            selectedVendorIds={wizard.selectedVendorIds}
            vendorTargets={wizard.vendorTargets}
            endDate={wizard.endDate}
            onSetEndDate={wizard.setEndDate}
            queue={wizard.queue}
            onEditQueueEntry={wizard.editQueuedEntry}
            onRemoveQueueEntry={wizard.removeFromQueue}
            onAddAnother={handleAddAnother}
            canAddAnother={canAddAnother}
            submitting={submitting}
          />
        )}
      </div>

      {/* Sticky footer */}
      <div className="arc-neg-footer">
        <div className="arc-neg-footer-info">
          <span style={{ fontWeight: 600, color: "var(--fg)" }}>Step {wizard.step} of 3</span>
          {wizard.step === 3 && (wizard.queue.length + (wizard.selectedVendorIds.length > 0 ? 1 : 0)) > 0 && (
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
              · {wizard.queue.length + (wizard.selectedVendorIds.length > 0 ? 1 : 0)} entr{(wizard.queue.length + (wizard.selectedVendorIds.length > 0 ? 1 : 0)) === 1 ? "y" : "ies"} to submit
            </span>
          )}
        </div>
        <div className="arc-neg-footer-actions">
          {wizard.step > 1 && (
            <button className="btn btn-secondary btn-sm" onClick={wizard.goBack} disabled={submitting}>
              Back
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={wizard.step === 3 ? handleSubmit : wizard.goNext}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
