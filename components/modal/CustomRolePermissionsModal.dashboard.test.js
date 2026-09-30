// Role editor — dashboard widget permissions.
//
// The catalogue returns `dashboard.*` actions such as
// `my_commercial_approvals_pending`, which mean nothing to a client admin. The
// editor must show them as the widget the user will see, grouped by the persona
// the widget is for, with anything it doesn't recognise still visible under
// "Other" — and ticking a widget must save exactly like any other permission.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("@/services/rbac", () => ({
  getAllPermissions: jest.fn(),
  createCustomRole: jest.fn(),
  updateCustomRole: jest.fn(),
  getRoles: jest.fn(),
  getRolePermissions: jest.fn(),
}));

jest.mock("react-modal", () => {
  const Modal = ({ isOpen, children }) => (isOpen ? <div>{children}</div> : null);
  Modal.setAppElement = () => {};
  return { __esModule: true, default: Modal };
});

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getAllPermissions, createCustomRole } from "@/services/rbac";
import CustomRolePermissionsModal from "./CustomRolePermissionsModal";

const CATALOGUE = {
  RFQ: [{ id: 1, action: "read" }],
  dashboard: [
    // Deliberately out of persona order, to prove the editor orders them.
    { id: 61, action: "my_award_approvals_pending" },
    { id: 38, action: "action_center" },
    { id: 45, action: "my_drafts" },
    { id: 59, action: "deals_with_price_anomalies" }, // cut in v1 → "Other"
    { id: 40, action: "negotiation_savings" },
  ],
};

const renderCreate = async () => {
  render(<CustomRolePermissionsModal isOpen onClose={() => {}} initialAction="create" />);
  await waitFor(() => expect(screen.getByText("Dashboard widgets")).toBeInTheDocument());
};

beforeEach(() => {
  getAllPermissions.mockReset().mockResolvedValue({ data: CATALOGUE });
  createCustomRole.mockReset().mockResolvedValue({ status: 1, message: "ok" });
});

test("dashboard widgets are grouped by persona in persona order, with Other last", async () => {
  await renderCreate();
  const groups = screen.getAllByTestId(/^dashboard-persona-/).map((el) => el.dataset.testid);
  expect(groups).toEqual([
    "dashboard-persona-cross_role",
    "dashboard-persona-rfq_creator",
    "dashboard-persona-awarding",
    "dashboard-persona-other",
  ]);
  // Within a persona, catalogue order wins over API order.
  const cross = within(screen.getByTestId("dashboard-persona-cross_role"));
  const names = cross.getAllByText(/Action centre|Negotiation savings/).map((n) => n.textContent);
  expect(names).toEqual(["Action centre", "Negotiation savings"]);
});

test("each widget shows its dashboard title and a plain description", async () => {
  await renderCreate();
  const awarding = within(screen.getByTestId("dashboard-persona-awarding"));
  expect(awarding.getByText("POs awaiting my approval")).toBeInTheDocument();
  expect(awarding.getByText("Purchase orders waiting on this user's approval.")).toBeInTheDocument();
  expect(screen.getByText(/Choose which widgets appear on the buyer dashboard/)).toBeInTheDocument();
});

test("an unknown dashboard code falls back to a readable label under Other", async () => {
  await renderCreate();
  const other = within(screen.getByTestId("dashboard-persona-other"));
  expect(other.getByText("Deals With Price Anomalies")).toBeInTheDocument();
  expect(other.getByText("Key: deals_with_price_anomalies")).toBeInTheDocument();
});

test("non-dashboard resources render exactly as before", async () => {
  await renderCreate();
  expect(screen.getByText("RFQ Creation")).toBeInTheDocument();
  expect(screen.getByText("View")).toBeInTheDocument();
});

test("ticking widgets saves their permission ids like any other permission", async () => {
  await renderCreate();
  fireEvent.change(screen.getByPlaceholderText("e.g. Purchase Reviewer"), { target: { value: "Dash viewer" } });
  fireEvent.change(screen.getByPlaceholderText("Describe responsibilities for this role"), {
    target: { value: "Sees the dashboard" },
  });

  // One widget directly, one persona via its "Select all".
  fireEvent.click(screen.getByLabelText(/POs awaiting my approval/));
  fireEvent.click(within(screen.getByTestId("dashboard-persona-cross_role")).getByText("Select all"));
  fireEvent.click(screen.getByText("Save Role"));

  await waitFor(() => expect(createCustomRole).toHaveBeenCalled());
  const payload = createCustomRole.mock.calls[0][0];
  expect(payload.permission_ids.sort((a, b) => a - b)).toEqual([38, 40, 61]);
});

test("persona Select all toggles to Clear and clears only that persona", async () => {
  await renderCreate();
  const cross = within(screen.getByTestId("dashboard-persona-cross_role"));
  fireEvent.click(screen.getByLabelText(/My drafts/));
  fireEvent.click(cross.getByText("Select all"));
  expect(cross.getByText("2 / 2")).toBeInTheDocument();
  fireEvent.click(cross.getByText("Clear"));
  expect(cross.getByText("0 / 2")).toBeInTheDocument();
  expect(screen.getByLabelText(/My drafts/)).toBeChecked();
});

test("searching by widget title finds the widget", async () => {
  await renderCreate();
  fireEvent.change(screen.getByPlaceholderText("Search by resource or permission"), {
    target: { value: "awaiting my approval" },
  });
  expect(screen.getByText("POs awaiting my approval")).toBeInTheDocument();
  expect(screen.queryByText("My drafts")).not.toBeInTheDocument();
});
