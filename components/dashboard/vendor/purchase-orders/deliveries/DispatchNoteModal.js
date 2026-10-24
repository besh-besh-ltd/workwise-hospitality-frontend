import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import { Truck } from "lucide-react";
import { createDispatch } from "@/services/inventory";
import { handleMarkDispatched } from "@/services/po";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError";
import { fmtDateOnly } from "@/components/dashboard/buyer/purchase-orders/shared";
import vd from "./vendorDeliveries.module.scss";
import {
  toQ,
  fromQ,
  qtyText,
  qtyInput,
  todayIso,
  laterDay,
  isOpenDelivery,
  openCaps,
  phaseOpen,
  inTransit,
  netOfTransit,
  UNSPLIT_LABEL,
} from "./deliveryFormat";

const QTY_FORMAT = /^\d+(\.\d+)?$/;
const QTY_4DP = /^\d+(\.\d{1,4})?$/;
// Server field names (dispatchService.createDispatch) the form shows errors under.
const FIELD_KEYS = ["challanNo", "challanDate", "expectedDeliveryDate", "ewayBillNo", "vehicleNo", "transporter", "remarks", "hotelId", "deliveryId"];

const asId = (v) => (v === "" || v == null ? null : Number(v));

/* Where the goods already on the road are counted: the phase picked, else
   the hotel, else the whole PO (the same scope as the starting quantities). */
const roadScope = (hotelId, delivery) => (delivery ? { deliveryId: delivery.id } : { hotelId });

/* Line quantities a fresh note starts with: what the phase still needs; with
   only a hotel, what is open there (its unsplit share included); with
   neither, what is open on each PO line. Less, each time, what earlier notes
   still have on the road there: open counts receipts only. The server's cap
   (the Open column) stays the hard limit. */
const startingQtys = (data, hotelId, delivery) => {
  const open = delivery ? phaseOpen(delivery) : openCaps(data, hotelId);
  const source = netOfTransit(open, inTransit(data, roadScope(hotelId, delivery)));
  const out = {};
  for (const l of data?.poLines || []) out[l.id] = qtyInput(source.get(Number(l.id)) || 0);
  return out;
};

const blankForm = () => ({
  hotelId: "",
  deliveryId: "",
  challanNo: "",
  challanDate: todayIso(),
  expectedDeliveryDate: "",
  ewayBillNo: "",
  vehicleNo: "",
  transporter: "",
  remarks: "",
});

/**
 * The vendor's dispatch note (contract: POST /inventory/vendor/po/:poId/dispatches).
 * Where it is going (hotel and phase, both optional), what is on the truck
 * (line quantities, starting at what the phase still needs) and the paperwork.
 *
 * Props: show, onClose, poId, data (the vendor deliveries payload, or null
 * while it loads), loading, error, onRetry, initial ({hotelId, deliveryId}
 * picked from the plan, or null), onDone(dispatch) after the server records it.
 */
