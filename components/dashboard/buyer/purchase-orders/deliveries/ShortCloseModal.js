import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { getApiErrorMessage } from "@/utils/apiError";
import s from "./deliveries.module.scss";
import { SHORT_CLOSE_REASONS, deliveryLabel, fmtQ, fmtQty, isOpenDelivery, toQ } from "./planMath";

/*
  Short-close (spec §6.12): stop expecting the open qty of the whole PO, one
  phase, one hotel or chosen delivery rows. The preview sums exactly what the
  server will close: each targeted row's open qty (planService/shortCloseService
  read the same counters). Remarks are required for "other".

  onSubmit(payload) → Promise, payload = contract body of POST /short-close.
  A rejection is shown in the dialog (e.g. "Short-close is available once the
  vendor accepts the PO").
*/

const TARGETS = [
  { type: "po", label: "Whole PO" },
  { type: "delivery", label: "One phase" },
  { type: "hotel", label: "One hotel" },
  { type: "lines", label: "Selected rows" },
];

export default function ShortCloseModal({ show, onHide, deliveries = [], hotels = [], onSubmit }) {
  const [type, setType] = useState("po");
  const [deliveryId, setDeliveryId] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [picked, setPicked] = useState([]);
  const [reasonCode, setReasonCode] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show) return;
    setType("po");
    setDeliveryId("");
    setHotelId("");
    setPicked([]);
    setReasonCode("");
    setRemarks("");
    setError(null);
  }, [show]);

  // Rows with something still open, in grid order.
  const openRows = useMemo(
    () =>
      deliveries.flatMap((d) =>
        (d.lines || []).filter((l) => toQ(l.openQty) > 0).map((l) => ({ ...l, delivery: d }))
      ),
    [deliveries]
  );
  const openDeliveries = deliveries.filter((d) => isOpenDelivery(d) && openRows.some((r) => r.delivery.id === d.id));
  const hotelChoices = hotels.filter((h) => openRows.some((r) => r.delivery.hotelId === h.id));

  const targeted = openRows.filter((r) => {
    if (type === "delivery") return String(r.delivery.id) === deliveryId;
    if (type === "hotel") return String(r.delivery.hotelId) === hotelId;
    if (type === "lines") return picked.includes(r.id);
    return true;
  });

  // Qty that will close, per item.
  const preview = [];
  for (const r of targeted) {
    let p = preview.find((x) => x.poLineId === r.poLineId);
    if (!p) {
      p = { poLineId: r.poLineId, name: r.productName || `Line ${r.poLineId}`, unit: r.unit || "", q: 0 };
      preview.push(p);
    }
    p.q += toQ(r.openQty);
  }

  const target = (() => {
    if (type === "delivery") return deliveryId ? { type, deliveryId: Number(deliveryId) } : null;
    if (type === "hotel") return hotelId ? { type, hotelId: Number(hotelId) } : null;
    if (type === "lines") return picked.length ? { type, deliveryLineIds: [...picked].sort((a, b) => a - b) } : null;
    return { type: "po" };
  })();
  const remarksMissing = reasonCode === "other" && !remarks.trim();
  const canSubmit = !!target && preview.length > 0 && !!reasonCode && !remarksMissing && !busy;

  const togglePick = (id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ target, reasonCode, remarks: remarks.trim() });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't short-close. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={busy ? undefined : onHide} centered size="lg" aria-labelledby="short-close-title">
      <Modal.Header closeButton={!busy}>
        <Modal.Title id="short-close-title" className={s.mTitle}>
          Short-close
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={s.modalBody}>
          <div>
            The vendor stops being expected to deliver the open quantity you choose. You can reopen it later.
          </div>

          <fieldset>
            <legend className={s.mLegend}>What to close</legend>
            <div className={s.targets}>
              {TARGETS.filter((t) => t.type !== "hotel" || hotelChoices.length > 0).map((t) => (
                <div key={t.type} className={`${s.targetOpt} ${type === t.type ? s.targetOptOn : ""}`}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="radio" name="short-close-target" checked={type === t.type} onChange={() => setType(t.type)} />
                    {t.label}
                  </label>
                  {t.type === "delivery" && type === "delivery" && (
                    <select className={s.mSelect} aria-label="Phase" value={deliveryId} onChange={(e) => setDeliveryId(e.target.value)}>
                      <option value="">Choose a phase…</option>
                      {openDeliveries.map((d) => (
                        <option key={d.id} value={d.id}>{deliveryLabel(d)}</option>
                      ))}
                    </select>
                  )}
                  {t.type === "hotel" && type === "hotel" && (
                    <select className={s.mSelect} aria-label="Hotel" value={hotelId} onChange={(e) => setHotelId(e.target.value)}>
                      <option value="">Choose a hotel…</option>
                      {hotelChoices.map((h) => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </fieldset>

          {type === "lines" && (
            <div className={s.rowPicks} role="group" aria-label="Rows to close">
              {openRows.map((r) => (
                <label key={r.id}>
                  <input type="checkbox" checked={picked.includes(r.id)} onChange={() => togglePick(r.id)} />
                  <span>{`${r.productName || `Line ${r.poLineId}`} · ${deliveryLabel(r.delivery)}`}</span>
                  <span className={s.rpOpen}>
                    {fmtQty(r.openQty)} {r.unit || ""} open
                  </span>
                </label>
              ))}
            </div>
          )}

          <label className={s.mField}>
            Reason
            <select className={s.mSelect} aria-label="Reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
              <option value="">Choose a reason…</option>
              {SHORT_CLOSE_REASONS.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </label>

          <label className={s.mField}>
            {reasonCode === "other" ? "Remarks (required)" : "Remarks (optional)"}
            <textarea
              className={s.mTextarea}
              maxLength={2000}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={reasonCode === "other" ? "Say why this is being closed" : "Anything the vendor should know"}
            />
          </label>

          <div className={`${s.preview} ${preview.length ? "" : s.previewEmpty}`} data-testid="short-close-preview">
            {preview.length ? (
              <>
                This will close:
                <ul>
                  {preview.map((p) => (
                    <li key={p.poLineId}>
                      {p.name}: {fmtQ(p.q)} {p.unit}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              "Nothing open to close for this choice."
            )}
          </div>

          {error && (
            <div className={s.mError} role="alert">
              {error}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={s.mFooter}>
          <button type="button" className={s.mBtn} onClick={onHide} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${s.mBtn} ${s.mBtnWarn}`} onClick={submit} disabled={!canSubmit}>
            {busy ? "Closing…" : "Short-close"}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

/*
  Reopen a hand short-closed row (POST /short-close/reopen). Remarks are
  required. Rows closed by a CREDIT return are never offered (see
  planMath.manualShortClosed).
*/
export function ReopenModal({ show, onHide, row, onSubmit }) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show) return;
    setRemarks("");
    setError(null);
  }, [show]);

  const submit = async () => {
    if (!remarks.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(remarks.trim());
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't reopen. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={busy ? undefined : onHide} centered aria-labelledby="reopen-title">
      <Modal.Header closeButton={!busy}>
        <Modal.Title id="reopen-title" className={s.mTitle}>
          Reopen short-closed qty
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={s.modalBody}>
          {row && (
            <div>
              {fmtQ(row.q)} {row.unit} of {row.productName} at {row.label} will be expected from the vendor again.
            </div>
          )}
          <label className={s.mField}>
            Remarks (required)
            <textarea className={s.mTextarea} maxLength={2000} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </label>
          {error && (
            <div className={s.mError} role="alert">
              {error}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={s.mFooter}>
          <button type="button" className={s.mBtn} onClick={onHide} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`${s.mBtn} ${s.mBtnWarn}`} onClick={submit} disabled={!remarks.trim() || busy}>
            {busy ? "Reopening…" : "Reopen"}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
