// ArcCreateRoundPanel — ARC negotiation round creation.
//
// UNIFIED with RFQ: this drives the SAME wizard hook + field components as the
// RFQ create page (useCreateRoundState + StepVendorsAndTargets → NegotiationFieldsSelect
// + VendorChargeCard), so ARC negotiates the same rich set (base price, named
// charges, GST/tax targets, per-vendor overrides). ARC data is bridged into the
// module's product shape by arcNegotiationAdapter; the module's per-round payloads
// are folded into ARC's single `{end_date, products[]}` create call.
//
// Scope (step 1) is ARC-native (arc_v2 tokens); the rich fields step (step 2)
// and the review (step 3) are the shared RFQ components. The review used to be
// ARC-native too, with a bare deadline input and no floor: production
// ARC-2026-27-0006 opened eight rounds 4–64 minutes from their deadline and
// seven lapsed before approval. StepReview carries the 2 h floor, the remarks
// for approvers and a card per round with each vendor's targets.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import * as ArcApi from "@/services/arc_v2";
import { getChargeNames } from "@/services/rfq";
import useCreateRoundState from "@/components/dashboard/buyer/negotiation/create-round/useCreateRoundState";
import StepVendorsAndTargets from "@/components/dashboard/buyer/negotiation/create-round/StepVendorsAndTargets";
import StepReview from "@/components/dashboard/buyer/negotiation/create-round/StepReview";
import {
  ARC_WHOLE_SCOPE,
  normalizeArcProducts,
  buildArcCreatePayload,
} from "@/components/dashboard/buyer/negotiation/create-round/adapters/arcNegotiationAdapter";
import { getApiErrorMessage } from "@/utils/apiError";

const STEPS = [
  { idx: 1, label: "Scope" },
  { idx: 2, label: "Vendors & targets" },
  { idx: 3, label: "Review" },
];

