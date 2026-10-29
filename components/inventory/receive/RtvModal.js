import React, { useId, useState } from "react";
import { Modal } from "react-bootstrap";
import { Loader2, Truck, X } from "lucide-react";
import { cancelRtv, closeRtv, createRtv, dispatchRtv } from "@/services/inventory";
import RejectReasonSelect from "./RejectReasonSelect";
import { errorInfo, fmtQty, fmtQtyUnit, parseQty, rejectionLabel, subQty } from "./receiveUtils";
import styles from "./receive.module.scss";

// Return to vendor (grn.approve), one dialog through the RTV's life:
//   create   → pick REPLACE (vendor sends the goods again) or CREDIT (vendor
//              credits the amount), qty and reason per line → POST /rtv (a draft)
//   dispatch → the goods leave with a return challan → POST /rtv/:id/dispatch
//              (moves stock out; a CONFLICT message from the server is shown as is)
//   close    → CREDIT: the vendor's credit note ref; REPLACE: replacements are in
//
// Props: { show, grn, rtv (for dispatch / close), step 'create'|'dispatch'|'close',
//          heldByOtherRtvs {[grnLineId]: qty on other open returns}, onHide, onChanged() }

const DISPOSITIONS = [
  { value: "REPLACE", label: "Replacement", hint: "The vendor sends the goods again; the PO reopens for them." },
  { value: "CREDIT", label: "Credit note", hint: "The vendor credits the amount; the qty is not expected again." },
];

const returnableOf = (l, held) =>
  Math.max(0, subQty(subQty(l.acceptedQty, l.reversedQty || 0), held?.[l.id] || 0));

