import React from "react";
import Link from "next/link";
import { Check, CircleAlert, Clock3, Loader2, RotateCcw, X } from "lucide-react";
import { countPath, fmtDateTime, fmtQty, fmtSignedQty } from "./countUtils";
import styles from "./counts.module.scss";

// One line of the counting screen: name, code and bin; the system figures when
// the count is not blind; the qty box (or the saved figure for a viewer); the
// save state; and the line's error with Retry when re-sending can help.

const LineState = ({ state, entry }) => {
  switch (state) {
    case "saved":
      return (
        <span className={`${styles.lineState} ${styles.stateSaved}`} title="Saved">
          <Check size={16} aria-hidden="true" />
          <span className={styles.srOnly}>Saved</span>
        </span>
      );
    case "saving":
      return (
        <span className={`${styles.lineState} ${styles.stateBusy}`} title="Saving">
          <Loader2 size={16} className={styles.spin} aria-hidden="true" />
          <span className={styles.srOnly}>Saving</span>
        </span>
      );
    case "dirty":
      return (
        <span className={`${styles.lineState} ${styles.stateDirty}`} title="Waiting to save">
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.srOnly}>Waiting to save</span>
        </span>
      );
    case "queued":
      return (
        <span className={`${styles.lineState} ${styles.stateQueued}`} title="Kept on this device until it syncs">
          <Clock3 size={16} aria-hidden="true" />
          <span className={styles.srOnly}>Waiting for connection</span>
        </span>
      );
    case "error":
    case "invalid":
      // The line's error text (below) says what went wrong.
      return (
        <span className={`${styles.lineState} ${styles.stateError}`} title={entry?.error || "Not saved"} aria-hidden="true">
          <CircleAlert size={16} />
        </span>
      );
    default:
      return <span className={styles.lineState} aria-hidden="true" />;
  }
};

/**
 * Props: { row, entry, state, showFigures, canCount, active, needsCount, inputRef(el),
 *          onChange(text), onKeyDown(e), onBlur(), onRetry(), onRemove? }
 * `onRemove` is given for a line found while counting that the count does not hold yet.
 */
const CountLine = ({
  row,
  entry,
  state,
  showFigures,
  canCount,
  active,
  needsCount,
  inputRef,
  onChange,
  onKeyDown,
  onBlur,
  onRetry,
  onRemove,
}) => {
  const value = entry ? entry.draft : row.countedQty == null ? "" : String(row.countedQty);
  const sys = showFigures && row.systemQtyAtCount != null ? row.systemQtyAtCount : null;
  const diff = showFigures && state === "saved" && row.varianceQty != null ? row.varianceQty : null;
  const broken = state === "error" || state === "invalid";
  const lineCls = [styles.line, active ? styles.lineActive : "", needsCount ? styles.lineNeedsCount : "", broken ? styles.lineHasError : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={lineCls} data-state={state}>
      <div className={styles.lineMain}>
        <div className={styles.lineName}>{row.displayName}</div>
        <div className={styles.lineMeta}>
          {row.itemCode && <span className={styles.mono}>{row.itemCode}</span>}
          {row.isNew && <span className={styles.tag}>Found while counting</span>}
          {needsCount && <span className={`${styles.tag} ${styles.tagWarn}`}>Not counted yet</span>}
          {state === "saved" && row.countedByName && (
            <span className={styles.faint}>{[row.countedByName, fmtDateTime(row.countedAt)].filter(Boolean).join(" · ")}</span>
          )}
        </div>
        {sys !== null && (
          <div className={styles.lineFigures}>
            <span className={styles.figLabel}>System</span>
            <span className={styles.num}>{fmtQty(sys)}</span>
            {diff !== null && (
              <>
                <span className={styles.figLabel}>Diff</span>
                <span className={`${styles.num} ${diff < 0 ? styles.neg : diff > 0 ? styles.pos : styles.muted}`}>{fmtSignedQty(diff)}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.lineQty}>
        {canCount ? (
          <input
            ref={inputRef}
            className={styles.qtyInput}
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            // A scanner trigger pulled while this box has focus is a scan:
            // the wedge claims it (see CountSession's onQtyKeyDown), not a quantity.
            data-scan-input="true"
            aria-label={`Counted qty for ${row.displayName}`}
            aria-invalid={broken ? true : undefined}
            placeholder="Qty"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
          />
        ) : (
          <span className={`${styles.num} ${styles.qtyRead}`}>{fmtQty(row.countedQty)}</span>
        )}
        <span className={styles.uom}>{row.stockUom}</span>
      </div>

      <LineState state={state} entry={entry} />

      {broken && entry?.error && (
        <div className={styles.lineError} role="alert">
          <span>
            {entry.error}
            {entry.other && (
              <>
                {" "}
                <Link href={countPath(entry.other.id)} className={styles.inlineLink}>
                  {entry.other.number || `count #${entry.other.id}`}
                </Link>
              </>
            )}
          </span>
          {entry.retry && (
            <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={onRetry}>
              <RotateCcw size={14} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      )}

      {onRemove && (
        <div className={styles.lineAside}>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onRemove} aria-label={`Remove ${row.displayName}`}>
            <X size={14} aria-hidden="true" />
            Remove
          </button>
        </div>
      )}
    </li>
  );
};

export default CountLine;