const NON_TERMINAL = new Set(["PENDING_APPROVAL", "ACTIVE"]);
function computeBusy(rounds = []) {
  const busyItemIds = [];
  let arcLevelBusy = false;
  (rounds || []).forEach((r) => {
    if (!NON_TERMINAL.has(r.effective_status)) return;
    if (r.arc_item_id) {
      busyItemIds.push(Number(r.arc_item_id));
    } else if (r.products) {
      const prods = typeof r.products === "string" ? JSON.parse(r.products) : r.products;
      if (Array.isArray(prods)) {
        prods.forEach((p) => {
          if (p.is_arc_level) arcLevelBusy = true;
          else if (p.arc_item_id) busyItemIds.push(Number(p.arc_item_id));
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
  const [quotes, setQuotes] = useState([]);
  const [qualifiedMap, setQualifiedMap] = useState({});
  const [busyItemIds, setBusyItemIds] = useState([]);
  const [arcLevelBusy, setArcLevelBusy] = useState(false);
  const [chargeNamesList, setChargeNamesList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [queueExpanded, setQueueExpanded] = useState(false);
  const queueDropRef = useRef(null);

  // ARC data → RFQ-shaped products the shared module consumes.
  const products = useMemo(
    () => normalizeArcProducts({ items, quotes, qualifiedMap }),
    [items, quotes, qualifiedMap]
  );

  const wizard = useCreateRoundState({ products });

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
        const [evalRes, roundsRes, chargesRes] = await Promise.all([
          ArcApi.getCommEval(arcId),
          ArcApi.getArcNegotiationRounds(arcId),
          getChargeNames().catch(() => null),
        ]);
        if (cancelled) return;
        const payload = evalRes?.data || evalRes || {};
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setQuotes(Array.isArray(payload.quotes) ? payload.quotes : []);
        setQualifiedMap(payload.qualified_by_item || {});
        const rounds = Array.isArray(roundsRes?.data) ? roundsRes.data : (Array.isArray(roundsRes) ? roundsRes : []);
        const { busyItemIds: busy, arcLevelBusy: arcBusy } = computeBusy(rounds);
        setBusyItemIds(busy);
        setArcLevelBusy(arcBusy);
        const charges = chargesRes?.data || chargesRes || [];
        setChargeNamesList(Array.isArray(charges) ? charges : []);
      } catch (err) {
        if (!cancelled) setLoadError(getApiErrorMessage(err, "Failed to load ARC data"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [arcId]);

  const returnUrl = `/dashboard/buyer/rate-contracts/${arcId}?stage=commercial`;
  const handleCancel = useCallback(() => { router.push(returnUrl); }, [router, returnUrl]);

  // Scope helpers driven by the RFQ hook (mode 'rfq' = whole-ARC, 'product' = per-item).
  const isItemBusy = useCallback(
    (id) => busyItemIds.includes(Number(id)) || (wizard.queuedProductIds && wizard.queuedProductIds.has(Number(id))),
    [busyItemIds, wizard.queuedProductIds]
  );
  const wholeArcBlocked = arcLevelBusy || wizard.hasQueuedRfqRound;

  const canAddAnother = useMemo(() => {
    if (!wizard.canAddToQueue) return false;
    const moreItems = products.some((p) => Number(p.id) !== Number(wizard.selectedProductId) && !isItemBusy(p.id));
    return moreItems || (!wholeArcBlocked && wizard.mode !== "rfq");
  }, [wizard.canAddToQueue, wizard.selectedProductId, wizard.mode, products, isItemBusy, wholeArcBlocked]);

  const handleAddAnother = () => {
    if (!wizard.canAddToQueue) { toast.error("Pick vendors and set at least one target first."); return; }
    if (wizard.addCurrentToQueue()) toast.success("Entry added to the round");
  };

  const handleEditQueuedRound = (idx) => {
    if (wizard.hasCurrentRound) {
      if (!wizard.canAddToQueue) {
        toast.error("Finish or cancel your current selection before editing a queued entry.");
        return;
      }
      if (!wizard.addCurrentToQueue()) {
        toast.error("Could not park the current entry — check its targets.");
        return;
      }
    }
    if (!wizard.editQueuedRound(idx)) toast.error("This entry can’t be edited — remove and re-add it instead.");
  };

  const handleSubmit = async () => {
    if (!wizard.canSubmit) {
      toast.error((wizard.step3Errors && wizard.step3Errors[0]) || "Please complete the round before submitting.");
      return;
    }
    const rounds = [...wizard.queuedRounds];
    const current = wizard.buildCurrentRoundPayload();
    if (current?.payload) rounds.push(current.payload);
    const payload = buildArcCreatePayload(rounds, wizard.endDateUtc, wizard.roundRemarks);
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
      /* interceptor toasts */
    } finally {
      setSubmitting(false);
    }
  };

  const currentEntries = wizard.queuedRounds.length + (wizard.hasCurrentRound && wizard.canGoToStep3 ? 1 : 0);
  const primaryLabel = wizard.step === 3
    ? (submitting ? "Creating…" : `Create Round${currentEntries > 1 ? ` (${currentEntries})` : ""}`)
    : "Next";
  const primaryDisabled = useMemo(() => {
    if (submitting) return true;
    if (wizard.step === 1) return !wizard.canGoToStep2;
    if (wizard.step === 2) return !wizard.canGoToStep3;
    if (wizard.step === 3) return !wizard.canSubmit;
    return false;
  }, [wizard.step, wizard.canGoToStep2, wizard.canGoToStep3, wizard.canSubmit, submitting]);

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
            {wizard.queuedRounds.length > 0 && (
              <div style={{ position: "relative" }} ref={queueDropRef}>
                <button className="arc-neg-queue-chip" onClick={() => setQueueExpanded((v) => !v)}>
                  Queue ({wizard.queuedRounds.length})<span>{queueExpanded ? "▴" : "▾"}</span>
                </button>
                {queueExpanded && (
                  <ul className="arc-neg-queue-list" style={{ listStyle: "none", margin: 0, padding: 6 }}>
                    {wizard.queuedRounds.map((entry, idx) => (
                      <li key={idx} className="arc-neg-queue-list-item">
                        <span className="arc-neg-queue-item-name">{entry.productName || (entry.mode === "rfq" ? "ARC-level" : "Item")}</span>
                        <span className="arc-neg-queue-item-meta">{entry.summary?.vendorCount || 0} vendor{entry.summary?.vendorCount === 1 ? "" : "s"}</span>
                        <button className="arc-neg-queue-item-remove" onClick={() => wizard.removeFromQueue(idx)} disabled={submitting} title="Remove">
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
            Pick a scope, choose vendors and set targets on any field (price, charges, GST), then send the round for approval.
          </div>
        </div>

        {/* Stepper — badges are navigable: any completed step, plus Review whenever
            there's a queued entry (so a queue-only round can still reach submit). */}
        <div className="arc-neg-stepper" role="list">
          {STEPS.map((s, i) => {
            const isActive = wizard.step === s.idx;
            const isDone = wizard.step > s.idx;
            const canJump = s.idx <= wizard.step || (s.idx === 3 && wizard.queuedRounds.length > 0);
            return (
              <div key={s.idx} style={{ display: "flex", alignItems: "center" }}>
                <div
                  className="arc-neg-step-item"
                  role="listitem"
                  onClick={() => { if (canJump && !submitting) wizard.goToStep(s.idx); }}
                  style={{ cursor: canJump && !submitting ? "pointer" : "default" }}
                >
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

        {/* STEP 1 — Scope (ARC-native) */}
        {wizard.step === 1 && (
          <div className="section-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Choose what to negotiate</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginBottom: 14 }}>
              Negotiate a single item, or the whole ARC (per-vendor across all their items).
            </div>

            {/* Whole-ARC */}
            <button
              type="button"
              className={"section-card" + (wizard.mode === "rfq" ? " is-selected" : "")}
              onClick={() => !wholeArcBlocked && wizard.setMode("rfq")}
              disabled={wholeArcBlocked}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 12,
                cursor: wholeArcBlocked ? "not-allowed" : "pointer", opacity: wholeArcBlocked ? 0.55 : 1,
                borderColor: wizard.mode === "rfq" ? "var(--primary)" : "var(--border)",
                background: wizard.mode === "rfq" ? "var(--primary-soft)" : "var(--surface)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>Whole ARC</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
                {wholeArcBlocked ? "A whole-ARC round is already in flight or queued." : "One round targeting every invited vendor across all their items."}
              </div>
            </button>

            {/* Per-item grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {products.map((p) => {
                const busy = isItemBusy(p.id);
                const selected = wizard.mode === "product" && Number(wizard.selectedProductId) === Number(p.id);
                const vendorCount = (p.product_vendors || []).length;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !busy && wizard.handleSelectProduct(p.id)}
                    disabled={busy}
                    className="section-card"
                    style={{
                      textAlign: "left", padding: "11px 13px", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.55 : 1,
                      borderColor: selected ? "var(--primary)" : "var(--border)",
                      background: selected ? "var(--primary-soft)" : "var(--surface)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.product_details?.[0]?.name || `Item ${p.id}`}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
                      {busy ? "In an active round" : `${vendorCount} vendor${vendorCount === 1 ? "" : "s"} available`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — Vendors & targets (SHARED RFQ component) */}
        {wizard.step === 2 && (
          <StepVendorsAndTargets
            product={wizard.selectedProduct}
            productPriceData={wizard.productPriceData}
            selectedVendorIds={wizard.selectedVendorIds}
            onVendorToggle={wizard.toggleVendor}
            onSelectAllVendors={wizard.selectAllVendorsExplicit}
            onDeselectAllVendors={wizard.deselectAllVendors}
            vendorTargets={wizard.vendorTargets}
            setVendorTargets={wizard.setVendorTargets}
            formData={wizard.formData}
            updateFormData={wizard.updateFormData}
            toggleNegotiationField={wizard.toggleNegotiationField}
            showTargetWarning={wizard.showTargetWarning}
            step2Errors={wizard.step2Errors}
            chargeNamesList={chargeNamesList}
            mode={wizard.mode}
          />
        )}

        {/* STEP 3 — Review (SHARED RFQ component) */}
        {wizard.step === 3 && (
          <>
            <StepReview
              product={wizard.selectedProduct}
              productPriceData={wizard.productPriceData}
              selectedVendorIds={wizard.selectedVendorIds}
              vendorTargets={wizard.vendorTargets}
              formData={wizard.formData}
              updateFormData={wizard.updateFormData}
              effectiveFields={wizard.effectiveFields}
              products={products}
              queuedRounds={wizard.queuedRounds}
              endDateError={wizard.endDateError}
              step3Errors={wizard.step3Errors}
              onEditProduct={() => wizard.goToStep(1)}
              onEditVendors={() => wizard.goToStep(2)}
              onRemoveQueuedRound={wizard.removeFromQueue}
              onEditQueuedRound={handleEditQueuedRound}
              chargeNamesList={chargeNamesList}
              mode={wizard.mode}
              remarks={wizard.roundRemarks}
              onRemarksChange={wizard.setRoundRemarks}
              wholeScope={ARC_WHOLE_SCOPE}
            />
            {canAddAnother && (
              <button className="btn btn-secondary btn-sm" onClick={handleAddAnother} disabled={submitting} style={{ marginTop: 12 }}>
                + Add another entry
              </button>
            )}
          </>
        )}
      </div>

      {/* Sticky footer */}
      <div className="arc-neg-footer">
        <div className="arc-neg-footer-info">
          <span style={{ fontWeight: 600, color: "var(--fg)" }}>Step {wizard.step} of 3</span>
          {wizard.step === 3 && currentEntries > 0 && (
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>· {currentEntries} entr{currentEntries === 1 ? "y" : "ies"} to submit</span>
          )}
        </div>
        <div className="arc-neg-footer-actions">
          {wizard.step > 1 && (
            <button className="btn btn-secondary btn-sm" onClick={wizard.goBack} disabled={submitting}>Back</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleCancel} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={wizard.step === 3 ? handleSubmit : wizard.goNext} disabled={primaryDisabled}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
