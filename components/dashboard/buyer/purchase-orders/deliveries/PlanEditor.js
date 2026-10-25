import React, { useMemo, useRef, useState } from "react";
import { Plus, Copy, Repeat, Trash2, Split } from "lucide-react";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError";
import po from "../PurchaseOrders.module.scss";
import s from "./deliveries.module.scss";
import { toQ, qtyString, fmtQ, isQtyInput, splitEvenly, isDay, addDays } from "./planMath";

/*
  Delivery plan editor (spec §7): hotel × phase deliveries with a planned qty
  per PO line. Every line must be planned at exactly its ordered qty (the
  unallocated row included) before the plan can be saved; the server checks
  the same rule (planService.validatePlan) and the rest (hotel set, PO date).

  Props:
    hotels       [{id, name}]   the PO's hotel set
    poLines      PoLineRoll[]   ordered qty per line
    deliveries   Delivery[]     the current plan
    initialAction 'split' | undefined   open with "Split equally" applied
    onSave(deliveries) → Promise   contract body of PUT /po/:poId/deliveries
    onCancel()
*/

const MAX_WEEKS = 26;

/** One hotel's phases renumbered 1..n by due date; undated last, keeping their order. */
function renumberByDate(list, hotelId) {
  const mine = list
    .filter((r) => r.hotelId === hotelId)
    .sort((a, b) => {
      const da = isDay(a.dueDate) ? a.dueDate : "9999-12-31";
      const dbb = isDay(b.dueDate) ? b.dueDate : "9999-12-31";
      return da === dbb ? a.phaseNo - b.phaseNo : da < dbb ? -1 : 1;
    });
  const phaseOf = new Map(mine.map((r, i) => [r.key, i + 1]));
  return list.map((r) => (phaseOf.has(r.key) ? { ...r, phaseNo: phaseOf.get(r.key) } : r));
}

