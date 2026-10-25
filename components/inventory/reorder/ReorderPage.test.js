// Reorder worklist: the API is mocked; the page is the real one.
let mockQuery = { hotelId: "46" };
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    isReady: true,
    pathname: "/dashboard/buyer/inventory/reorder",
    query: mockQuery,
    push: mockPush,
    replace: mockReplace,
  }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getReorder: jest.fn(),
  createReorderMrDraft: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, addProductsToDraft: jest.fn() }));
jest.mock("@/services/mr", () => ({ __esModule: true, submit: jest.fn() }));

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createReorderMrDraft, getReorder } from "@/services/inventory";
import { addProductsToDraft } from "@/services/rfq";
import { submit } from "@/services/mr";
import ReorderPage from "./ReorderPage";

const line = (o) => ({
  arcId: 5, arcNumber: "ARC-0005", arcContractId: 61, productVariantId: 3001, variantName: "Milk 1L",
  unitRate: 52.5, uom: "litre", vendorId: 9, vendorName: "Dairy Co", ...o,
});
const row = (o) => ({
  invItemId: 1, displayName: "Milk", itemCode: "MLK-1", stockUom: "litre", qty: 4, minQty: 2, reorderLevel: 10,
  maxQty: 20, binLabel: "C1", onOrder: 0, onOrderIncomplete: false, suggestedQty: 16, packFactor: null,
  avgDailyUse90d: 1.2, productVariantId: 3001, variantIds: [3001], contracted: null, contractedLines: [], ...o,
});
const reorder = (o = {}) => ({
  hotelId: 46,
  hotels: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }],
  stockStartedAt: "2026-10-01T04:30:00.000Z",
  departments: [{ id: 3, title: "F&B" }, { id: 4, title: "Housekeeping" }],
  rows: [
    row({
      contracted: line({ departmentId: 3, arcContractLineId: 901 }),
      contractedLines: [line({ departmentId: 3, arcContractLineId: 901 })],
    }),
    row({ invItemId: 2, displayName: "Bleach", itemCode: "BLC-2", stockUom: "bottle", qty: 1, reorderLevel: 3, maxQty: 5, suggestedQty: 4, productVariantId: 4002, variantIds: [4002] }),
    row({ invItemId: 3, displayName: "Napkins", itemCode: null, stockUom: "pack", qty: 6, reorderLevel: 6, maxQty: 6, onOrder: 2, suggestedQty: 0, productVariantId: 5003 }),
  ],
  groupOrdersOpen: [],
  can: { createMrDraft: true },
  ...o,
});

const mount = async (data = reorder()) => {
  getReorder.mockResolvedValue(data);
  render(<ReorderPage />);
  await screen.findByText("Milk");
};
const rowOf = (name) => screen.getByText(name).closest("tr");

beforeEach(() => {
  jest.resetAllMocks();
  mockQuery = { hotelId: "46" };
});

it("lists the hotel's items with on hand, on order and the suggested qty", async () => {
  await mount();
  expect(getReorder).toHaveBeenCalledWith("46");
  const milk = within(rowOf("Milk"));
  expect(milk.getByText("16")).toBeInTheDocument();
  expect(milk.getByLabelText("Order qty for Milk")).toHaveValue("16");
  expect(milk.getByText(/ARC-0005 · Dairy Co/)).toBeInTheDocument();
  expect(within(rowOf("Bleach")).getByText("No contract: RFQ")).toBeInTheDocument();
  // Nothing to order: not pre-selected, qty blank.
  expect(screen.getByLabelText("Select Napkins")).not.toBeChecked();
  expect(screen.getByLabelText("Order qty for Napkins")).toHaveValue("");
});

