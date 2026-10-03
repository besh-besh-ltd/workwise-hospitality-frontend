// PODetail — one permissions/bulk per page view, scoped to the PO's hotel.
//
// The page resolves `awarding` grants against the PO's own hotel (see
// PODetail.permissions.test.js for why). Before the PO arrived it fell back to
// the viewer's hospitality_mappings, so every page view sent TWO
// permissions/bulk requests: one for the viewer's hotels (thrown away) and one
// for the PO's hotel. It now waits for the PO (or for its fetch to fail, which
// is when the viewer fallback is genuinely needed). The real hook runs here;
// only the wire (services/rbac) is mocked.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: { id: "52" }, asPath: "/dashboard/buyer/purchase-orders/52", pathname: "/dashboard/buyer/purchase-orders/[id]", push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a> }));
// One stable store object, as redux gives — a fresh object per render would
// re-key the hook and add calls the real app never makes.
const mockStore = { userProfile: { id: 407, hospitality_mappings: [{ hospitality_hotel_id: 12 }, { hospitality_hotel_id: 14 }] } };
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn(mockStore),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.mock("@/components/shared/AccessDeniedPage", () => ({ __esModule: true, default: () => <div>access denied</div> }));
jest.mock("@/services/rbac", () => ({ __esModule: true, getBulkPermissions: jest.fn() }));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPODetailFull: jest.fn(),
  handlePOApproval: jest.fn(),
  handlePOInitialization: jest.fn(),
  getPOInitiators: jest.fn(() => new Promise(() => {})),
}));
jest.mock("@/services/pricing", () => ({ __esModule: true, previewTotals: jest.fn() }));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getBulkPermissions } from "@/services/rbac";
import { getPODetailFull } from "@/services/po";
import { previewTotals } from "@/services/pricing";
import PODetail from "./PODetail";

const PO = {
  id: 52, po_number: "108213", status: "draft", status_label: "Draft", hotel_id: 30, department_id: 2,
  total_value: 4435.75, pricing: { total: 4435.75 }, vendor: { name: "NovaTech" }, rfq: { number: "535789", id: 346 },
  items: [{ name: "KEYBOARD", quantity: 1, unit_price: 4435.75, gst: 0, unit: "nos" }],
  workflow: [], docs: [], comparison: [], payment_terms: [], tech_eval: [], key_dates: [], activity: [], decision_checks: [], global_charges: [],
};
const grants = (actions) => ({ data: { permissions: { awarding: { actions, scope: null } } } });

beforeEach(() => {
  jest.clearAllMocks();
  getBulkPermissions.mockResolvedValue(grants(["read", "create"]));
  previewTotals.mockResolvedValue({ lines: [{ base: 4435.75, base_tax: 0, charges_total: 0, charges: [] }], global_charges: [], global_charges_total: 0 });
});

it("asks permissions/bulk once, for the PO's hotel", async () => {
  getPODetailFull.mockResolvedValue(PO);
  render(<PODetail id="52" />);
  await screen.findByText("Items & pricing");
  expect(getBulkPermissions).toHaveBeenCalledTimes(1);
  expect(getBulkPermissions).toHaveBeenCalledWith("awarding", [30], 2);
});

it("asks while the pricing preview is still loading (not after it)", async () => {
  getPODetailFull.mockResolvedValue(PO);
  previewTotals.mockReturnValue(new Promise(() => {}));
  render(<PODetail id="52" />);
  await waitFor(() => expect(getBulkPermissions).toHaveBeenCalledWith("awarding", [30], 2));
});

it("falls back to the viewer's hotels only when the PO could not be loaded", async () => {
  getPODetailFull.mockRejectedValue(new Error("404"));
  getBulkPermissions.mockResolvedValue(grants([]));
  render(<PODetail id="52" />);
  expect(await screen.findByText("access denied")).toBeInTheDocument();
  expect(getBulkPermissions).toHaveBeenCalledTimes(1);
  expect(getBulkPermissions).toHaveBeenCalledWith("awarding", [12, 14], null);
});
