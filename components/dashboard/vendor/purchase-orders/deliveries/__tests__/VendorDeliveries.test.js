// The vendor's Deliveries section (inventory spec §5.2, task C4): the
// buyer's delivery plan as a read-only grid with no prices, the vendor's own
// dispatch notes and the invoices raised against each, and what the hotel did
// with the goods: receipts with rejections and their reasons, returns and
// short-closes. Prices stay in "Items & pricing" (the PO's own agreed rates,
// which the vendor already sees); the plan never carries a rupee figure.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: { poId: "626" }, push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
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
  getVendorPoDeliveries: jest.fn(),
  createDispatch: jest.fn(),
  cancelDispatch: jest.fn(),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  handleAcceptPO: jest.fn(() => Promise.resolve({})),
  handleRejectPO: jest.fn(() => Promise.resolve({})),
  handleRaiseInvoice: jest.fn(() => Promise.resolve({})),
  handleMarkDispatched: jest.fn(() => Promise.resolve({})),
  getVendorPoPdf: jest.fn(() => Promise.resolve({})),
  getVendorRejectionUndo: jest.fn(() => Promise.resolve({ status: 1, data: { available: false, deadline: null, blockers: [] } })),
  withdrawVendorRejection: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  handleUploadFile: jest.fn(),
}));

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getVendorPoDeliveries, cancelDispatch } from "@/services/inventory";
import VendorDeliveries from "../VendorDeliveries";
import VendorPoDetail from "../../VendorPoDetail";
import { vendorDeliveries } from "../__fixtures__/vendorDeliveries.fixture";

const PRICE_WORDS = /₹|price|\brate\b|amount|value|cost/i;

