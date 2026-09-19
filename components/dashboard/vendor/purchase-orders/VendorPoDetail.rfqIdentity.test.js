// What the vendor is looking at when they accept a purchase order.
//
// The hero named the RFQ by number only; the "RFQ source" card that carries
// both number and title sits below the items table, i.e. below the fold at
// the moment of decision; and the accept/reject confirmations named neither.
// A vendor quoting on several RFQs for the same buyer had nothing on screen
// to tell them WHICH tender this order settles. Client feedback item 13.
//
// The data was already there: getPODetailFull selects rfq.rfq_no and
// rfq.title and shapes them into po.rfq.{number,title}, and the vendor
// endpoint uses the same function. This is frontend-only.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: { poId: "52" }, push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
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
  vendorAcceptPO: jest.fn(() => Promise.resolve({})),
  vendorRejectPO: jest.fn(() => Promise.resolve({})),
  getVendorPoDetail: jest.fn(),
  downloadPoPdf: jest.fn(),
}));
jest.mock("@/components/dashboard/vendor/order-book/RaiseInvoiceModal", () => ({
  __esModule: true,
  default: () => null,
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import VendorPoDetail from "./VendorPoDetail";

const RFQ_NO = "536631";
const RFQ_TITLE = "ORCHID PASSAROS GOA - 5 WATT LED PANEL LIGHT";

const data = (over = {}) => ({
  id: 52,
  po_number: "138859",
  // 'acceptance_pending' is the state in which the vendor is asked to decide;
  // production carries 28 POs sitting here.
  status: "acceptance_pending",
  status_label: "Awaiting you",
  total_value: 4435.75,
  pricing: { total: 4435.75 },
  rfq: { id: 2386, number: RFQ_NO, title: RFQ_TITLE, company: "Kamat Hotels" },
  items: [{ name: "LED PANEL", quantity: 1, unit_price: 4435.75, gst: 0, unit: "nos" }],
  docs: [],
  payment_terms: [],
  key_dates: [],
  activity: [],
  global_charges: [],
  ...over,
});

const mount = (over = {}) =>
  render(<VendorPoDetail data={data(over)} loading={false} error={null} onRefresh={jest.fn()} />);

// Scope to the dialog. `document.body.textContent` would also pick up the
// "RFQ source" card further down the page — the very thing that is below the
// fold at decision time — and every assertion here would pass vacuously.
const dialogText = () => screen.getByRole("dialog").textContent;

describe("vendor PO detail — naming the RFQ at the point of decision", () => {
  it("names the RFQ by number AND title in the hero", () => {
    mount();
    const hero = screen.getByRole("heading", { level: 1 }).parentElement;
    expect(hero).toHaveTextContent(new RegExp(`RFQ #${RFQ_NO}`));
    expect(hero).toHaveTextContent(/5 WATT LED PANEL LIGHT/);
  });

  it("names the RFQ in the accept confirmation", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /^accept/i }));

    const text = dialogText();
    expect(text).toMatch(new RegExp(`RFQ #${RFQ_NO}`));
    expect(text).toMatch(/5 WATT LED PANEL LIGHT/);
    // the PO number must still be there — it is what the vendor quotes back
    expect(text).toMatch(/138859/);
  });

  it("names the RFQ in the reject confirmation", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /^reject/i }));

    const text = dialogText();
    expect(text).toMatch(new RegExp(`RFQ #${RFQ_NO}`));
    expect(text).toMatch(/5 WATT LED PANEL LIGHT/);
  });

  it("survives a blank title, which is the common case in production", () => {
    // tbl_rfq.title is nullable and empty in practice — stage row id=2386,
    // rfq_no=536631 has an empty title. Every interpolation must tolerate it
    // without printing a stray dash or the word "undefined".
    mount({ rfq: { id: 2386, number: RFQ_NO, title: "", company: "Kamat Hotels" } });

    const hero = screen.getByRole("heading", { level: 1 }).parentElement;
    expect(hero).toHaveTextContent(new RegExp(`RFQ #${RFQ_NO}`));
    expect(hero).not.toHaveTextContent(/undefined|null/);
    expect(hero.textContent).not.toMatch(new RegExp(`RFQ #${RFQ_NO}\\s*[—-]\\s*(·|$)`));

    fireEvent.click(screen.getByRole("button", { name: /^accept/i }));
    expect(dialogText()).not.toMatch(/undefined|null/);
  });

  it("does not invent an RFQ line for a call-off PO, which has a contract instead", () => {
    mount({
      is_call_off: true,
      call_off: { arc_number: "ARC-2026-27-0001", arc_title: "Annual linen supply" },
      rfq: {},
    });

    const hero = screen.getByRole("heading", { level: 1 }).parentElement;
    expect(hero).not.toHaveTextContent(/RFQ #/);
    expect(hero).toHaveTextContent(/Released PO/);
  });
});
