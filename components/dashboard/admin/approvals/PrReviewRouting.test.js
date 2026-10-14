// PR review routing — category -> reviewing department.
//
// A PR line in a mapped category (or a sub-category) is technically reviewed by
// that department's PR Technical Reviewers before approval.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockGet = jest.fn();
const mockSave = jest.fn();
const mockDelete = jest.fn();
const mockSearch = jest.fn();
jest.mock("@/services/pr", () => ({
  getReviewRouting: (...a) => mockGet(...a),
  saveReviewRouting: (...a) => mockSave(...a),
  deleteReviewRouting: (...a) => mockDelete(...a),
  searchCategories: (...a) => mockSearch(...a),
}));
const mockDepts = jest.fn();
jest.mock("@/services/rbac", () => ({ getDepartments: (...a) => mockDepts(...a) }));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import PrReviewRouting from "./PrReviewRouting";

const ROWS = [
  { id: 1, category_id: 10, category_title: "Linen", parent_title: "Housekeeping", department_id: 3, department_title: "Engineering", created_at: "2026-10-01T00:00:00Z" },
  { id: 2, category_id: 11, category_title: "Cutlery", parent_title: null, department_id: 4, department_title: "F&B", created_at: "2026-10-02T00:00:00Z" },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ status: 1, data: ROWS });
  mockDepts.mockResolvedValue({ data: [{ id: 3, title: "Engineering" }, { id: 4, title: "F&B" }] });
  mockSearch.mockResolvedValue({ data: { categories: [{ id: 12, title: "Towels", parent_id: 10 }] } });
  mockSave.mockResolvedValue({ status: 1, message: "Review routing added", data: { id: 3, created: true } });
  mockDelete.mockResolvedValue({ status: 1, data: { id: 1 } });
});

describe("PrReviewRouting", () => {
  test("lists the mappings with the explanatory help text", async () => {
    render(<PrReviewRouting />);
    expect(await screen.findByText("Linen")).toBeInTheDocument();
    expect(screen.getByText("Cutlery")).toBeInTheDocument();
    expect(screen.getByText("in Housekeeping")).toBeInTheDocument();
    expect(within(screen.getByText("Linen").closest("li")).getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText(/Lines in a mapped category \(or its sub-categories\) are reviewed by that department's PR Technical Reviewers before approval\./)).toBeInTheDocument();
  });

  test("adds a mapping: typeahead category + department -> saveReviewRouting", async () => {
    render(<PrReviewRouting />);
    await screen.findByText("Linen");
    const add = screen.getByRole("button", { name: /add routing/i });
    expect(add).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "tow" } });
    fireEvent.click(await screen.findByRole("button", { name: "Towels" }));
    expect(mockSearch).toHaveBeenCalledWith("tow");
    fireEvent.change(screen.getByLabelText("Reviewing department"), { target: { value: "3" } });

    expect(add).toBeEnabled();
    fireEvent.click(add);
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ category_id: 12, department_id: 3 }));
    expect(toast.success).toHaveBeenCalledWith("Review routing added");
    expect(mockGet).toHaveBeenCalledTimes(2); // reloaded
    expect(screen.getByLabelText("Category")).toHaveValue("");
  });

  test("deletes only after confirmation", async () => {
    render(<PrReviewRouting />);
    fireEvent.click(await screen.findByRole("button", { name: /remove routing for linen/i }));
    expect(mockDelete).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /^remove$/i }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(1));
    expect(toast.success).toHaveBeenCalledWith("Review routing removed");
  });

  test("cancelling the confirmation deletes nothing", async () => {
    render(<PrReviewRouting />);
    fireEvent.click(await screen.findByRole("button", { name: /remove routing for linen/i }));
    fireEvent.click(await screen.findByRole("button", { name: /keep/i }));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test("empty state when nothing is mapped", async () => {
    mockGet.mockResolvedValue({ status: 1, data: [] });
    render(<PrReviewRouting />);
    expect(await screen.findByText(/no categories are routed for review/i)).toBeInTheDocument();
  });

  test("load failure shows an error, not an empty table", async () => {
    mockGet.mockRejectedValue(new Error("boom"));
    render(<PrReviewRouting />);
    expect(await screen.findByText("Could not load review routing.")).toBeInTheDocument();
    expect(screen.queryByText(/no categories are routed/i)).not.toBeInTheDocument();
  });

  test("a failed save surfaces the server message and keeps the form", async () => {
    mockSave.mockRejectedValue({ response: { data: { message: "Choose an active category" } } });
    render(<PrReviewRouting />);
    await screen.findByText("Linen");
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "tow" } });
    fireEvent.click(await screen.findByRole("button", { name: "Towels" }));
    fireEvent.change(screen.getByLabelText("Reviewing department"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /add routing/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Choose an active category"));
    expect(screen.getByLabelText("Category")).toHaveValue("Towels");
  });

  test("a failed category search is reported inline", async () => {
    mockSearch.mockRejectedValue(new Error("403"));
    render(<PrReviewRouting />);
    await screen.findByText("Linen");
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "tow" } });
    expect(await screen.findByText("Could not search categories.")).toBeInTheDocument();
  });
});
