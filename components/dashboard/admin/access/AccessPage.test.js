// Access — what each role actually means.
//
// Role definitions lived in a modal that listed only roles somebody at this
// company had created. Every built-in role — Commercial Approver, Technical
// Evaluator, Final Awarding P1 — was invisible, so an admin could assign one
// to a person with no way to find out what it granted. These tests pin that
// built-in roles are listed and readable, and that "coverage" is explained
// where it appears rather than left as jargon (UM-9).

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("@/services/rbac", () => ({
  getRoles: jest.fn(),
  getAllPermissions: jest.fn(),
  getRolePermissions: jest.fn(),
}));

jest.mock("@/components/modal/CustomRolePermissionsModal", () => ({
  __esModule: true,
  default: ({ isOpen, initialAction, initialRole }) =>
    isOpen ? (
      <div data-testid="role-editor">
        {initialAction}:{initialRole?.title || "none"}
      </div>
    ) : null,
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getRoles, getAllPermissions, getRolePermissions } from "@/services/rbac";
import AccessPage from "./AccessPage";

const ROLES = [
  { id: 2, title: "Tender Creator", description: "Creates RFQs.", created_by: null },
  { id: 12, title: "Commercial Approver", description: null, created_by: null },
  { id: 23, title: "PO Regenerator", description: "Regenerates PO documents.", created_by: 150 },
];

// 8 permissions in the catalogue, so coverage arithmetic is checkable by hand.
const CATALOGUE = {
  RFQ: [
    { id: 1, action: "create" },
    { id: 2, action: "read" },
    { id: 3, action: "update" },
    { id: 4, action: "approve" },
  ],
  "ARC-COMM": [
    { id: 5, action: "read" },
    { id: 6, action: "evaluate" },
  ],
  AWARDING: [
    { id: 7, action: "read" },
    { id: 8, action: "approve" },
  ],
};

beforeEach(() => {
  getRoles.mockReset().mockResolvedValue({ data: { data: ROLES } });
  getAllPermissions.mockReset().mockResolvedValue({ data: CATALOGUE });
  getRolePermissions.mockReset().mockResolvedValue({ data: { RFQ: ["create", "read"] } });
});

describe("Access catalogue", () => {
  it("lists built-in roles, which were invisible before", async () => {
    render(<AccessPage />);
    expect(await screen.findByText("Tender Creator")).toBeInTheDocument();
    expect(screen.getByText("Commercial Approver")).toBeInTheDocument();
  });

  it("separates the company's own roles from the built-in ones", async () => {
    render(<AccessPage />);
    expect(await screen.findByText("PO Regenerator")).toBeInTheDocument();
    // Only built-in roles carry the badge; there are two of them.
    expect(screen.getAllByText("Built-in")).toHaveLength(2);
  });

  it("offers Edit on a custom role and withholds it on a built-in one", async () => {
    render(<AccessPage />);
    await screen.findByText("PO Regenerator");
    // One editable role in the fixture, therefore exactly one Edit control.
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
  });

  it("reads out a role's permissions in plain language on expand", async () => {
    render(<AccessPage />);
    fireEvent.click(await screen.findByText("Tender Creator"));

    await waitFor(() => expect(getRolePermissions).toHaveBeenCalledWith(2));
    expect(await screen.findByText("RFQ Creation")).toBeInTheDocument();
    // Raw enum "create"/"read" become "Create"/"View".
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("states coverage as a share of the whole catalogue and explains the word", async () => {
    render(<AccessPage />);
    fireEvent.click(await screen.findByText("Tender Creator"));

    // 2 granted of 8 in the catalogue = 25%.
    expect(await screen.findByText("2 of 8")).toBeInTheDocument();
    expect(screen.getByText(/25% coverage/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What coverage means" })
    ).toBeInTheDocument();
  });

  it("only fetches a role's permissions once, however often it is toggled", async () => {
    render(<AccessPage />);
    const role = await screen.findByText("Tender Creator");

    fireEvent.click(role);
    await waitFor(() => expect(getRolePermissions).toHaveBeenCalledTimes(1));
    fireEvent.click(role); // collapse
    fireEvent.click(role); // expand again
    await waitFor(() => expect(screen.getByText("RFQ Creation")).toBeInTheDocument());
    expect(getRolePermissions).toHaveBeenCalledTimes(1);
  });

  it("says plainly when a role grants nothing at all", async () => {
    getRolePermissions.mockResolvedValue({ data: {} });
    render(<AccessPage />);
    fireEvent.click(await screen.findByText("Commercial Approver"));

    expect(await screen.findByText(/grants no permissions/i)).toBeInTheDocument();
  });

  it("opens the editor straight into edit, not into a second role list", async () => {
    render(<AccessPage />);
    await screen.findByText("PO Regenerator");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByTestId("role-editor")).toHaveTextContent("edit:PO Regenerator");
  });

  it("opens the editor in create mode from the header", async () => {
    render(<AccessPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create role" }));

    expect(screen.getByTestId("role-editor")).toHaveTextContent("create:none");
  });

  it("reports a failed load rather than showing an empty catalogue", async () => {
    getRoles.mockRejectedValue(new Error("network"));
    render(<AccessPage />);

    expect(
      await screen.findByText(/could not load roles and permissions/i)
    ).toBeInTheDocument();
  });
});
