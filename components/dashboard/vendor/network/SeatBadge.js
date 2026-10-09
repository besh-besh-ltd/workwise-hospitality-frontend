import React from "react";
import { fmtDate, fmtInr } from "./networkFormat";

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
// The IST calendar day (YYYY-MM-DD) of a date or timestamp, or null.
const istDay = (d) => {
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : new Date(t + IST_OFFSET_MS).toISOString().slice(0, 10);
};

/** True when the seat's last day (end_date, inclusive) is before today in IST. */
export const isSeatExpired = (seat) => {
  const end = seat?.end_date ? istDay(seat.end_date) : null;
  return !!end && end < istDay(Date.now());
};

/**
 * The seat state of one entity (spec §5.1). The principal needs no seat; any
 * other entity operates only with an active seat for the financial year, unless
 * the seat fee is 0 (`feeInr === 0`, NETWORK_SEAT_FEE_INR): then a missing or
 * expired seat blocks nothing and reads "Included". An unknown fee keeps the
 * strict labels.
 * `seat` is { status: 'active'|'pending', end_date, fee_amount? } or null.
 */
export default function SeatBadge({ relationship, seat, feeInr }) {
  if (relationship === "PRINCIPAL") {
    return <span className="pill outline">Not needed</span>;
  }
  const expired = isSeatExpired(seat);
  if (feeInr === 0 && (!seat?.status || expired)) {
    return (
      <span className="pill outline" title="There is no seat fee, so this entity operates without a paid seat">
        Included
      </span>
    );
  }
  if (!seat?.status) {
    return <span className="pill neutral">No seat</span>;
  }
  if (expired) {
    return (
      <span className="pill warn" title={`Ended ${fmtDate(seat.end_date)}`}>
        <span className="pdot"></span>Seat expired
      </span>
    );
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

/** The seat fee (INR) that applies to `entity`: its own seat_fee_inr, else the payload's; undefined when unknown. */
export const seatFeeFor = (entity, data) => {
  const raw = entity?.seat_fee_inr ?? data?.seat_fee_inr ?? data?.org?.seat_fee_inr;
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};
