jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getPoDeliveries: jest.fn(),
  savePoDeliveryPlan: jest.fn(),
  patchDeliveryDueDate: jest.fn(),
  shortClosePo: jest.fn(),
  reopenShortClose: jest.fn(),
  revokeSiteRep: jest.fn(),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPoDetails: jest.fn(),
  handleAddSiteRep: jest.fn(),
}));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  getPoDeliveries, savePoDeliveryPlan, patchDeliveryDueDate, shortClosePo, reopenShortClose, revokeSiteRep,
} from "@/services/inventory";
import { toast } from "react-toastify";
import { getPoDetails, handleAddSiteRep } from "@/services/po";
import DeliveriesTab from "../DeliveriesTab";

const pl = (id, poLineId, productName, unit, planned, extra = {}) => {
  const l = {
    id, poLineId, productName, unit, plannedQty: planned, acceptedQty: 0, rejectedQty: 0,
    returnedReplaceQty: 0, returnedCreditQty: 0, shortClosedQty: 0, status: "open", ...extra,
  };
  l.openQty = extra.openQty ?? Math.max(0, l.plannedQty - (l.acceptedQty - l.returnedReplaceQty - l.returnedCreditQty) - l.shortClosedQty);
  return l;
};

const A1 = { id: 1, name: "Hotel A-1" };
const A2 = { id: 2, name: "Hotel A-2" };

const payload = (over = {}) => ({
  poId: 52,
  receiptStatus: "partial",
  receiptLegacy: false,
  planLocked: false,
  planLockedAt: null,
  editable: "all",
  hotels: [A1, A2],
  deliveries: [
    { id: 21, hotelId: 1, hotelName: "Hotel A-1", phaseNo: 1, dueDate: "2026-10-20", status: "partial", remarks: null,
      overdue: true, hasReceipts: true,
      lines: [pl(201, 11, "Basmati rice", "kg", 10, { acceptedQty: 5, rejectedQty: 1, status: "partial" })] },
    { id: 22, hotelId: 2, hotelName: "Hotel A-2", phaseNo: 1, dueDate: "2026-11-09", status: "open", remarks: null,
      overdue: false, hasReceipts: false,
      lines: [pl(202, 11, "Basmati rice", "kg", 5)] },
  ],
  poLines: [{ id: 11, productName: "Basmati rice", unit: "kg", orderedQty: 15, receivedQty: 6, acceptedQty: 5,
    rejectedQty: 1, returnedReplaceQty: 0, returnedCreditQty: 0, shortClosedQty: 0, openQty: 10, receiptStatus: "partial" }],
  grns: [{ id: 7, grnNumber: "GRN/1/2026-27/00007", hotelId: 1, hotelName: "Hotel A-1", status: "posted", docType: "RECEIPT",
    receivedAt: "2026-10-21", postedAt: "2026-10-21T06:30:00.000Z", postedByName: "Asha", lineCount: 1, acceptedValue: "1234.5678" }],
  dispatches: [],
  rtvs: [],
  shortCloses: [],
  siteReps: [],
  can: { editPlan: true, shortClose: true, receive: true, reverse: false, manageSiteRep: true, siteRepHotelIds: [1, 2] },
  ...over,
});

const mount = async (data = payload()) => {
  getPoDeliveries.mockResolvedValue(data);
  render(<DeliveriesTab poId={52} />);
  await screen.findByRole("heading", { name: "Delivery plan" });
};

const group = (label) => screen.getByRole("rowgroup", { name: label });
const cell = (row, label) => row.querySelector(`[data-label="${label}"]`);

beforeEach(() => {
  jest.clearAllMocks();
});

test("grid shows hotel×phase rows with open qty and overdue badge", async () => {
  await mount();

  const late = group("Hotel A-1 · Phase 1");
  expect(within(late).getByText("Overdue")).toBeInTheDocument();
  const lateRow = within(late).getByRole("row", { name: /Basmati rice/ });
  expect(cell(lateRow, "Planned")).toHaveTextContent("10");
  expect(cell(lateRow, "Received")).toHaveTextContent("6");
  expect(cell(lateRow, "Accepted")).toHaveTextContent("5");
  expect(cell(lateRow, "Rejected")).toHaveTextContent("1");
  expect(cell(lateRow, "Open")).toHaveTextContent("5");

  const next = group("Hotel A-2 · Phase 1");
  expect(within(next).queryByText("Overdue")).not.toBeInTheDocument();
  expect(cell(within(next).getByRole("row", { name: /Basmati rice/ }), "Open")).toHaveTextContent("5");

  // GRN value is 4 dp on the wire; shown to the paisa.
  expect(screen.getByText("₹1,234.57")).toBeInTheDocument();
});

