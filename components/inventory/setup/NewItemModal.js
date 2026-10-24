import React, { useEffect, useId, useState } from "react";
import { Modal } from "react-bootstrap";
import { Link2, Loader2, Plus, X } from "lucide-react";
import { createItem, mapVariantToItem, suggestItems } from "@/services/inventory";
import { errorInfo } from "@/components/inventory/stock/stockUtils";
import VariantPicker from "./VariantPicker";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Start an inventory item from a catalogue variant (POST /items). If the
// variant looks like an item that already exists (GET /items/suggest), offer
// to map it to that item instead, so one thing isn't stocked twice.
//
// Props: { show, onHide, onCreated(item) }

const NewItemModal = ({ show, onHide, onCreated }) => {
  const titleId = useId();
  const [variant, setVariant] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [name, setName] = useState("");
  const [uom, setUom] = useState("");
  const [trackExpiry, setTrackExpiry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show) return;
    setVariant(null);
    setSuggestions([]);
    setName("");
    setUom("");
    setTrackExpiry(false);
    setError(null);
  }, [show]);

  const pick = async (v) => {
    setVariant(v);
    setName(v.name);
    setError(null);
    setSuggestions([]);
    try {
      const res = await suggestItems(v.id);
      setSuggestions((Array.isArray(res) ? res : res?.rows || []).slice(0, 5));
    } catch {
      setSuggestions([]);
    }
  };

  const mapTo = async (sug) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const item = await mapVariantToItem(sug.invItemId, variant.id);
      onCreated?.(item, { mapped: true });
    } catch (err) {
      setError(errorInfo(err, "Could not map this variant.").message);
    } finally {
      setBusy(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (busy || !variant) return;
    if (!uom.trim()) {
      setError("Enter the stock unit");
      return;
    }
    setBusy(true);
    setError(null);
    // Unticked leaves trackExpiry out, so the category default applies.
    const payload = { productVariantId: variant.id, stockUom: uom.trim() };
    if (trackExpiry) payload.trackExpiry = true;
    if (name.trim() && name.trim() !== variant.name) payload.displayName = name.trim();
    try {
      const item = await createItem(payload);
      onCreated?.(item, { mapped: false });
    } catch (err) {
      setError(errorInfo(err, "Could not create the item.").message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={busy ? undefined : onHide}
      centered
      size="lg"
      aria-labelledby={titleId}
      dialogClassName={r.sheetDialog}
      contentClassName={r.sheet}
    >
      <div className={r.sheetHead}>
        <div>
          <h2 id={titleId} className={r.sheetTitle}>New item</h2>
          <div className={r.sheetSub}>Start from the catalogue variant it is bought as</div>
        </div>
        <button type="button" className={r.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={r.sheetBody}>
        {!variant ? (
          <VariantPicker actionLabel="Use" onPick={pick} disabled={busy} />
        ) : (
          <form onSubmit={create} noValidate aria-label="New item">
            <p className={r.meta} style={{ marginTop: 0 }}>
              Variant: <strong>{variant.name}</strong>{" "}
              <button type="button" className={r.btnLink} onClick={() => setVariant(null)}>Change</button>
            </p>
            {suggestions.length > 0 && (
              <div className={r.sheetNote} style={{ marginBottom: 12 }}>
                <strong>Looks like an item you already have:</strong>
                <ul className={s.chips} style={{ marginTop: 6 }}>
                  {suggestions.map((x) => (
                    <li key={x.invItemId}>
                      <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => mapTo(x)} disabled={busy}>
                        <Link2 size={13} aria-hidden="true" /> Map to {x.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className={r.formGrid}>
              <div>
                <label className={r.label} htmlFor="ni-name">Name</label>
                <input id="ni-name" className={r.input} value={name} maxLength={255} onChange={(e) => setName(e.target.value)} disabled={busy} />
              </div>
              <div>
                <label className={r.label} htmlFor="ni-uom">Stock unit</label>
                <input id="ni-uom" className={r.input} value={uom} maxLength={99} placeholder="e.g. kg, bottle, pc" onChange={(e) => setUom(e.target.value)} disabled={busy} />
                <div className={r.fieldHint}>Stock is kept and counted in this unit.</div>
              </div>
            </div>
            <div className={s.toggleRow}>
              <div className={s.toggleText}>
                <label className={s.toggleTitle} htmlFor="ni-exp">Tracks expiry</label>
                <div className={s.toggleHelp}>Leave off to use the category default.</div>
              </div>
              <input id="ni-exp" type="checkbox" role="switch" className={s.switch} checked={trackExpiry} onChange={(e) => setTrackExpiry(e.target.checked)} disabled={busy} />
            </div>
            {error && <div className={r.formError} role="alert">{error}</div>}
            <div className={r.sheetFoot} style={{ padding: "12px 0 0" }}>
              <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={onHide} disabled={busy}>Cancel</button>
              <button type="submit" className={`${r.btn} ${r.btnPrimary}`} disabled={busy}>
                {busy ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                Create item
              </button>
            </div>
          </form>
        )}
        {!variant && error && <div className={r.formError} role="alert">{error}</div>}
      </div>
    </Modal>
  );
};

export default NewItemModal;
