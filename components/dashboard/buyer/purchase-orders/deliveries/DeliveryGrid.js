import React from "react";
import { RotateCcw } from "lucide-react";
import { fmtDateOnly } from "../shared";
import s from "./deliveries.module.scss";
import { deliveryLabel, fmtQ, toQ } from "./planMath";

/*
  The hotel × phase grid (spec §7): one <tbody> per delivery, named by its
  label so a screen reader (and the tests) can find "Hotel A-1 · Phase 2",
  and one row per planned item. Every number cell carries data-label: the
  phone layer restacks rows into label → value cards.

  Received = accepted + rejected at the dock. Returned = accepted qty sent
  back afterwards (replace and credit). Open is the server's figure.

  Props:
    deliveries   Delivery[]
    canEditDate(delivery) → bool   show a due-date input for this delivery
    dateValue(delivery) → 'YYYY-MM-DD' | ''   current (possibly pending) value
    onDueDate(delivery, day)       every change of the input
    onDueDateBlur(delivery)        the input lost focus
    reopenable   Map<deliveryLineId, 1/10000 units>  hand-closed, still closed
    onReopen(line, delivery)   when set, offer Reopen on reopenable rows
*/

const DELIVERY_STATUS = {
  open: { label: "Open", cls: "stOpen" },
  partial: { label: "Partly received", cls: "stPartial" },
  received: { label: "Received", cls: "stReceived" },
  short_closed: { label: "Short-closed", cls: "stClosed" },
};

// One number cell; `q` in 1/10000 units (planMath).
const Qty = ({ q, label, strong }) => {
  const cls = [s.num, q === 0 ? s.zero : strong ? s.openPos : ""].filter(Boolean).join(" ");
  return (
    <td className={cls} data-label={label}>
      {Number.isFinite(q) ? fmtQ(q) : "—"}
    </td>
  );
};

export default function DeliveryGrid({ deliveries = [], canEditDate, dateValue, onDueDate, onDueDateBlur, reopenable, onReopen }) {
  if (!deliveries.length) {
    return <div className={s.muted}>No deliveries are planned yet.</div>;
  }
  const showActions = !!onReopen;

  return (
    <div className={s.gridWrap}>
      <table className={s.grid}>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className={s.num}>Planned</th>
            <th scope="col" className={s.num}>Received</th>
            <th scope="col" className={s.num}>Accepted</th>
            <th scope="col" className={s.num}>Rejected</th>
            <th scope="col" className={s.num}>Returned</th>
            <th scope="col" className={s.num}>Short-closed</th>
            <th scope="col" className={s.num}>Open</th>
            {showActions && (
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        {deliveries.map((d) => {
          const label = deliveryLabel(d);
          const st = DELIVERY_STATUS[d.status] || { label: d.status, cls: "stOpen" };
          const editable = canEditDate ? canEditDate(d) : false;
          return (
            <tbody key={d.id} aria-label={label}>
              <tr className={s.groupHead}>
                <td colSpan={showActions ? 9 : 8}>
                  <div className={s.groupHeadInner}>
                    <span className={s.gTitle}>{label}</span>
                    <span className={`${s.status} ${s[st.cls]}`}>{st.label}</span>
                    {d.overdue && <span className={`${s.status} ${s.stOverdue}`}>Overdue</span>}
                    <span className={s.gDue}>
                      {editable ? (
                        <>
                          Due
                          <input
                            type="date"
                            className={s.dateInput}
                            aria-label={`Due date for ${label}`}
                            value={dateValue ? dateValue(d) : d.dueDate || ""}
                            onChange={(e) => onDueDate(d, e.target.value)}
                            onBlur={() => onDueDateBlur && onDueDateBlur(d)}
                          />
                        </>
                      ) : d.dueDate ? (
                        `Due ${fmtDateOnly(d.dueDate)}`
                      ) : (
                        "No due date"
                      )}
                    </span>
                    {d.remarks && <span className={s.gRemarks}>{d.remarks}</span>}
                  </div>
                </td>
              </tr>
              {(d.lines || []).map((l) => {
                const closedByHand = reopenable?.get(l.id) || 0;
                return (
                  <tr key={l.id}>
                    <th scope="row" className={s.itemCell}>
                      {l.productName || `Line ${l.poLineId}`}
                      {l.unit && <span className={s.unit}>{l.unit}</span>}
                    </th>
                    <Qty q={toQ(l.plannedQty)} label="Planned" />
                    <Qty q={toQ(l.acceptedQty) + toQ(l.rejectedQty)} label="Received" />
                    <Qty q={toQ(l.acceptedQty)} label="Accepted" />
                    <Qty q={toQ(l.rejectedQty)} label="Rejected" />
                    <Qty q={toQ(l.returnedReplaceQty) + toQ(l.returnedCreditQty)} label="Returned" />
                    <Qty q={toQ(l.shortClosedQty)} label="Short-closed" />
                    <Qty q={toQ(l.openQty)} label="Open" strong />
                    {showActions && (
                      <td className={s.actionCell}>
                        {closedByHand > 0 && (
                          <button
                            type="button"
                            className={s.linkBtn}
                            aria-label={`Reopen ${l.productName || `line ${l.poLineId}`}`}
                            title={`Expect ${fmtQ(closedByHand)} ${l.unit || ""} again`}
                            onClick={() => onReopen(l, d)}
                          >
                            <RotateCcw size={12} aria-hidden="true" /> Reopen
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
