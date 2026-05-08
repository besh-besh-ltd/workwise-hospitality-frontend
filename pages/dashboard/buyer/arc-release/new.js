import Head from "next/head";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { AuthGuard } from "@/utils/authGuard";
import { getEligibleArcVendors, createArcRelease, getArcReleasePricing } from "@/services/arc";
import { getApprovalProcesses } from "@/services/process";
import s from "./new.module.scss";

// Phase 7 FE — ARC Release wizard.
//
// Entry: /dashboard/buyer/arc-release/new?arc_id=&arc_item_id=&hotel_id=
// (the contracted-item modal in the product search page redirects here
// with these query params pre-filled).
//
// Three steps:
//   1. Vendor select  — when multiple vendors hold the same contract
//                       on the (hotel, product), let the buyer pick.
//                       (Auto-skipped when only one is eligible.)
//   2. Quantity entry — single field; price is bound by the contract.
//   3. Review         — confirms vendor, hotel, qty, line total. Submit
//                       creates the release + drafts the Contracted PO.
// On success: toast + navigate to the drafted PO.
//
// Bespoke styling, no Bootstrap.

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const ArcReleaseNewPage = () => {
  const router = useRouter();
  const { arc_id, arc_item_id, hotel_id } = router.query;

  const [eligible, setEligible] = useState([]); // every vendor for the (hotel, product)
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedArcId, setSelectedArcId] = useState(null);
  const [selectedArcItemId, setSelectedArcItemId] = useState(null);
  const [quantity, setQuantity] = useState("");
  // Approval-process picker state. Admin defines all PO policies under
  // a process_id, so the wizard now asks the buyer which process this
  // contracted PO falls under. Without it the BE can't resolve a policy
  // at PO initiation. The selected id flows through createArcRelease.
  const [processes, setProcesses] = useState([]);
  const [processesLoading, setProcessesLoading] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState("");
  // Vendor-selection rationale. Required when multiple contracted
  // vendors are eligible (the buyer is making a choice that should
  // be auditable). Surfaces on the resulting PO so reviewers can see
  // WHY this vendor was picked over the others.
  const [vendorSelectionReason, setVendorSelectionReason] = useState("");

  // Resolve the contract pointed at by the query params, then fetch
  // every vendor with an active contract for the same (hotel,
  // product_variant) pair so a buyer can pick a different vendor if the
  // contract has multiple sources.
  useEffect(() => {
    if (!router.isReady) return;
    if (!arc_id || !arc_item_id || !hotel_id) {
      toast.error("Missing arc_id / arc_item_id / hotel_id in URL.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Step 1: load the seed item to learn the product_variant_id.
        // We don't have a "get arc_item by id" endpoint on the FE, so
        // we use the eligible-vendors endpoint with arc_id + hotel_id;
        // every row carries product_variant_id so we can dedupe.
        const seedRes = await getEligibleArcVendors({
          arc_id,
          hotel_id,
        });
        const seedRows = seedRes?.data?.data || seedRes?.data || [];
        if (cancelled) return;

        // Filter by the originating arc_item_id's product_variant.
        const seedRow = seedRows.find((r) => String(r.arc_item_id) === String(arc_item_id));
        if (!seedRow) {
          toast.error("Selected contract item is no longer active.");
          setLoading(false);
          return;
        }

        // Step 2: fetch every vendor offering the same (hotel,
        // product_variant) pair, regardless of arc_id, so the buyer
        // can compare. We re-call with product_variant_id this time.
        const allRes = await getEligibleArcVendors({
          hotel_id,
          product_variant_id: seedRow.product_variant_id,
        });
        const all = allRes?.data?.data || allRes?.data || [];
        if (cancelled) return;
        if (all.length === 0) {
          toast.error("No active contracts found for this item.");
          setLoading(false);
          return;
        }

        setEligible(all);
        // Default selection = the seed contract.
        setSelectedArcId(seedRow.arc_id);
        setSelectedArcItemId(seedRow.arc_item_id);
        // If only one vendor is eligible, skip the vendor-pick step.
        setStep(all.length === 1 ? 2 : 1);
      } catch (err) {
        toast.error(err?.message?.response?.data?.message || "Failed to load contracts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, arc_id, arc_item_id, hotel_id]);

  // Fetch active RFQ-type Procurement Processes once the page mounts.
  // The buyer picks one before submitting the release; the chosen
  // process_id is what governs the contracted PO's approval policy
  // resolution. Admins configure approval policies under RFQ-type
  // processes (one umbrella process covering the full RFQ → PO chain),
  // so we read that bucket — not PO-type — to populate the picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProcessesLoading(true);
      try {
        const res = await getApprovalProcesses({ process_type: "RFQ" });
        if (cancelled) return;
        // The endpoint returns the list directly (axios interceptor
        // already unwraps response.data). Defensive fall-throughs in
        // case wrapper shape changes later.
        const raw = res?.data ?? res;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setProcesses(list);
        if (list.length === 1) setSelectedProcessId(String(list[0].id));
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err?.message?.response?.data?.message ||
            err?.response?.data?.message ||
            "Failed to load procurement processes"
        );
      } finally {
        if (!cancelled) setProcessesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => eligible.find((r) => r.arc_id === selectedArcId && r.arc_item_id === selectedArcItemId),
    [eligible, selectedArcId, selectedArcItemId]
  );

  // Engine-computed pricing from the BE. Authoritative source of truth
  // for the wizard's review step — same path the persisted PO will
  // follow. Debounced on quantity change so we don't flood the API with
  // every keystroke.
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);

  useEffect(() => {
    setPricing(null);
    setPricingError(null);
    if (!selectedArcItemId) return;
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) return;

    let cancelled = false;
    setPricingLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await getArcReleasePricing({
          arc_item_id: Number(selectedArcItemId),
          quantity: q,
        });
        if (cancelled) return;
        setPricing(res?.data?.data || res?.data || null);
      } catch (err) {
        if (cancelled) return;
        setPricingError(
          err?.message?.response?.data?.message ||
            err?.response?.data?.message ||
            "Failed to fetch pricing"
        );
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedArcItemId, quantity]);

  const breakdown = pricing?.breakdown || null;
  const lineTotal = breakdown?.total ?? 0;

  const handleSubmit = async () => {
    if (!selectedArcId || !selectedArcItemId) {
      toast.error("Please pick a vendor.");
      return;
    }
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }
    if (!selectedProcessId) {
      toast.error("Please pick a procurement process for this PO.");
      return;
    }
    // Vendor-selection rationale required when more than one
    // contracted vendor is eligible. Mirrors the BE check.
    const requireReason = eligible.length > 1;
    const trimmedReason = (vendorSelectionReason || "").trim();
    if (requireReason && trimmedReason.length < 30) {
      toast.error("Please record at least 30 characters explaining why this vendor was selected.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createArcRelease({
        arc_id: Number(selectedArcId),
        hotel_id: Number(hotel_id),
        process_id: Number(selectedProcessId),
        vendor_selection_reason: requireReason ? trimmedReason : undefined,
        items: [{ arc_item_id: Number(selectedArcItemId), quantity: q }],
      });
      const data = res?.data?.data || res?.data;
      if (!data?.po_id) {
        throw new Error("Server did not return a PO id");
      }
      toast.success("Release created — Contracted PO drafted.");
      // The standard PO details surface is keyed on rfq_id, which a
      // contracted PO doesn't have. Land the buyer on the Contracted
      // POs listing instead — the new draft sits at the top.
      router.replace("/dashboard/buyer/purchase-order/contracted");
    } catch (err) {
      toast.error(err?.message?.response?.data?.message || err?.response?.data?.message || "Failed to create release");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className={s.pageLoading}>
          <span className="spinner-border" role="status" aria-hidden="true" />
          <p>Loading contract details…</p>
        </div>
      </AuthGuard>
    );
  }

  if (eligible.length === 0) {
    return (
      <AuthGuard>
        <div className={s.pageError}>
          <h3>No active contracts</h3>
          <p>This item is no longer covered by an active rate contract for the selected hotel.</p>
          <button type="button" className={s.btnGhost} onClick={() => router.back()}>
            Back
          </button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Head>
        <title>Create Release · ARC</title>
      </Head>
      <main className={s.page}>
        <header className={s.header}>
          <button type="button" className={s.backBtn} onClick={() => router.back()}>
            ← Back
          </button>
          <span className={s.pill}>ARC Release</span>
          <h1 className={s.title}>Draft a Contracted PO</h1>
          <p className={s.subtitle}>
            Skip the open-market RFQ. The vendor below is already under contract for this item — choose quantity and we'll draft the PO at the contracted rate.
          </p>
        </header>

        <ol className={s.stepper}>
          {[
            { n: 1, label: "Vendor", show: eligible.length > 1 },
            { n: 2, label: "Quantity", show: true },
            { n: 3, label: "Review", show: true },
          ]
            .filter((st) => st.show)
            .map((st) => (
              <li key={st.n} className={`${s.stepperItem} ${step === st.n ? s.stepperItemActive : ""} ${step > st.n ? s.stepperItemDone : ""}`}>
                <span className={s.stepperNum}>{st.n}</span>
                <span className={s.stepperLabel}>{st.label}</span>
              </li>
            ))}
        </ol>

        {step === 1 && (
          <section className={s.card}>
            <h3 className={s.cardTitle}>Pick a vendor</h3>
            <p className={s.cardHint}>
              Multiple vendors hold contracts for this item across the selected hotel. Choose the one to release the PO to.
            </p>
            <div className={s.vendorList}>
              {eligible.map((row) => {
                const isSelected = row.arc_id === selectedArcId && row.arc_item_id === selectedArcItemId;
                return (
                  <label
                    key={`${row.arc_id}-${row.arc_item_id}`}
                    className={`${s.vendorCard} ${isSelected ? s.vendorCardActive : ""}`}
                  >
                    <input
                      type="radio"
                      name="vendor"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedArcId(row.arc_id);
                        setSelectedArcItemId(row.arc_item_id);
                      }}
                    />
                    <span className={s.vendorBody}>
                      <span className={s.vendorName}>{row.vendor_name || `Vendor #${row.vendor_id}`}</span>
                      <span className={s.vendorMeta}>
                        Tender #{row.source_rfq_no} · {row.tender_scope === "GROUP" ? "Group ARC" : "Single ARC"} · valid {formatDate(row.period_from)} → {formatDate(row.period_to)}
                      </span>
                    </span>
                    <span className={s.vendorPrice}>₹{Number(row.unit_price || 0).toFixed(2)}</span>
                  </label>
                );
              })}
            </div>

            {/* Vendor-selection rationale — required when more than
                one contracted vendor is eligible. Captured here so
                the buyer doesn't lose state by going back to change
                vendor. Surfaces on the resulting PO for audit. */}
            <div className={s.vendorReasonBlock}>
              <label className={s.vendorReasonLabel} htmlFor="vendor-reason">
                Why are you picking this vendor? <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <p className={s.vendorReasonHint}>
                Multiple vendors hold contracts for this item. Auditors review these later — be
                specific (e.g. lead time, prior performance, GST efficiency, payment terms).
              </p>
              <textarea
                id="vendor-reason"
                className={s.vendorReasonInput}
                value={vendorSelectionReason}
                onChange={(e) => setVendorSelectionReason(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Minimum 30 characters."
              />
              <div className={s.vendorReasonMeta}>
                <span style={{ color: vendorSelectionReason.trim().length >= 30 ? "#16a34a" : "#94a3b8" }}>
                  {vendorSelectionReason.trim().length < 30
                    ? `${30 - vendorSelectionReason.trim().length} more character${
                        30 - vendorSelectionReason.trim().length === 1 ? "" : "s"
                      } required`
                    : "Looks good"}
                </span>
                <span style={{ color: "#94a3b8" }}>{vendorSelectionReason.trim().length} / 2000</span>
              </div>
            </div>

            <div className={s.actions}>
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => setStep(2)}
                disabled={!selectedArcId || !selectedArcItemId || vendorSelectionReason.trim().length < 30}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 2 && selected && (
          <section className={s.card}>
            <h3 className={s.cardTitle}>How many do you need?</h3>
            <p className={s.cardHint}>
              Unit price is fixed at the contracted rate of <strong>₹{Number(selected.unit_price).toFixed(2)}</strong>
              {selected.unit ? <> per <strong>{selected.unit}</strong></> : null}.
            </p>
            <label className={s.field}>
              <span className={s.fieldLabel}>
                Quantity{selected.unit ? <span style={{ color: "#94a3b8", fontWeight: 500 }}> (in {selected.unit})</span> : null}
              </span>
              <input
                type="number"
                min={1}
                step={1}
                className={s.fieldInput}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={selected.unit ? `e.g. 100 ${selected.unit}` : "e.g. 100"}
                autoFocus
              />
            </label>
            <div className={s.summary}>
              <div className={s.summaryRow}>
                <span>Unit price</span>
                <span>₹{Number(selected.unit_price).toFixed(2)}{selected.unit ? ` / ${selected.unit}` : ""}</span>
              </div>
              <div className={s.summaryRow}>
                <span>Quantity</span>
                <span>{Number(quantity) > 0 ? `${quantity}${selected.unit ? ` ${selected.unit}` : ""}` : "—"}</span>
              </div>
              {breakdown ? (
                <>
                  <div className={s.summaryRow}>
                    <span>Subtotal</span>
                    <span>₹{Number(breakdown.base).toFixed(2)}</span>
                  </div>
                  {Number(breakdown.base_tax) > 0 && (
                    <div className={s.summaryRow}>
                      <span>
                        GST
                        {breakdown.base_tax_mode === "percentage" && Number(breakdown.base_tax_rate) > 0
                          ? ` (${Number(breakdown.base_tax_rate)}%)`
                          : ""}
                      </span>
                      <span>₹{Number(breakdown.base_tax).toFixed(2)}</span>
                    </div>
                  )}
                  {Array.isArray(breakdown.charges) &&
                    breakdown.charges.map((c, idx) => (
                      <div key={`${c.name || c.slug || "charge"}-${idx}`} className={s.summaryRow}>
                        <span>{c.name || c.slug || "Charge"}</span>
                        <span>₹{Number(c.subtotal ?? c.amount + (c.tax || 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  <div className={`${s.summaryRow} ${s.summaryTotal}`}>
                    <span>Grand total</span>
                    <span>₹{Number(breakdown.total).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className={`${s.summaryRow} ${s.summaryTotal}`}>
                  <span>Grand total</span>
                  <span>
                    {pricingLoading
                      ? "Calculating…"
                      : pricingError
                      ? "—"
                      : Number(quantity) > 0
                      ? "Calculating…"
                      : "—"}
                  </span>
                </div>
              )}
              {pricingError && <p className={s.summaryError}>{pricingError}</p>}
            </div>
            <div className={s.actions}>
              {eligible.length > 1 && (
                <button type="button" className={s.btnGhost} onClick={() => setStep(1)}>
                  Back
                </button>
              )}
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => setStep(3)}
                disabled={!(Number(quantity) > 0) || pricingLoading || !breakdown}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && selected && (
          <section className={s.card}>
            <h3 className={s.cardTitle}>Review &amp; submit</h3>
            <dl className={s.reviewGrid}>
              <dt>Vendor</dt>
              <dd>{selected.vendor_name || `Vendor #${selected.vendor_id}`}</dd>
              <dt>Source tender</dt>
              <dd>#{selected.source_rfq_no}{selected.source_rfq_title ? ` — ${selected.source_rfq_title}` : ""}</dd>
              <dt>Hotel</dt>
              <dd>#{hotel_id}</dd>
              <dt>Validity</dt>
              <dd>{formatDate(selected.period_from)} → {formatDate(selected.period_to)}</dd>
              <dt>Quantity</dt>
              <dd>{quantity}{selected.unit ? ` ${selected.unit}` : ""}</dd>
              <dt>Unit price</dt>
              <dd>₹{Number(selected.unit_price).toFixed(2)}{selected.unit ? ` / ${selected.unit}` : ""}</dd>
              {breakdown && Number(breakdown.base_tax) > 0 && (
                <>
                  <dt>Subtotal</dt>
                  <dd>₹{Number(breakdown.base).toFixed(2)}</dd>
                  <dt>
                    GST
                    {breakdown.base_tax_mode === "percentage" && Number(breakdown.base_tax_rate) > 0
                      ? ` (${Number(breakdown.base_tax_rate)}%)`
                      : ""}
                  </dt>
                  <dd>₹{Number(breakdown.base_tax).toFixed(2)}</dd>
                </>
              )}
              {breakdown &&
                Array.isArray(breakdown.charges) &&
                breakdown.charges.map((c, idx) => (
                  <Fragment key={`${c.name || c.slug || "charge"}-${idx}`}>
                    <dt>{c.name || c.slug || "Charge"}</dt>
                    <dd>₹{Number(c.subtotal ?? c.amount + (c.tax || 0)).toFixed(2)}</dd>
                  </Fragment>
                ))}
              <dt className={s.reviewGrandLabel}>Grand total</dt>
              <dd className={s.reviewGrandValue}>₹{Number(lineTotal).toFixed(2)}</dd>
            </dl>

            {/* Procurement Process picker. Approval policies are
                configured per process_id; without picking one the
                engine has nothing to match a policy against. The
                wizard reads RFQ-type processes (admins configure the
                full RFQ → PO chain under one umbrella process), so
                pick the same one used for the source tender's
                category. Auto-selects when only one is available. */}
            <div className={s.processPickerBlock}>
              <label className={s.processPickerLabel} htmlFor="process-picker">
                Procurement Process
              </label>
              <p className={s.processPickerHint}>
                The chosen process decides who reviews and approves this PO. Pick
                the procurement process configured for this category, department, or hotel.
              </p>
              <select
                id="process-picker"
                className={s.processPickerSelect}
                value={selectedProcessId}
                disabled={processesLoading || submitting}
                onChange={(e) => setSelectedProcessId(e.target.value)}
              >
                <option value="">
                  {processesLoading ? "Loading processes…" : "Select a procurement process…"}
                </option>
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || `Process #${p.id}`}
                  </option>
                ))}
              </select>
              {!processesLoading && processes.length === 0 && (
                <p className={s.processPickerEmpty}>
                  No procurement processes configured. An admin must create at least
                  one process under <em>Process Type = RFQ</em> before this PO can be
                  drafted.
                </p>
              )}
            </div>

            <p className={s.confirmCopy}>
              Submitting will create a release against this contract and immediately draft a Contracted PO. The PO will follow the standard PO approval flow before it's sent to the vendor.
            </p>
            <div className={s.actions}>
              <button type="button" className={s.btnGhost} onClick={() => setStep(2)} disabled={submitting}>
                Back
              </button>
              <button
                type="button"
                className={s.btnPrimary}
                onClick={handleSubmit}
                disabled={submitting || !selectedProcessId || processes.length === 0}
              >
                {submitting ? "Drafting…" : "Draft Contracted PO"}
              </button>
            </div>
          </section>
        )}
      </main>
    </AuthGuard>
  );
};

export default ArcReleaseNewPage;
