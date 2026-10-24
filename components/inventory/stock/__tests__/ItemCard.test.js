// Item card: balance, levels form, batches, barcodes and the bin card.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, pathname: "/dashboard/buyer/inventory/stock/[hotelId]/[itemId]", push: jest.fn(), replace: jest.fn() }),
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
    canRead: true, canCreate: true, canUpdate: mockCanUpdate, canApprove: false, loading: false, hasPermission: () => mockCanUpdate,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStockItem: jest.fn(),
  getStockLedger: jest.fn(),
  saveHotelItem: jest.fn(),
}));

let mockCanUpdate = true;

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getStockItem, getStockLedger, saveHotelItem } from "@/services/inventory";
import ItemCard from "../ItemCard";

const movement = (over = {}) => ({
  id: 1, postedAt: "2026-10-20T05:30:00.000Z", type: "GRN_IN", qty: 10, unitCost: 1800, value: 18000,
  qtyAfter: 10, avgCostAfter: 1800, departmentId: null, departmentName: null, sourceType: "GRN", sourceId: 900,
  sourceLineId: 1, docNumber: "GRN/46/2026-27/00012", reasonCode: null, batchNo: null, expiryDate: null,
  postedBy: 3, postedByName: "Asha Menon", ...over,
});

const card = (over = {}) => ({
  item: {
    id: 9, displayName: "Paneer", itemCode: "PAN-1", stockUom: "kg", trackExpiry: true, minShelfLifeDays: 3,
    overReceiptTolerancePct: null, isActive: true, variants: [{ productVariantId: 502, name: "Paneer 1kg" }],
  },
  hotel: { id: 46, name: "Orchid Mumbai", stockStartedAt: "2026-10-01T04:30:00.000Z" },
  balance: { qty: 6, avgCost: 320, value: 1920, lastMovementAt: "2026-10-22T05:30:00.000Z" },
  levels: { minQty: 2, reorderLevel: 5, maxQty: 20, binLabel: "C-02", belowReorder: false },
  barcodes: [{ id: 1, code: "8901234567890", packFactor: 1, source: "MANUFACTURER" }],
  batches: [{ batchNo: "B-77", expiryDate: "2026-11-02", qty: 6 }],
  recentMovements: [movement()],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCanUpdate = true;
  getStockItem.mockResolvedValue(card());
  getStockLedger.mockResolvedValue({
    rows: [
      movement({ id: 2, type: "MARK_OUT", qty: -4, qtyAfter: 6, value: -1280, unitCost: 320, sourceType: "OUT", sourceId: 31, docNumber: "OUT/46/2026-27/00003", departmentName: "Kitchen", postedAt: "2026-10-22T05:30:00.000Z" }),
      movement(),
    ],
    total: 2,
  });
});

describe("ItemCard", () => {
  test("shows the balance, batches, barcodes and bin card", async () => {
    render(<ItemCard hotelId="46" invItemId="9" />);
    expect(await screen.findByRole("heading", { name: /Paneer/ })).toBeInTheDocument();
    expect(getStockItem).toHaveBeenCalledWith(46, 9);
    expect(screen.getByText("₹1,920.00")).toBeInTheDocument();

    const batches = screen.getByRole("table", { name: "Batches" });
    expect(within(batches).getByText("B-77")).toBeInTheDocument();
    expect(within(batches).getByText("2 Nov 2026")).toBeInTheDocument();
    expect(screen.getByText("8901234567890")).toBeInTheDocument();

    const bin = await screen.findByRole("table", { name: "Bin card" });
    expect(getStockLedger).toHaveBeenCalledWith(46, 9, { page: 1 });
    const out = within(bin).getByText("OUT/46/2026-27/00003").closest("tr");
    expect(within(out).getByText("Marked out")).toBeInTheDocument();
    expect(within(out).getByText("Kitchen")).toBeInTheDocument();
    const grnLink = within(bin).getByRole("link", { name: "GRN/46/2026-27/00012" });
    expect(grnLink).toHaveAttribute("href", "/dashboard/buyer/inventory/grn/900");
  });

  test("saves reorder levels for the hotel", async () => {
    saveHotelItem.mockResolvedValue({ invItemId: 9, minQty: 2, reorderLevel: 8, maxQty: 20, binLabel: "C-03" });
    render(<ItemCard hotelId="46" invItemId="9" />);
    const form = await screen.findByRole("form", { name: "Levels at this hotel" });
    expect(within(form).getByLabelText("Reorder level")).toHaveValue("5");
    fireEvent.change(within(form).getByLabelText("Reorder level"), { target: { value: "8" } });
    fireEvent.change(within(form).getByLabelText("Bin"), { target: { value: "C-03" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save levels" }));
    await waitFor(() =>
      expect(saveHotelItem).toHaveBeenCalledWith(46, 9, { minQty: 2, reorderLevel: 8, maxQty: 20, binLabel: "C-03" })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  test("levels out of order are refused before saving", async () => {
    render(<ItemCard hotelId="46" invItemId="9" />);
    const form = await screen.findByRole("form", { name: "Levels at this hotel" });
    fireEvent.change(within(form).getByLabelText("Min qty"), { target: { value: "9" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save levels" }));
    expect(await within(form).findByText(/Min qty can't be more than the reorder level/)).toBeInTheDocument();
    expect(saveHotelItem).not.toHaveBeenCalled();
  });

  test("without inventory.update the levels are read-only", async () => {
    mockCanUpdate = false;
    render(<ItemCard hotelId="46" invItemId="9" />);
    await screen.findByRole("heading", { name: /Paneer/ });
    expect(screen.queryByRole("button", { name: "Save levels" })).toBeNull();
    expect(screen.getByText("C-02")).toBeInTheDocument();
  });

  test("an item with nothing at the hotel shows the not-stocked state", async () => {
    getStockItem.mockResolvedValue(
      card({
        balance: { qty: 0, avgCost: 0, value: 0, lastMovementAt: null },
        levels: { minQty: null, reorderLevel: null, maxQty: null, binLabel: null, belowReorder: false },
        batches: [],
        recentMovements: [],
      })
    );
    getStockLedger.mockResolvedValue({ rows: [], total: 0 });
    render(<ItemCard hotelId="46" invItemId="9" />);
    expect(await screen.findByText("Not stocked at Orchid Mumbai yet")).toBeInTheDocument();
    // levels can still be set up ahead of the first receipt
    expect(screen.getByRole("form", { name: "Levels at this hotel" })).toBeInTheDocument();
  });

  test("an unknown item says not found", async () => {
    const err = new Error("nf");
    err.isAxiosError = true;
    err.response = { status: 404, data: { status: 2, message: "Item not found", code: "NOT_FOUND", details: {} } };
    getStockItem.mockRejectedValue(err);
    render(<ItemCard hotelId="46" invItemId="999" />);
    expect(await screen.findByText("Item not found")).toBeInTheDocument();
  });
});
