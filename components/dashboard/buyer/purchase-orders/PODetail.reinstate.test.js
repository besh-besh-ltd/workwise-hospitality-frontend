jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: { id: "29" }, asPath: "/x", pathname: "/x", push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 408, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({ __esModule: true, default: () => <div>access denied</div> }));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPODetailFull: jest.fn(),
  handlePOApproval: jest.fn(),
  handlePOInitialization: jest.fn(),
  getPoReinstateState: jest.fn(),
  reinstatePo: jest.fn(),
}));
jest.mock("@/services/pricing", () => ({ __esModule: true, previewTotals: jest.fn() }));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPODetailFull, getPoReinstateState } from "@/services/po";
import { previewTotals } from "@/services/pricing";
import PODetail from "./PODetail";

const po = (status) => ({
  id: 29,
  po_number: "108194",
  status,
  status_label: status,
  vendor: { name: "NovaTech" },
  rfq: { number: "1", id: 2 },
  items: [{ name: "KEYBOARD", quantity: 1, unit_price: 10, gst: 0, unit: "nos" }],
  workflow: [],
  docs: [],
  comparison: [],
  payment_terms: [],
  tech_eval: [],
  key_dates: [],
  activity: [],
  decision_checks: [],
  pricing: { total: 10 },
  total_value: 10,
});

const mount = async (status) => {
  getPODetailFull.mockResolvedValue(po(status));
  previewTotals.mockResolvedValue({ lines: [{ base: 10, base_tax: 0, charges_total: 0, charges: [] }], global_charges: [], global_charges_total: 0 });
  render(<PODetail id="29" />);
  await screen.findByText("Items & pricing");
};

beforeEach(() => {
  jest.clearAllMocks();
  getPoReinstateState.mockResolvedValue({
    status: 1,
    data: { permitted: true, available: true, blockers: [], rejection: { reason: "Oops", rejected_at: "2026-10-22T10:30:00.000Z", vendor_name: "NovaTech" } },
  });
});

test("PODetail mounts the panel for rejected_by_vendor", async () => {
  await mount("rejected_by_vendor");
  expect(await screen.findByRole("button", { name: "Send back to vendor" })).toBeInTheDocument();
});

test("PODetail does not mount the panel for other statuses", async () => {
  await mount("rejected");
  expect(getPoReinstateState).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Send back to vendor" })).not.toBeInTheDocument();
});
