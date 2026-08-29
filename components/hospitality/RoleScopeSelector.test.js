// Role assignment — the screen behind most of Ashlesha's User Management list.
//
// Four of her reports are one cause: the form asked for things in the wrong
// order (UM-4), made adding a second role as expensive as the first (UM-2),
// hid the action that stages a role below a screen of permissions (UM-3), and
// edited a role in a form nowhere near the role being edited (UM-6).

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("@/services/rbac", () => ({
  getRoles: jest.fn(),
  getDepartments: jest.fn(),
  getRolePermissions: jest.fn(),
  getUserRoleScopes: jest.fn(),
}));
jest.mock("@/services/hospitality", () => ({
  getHospitalityEntities: jest.fn(),
  getUserMappingsById: jest.fn(),
}));
jest.mock("@/services/process", () => ({ getApprovalProcesses: jest.fn() }));

jest.mock("react-redux", () => ({
  useSelector: (fn) => fn({ userProfile: { is_hospitality: 1, id: 80002 } }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getRoles, getDepartments, getRolePermissions } from "@/services/rbac";
import { getHospitalityEntities, getUserMappingsById } from "@/services/hospitality";
import { getApprovalProcesses } from "@/services/process";
import RoleScopeSelector from "./RoleScopeSelector";

const ENTITIES = [
  {
    company_id: 10001,
    company_name: "Hospitality A",
    hotels: [
      { hotel_id: 10101, hotel_name: "Hotel A-1" },
      { hotel_id: 10102, hotel_name: "Hotel A-2" },
    ],
  },
];

const ROLES = [
  { id: 2, title: "Tender Creator" },
  { id: 12, title: "Commercial Approver" },
];

const DEPARTMENTS = [
  { id: 1, title: "Procurement" },
  { id: 2, title: "Engineering" },
];

const setup = (props = {}) =>
  render(
    <RoleScopeSelector
      onAddRole={jest.fn()}
      onRemoveRole={jest.fn()}
      existingRoles={[]}
      isEditMode={false}
      {...props}
    />
  );

const selectByLabel = (labelText) => {
  const label = screen.getByText((_, node) =>
    node?.tagName === "LABEL" && node.textContent.trim().startsWith(labelText)
  );
  return label.parentElement.querySelector("select");
};

beforeEach(() => {
  getRoles.mockReset().mockResolvedValue({ data: { data: ROLES } });
  getDepartments.mockReset().mockResolvedValue({ data: { data: DEPARTMENTS } });
  getRolePermissions.mockReset().mockResolvedValue({ data: { RFQ: ["create", "read"] } });
  getHospitalityEntities.mockReset().mockResolvedValue({ data: ENTITIES });
  getUserMappingsById.mockReset().mockResolvedValue({ data: [] });
  getApprovalProcesses.mockReset().mockResolvedValue({ data: [] });
});

describe("UM-4 · the form asks in the order the decision is made", () => {
  it("keeps Role and Department shut until a company and a unit are chosen", async () => {
    setup();
    await screen.findByText("Add New Role");

    expect(selectByLabel("Company")).toBeEnabled();
    expect(selectByLabel("Business Unit")).toBeDisabled();
    expect(selectByLabel("Role")).toBeDisabled();
    expect(selectByLabel("Department")).toBeDisabled();

    fireEvent.change(selectByLabel("Company"), { target: { value: "10001" } });
    expect(selectByLabel("Business Unit")).toBeEnabled();
    // A company alone is not enough: the unit is still unanswered.
    expect(selectByLabel("Role")).toBeDisabled();
    expect(selectByLabel("Department")).toBeDisabled();

    fireEvent.change(selectByLabel("Business Unit"), { target: { value: "10101" } });
    expect(selectByLabel("Role")).toBeEnabled();
    expect(selectByLabel("Department")).toBeEnabled();
  });

  it("treats every business unit as a deliberate answer, not a default", async () => {
    // The unit used to default to "All Business Units", so scope was decided
    // by not deciding. It is still available — it is a real thing to want —
    // but it has to be chosen.
    setup();
    await screen.findByText("Add New Role");

    fireEvent.change(selectByLabel("Company"), { target: { value: "10001" } });
    expect(selectByLabel("Business Unit")).toHaveValue("");

    fireEvent.change(selectByLabel("Business Unit"), { target: { value: "all" } });
    expect(selectByLabel("Role")).toBeEnabled();
  });

  it("re-asks for the unit when the company changes", async () => {
    setup();
    await screen.findByText("Add New Role");

    fireEvent.change(selectByLabel("Company"), { target: { value: "10001" } });
    fireEvent.change(selectByLabel("Business Unit"), { target: { value: "10101" } });
    fireEvent.change(selectByLabel("Company"), { target: { value: "" } });

    expect(selectByLabel("Business Unit")).toBeDisabled();
    expect(selectByLabel("Role")).toBeDisabled();
  });
});

describe("UM-2 · assigning several roles at one unit", () => {
  it("keeps the company and unit after a role is added", async () => {
    const onAddRole = jest.fn();
    setup({ onAddRole });
    await screen.findByText("Add New Role");

    fireEvent.change(selectByLabel("Company"), { target: { value: "10001" } });
    fireEvent.change(selectByLabel("Business Unit"), { target: { value: "10101" } });
    fireEvent.change(selectByLabel("Role"), { target: { value: "2" } });
    fireEvent.change(selectByLabel("Department"), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: "Add Role" }));
    await waitFor(() => expect(onAddRole).toHaveBeenCalledTimes(1));

    // The scope survives; only the role and department clear. Giving one
    // person four roles at a unit used to mean re-picking both four times.
    expect(selectByLabel("Company")).toHaveValue("10001");
    expect(selectByLabel("Business Unit")).toHaveValue("10101");
    expect(selectByLabel("Role")).toHaveValue("");
    expect(selectByLabel("Role")).toBeEnabled();
  });

  it("says a role was added, so a cleared form does not read as a lost one", async () => {
    setup({ onAddRole: jest.fn() });
    await screen.findByText("Add New Role");

    fireEvent.change(selectByLabel("Company"), { target: { value: "10001" } });
    fireEvent.change(selectByLabel("Business Unit"), { target: { value: "10101" } });
    fireEvent.change(selectByLabel("Role"), { target: { value: "2" } });
    // A specific department, so this commits directly rather than raising the
    // broad-access confirmation, which is a separate behaviour.
    fireEvent.change(selectByLabel("Department"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Role" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Tender Creator/);
  });
});

describe("UM-3 · the action that stages a role is findable", () => {
  it("puts Add Role above the permissions preview, not below it", async () => {
    setup({ onAddRole: jest.fn() });
    await screen.findByText("Add New Role");

    fireEvent.change(selectByLabel("Company"), { target: { value: "10001" } });
    fireEvent.change(selectByLabel("Business Unit"), { target: { value: "10101" } });
    fireEvent.change(selectByLabel("Role"), { target: { value: "2" } });

    const preview = await screen.findByText(/Permissions for/);
    const button = screen.getByRole("button", { name: "Add Role" });
    // A full role's permission list can run a screen and a half, which is how
    // the button ended up off-screen and the grant silently dropped.
    expect(button.compareDocumentPosition(preview)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe("UM-7 · a duplicate grant is refused, not swallowed", () => {
  it("names the problem instead of appearing to work", async () => {
    const existing = [
      {
        role_id: 2,
        role_title: "Tender Creator",
        company_id: 10001,
        hotel_id: 10101,
        department_id: null,
        process_id: null,
      },
    ];
    const onAddRole = jest.fn();
    setup({ existingRoles: existing, onAddRole, onReplaceRole: jest.fn() });
    await screen.findByText(/Assigned Roles/);

    fireEvent.change(selectByLabel("Company"), { target: { value: "10001" } });
    fireEvent.change(selectByLabel("Business Unit"), { target: { value: "10101" } });
    fireEvent.change(selectByLabel("Role"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Role" }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(onAddRole).not.toHaveBeenCalled();
  });
});

describe("UM-6 · editing happens next to the role being edited", () => {
  it("renders the edit form inline under that row", async () => {
    const existing = [
      {
        role_id: 2,
        role_title: "Tender Creator",
        company_id: 10001,
        hotel_id: 10101,
        department_id: null,
        process_id: null,
      },
    ];
    setup({ existingRoles: existing, onReplaceRole: jest.fn(), onRemoveRole: jest.fn() });
    await screen.findByText(/Assigned Roles/);

    // Before: one form, at the bottom, in add mode.
    expect(screen.getByText("Add New Role")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Edit role"));

    // After: the form is in edit mode and sits after the row it belongs to,
    // rather than at the far end of a long modal.
    const editHeading = await screen.findByText("Edit Role");
    expect(screen.queryByText("Add New Role")).not.toBeInTheDocument();

    // Position alone is too weak an assertion: a form left at the bottom of
    // the modal also comes after the row. What matters is that it is *inside*
    // the row's own inline slot, within the assigned-roles list.
    const inlineSlot = document.querySelector('[class*="scopeRoleInlineEdit"]');
    expect(inlineSlot).not.toBeNull();
    expect(inlineSlot.contains(editHeading)).toBe(true);

    const row = document.querySelector('[class*="scopeRoleTitle"]').closest('[class*="scopeRoleRow"]');
    expect(row.nextElementSibling).toBe(inlineSlot);
    expect(screen.getByText("Editing")).toBeInTheDocument();
  });
});
