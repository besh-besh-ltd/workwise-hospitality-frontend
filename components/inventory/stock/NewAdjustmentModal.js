import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { Loader2, Send, Trash2, X } from "lucide-react";
import { createAdjustment } from "@/services/inventory";
import { fmtQty, newClientEventId, parseQty } from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "./HotelSelect";
import ItemPicker from "./ItemPicker";
import { ADJUSTMENT_REASONS, errorInfo, freezeMessage, lineProblems, reasonDirection } from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// Raise an adjustment (POST /adjustments, always submit:true). The reason sets
// the sign: wastage, breakage, expiry and theft take stock out; found brings
// it in; a correction asks per line. Qty is typed as a positive amount in the
// item's stock unit and sent signed. The server posts it at once when its
// value is within the company's auto-approve limit, else it waits for an
// approver.
//
// Props: { show, hotels [{id,name}], defaultHotelId, onHide, onCreated(adjustment) }

const lineKey = (l) => l.invItemId;

const NewAdjustmentModal = ({ show, hotels = [], defaultHotelId = null, onHide, onCreated }) => {
  const titleId = useId();
  const reasonId = useId();
  const remarksId = useId();
  const [hotelId, setHotelId] = useState(defaultHotelId);
  const [reasonCode, setReasonCode] = useState("");
  const [lines, setLines] = useState([]); // {invItemId, displayName, itemCode, stockUom, onHand, qty:'', dir:''}
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [problems, setProblems] = useState({});
  const keyRef = useRef(null);

  // A fresh form, and a fresh request key, each time the dialog opens.
  useEffect(() => {
    if (!show) return;
    setHotelId(defaultHotelId ?? (hotels[0]?.id ?? null));
    setReasonCode("");
    setLines([]);
    setRemarks("");
    setFormError(null);
    setFieldErrors({});
    setProblems({});
    keyRef.current = newClientEventId();
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const direction = reasonDirection(reasonCode);
  const picked = useMemo(() => new Set(lines.map(lineKey)), [lines]);
  const hotel = hotels.find((h) => Number(h.id) === Number(hotelId)) || null;

  const clearProblem = (id) =>
    setProblems((p) => {
      if (!p[id]) return p;
      const n = { ...p };
      delete n[id];
      return n;
    });

  const addItem = (item) => {
    setFieldErrors((e) => ({ ...e, lines: undefined }));
    setLines((ls) => (ls.some((l) => l.invItemId === item.invItemId)
      ? ls
      : [...ls, { ...item, onHand: item.qty, qty: "", dir: "" }]));
  };
  const patchLine = (id, patch) => {
    clearProblem(id);
    setLines((ls) => ls.map((l) => (l.invItemId === id ? { ...l, ...patch } : l)));
  };
  const removeLine = (id) => {
    clearProblem(id);
    setLines((ls) => ls.filter((l) => l.invItemId !== id));
  };

  const lineDir = (l) => (direction === "either" ? l.dir : direction);

  const submit = async () => {
    if (busy) return;
    setFormError(null);
    const errs = {};
    const lineErrs = {};
    if (!hotelId) errs.hotelId = "Choose the hotel";
    if (!reasonCode) errs.reasonCode = "Choose a reason";
    if (lines.length === 0) errs.lines = "Add at least one item";
    for (const l of lines) {
      const q = parseQty(l.qty);
      if (q === null || q <= 0) lineErrs[l.invItemId] = { message: "Enter a qty above 0" };
      else if (reasonCode && !lineDir(l)) lineErrs[l.invItemId] = { message: "Choose whether this adds to stock or takes it out" };
    }
    setFieldErrors(errs);
    setProblems(lineErrs);
    if (Object.keys(errs).length || Object.keys(lineErrs).length) return;

    const sentIds = lines.map((l) => l.invItemId);
    const payload = {
      hotelId: Number(hotelId),
      reasonCode,
      submit: true,
      clientEventId: keyRef.current,
      lines: lines.map((l) => {
        const q = parseQty(l.qty);
        return { invItemId: l.invItemId, qty: lineDir(l) === "out" ? -q : q };
      }),
    };
    if (remarks.trim()) payload.remarks = remarks.trim();

    setBusy(true);
    try {
      const res = await createAdjustment(payload);
      keyRef.current = newClientEventId();
      onCreated?.(res);
    } catch (err) {
      const info = errorInfo(err, "Could not raise the adjustment.");
      const d = info.details || {};
      const uomOf = (id) => lines.find((l) => l.invItemId === id)?.stockUom || "";
      if (info.httpStatus == null) {
        setFormError("The connection dropped before the server answered. Submit again: the same adjustment is never recorded twice.");
      } else if (info.code === "LOCKED") {
        setFormError(freezeMessage(d));
      } else if (info.code === "CONFLICT" && d.field === "clientEventId") {
        keyRef.current = newClientEventId();
        setFormError(info.message);
      } else if (info.code === "VALIDATION" && (d.field === "reasonCode" || d.field === "hotelId" || d.field === "remarks")) {
        setFieldErrors({ [d.field]: info.message });
      } else {
        const found = lineProblems(info, sentIds, { uomOf, verb: "takes out" });
        if (Object.keys(found).length) setProblems(found);
        else setFormError(info.message);
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
      dialogClassName={r.sheetDialog}
      contentClassName={r.sheet}
    >
      <div className={r.sheetHead}>
        <div>
          <h2 id={titleId} className={r.sheetTitle}>New adjustment</h2>
          <div className={r.sheetSub}>{hotel ? hotel.name : "Correct stock outside a receipt, mark out or count"}</div>
        </div>
        <button type="button" className={r.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={r.sheetBody}>
        <div className={r.formGrid}>
          {hotels.length > 1 && (
            <div>
              <HotelSelect
                hotels={hotels}
                value={hotelId ?? ""}
                onChange={(id) => {
                  setHotelId(id || null);
                  setLines([]);
                  setProblems({});
                }}
              />
              {fieldErrors.hotelId && <div className={s.fieldError}>{fieldErrors.hotelId}</div>}
            </div>
          )}
          <div>
            <label className={r.label} htmlFor={reasonId}>Reason</label>
            <select
              id={reasonId}
              className={`${r.select} ${fieldErrors.reasonCode ? r.inputInvalid : ""}`}
              value={reasonCode}
              aria-invalid={fieldErrors.reasonCode ? "true" : undefined}
              onChange={(e) => {
                setReasonCode(e.target.value);
                setFieldErrors((f) => ({ ...f, reasonCode: undefined }));
                setProblems({});
              }}
            >
              <option value="">Choose a reason…</option>
              {ADJUSTMENT_REASONS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}{x.direction === "out" ? " (out)" : x.direction === "in" ? " (in)" : " (in or out)"}
                </option>
              ))}
            </select>
            {fieldErrors.reasonCode && <div className={s.fieldError}>{fieldErrors.reasonCode}</div>}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <ItemPicker source="stock" hotelId={hotelId} onPick={addItem} exclude={picked} disabled={!hotelId || busy} />
          {fieldErrors.lines && <div className={s.fieldError}>{fieldErrors.lines}</div>}
        </div>

        {lines.length > 0 && (
          <ul className={s.lineList} aria-label="Items to adjust" style={{ marginTop: 12 }}>
            {lines.map((l) => {
              const problem = problems[l.invItemId];
              const dir = lineDir(l);
              return (
                <li key={l.invItemId} className={`${s.line} ${problem ? s.lineBad : ""}`} aria-label={l.displayName}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className={s.lineName}>{l.displayName}</div>
                    <div className={s.lineMeta}>
                      {l.onHand != null ? <>{fmtQty(l.onHand)} {l.stockUom} on hand</> : l.stockUom}
                    </div>
                    {problem && <div className={s.lineProblem} role="alert">{problem.message}</div>}
                  </div>
                  <div className={s.lineQty}>
                    {direction === "either" && (
                      <select
                        className={r.select}
                        aria-label={`Direction of ${l.displayName}`}
                        value={l.dir}
                        onChange={(e) => patchLine(l.invItemId, { dir: e.target.value })}
                        style={{ width: "auto" }}
                      >
                        <option value="">In or out?</option>
                        <option value="in">Add to stock</option>
                        <option value="out">Take out</option>
                      </select>
                    )}
                    {direction !== "either" && reasonCode && (
                      <span className={dir === "out" ? s.qtyOut : s.qtyIn} aria-hidden="true">{dir === "out" ? "−" : "+"}</span>
                    )}
                    <input
                      className={`${r.input} ${s.qtyField}`}
                      inputMode="decimal"
                      aria-label={`Qty of ${l.displayName}`}
                      aria-invalid={problem ? "true" : undefined}
                      placeholder="0"
                      value={l.qty}
                      onChange={(e) => patchLine(l.invItemId, { qty: e.target.value })}
                    />
                    <span className={s.unit}>{l.stockUom}</span>
                    <button
                      type="button"
                      className={s.removeBtn}
                      aria-label={`Remove ${l.displayName}`}
                      onClick={() => removeLine(l.invItemId)}
                      disabled={busy}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div style={{ marginTop: 14 }}>
          <label className={r.label} htmlFor={remarksId}>Remarks (optional)</label>
          <textarea
            id={remarksId}
            className={r.textarea}
            value={remarks}
            maxLength={1000}
            placeholder="What happened?"
            onChange={(e) => setRemarks(e.target.value)}
          />
          {fieldErrors.remarks && <div className={s.fieldError}>{fieldErrors.remarks}</div>}
        </div>

        <p className={r.meta} style={{ marginTop: 10 }}>
          Valued at the hotel&apos;s average cost. Small adjustments may post at once; others wait for an approver.
        </p>
        {formError && <div className={r.sheetError} role="alert">{formError}</div>}
      </div>
      <div className={r.sheetFoot}>
        <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={onHide} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`${r.btn} ${r.btnPrimary}`} onClick={submit} disabled={busy}>
          {busy ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
          Submit adjustment
        </button>
      </div>
    </Modal>
  );
};

export default NewAdjustmentModal;
