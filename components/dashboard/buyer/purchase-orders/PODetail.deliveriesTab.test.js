// PODetail tabs: the page body as it always was is the default "Details" tab;
// ?tab=deliveries swaps the body for the Deliveries tab and keeps the hero.
// The Deliveries tab itself is covered in deliveries/__tests__.

let mockQuery = { id: "29" };
const mockReplace = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: mockQuery,
    asPath: "/dashboard/buyer/purchase-orders/29",
    pathname: "/dashboard/buyer/purchase-orders/[id]",
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
  }),
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
  handlePOApproval: jest.fn(() => Promise.resolve({})),
  handlePOInitialization: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/poSendBack", () => ({
  __esModule: true,
  getSendBacks: jest.fn(() => Promise.resolve([])),
  getSendBackTargets: jest.fn(() => Promise.resolve({ targets: [] })),
  createSendBack: jest.fn(() => Promise.resolve({})),
  respondToSendBack: jest.fn(() => Promise.resolve({})),
  withdrawSendBack: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/pricing", () => ({ __esModule: true, previewTotals: jest.fn(() => Promise.resolve(null)) }));
jest.mock("./deliveries/DeliveriesTab", () => ({
  __esModule: true,
  default: ({ poId }) => <div>Deliveries tab for PO {poId}</div>,
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPODetailFull } from "@/services/po";
import PODetail from "./PODetail";

const po = (over = {}) => ({
  id: 29,
  po_number: "108194",
  status: "approved",
  status_label: "Approved",
  awaiting_me: false,
  total_value: 29000,
  pricing: { total: 29000 },
  vendor: { name: "NovaTech Hospitality Solutions" },
  rfq: { number: "535789", id: 235 },
  items: [{ name: "KEYBOARD", quantity: 58, unit_price: 500, gst: 0, unit: "nos" }],
  workflow: [],
  docs: [],
  comparison: [],
  payment_terms: [],
  tech_eval: [],
  key_dates: [],
  activity: [],
  decision_checks: [],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = { id: "29" };
});

test("the existing body is the default Details tab", async () => {
  getPODetailFull.mockResolvedValue(po());
  render(<PODetail id="29" />);
  expect(await screen.findByText("Items & pricing")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Deliveries" })).toHaveAttribute("aria-selected", "false");
  expect(screen.queryByText(/Deliveries tab for PO/)).not.toBeInTheDocument();
});

test("?tab=deliveries shows the Deliveries tab under the same hero", async () => {
  mockQuery = { id: "29", tab: "deliveries" };
  getPODetailFull.mockResolvedValue(po());
  render(<PODetail id="29" />);
  expect(await screen.findByText("Deliveries tab for PO 29")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Deliveries" })).toHaveAttribute("aria-selected", "true");
  expect(screen.queryByText("Items & pricing")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("#108194");
});

test("choosing a tab writes ?tab without a navigation", async () => {
  getPODetailFull.mockResolvedValue(po());
  render(<PODetail id="29" />);
  await screen.findByText("Items & pricing");
  fireEvent.click(screen.getByRole("tab", { name: "Deliveries" }));
  expect(mockReplace).toHaveBeenCalledWith(
    { pathname: "/dashboard/buyer/purchase-orders/[id]", query: { id: "29", tab: "deliveries" } },
    undefined,
    { shallow: true }
  );
});

test("tabs are a tablist with a labelled panel and arrow-key navigation", async () => {
  getPODetailFull.mockResolvedValue(po());
  render(<PODetail id="29" />);
  await screen.findByText("Items & pricing");

  const details = screen.getByRole("tab", { name: "Details" });
  const deliveries = screen.getByRole("tab", { name: "Deliveries" });
  expect(screen.getByRole("tablist", { name: "Purchase order sections" })).toBeInTheDocument();
  const panel = screen.getByRole("tabpanel");
  expect(panel).toHaveAttribute("aria-labelledby", details.id);
  expect(details).toHaveAttribute("aria-controls", panel.id);
  expect(deliveries).toHaveAttribute("aria-controls", panel.id);
  // Roving focus: only the selected tab is in the tab order.
  expect(details).toHaveAttribute("tabindex", "0");
  expect(deliveries).toHaveAttribute("tabindex", "-1");
  // The Details body sits inside the panel.
  expect(panel).toContainElement(screen.getByText("Items & pricing"));

  fireEvent.keyDown(details, { key: "ArrowRight" });
  expect(mockReplace).toHaveBeenLastCalledWith(
    { pathname: "/dashboard/buyer/purchase-orders/[id]", query: { id: "29", tab: "deliveries" } }, undefined, { shallow: true }
  );
  expect(deliveries).toHaveFocus();

  fireEvent.keyDown(details, { key: "End" });
  expect(mockReplace).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(details, { key: "ArrowLeft" }); // wraps to the last tab
  expect(mockReplace).toHaveBeenLastCalledWith(
    { pathname: "/dashboard/buyer/purchase-orders/[id]", query: { id: "29", tab: "deliveries" } }, undefined, { shallow: true }
  );
});

test("a draft PO has no Deliveries tab", async () => {
  mockQuery = { id: "29", tab: "deliveries" };
  getPODetailFull.mockResolvedValue(po({ status: "draft", status_label: "Draft" }));
  render(<PODetail id="29" />);
  expect(await screen.findByText("Items & pricing")).toBeInTheDocument();
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
});
