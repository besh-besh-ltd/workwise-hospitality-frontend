// A released (call-off) PO links back to the rate contract it was issued
// against. The vendor contract page is /dashboard/vendor/rate-contracts/[contractId]
// and is keyed by the CONTRACT id; the link used the ARC id, which opened the
// wrong contract or "Contract not found" (Vendor Networks spec §7.2).

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
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import VendorPoDetail from "./VendorPoDetail";

const callOffPo = (callOff) => ({
  id: 52,
  po_number: "138900",
  status: "approved",
  status_label: "Accepted",
  total_value: 1000,
  pricing: { total: 1000 },
  is_call_off: true,
  call_off: callOff,
  rfq: { company: "Kamat Hotels" },
  items: [{ name: "Bath towel", quantity: 10, unit_price: 100, gst: 0, unit: "pcs" }],
  docs: [],
  payment_terms: [],
  key_dates: [],
  activity: [],
  global_charges: [],
});

const mount = (callOff) =>
  render(<VendorPoDetail data={callOffPo(callOff)} loading={false} error={null} onRefresh={jest.fn()} />);

test("'Open rate contract' goes to the contract id, not the ARC id", () => {
  mount({ arc_id: 12, arc_contract_id: 345, arc_number: "ARC-12" });
  expect(screen.getByRole("link", { name: /open rate contract/i })).toHaveAttribute(
    "href",
    "/dashboard/vendor/rate-contracts/345"
  );
});

test("no contract id, no link", () => {
  mount({ arc_id: 12, arc_contract_id: null, arc_number: "ARC-12" });
  expect(screen.queryByRole("link", { name: /open rate contract/i })).toBeNull();
});
