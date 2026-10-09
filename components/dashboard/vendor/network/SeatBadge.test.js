// Seat state of one entity (spec §5.1). With NETWORK_SEAT_FEE_INR = 0 a seat
// blocks nothing, so an expired or missing seat reads "Included", never
// "Seat expired" / "No seat" (Task 24 F4).

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SeatBadge, { isSeatExpired } from "./SeatBadge";

const NOW = new Date("2026-10-09T06:00:00Z");
beforeAll(() => jest.useFakeTimers({ now: NOW }));
afterAll(() => jest.useRealTimers());

const PAST = { status: "active", end_date: "2026-03-31" };
const FUTURE = { status: "active", end_date: "2027-03-31" };

test("isSeatExpired compares the seat's last day with today in IST", () => {
  expect(isSeatExpired(PAST)).toBe(true);
  expect(isSeatExpired(FUTURE)).toBe(false);
  expect(isSeatExpired({ status: "active", end_date: "2026-10-09" })).toBe(false); // last day is today
  // a DATE serialised as IST midnight in UTC is still the 31st
  expect(isSeatExpired({ status: "active", end_date: "2027-03-30T18:30:00.000Z" })).toBe(false);
  expect(isSeatExpired(null)).toBe(false);
});

test.each([
  ["an expired seat, fee 0", PAST, 0, "Included"],
  ["no seat, fee 0", null, 0, "Included"],
  ["an expired seat, fee > 0", PAST, 1500, "Seat expired"],
  ["an expired seat, fee unknown", PAST, undefined, "Seat expired"],
  ["no seat, fee > 0", null, 1500, "No seat"],
  ["no seat, fee unknown", null, undefined, "No seat"],
])("%s reads %p", (_, seat, feeInr, text) => {
  render(<SeatBadge relationship="BRANCH" seat={seat} feeInr={feeInr} />);
  expect(screen.getByText(text)).toBeInTheDocument();
});

test("an active seat in its year keeps its date, even at fee 0", () => {
  render(<SeatBadge relationship="BRANCH" seat={FUTURE} feeInr={0} />);
  expect(screen.getByText(/Seat active · till 31 Mar 2027/)).toBeInTheDocument();
});

test("the principal needs no seat", () => {
  render(<SeatBadge relationship="PRINCIPAL" seat={null} feeInr={0} />);
  expect(screen.getByText("Not needed")).toBeInTheDocument();
});

// Fix round 1: the backend now lists an expired seat as status 'EXPIRED' (with
// end_date / valid_until) instead of hiding it.
test.each([
  ["EXPIRED with a past end date, fee > 0", { status: "EXPIRED", end_date: "2026-03-31" }, 1500, "Seat expired"],
  ["EXPIRED marked early (end date still ahead), fee > 0", { status: "EXPIRED", end_date: "2027-03-31" }, 1500, "Seat expired"],
  ["EXPIRED, fee 0", { status: "EXPIRED", valid_until: "2026-03-31" }, 0, "Included"],
  ["EXPIRED, fee unknown", { status: "EXPIRED" }, undefined, "Seat expired"],
])("%s reads %p", (_, seat, feeInr, text) => {
  render(<SeatBadge relationship="BRANCH" seat={seat} feeInr={feeInr} />);
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(screen.queryByText(/Payment pending/)).toBeNull();
});

test("valid_until stands in for end_date", () => {
  expect(isSeatExpired({ status: "active", valid_until: "2026-03-31" })).toBe(true);
  expect(isSeatExpired({ status: "EXPIRED" })).toBe(true);
});
