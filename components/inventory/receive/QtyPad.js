import React, { useEffect, useId, useState } from "react";
import { Modal } from "react-bootstrap";
import { Delete, X } from "lucide-react";
import { fmtQty, parseQty, qtyText, subQty } from "./receiveUtils";
import styles from "./receive.module.scss";

// Numeric keypad for weighed / measured units (kg, L) and for editing a qty
// on a phone card. "100" for 100 kg paneer is one scan plus one entry.
//
//   mode "add": the typed qty is added to what is already received (a scan);
//   mode "set": the typed qty replaces it (tapping the qty on a card).
// Props: { show, title, unit, initial, mode, receivedSoFar, openQty, labels, onDone(qty), onHide }
//
// `labels` (optional, any subset) rewords the pad for another flow, e.g. mark out:
//   qty    the line under the title    add: "Qty in this delivery", set: "Received qty"
//   soFar  label for receivedSoFar     "Received so far" (null hides that figure)
//   open   label for openQty           "Open"
//   fill   quick-fill button           add: "Rest of open qty", set: "Open qty"

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];

const defaultLabels = (mode) => ({
  qty: mode === "add" ? "Qty in this delivery" : "Received qty",
  soFar: "Received so far",
  open: "Open",
  fill: mode === "add" ? "Rest of open qty" : "Open qty",
});

const QtyPad = ({
  show, title, unit, initial, mode = "add", receivedSoFar = 0, openQty = null, labels = null, onDone, onHide,
}) => {
  const titleId = useId();
  const copy = defaultLabels(mode);
  for (const [k, v] of Object.entries(labels || {})) if (v !== undefined) copy[k] = v;
  const [text, setText] = useState("");

  useEffect(() => {
    if (show) setText(initial != null && Number(initial) > 0 ? qtyText(initial) : "");
  }, [show, initial]);

  const press = (k) => {
    setText((t) => {
      if (k === "." && t.includes(".")) return t;
      const next = t === "0" && k !== "." ? k : `${t}${k}`;
      const [, dec = ""] = next.split(".");
      return dec.length > 4 ? t : next;
    });
  };
  const back = () => setText((t) => t.slice(0, -1));

  // "Open qty" fills what is still open: in add mode that is open − already received.
  const fillQty = openQty == null ? null : mode === "add" ? Math.max(0, subQty(openQty, receivedSoFar || 0)) : Number(openQty);
  const qty = parseQty(text);
  const valid = qty !== null && qty > 0;
  const verb = mode === "add" ? "Add" : "Set";
  const confirmLabel = `${verb} ${valid ? fmtQty(qty) : ""}${unit ? ` ${unit}` : ""}`.replace(/\s+/g, " ").trim();

  const done = () => {
    if (!valid && mode === "add") return;
    onDone?.(qty ?? 0);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      aria-labelledby={titleId}
      dialogClassName={styles.sheetDialog}
      contentClassName={styles.sheet}
    >
      <div className={styles.sheetHead}>
        <div>
          <h2 id={titleId} className={styles.sheetTitle}>{title}</h2>
          <div className={styles.sheetSub}>{copy.qty}</div>
        </div>
        <button type="button" className={styles.sheetClose} onClick={onHide} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.sheetBody}>
        <input
          className={styles.padDisplay}
          inputMode="decimal"
          aria-label={`Qty in ${unit || "units"}`}
          value={text}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, "");
            if ((v.match(/\./g) || []).length <= 1) setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              done();
            }
          }}
          placeholder="0"
        />
        <div className={styles.padMeta}>
          {copy.soFar != null && copy.soFar !== "" && (
            <span>{copy.soFar} <span className={styles.mono}>{fmtQty(receivedSoFar)}</span></span>
          )}
          {openQty != null && <span>{copy.open} <span className={styles.mono}>{fmtQty(openQty)}</span> {unit}</span>}
        </div>
        <div className={styles.padGrid}>
          {KEYS.map((k) => (
            <button key={k} type="button" className={styles.padKey} onClick={() => press(k)} aria-label={k}>
              {k}
            </button>
          ))}
          <button type="button" className={styles.padKey} onClick={back} aria-label="Delete last digit">
            <Delete size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.padAux}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setText("")}>
            Clear
          </button>
          {fillQty != null && fillQty > 0 && (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setText(qtyText(fillQty))}>
              {copy.fill}
            </button>
          )}
        </div>
      </div>
      <div className={styles.sheetFoot}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide}>
          Cancel
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={done}
          disabled={mode === "add" ? !valid : qty === null}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default QtyPad;
