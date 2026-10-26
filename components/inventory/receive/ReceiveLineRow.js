import React, { useState } from "react";
import { AlertTriangle, CircleAlert, Ruler } from "lucide-react";
import RejectReasonSelect from "./RejectReasonSelect";
import ItemMatchPrompt from "./ItemMatchPrompt";
import { useQtyScanGuard } from "@/components/inventory/scan/useQtyScanGuard";
import { QTY_MAX_LENGTH, cleanQtyInput } from "@/components/inventory/stock/stockUtils";
import { daysBetween, fmtFactor, fmtQty, inr, lineQty, qtyText } from "./receiveUtils";
import styles from "./receive.module.scss";

// One PO line on the desktop Receive table. Its own <tbody>: the inputs row,
// plus a detail row for batch / expiry, the item-match question and messages.
// Accepted follows received − rejected; typing an accepted qty moves the rest
// to rejected. Shared line props (also ReceiveLineCard):
//   line (ReceiveContext line), entry (form state), onChange(patch), error,
//   flash, showPrices, allowMarkOut, departments, allowItemSetup,
//   suggestions[], receivedAt, onOpenUom(), onRestore(entry)
// The qty boxes take a keyboard-mode scanner's read as a scan, never as a qty
// (useQtyScanGuard): onRestore writes the line back as it was before the
// burst (defaults to onChange). A person's Enter leaves the box.
// Shelf-life hints (the server's SHORT_SHELF_LIFE / EXPIRED rules) show under
// the line while typing and again on the confirmation.

export const shelfLifeHint = (line, entry, receivedAt) => {
  if (!line.trackExpiry || !entry.expiryDate || !receivedAt) return null;
  const days = daysBetween(receivedAt, entry.expiryDate);
  if (days == null) return null;
  if (days < 0) return "Already expired: reject it as short shelf life, or check the date";
  if (line.minShelfLifeDays != null && days < line.minShelfLifeDays) {
    return `${days} day${days === 1 ? "" : "s"} of shelf life left (minimum ${line.minShelfLifeDays})`;
  }
  return null;
};

/** Accepted typed directly: the difference becomes rejected. */
export const acceptedPatch = (entry, text) => {
  const { received } = lineQty(entry);
  const typed = Number(String(text).replace(/,/g, ""));
  if (text === "" || !Number.isFinite(typed) || received == null) return { rejected: entry.rejected };
  const rejected = Math.max(0, Number(qtyText(received - typed)));
  return { rejected: rejected > 0 ? qtyText(rejected) : "" };
};

/**
 * Accepted = received − rejected. While the receiver types here the text is
 * theirs (not recomputed under the cursor); the difference goes to rejected.
 */
export const AcceptedInput = ({ entry, onChange, onRestore = onChange, label, className }) => {
  const [typing, setTyping] = useState(null);
  const qtyKeyDown = useQtyScanGuard(entry, onRestore);
  const { accepted } = lineQty(entry);
  const derived = entry.received === "" || accepted == null ? "" : qtyText(accepted);
  return (
    <input
      className={className}
      inputMode="decimal"
      aria-label={label}
      data-scan-input="true"
      maxLength={QTY_MAX_LENGTH}
      value={typing ?? derived}
      placeholder="0"
      onFocus={() => setTyping(derived)}
      onBlur={() => setTyping(null)}
      onKeyDown={qtyKeyDown(setTyping)}
      onChange={(e) => {
        const text = cleanQtyInput(e.target.value);
        setTyping(text);
        onChange(acceptedPatch(entry, text));
      }}
    />
  );
};

const LineMessages = ({ error, hint }) => (
  <>
    {error && (
      <div className={`${styles.lineMsg} ${styles.lineError}`} role="alert">
        <CircleAlert size={14} aria-hidden="true" />
        <span>{error}</span>
      </div>
    )}
    {hint && (
      <div className={`${styles.lineMsg} ${styles.lineWarn}`}>
        <AlertTriangle size={14} aria-hidden="true" />
        <span>{hint}</span>
      </div>
    )}
  </>
);
export { LineMessages };

