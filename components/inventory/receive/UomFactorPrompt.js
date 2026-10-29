import React, { useEffect, useId, useState } from "react";
import { Modal } from "react-bootstrap";
import { Ruler, X } from "lucide-react";
import { fmtFactor, fmtQty, parseFactor, poQtyToUnits } from "./receiveUtils";
import styles from "./receive.module.scss";

// The PO is in one unit (box), the store counts in another (piece). The first
// receipt in a new unit sets the conversion; the server stores it once and
// never overwrites it from a receipt.
//
//   mode "required": UOM_FACTOR_REQUIRED {poUnit, stockUom}: ask for it.
//   mode "mismatch": UOM_FACTOR_MISMATCH {currentFactor}: the item already has
//                    one; offer to use it (the page then sends no factor, so
//                    the server applies its stored one: no permission needed).
// Factors are numeric(18,6): typed, shown and sent at up to 6 decimals.
// Without inventory.update (`canSet` false) the prompt explains who can set it.
//
// Props: { show, mode, productName, poUnit, stockUom, receivedQty, currentFactor,
//          suppliedFactor, canSet, busy, submitLabel, onSubmit(factor), onHide }
// submitLabel names the "required" button: "Save and post" after a refused
// post, "Use this conversion" when the receiver sets it ahead of posting.

const UomFactorPrompt = ({
  show, mode = "required", productName, poUnit, stockUom, receivedQty = 0, currentFactor, suppliedFactor,
  canSet = true, busy = false, submitLabel = "Save and post", onSubmit, onHide,
}) => {
  const titleId = useId();
  const inputId = useId();
  const [text, setText] = useState("");

  useEffect(() => {
    if (show) setText("");
  }, [show]);

  const factor = parseFactor(text);
  const valid = factor !== null;
  const poU = poUnit || "PO unit";
  const stU = stockUom || "stock unit";
  const preview = valid && receivedQty > 0 ? poQtyToUnits(receivedQty, factor) : null;

  return (
    <Modal
      show={show}
      onHide={busy ? undefined : onHide}
      backdrop={busy ? "static" : true}
      keyboard={!busy}
      centered
      aria-labelledby={titleId}
      dialogClassName={styles.sheetDialog}
      contentClassName={styles.sheet}
    >
      <div className={styles.sheetHead}>
        <div>
          <h2 id={titleId} className={styles.sheetTitle}>Unit conversion needed</h2>
          <div className={styles.sheetSub}>{productName}</div>
        </div>
        <button type="button" className={styles.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.sheetBody}>
        {mode === "mismatch" ? (
          <p className={styles.sheetNote}>
            {productName} is already set to <span className={styles.mono}>{fmtFactor(currentFactor)}</span> {stU} per {poU}
            {suppliedFactor != null && (
              <> (this receipt said <span className={styles.mono}>{fmtFactor(suppliedFactor)}</span>)</>
            )}
            . A receipt can&apos;t change it; ask your inventory controller if it is wrong.
          </p>
        ) : canSet ? (
          <>
            <p className={styles.sheetNote}>
              This PO counts {productName} in {poU}; the store counts it in {stU}. Set it once and every receipt uses it.
            </p>
            <label htmlFor={inputId} className={styles.label}>{`How many ${stU} in one ${poU}?`}</label>
            <input
              id={inputId}
              className={`${styles.input} ${styles.qtyInput}`}
              style={{ width: "100%" }}
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <div className={styles.fieldHint}>
              {preview != null ? (
                <span className={styles.mono}>{`${fmtQty(receivedQty)} ${poU} = ${fmtQty(preview)} ${stU}`}</span>
              ) : (
                `e.g. 12 if one ${poU} holds 12 ${stU}`
              )}
            </div>
          </>
        ) : (
          <p className={styles.sheetNote}>
            Ask your inventory controller to set how many {stU} are in one {poU} for {productName}, then post again.
          </p>
        )}
      </div>
      <div className={styles.sheetFoot}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
          Cancel
        </button>
        {mode === "mismatch" ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => onSubmit(currentFactor)}
            disabled={busy}
          >
            <Ruler size={14} aria-hidden="true" />
            {`Use ${fmtFactor(currentFactor)} and post`}
          </button>
        ) : (
          canSet && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => onSubmit(factor)}
              disabled={!valid || busy}
            >
              {submitLabel}
            </button>
          )
        )}
      </div>
    </Modal>
  );
};

export default UomFactorPrompt;
