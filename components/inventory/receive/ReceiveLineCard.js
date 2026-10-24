import React from "react";
import { Minus, Plus, Ruler, SlidersHorizontal } from "lucide-react";
import RejectReasonSelect from "./RejectReasonSelect";
import ItemMatchPrompt from "./ItemMatchPrompt";
import { AcceptedInput, LineMessages, shelfLifeHint } from "./ReceiveLineRow";
import { fmtQty, inr, isDecimalUnit, lineQty } from "./receiveUtils";
import styles from "./receive.module.scss";

// One PO line on the phone: big − / qty / + controls (the qty opens the
// keypad), accepted / rejected at a glance, and the rarer fields (rejects,
// batch and expiry, mark out) folded under "More". Same line props as
// ReceiveLineRow, plus onStep(delta) and onOpenPad().

const ReceiveLineCard = ({
  line, entry, onChange, error = null, flash = false, showPrices = true, allowMarkOut = true,
  departments = [], allowItemSetup = true, suggestions = [], receivedAt, onOpenUom, onStep, onOpenPad,
}) => {
  const name = line.productName;
  const unit = line.unit || "";
  const { received, rejected, accepted } = lineQty(entry);
  const decimal = isDecimalUnit(unit);
  const hint = shelfLifeHint(line, entry, receivedAt);
  const showMatch = allowItemSetup && !line.invItemId && suggestions.length > 0;
  const done = Number(line.openAtHotel) <= 0;
  const openMore = Number(rejected) > 0 || entry.markOut || (line.trackExpiry && Number(received) > 0) || !!error;
  const factorSet = entry.uomFactor !== "";

  return (
    <article data-testid="receive-card" className={`${styles.rcard} ${flash ? styles.lineFlash : ""}`}>
      <div className={styles.rcardHead}>
        <h3 className={styles.rcardTitle}>{name}</h3>
        {entry.scannedAt > 0 ? (
          <span className={`${styles.pill} ${styles.pillInfo}`}><span className={styles.dot} />Scanned</span>
        ) : done ? (
          <span className={`${styles.pill} ${styles.pillOk}`}><span className={styles.dot} />Received</span>
        ) : null}
      </div>
      <div className={styles.rcardMeta}>
        <span>Open <span className={styles.mono}>{fmtQty(line.openAtHotel)}</span> {unit}</span>
        <span>Max <span className={styles.mono}>{fmtQty(line.maxAcceptable)}</span></span>
        {showPrices && line.costPerPoUnit != null && <span className={styles.mono}>{inr(line.costPerPoUnit)}</span>}
        {line.trackExpiry && <span>Expiry tracked</span>}
      </div>

      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.stepBtn}
          aria-label={`Remove one ${unit} of ${name}`}
          onClick={() => onStep(-1)}
          disabled={!(Number(received) > 0)}
        >
          <Minus size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.qtyBtn}
          aria-label={`Edit received qty for ${name}`}
          onClick={onOpenPad}
        >
          <span className={styles.qtyBig}>{fmtQty(received ?? 0)}</span>
          <span className={styles.unit}>{unit}</span>
        </button>
        <button
          type="button"
          className={styles.stepBtn}
          aria-label={`Add one ${unit} of ${name}`}
          onClick={() => (decimal ? onOpenPad() : onStep(1))}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.splitRow}>
        <span>Accepted <strong>{fmtQty(accepted ?? 0)}</strong></span>
        <span>Rejected <strong>{fmtQty(rejected ?? 0)}</strong></span>
        {line.needsUomFactor && (onOpenUom ? (
          <button type="button" className={`${styles.pill} ${styles.pillBtn} ${factorSet ? styles.pillOk : styles.pillWarn}`} onClick={onOpenUom}>
            <Ruler size={11} aria-hidden="true" />
            {factorSet ? `1 ${unit} = ${entry.uomFactor} ${line.stockUom}` : "Set unit conversion"}
          </button>
        ) : (
          <span className={`${styles.pill} ${styles.pillWarn}`}>
            <Ruler size={11} aria-hidden="true" />
            No unit conversion yet
          </span>
        ))}
      </div>

      <details className={styles.cardMore} open={openMore || undefined}>
        <summary>
          <SlidersHorizontal size={15} aria-hidden="true" />
          {line.trackExpiry ? "Reject, batch and expiry" : allowMarkOut ? "Reject or mark out" : "Reject"}
        </summary>
        <div className={styles.cardFields}>
          <div className={styles.cardField}>
            <label className={styles.label} htmlFor={`m-rej-${line.poLineId}`}>Rejected qty</label>
            <input
              id={`m-rej-${line.poLineId}`}
              className={`${styles.input} ${styles.mono}`}
              inputMode="decimal"
              aria-label={`Rejected qty for ${name}`}
              value={entry.rejected}
              placeholder="0"
              onChange={(e) => onChange({ rejected: e.target.value })}
            />
          </div>
          {Number(rejected) > 0 && (
            <div className={styles.cardField}>
              <RejectReasonSelect
                label={`Rejection reason for ${name}`}
                value={entry.reason}
                invalid={!entry.reason && !!error}
                onChange={(reason) => onChange({ reason })}
              />
            </div>
          )}
          <div className={styles.cardField}>
            <label className={styles.label} htmlFor={`m-acc-${line.poLineId}`}>Accepted qty</label>
            <AcceptedInput
              className={`${styles.input} ${styles.mono}`}
              label={`Accepted qty for ${name}`}
              entry={entry}
              onChange={onChange}
            />
          </div>
          {line.trackExpiry && (
            <>
              <div className={styles.cardField}>
                <label className={styles.label} htmlFor={`m-exp-${line.poLineId}`}>Expiry date</label>
                <input
                  id={`m-exp-${line.poLineId}`}
                  type="date"
                  className={styles.input}
                  aria-label={`Expiry date for ${name}`}
                  value={entry.expiryDate}
                  onChange={(e) => onChange({ expiryDate: e.target.value })}
                />
              </div>
              <div className={styles.cardField}>
                <label className={styles.label} htmlFor={`m-batch-${line.poLineId}`}>Batch</label>
                <input
                  id={`m-batch-${line.poLineId}`}
                  className={styles.input}
                  aria-label={`Batch for ${name}`}
                  value={entry.batchNo}
                  maxLength={64}
                  onChange={(e) => onChange({ batchNo: e.target.value })}
                />
              </div>
            </>
          )}
          {allowMarkOut && (
            <div className={styles.cardField}>
              <label className={styles.checkRow} style={{ minHeight: 44 }}>
                <input
                  type="checkbox"
                  checked={entry.markOut}
                  onChange={(e) => onChange({ markOut: e.target.checked })}
                  aria-label={`Mark out on arrival for ${name}`}
                />
                <span aria-hidden="true">Mark out on arrival</span>
              </label>
              {entry.markOut && (
                <select
                  className={styles.select}
                  aria-label={`Department for ${name}`}
                  value={entry.departmentId}
                  onChange={(e) => onChange({ departmentId: e.target.value })}
                >
                  <option value="">Department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </details>

      {showMatch && (
        <ItemMatchPrompt
          productName={name}
          suggestions={suggestions}
          chosenId={entry.mapToInvItemId}
          decided={entry.matchDecided}
          onChoose={(id) => onChange({ mapToInvItemId: id, matchDecided: true })}
          onReset={() => onChange({ mapToInvItemId: null, matchDecided: false })}
        />
      )}
      <LineMessages error={error} hint={hint} />
    </article>
  );
};

export default ReceiveLineCard;