export default function PlanEditor({ hotels = [], poLines = [], deliveries = [], initialAction, onSave, onCancel }) {
  const keySeq = useRef(0);
  const nextKey = () => `r${++keySeq.current}`;

  const hotelName = useMemo(() => {
    const m = new Map(hotels.map((h) => [h.id, h.name]));
    return (id) => (id == null ? "To be allocated" : m.get(id) || `Hotel #${id}`);
  }, [hotels]);

  const makeRow = (over) => ({ key: nextKey(), hotelId: null, phaseNo: 1, dueDate: "", remarks: "", qty: {}, ...over });

  const fromPlan = () =>
    deliveries.map((d) =>
      makeRow({
        hotelId: d.hotelId ?? null,
        phaseNo: d.phaseNo,
        dueDate: d.dueDate || "",
        remarks: d.remarks || "",
        qty: Object.fromEntries((d.lines || []).map((l) => [l.poLineId, qtyString(toQ(l.plannedQty))])),
      })
    );

  // One phase-1 delivery per PO hotel, each line split evenly with the
  // remainder on the first hotel. Dates and remarks carry over from the
  // hotel's own phase 1, else from the unallocated row.
  const splitAcross = (current) => {
    const unalloc = current.find((r) => r.hotelId == null && r.phaseNo === 1) || current.find((r) => r.hotelId == null);
    const shares = new Map(poLines.map((l) => [l.id, splitEvenly(toQ(l.orderedQty), hotels.length)]));
    return hotels.map((h, i) => {
      const own = current.find((r) => r.hotelId === h.id && r.phaseNo === 1);
      return makeRow({
        hotelId: h.id,
        phaseNo: 1,
        dueDate: own?.dueDate || unalloc?.dueDate || "",
        remarks: own?.remarks || unalloc?.remarks || "",
        qty: Object.fromEntries(poLines.map((l) => [l.id, qtyString(shares.get(l.id)[i])])),
      });
    });
  };

  const [rows, setRows] = useState(() => {
    const initial = fromPlan();
    return initialAction === "split" && hotels.length > 1 ? splitAcross(initial) : initial;
  });
  const [repeat, setRepeat] = useState(null); // {key, count, start}
  const [addHotelId, setAddHotelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const labelOf = (r) => `${hotelName(r.hotelId)} · Phase ${r.phaseNo}`;
  const nextPhase = (list, hotelId) => Math.max(0, ...list.filter((r) => r.hotelId === hotelId).map((r) => r.phaseNo)) + 1;

  // ── derived: allocation per line, validity ────────────────────────────────
  const invalidInputs = rows.some((r) => Object.values(r.qty).some((v) => !isQtyInput(v)));
  const allocation = poLines.map((l) => {
    const ordered = toQ(l.orderedQty);
    const planned = rows.reduce((sum, r) => sum + (isQtyInput(r.qty[l.id]) ? toQ(r.qty[l.id]) : 0), 0);
    return { line: l, ordered, planned, remaining: ordered - planned };
  });
  const unbalanced = allocation.filter((a) => a.remaining !== 0);
  const emptyRows = rows.filter((r) => !poLines.some((l) => isQtyInput(r.qty[l.id]) && toQ(r.qty[l.id]) > 0));

  let blocker = null;
  if (!rows.length) blocker = "Add at least one delivery.";
  else if (invalidInputs) blocker = "Quantities must be numbers with up to 4 decimals.";
  else if (unbalanced.length) blocker = "Plan every item in full before saving.";
  else if (emptyRows.length) blocker = `${labelOf(emptyRows[0])} has nothing planned. Add quantities or remove it.`;

  // ── edits ─────────────────────────────────────────────────────────────────
  const update = (key, patch) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const setQty = (key, lineId, value) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, qty: { ...r.qty, [lineId]: value } } : r)));
  const remove = (key) => setRows((list) => list.filter((r) => r.key !== key));
  const addPhase = (hotelId) => setRows((list) => [...list, makeRow({ hotelId, phaseNo: nextPhase(list, hotelId) })]);
  const addHotel = () => {
    const id = Number(addHotelId);
    if (!id) return;
    setRows((list) => [...list, makeRow({ hotelId: id, phaseNo: nextPhase(list, id) })]);
    setAddHotelId("");
  };
  const copyPhase = (row) =>
    setRows((list) => [...list, makeRow({ hotelId: row.hotelId, phaseNo: nextPhase(list, row.hotelId), remarks: row.remarks, qty: { ...row.qty } })]);

  // Repeat weekly × N: the phase becomes N weekly phases from the chosen
  // first date, each line split across them (remainder on the first). The
  // hotel's other phases stay; afterwards the hotel's phases are renumbered
  // by due date (undated ones last, in their old order), so phase numbers
  // always follow the calendar.
  const applyRepeat = () => {
    const n = Number(repeat.count);
    setRows((list) => {
      const row = list.find((r) => r.key === repeat.key);
      if (!row) return list;
      const shares = Object.fromEntries(
        Object.entries(row.qty).filter(([, v]) => isQtyInput(v)).map(([id, v]) => [id, splitEvenly(toQ(v), n)])
      );
      const qtyAt = (k) => Object.fromEntries(Object.entries(shares).map(([id, sh]) => [id, qtyString(sh[k])]));
      const added = [];
      for (let k = 1; k < n; k += 1) {
        added.push(makeRow({ hotelId: row.hotelId, phaseNo: row.phaseNo + k / 100, dueDate: addDays(repeat.start, 7 * k), remarks: row.remarks, qty: qtyAt(k) }));
      }
      const next = [...list.map((r) => (r.key === row.key ? { ...r, dueDate: repeat.start, qty: qtyAt(0) } : r)), ...added];
      return renumberByDate(next, row.hotelId);
    });
    setRepeat(null);
  };
  const repeatValid =
    repeat && /^\d+$/.test(String(repeat.count)) && Number(repeat.count) >= 2 && Number(repeat.count) <= MAX_WEEKS && isDay(repeat.start);

  // ── grouping: PO hotel order, unallocated last ────────────────────────────
  const groupIds = [...hotels.map((h) => h.id).filter((id) => rows.some((r) => r.hotelId === id))];
  if (rows.some((r) => r.hotelId == null)) groupIds.push(null);
  rows.forEach((r) => { if (!groupIds.includes(r.hotelId)) groupIds.push(r.hotelId); });
  const ordered = groupIds.flatMap((id) => rows.filter((r) => r.hotelId === id).sort((a, b) => a.phaseNo - b.phaseNo));
  const hotelsLeft = hotels.filter((h) => !rows.some((r) => r.hotelId === h.id));

  const body = () =>
    ordered.map((r) => ({
      hotelId: r.hotelId,
      phaseNo: r.phaseNo,
      dueDate: isDay(r.dueDate) ? r.dueDate : null,
      remarks: r.remarks.trim() || null,
      lines: poLines
        .filter((l) => toQ(r.qty[l.id]) > 0)
        .map((l) => ({ poLineId: l.id, plannedQty: qtyString(toQ(r.qty[l.id])) })),
    }));

  const submit = async () => {
    if (blocker || saving) return;
    setSaving(true);
    setError(null);
    const sent = body();
    try {
      await onSave(sent);
    } catch (err) {
      // A VALIDATION refusal about one delivery names it by its index in the
      // body: say which phase that is.
      const data = getApiErrorData(err);
      const at = data?.code === "VALIDATION" ? sent[data?.details?.index] : null;
      const message = getApiErrorMessage(err, "Couldn't save the delivery plan.");
      setError(at ? `${hotelName(at.hotelId)} · Phase ${at.phaseNo}: ${message}` : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.editor}>
      <div className={s.toolbar}>
        {hotels.length > 1 && (
          <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm} ${s.act}`} onClick={() => setRows((list) => splitAcross(list))}>
            <Split size={13} />
            Split equally across hotels
          </button>
        )}
        {hotelsLeft.length > 0 && (
          <span className={s.field}>
            <select
              className={s.textInput}
              aria-label="Hotel to add"
              value={addHotelId}
              onChange={(e) => setAddHotelId(e.target.value)}
            >
              <option value="">Add a hotel…</option>
              {hotelsLeft.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm} ${s.act}`} disabled={!addHotelId} onClick={addHotel}>
              <Plus size={13} />
              Add hotel
            </button>
          </span>
        )}
      </div>

      <div className={s.alloc} aria-label="Allocation by item">
        {allocation.map(({ line, ordered: o, planned, remaining }) => (
          <div key={line.id} className={s.allocItem}>
            <div className={s.aName}>{line.productName || `Line ${line.id}`}</div>
            <div className={s.aNums}>
              {fmtQ(planned)} of {fmtQ(o)} {line.unit || ""} planned
            </div>
            <div className={`${s.aState} ${remaining === 0 ? s.allocOk : remaining > 0 ? s.allocShort : s.allocOver}`}>
              {remaining === 0
                ? "Planned in full"
                : remaining > 0
                ? [fmtQ(remaining), line.unit, "left to allocate"].filter(Boolean).join(" ")
                : ["Over by", fmtQ(-remaining), line.unit].filter(Boolean).join(" ")}
            </div>
          </div>
        ))}
      </div>

      {groupIds.map((hotelId) => {
        const name = hotelName(hotelId);
        const groupRows = ordered.filter((r) => r.hotelId === hotelId);
        return (
          <div key={hotelId ?? "unallocated"} className={s.hotelGroup}>
            <div className={s.hotelHead}>
              <span className={s.hName}>{name}</span>
              <button
                type="button"
                className={`${po.btn} ${po.btnGhost} ${po.btnSm} ${s.act}`}
                aria-label={`Add phase at ${name}`}
                onClick={() => addPhase(hotelId)}
              >
                <Plus size={13} />
                Add phase
              </button>
            </div>
            {groupRows.map((r) => {
              const label = labelOf(r);
              return (
                <div key={r.key} className={s.phase}>
                  <div className={s.phaseHead}>
                    <span className={s.pTitle}>Phase {r.phaseNo}</span>
                    <label className={s.field}>
                      Due
                      <input
                        type="date"
                        className={s.dateInput}
                        aria-label={`Due date for ${label}`}
                        value={r.dueDate}
                        onChange={(e) => update(r.key, { dueDate: e.target.value })}
                      />
                    </label>
                    <input
                      type="text"
                      className={s.textInput}
                      aria-label={`Remarks for ${label}`}
                      placeholder="Remarks (optional)"
                      maxLength={2000}
                      value={r.remarks}
                      onChange={(e) => update(r.key, { remarks: e.target.value })}
                    />
                    <span className={s.pSpacer} />
                    <button type="button" className={s.linkBtn} aria-label={`Copy ${label}`} onClick={() => copyPhase(r)}>
                      <Copy size={12} /> Copy phase
                    </button>
                    <button
                      type="button"
                      className={s.linkBtn}
                      aria-label={`Repeat ${label} weekly`}
                      onClick={() => setRepeat({ key: r.key, count: "4", start: r.dueDate })}
                    >
                      <Repeat size={12} /> Repeat weekly
                    </button>
                    <button type="button" className={s.linkBtn} aria-label={`Remove ${label}`} onClick={() => remove(r.key)}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  {repeat?.key === r.key && (
                    <div className={s.repeatForm}>
                      <span>Spread this phase over</span>
                      <input
                        type="number"
                        min={2}
                        max={MAX_WEEKS}
                        className={s.textInput}
                        aria-label="Weekly deliveries"
                        value={repeat.count}
                        onChange={(e) => setRepeat((p) => ({ ...p, count: e.target.value }))}
                      />
                      <span>weekly deliveries, the first on</span>
                      <input
                        type="date"
                        className={s.dateInput}
                        aria-label="First delivery"
                        value={repeat.start}
                        onChange={(e) => setRepeat((p) => ({ ...p, start: e.target.value }))}
                      />
                      <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm} ${s.act}`} disabled={!repeatValid} onClick={applyRepeat}>
                        Apply
                      </button>
                      <button type="button" className={`${po.btn} ${po.btnGhost} ${po.btnSm} ${s.act}`} onClick={() => setRepeat(null)}>
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className={s.lineRows}>
                    {poLines.map((l) => {
                      const value = r.qty[l.id] ?? "";
                      return (
                        <React.Fragment key={l.id}>
                          <span className={s.lineName}>{l.productName || `Line ${l.id}`}</span>
                          <span className={s.qtyBox}>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={s.qtyInput}
                              aria-label={`${l.productName || `Line ${l.id}`} for ${label}`}
                              aria-invalid={!isQtyInput(value)}
                              placeholder="0"
                              value={value}
                              onChange={(e) => setQty(r.key, l.id, e.target.value)}
                            />
                            <span className={s.unit}>{l.unit || ""}</span>
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {error && (
        <div className={s.errorText} role="alert">
          {error}
        </div>
      )}
      <div className={s.saveBar}>
        {blocker && <span className={s.why}>{blocker}</span>}
        <button type="button" className={`${po.btn} ${po.btnSecondary} ${s.act}`} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={`${po.btn} ${po.btnPrimary} ${s.act}`} onClick={submit} disabled={!!blocker || saving}>
          {saving ? "Saving…" : "Save plan"}
        </button>
      </div>
    </div>
  );
}
