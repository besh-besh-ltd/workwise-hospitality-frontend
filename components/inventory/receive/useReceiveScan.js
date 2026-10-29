import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  addQty, addUnits, fmtQty, isDecimalUnit, parseFactor, parseQty, qtyText, routes, subQty, unitsToPoQty,
} from "./receiveUtils";
import styles from "./receive.module.scss";

// Scanning onto the receive form: an item scan adds its pack (stock units) to
// a PO line, a dispatch QR picks the dispatch note, another PO's QR navigates
// there, an unknown code can be linked to an item.
//
// Received qty from scans is kept exact: each line counts the stock units
// scanned since its qty was last typed (scanUnits, on top of scanBase) and
// received = scanBase + scanUnits / factor, rounded once. Twelve single
// pieces of a 12-piece box make exactly 1 box, not 12 × 0.0833.
//
// Weighed units (kg, L) and lines with no known conversion open the keypad.
//
// `form`: {entriesRef, ctxRef, patchLine(id, patch)}; `lines`, `lineById` from
// the context; `pickDispatch(id)`; `canLinkCodes` (inventory.update).

const FLASH_MS = 1200;

const sameUnit = (a, b) =>
  !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/** Stock units in one PO unit for this line, or null when nobody knows yet. */
export const lineFactor = (line, entry) =>
  parseFactor(entry?.uomFactor) ??
  parseFactor(entry?.knownFactor) ??
  parseFactor(line?.uomFactor) ??
  (sameUnit(line?.unit, line?.stockUom) ? 1 : null);

/** A typed or stepped qty: received is the receiver's again (scan count restarts). */
export const manualQtyPatch = (received) => ({ received: qtyText(received), scanUnits: 0, scanBase: null });

const ScanToast = ({ name, unit, delta, total, onUndo }) => (
  <div className={styles.toastRow}>
    <div style={{ minWidth: 0 }}>
      <div className={styles.toastQty}>+{fmtQty(delta)} (now {fmtQty(total)})</div>
      <div className={styles.toastName}>{name}{unit ? ` · ${unit}` : ""}</div>
    </div>
    <button type="button" className={styles.toastUndo} onClick={onUndo}>
      Undo
    </button>
  </div>
);

