// Approval hierarchy page — PR chains on a hotel page.
//
// The backend list for a hotel returns BOTH that hotel's own PR policy (H,
// hotel_id = hotel) and the inherited company-wide one (C, hotel_id NULL).
// They are two rows with two lifecycles: each card must edit and delete
// EXACTLY its own row. Editing H must never rewrite C, and deleting H must
// never take out C (which would make every PR submit fail PR_NO_POLICY).

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("next/router", () => ({ useRouter: () => ({ query: { companyId: "4", hotelId: "12" }, back: jest.fn() }) }));
jest.mock("@/services/approval", () => ({
  createApprovalPolicy: jest.fn(),
  updateApprovalPolicy: jest.fn(),
  deleteApprovalPolicy: jest.fn(),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const mockData = { policies: [] };
jest.mock("./hooks/useApprovalData", () => ({
  __esModule: true,
  default: () => ({
    hotel: { id: 12, name: "Goa Beach Resort" },
    policies: mockData.policies,
    roles: [], users: [], userRoleScopes: {}, departments: [], loading: false,
    refresh: jest.fn(), getApproverOptions: jest.fn(() => [{ value: 7, label: "Asha Rao" }]),
    getApproverDisplayInfo: jest.fn(() => ({ name: "Asha Rao", email: "", users: [] })),
    handleDeletePolicy: jest.fn(), getDeptSubGraphPreview: jest.fn(), refreshDepartments: jest.fn(),
  }),
}));
jest.mock("./hooks/useProcessData", () => ({
  __esModule: true,
  default: () => ({
    processes: [], loading: false, handleCreateProcess: jest.fn(), handleUpdateProcess: jest.fn(),
    handleDeleteProcess: jest.fn(), refresh: jest.fn(),
  }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy } from "@/services/approval";
import ApprovalHierarchy from "./index";

const step = (id) => ({ approver_source_type: "USER", approver_source_id: id, decision_rule: "ANY", step_order: 1 });
const H = { id: 51, entity_type: "PR", hotel_id: 12, process_id: null, steps: [step(7)] };
const C = { id: 52, entity_type: "PR", hotel_id: null, process_id: null, steps: [step(8), step(9)] };

const card = (name) => screen.getByText(name).closest("div[class*=card]") || screen.getByText(name).parentElement;
const clickIn = (title, name) => fireEvent.click(within(card(name)).getByTitle(title));
const HOTEL = /Purchase Requisitions — This hotel/;
const COMPANY = /Purchase Requisitions — Company-wide \(inherited\)/;
const cardOf = (re) => {
  let el = screen.getByText(re);
  while (el && !el.querySelector("[title=Edit]")) el = el.parentElement;
  return el;
};
const confirmDelete = () => fireEvent.click(screen.getAllByRole("button", { name: /^delete$/i }).find((b) => !b.title));
const next = () => fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

beforeEach(() => {
  jest.clearAllMocks();
  updateApprovalPolicy.mockResolvedValue({ status: 1 });
  createApprovalPolicy.mockResolvedValue({ status: 1 });
  deleteApprovalPolicy.mockResolvedValue({ status: 1 });
  mockData.policies = [H, C];
});

describe("PR chains on a hotel page (policies H + C)", () => {
  test("shows two labelled cards, one per scope", () => {
    render(<ApprovalHierarchy />);
    expect(screen.getByText(HOTEL)).toBeInTheDocument();
    expect(screen.getByText(COMPANY)).toBeInTheDocument();
  });

  test("editing the hotel card saves ONLY H (hotel_id = hotel, H's levels)", async () => {
    render(<ApprovalHierarchy />);
    fireEvent.click(within(cardOf(HOTEL)).getByTitle("Edit"));
    next(); next();
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));
    await waitFor(() => expect(updateApprovalPolicy).toHaveBeenCalledTimes(1));
    expect(updateApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ id: 51, hotel_id: 12, process_id: null }));
    expect(updateApprovalPolicy.mock.calls[0][0].steps).toHaveLength(1);
  });

  test("editing the company-wide card saves ONLY C with hotel_id null and C's levels", async () => {
    render(<ApprovalHierarchy />);
    fireEvent.click(within(cardOf(COMPANY)).getByTitle("Edit"));
    next(); next();
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));
    await waitFor(() => expect(updateApprovalPolicy).toHaveBeenCalledTimes(1));
    expect(updateApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ id: 52, hotel_id: null, process_id: null }));
    expect(updateApprovalPolicy.mock.calls[0][0].steps).toHaveLength(2);
  });

  test("deleting the hotel card removes only H", async () => {
    render(<ApprovalHierarchy />);
    fireEvent.click(within(cardOf(HOTEL)).getByTitle("Delete"));
    expect(screen.getByText(/removes this hotel's own Purchase Requisition approval chain/i)).toBeInTheDocument();
    confirmDelete();
    await waitFor(() => expect(deleteApprovalPolicy).toHaveBeenCalledTimes(1));
    expect(deleteApprovalPolicy).toHaveBeenCalledWith(51);
  });

  test("deleting the company-wide card removes only C, after the right warning", async () => {
    render(<ApprovalHierarchy />);
    fireEvent.click(within(cardOf(COMPANY)).getByTitle("Delete"));
    expect(screen.getByText("This removes the Purchase Requisition approval chain for every hotel that doesn't have its own.")).toBeInTheDocument();
    confirmDelete();
    await waitFor(() => expect(deleteApprovalPolicy).toHaveBeenCalledTimes(1));
    expect(deleteApprovalPolicy).toHaveBeenCalledWith(52);
  });
});