it("reorder page creates MR draft for contracted rows", async () => {
  await mount();
  createReorderMrDraft.mockResolvedValue({
    mrId: 77, mrNumber: "MR-2026-ABC12", hotelId: 46, departmentId: 3,
    items: [{ invItemId: 1, productVariantId: 3001, arcContractId: 61, arcContractLineId: 901, quantity: 18, uom: "litre", unitRate: 52.5 }],
  });

  fireEvent.change(screen.getByLabelText("Order qty for Milk"), { target: { value: "18" } });
  // Milk is contracted for F&B; Bleach (also selected) is not, so it stays off the MR.
  expect(screen.getByText(/1 selected item has no contract for this department/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Create MR draft \(1\)/ }));

  await screen.findByText(/Draft requisition/);
  expect(createReorderMrDraft).toHaveBeenCalledWith({
    hotelId: 46,
    departmentId: 3,
    items: [{ invItemId: 1, qty: 18, arcContractLineId: 901 }],
    clientEventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
  expect(screen.getByText("MR-2026-ABC12")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Open MR/ })).toHaveAttribute("href", "/dashboard/buyer/material-requisitions/77");

  submit.mockResolvedValue({ status: 1, data: { warnings: [] } });
  fireEvent.click(screen.getByRole("button", { name: /Submit for approval/ }));
  await screen.findByText(/submitted for approval/);
  expect(submit).toHaveBeenCalledWith(77);
});

it("a department with no contracts offers no MR rows", async () => {
  await mount();
  fireEvent.change(screen.getByLabelText("Department (MR)"), { target: { value: "4" } });
  expect(screen.getByRole("button", { name: /Create MR draft \(0\)/ })).toBeDisabled();
  expect(within(rowOf("Milk")).getByText("Contract in another department")).toBeInTheDocument();
});

it("shows the server's refusal and keeps the selection", async () => {
  await mount();
  createReorderMrDraft.mockRejectedValue(
    Object.assign(new Error("Request failed with status code 422"), {
      isAxiosError: true,
      response: {
        status: 422,
        data: { status: 0, code: "VALIDATION", message: "Set how many litre make one carton of Milk (item units) first", details: { field: "items", reason: "UOM_FACTOR_REQUIRED" } },
      },
    })
  );
  fireEvent.click(screen.getByRole("button", { name: /Create MR draft/ }));
  expect(await screen.findByText("Set how many litre make one carton of Milk (item units) first")).toBeInTheDocument();
  expect(screen.getByLabelText("Select Milk")).toBeChecked();
});

it("an empty or zero qty blocks the MR", async () => {
  await mount();
  fireEvent.change(screen.getByLabelText("Order qty for Milk"), { target: { value: "0" } });
  expect(screen.getByRole("button", { name: /Create MR draft/ })).toBeDisabled();
  expect(screen.getByText("Enter an order qty above 0 for every selected item.")).toBeInTheDocument();
});

