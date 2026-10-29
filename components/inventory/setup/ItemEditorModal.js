import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { Link2, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import {
  addItemBarcode, deleteItemBarcode, getItemUoms, mapVariantToItem, saveItemUoms, updateItem,
} from "@/services/inventory";
import { fmtQty } from "@/components/inventory/receive/receiveUtils";
import { errorInfo, parseDecimal } from "@/components/inventory/stock/stockUtils";
import VariantPicker from "./VariantPicker";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// One inventory item: details (inventory.admin, partial PUT), mapped catalogue
// variants (admin), units with their factor to the stock unit and barcodes
// (inventory.update). Changing the stock unit drops the item's other units on
// the server (they were relative to the old unit), so the units reload.
//
// Props: { item | null, canAdmin, canUpdate, onHide, onChanged(item) }

const FACTOR_DP = 1e6; // unit factors keep 6 decimal places (numeric(18,6))
const PACK_DP = 1e4; // barcode pack sizes keep 4

const detailsForm = (it) => ({
  displayName: it?.displayName || "",
  itemCode: it?.itemCode || "",
  stockUom: it?.stockUom || "",
  trackExpiry: !!it?.trackExpiry,
  minShelfLifeDays: it?.minShelfLifeDays != null ? String(it.minShelfLifeDays) : "",
  overReceiptTolerancePct: it?.overReceiptTolerancePct != null ? String(it.overReceiptTolerancePct) : "",
  isActive: it?.isActive !== false,
});

/** {changes} or {errors}: only the fields that differ from the item. */
const detailChanges = (item, form) => {
  const base = detailsForm(item);
  const out = {};
  const errs = {};
  const name = form.displayName.trim();
  if (name !== base.displayName.trim()) {
    if (!name) errs.displayName = "The name can't be blank";
    else out.displayName = name;
  }
  const code = form.itemCode.trim();
  if (code !== base.itemCode.trim()) out.itemCode = code || null;
  const uom = form.stockUom.trim();
  if (uom !== base.stockUom.trim()) {
    if (!uom) errs.stockUom = "A stock unit is required";
    else out.stockUom = uom;
  }
  if (form.trackExpiry !== base.trackExpiry) out.trackExpiry = form.trackExpiry;
  if (form.minShelfLifeDays.trim() !== base.minShelfLifeDays) {
    const t = form.minShelfLifeDays.trim();
    const n = Number(t);
    if (t && (!Number.isInteger(n) || n < 0)) errs.minShelfLifeDays = "Whole days, 0 or more";
    else out.minShelfLifeDays = t ? n : null;
  }
  if (form.overReceiptTolerancePct.trim() !== base.overReceiptTolerancePct) {
    const t = form.overReceiptTolerancePct.trim();
    const n = Number(t);
    if (t && (!Number.isFinite(n) || n < 0 || n > 100)) errs.overReceiptTolerancePct = "A percentage from 0 to 100";
    else out.overReceiptTolerancePct = t ? n : null;
  }
  if (form.isActive !== base.isActive) out.isActive = form.isActive;
  return Object.keys(errs).length ? { errors: errs } : { changes: out };
};

const uomRowsOf = (list) => (Array.isArray(list) ? list : []).map((u) => ({ uomLabel: u.uomLabel || "", factor: u.factorToStock != null ? String(u.factorToStock) : "" }));

const ItemEditorModal = ({ item: itemProp, canAdmin, canUpdate, onHide, onChanged }) => {
  const titleId = useId();
  const [item, setItem] = useState(itemProp);
  const [form, setForm] = useState(detailsForm(itemProp));
  const [formErrors, setFormErrors] = useState({});
  const [detailsError, setDetailsError] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const [mapping, setMapping] = useState(false);
  const [mapBusy, setMapBusy] = useState(false);
  const [mapError, setMapError] = useState(null);

  const [uoms, setUoms] = useState(null); // [{uomLabel, factor}]
  const [savedUoms, setSavedUoms] = useState(null);
  const [uomError, setUomError] = useState(null);
  const [uomRowErrors, setUomRowErrors] = useState({}); // row index → message
  const [uomLoadError, setUomLoadError] = useState(null);
  const [savingUoms, setSavingUoms] = useState(false);

  const [code, setCode] = useState("");
  const [pack, setPack] = useState("1");
  const [source, setSource] = useState("MANUFACTURER");
  const [barcodeError, setBarcodeError] = useState(null);
  const [barcodeBusy, setBarcodeBusy] = useState(false);

  const itemId = itemProp?.id ?? null;

  useEffect(() => {
    setItem(itemProp);
    setForm(detailsForm(itemProp));
    setFormErrors({});
    setDetailsError(null);
    setMapping(false);
    setMapError(null);
    setBarcodeError(null);
    setCode("");
    setPack("1");
    setSource("MANUFACTURER");
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const uomSeq = useRef(0);
  const loadUoms = useCallback(async () => {
    if (!itemId) return;
    const seq = ++uomSeq.current;
    setUoms(null);
    setSavedUoms(null);
    setUomError(null);
    setUomRowErrors({});
    setUomLoadError(null);
    try {
      const res = await getItemUoms(itemId);
      if (seq !== uomSeq.current) return;
      const rows = uomRowsOf(Array.isArray(res) ? res : res?.uoms);
      setUoms(rows);
      setSavedUoms(rows);
    } catch (err) {
      if (seq === uomSeq.current) setUomLoadError(errorInfo(err, "Could not load the units.").message);
    }
  }, [itemId]);

  useEffect(() => {
    loadUoms();
    return () => {
      uomSeq.current += 1;
    };
  }, [loadUoms]);

  const changed = (next) => {
    setItem(next);
    onChanged?.(next);
  };

  const variantIds = useMemo(() => new Set((item?.variants || []).map((v) => Number(v.productVariantId))), [item]);
  const check = item ? detailChanges(item, form) : { changes: {} };
  const detailsDirty = !!check.errors || Object.keys(check.changes || {}).length > 0;
  const uomsDirty = uoms && savedUoms && JSON.stringify(uoms) !== JSON.stringify(savedUoms);
  const unit = item?.stockUom || "stock unit";

  const saveDetails = async (e) => {
    e.preventDefault();
    if (savingDetails || !item) return;
    setDetailsError(null);
    const res = detailChanges(item, form);
    if (res.errors) {
      setFormErrors(res.errors);
      return;
    }
    setFormErrors({});
    if (!Object.keys(res.changes).length) return;
    setSavingDetails(true);
    try {
      const updated = await updateItem(item.id, res.changes);
      const next = updated && typeof updated === "object" ? { ...item, ...updated } : { ...item, ...res.changes };
      changed(next);
      setForm(detailsForm(next));
      toast.success(`${next.displayName} saved`);
      // A new stock unit drops the old conversions server-side: show what is left.
      if (res.changes.stockUom !== undefined) loadUoms();
    } catch (err) {
      const info = errorInfo(err, "Could not save the item.");
      const field = info.details?.field;
      if (field && field in form) setFormErrors({ [field]: info.message });
      else setDetailsError(info.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const mapVariant = async (variant) => {
    if (mapBusy || !item) return;
    setMapBusy(true);
    setMapError(null);
    try {
      const updated = await mapVariantToItem(item.id, variant.id);
      const next = updated && typeof updated === "object"
        ? { ...item, ...updated }
        : { ...item, variants: [...(item.variants || []), { productVariantId: variant.id, name: variant.name }] };
      changed(next);
      setMapping(false);
      toast.success(`${variant.name} now receives as ${next.displayName}`);
    } catch (err) {
      setMapError(errorInfo(err, "Could not map this variant.").message);
    } finally {
      setMapBusy(false);
    }
  };

  const saveUoms = async () => {
    if (savingUoms || !uoms || !item) return;
    setUomError(null);
    const seen = new Set();
    const payload = [];
    const errs = {};
    for (const [i, u] of uoms.entries()) {
      const label = u.uomLabel.trim();
      const key = label.toLowerCase();
      const n = parseDecimal(u.factor);
      const factor = n == null ? null : Math.round(n * FACTOR_DP) / FACTOR_DP;
      if (!label) errs[i] = "Name this unit";
      else if (seen.has(key)) errs[i] = `"${label}" is listed twice`;
      else if (n == null) errs[i] = "Enter the factor as a plain number, e.g. 12 or 0.5";
      else if (!(factor >= 0.000001)) errs[i] = `At least 0.000001 ${unit}`;
      seen.add(key);
      if (!errs[i]) payload.push({ uomLabel: label, factorToStock: factor });
    }
    setUomRowErrors(errs);
    if (Object.keys(errs).length) {
      setUomError("Fix the highlighted units, then save.");
      return;
    }
    setSavingUoms(true);
    try {
      const res = await saveItemUoms(item.id, payload);
      const rows = uomRowsOf(Array.isArray(res) ? res : Array.isArray(res?.uoms) ? res.uoms : payload);
      setUoms(rows);
      setSavedUoms(rows);
      toast.success("Units saved");
    } catch (err) {
      setUomError(errorInfo(err, "Could not save the units.").message);
    } finally {
      setSavingUoms(false);
    }
  };

  const addBarcode = async (e) => {
    e.preventDefault();
    if (barcodeBusy || !item) return;
    setBarcodeError(null);
    const c = code.trim();
    const n = parseDecimal(pack);
    const p = n == null ? null : Math.round(n * PACK_DP) / PACK_DP;
    if (!c) return setBarcodeError("Scan or type the barcode");
    if (n == null) return setBarcodeError("Enter the pack size as a plain number, e.g. 12 or 0.5");
    if (!(p >= 0.0001)) return setBarcodeError(`Pack size must be at least 0.0001 ${unit}`);
    setBarcodeBusy(true);
    try {
      const added = await addItemBarcode(item.id, { code: c, packFactor: p, source });
      const row = added && typeof added === "object" && added.code ? added : { id: `new-${c}`, code: c, packFactor: p, source };
      changed({ ...item, barcodes: [...(item.barcodes || []), row] });
      setCode("");
      setPack("1");
    } catch (err) {
      setBarcodeError(errorInfo(err, "Could not add this barcode.").message);
    } finally {
      setBarcodeBusy(false);
    }
  };

  const removeBarcode = async (b) => {
    if (barcodeBusy || !item) return;
    setBarcodeBusy(true);
    setBarcodeError(null);
    try {
      await deleteItemBarcode(item.id, b.id);
      changed({ ...item, barcodes: (item.barcodes || []).filter((x) => x.id !== b.id) });
    } catch (err) {
      setBarcodeError(errorInfo(err, "Could not remove this barcode.").message);
    } finally {
      setBarcodeBusy(false);
    }
  };

  const field = (key, label, props = {}, hint = null) => (
    <div className={s.fieldRow}>
      <label className={r.label} htmlFor={`ie-${key}`}>{label}</label>
      <input
        id={`ie-${key}`}
        className={`${r.input} ${formErrors[key] ? r.inputInvalid : ""}`}
        value={form[key]}
        disabled={!canAdmin || savingDetails}
        aria-invalid={formErrors[key] ? "true" : undefined}
        aria-describedby={formErrors[key] ? `ie-${key}-err` : undefined}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        {...props}
      />
      {hint && <div className={r.fieldHint}>{hint}</div>}
      {formErrors[key] && <div id={`ie-${key}-err`} className={s.fieldError}>{formErrors[key]}</div>}
    </div>
  );

  return (
    <Modal
      show={!!itemProp}
      onHide={onHide}
      centered
      size="lg"
      aria-labelledby={titleId}
      dialogClassName={r.sheetDialog}
      contentClassName={r.sheet}
    >
      <div className={r.sheetHead}>
        <div>
          <h2 id={titleId} className={r.sheetTitle}>{item?.displayName}</h2>
          <div className={r.sheetSub}>
            {item?.itemCode && <span className={r.mono}>{item.itemCode} · </span>}Counted in {item?.stockUom}
          </div>
        </div>
        <button type="button" className={r.sheetClose} onClick={onHide} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={r.sheetBody}>
        {/* Details */}
        <form className={s.editorSection} aria-label="Item details" onSubmit={saveDetails} noValidate>
          <h3 className={s.editorTitle}>Details</h3>
          <div className={r.formGrid}>
            {field("displayName", "Name", { maxLength: 255 })}
            {field("itemCode", "Item code", { maxLength: 64 })}
            {field("stockUom", "Stock unit", { maxLength: 99 }, "The unit stock is kept in. It can't change once the item has stock history.")}
            {field("overReceiptTolerancePct", "Over-receipt tolerance (%)", { inputMode: "decimal", placeholder: "Company default" })}
          </div>
          <div className={s.toggleRow}>
            <div className={s.toggleText}>
              <label className={s.toggleTitle} htmlFor="ie-trackExpiry">Tracks expiry</label>
              <div className={s.toggleHelp}>Ask for batch and expiry on receipt.</div>
            </div>
            <label className={s.switchHit}><input
              id="ie-trackExpiry"
              type="checkbox"
              role="switch"
              className={s.switch}
              checked={form.trackExpiry}
              disabled={!canAdmin || savingDetails}
              onChange={(e) => setForm((f) => ({ ...f, trackExpiry: e.target.checked }))}
            /></label>
          </div>
          {form.trackExpiry && (
            <div className={r.formGrid}>
              {field("minShelfLifeDays", "Min shelf life (days)", { inputMode: "numeric", placeholder: "None" }, "Receipts closer to expiry than this are flagged.")}
            </div>
          )}
          <div className={s.toggleRow}>
            <div className={s.toggleText}>
              <label className={s.toggleTitle} htmlFor="ie-isActive">Active</label>
              <div className={s.toggleHelp}>Inactive items stay in history but can&apos;t be picked for new documents.</div>
            </div>
            <label className={s.switchHit}><input
              id="ie-isActive"
              type="checkbox"
              role="switch"
              className={s.switch}
              checked={form.isActive}
              disabled={!canAdmin || savingDetails}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            /></label>
          </div>
          {detailsError && <div className={r.formError} role="alert">{detailsError}</div>}
          {canAdmin && (
            <button type="submit" className={`${r.btn} ${r.btnPrimary}`} disabled={savingDetails || !detailsDirty} style={{ marginTop: 10 }}>
              {savingDetails ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
              Save details
            </button>
          )}
        </form>

        {/* Variants */}
        <section className={s.editorSection} aria-label="Catalogue variants">
          <h3 className={s.editorTitle}>Catalogue variants</h3>
          <p className={r.meta} style={{ marginTop: 0 }}>PO lines for these variants receive into this item.</p>
          {(item?.variants || []).length === 0 ? (
            <p className={r.meta}>No variant mapped yet.</p>
          ) : (
            <ul className={s.chips}>
              {item.variants.map((v) => <li key={v.productVariantId} className={s.codeChip}>{v.name}</li>)}
            </ul>
          )}
          {canAdmin && !mapping && (
            <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setMapping(true)} style={{ marginTop: 8 }}>
              <Link2 size={13} aria-hidden="true" /> Map a variant
            </button>
          )}
          {canAdmin && mapping && (
            <div style={{ marginTop: 8 }}>
              <VariantPicker actionLabel="Map" exclude={variantIds} disabled={mapBusy} onPick={mapVariant} />
              <button type="button" className={`${r.btn} ${r.btnGhost} ${r.btnSm}`} onClick={() => setMapping(false)} style={{ marginTop: 8 }}>
                Done
              </button>
            </div>
          )}
          {mapError && <div className={r.formError} role="alert">{mapError}</div>}
        </section>

        {/* Units */}
        <section className={s.editorSection} aria-label="Units">
          <h3 className={s.editorTitle}>Units</h3>
          <p className={r.meta} style={{ marginTop: 0 }}>
            Other units this item is bought or counted in, and how many {unit} each one holds.
          </p>
          {uomLoadError ? (
            <div className={r.formError} role="alert">{uomLoadError}</div>
          ) : !uoms ? (
            <span className={r.sk} style={{ width: "60%" }} />
          ) : (
            <>
              {uoms.length === 0 && <p className={r.meta}>Only {unit} so far.</p>}
              {uoms.map((u, i) => (
                <div key={i} className={s.uomRow}>
                  <span className={r.meta}>1</span>
                  <input
                    className={`${r.input} ${s.inlineInput} ${uomRowErrors[i] ? r.inputInvalid : ""}`}
                    aria-label={`Unit ${i + 1}`}
                    value={u.uomLabel}
                    placeholder="e.g. case"
                    maxLength={99}
                    disabled={!canUpdate || savingUoms}
                    aria-invalid={uomRowErrors[i] ? "true" : undefined}
                    aria-describedby={uomRowErrors[i] ? `ie-uom-${i}-err` : undefined}
                    onChange={(e) => {
                      setUomRowErrors((m) => ({ ...m, [i]: undefined }));
                      setUoms((list) => list.map((x, j) => (j === i ? { ...x, uomLabel: e.target.value } : x)));
                    }}
                  />
                  <span className={r.meta}>=</span>
                  <input
                    className={`${r.input} ${s.inlineInput} ${uomRowErrors[i] ? r.inputInvalid : ""}`}
                    aria-label={`${unit} in one unit ${i + 1}`}
                    inputMode="decimal"
                    value={u.factor}
                    placeholder="0"
                    disabled={!canUpdate || savingUoms}
                    aria-invalid={uomRowErrors[i] ? "true" : undefined}
                    aria-describedby={uomRowErrors[i] ? `ie-uom-${i}-err` : undefined}
                    onChange={(e) => {
                      setUomRowErrors((m) => ({ ...m, [i]: undefined }));
                      setUoms((list) => list.map((x, j) => (j === i ? { ...x, factor: e.target.value } : x)));
                    }}
                  />
                  <span className={r.meta}>{unit}</span>
                  {canUpdate && (
                    <button
                      type="button"
                      className={s.removeBtn}
                      aria-label={`Remove unit ${i + 1}`}
                      onClick={() => {
                        setUomRowErrors({});
                        setUoms((list) => list.filter((_, j) => j !== i));
                      }}
                      disabled={savingUoms}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                  {uomRowErrors[i] && (
                    <div id={`ie-uom-${i}-err`} className={`${s.fieldError} ${s.uomRowError}`}>{uomRowErrors[i]}</div>
                  )}
                </div>
              ))}
              {uomError && <div className={r.formError} role="alert">{uomError}</div>}
              {canUpdate && (
                <div className={r.flags} style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className={`${r.btn} ${r.btnGhost} ${r.btnSm}`}
                    onClick={() => setUoms((list) => [...list, { uomLabel: "", factor: "" }])}
                    disabled={savingUoms}
                  >
                    <Plus size={13} aria-hidden="true" /> Add unit
                  </button>
                  <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={saveUoms} disabled={savingUoms || !uomsDirty}>
                    {savingUoms ? <Loader2 size={13} className={r.spin} aria-hidden="true" /> : <Save size={13} aria-hidden="true" />}
                    Save units
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Barcodes */}
        <section className={s.editorSection} aria-label="Barcodes">
          <h3 className={s.editorTitle}>Barcodes</h3>
          {(item?.barcodes || []).length === 0 ? (
            <p className={r.meta} style={{ marginTop: 0 }}>No barcode yet.</p>
          ) : (
            <ul className={s.chips}>
              {item.barcodes.map((b) => (
                <li key={b.id} className={s.codeChip}>
                  <span className={s.mono}>{b.code}</span>
                  <span className={s.subtle}>
                    {" · "}{fmtQty(b.packFactor)} {unit}{b.source === "INTERNAL" ? " · our label" : ""}
                  </span>
                  {canUpdate && (
                    <button
                      type="button"
                      className={s.removeBtn}
                      aria-label={`Remove barcode ${b.code}`}
                      onClick={() => removeBarcode(b)}
                      disabled={barcodeBusy}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canUpdate && (
            <form className={r.formGrid} aria-label="Add a barcode" onSubmit={addBarcode} noValidate style={{ marginTop: 10 }}>
              <div>
                <label className={r.label} htmlFor="ie-code">Barcode</label>
                <input id="ie-code" className={r.input} value={code} autoComplete="off" onChange={(e) => setCode(e.target.value)} disabled={barcodeBusy} />
              </div>
              <div>
                <label className={r.label} htmlFor="ie-pack">Pack size ({unit} per scan)</label>
                <input id="ie-pack" className={r.input} inputMode="decimal" value={pack} onChange={(e) => setPack(e.target.value)} disabled={barcodeBusy} />
              </div>
              <div>
                <label className={r.label} htmlFor="ie-source">Source</label>
                <select id="ie-source" className={r.select} value={source} onChange={(e) => setSource(e.target.value)} disabled={barcodeBusy}>
                  <option value="MANUFACTURER">Maker&apos;s barcode</option>
                  <option value="INTERNAL">Our own label</option>
                </select>
              </div>
              <div style={{ alignSelf: "flex-end" }}>
                <button type="submit" className={`${r.btn} ${r.btnSecondary}`} disabled={barcodeBusy}>
                  {barcodeBusy ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  Add barcode
                </button>
              </div>
            </form>
          )}
          {barcodeError && <div className={r.formError} role="alert">{barcodeError}</div>}
        </section>
      </div>
      <div className={r.sheetFoot}>
        <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={onHide}>Close</button>
      </div>
    </Modal>
  );
};

export default ItemEditorModal;
