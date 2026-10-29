import React from "react";
import { Ban } from "lucide-react";
import po from "../PurchaseOrders.module.scss";
import { fmtDateTime } from "../shared";
import s from "./deliveries.module.scss";
import { fmtQty, reasonLabel } from "./planMath";

/*
  The short-close log: hand closes ("Closed · <reason>" with remarks), the
  closes a CREDIT return wrote ("Credit on <RTV number>") and reopens.
  Props: shortCloses (the payload's log). Renders nothing when it is empty.
*/
export default function ShortCloseHistory({ shortCloses = [] }) {
  if (!shortCloses.length) return null;
  return (
    <section className={po.sectionCard}>
      <div className={po.sectionHead}>
        <div className={po.hLeft}>
          <div className={po.ic}>
            <Ban size={13} />
          </div>
          <h2>Short-close history</h2>
        </div>
      </div>
      <div className={s.list}>
        {shortCloses.map((r) => {
          const credit = r.rtvId != null;
          const where = `${r.hotelName || "To be allocated"} · Phase ${r.phaseNo}`;
          const what = credit
            ? `Credit on ${r.rtvNumber || `return #${r.rtvId}`}`
            : `${r.action === "reopen" ? "Reopened" : "Closed"} · ${reasonLabel(r.reasonCode)}`;
          return (
            <div key={r.id} className={s.listRow}>
              <div className={s.lMain}>
                <div className={s.lTitle}>
                  {r.productName || `Line ${r.poLineId}`} · {where}
                </div>
                <div className={s.lSub}>{what}</div>
                {!credit && r.remarks && <div className={s.lSub}>{r.remarks}</div>}
                <div className={s.lSub}>
                  {[r.actedByName, r.actedAt ? fmtDateTime(r.actedAt) : null].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className={s.lRight}>
                <span className={s.num}>
                  {fmtQty(r.qty)} {r.unit || ""}
                </span>
                <span className={`${s.status} ${r.action === "reopen" ? s.stPartial : s.stClosed}`}>
                  {r.action === "reopen" ? "Reopened" : credit ? "Credited" : "Closed"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
