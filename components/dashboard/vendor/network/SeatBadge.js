import React from "react";
import { fmtDate, fmtInr } from "./networkFormat";

/**
 * The seat state of one entity (spec §5.1). The principal needs no seat; any
 * other entity operates only with an active seat for the financial year.
 * `seat` is { status: 'active'|'pending', end_date, fee_amount? } or null.
 */
export default function SeatBadge({ relationship, seat }) {
  if (relationship === "PRINCIPAL") {
    return <span className="pill outline">Not needed</span>;
  }
  if (!seat?.status) {
    return <span className="pill neutral">No seat</span>;
  }
  if (seat.status === "active") {
    return (
      <span className="pill success" title={`Valid till ${fmtDate(seat.end_date)}`}>
        <span className="pdot"></span>Seat active · till {fmtDate(seat.end_date)}
      </span>
    );
  }
  return (
    <span className="pill warn pulse">
      <span className="pdot"></span>Payment pending
      {seat.fee_amount != null && Number(seat.fee_amount) > 0 ? ` · ${fmtInr(seat.fee_amount)}` : ""}
    </span>
  );
}
