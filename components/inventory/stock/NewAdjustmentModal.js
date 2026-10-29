import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { Loader2, Send, Trash2, X } from "lucide-react";
import { createAdjustment } from "@/services/inventory";
import { fmtQty, newClientEventId, parseQty } from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "./HotelSelect";
import ItemPicker from "./ItemPicker";
import useUserId from "./useUserId";
import {
  ADJUSTMENT_REASONS, QTY_MAX_LENGTH, cleanQtyInput, errorInfo, freezeMessage, isUncertainFailure, lineProblems,
  messageOf, reasonDirection, sameLines,
} from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// Raise an adjustment (POST /adjustments, always submit:true). The reason sets
// the sign: wastage, breakage, expiry and theft take stock out; found brings
// it in; a correction asks per line. Qty is typed as a positive amount in the
// item's stock unit and sent signed. The server posts it at once when its
// value is within the company's auto-approve limit, else it waits for an
// approver.
//
// When no answer comes (the connection drops, or a 5xx), the adjustment may
// or may not be recorded: the form locks under the same request key and
// offers only "Submit again" (a replay is never recorded twice) or "Discard".
// The lock (what was sent, under which key, and the form as it stood) is kept
// in sessionStorage per signed-in user and hotel from before the request goes
// out until a definite answer, so a reload or a tab closed mid-request in the
// same session reopens it locked instead of losing the key.
//
// Props: { show, hotels [{id,name}] (only hotels where the caller has
//          inventory.create), defaultHotelId, onHide,
//          onCreated(adjustment, {linesDiffer}) }

const lineKey = (l) => l.invItemId;

// ── The uncertain lock, per user and hotel ──────────────────────────────────
const lockKey = (userId, hotelId) => `adj-uncertain:${userId}:${hotelId}`;
const storage = () => {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
};
/** @returns {{userId, hotelId, payload, form:{reasonCode, lines, remarks}, savedAt}|null} */
export const readAdjustmentLock = (userId, hotelId) => {
  const store = storage();
  if (!store || !userId || hotelId == null) return null;
  try {
    const value = JSON.parse(store.getItem(lockKey(userId, hotelId)) || "null");
    if (!value || String(value.userId) !== String(userId) || Number(value.hotelId) !== Number(hotelId)) return null;
    if (!value.payload?.clientEventId || Number(value.payload.hotelId) !== Number(hotelId)) return null;
    return value;
  } catch {
    return null;
  }
};
const writeLock = (userId, payload, form) => {
  const store = storage();
  if (!store || !userId) return;
  try {
    store.setItem(
      lockKey(userId, payload.hotelId),
      JSON.stringify({ userId: String(userId), hotelId: Number(payload.hotelId), payload, form, savedAt: Date.now() })
    );
  } catch {
    // storage full or blocked: the lock still holds while this page is open
  }
};
const clearLock = (userId, hotelId) => {
  const store = storage();
  if (!store || !userId || hotelId == null) return;
  try {
    store.removeItem(lockKey(userId, hotelId));
  } catch {
    // nothing to clear
  }
};

const restoredText =
  "This adjustment was sent, but no answer came before the page closed, so it may or may not be recorded. " +
  "Submit again to find out: the same adjustment is never recorded twice.";

