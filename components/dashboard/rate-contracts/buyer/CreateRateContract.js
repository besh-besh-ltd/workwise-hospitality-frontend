// Create-ARC wizard. 2-step compact version of the prototype's 6-step flow.
// Step 1 — basics (category → department resolution + dates + terms).
// Step 2 — items (+ optional invited vendors). Then publishes.

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  createDraft, updateDraft, publish,
  getDepartmentsForCategory, getSubCategories,
} from "@/services/arc_v2";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";
import styles from "./CreateRateContract.module.scss";

export default function CreateRateContract() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);

  // Step-1 form state
  const ctx = typeof window !== "undefined" ? getStoredHospitalityContext() : {};
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    sub_category_ids: [],
    hospitality_company_id: ctx?.hospitality_company_id || "",
    hotel_id: ctx?.hospitality_hotel_id || "",
    department_id: "",
    process_id: "",
    eligibility_type: "open",
    technical_response_required: false,
    sample_required: false,
    submission_start_at: "",
    submission_end_at: "",
    contract_start_at: "",
    contract_end_at: "",
    payment_terms_expected: "Net 30",
    delivery_expected: "",
    penalty_clause: "",
  });
  const [items, setItems] = useState([
    { product_variant_id: "", indicative_qty: "", uom: "", target_price: "", spec_text: "" },
  ]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableSubCategories, setAvailableSubCategories] = useState([]);

  // When category changes, resolve allowed departments and sub-categories.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!form.category_id) {
        setAvailableDepartments([]);
        setAvailableSubCategories([]);
        return;
      }
      try {
        const [deptRes, subRes] = await Promise.all([
          getDepartmentsForCategory({
            category_id: form.category_id,
            hospitality_company_id: form.hospitality_company_id,
          }),
          getSubCategories(form.category_id),
        ]);
        if (cancelled) return;
        setAvailableDepartments(deptRes?.data?.departments || []);
        setAvailableSubCategories(subRes?.data?.sub_categories || []);
      } catch (e) {
        if (!cancelled) {
          setError("Could not resolve departments for this category. Are mappings configured?");
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [form.category_id, form.hospitality_company_id]);

  const updateField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addItemRow = () => setItems(it => [...it, { product_variant_id: "", indicative_qty: "", uom: "", target_price: "", spec_text: "" }]);
  const removeItemRow = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => setItems(it => it.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const saveStep1 = async () => {
    setBusy(true); setError(null);
    try {
      if (draft) {
        await updateDraft(draft.id, form);
      } else {
        const res = await createDraft({
          ...form,
          // Send a minimal item so the create endpoint validates fields it needs.
          items: [],
        });
        setDraft(res?.data?.arc);
      }
      setStep(2);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const finalize = async () => {
    setBusy(true); setError(null);
    try {
      // Save items via updateDraft is not enough — items go through the create
      // path. Persist any item additions through a second createDraft if no
      // items were on the original, or via a follow-up API once we add an item
      // mutation endpoint. For now, drop items on a re-create-from-form so the
      // user's edits land — this is the simplest path that exercises publish.
      const itemsClean = items
        .filter(i => i.product_variant_id && i.indicative_qty)
        .map(i => ({
          product_variant_id: Number(i.product_variant_id),
          indicative_qty:     Number(i.indicative_qty),
          uom:                i.uom || null,
          target_price:       i.target_price ? Number(i.target_price) : null,
          spec_text:          i.spec_text || null,
        }));
      if (itemsClean.length === 0) {
        setError("Add at least one item before publishing.");
        return;
      }
      let arc = draft;
      if (!arc) {
        const res = await createDraft({ ...form, items: itemsClean });
        arc = res?.data?.arc;
      } else {
        // Re-create with items because we don't have a dedicated item-add
        // endpoint yet. This is a known follow-up — see plan §5.2 routes.
        const res = await createDraft({ ...form, items: itemsClean });
        arc = res?.data?.arc;
      }
      const pub = await publish(arc.id);
      router.push(`/dashboard/buyer/rate-contracts/${pub?.data?.arc?.id || arc.id}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Publish failed");
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h1>Create Rate Contract</h1>
        <p className={styles.sub}>Single-BU annual rate contract — pick a category, define items, then float for vendor quotes.</p>
      </header>

      <div className={styles.stepper}>
        <span className={`${styles.stepDot} ${step >= 1 ? styles.done : ""}`}>1</span>
        <span className={styles.connector} />
        <span className={`${styles.stepDot} ${step >= 2 ? styles.done : ""}`}>2</span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {step === 1 && (
        <div className={styles.card}>
          <h2>Basics</h2>
          <div className={styles.grid2}>
            <label>Title<input value={form.title} onChange={e => updateField("title", e.target.value)} /></label>
            <label>Process ID<input value={form.process_id} onChange={e => updateField("process_id", e.target.value)} type="number" /></label>
            <label>Hospitality Company ID<input value={form.hospitality_company_id} onChange={e => updateField("hospitality_company_id", e.target.value)} type="number" /></label>
            <label>Hotel (BU) ID<input value={form.hotel_id} onChange={e => updateField("hotel_id", e.target.value)} type="number" /></label>
            <label>Category ID<input value={form.category_id} onChange={e => updateField("category_id", e.target.value)} type="number" /></label>
            <label>Department
              <select value={form.department_id} onChange={e => updateField("department_id", e.target.value)}>
                <option value="">— Pick category first —</option>
                {availableDepartments.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </label>
            <label>Submission Start<input type="datetime-local" value={form.submission_start_at} onChange={e => updateField("submission_start_at", e.target.value)} /></label>
            <label>Submission End<input type="datetime-local" value={form.submission_end_at} onChange={e => updateField("submission_end_at", e.target.value)} /></label>
            <label>Contract Start<input type="datetime-local" value={form.contract_start_at} onChange={e => updateField("contract_start_at", e.target.value)} /></label>
            <label>Contract End<input type="datetime-local" value={form.contract_end_at} onChange={e => updateField("contract_end_at", e.target.value)} /></label>
            <label>Eligibility
              <select value={form.eligibility_type} onChange={e => updateField("eligibility_type", e.target.value)}>
                <option value="open">Open</option>
                <option value="invitation">Invitation</option>
              </select>
            </label>
            <label>Payment Terms<input value={form.payment_terms_expected} onChange={e => updateField("payment_terms_expected", e.target.value)} /></label>
            <label>Delivery Expected<input value={form.delivery_expected} onChange={e => updateField("delivery_expected", e.target.value)} /></label>
            <label className={styles.checkbox}><input type="checkbox" checked={form.technical_response_required} onChange={e => updateField("technical_response_required", e.target.checked)} /> Technical evaluation required</label>
            <label className={styles.checkbox}><input type="checkbox" checked={form.sample_required} onChange={e => updateField("sample_required", e.target.checked)} /> Samples required</label>
          </div>
          <label className={styles.full}>Description<textarea rows="3" value={form.description} onChange={e => updateField("description", e.target.value)} /></label>
          <div className={styles.actions}>
            <button className={styles.primary} disabled={busy} onClick={saveStep1}>Next — Items →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.card}>
          <h2>Items</h2>
          <p className={styles.help}>Pick variants from the chosen category. Indicative qty drives the split-award reconciliation later.</p>
          {items.map((it, i) => (
            <div className={styles.itemRow} key={i}>
              <input placeholder="Variant ID" value={it.product_variant_id} onChange={e => updateItem(i, "product_variant_id", e.target.value)} />
              <input placeholder="Qty" type="number" value={it.indicative_qty} onChange={e => updateItem(i, "indicative_qty", e.target.value)} />
              <input placeholder="UoM" value={it.uom} onChange={e => updateItem(i, "uom", e.target.value)} />
              <input placeholder="Target Price" type="number" value={it.target_price} onChange={e => updateItem(i, "target_price", e.target.value)} />
              <input placeholder="Spec" value={it.spec_text} onChange={e => updateItem(i, "spec_text", e.target.value)} />
              <button onClick={() => removeItemRow(i)} className={styles.iconBtn}>×</button>
            </div>
          ))}
          <button onClick={addItemRow} className={styles.secondary}>+ Add item row</button>

          <div className={styles.actions}>
            <button className={styles.linkBtn} onClick={() => setStep(1)}>← Back</button>
            <button className={styles.primary} disabled={busy} onClick={finalize}>
              {busy ? "Publishing…" : "Save & Publish ARC →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