export default function DispatchNoteModal({
  show,
  onClose,
  poId,
  data,
  loading = false,
  error = "",
  onRetry,
  initial = null,
  onDone,
}) {
  const [form, setForm] = useState(blankForm);
  const [qtys, setQtys] = useState({});
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState("");
  const expectedTouched = useRef(false);

  const hotels = useMemo(() => data?.hotels || [], [data]);
  const deliveries = useMemo(() => data?.deliveries || [], [data]);
  const poLines = useMemo(() => data?.poLines || [], [data]);

  // A fresh note each time the dialog opens (or its data arrives).
  useEffect(() => {
    if (!show) return;
    const delivery = initial?.deliveryId != null
      ? deliveries.find((d) => Number(d.id) === Number(initial.deliveryId)) || null
      : null;
    const hotelId = initial?.hotelId ?? delivery?.hotelId ?? (hotels.length === 1 ? hotels[0].id : null);
    const base = blankForm();
    setForm({
      ...base,
      hotelId: hotelId == null ? "" : String(hotelId),
      deliveryId: delivery ? String(delivery.id) : "",
      expectedDeliveryDate: delivery?.dueDate ? laterDay(delivery.dueDate, base.challanDate) : "",
    });
    setQtys(data ? startingQtys(data, hotelId, delivery) : {});
    setErrors({});
    setServerError("");
    setSaving(false);
    setMarking(false);
    setMarkError("");
    expectedTouched.current = false;
  }, [show, data, initial, deliveries, hotels]);

  const hotelId = asId(form.hotelId);
  const delivery = form.deliveryId ? deliveries.find((d) => String(d.id) === form.deliveryId) || null : null;
  // Where the server caps quantities: the hotel named, else the phase's hotel.
  const capHotel = hotelId ?? (delivery?.hotelId ?? null);
  const caps = useMemo(() => openCaps(data, capHotel), [data, capHotel]);
  const onRoad = inTransit(data, roadScope(hotelId, delivery));
  const anyOnRoad = [...onRoad.values()].some((q) => q > 0);
  const rows = poLines.filter((l) => (caps.get(Number(l.id)) || 0) > 0);

  const phaseChoices = deliveries.filter(
    (d) => (isOpenDelivery(d) || String(d.id) === form.deliveryId)
      && (hotelId == null || d.hotelId == null || Number(d.hotelId) === hotelId)
  );
  const phaseText = (d) => {
    const where = d.hotelId == null ? UNSPLIT_LABEL : hotelId == null ? d.hotelName || "Hotel" : null;
    const due = d.dueDate ? `due ${fmtDateOnly(d.dueDate)}` : "no due date";
    return [where, `Phase ${d.phaseNo}`, due].filter(Boolean).join(" · ");
  };

  const clearError = (key) => {
    if (errors[key] || errors.lines) setErrors((e) => ({ ...e, [key]: undefined, lines: undefined }));
  };
  const setField = (key) => (e) => {
    const value = e.target.value;
    if (key === "expectedDeliveryDate") expectedTouched.current = true;
    setForm((f) => ({ ...f, [key]: value }));
    clearError(key);
  };

  const pickHotel = (e) => {
    const nextHotel = asId(e.target.value);
    // A phase of another hotel no longer fits; neither does a hotel's phase once the hotel is cleared.
    const keep = delivery && (delivery.hotelId == null || (nextHotel != null && Number(delivery.hotelId) === nextHotel))
      ? delivery
      : null;
    setForm((f) => ({ ...f, hotelId: e.target.value, deliveryId: keep ? String(keep.id) : "" }));
    setQtys(startingQtys(data, nextHotel, keep));
    setErrors({});
  };

  const pickPhase = (e) => {
    const next = e.target.value ? deliveries.find((d) => String(d.id) === e.target.value) || null : null;
    const nextHotel = next && next.hotelId != null ? Number(next.hotelId) : hotelId;
    setForm((f) => ({
      ...f,
      deliveryId: e.target.value,
      hotelId: nextHotel == null ? "" : String(nextHotel),
      expectedDeliveryDate:
        !expectedTouched.current && next?.dueDate
          ? laterDay(next.dueDate, f.challanDate || todayIso())
          : f.expectedDeliveryDate,
    }));
    setQtys(startingQtys(data, nextHotel, next));
    setErrors({});
  };

  const setQty = (lineId) => (e) => {
    const value = e.target.value;
    setQtys((q) => ({ ...q, [lineId]: value }));
    clearError(`qty_${lineId}`);
  };

  const submit = async () => {
    if (saving || !data) return;
    const errs = {};
    const challanNo = form.challanNo.trim();
    if (!challanNo) errs.challanNo = "Challan number is required";
    if (!form.challanDate) errs.challanDate = "Challan date is required";
    if (!form.expectedDeliveryDate) errs.expectedDeliveryDate = "Expected delivery date is required";
    else if (form.challanDate && form.expectedDeliveryDate < form.challanDate) {
      errs.expectedDeliveryDate = "Cannot be before the challan date";
    }

    const lines = [];
    let lineErrors = false;
    for (const l of rows) {
      const raw = String(qtys[l.id] ?? "").trim();
      if (raw === "") continue;
      const key = `qty_${l.id}`;
      if (!QTY_FORMAT.test(raw)) {
        errs[key] = "Enter a number";
      } else if (!QTY_4DP.test(raw)) {
        errs[key] = "Up to 4 decimals";
      } else {
        const q = toQ(raw);
        if (q === 0) continue;
        const cap = caps.get(Number(l.id)) || 0;
        if (q > cap) {
          errs[key] = `Only ${qtyText(fromQ(cap))}${l.unit ? ` ${l.unit}` : ""} is still to be delivered ${capHotel != null ? "here" : "on this order"}`;
        } else {
          lines.push({ poLineId: Number(l.id), qty: raw });
          continue;
        }
      }
      lineErrors = true;
    }
    if (!lines.length && !lineErrors) errs.lines = "Enter a quantity for at least one item";

    setServerError("");
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const text = (v) => (v.trim() ? v.trim() : null);
    const payload = {
      hotelId,
      deliveryId: asId(form.deliveryId),
      challanNo,
      challanDate: form.challanDate,
      expectedDeliveryDate: form.expectedDeliveryDate,
      ewayBillNo: text(form.ewayBillNo),
      vehicleNo: text(form.vehicleNo),
      transporter: text(form.transporter),
      remarks: text(form.remarks),
      lines,
    };

    setSaving(true);
    try {
      const dispatch = await createDispatch(poId, payload);
      toast.success(
        dispatch?.dispatchNumber
          ? `Dispatch ${dispatch.dispatchNumber} recorded. The hotel can now expect it.`
          : "Dispatch recorded. The hotel can now expect it."
      );
      setSaving(false);
      onDone?.(dispatch);
    } catch (err) {
      const message = getApiErrorMessage(err, "Couldn't record the dispatch. Please try again.");
      const details = getApiErrorData(err)?.details || {};
      if (details.field === "qty" && details.poLineId != null) {
        setErrors({ [`qty_${details.poLineId}`]: message });
      } else if (FIELD_KEYS.includes(details.field)) {
        setErrors({ [details.field]: message });
      } else {
        setServerError(message);
      }
      setSaving(false);
    }
  };

  // The plan did not load: the old one-click "dispatched" still tells the
  // hotel the goods left (no quantities); a note can follow once it loads.
  const markWithoutDetails = async () => {
    if (marking) return;
    setMarking(true);
    setMarkError("");
    try {
      await handleMarkDispatched(poId);
      toast.success("Marked dispatched. Add a dispatch note with the quantities once the plan loads.");
      setMarking(false);
      onDone?.(null);
    } catch (err) {
      setMarkError(getApiErrorMessage(err, "Couldn't mark the order dispatched. Please try again."));
      setMarking(false);
    }
  };

  const fieldProps = (key) => ({
    id: `dn-${key}`,
    value: form[key],
    onChange: setField(key),
    "aria-invalid": errors[key] ? "true" : undefined,
    "aria-describedby": errors[key] ? `dn-${key}-err` : undefined,
    disabled: saving,
  });
  const fieldError = (name) =>
    errors[name] ? (
      <span id={`dn-${name}-err`} className={vd.err}>
        {errors[name]}
      </span>
    ) : null;

  let content;
  if (!data) {
    content = loading ? (
      <p className={vd.note}>Loading the delivery plan…</p>
    ) : (
      <>
        <div className={vd.alert} role="alert">
          {error || "Couldn't load the delivery plan."}{" "}
          {onRetry && (
            <button type="button" className={`${vd.mBtn} ${vd.mBtnSecondary}`} onClick={() => onRetry()} disabled={marking}>
              Try again
            </button>
          )}
        </div>
        <p className={vd.note}>
          Goods already left?{" "}
          <button type="button" className={vd.linkBtn} onClick={markWithoutDetails} disabled={marking}>
            {marking ? "Marking…" : "Mark dispatched without details"}
          </button>
        </p>
        {markError && (
          <p className={vd.err} role="alert">
            {markError}
          </p>
        )}
      </>
    );
  } else {
    content = (
      <>
        <p className={vd.intro}>
          Tell the hotel what is on its way. Quantities start at what the chosen phase still needs, less what is already on
          the road; send less if the rest follows later.
        </p>
        {serverError && (
          <p className={vd.alert} role="alert">
            {serverError}
          </p>
        )}

        <div className={vd.grid2}>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-hotelId">Hotel</label>
            <select className={vd.select} {...fieldProps("hotelId")} onChange={pickHotel}>
              <option value="">Not named</option>
              {hotels.map((h) => (
                <option key={h.id} value={String(h.id)}>
                  {h.name}
                </option>
              ))}
            </select>
            <span className={vd.hint}>Optional. Name it when the truck goes to one hotel.</span>
            {fieldError("hotelId")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-deliveryId">Phase</label>
            <select className={vd.select} {...fieldProps("deliveryId")} onChange={pickPhase}>
              <option value="">Not named</option>
              {phaseChoices.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {phaseText(d)}
                </option>
              ))}
            </select>
            <span className={vd.hint}>Optional. The phase of the buyer&apos;s plan this delivers.</span>
            {fieldError("deliveryId")}
          </div>
        </div>

        <h3 className={vd.subTitle}>What is on the truck</h3>
        {rows.length === 0 ? (
          <p className={vd.note}>Nothing is left to deliver {capHotel != null ? "to this hotel" : "on this order"}.</p>
        ) : (
          <table className={vd.linesTable}>
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Open</th>
                {anyOnRoad && <th className="num">On the road</th>}
                <th className="num">Dispatch now</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const key = `qty_${l.id}`;
                return (
                  <tr key={l.id}>
                    <td>
                      <div className={vd.itName}>{l.productName || "Item"}</div>
                      {l.unit && <div className={vd.itUnit}>{l.unit}</div>}
                    </td>
                    <td className="num" data-label="Open">{qtyText(fromQ(caps.get(Number(l.id)) || 0))}</td>
                    {anyOnRoad && (
                      <td className="num" data-label="On the road">
                        {(onRoad.get(Number(l.id)) || 0) > 0 ? qtyText(fromQ(onRoad.get(Number(l.id)))) : "—"}
                      </td>
                    )}
                    <td>
                      <div className={vd.qtyField}>
                        <input
                          className={`${vd.input} ${vd.qtyInput}`}
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`Dispatch quantity for ${l.productName || "item"}`}
                          aria-invalid={errors[key] ? "true" : undefined}
                          aria-describedby={errors[key] ? `dn-${key}-err` : undefined}
                          value={qtys[l.id] ?? ""}
                          onChange={setQty(l.id)}
                          disabled={saving}
                        />
                        {fieldError(key)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {errors.lines && (
          <p className={vd.err} role="alert">
            {errors.lines}
          </p>
        )}

        <h3 className={vd.subTitle}>Paperwork</h3>
        <div className={vd.grid3}>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-challanNo">
              Challan number<span className={vd.req} aria-hidden="true">*</span>
            </label>
            <input className={vd.input} maxLength={64} autoComplete="off" {...fieldProps("challanNo")} />
            {fieldError("challanNo")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-challanDate">
              Challan date<span className={vd.req} aria-hidden="true">*</span>
            </label>
            <input type="date" className={vd.input} {...fieldProps("challanDate")} />
            {fieldError("challanDate")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-expectedDeliveryDate">
              Expected delivery<span className={vd.req} aria-hidden="true">*</span>
            </label>
            <input type="date" className={vd.input} min={form.challanDate || undefined} {...fieldProps("expectedDeliveryDate")} />
            {fieldError("expectedDeliveryDate")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-ewayBillNo">E-way bill</label>
            <input className={vd.input} maxLength={64} autoComplete="off" {...fieldProps("ewayBillNo")} />
            {fieldError("ewayBillNo")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-vehicleNo">Vehicle number</label>
            <input className={vd.input} maxLength={32} autoComplete="off" {...fieldProps("vehicleNo")} />
            {fieldError("vehicleNo")}
          </div>
          <div className={vd.field}>
            <label className={vd.label} htmlFor="dn-transporter">Transporter</label>
            <input className={vd.input} maxLength={255} {...fieldProps("transporter")} />
            {fieldError("transporter")}
          </div>
          <div className={`${vd.field} ${vd.fieldFull}`}>
            <label className={vd.label} htmlFor="dn-remarks">Remarks</label>
            <textarea className={vd.input} rows={2} maxLength={2000} {...fieldProps("remarks")} />
            {fieldError("remarks")}
          </div>
        </div>
      </>
    );
  }

  return (
    <Modal
      show={show}
      onHide={saving || marking ? undefined : onClose}
      centered
      backdrop="static"
      className={`${vd.dialog} ${vd.dialogWide}`}
      aria-labelledby="dispatch-note-title"
    >
      <Modal.Header closeButton={!saving && !marking}>
        <Modal.Title id="dispatch-note-title">Dispatch note</Modal.Title>
      </Modal.Header>
      <Modal.Body>{content}</Modal.Body>
      <Modal.Footer>
        <button type="button" className={`${vd.mBtn} ${vd.mBtnSecondary}`} onClick={onClose} disabled={saving || marking}>
          Cancel
        </button>
        <button
          type="button"
          className={`${vd.mBtn} ${vd.mBtnPrimary}`}
          onClick={submit}
          disabled={saving || !data || rows.length === 0}
        >
          <Truck size={14} />
          {saving ? "Recording…" : "Record dispatch"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
