import React from "react";
import Link from "next/link";
import { PackageCheck } from "lucide-react";
import po from "../PurchaseOrders.module.scss";
import { inr, fmtDateOnly } from "../shared";
import s from "./deliveries.module.scss";

/*
  The documents raised against the PO: GRNs (linked to their detail page,
  accepted value to the paisa), the vendor's dispatch notes and returns.
  Props: grns, dispatches, rtvs (GrnSummary[] / DispatchSummary[] / RtvSummary[]).
*/

const DISPOSITION = { REPLACE: "Replacement", CREDIT: "Credit note" };

export const words = (v) => {
  const t = String(v || "").replace(/_/g, " ").trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : "—";
};

const joined = (parts) => parts.filter(Boolean).join(" · ");

export default function Receipts({ grns = [], dispatches = [], rtvs = [] }) {
  return (
    <section className={po.sectionCard}>
      <div className={po.sectionHead}>
        <div className={po.hLeft}>
          <div className={po.ic}>
            <PackageCheck size={13} />
          </div>
          <h2>Receipts</h2>
        </div>
      </div>
      {grns.length + dispatches.length + rtvs.length === 0 ? (
        <div className={s.sectionPad}>
          <div className={s.muted}>Nothing has been dispatched or received yet.</div>
        </div>
      ) : (
        <div className={s.list}>
          {grns.map((g) => (
            <div key={`g${g.id}`} className={s.listRow}>
              <div className={s.lMain}>
                <div className={s.lTitle}>
                  <Link href={`/dashboard/buyer/inventory/grn/${g.id}`} className={s.docLink}>
                    {g.grnNumber || `Draft GRN #${g.id}`}
                  </Link>
                  {g.docType === "REVERSAL" && <span className={s.muted}> · Reversal</span>}
                </div>
                <div className={s.lSub}>
                  {joined([
                    g.hotelName,
                    g.receivedAt ? `Received ${fmtDateOnly(g.receivedAt)}` : null,
                    `${g.lineCount} item${Number(g.lineCount) === 1 ? "" : "s"}`,
                    g.postedByName ? `by ${g.postedByName}` : null,
                  ])}
                </div>
              </div>
              <div className={s.lRight}>
                <span className={s.num}>{inr(g.acceptedValue)}</span>
                <span className={`${s.status} ${g.status === "posted" ? s.stReceived : s.stOpen}`}>{words(g.status)}</span>
              </div>
            </div>
          ))}
          {dispatches.map((dn) => (
            <div key={`d${dn.id}`} className={s.listRow}>
              <div className={s.lMain}>
                <div className={s.lTitle}>Dispatch note {dn.dispatchNumber || `#${dn.id}`}</div>
                <div className={s.lSub}>
                  {joined([
                    dn.phaseNo ? `${dn.hotelName || "To be allocated"} · Phase ${dn.phaseNo}` : dn.hotelName,
                    dn.challanNo ? `Challan ${dn.challanNo}` : null,
                    dn.expectedDeliveryDate ? `Expected ${fmtDateOnly(dn.expectedDeliveryDate)}` : null,
                  ])}
                </div>
              </div>
              <div className={s.lRight}>
                <span className={`${s.status} ${s.stPartial}`}>{words(dn.status)}</span>
              </div>
            </div>
          ))}
          {rtvs.map((r) => (
            <div key={`r${r.id}`} className={s.listRow}>
              <div className={s.lMain}>
                <div className={s.lTitle}>Return {r.rtvNumber || `#${r.id} (draft)`}</div>
                <div className={s.lSub}>
                  {joined([
                    r.hotelName,
                    DISPOSITION[r.disposition] || words(r.disposition),
                    r.creditNoteRef ? `Credit note ${r.creditNoteRef}` : null,
                  ])}
                </div>
              </div>
              <div className={s.lRight}>
                <span
                  className={`${s.status} ${
                    r.status === "closed" ? s.stReceived : r.status === "cancelled" ? s.stClosed : s.stWarn
                  }`}
                >
                  {words(r.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