describe("hotel with only the inherited company-wide chain", () => {
  beforeEach(() => { mockData.policies = [C]; });

  test("offers to create a hotel-specific chain, opening the PR flow for this hotel", async () => {
    render(<ApprovalHierarchy />);
    expect(screen.getByText(COMPANY)).toBeInTheDocument();
    expect(screen.queryByText(HOTEL)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create a hotel-specific chain/i }));
    expect(screen.getByLabelText(/all hotels/i)).not.toBeChecked();
    next(); // allowed: this hotel has no chain of its own yet
    expect(screen.getByText(/Configure approval stages/i)).toBeInTheDocument();
  });

  test("creating a second company-wide chain is refused with a friendly message", () => {
    render(<ApprovalHierarchy />);
    fireEvent.click(screen.getByRole("button", { name: /create workflow/i }));
    fireEvent.click(screen.getByText("Purchase Requisition (no process)"));
    fireEvent.click(screen.getByLabelText(/all hotels/i));
    expect(screen.getByRole("alert")).toHaveTextContent(/company-wide Purchase Requisition chain already exists/i);
    next();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/already exists/i));
    expect(screen.queryByText(/Configure approval stages/i)).not.toBeInTheDocument();
  });
});

describe("creating a hotel chain when the hotel already has one", () => {
  test("is refused with a friendly message, not a duplicate-key error", () => {
    mockData.policies = [H];
    render(<ApprovalHierarchy />);
    fireEvent.click(screen.getByRole("button", { name: /create workflow/i }));
    fireEvent.click(screen.getByText("Purchase Requisition (no process)"));
    next();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/already has its own Purchase Requisition chain/i));
    expect(createApprovalPolicy).not.toHaveBeenCalled();
  });
});

describe("uncategorized policies", () => {
  test("Edit explains it cannot be edited here and never deletes", () => {
    mockData.policies = [{ id: 77, entity_type: "MR", hotel_id: 12, process_id: null, steps: [step(7)] }];
    render(<ApprovalHierarchy />);
    fireEvent.click(screen.getByTitle("Edit"));
    expect(toast.info).toHaveBeenCalledWith("This policy can't be edited here yet. Delete and recreate it, or contact support.");
    expect(deleteApprovalPolicy).not.toHaveBeenCalled();
  });
});