const ReceiveLineRow = ({
  index, line, entry, onChange, error = null, flash = false, showPrices = true,
  allowMarkOut = true, departments = [], allowItemSetup = true, suggestions = [], receivedAt, onOpenUom,
  onRestore = onChange,
}) => {
  const qtyKeyDown = useQtyScanGuard(entry, onRestore);
  const name = line.productName;
  const unit = line.unit || "";
  const rejectedQty = Number(entry.rejected || 0);
  const done = Number(line.openAtHotel) <= 0;
  const hint = shelfLifeHint(line, entry, receivedAt);
  const showMatch = allowItemSetup && !line.invItemId && suggestions.length > 0;
  const hasDetail = line.trackExpiry || showMatch || !!error || !!hint;
  const factorSet = entry.uomFactor !== "";

  return (
    <tbody className={`${styles.lineGroup} ${hasDetail ? styles.hasDetail : ""}`}>
      <tr className={`${styles.lineMain} ${flash ? styles.lineFlash : ""} ${done ? styles.lineDone : ""}`}>
        <td className={styles.itIdx}>{index + 1}</td>
        <td>
          <div className={styles.itName}>{name}</div>
          <div className={styles.itMeta}>
            <span>Max <span className={styles.mono}>{fmtQty(line.maxAcceptable)}</span> {unit}</span>
            {line.uomFactor != null && line.stockUom && line.stockUom !== line.unit && (
              <span>1 {unit} = <span className={styles.mono}>{fmtFactor(line.uomFactor)}</span> {line.stockUom}</span>
            )}
            {showPrices && line.costPerPoUnit != null && (
              <span className={styles.mono}>{inr(line.costPerPoUnit)} / {unit}</span>
            )}
            {line.trackExpiry && <span className={`${styles.pill} ${styles.pillNeutral}`}>Expiry tracked</span>}
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
            {done && <span className={`${styles.pill} ${styles.pillOk}`}><span className={styles.dot} />Received</span>}
          </div>
        </td>
        <td className={styles.num} data-label="Open">
          {fmtQty(line.openAtHotel)} <span className={styles.unit}>{unit}</span>
        </td>
        <td className={styles.num}>
          <span className={styles.qtyCellUnit}>
            <input
              className={`${styles.input} ${styles.qtyInput}`}
              inputMode="decimal"
              aria-label={`Received qty for ${name}`}
              data-scan-input="true"
              maxLength={QTY_MAX_LENGTH}
              value={entry.received}
              placeholder="0"
              onKeyDown={qtyKeyDown()}
              onChange={(e) => onChange({ received: cleanQtyInput(e.target.value) })}
            />
          </span>
        </td>
        <td className={styles.num}>
          <AcceptedInput
            className={`${styles.input} ${styles.qtyInput}`}
            label={`Accepted qty for ${name}`}
            entry={entry}
            onChange={onChange}
            onRestore={onRestore}
          />
        </td>
        <td className={styles.num}>
          <input
            className={`${styles.input} ${styles.qtyInput}`}
            inputMode="decimal"
            aria-label={`Rejected qty for ${name}`}
            data-scan-input="true"
            maxLength={QTY_MAX_LENGTH}
            value={entry.rejected}
            placeholder="0"
            onKeyDown={qtyKeyDown()}
            onChange={(e) => onChange({ rejected: cleanQtyInput(e.target.value) })}
          />
          {rejectedQty > 0 && (
            <RejectReasonSelect
              className={styles.reasonSelect}
              label={`Rejection reason for ${name}`}
              value={entry.reason}
              invalid={!entry.reason && !!error}
              onChange={(reason) => onChange({ reason })}
            />
          )}
        </td>
        {allowMarkOut && (
          <td>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={entry.markOut}
                onChange={(e) => onChange({ markOut: e.target.checked })}
                aria-label={`Mark out on arrival for ${name}`}
              />
              <span aria-hidden="true">Mark out</span>
            </label>
            {entry.markOut && (
              <select
                className={styles.select}
                style={{ marginTop: 6, minWidth: 140 }}
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
          </td>
        )}
      </tr>
      {hasDetail && (
        <tr className={styles.lineDetail}>
          <td />
          <td colSpan={allowMarkOut ? 6 : 5}>
            {line.trackExpiry && (
              <div className={styles.detailRow}>
                <div className={styles.detailField}>
                  <label className={styles.label} htmlFor={`batch-${line.poLineId}`}>Batch</label>
                  <input
                    id={`batch-${line.poLineId}`}
                    className={styles.input}
                    aria-label={`Batch for ${name}`}
                    value={entry.batchNo}
                    maxLength={64}
                    onChange={(e) => onChange({ batchNo: e.target.value })}
                  />
                </div>
                <div className={styles.detailField}>
                  <label className={styles.label} htmlFor={`mfg-${line.poLineId}`}>Mfg date</label>
                  <input
                    id={`mfg-${line.poLineId}`}
                    type="date"
                    className={styles.input}
                    aria-label={`Mfg date for ${name}`}
                    value={entry.mfgDate}
                    onChange={(e) => onChange({ mfgDate: e.target.value })}
                  />
                </div>
                <div className={styles.detailField}>
                  <label className={styles.label} htmlFor={`exp-${line.poLineId}`}>Expiry date</label>
                  <input
                    id={`exp-${line.poLineId}`}
                    type="date"
                    className={styles.input}
                    aria-label={`Expiry date for ${name}`}
                    value={entry.expiryDate}
                    onChange={(e) => onChange({ expiryDate: e.target.value })}
                  />
                </div>
              </div>
            )}
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
          </td>
        </tr>
      )}
    </tbody>
  );
};

export default ReceiveLineRow;
