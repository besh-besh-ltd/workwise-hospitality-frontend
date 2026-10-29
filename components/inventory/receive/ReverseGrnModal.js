import React, { useId, useState } from "react";
import { Modal } from "react-bootstrap";
import { Loader2, Undo2, X } from "lucide-react";
import { reverseGrn } from "@/services/inventory";
import { errorInfo, fmtQty, fmtQtyUnit, parseQty, subQty } from "./receiveUtils";
import styles from "./receive.module.scss";

// Reverse a posted receipt (POST /grn/:id/reverse, grn.approve): all of it, or
// some qty per line. The reversal is its own GRN document; stock that has
// already left the store, or gone back to the vendor, cannot be reversed and
// the server says how much (NEGATIVE_STOCK / CONFLICT RTV_COVERED).
//
// Props: { show, grn, onHide, onReversed(reversalGrn) }

const reversibleOf = (l) => Math.max(0, subQty(l.acceptedQty, l.reversedQty || 0));

const ReverseGrnModal = ({ show, grn, onHide, onReversed }) => {
  const titleId = useId();
  const reasonId = useId();
  const [scope, setScope] = useState("all");
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState(null); // {title, detail}
  const [lineErrors, setLineErrors] = useState({});

  const lines = (grn?.lines || []).filter((l) => reversibleOf(l) > 0);

  const picked = lines
    .map((l) => ({ line: l, q: parseQty(qty[l.id]) }))
    .filter((x) => x.q !== null && x.q > 0);
  const badLine = lines.find((l) => {
    const q = parseQty(qty[l.id]);
    return q === null || q > reversibleOf(l);
  });
  const canSubmit = !busy && reason.trim() !== "" && (scope === "all" || (picked.length > 0 && !badLine));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setRefusal(null);
    setLineErrors({});
    const payload = {
      reason: reason.trim(),
      lines: scope === "all" ? "all" : picked.map(({ line, q }) => ({ grnLineId: line.id, qty: q })),
    };
    try {
      const reversal = await reverseGrn(grn.id, payload);
      onReversed?.(reversal);
    } catch (err) {
      const info = errorInfo(err, "Could not reverse this receipt.");
      const d = info.details || {};
      if (info.code === "NEGATIVE_STOCK") {
        // Shortfall, stock and request are in the item's stock unit.
        const stockLine = (grn.lines || []).find(
          (l) => (d.invItemId != null && Number(l.invItemId) === Number(d.invItemId)) || (d.itemName && l.itemName === d.itemName)
        );
        const inStock = (n) => fmtQtyUnit(n, stockLine?.stockUom);
        setRefusal({
          title: `${inStock(d.shortfall)} of ${d.itemName || "this item"} has already left the store`,
          detail:
            d.available != null && d.requested != null
              ? `${inStock(d.available)} in stock, ${inStock(d.requested)} to reverse. Reverse less, or bring it back from the department first.`
              : "Reverse less, or bring it back from the department first.",
        });
      } else if (info.code === "CONFLICT" && d.reason === "RTV_COVERED") {
        const text = `${fmtQty(d.returnedQty)} already returned to vendor · up to ${fmtQty(d.maxReversible)} can be reversed`;
        const line = (grn.lines || []).find((l) => Number(l.id) === Number(d.grnLineId));
        if (scope !== "all" && line) setLineErrors({ [line.id]: text });
        else setRefusal({ title: line ? line.productName : "Part of this receipt", detail: text });
      } else {
        setRefusal({ title: info.message, detail: null });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={busy ? undefined : onHide}
      backdrop={busy ? "static" : true}
      keyboard={!busy}
      centered
      size="lg"
      aria-labelledby={titleId}
      dialogClassName={styles.sheetDialog}
      contentClassName={styles.sheet}
    >
      <div className={styles.sheetHead}>
        <div>
          <h2 id={titleId} className={styles.sheetTitle}>Reverse this receipt</h2>
          <div className={styles.sheetSub}>
            <span className={styles.mono}>{grn?.grnNumber}</span> · the stock comes back out and the PO reopens
          </div>
        </div>
        <button type="button" className={styles.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.sheetBody}>
        <div className={styles.choiceRow} role="radiogroup" aria-label="What to reverse">
          <label className={`${styles.choice} ${scope === "all" ? styles.choiceOn : ""}`}>
            <input
              type="radio"
              name={`${titleId}-scope`}
              aria-label="All lines"
              checked={scope === "all"}
              onChange={() => setScope("all")}
            />
            <span><strong>All lines</strong>Everything still on this receipt</span>
          </label>
          <label className={`${styles.choice} ${scope === "some" ? styles.choiceOn : ""}`}>
            <input
              type="radio"
              name={`${titleId}-scope`}
              aria-label="Only some lines"
              checked={scope === "some"}
              onChange={() => setScope("some")}
            />
            <span><strong>Only some lines</strong>Pick the qty per line</span>
          </label>
        </div>

        {scope === "some" && (
          <div style={{ overflowX: "auto", marginBottom: 14 }}>
            <table className={styles.modalTable}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th className={styles.num}>Can reverse</th>
                  <th className={styles.num}>Reverse</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const q = parseQty(qty[l.id]);
                  const tooMuch = q !== null && q > reversibleOf(l);
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className={styles.itName}>{l.productName}</div>
                        {lineErrors[l.id] && (
                          <div className={`${styles.lineMsg} ${styles.lineError}`} role="alert">
                            <span>{lineErrors[l.id]}</span>
                          </div>
                        )}
                        {tooMuch && (
                          <div className={`${styles.lineMsg} ${styles.lineError}`}>
                            <span>{`At most ${fmtQtyUnit(reversibleOf(l), l.poUom)}`}</span>
                          </div>
                        )}
                      </td>
                      <td className={styles.num}>{fmtQtyUnit(reversibleOf(l), l.poUom)}</td>
                      <td className={styles.num}>
                        <input
                          className={`${styles.input} ${styles.qtyInput} ${tooMuch ? styles.inputInvalid : ""}`}
                          inputMode="decimal"
                          aria-label={`Qty to reverse for ${l.productName}`}
                          placeholder="0"
                          value={qty[l.id] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setQty((m) => ({ ...m, [l.id]: v }));
                            setLineErrors((m) => {
                              if (!m[l.id]) return m;
                              const n = { ...m };
                              delete n[l.id];
                              return n;
                            });
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <label className={styles.label} htmlFor={reasonId}>Reason</label>
        <textarea
          id={reasonId}
          className={styles.textarea}
          value={reason}
          maxLength={2000}
          placeholder="Why is this receipt being reversed?"
          onChange={(e) => setReason(e.target.value)}
        />

        {refusal && (
          <div className={styles.sheetError} role="alert" style={{ marginTop: 12 }}>
            <strong style={{ display: "block" }}>{refusal.title}</strong>
            {refusal.detail && <span>{refusal.detail}</span>}
          </div>
        )}
      </div>
      <div className={styles.sheetFoot}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={submit} disabled={!canSubmit}>
          {busy ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <Undo2 size={14} aria-hidden="true" />}
          Reverse receipt
        </button>
      </div>
    </Modal>
  );
};

export default ReverseGrnModal;