export default function useReceiveScan({
  form, lines, lineById, pickDispatch, canLinkCodes, router,
}) {
  const { entriesRef, ctxRef, patchLine } = form;
  const [flashId, setFlashId] = useState(null);
  const [pad, setPad] = useState(null);
  const [unknownCode, setUnknownCode] = useState(null);
  const flashTimerRef = useRef(null);
  const toastSeqRef = useRef(0);
  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  const flash = (id) => {
    setFlashId(id);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashId(null), FLASH_MS);
  };

  const gs1Patch = (line, entry, gs1) => {
    const patch = {};
    if (gs1 && line.trackExpiry) {
      if (gs1.batch && !entry.batchNo) patch.batchNo = gs1.batch;
      if (gs1.expiry && !entry.expiryDate) patch.expiryDate = gs1.expiry;
    }
    return patch;
  };

  /** Add `delta` PO units by hand (stepper, keypad); returns the new total. */
  const addToLine = (line, delta, { scanned = false, gs1 = null } = {}) => {
    const e = entriesRef.current[line.poLineId];
    if (!e) return 0;
    const total = Math.max(0, addQty(parseQty(e.received) ?? 0, delta));
    const patch = { ...manualQtyPatch(total), ...gs1Patch(line, e, gs1) };
    if (scanned) patch.scannedAt = Date.now();
    patchLine(line.poLineId, patch);
    return total;
  };

  const undoScan = (line, units, delta) => {
    const e = entriesRef.current[line.poLineId];
    if (!e) return;
    const left = addUnits(e.scanUnits || 0, -units);
    const factor = lineFactor(line, e);
    if (e.scanBase != null && left >= 0 && factor) {
      patchLine(line.poLineId, { received: qtyText(addQty(e.scanBase, unitsToPoQty(left, factor))), scanUnits: left });
    } else {
      // Typed over since that scan: take its share off what is there.
      patchLine(line.poLineId, manualQtyPatch(Math.max(0, subQty(parseQty(e.received) ?? 0, delta))));
    }
  };

  const showScanToast = (line, delta, total, units) => {
    toastSeqRef.current += 1;
    const toastId = `receive-scan-${line.poLineId}-${toastSeqRef.current}`;
    toast(
      <ScanToast
        name={line.productName}
        unit={line.unit}
        delta={delta}
        total={total}
        onUndo={() => {
          if (units == null) addToLine(line, -delta);
          else undoScan(line, units, delta);
          toast.dismiss(toastId);
        }}
      />,
      { toastId, autoClose: 4000, closeOnClick: false, hideProgressBar: true }
    );
  };

  /** One scan (or linked code) of `packFactor` stock units onto a PO line. */
  const applyItemScan = (line, packFactor, gs1 = null) => {
    const e = entriesRef.current[line.poLineId];
    if (!e) return;
    const factor = lineFactor(line, e);
    if (isDecimalUnit(line.unit) || factor == null) {
      const received = parseQty(e.received) ?? 0;
      setPad({
        poLineId: line.poLineId, mode: "add", scanned: true, gs1,
        initial: Math.max(0, subQty(line.openAtHotel, received)),
      });
      return;
    }
    const units = Number(packFactor) > 0 ? Number(packFactor) : 1;
    const prev = parseQty(e.received) ?? 0;
    const counting = e.scanBase != null;
    const base = counting ? Number(e.scanBase) : prev;
    const scanUnits = addUnits(counting ? e.scanUnits || 0 : 0, units);
    const total = addQty(base, unitsToPoQty(scanUnits, factor));
    const delta = subQty(total, prev);
    patchLine(line.poLineId, {
      received: qtyText(total), scanBase: base, scanUnits, scannedAt: Date.now(), ...gs1Patch(line, e, gs1),
    });
    flash(line.poLineId);
    showScanToast(line, delta, total, units);
  };

  const lineForItem = (it) =>
    it?.poLineId != null
      ? lineById.get(Number(it.poLineId))
      : lines.find((l) => l.invItemId != null && Number(l.invItemId) === Number(it?.invItemId));

  const onScanResolved = (result, meta) => {
    const data = ctxRef.current;
    if (!result || !data) return;
    const thisPo = Number(data.po?.id);
    if (result.kind === "item") {
      const it = result.item || {};
      const line = lineForItem(it);
      if (!line) {
        toast.warn(`${it.displayName || "That item"} isn't on this PO`);
        return;
      }
      applyItemScan(line, it.packFactor, result.gs1 || meta?.parsed?.gs1 || null);
    } else if (result.kind === "dispatch") {
      if (result.poId != null && Number(result.poId) !== thisPo) {
        router.push(routes.receive(result.poId, { hotelId: result.hotelId, dispatchId: result.dispatchId }));
        return;
      }
      if ((data.dispatches || []).some((d) => String(d.id) === String(result.dispatchId))) {
        pickDispatch(String(result.dispatchId));
        toast.info("Receiving against that dispatch note");
      } else {
        toast.warn(`That dispatch note isn't on its way to ${data.hotel?.name || "this hotel"}`);
      }
    } else if (result.kind === "po") {
      if (Number(result.poId) === thisPo) toast.info("You are already receiving this PO");
      else router.push(routes.receive(result.poId));
    } else if (result.kind === "grn") {
      toast.info("That is a goods receipt, not an item on this delivery");
    }
  };

  const onScanUnknown = (code) => {
    if (canLinkCodes && code) setUnknownCode(code);
    else toast.warn(`${code || "That code"} isn't recognised. Enter the qty by hand.`);
  };

  const onCodeLinked = (info) => {
    setUnknownCode(null);
    const line = lineForItem(info);
    if (line) applyItemScan(line, info.packFactor);
  };

  const onPadDone = (qty) => {
    const p = pad;
    setPad(null);
    const line = p && lineById.get(Number(p.poLineId));
    if (!line) return;
    if (p.mode === "add") {
      if (!(qty > 0)) return;
      const total = addToLine(line, qty, { scanned: p.scanned, gs1: p.gs1 });
      flash(line.poLineId);
      if (p.scanned) showScanToast(line, qty, total, null);
    } else {
      patchLine(line.poLineId, manualQtyPatch(qty));
    }
  };

  /** Phone stepper: ±1 PO unit by hand. */
  const stepLine = (line, delta) => addToLine(line, delta);

  /** Phone: tap the qty to type it. */
  const openSetPad = (line) =>
    setPad({
      poLineId: line.poLineId, mode: "set", scanned: false, gs1: null,
      initial: parseQty(entriesRef.current[line.poLineId]?.received) ?? 0,
    });

  return {
    flashId,
    pad,
    closePad: () => setPad(null),
    unknownCode,
    closeUnknown: () => setUnknownCode(null),
    onScanResolved,
    onScanUnknown,
    onCodeLinked,
    onPadDone,
    stepLine,
    openSetPad,
  };
}
