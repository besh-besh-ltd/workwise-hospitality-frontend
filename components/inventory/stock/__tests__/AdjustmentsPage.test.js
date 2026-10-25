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
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: mockUserId == null ? null : { id: mockUserId } }),
}));
// Rights per hotel, as the bulk endpoint answers for one hotel at a time.
jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getBulkPermissions: jest.fn((moduleKey, ids) =>
    Promise.resolve({ status: 1, data: { permissions: { [moduleKey]: mockRights[ids[0]] || ["read"] } } })
  ),
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
let mockRights = {};
let mockUserId = "21";
const mockReplace = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
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
const detail = (over = {}) => ({
  ...row(),
  lines: [
    { id: 1, invItemId: 9, displayName: "Basmati rice", itemCode: "RICE-25", stockUom: "bag", qty: -0.3, unitCost: 1800, value: -540, remarks: null },
  ],
  ...over,
});
const newAdjustment = async () => {
  await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
  fireEvent.click(await screen.findByRole("button", { name: "New adjustment" }));
  return screen.findByRole("dialog");
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  mockRights = { 46: ["read", "create", "approve"], 47: ["read"] };
  mockUserId = "21";
  window.sessionStorage.clear();
  getAdjustment.mockResolvedValue(detail());
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
  test("adjustment approve button only for approvers, named for its adjustment", async () => {
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    expect(within(first).getByRole("button", { name: "Approve ADJ/46/2026-27/00004" })).toBeInTheDocument();
    expect(within(first).getByRole("button", { name: "Reject ADJ/46/2026-27/00004" })).toBeInTheDocument();
    const second = rowOf("ADJ/46/2026-27/00005");
    expect(within(second).queryByRole("button", { name: /Approve/ })).toBeNull();
    expect(within(second).queryByRole("button", { name: /Reject/ })).toBeNull();
    expect(within(second).getByText("Pending approval")).toBeInTheDocument();
    expect(within(rowOf("ADJ/46/2026-27/00003")).getByText("Posted")).toBeInTheDocument();
  });

  test("Approve in the list opens the adjustment; approving happens there, with the lines in view", async () => {
    approveAdjustment.mockResolvedValue(row({ status: "posted", can: { approve: false, reject: false } }));
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(within(first).getByRole("button", { name: "Approve ADJ/46/2026-27/00004" }));
    const dialog = await screen.findByRole("dialog");
    expect(approveAdjustment).not.toHaveBeenCalled();
    expect(getAdjustment).toHaveBeenCalledWith(1);
    const lines = await within(dialog).findByRole("table", { name: "Adjustment lines" });
    expect(within(lines).getByText("Basmati rice")).toBeInTheDocument();
    expect(within(lines).getByText("₹540.00")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(approveAdjustment).toHaveBeenCalledWith(1));
    await waitFor(() => expect(listAdjustments).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith("ADJ/46/2026-27/00004 approved and posted");
  });

  test("self-approval is explained in the dialog", async () => {
    approveAdjustment.mockRejectedValue(apiError(403, "FORBIDDEN", { reason: "SELF_APPROVAL", otherApprovers: 2 }));
    render(<AdjustmentsPage initialId="1" />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(await within(dialog).findByRole("button", { name: "Approve" }));
    expect(await within(dialog).findByText("Another approver must approve your own adjustment")).toBeInTheDocument();
  });

  test("a reject refused for rights says who can reject", async () => {
    rejectAdjustment.mockRejectedValue(apiError(403, "FORBIDDEN", {}));
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(within(first).getByRole("button", { name: "Reject ADJ/46/2026-27/00004" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Wrong item" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject adjustment" }));
    expect(
      await within(dialog).findByText("Only an approver at this hotel, or whoever raised it, can reject this adjustment")
    ).toBeInTheDocument();
  });

  test("reject needs a reason", async () => {
    rejectAdjustment.mockResolvedValue(row({ status: "rejected", can: { approve: false, reject: false } }));
    render(<AdjustmentsPage />);
    const first = await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    fireEvent.click(within(first).getByRole("button", { name: "Reject ADJ/46/2026-27/00004" }));
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
    const dialog = await newAdjustment();
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
    const dialog = await newAdjustment();
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
    const dialog = await newAdjustment();
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

  test("New adjustment offers only the hotels where the caller can create", async () => {
    getStock.mockImplementation((params = {}) =>
      Promise.resolve({
        hotelId: 46, stockStartedAt: null, totals: { qtyItems: 1, value: 7200 }, total: params.search ? 1 : 0,
        hotels: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }, { id: 48, name: "Orchid Goa" }],
        rows: params.search ? [RICE] : [],
      })
    );
    mockRights = { 46: ["read", "approve"], 47: ["read", "create"], 48: ["read", "create"] };
    createAdjustment.mockResolvedValue(row({ id: 9, adjustmentNumber: "ADJ/47/2026-27/00001", status: "posted" }));
    render(<AdjustmentsPage initialHotelId="46" />);
    const dialog = await newAdjustment();
    const picker = within(dialog).getByLabelText("Hotel");
    expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual(["Orchid Pune", "Orchid Goa"]);
    expect(picker).toHaveValue("47");
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    await waitFor(() => expect(createAdjustment).toHaveBeenCalledTimes(1));
    expect(createAdjustment.mock.calls[0][0].hotelId).toBe(47);
  });

  test("with no create rights anywhere there is no New adjustment", async () => {
    mockRights = { 46: ["read", "approve"] };
    render(<AdjustmentsPage />);
    await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "New adjustment" })).toBeNull();
  });

  test("an unanswered submit locks the form: Submit again replays it, Discard drops it", async () => {
    const dropped = new Error("Network Error");
    dropped.isAxiosError = true;
    createAdjustment
      .mockRejectedValueOnce(dropped)
      .mockResolvedValueOnce(row({ id: 7, adjustmentNumber: "ADJ/46/2026-27/00009", status: "posted" }));
    render(<AdjustmentsPage />);
    const dialog = await newAdjustment();
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "2.123456" } });
    expect(within(dialog).getByLabelText("Qty of Basmati rice")).toHaveValue("2.1234");
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));

    expect(await within(dialog).findByText(/may or may not be recorded/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Qty of Basmati rice")).toBeDisabled();
    expect(within(dialog).getByLabelText("Reason")).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Discard" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Submit again" }));
    await waitFor(() => expect(createAdjustment).toHaveBeenCalledTimes(2));
    expect(createAdjustment.mock.calls[1][0]).toEqual(createAdjustment.mock.calls[0][0]);
    expect(createAdjustment.mock.calls[0][0].lines).toEqual([{ invItemId: 9, qty: -2.1234 }]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/ADJ\/46\/2026-27\/00009 posted/)));
  });

  test("Discard after an unanswered submit closes without sending again", async () => {
    createAdjustment.mockRejectedValueOnce(apiError(502, null, {}, "Bad Gateway"));
    render(<AdjustmentsPage />);
    const dialog = await newAdjustment();
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    fireEvent.click(await within(dialog).findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(createAdjustment).toHaveBeenCalledTimes(1);
  });

  test("an unanswered adjustment survives a reload locked under its key, for its own user only", async () => {
    const dropped = new Error("Network Error");
    dropped.isAxiosError = true;
    createAdjustment.mockRejectedValueOnce(dropped);
    const first = render(<AdjustmentsPage />);
    let dialog = await newAdjustment();
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "2" } });
    fireEvent.change(within(dialog).getByLabelText("Remarks (optional)"), { target: { value: "Spoilt in the walk-in" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    expect(await within(dialog).findByText(/may or may not be recorded/)).toBeInTheDocument();
    const sent = createAdjustment.mock.calls[0][0];
    expect(JSON.parse(window.sessionStorage.getItem("adj-uncertain:21:46"))).toMatchObject({ userId: "21", hotelId: 46, payload: sent });
    first.unmount();

    // another user in the same tab: a fresh form, and the lock is left alone
    mockUserId = "22";
    const other = render(<AdjustmentsPage />);
    dialog = await newAdjustment();
    expect(within(dialog).getByRole("button", { name: "Submit adjustment" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/may or may not be recorded/)).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    other.unmount();
    expect(window.sessionStorage.getItem("adj-uncertain:21:46")).not.toBeNull();

    // back as the user who sent it: reopens locked, with the form as it was
    mockUserId = "21";
    createAdjustment.mockResolvedValueOnce(row({ id: 7, adjustmentNumber: "ADJ/46/2026-27/00009", status: "posted" }));
    render(<AdjustmentsPage />);
    dialog = await newAdjustment();
    expect(within(dialog).getByText(/no answer came before the page closed/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Qty of Basmati rice")).toHaveValue("2");
    expect(within(dialog).getByLabelText("Qty of Basmati rice")).toBeDisabled();
    expect(within(dialog).getByLabelText("Reason")).toHaveValue("WASTAGE");
    expect(within(dialog).getByLabelText("Remarks (optional)")).toHaveValue("Spoilt in the walk-in");
    expect(within(dialog).queryByRole("button", { name: "Cancel" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit again" }));
    await waitFor(() => expect(createAdjustment).toHaveBeenCalledTimes(2));
    expect(createAdjustment.mock.calls[1][0]).toEqual(sent);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/ADJ\/46\/2026-27\/00009 posted/)));
    expect(window.sessionStorage.getItem("adj-uncertain:21:46")).toBeNull();
  });

  test("Discard clears the kept lock, and a definite answer ends it too", async () => {
    createAdjustment.mockRejectedValueOnce(apiError(502, null, {}, "Bad Gateway"));
    render(<AdjustmentsPage />);
    let dialog = await newAdjustment();
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    fireEvent.click(await within(dialog).findByRole("button", { name: "Discard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.sessionStorage.getItem("adj-uncertain:21:46")).toBeNull();

    createAdjustment
      .mockRejectedValueOnce(apiError(502, null, {}, "Bad Gateway"))
      .mockRejectedValueOnce(apiError(409, "NEGATIVE_STOCK", { lines: [{ index: 0, invItemId: 9, available: 0.5, requested: 1 }] }, "Not enough stock"));
    fireEvent.click(screen.getByRole("button", { name: "New adjustment" }));
    dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    await within(dialog).findByRole("button", { name: "Submit again" });
    expect(window.sessionStorage.getItem("adj-uncertain:21:46")).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit again" }));
    await waitFor(() => expect(within(dialog).getByLabelText("Qty of Basmati rice")).toBeEnabled());
    expect(window.sessionStorage.getItem("adj-uncertain:21:46")).toBeNull();
  });

  test("the lock is kept before the request goes out, so a tab closed mid-request reopens it under its key", async () => {
    createAdjustment.mockReturnValueOnce(new Promise(() => {})); // no answer before the page goes
    const first = render(<AdjustmentsPage />);
    const dialog = await newAdjustment();
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    await waitFor(() => expect(createAdjustment).toHaveBeenCalledTimes(1));
    const sent = createAdjustment.mock.calls[0][0];
    expect(JSON.parse(window.sessionStorage.getItem("adj-uncertain:21:46"))).toMatchObject({ payload: sent });
    first.unmount();

    createAdjustment.mockResolvedValueOnce(row({ id: 7, adjustmentNumber: "ADJ/46/2026-27/00009", status: "posted" }));
    render(<AdjustmentsPage />);
    const again = await newAdjustment();
    expect(within(again).getByText(/no answer came before the page closed/)).toBeInTheDocument();
    fireEvent.click(within(again).getByRole("button", { name: "Submit again" }));
    await waitFor(() => expect(createAdjustment).toHaveBeenCalledTimes(2));
    expect(createAdjustment.mock.calls[1][0]).toEqual(sent);
    await waitFor(() => expect(window.sessionStorage.getItem("adj-uncertain:21:46")).toBeNull());
  });

  test("404s (C3: can't see it, or it's gone) say what isn't available", async () => {
    const gone = (message) => apiError(404, "NOT_FOUND", {}, message);
    // the list at a hotel
    listAdjustments.mockRejectedValueOnce(gone("Hotel not found"));
    const { unmount } = render(<AdjustmentsPage initialHotelId="46" />);
    expect(await screen.findByText("This hotel isn't available to you, or no longer exists.")).toBeInTheDocument();
    unmount();

    // one adjustment
    getAdjustment.mockRejectedValueOnce(gone("Adjustment not found"));
    const second = render(<AdjustmentsPage initialId="1" />);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("This adjustment isn't available to you, or no longer exists.")).toBeInTheDocument();
    second.unmount();

    // approving one that went away
    approveAdjustment.mockRejectedValueOnce(gone("Adjustment not found"));
    const third = render(<AdjustmentsPage initialId="1" />);
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(await within(sheet).findByRole("button", { name: "Approve" }));
    expect(await within(sheet).findByText("This adjustment isn't available to you, or no longer exists.")).toBeInTheDocument();
    third.unmount();

    // raising one at a hotel that answers 404
    createAdjustment.mockRejectedValueOnce(gone("Hotel not found"));
    render(<AdjustmentsPage />);
    const form = await newAdjustment();
    fireEvent.change(within(form).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(form).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(form).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(form).getByLabelText("Qty of Basmati rice"), { target: { value: "1" } });
    fireEvent.click(within(form).getByRole("button", { name: "Submit adjustment" }));
    expect(await within(form).findByText("This hotel isn't available to you, or no longer exists.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("adj-uncertain:21:46")).toBeNull();
  });

  test("a replayed adjustment whose lines differ opens what was recorded", async () => {
    createAdjustment.mockResolvedValue({
      ...row({ id: 4, adjustmentNumber: "ADJ/46/2026-27/00002", status: "posted" }),
      replayed: true,
      lines: [{ invItemId: 11, qty: -5 }],
    });
    render(<AdjustmentsPage />);
    const dialog = await newAdjustment();
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "WASTAGE" } });
    fireEvent.change(within(dialog).getByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(within(dialog).getByLabelText("Qty of Basmati rice"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit adjustment" }));
    await waitFor(() => expect(toast.warn).toHaveBeenCalledWith(expect.stringMatching(/already recorded with different lines/)));
    await waitFor(() => expect(getAdjustment).toHaveBeenCalledWith(4));
  });

  test("status tabs move with the arrow keys, one tab stop", async () => {
    render(<AdjustmentsPage />);
    await waitFor(() => rowOf("ADJ/46/2026-27/00004"));
    const all = screen.getByRole("tab", { name: "All" });
    expect(all).toHaveAttribute("tabIndex", "0");
    expect(screen.getByRole("tab", { name: "Posted" })).toHaveAttribute("tabIndex", "-1");
    all.focus();
    fireEvent.keyDown(all, { key: "ArrowRight" });
    const pending = screen.getByRole("tab", { name: "Pending approval" });
    expect(pending).toHaveAttribute("aria-selected", "true");
    expect(pending).toHaveFocus();
    await waitFor(() => expect(listAdjustments).toHaveBeenLastCalledWith({ status: "pending_approval", page: 1 }));
    fireEvent.keyDown(pending, { key: "End" });
    expect(screen.getByRole("tab", { name: "Rejected" })).toHaveFocus();
  });

  test("?id= opens that adjustment", async () => {
    render(<AdjustmentsPage initialId="1" />);
    const dialog = await screen.findByRole("dialog");
    expect(getAdjustment).toHaveBeenCalledWith(1);
    expect(within(dialog).getByText("ADJ/46/2026-27/00004")).toBeInTheDocument();
    expect(within(dialog).getByText("Basmati rice")).toBeInTheDocument();
    expect(within(dialog).getByText("−0.3")).toBeInTheDocument();
  });
});