const NewAdjustmentModal = ({ show, hotels = [], defaultHotelId = null, onHide, onCreated }) => {
  const titleId = useId();
  const userId = useUserId();
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
  const [uncertain, setUncertain] = useState(null); // the payload whose answer never came
  const keyRef = useRef(null);
  const busyRef = useRef(false);

  // A fresh form, and a fresh request key, each time the dialog opens; unless
  // this user left an unanswered adjustment at one of these hotels, which
  // reopens locked under its own key (the default hotel's first).
  useEffect(() => {
    if (!show) return;
    setFieldErrors({});
    setProblems({});
    const ids = [defaultHotelId, ...hotels.map((h) => h.id)].filter(
      (id, i, all) => id != null && all.indexOf(id) === i && hotels.some((h) => Number(h.id) === Number(id))
    );
    const lock = ids.map((id) => readAdjustmentLock(userId, id)).find(Boolean);
    if (lock) {
      setHotelId(hotels.find((h) => Number(h.id) === Number(lock.hotelId))?.id ?? Number(lock.hotelId));
      setReasonCode(lock.form?.reasonCode || lock.payload.reasonCode || "");
      setLines(Array.isArray(lock.form?.lines) ? lock.form.lines : []);
      setRemarks(lock.form?.remarks || "");
      setUncertain(lock.payload);
      setFormError(restoredText);
      keyRef.current = lock.payload.clientEventId;
      return;
    }
    setHotelId(defaultHotelId ?? (hotels[0]?.id ?? null));
    setReasonCode("");
    setLines([]);
    setRemarks("");
    setFormError(null);
    setUncertain(null);
    keyRef.current = newClientEventId();
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // The hotel picked must be one the caller can raise adjustments at.
  useEffect(() => {
    if (!show || uncertain) return;
    if (hotelId != null && !hotels.some((h) => Number(h.id) === Number(hotelId))) {
      setHotelId(hotels[0]?.id ?? null);
      setLines([]);
    }
  }, [show, hotels, hotelId, uncertain]);

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
  const locked = busy || !!uncertain;

  const send = async (payload) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFormError(null);
    const sentIds = payload.lines.map((l) => l.invItemId);
    // Kept before it goes out: if the page goes before the answer, the key isn't lost.
    writeLock(userId, payload, { reasonCode, lines, remarks });
    try {
      const res = await createAdjustment(payload);
      clearLock(userId, payload.hotelId);
      keyRef.current = newClientEventId();
      setUncertain(null);
      const linesDiffer = !!res?.replayed && Array.isArray(res?.lines) && !sameLines(payload.lines, res.lines);
      onCreated?.(res, { linesDiffer });
    } catch (err) {
      const info = errorInfo(err, "Could not raise the adjustment.");
      const d = info.details || {};
      const uomOf = (id) => lines.find((l) => l.invItemId === id)?.stockUom || "";
      if (isUncertainFailure(info)) {
        setUncertain(payload); // the lock written before the send stays
        setFormError(
          `${info.httpStatus ? "The server had a problem before it answered" : "The connection dropped before the server answered"}, ` +
            "so this adjustment may or may not be recorded. Submit again to find out: the same adjustment is never recorded twice."
        );
        return;
      }
      // a definite answer: the lock is over (the form opens for a fix)
      clearLock(userId, payload.hotelId);
      setUncertain(null);
      if (info.code === "LOCKED") {
        setFormError(`${freezeMessage(d)}: adjustments there are refused until it's submitted or cancelled.`);
      } else if (info.code === "CONFLICT" && d.field === "clientEventId") {
        keyRef.current = newClientEventId();
        setFormError(`${info.message} Submit again to record it as a new adjustment.`);
      } else if (info.code === "VALIDATION" && (d.field === "reasonCode" || d.field === "hotelId" || d.field === "remarks")) {
        setFieldErrors({ [d.field]: info.message });
      } else {
        const found = lineProblems(info, sentIds, { uomOf, verb: "takes out" });
        if (Object.keys(found).length) setProblems(found);
        else setFormError(messageOf(info)); // a 404 not on a line: the hotel (C3)
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const discard = () => {
    if (busyRef.current) return;
    if (uncertain) clearLock(userId, uncertain.hotelId);
    setUncertain(null);
    keyRef.current = newClientEventId();
    onHide?.();
  };

  const submit = async () => {
    if (busyRef.current) return;
    if (uncertain) {
      send(uncertain);
      return;
    }
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
    send(payload);
  };

  return (
    <Modal
      show={show}
      onHide={locked ? undefined : onHide}
      backdrop={locked ? "static" : true}
      keyboard={!locked}
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
        <button type="button" className={r.sheetClose} onClick={onHide} disabled={locked} aria-label="Close">
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
                disabled={locked}
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
              disabled={locked}
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
          <ItemPicker source="stock" hotelId={hotelId} onPick={addItem} exclude={picked} disabled={!hotelId || locked} />
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
                    {problem && <div id={`adj-line-${l.invItemId}-problem`} className={s.lineProblem} role="alert">{problem.message}</div>}
                  </div>
                  <div className={s.lineQty}>
                    {direction === "either" && (
                      <select
                        className={r.select}
                        aria-label={`Direction of ${l.displayName}`}
                        value={l.dir}
                        disabled={locked}
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
                      maxLength={QTY_MAX_LENGTH}
                      aria-label={`Qty of ${l.displayName}`}
                      aria-invalid={problem ? "true" : undefined}
                      aria-describedby={problem ? `adj-line-${l.invItemId}-problem` : undefined}
                      placeholder="0"
                      value={l.qty}
                      disabled={locked}
                      onChange={(e) => patchLine(l.invItemId, { qty: cleanQtyInput(e.target.value) })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    />
                    <span className={s.unit}>{l.stockUom}</span>
                    <button
                      type="button"
                      className={s.removeBtn}
                      aria-label={`Remove ${l.displayName}`}
                      onClick={() => removeLine(l.invItemId)}
                      disabled={locked}
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
            disabled={locked}
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
        {uncertain ? (
          <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={discard} disabled={busy}>
            Discard
          </button>
        ) : (
          <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={onHide} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="button" className={`${r.btn} ${r.btnPrimary}`} onClick={submit} disabled={busy}>
          {busy ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
          {uncertain ? "Submit again" : "Submit adjustment"}
        </button>
      </div>
    </Modal>
  );
};

export default NewAdjustmentModal;
