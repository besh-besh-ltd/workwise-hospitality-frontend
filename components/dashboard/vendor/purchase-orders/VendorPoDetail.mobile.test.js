// Vendor PO detail on a phone. A quarter of active vendors log in from phones,
// and 29 POs (₹2.1 Cr) were sitting in acceptance_pending. At 390px the hero
// clipped "Accept PO" off the right edge and the 7-column items table clipped
// the Amount column. The phone now gets a sticky MobileActionBar carrying the
// vendor's next step — Reject / Accept for a new order, then Mark dispatched,
// then Raise invoice — each still behind its existing confirmation.
//
// jsdom can't apply media queries, so the bar is always in the DOM here; its
// phone-only visibility is MobileActionBar's own CSS contract.

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
jest.mock("@/services/po", () => ({
  __esModule: true,
  handleAcceptPO: jest.fn(() => Promise.resolve({})),
  handleRejectPO: jest.fn(() => Promise.resolve({})),
  handleRaiseInvoice: jest.fn(() => Promise.resolve({})),
  handleMarkDispatched: jest.fn(() => Promise.resolve({})),
  getVendorPoPdf: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/components/dashboard/vendor/order-book/RaiseInvoiceModal", () => ({
  __esModule: true,
  default: ({ show }) => (show ? <div>raise invoice modal</div> : null),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { handleAcceptPO, handleRejectPO, handleMarkDispatched } from "@/services/po";
import VendorPoDetail from "./VendorPoDetail";

// PO #138898 as the vendor (uid 926) sees it: ₹65,35,100, awaiting acceptance.
const data = (over = {}) => ({
  id: 626,
  po_number: "138898",
  status: "acceptance_pending",
  status_label: "Awaiting you",
  total_value: 6535100,
  pricing: { total: 6535100, subtotal: 5594600, tax: 940500 },
  rfq: { id: 900, number: "536563", title: "LOTUS RESORT KONARK_FURNITURE", company: "Kamat Hotels India Limited" },
  items: [
    { name: "POUFFE", hsn: "9401", quantity: 38, unit: "Nos", unit_price: 4700, gst: 18, amount: 210748 },
  ],
  docs: [],
  payment_terms: [],
  workflow: [],
  key_dates: [],
  activity: [],
  ...over,
});

const onRefresh = jest.fn(() => Promise.resolve());
const mount = (over = {}) =>
  render(<VendorPoDetail data={data(over)} loading={false} error={null} onRefresh={onRefresh} />);

// Portalled from an effect — find, don't get.
const bar = () => screen.findByRole("region", { name: "Purchase order actions" });

beforeEach(() => jest.clearAllMocks());
afterEach(() => document.body.classList.remove("has-mobile-action-bar"));

describe("vendor phone action bar — a new order", () => {
  it("offers Reject and Accept PO with the order total", async () => {
    const { container } = mount();
    const region = await bar();
    expect(container).not.toContainElement(region);
    expect(within(region).getByText("₹65,35,100.00")).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: /Reject/ })).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: /Accept PO/ })).toBeInTheDocument();
  });

  it("Accept PO opens the confirmation and accepts only on confirm", async () => {
    mount();
    fireEvent.click(within(await bar()).getByRole("button", { name: /Accept PO/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Accept Purchase Order");
    expect(handleAcceptPO).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Yes, Accept PO" }));
    await waitFor(() => expect(handleAcceptPO).toHaveBeenCalledWith(626));
  });

  it("Reject opens the reason modal and will not reject without a reason", async () => {
    mount();
    fireEvent.click(within(await bar()).getByRole("button", { name: /Reject/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Reject Purchase Order");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject PO" }));
    expect(await within(dialog).findByText(/provide a reason/i)).toBeInTheDocument();
    expect(handleRejectPO).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByPlaceholderText(/reason for rejecting/i), {
      target: { value: "Cannot meet the delivery date" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject PO" }));
    await waitFor(() => expect(handleRejectPO).toHaveBeenCalledWith(626, "Cannot meet the delivery date"));
  });

  it("marks the hero's own Reject / Accept for hiding on phones, but not Download PO", () => {
    mount();
    const hero = within(screen.getByRole("heading", { level: 1 }).closest("section"));
    expect(hero.getByRole("button", { name: /^Reject/ }).className).toContain("heroDecisionBtn");
    expect(hero.getByRole("button", { name: /^Accept PO/ }).className).toContain("heroDecisionBtn");
    expect(hero.getByRole("button", { name: /Download PO/ }).className).not.toContain("heroDecisionBtn");
  });
});

describe("vendor phone action bar — fulfilment", () => {
  it("offers Mark dispatched once the order is accepted, behind its confirmation", async () => {
    mount({ status: "approved" });
    const region = await bar();
    expect(within(region).queryByRole("button", { name: /Accept PO/ })).not.toBeInTheDocument();
    fireEvent.click(within(region).getByRole("button", { name: /Mark dispatched/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Mark Dispatched");
    expect(handleMarkDispatched).not.toHaveBeenCalled();
  });

  it("offers Raise invoice once dispatched", async () => {
    mount({ status: "dispatched" });
    fireEvent.click(within(await bar()).getByRole("button", { name: /Raise invoice/ }));
    expect(await screen.findByText("raise invoice modal")).toBeInTheDocument();
  });

  it("shows no bar when there is nothing for the vendor to do", async () => {
    mount({ status: "completed" });
    await screen.findByText("Items & pricing");
    expect(screen.queryByRole("region", { name: "Purchase order actions" })).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass("has-mobile-action-bar");
  });
});

describe("items restack as cards on phones", () => {
  it("labels every value cell, HSN included", () => {
    mount();
    const row = screen.getByText("POUFFE").closest("tr");
    const labels = Array.from(row.querySelectorAll("td[data-label]")).map((td) => td.getAttribute("data-label"));
    expect(labels).toEqual(["HSN", "Qty", "Unit price", "GST", "Amount"]);
  });
});
