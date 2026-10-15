// Task 20 / D4: the vendor's call-off PO detail prints the GST split the backend computes
// (pricing.tax_breakdown) — CGST + SGST within a state, IGST across states — instead of
// one GST line. Without a breakdown (RFQ POs) the single GST line stays.
// E2E reference: PO 4, UP supplier -> Mumbai hotel: ₹54,000 + IGST 18% ₹9,720 = ₹63,720.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: { poId: "4" }, push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
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
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import VendorPoDetail from "./VendorPoDetail";
import { gstSplitRows } from "@/components/dashboard/shared/gstSplit";

const poWith = (pricing) => ({
  id: 4,
  po_number: "CO-4",
  status: "approved",
  status_label: "Accepted",
  total_value: 63720,
  pricing,
  is_call_off: true,
  call_off: { arc_id: 12, arc_contract_id: 345, arc_number: "ARC-12" },
  rfq: { company: "Westwind" },
  items: [{ name: "Split AC", quantity: 2, unit_price: 27000, gst: 18, unit: "nos" }],
  docs: [],
  payment_terms: [],
  key_dates: [],
  activity: [],
  global_charges: [],
});

const footLabels = () =>
  Array.from(document.querySelectorAll("tfoot tr")).map((tr) => [tr.cells[0].textContent.trim(), tr.cells[tr.cells.length - 1].textContent.replace(/\s/g, "")]);

test("IGST across states", () => {
  render(<VendorPoDetail data={poWith({ subtotal: 54000, tax: 9720, total: 63720, tax_breakdown: [{ label: "IGST", rate: 18, amount: 9720 }] })} loading={false} error={null} onRefresh={jest.fn()} />);
  const rows = footLabels();
  expect(rows.map((r) => r[0])).toEqual(["Subtotal", "IGST 18%", "Grand total"]);
  expect(rows[1][1]).toMatch(/9,720/);
  expect(rows[2][1]).toMatch(/63,720/);
});

test("CGST + SGST within a state", () => {
  render(<VendorPoDetail data={poWith({ subtotal: 168000, tax: 30240, total: 198240, tax_breakdown: [{ label: "CGST", rate: 9, amount: 15120 }, { label: "SGST", rate: 9, amount: 15120 }] })} loading={false} error={null} onRefresh={jest.fn()} />);
  expect(footLabels().map((r) => r[0])).toEqual(["Subtotal", "CGST 9%", "SGST 9%", "Grand total"]);
});

test("no breakdown, or only the legacy single GST row: the single GST line stays", () => {
  const { unmount } = render(<VendorPoDetail data={poWith({ subtotal: 54000, tax: 9720, total: 63720 })} loading={false} error={null} onRefresh={jest.fn()} />);
  expect(footLabels().map((r) => r[0])).toEqual(["Subtotal", "GST", "Grand total"]);
  unmount();
  render(<VendorPoDetail data={poWith({ subtotal: 54000, tax: 9720, total: 63720, tax_breakdown: [{ label: "GST", rate: 18, amount: 9720 }] })} loading={false} error={null} onRefresh={jest.fn()} />);
  expect(footLabels().map((r) => r[0])).toEqual(["Subtotal", "GST", "Grand total"]);
});

test("gstSplitRows formats fractional and missing rates", () => {
  expect(gstSplitRows({ tax_breakdown: [{ label: "CGST", rate: 2.5, amount: 5 }, { label: "UTGST", rate: null, amount: 5 }] }).map((r) => r.label)).toEqual(["CGST 2.5%", "UTGST"]);
  expect(gstSplitRows({})).toBeNull();
});