const mount = (props = {}) => {
  const handlers = { onDispatch: jest.fn(), onInvoice: jest.fn(), onChanged: jest.fn(), onRetry: jest.fn() };
  render(
    <VendorDeliveries
      poId={626}
      data={vendorDeliveries()}
      loading={false}
      error=""
      canDispatch
      canInvoice
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

const cellsOf = (row) => Array.from(row.querySelectorAll("td")).map((td) => td.textContent.trim());

beforeEach(() => jest.clearAllMocks());

describe("VendorDeliveries", () => {
  it("vendor sees plan without prices", () => {
    mount();
    const plan = screen.getByRole("region", { name: "Delivery plan" });

    const konark1 = within(plan).getByRole("table", { name: /Lotus Konark · Phase 1/ });
    expect(within(konark1).getAllByRole("columnheader").map((th) => th.textContent.trim())).toEqual([
      "Item", "Planned", "Accepted", "Rejected", "Returned", "Short-closed", "Open",
    ]);
    const pouffe = within(konark1).getByText("POUFFE").closest("tr");
    expect(cellsOf(pouffe).slice(1)).toEqual(["20", "12", "2", "1", "0", "9"]);

    // Every phase of every hotel, and the share not yet split by hotel.
    expect(within(plan).getByRole("table", { name: /Lotus Konark · Phase 2/ })).toBeInTheDocument();
    expect(within(plan).getByRole("table", { name: /Lotus Puri · Phase 1/ })).toBeInTheDocument();
    const unsplit = within(plan).getByRole("table", { name: /Not yet split by hotel · Phase 1/ });
    expect(cellsOf(within(unsplit).getByText("SIDE TABLE").closest("tr")).slice(1)).toEqual(["2.5", "0", "0", "0", "0", "2.5"]);
    expect(within(plan).getByText("Overdue")).toBeInTheDocument();

    // No rupee figure, rate or value column — even a price field planted in
    // the payload is never printed.
    expect(plan).not.toHaveTextContent(PRICE_WORDS);
    expect(plan).not.toHaveTextContent(/4,?700/);
  });

  it("lists what the hotel received and rejected (with reasons), returns, short-closes and invoices", () => {
    mount();

    const receipts = screen.getByRole("region", { name: "Received at the hotel" });
    expect(receipts).toHaveTextContent("GRN/46/2026-27/00012");
    const grnRow = within(receipts).getByText("POUFFE").closest("tr");
    expect(cellsOf(grnRow).slice(1)).toEqual(["12", "2", "Damaged"]);

    const returns = screen.getByRole("region", { name: "Returned to you" });
    expect(returns).toHaveTextContent("RTV/46/2026-27/00002");
    expect(returns).toHaveTextContent("For replacement");
    expect(returns).toHaveTextContent("Torn fabric");

    const closed = screen.getByRole("region", { name: "Short-closed" });
    expect(closed).toHaveTextContent("SIDE TABLE");
    expect(closed).toHaveTextContent("No longer needed");
    expect(closed).toHaveTextContent("Wing closed for renovation");

    // Each dispatch note carries the invoices raised against it.
    const notes = screen.getByRole("region", { name: "Dispatch notes" });
    const received = within(notes).getByText("DSP/46/2026-27/00003").closest("li");
    expect(received).toHaveTextContent("Received");
    expect(received).toHaveTextContent("CH-118");
    expect(received).toHaveTextContent("INV-2026-118");
    expect(received).toHaveTextContent("₹70,500.00");
    const onRoad = within(notes).getByText("DSP/47/2026-27/00004").closest("li");
    expect(onRoad).toHaveTextContent("In transit");
    expect(onRoad).not.toHaveTextContent("INV-");

    // An invoice not tied to a dispatch (the old file-only kind) still shows.
    const other = screen.getByRole("region", { name: "Other invoices" });
    expect(other).toHaveTextContent("Invoice without a number");
  });

  it("dispatches against a phase that still needs goods, and not a closed one", () => {
    const { onDispatch } = mount({
      data: vendorDeliveries({
        deliveries: vendorDeliveries().deliveries.map((d) => (d.id === 901 ? { ...d, status: "received" } : d)),
      }),
    });
    const plan = screen.getByRole("region", { name: "Delivery plan" });
    expect(within(plan).queryByRole("button", { name: "Dispatch Lotus Konark · Phase 1" })).not.toBeInTheDocument();
    fireEvent.click(within(plan).getByRole("button", { name: "Dispatch Lotus Konark · Phase 2" }));
    expect(onDispatch).toHaveBeenCalledWith({ hotelId: 46, deliveryId: 902 });
  });

  it("offers no dispatch or invoice actions when the PO does not allow them", () => {
    mount({ canDispatch: false, canInvoice: false });
    expect(screen.queryByRole("button", { name: /^Dispatch / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Upload invoice/ })).not.toBeInTheDocument();
  });

  it("uploads an invoice against one dispatch note", () => {
    const { onInvoice } = mount();
    const notes = screen.getByRole("region", { name: "Dispatch notes" });
    const onRoad = within(notes).getByText("DSP/47/2026-27/00004").closest("li");
    fireEvent.click(within(onRoad).getByRole("button", { name: /Upload invoice/ }));
    expect(onInvoice).toHaveBeenCalledWith(72);
  });

  it("withdraws a dispatch still on the road, only after confirming", async () => {
    cancelDispatch.mockResolvedValue({ id: 72, status: "cancelled" });
    const { onChanged } = mount();
    const notes = screen.getByRole("region", { name: "Dispatch notes" });
    const received = within(notes).getByText("DSP/46/2026-27/00003").closest("li");
    expect(within(received).queryByRole("button", { name: /Withdraw/ })).not.toBeInTheDocument();

    const onRoad = within(notes).getByText("DSP/47/2026-27/00004").closest("li");
    fireEvent.click(within(onRoad).getByRole("button", { name: /Withdraw/ }));
    expect(cancelDispatch).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Yes, withdraw it" }));
    await waitFor(() => expect(cancelDispatch).toHaveBeenCalledWith(626, 72));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("labels every quantity cell so the plan restacks as cards on phones", () => {
    mount();
    const plan = screen.getByRole("region", { name: "Delivery plan" });
    const row = within(within(plan).getByRole("table", { name: /Lotus Konark · Phase 1/ })).getByText("POUFFE").closest("tr");
    expect(Array.from(row.querySelectorAll("td[data-label]")).map((td) => td.getAttribute("data-label"))).toEqual([
      "Planned", "Accepted", "Rejected", "Returned", "Short-closed", "Open",
    ]);

    // jsdom has no media queries: pin the phone layer by its text.
    const css = fs.readFileSync(path.join(__dirname, "..", "vendorDeliveries.module.scss"), "utf8");
    const phone = css.slice(css.indexOf("Phone layer"));
    expect(phone).toMatch(/@media \(max-width: 768px\)/);
    expect(phone).toMatch(/\.qtyTable\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
    expect(phone).toMatch(/content:\s*attr\(data-label\)/);
  });

  it("says why when the deliveries could not be loaded, and retries", () => {
    const { onRetry } = mount({ data: null, error: "Purchase order not found" });
    expect(screen.getByText("Purchase order not found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("VendorPoDetail Deliveries", () => {
  const po = (over = {}) => ({
    id: 626,
    po_number: "138898",
    status: "dispatched",
    total_value: 6535100,
    pricing: { total: 6535100, subtotal: 5594600, tax: 940500 },
    rfq: { id: 900, number: "536563", title: "LOTUS RESORT KONARK_FURNITURE", company: "Kamat Hotels India Limited" },
    items: [{ name: "POUFFE", hsn: "9401", quantity: 38, unit: "Nos", unit_price: 4700, gst: 18, amount: 210748 }],
    docs: [], payment_terms: [], workflow: [], key_dates: [], activity: [],
    ...over,
  });

  it("loads the vendor's deliveries and opens a dispatch note from Mark dispatched", async () => {
    getVendorPoDeliveries.mockResolvedValue(vendorDeliveries());
    render(<VendorPoDetail data={po()} loading={false} error={null} onRefresh={jest.fn()} />);

    const plan = await screen.findByRole("region", { name: "Delivery plan" });
    expect(getVendorPoDeliveries).toHaveBeenCalledWith(626);
    expect(plan).not.toHaveTextContent(PRICE_WORDS);

    const hero = within(screen.getByRole("heading", { level: 1 }).closest("section"));
    fireEvent.click(hero.getByRole("button", { name: /Mark dispatched/ }));
    expect(await screen.findByRole("dialog", { name: "Dispatch note" })).toBeInTheDocument();
  });

  it("does not ask for deliveries on an order the vendor rejected", async () => {
    render(<VendorPoDetail data={po({ status: "rejected_by_vendor" })} loading={false} error={null} onRefresh={jest.fn()} />);
    await screen.findByText("Items & pricing");
    expect(getVendorPoDeliveries).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Delivery plan" })).not.toBeInTheDocument();
  });
});