it("Copy to RFQ puts the selected items on an RFQ draft and opens it", async () => {
  await mount();
  addProductsToDraft.mockResolvedValue({ status: 1, data: { rfq_id: 812 } });
  fireEvent.click(screen.getByRole("button", { name: /Copy to RFQ \(2\)/ }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=812"));
  expect(addProductsToDraft).toHaveBeenCalledWith({
    is_tender: 0,
    hotel_ids: [46],
    variants: [{ variant_id: 3001 }, { variant_id: 4002 }],
  });
});

it("says when stock has not started and when group orders are still unsplit", async () => {
  await mount(reorder({ stockStartedAt: null, groupOrdersOpen: [{ invItemId: 2, openQty: 12 }] }));
  expect(screen.getByText(/Stock has not started at this hotel yet/)).toBeInTheDocument();
  expect(screen.getByText(/Bleach \(12\)/)).toBeInTheDocument();
});

it("switching hotel goes through the URL", async () => {
  await mount();
  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
  expect(mockReplace).toHaveBeenCalledWith(
    { pathname: "/dashboard/buyer/inventory/reorder", query: { hotelId: 47 } },
    undefined,
    { shallow: true }
  );
});

it("hides the MR controls unless the server says the caller may raise one here", async () => {
  await mount(reorder({ can: undefined }));
  expect(screen.queryByRole("button", { name: /Create MR draft/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Department (MR)")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Copy to RFQ/ })).toBeInTheDocument();
});

it("a repeat of the same MR request keeps its clientEventId; a changed one gets a new key", async () => {
  await mount();
  createReorderMrDraft.mockRejectedValue(
    Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK", request: {} })
  );
  const create = () => fireEvent.click(screen.getByRole("button", { name: /Create MR draft/ }));
  create();
  await waitFor(() => expect(createReorderMrDraft).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button", { name: /Create MR draft/ })).not.toBeDisabled());
  create();
  await waitFor(() => expect(createReorderMrDraft).toHaveBeenCalledTimes(2));
  const [first, second] = createReorderMrDraft.mock.calls.map(([body]) => body.clientEventId);
  expect(second).toBe(first);

  await waitFor(() => expect(screen.getByRole("button", { name: /Create MR draft/ })).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText("Order qty for Milk"), { target: { value: "17" } });
  create();
  await waitFor(() => expect(createReorderMrDraft).toHaveBeenCalledTimes(3));
  expect(createReorderMrDraft.mock.calls[2][0].clientEventId).not.toBe(first);
});

it("a hotel in the link the caller can't see falls back to their default hotel and leaves the URL", async () => {
  mockQuery = { hotelId: "999", tab: "x" };
  getReorder.mockImplementation(async (hotelId) => {
    if (hotelId === "999") {
      throw Object.assign(new Error("Request failed with status code 404"), {
        isAxiosError: true,
        response: { status: 404, data: { status: 0, code: "NOT_FOUND", message: "Hotel not found" } },
      });
    }
    return reorder();
  });
  render(<ReorderPage />);
  await screen.findByText("Milk");
  expect(getReorder.mock.calls.map(([h]) => h)).toEqual(["999", undefined]);
  expect(mockReplace).toHaveBeenCalledWith(
    { pathname: "/dashboard/buyer/inventory/reorder", query: { tab: "x" } },
    undefined,
    { shallow: true }
  );
  expect(screen.queryByText("Hotel not found")).not.toBeInTheDocument();
});

it("Select all sits in the toolbar and toggles every row", async () => {
  await mount();
  const all = screen.getByRole("checkbox", { name: "Select all" });
  expect(all).not.toBeChecked();
  fireEvent.click(all);
  for (const name of ["Milk", "Bleach", "Napkins"]) expect(screen.getByLabelText(`Select ${name}`)).toBeChecked();
  fireEvent.click(all);
  for (const name of ["Milk", "Bleach", "Napkins"]) expect(screen.getByLabelText(`Select ${name}`)).not.toBeChecked();
});

it("spells out the on-order flag, a missing suggestion and what open MRs already cover", async () => {
  await mount(
    reorder({
      rows: [
        row({ onOrderIncomplete: true, suggestedQty: null, openMrQty: 6 }),
      ],
    })
  );
  const milk = within(rowOf("Milk"));
  expect(milk.getByText(/plus open orders in a unit with no conversion to the stock unit, not counted/)).toBeInTheDocument();
  expect(milk.getByText("No suggestion: set a max level to get one")).toBeInTheDocument();
  // Shown beside on order, not taken off it: on order stays 0.
  expect(milk.getByText("MR draft/pending: 6")).toBeInTheDocument();
  expect(within(milk.getByText("MR draft/pending: 6").closest("td")).getByText("0")).toBeInTheDocument();
});

it("each contract line says what the contract has left, and this hotel's share of a group contract", async () => {
  await mount(
    reorder({
      rows: [
        row({ contractedLines: [line({ departmentId: 3, arcContractLineId: 901, remainingQty: 120, isGroup: false, hotelRemainingQty: null })] }),
        row({
          invItemId: 2, displayName: "Bleach", stockUom: "bottle", productVariantId: 4002,
          contractedLines: [line({ departmentId: 3, arcContractLineId: 902, uom: "bottle", remainingQty: 300, isGroup: true, hotelRemainingQty: 40 })],
        }),
      ],
    })
  );
  expect(within(rowOf("Milk")).getByText("120 litre left on the contract")).toBeInTheDocument();
  expect(within(rowOf("Bleach")).getByText("300 bottle left on the contract · this hotel's share 40 bottle")).toBeInTheDocument();
});

it("lists the draft's warnings: items over this hotel's share of a group contract", async () => {
  await mount();
  createReorderMrDraft.mockResolvedValue({
    mrId: 77, mrNumber: "MR-2026-ABC12", hotelId: 46, departmentId: 3,
    items: [{ invItemId: 1, productVariantId: 3001, arcContractId: 61, arcContractLineId: 901, quantity: 16, uom: "litre", unitRate: 52.5 }],
    warnings: [{
      invItemId: 1, arcContractLineId: 901, hotelId: 46, quantity: 16, hotelRemainingQty: 10,
      message: "Milk: 16 is more than this hotel's remaining share (10). The group total has room, so the order can go ahead; head office will be told.",
    }],
  });
  fireEvent.click(screen.getByRole("button", { name: /Create MR draft/ }));
  const list = await screen.findByRole("list", { name: "Over this hotel's share" });
  expect(within(list).getByText(/Milk: 16 is more than this hotel's remaining share \(10\)/)).toBeInTheDocument();
});

it("a replayed request says the draft was already made", async () => {
  await mount();
  createReorderMrDraft.mockResolvedValue({
    mrId: 77, mrNumber: "MR-2026-ABC12", replayed: true, no_op: true, warnings: [],
    items: [{ invItemId: 1, arcContractLineId: 901, quantity: 16 }],
  });
  fireEvent.click(screen.getByRole("button", { name: /Create MR draft/ }));
  expect(await screen.findByText(/was already created by your earlier request, with 1 item/)).toBeInTheDocument();
});

it("a refusal over the contract's remaining quantity is shown on the row it concerns", async () => {
  await mount();
  createReorderMrDraft.mockRejectedValue(
    Object.assign(new Error("Request failed with status code 422"), {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          status: 0, code: "VALIDATION", message: "Milk: 16 litre is more than the contract has left (5 litre)",
          details: {
            field: "items", reason: "EXCEEDS_CONTRACT_REMAINING", remaining: 5, quantity: 16,
            lines: [{ index: 0, invItemId: 1, displayName: "Milk", reason: "EXCEEDS_CONTRACT_REMAINING", arcContractLineId: 901, quantity: 16, remaining: 5, uom: "litre" }],
          },
        },
      },
    })
  );
  fireEvent.click(screen.getByRole("button", { name: /Create MR draft/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Milk: 16 litre is more than the contract has left (5 litre)");
  expect(within(rowOf("Milk")).getByText("16 litre is more than the contract has left (5 litre)")).toBeInTheDocument();
});

it("an answered request gets a new key next time; only an unknown outcome keeps it", async () => {
  await mount();
  const create = () => fireEvent.click(screen.getByRole("button", { name: /Create MR draft/ }));
  const keys = () => createReorderMrDraft.mock.calls.map(([body]) => body.clientEventId);
  const idle = () => waitFor(() => expect(screen.getByRole("button", { name: /Create MR draft/ })).not.toBeDisabled());

  // A gateway error: the outcome is unknown, so the retry keeps the key.
  createReorderMrDraft.mockRejectedValueOnce(
    Object.assign(new Error("Request failed with status code 504"), { isAxiosError: true, response: { status: 504, data: "" } })
  );
  create();
  expect(await screen.findByRole("alert")).toHaveTextContent(/may have been created/);
  await idle();
  // A refusal is an answer: nothing was made, the next try is a new request.
  createReorderMrDraft.mockRejectedValueOnce(
    Object.assign(new Error("Request failed with status code 422"), {
      isAxiosError: true,
      response: { status: 422, data: { status: 0, code: "VALIDATION", message: "No", details: {} } },
    })
  );
  create();
  await waitFor(() => expect(createReorderMrDraft).toHaveBeenCalledTimes(2));
  await idle();
  createReorderMrDraft.mockResolvedValueOnce({ mrId: 77, mrNumber: "MR-1", items: [], warnings: [] });
  create();
  await screen.findByText(/Draft requisition/);
  const [a, b, c] = keys();
  expect(b).toBe(a);
  expect(c).not.toBe(b);
});

it("a load failure shows the server's message", async () => {
  mockQuery = {};
  getReorder.mockRejectedValue(
    Object.assign(new Error("Request failed with status code 404"), {
      isAxiosError: true,
      response: { status: 404, data: { status: 0, code: "NOT_FOUND", message: "Hotel not found" } },
    })
  );
  render(<ReorderPage />);
  expect(await screen.findByText("Hotel not found")).toBeInTheDocument();
});
