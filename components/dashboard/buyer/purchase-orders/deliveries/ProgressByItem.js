import React from "react";
import { ListChecks } from "lucide-react";
import po from "../PurchaseOrders.module.scss";
import s from "./deliveries.module.scss";
import { fmtQ, fmtQty, toQ } from "./planMath";

/*
  Aside card: per PO line, how much of the ordered qty is accepted (net of
  returns) and how much was short-closed, as a bar, plus what is still open.
  Props: poLines (PoLineRoll[] of the Deliveries payload).
*/
export default function ProgressByItem({ poLines = [] }) {
  if (!poLines.length) return null;
  return (
    <section className={po.sectionCard}>
      <div className={po.sectionHead}>
        <div className={po.hLeft}>
          <div className={po.ic}>
            <ListChecks size={13} />
          </div>
          <h2>Progress by item</h2>
        </div>
      </div>
      <div className={s.progress}>
        {poLines.map((l) => {
          const ordered = toQ(l.orderedQty);
          const kept = Math.max(0, toQ(l.acceptedQty) - toQ(l.returnedReplaceQty) - toQ(l.returnedCreditQty));
          const closed = toQ(l.shortClosedQty);
          const pct = (q) => (ordered > 0 ? `${Math.min(100, (q / ordered) * 100)}%` : "0%");
          return (
            <div key={l.id} className={s.pRow}>
              <div className={s.pName}>{l.productName || `Line ${l.id}`}</div>
              <div className={s.pBar} aria-hidden="true">
                <span className={s.pAccepted} style={{ width: pct(kept) }} />
                <span className={s.pClosed} style={{ width: pct(closed) }} />
              </div>
              <div className={s.pNums}>
                <span>
                  {fmtQ(kept)} accepted · {fmtQty(l.openQty)} open
                </span>
                <span>
                  of {fmtQty(l.orderedQty)} {l.unit || ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