test("locked plan allows only due date on phases without receipts", async () => {
  await mount(payload({ planLocked: true, planLockedAt: "2026-10-21T06:30:00.000Z", editable: "dates_only" }));

  expect(screen.getByText(/Plan locked: goods have been dispatched, received or short-closed, so quantities can't change/))
    .toBeInTheDocument();
  expect(screen.getByText(/Due dates of phases with nothing received can still move/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit plan" })).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /Basmati rice for/ })).not.toBeInTheDocument();
  // Phase 1 at A-1 has receipts: its date is fixed.
  expect(screen.queryByLabelText("Due date for Hotel A-1 · Phase 1")).not.toBeInTheDocument();

  const updated = payload({ planLocked: true, editable: "dates_only" });
  updated.deliveries[1] = { ...updated.deliveries[1], dueDate: "2026-11-20" };
  patchDeliveryDueDate.mockResolvedValue(updated);
  const input = screen.getByLabelText("Due date for Hotel A-2 · Phase 1");
  fireEvent.change(input, { target: { value: "2026-11-20" } });
  fireEvent.blur(input);

  await waitFor(() => expect(patchDeliveryDueDate).toHaveBeenCalledWith(52, 22, "2026-11-20"));
  await waitFor(() => expect(screen.getByLabelText("Due date for Hotel A-2 · Phase 1")).toHaveValue("2026-11-20"));
});

test("a due date is a draft until blur or Enter; half-typed years are never sent", async () => {
  await mount();
  const input = screen.getByLabelText("Due date for Hotel A-2 · Phase 1");

  // Typing goes through 0002, 0020, 0202 …: drafts, nothing sent.
  for (const v of ["0002-11-20", "0020-11-20", "0202-11-20", "2026-11-20"]) {
    fireEvent.change(input, { target: { value: v } });
  }
  expect(patchDeliveryDueDate).not.toHaveBeenCalled();
  expect(input).toHaveValue("2026-11-20");

  // Enter commits once; the blur that follows doesn't send it again.
  const moved = payload();
  moved.deliveries[1] = { ...moved.deliveries[1], dueDate: "2026-11-20" };
  patchDeliveryDueDate.mockResolvedValue(moved);
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.blur(input);
  await waitFor(() => expect(patchDeliveryDueDate).toHaveBeenCalledTimes(1));
  expect(patchDeliveryDueDate).toHaveBeenCalledWith(52, 22, "2026-11-20");

  // A half-typed date left on blur goes back to the saved one.
  fireEvent.change(input, { target: { value: "0002-11-20" } });
  fireEvent.blur(input);
  expect(input).toHaveValue("2026-11-20");
  expect(patchDeliveryDueDate).toHaveBeenCalledTimes(1);

  // Clearing saves "no date" on blur.
  const cleared = payload();
  cleared.deliveries[1] = { ...cleared.deliveries[1], dueDate: null };
  patchDeliveryDueDate.mockResolvedValue(cleared);
  fireEvent.change(input, { target: { value: "" } });
  expect(patchDeliveryDueDate).toHaveBeenCalledTimes(1);
  fireEvent.blur(input);
  await waitFor(() => expect(patchDeliveryDueDate).toHaveBeenLastCalledWith(52, 22, null));
  await waitFor(() => expect(screen.getByLabelText("Due date for Hotel A-2 · Phase 1")).toHaveValue(""));
});

test("an answer older than the latest request is dropped", async () => {
  const data = payload();
  data.deliveries[0] = { ...data.deliveries[0], status: "open", hasReceipts: false, overdue: false,
    lines: [pl(201, 11, "Basmati rice", "kg", 10)] };
  await mount(data);

  // Two dates move; the first answer arrives last and must not win.
  let answerFirst;
  const first = { ...data, deliveries: [{ ...data.deliveries[0], dueDate: "2026-11-01" }, data.deliveries[1]] };
  const second = { ...first, deliveries: [first.deliveries[0], { ...data.deliveries[1], dueDate: "2026-11-30" }] };
  patchDeliveryDueDate
    .mockImplementationOnce(() => new Promise((r) => { answerFirst = () => r(first); }))
    .mockResolvedValueOnce(second);

  const a1 = screen.getByLabelText("Due date for Hotel A-1 · Phase 1");
  fireEvent.change(a1, { target: { value: "2026-11-01" } });
  fireEvent.blur(a1);
  const a2 = screen.getByLabelText("Due date for Hotel A-2 · Phase 1");
  fireEvent.change(a2, { target: { value: "2026-11-30" } });
  fireEvent.blur(a2);
  await waitFor(() => expect(screen.getByLabelText("Due date for Hotel A-2 · Phase 1")).toHaveValue("2026-11-30"));

  answerFirst();
  await waitFor(() => expect(patchDeliveryDueDate).toHaveBeenCalledTimes(2));
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.getByLabelText("Due date for Hotel A-2 · Phase 1")).toHaveValue("2026-11-30");
});

test("a go-live backlog PO (legacy, nothing received) is received and planned like any other", async () => {
  await mount(payload({ receiptLegacy: true, receiptStatus: "not_received", grns: [] }));
  expect(screen.queryByText("Received before stock tracking")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Receive goods/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/receive/52");
  expect(screen.getByRole("button", { name: "Short-close" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Edit plan" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add site rep" })).toBeInTheDocument();
});

test("a PO received in the old flow is read-only", async () => {
  await mount(payload({ receiptLegacy: true, receiptStatus: "received", planLocked: true, editable: "dates_only" }));
  expect(screen.getByText("Received before stock tracking")).toBeInTheDocument();
  expect(screen.queryByText(/Plan locked/)).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Receive goods/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Short-close" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit plan" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Due date for/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add site rep" })).not.toBeInTheDocument();
});

test("a plan that locked under the editor closes it, reloads and says why", async () => {
  await mount();
  fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
  savePoDeliveryPlan.mockRejectedValue({
    response: { status: 409, data: { status: 0, code: "LOCKED", message: "Goods have been dispatched or received against this purchase order, so its delivery quantities are fixed." } },
  });
  getPoDeliveries.mockResolvedValue(payload({ planLocked: true, editable: "dates_only" }));
  fireEvent.click(screen.getByRole("button", { name: "Save plan" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
    "Goods have been dispatched or received against this purchase order, so its delivery quantities are fixed."
  ));
  await waitFor(() => expect(getPoDeliveries).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("button", { name: "Save plan" })).not.toBeInTheDocument();
  expect(await screen.findByText(/Plan locked: goods have been dispatched/)).toBeInTheDocument();
});

test("an editable plan opens the editor", async () => {
  await mount();
  fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
  expect(screen.getByRole("textbox", { name: "Basmati rice for Hotel A-2 · Phase 1" })).toHaveValue("5");
});

test("short-close answers with the full tab and replaces it without a refetch", async () => {
  await mount();
  const closed = payload();
  closed.deliveries[1] = {
    ...closed.deliveries[1], status: "short_closed",
    lines: [pl(202, 11, "Basmati rice", "kg", 5, { shortClosedQty: 5, status: "short_closed" })],
  };
  closed.shortCloses = [{ id: 9, deliveryLineId: 202, deliveryId: 22, poLineId: 11, productName: "Basmati rice", unit: "kg",
    hotelId: 2, hotelName: "Hotel A-2", phaseNo: 1, qty: 5, reasonCode: "no_longer_needed", remarks: null,
    action: "close", actedAt: "2026-10-24T10:00:00.000Z", actedBy: 5, actedByName: "Asha", rtvId: null, rtvNumber: null }];
  shortClosePo.mockResolvedValue(closed);

  fireEvent.click(screen.getByRole("button", { name: "Short-close" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("radio", { name: "One phase" }));
  fireEvent.change(within(dialog).getByRole("combobox", { name: "Phase" }), { target: { value: "22" } });
  fireEvent.change(within(dialog).getByRole("combobox", { name: "Reason" }), { target: { value: "no_longer_needed" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Short-close" }));

  await waitFor(() => expect(shortClosePo).toHaveBeenCalledWith(52, {
    target: { type: "delivery", deliveryId: 22 }, reasonCode: "no_longer_needed", remarks: "",
  }));
  await waitFor(() => expect(cell(within(group("Hotel A-2 · Phase 1")).getByRole("row", { name: /Basmati rice/ }), "Short-closed")).toHaveTextContent("5"));
  expect(getPoDeliveries).toHaveBeenCalledTimes(1);
});

test("Reopen is offered on hand-closed rows only, never on rows credited by a return", async () => {
  const data = payload();
  data.deliveries[0].lines = [pl(201, 11, "Basmati rice", "kg", 10, { acceptedQty: 8, shortClosedQty: 2, status: "short_closed" })];
  data.deliveries[1].lines = [pl(202, 11, "Basmati rice", "kg", 5, { shortClosedQty: 5, status: "short_closed" })];
  data.shortCloses = [
    { id: 1, deliveryLineId: 201, deliveryId: 21, poLineId: 11, productName: "Basmati rice", unit: "kg", hotelId: 1,
      hotelName: "Hotel A-1", phaseNo: 1, qty: 2, reasonCode: "other", remarks: "RTV RTV/1/2026-27/00001 credit",
      action: "close", actedAt: "2026-10-24T10:00:00.000Z", actedByName: "Asha", rtvId: 4, rtvNumber: "RTV/1/2026-27/00001" },
    { id: 2, deliveryLineId: 202, deliveryId: 22, poLineId: 11, productName: "Basmati rice", unit: "kg", hotelId: 2,
      hotelName: "Hotel A-2", phaseNo: 1, qty: 5, reasonCode: "no_longer_needed", remarks: null,
      action: "close", actedAt: "2026-10-24T11:00:00.000Z", actedByName: "Asha", rtvId: null, rtvNumber: null },
  ];
  await mount(data);

  expect(within(group("Hotel A-1 · Phase 1")).queryByRole("button", { name: /Reopen/ })).not.toBeInTheDocument();
  expect(screen.getByText(/Credit on RTV\/1\/2026-27\/00001/)).toBeInTheDocument();

  reopenShortClose.mockResolvedValue(payload());
  fireEvent.click(within(group("Hotel A-2 · Phase 1")).getByRole("button", { name: "Reopen Basmati rice" }));
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", { name: "Reopen" });
  expect(confirm).toBeDisabled();
  fireEvent.change(within(dialog).getByRole("textbox", { name: /Remarks/ }), { target: { value: "Vendor found stock" } });
  fireEvent.click(confirm);
  await waitFor(() => expect(reopenShortClose).toHaveBeenCalledWith(52, { deliveryLineIds: [202], remarks: "Vendor found stock" }));
});

test("short-close follows can.shortClose", async () => {
  await mount(payload({ can: { editPlan: false, shortClose: false, receive: false, reverse: false, manageSiteRep: false, siteRepHotelIds: [] } }));
  expect(screen.getByRole("button", { name: "Short-close" })).toBeDisabled();
});

test("an unsplit multi-hotel PO is asked to split by hotel", async () => {
  await mount(payload({
    receiptStatus: "not_received",
    deliveries: [{ id: 30, hotelId: null, hotelName: null, phaseNo: 1, dueDate: null, status: "open", remarks: null,
      overdue: false, hasReceipts: false, lines: [pl(301, 11, "Basmati rice", "kg", 15)] }],
    grns: [],
  }));
  expect(screen.getByText("Split this PO by hotel")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Split by hotel" }));
  expect(screen.getByRole("textbox", { name: "Basmati rice for Hotel A-1 · Phase 1" })).toHaveValue("8");
  expect(screen.getByRole("textbox", { name: "Basmati rice for Hotel A-2 · Phase 1" })).toHaveValue("7");
});

const RAVI = { tokenId: 31, name: "Ravi", email: "ravi@example.com", phone: "9876543210", hotelId: 2, hotelName: "Hotel A-2",
  expiresAt: "2026-11-07T10:00:00.000Z", lastUsedAt: null, createdAt: "2026-10-24T10:00:00.000Z", revoked: false, live: true };
const OLD = { ...RAVI, tokenId: 30, name: "Sunil", revoked: true, live: false };

test("site rep panel sends hotel_id on a multi-hotel PO, shows expiry and revokes", async () => {
  await mount(payload({ siteReps: [RAVI, OLD] }));

  const reps = screen.getByRole("region", { name: "Site representatives" });
  expect(within(reps).getByText("Ravi")).toBeInTheDocument();
  expect(within(reps).getByText(/Link expires 07 Nov 2026/)).toBeInTheDocument();
  expect(within(reps).getByText(/Hotel A-2 · Link expires/)).toBeInTheDocument();
  // A revoked link is listed as such, with nothing to do on it.
  expect(within(reps).getByText(/Hotel A-2 · Revoked/)).toBeInTheDocument();
  expect(within(reps).queryByRole("button", { name: "Revoke Sunil's link" })).not.toBeInTheDocument();
  // The panel reads the Deliveries payload; the heavy PO read is gone.
  expect(getPoDetails).not.toHaveBeenCalled();

  handleAddSiteRep.mockResolvedValue({ status: 1, message: "Site representative added.", data: { id: 32, email_sent: true } });
  fireEvent.click(within(reps).getByRole("button", { name: "Add site rep" }));
  fireEvent.change(within(reps).getByRole("textbox", { name: "Name" }), { target: { value: "Meera" } });
  fireEvent.change(within(reps).getByRole("textbox", { name: "Email" }), { target: { value: "meera@example.com" } });
  fireEvent.change(within(reps).getByRole("textbox", { name: "Phone" }), { target: { value: "9812345678" } });
  expect(within(reps).getByRole("textbox", { name: "Name" })).toHaveAttribute("maxLength", "99");
  const send = within(reps).getByRole("button", { name: "Send link" });
  // A multi-hotel PO needs the hotel the person receives at.
  expect(send).toBeDisabled();
  fireEvent.change(within(reps).getByRole("combobox", { name: "Hotel" }), { target: { value: "1" } });
  fireEvent.click(send);
  await waitFor(() => expect(handleAddSiteRep).toHaveBeenCalledWith({
    po_id: 52, hotel_id: 1, name: "Meera", email: "meera@example.com", phone: "9812345678",
  }));
  // The tab reloads to show the new link.
  await waitFor(() => expect(getPoDeliveries).toHaveBeenCalledTimes(2));

  revokeSiteRep.mockResolvedValue({ revoked: 1 });
  fireEvent.click(within(reps).getByRole("button", { name: "Revoke Ravi's link" }));
  fireEvent.click(await screen.findByRole("button", { name: "Revoke link" }));
  await waitFor(() => expect(revokeSiteRep).toHaveBeenCalledWith(52, 31));
});

test("no site-rep actions without the flag, and only at the caller's hotels", async () => {
  await mount(payload({
    siteReps: [RAVI],
    can: { editPlan: true, shortClose: true, receive: false, reverse: false, manageSiteRep: false, siteRepHotelIds: [] },
  }));
  let reps = screen.getByRole("region", { name: "Site representatives" });
  expect(within(reps).getByText("Ravi")).toBeInTheDocument();
  expect(within(reps).queryByRole("button", { name: "Add site rep" })).not.toBeInTheDocument();
  expect(within(reps).queryByRole("button", { name: /Revoke/ })).not.toBeInTheDocument();
});

test("a receiver at one hotel is offered that hotel only, and can't revoke another hotel's link", async () => {
  await mount(payload({
    siteReps: [RAVI],
    can: { editPlan: false, shortClose: false, receive: true, reverse: false, manageSiteRep: true, siteRepHotelIds: [1] },
  }));
  const reps = screen.getByRole("region", { name: "Site representatives" });
  // Ravi receives at Hotel A-2, where this user can't manage links.
  expect(within(reps).queryByRole("button", { name: "Revoke Ravi's link" })).not.toBeInTheDocument();
  fireEvent.click(within(reps).getByRole("button", { name: "Add site rep" }));
  const hotel = within(reps).getByRole("combobox", { name: "Hotel" });
  expect(within(hotel).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "Choose the hotel they receive at…", "Hotel A-1",
  ]);
  // The only choice is chosen.
  expect(hotel).toHaveValue("1");
});

test("phone layer restacks the delivery grid as cards", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "deliveries.module.scss"), "utf8");
  const layer = css.slice(css.indexOf("Phone layer"));
  expect(css.indexOf("Phone layer")).toBeGreaterThan(-1);
  expect(layer).toMatch(/@media \(max-width: 768px\)/);
  expect(layer).toMatch(/\.grid\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
  expect(layer).toMatch(/content:\s*attr\(data-label\)/);
});

test("phone layer gives every small control a 44px target", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "deliveries.module.scss"), "utf8");
  const layer = css.slice(css.indexOf("Phone layer"));
  // .act is on Receive goods, Short-close, Edit plan, Split, Add phase / hotel, Add site rep, Send link.
  for (const rule of [
    /\.act\s*{\s*min-height:\s*44px;/,
    /\.mSelect, \.mInput\s*{\s*min-height:\s*44px;/,
    /\.targetOpt\s*{\s*min-height:\s*44px;/,
    /\.targetOpt label\s*{\s*min-height:\s*44px;/,
    /\.rowPicks label\s*{\s*min-height:\s*44px;/,
    /\.tabStrip button\s*{\s*min-height:\s*44px;/,
  ]) {
    expect(layer).toMatch(rule);
  }
});
