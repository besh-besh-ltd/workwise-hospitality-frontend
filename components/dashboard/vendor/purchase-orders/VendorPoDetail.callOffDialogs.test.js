// Call-off POs have no RFQ. Where an RFQ PO names "RFQ #n — title", a call-off
// PO must name the rate contract (ARC number + title): in the hero and in the
// Accept / Reject confirmations.

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
jest.mock("@/components/dashboard/vendor/order-book/RaiseInvoiceModal", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import VendorPoDetail from "./VendorPoDetail";

const po = (over = {}) => ({
  id: 52,
  po_number: "138900",
  status: "acceptance_pending",
  status_label: "Awaiting you",
  total_value: 1000,
  pricing: { total: 1000 },
  is_call_off: true,
  call_off: {},
  arc_number: "77",
  arc_title: "Linen <rate> contract",
  mr_number: "MR-5",
  rfq: { company: "Kamat Hotels" },
  items: [{ name: "Bath towel", quantity: 10, unit_price: 100, gst: 0, unit: "pcs" }],
  docs: [],
  payment_terms: [],
  key_dates: [],
  activity: [],
  global_charges: [],
  ...over,
});
const mount = (over) =>
  render(<VendorPoDetail data={po(over)} loading={false} error={null} onRefresh={jest.fn()} />);
const hero = () => within(screen.getByRole("heading", { level: 1 }).closest("section"));

test("hero names the ARC with its title for a call-off", () => {
  mount();
  expect(screen.getByRole("heading", { level: 1 }).closest("section")).toHaveTextContent(
    "ARC 77 — Linen <rate> contract",
  );
});

test("Accept and Reject dialogs name the ARC, escaped", () => {
  mount();
  fireEvent.click(hero().getByRole("button", { name: /accept po/i }));
  expect(screen.getByRole("dialog").textContent).toContain("for ARC 77 — Linen <rate> contract");
  expect(screen.getByRole("dialog").querySelector("rate")).toBeNull();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /cancel/i }));
  fireEvent.click(hero().getByRole("button", { name: /reject/i }));
  expect(screen.getByRole("dialog").textContent).toContain("for ARC 77 — Linen <rate> contract");
});

test("falls back to call_off.arc_* when the top-level fields are absent", () => {
  mount({ arc_number: undefined, arc_title: undefined, call_off: { arc_number: "9", arc_title: "Old shape" } });
  fireEvent.click(hero().getByRole("button", { name: /accept po/i }));
  expect(screen.getByRole("dialog").textContent).toContain("for ARC 9 — Old shape");
});

test("no ARC data: the dialog names nothing and prints no 'undefined'", () => {
  mount({ arc_number: undefined, arc_title: undefined, call_off: {} });
  fireEvent.click(hero().getByRole("button", { name: /accept po/i }));
  expect(screen.getByRole("dialog").textContent).not.toMatch(/undefined| for /);
});

test("a number that already starts with ARC is not prefixed twice", () => {
  mount({ arc_number: "ARC-12", arc_title: "Towels" });
  fireEvent.click(hero().getByRole("button", { name: /accept po/i }));
  expect(screen.getByRole("dialog").textContent).toContain("for ARC-12 — Towels");
});
