// Adjustments: list with server-decided approve/reject, the create modal
// (always submit:true, signed by reason) and the refusal messages.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, pathname: "/dashboard/buyer/inventory/adjustments", push: jest.fn(), replace: mockReplace }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => {
  const toast = jest.fn();
  Object.assign(toast, { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), dismiss: jest.fn() });
  return { __esModule: true, toast };
});
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: true, canUpdate: true, canApprove: false, loading: false, hasPermission: () => true,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStock: jest.fn(),
  listAdjustments: jest.fn(),
  getAdjustment: jest.fn(),
  createAdjustment: jest.fn(),
  approveAdjustment: jest.fn(),
  rejectAdjustment: jest.fn(),
}));

let mockQuery = {};
const mockReplace = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import {
  getStock, listAdjustments, getAdjustment, createAdjustment, approveAdjustment, rejectAdjustment,
} from "@/services/inventory";
import AdjustmentsPage from "../AdjustmentsPage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HOTELS = [{ id: 46, name: "Orchid Mumbai" }];
const RICE = {
  invItemId: 9, displayName: "Basmati rice", itemCode: "RICE-25", stockUom: "bag", qty: 4, avgCost: 1800, value: 7200,
  minQty: null, reorderLevel: null, maxQty: null, binLabel: null, belowReorder: false, lastMovementAt: null,
};

const row = (over = {}) => ({
  id: 1, adjustmentNumber: "ADJ/46/2026-27/00004", hotelId: 46, hotelName: "Orchid Mumbai", reasonCode: "WASTAGE",
  status: "pending_approval", remarks: null, value: 540, lineCount: 2, createdAt: "2026-10-24T09:00:00.000Z",
  createdByName: "Ravi K", can: { approve: true, reject: true }, ...over,
});

const apiError = (status, code, details, message = "Refused") => {
  const err = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { status: 0, message, code, details } };
  return err;
};

const rowOf = (number) => within(screen.getByRole("table", { name: "Adjustments" })).getByText(number).closest("tr");

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  getStock.mockImplementation((params = {}) =>
    Promise.resolve({
      hotelId: 46, stockStartedAt: "2026-10-01T00:00:00.000Z", hotels: HOTELS, totals: { qtyItems: 1, value: 7200 },
      rows: params.search ? [RICE] : [], total: params.search ? 1 : 0,
    })
  );
  listAdjustments.mockResolvedValue({
    rows: [
      row(),
      row({ id: 2, adjustmentNumber: "ADJ/46/2026-27/00005", reasonCode: "FOUND", can: { approve: false, reject: false } }),
      row({ id: 3, adjustmentNumber: "ADJ/46/2026-27/00003", status: "posted", can: { approve: false, reject: false } }),
    ],
    total: 3,
  });
});

describe("AdjustmentsPage", () => {
  test("adjustment approve button only for approvers", async () => {
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    expect(within(first).getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(within(first).getByRole("button", { name: "Reject" })).toBeInTheDocument();
    const second = rowOf("ADJ/46/2026-27/00005");
    expect(within(second).queryByRole("button", { name: "Approve" })).toBeNull();
    expect(within(second).queryByRole("button", { name: "Reject" })).toBeNull();
    expect(within(second).getByText("Pending approval")).toBeInTheDocument();
    expect(within(rowOf("ADJ/46/2026-27/00003")).getByText("Posted")).toBeInTheDocument();
  });

  test("approving refreshes the list", async () => {
    approveAdjustment.mockResolvedValue(row({ status: "posted", can: { approve: false, reject: false } }));
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(within(first).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(approveAdjustment).toHaveBeenCalledWith(1));
    await waitFor(() => expect(listAdjustments).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalled();
  });

  test("self-approval is explained", async () => {
    approveAdjustment.mockRejectedValue(apiError(403, "FORBIDDEN", { reason: "SELF_APPROVAL", otherApprovers: 2 }));
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(within(first).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Another approver must approve your own adjustment"));
  });

  test("reject needs a reason", async () => {
    rejectAdjustment.mockResolvedValue(row({ status: "rejected", can: { approve: false, reject: false } }));
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(within(first).getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Reject adjustment" });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Count was wrong" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(rejectAdjustment).toHaveBeenCalledWith(1, "Count was wrong"));
  });

  test("a new wastage adjustment is sent signed, with submit:true", async () => {
    createAdjustment.mockResolvedValue(row({ id: 7, adjustmentNumber: "ADJ/46/2026-27/00009", status: "pending_approval" }));
    render(<AdjustmentsPage />);
    await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(screen.getByRole("button", { name: "New adjustment" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));

    await waitFor(() => expect(createAdjustment).toHaveBeenCalledTimes(1));
    const body = createAdjustment.mock.calls[0][0];
    expect(body).toMatchObject({ hotelId: 46, reasonCode: "WASTAGE", submit: true, lines: [{ invItemId: 9, qty: -2 }] });
    expect(body.clientEventId).toMatch(UUID);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/sent for approval/)));
  });

  test("a gain with no cost shows the server's message on the line", async () => {
    createAdjustment.mockRejectedValue(
      apiError(400, "VALIDATION", { field: "lines", index: 0, invItemId: 9 }, "Basmati rice has no cost at this hotel yet")
    );
    render(<AdjustmentsPage />);
    await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(screen.getByRole("button", { name: "New adjustment" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "FOUND" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    expect(await within(dialog).findByText("Basmati rice has no cost at this hotel yet")).toBeInTheDocument();
    expect(createAdjustment.mock.calls[0][0].lines).toEqual([{ invItemId: 9, qty: 1 }]);
  });

  test("a correction can take stock out", async () => {
    createAdjustment.mockResolvedValue(row({ id: 8, adjustmentNumber: "ADJ/46/2026-27/00010", status: "posted" }));
    render(<AdjustmentsPage />);
    await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(screen.getByRole("button", { name: "New adjustment" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "CORRECTION" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Direction of Basmati rice"), { target: { value: "out" } });
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "1.5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    await waitFor(() => expect(createAdjustment).toHaveBeenCalled());
    expect(createAdjustment.mock.calls[0][0].lines).toEqual([{ invItemId: 9, qty: -1.5 }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/posted/)));
  });

  test("?id= opens that adjustment", async () => {
    getAdjustment.mockResolvedValue({
      ...row(),
      lines: [{ id: 1, invItemId: 9, displayName: "Basmati rice", itemCode: "RICE-25", stockUom: "bag", qty: -0.3, unitCost: 1800, value: -540, remarks: null }],
    });
    render(<AdjustmentsPage initialId="1" />);
    const dialog = await screen.findByRole("dialog");
    expect(getAdjustment).toHaveBeenCalledWith(1);
    expect(within(dialog).getByText("ADJ/46/2026-27/00004")).toBeInTheDocument();
    expect(within(dialog).getByText("Basmati rice")).toBeInTheDocument();
    expect(within(dialog).getByText("−0.3")).toBeInTheDocument();
  });
});