const RtvModal = ({ show, grn, rtv: rtvIn = null, step: stepIn = "create", heldByOtherRtvs = {}, onHide, onChanged }) => {
  const titleId = useId();
  const challanId = useId();
  const creditId = useId();
  const remarksId = useId();
  const [step, setStep] = useState(stepIn);
  const [rtv, setRtv] = useState(rtvIn);
  const [disposition, setDisposition] = useState("REPLACE");
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState({});
  const [remarks, setRemarks] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [creditNoteRef, setCreditNoteRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  const [lineErrors, setLineErrors] = useState({});
  const [done, setDone] = useState(null);

  const lines = (grn?.lines || []).filter((l) => returnableOf(l, heldByOtherRtvs) > 0);
  const picked = lines
    .map((l) => ({ line: l, q: parseQty(qty[l.id]) }))
    .filter((x) => x.q !== null && x.q > 0);

  const run = async (fn, fallback) => {
    setBusy(true);
    setSheetError(null);
    try {
      return await fn();
    } catch (err) {
      const info = errorInfo(err, fallback);
      const d = info.details || {};
      if (info.code === "VALIDATION" && d.grnLineId != null && d.returnable != null) {
        setLineErrors({ [d.grnLineId]: `Only ${fmtQty(d.returnable)} can go back` });
      } else {
        setSheetError(info.message);
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const errs = {};
    for (const l of lines) {
      const q = parseQty(qty[l.id]);
      if (q === null) errs[l.id] = "Enter a number";
      else if (q > returnableOf(l, heldByOtherRtvs)) errs[l.id] = `Only ${fmtQty(returnableOf(l, heldByOtherRtvs))} can go back`;
      else if (q > 0 && !reason[l.id]) errs[l.id] = "Pick a reason";
    }
    setLineErrors(errs);
    if (Object.keys(errs).length) return;
    if (!picked.length) {
      setSheetError("Enter the qty going back on at least one line");
      return;
    }
    const created = await run(
      () =>
        createRtv({
          grnId: grn.id,
          disposition,
          remarks: remarks.trim(),
          lines: picked.map(({ line, q }) => ({ grnLineId: line.id, qty: q, reason: reason[line.id] })),
        }),
      "Could not create the return."
    );
    if (created) {
      setRtv(created);
      setStep("dispatch");
      onChanged?.();
    }
  };

  const dispatch = async () => {
    const payload = challanNo.trim() ? { challanNo: challanNo.trim() } : {};
    const res = await run(() => dispatchRtv(rtv.id, payload), "Could not dispatch the return.");
    if (res) {
      setRtv(res);
      setDone(`Return ${res.rtvNumber || ""} dispatched. The stock has gone out.`.replace(/\s+/g, " "));
      onChanged?.();
    }
  };

  const close = async () => {
    const payload = rtv?.disposition === "CREDIT" ? { creditNoteRef: creditNoteRef.trim() } : {};
    const res = await run(() => closeRtv(rtv.id, payload), "Could not close the return.");
    if (res) {
      setRtv(res);
      setDone(rtv?.disposition === "CREDIT" ? "Return closed against the credit note." : "Return closed: the replacements are in.");
      onChanged?.();
    }
  };

  const cancel = async () => {
    const res = await run(() => cancelRtv(rtv.id), "Could not cancel the return.");
    if (res) {
      setDone("Return cancelled. Nothing left the store.");
      onChanged?.();
    }
  };

  const rtvLines = rtv?.lines || [];

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
          <h2 id={titleId} className={styles.sheetTitle}>Return to vendor</h2>
          <div className={styles.sheetSub}>
            {rtv?.rtvNumber ? <span className={styles.mono}>{rtv.rtvNumber}</span> : <span className={styles.mono}>{grn?.grnNumber}</span>}
            {grn?.vendorName ? ` · ${grn.vendorName}` : ""}
          </div>
        </div>
        <button type="button" className={styles.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.sheetBody}>
        {done ? (
          <p className={styles.sheetNote} role="status">{done}</p>
        ) : step === "create" ? (
          <>
            <div className={styles.choiceRow} role="radiogroup" aria-label="What the vendor does">
              {DISPOSITIONS.map((d) => (
                <label key={d.value} className={`${styles.choice} ${disposition === d.value ? styles.choiceOn : ""}`}>
                  <input
                    type="radio"
                    name={`${titleId}-disposition`}
                    checked={disposition === d.value}
                    onChange={() => setDisposition(d.value)}
                  />
                  <span><strong>{d.label}</strong>{d.hint}</span>
                </label>
              ))}
            </div>
            {lines.length === 0 ? (
              <p className={styles.sheetNote}>Nothing on this receipt can go back: it has been reversed or returned already.</p>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: 14 }}>
                <table className={styles.modalTable}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className={styles.num}>Can return</th>
                      <th className={styles.num}>Return</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <div className={styles.itName}>{l.productName}</div>
                          {lineErrors[l.id] && (
                            <div className={`${styles.lineMsg} ${styles.lineError}`} role="alert">
                              <span>{lineErrors[l.id]}</span>
                            </div>
                          )}
                        </td>
                        <td className={styles.num}>{fmtQtyUnit(returnableOf(l, heldByOtherRtvs), l.poUom)}</td>
                        <td className={styles.num}>
                          <input
                            className={`${styles.input} ${styles.qtyInput}`}
                            inputMode="decimal"
                            aria-label={`Qty to return for ${l.productName}`}
                            placeholder="0"
                            value={qty[l.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setQty((m) => ({ ...m, [l.id]: v }));
                            }}
                          />
                        </td>
                        <td>
                          <RejectReasonSelect
                            label={`Reason for ${l.productName}`}
                            value={reason[l.id] || ""}
                            invalid={!!lineErrors[l.id] && !reason[l.id]}
                            onChange={(v) => setReason((m) => ({ ...m, [l.id]: v }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <label className={styles.label} htmlFor={remarksId}>Remarks (optional)</label>
            <textarea
              id={remarksId}
              className={styles.textarea}
              maxLength={2000}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </>
        ) : (
          <>
            <div className={styles.summaryStrip}>
              <span>{rtv?.disposition === "CREDIT" ? "Credit note" : "Replacement"}</span>
              <span>Status <strong>{rtv?.status}</strong></span>
            </div>
            {rtvLines.length > 0 && (
              <ul className={styles.successList} style={{ marginTop: 0, marginBottom: 14 }}>
                {rtvLines.map((l) => (
                  <li key={l.grnLineId}>
                    <strong>{l.productName}</strong>
                    <span className={styles.mono}>{fmtQtyUnit(l.qty, l.unit)}</span>
                    <span className={styles.muted}>{rejectionLabel(l.reason)}</span>
                  </li>
                ))}
              </ul>
            )}
            {step === "dispatch" ? (
              <>
                <p className={styles.sheetNote}>
                  The return is saved as a draft. Dispatch it when the goods leave with the vendor&apos;s driver.
                </p>
                <label className={styles.label} htmlFor={challanId}>Return challan no.</label>
                <input
                  id={challanId}
                  className={styles.input}
                  maxLength={64}
                  autoComplete="off"
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                />
              </>
            ) : rtv?.disposition === "CREDIT" ? (
              <>
                <label className={styles.label} htmlFor={creditId}>Credit note ref.</label>
                <input
                  id={creditId}
                  className={styles.input}
                  maxLength={64}
                  autoComplete="off"
                  value={creditNoteRef}
                  onChange={(e) => setCreditNoteRef(e.target.value)}
                />
              </>
            ) : (
              <p className={styles.sheetNote}>Close the return once every replacement has been received.</p>
            )}
          </>
        )}

        {sheetError && (
          <div className={styles.sheetError} role="alert" style={{ marginTop: 12 }}>
            {sheetError}
          </div>
        )}
      </div>

      <div className={styles.sheetFoot}>
        {done ? (
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onHide}>
            Done
          </button>
        ) : step === "create" ? (
          <>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={create}
              disabled={busy || lines.length === 0}
            >
              {busy && <Loader2 size={14} className={styles.spin} aria-hidden="true" />}
              Create return
            </button>
          </>
        ) : step === "dispatch" ? (
          <>
            <button type="button" className={`${styles.btn} ${styles.btnDangerQuiet}`} onClick={cancel} disabled={busy}>
              Cancel return
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
              Later
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={dispatch} disabled={busy}>
              {busy ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <Truck size={14} aria-hidden="true" />}
              Dispatch now
            </button>
          </>
        ) : (
          <>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
              Later
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={close}
              disabled={busy || (rtv?.disposition === "CREDIT" && !creditNoteRef.trim())}
            >
              {busy && <Loader2 size={14} className={styles.spin} aria-hidden="true" />}
              Close return
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RtvModal;
