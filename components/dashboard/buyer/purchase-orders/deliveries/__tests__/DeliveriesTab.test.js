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
  getPoDeliveries, patchDeliveryDueDate, shortClosePo, reopenShortClose, revokeSiteRep,
} from "@/services/inventory";
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
  can: { editPlan: true, shortClose: true, receive: true, reverse: false, manageSiteRep: true },
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
  getPoDetails.mockResolvedValue({ id: 52, site_reps: [] });
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

  expect(screen.getByText("Plan locked: quantities can't change")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit plan" })).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /Basmati rice for/ })).not.toBeInTheDocument();
  // Phase 1 at A-1 has receipts: its date is fixed.
  expect(screen.queryByLabelText("Due date for Hotel A-1 · Phase 1")).not.toBeInTheDocument();

  const updated = payload({ planLocked: true, editable: "dates_only" });
  updated.deliveries[1] = { ...updated.deliveries[1], dueDate: "2026-11-20" };
  patchDeliveryDueDate.mockResolvedValue(updated);
  fireEvent.change(screen.getByLabelText("Due date for Hotel A-2 · Phase 1"), { target: { value: "2026-11-20" } });

  await waitFor(() => expect(patchDeliveryDueDate).toHaveBeenCalledWith(52, 22, "2026-11-20"));
  await waitFor(() => expect(screen.getByLabelText("Due date for Hotel A-2 · Phase 1")).toHaveValue("2026-11-20"));
});

test("a due date saves once it is a whole date; clearing it saves on blur", async () => {
  await mount();
  const input = screen.getByLabelText("Due date for Hotel A-2 · Phase 1");

  // Typing the year goes through 0002, 0020, 0202: none of those is sent.
  fireEvent.change(input, { target: { value: "0002-11-20" } });
  fireEvent.blur(input);
  expect(patchDeliveryDueDate).not.toHaveBeenCalled();
  expect(input).toHaveValue("2026-11-09");

  const cleared = payload();
  cleared.deliveries[1] = { ...cleared.deliveries[1], dueDate: null };
  patchDeliveryDueDate.mockResolvedValue(cleared);
  fireEvent.change(input, { target: { value: "" } });
  expect(patchDeliveryDueDate).not.toHaveBeenCalled();
  fireEvent.blur(input);
  await waitFor(() => expect(patchDeliveryDueDate).toHaveBeenCalledWith(52, 22, null));
  await waitFor(() => expect(within(group("Hotel A-2 · Phase 1")).getByLabelText("Due date for Hotel A-2 · Phase 1")).toHaveValue(""));
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
  await mount(payload({ can: { editPlan: false, shortClose: false, receive: false, reverse: false, manageSiteRep: false } }));
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

test("site rep panel sends hotel_id on a multi-hotel PO, shows expiry and revokes", async () => {
  getPoDetails.mockResolvedValue({
    id: 52,
    site_reps: [{ id: 31, name: "Ravi", email: "ravi@example.com", phone: "9876543210", hotel_id: 2,
      expires_at: "2026-11-07T10:00:00.000Z", last_used_at: null, created_at: "2026-10-24T10:00:00.000Z" }],
  });
  await mount();

  const reps = await screen.findByRole("region", { name: "Site representatives" });
  expect(await within(reps).findByText("Ravi")).toBeInTheDocument();
  expect(within(reps).getByText(/Link expires 07 Nov 2026/)).toBeInTheDocument();
  expect(within(reps).getByText(/Hotel A-2/)).toBeInTheDocument();

  handleAddSiteRep.mockResolvedValue({ status: 1, message: "Site representative added.", data: { id: 32, email_sent: true } });
  fireEvent.click(within(reps).getByRole("button", { name: "Add site rep" }));
  fireEvent.change(within(reps).getByRole("textbox", { name: "Name" }), { target: { value: "Meera" } });
  fireEvent.change(within(reps).getByRole("textbox", { name: "Email" }), { target: { value: "meera@example.com" } });
  fireEvent.change(within(reps).getByRole("textbox", { name: "Phone" }), { target: { value: "9812345678" } });
  const send = within(reps).getByRole("button", { name: "Send link" });
  // A multi-hotel PO needs the hotel the person receives at.
  expect(send).toBeDisabled();
  fireEvent.change(within(reps).getByRole("combobox", { name: "Hotel" }), { target: { value: "1" } });
  fireEvent.click(send);
  await waitFor(() => expect(handleAddSiteRep).toHaveBeenCalledWith({
    po_id: 52, hotel_id: 1, name: "Meera", email: "meera@example.com", phone: "9812345678",
  }));

  revokeSiteRep.mockResolvedValue({ revoked: 1 });
  fireEvent.click(within(reps).getByRole("button", { name: "Revoke Ravi's link" }));
  fireEvent.click(await screen.findByRole("button", { name: "Revoke link" }));
  await waitFor(() => expect(revokeSiteRep).toHaveBeenCalledWith(52, 31));
});

test("phone layer restacks the delivery grid as cards", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "deliveries.module.scss"), "utf8");
  const layer = css.slice(css.indexOf("Phone layer"));
  expect(css.indexOf("Phone layer")).toBeGreaterThan(-1);
  expect(layer).toMatch(/@media \(max-width: 768px\)/);
  expect(layer).toMatch(/\.grid\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
  expect(layer).toMatch(/content:\s*attr\(data-label\)/);
});
