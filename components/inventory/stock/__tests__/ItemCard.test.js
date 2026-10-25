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
    canRead: true, canCreate: mockCanCreate, canUpdate: mockCanUpdate, canApprove: false, loading: false, hasPermission: () => mockCanUpdate,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStockItem: jest.fn(),
  getStockLedger: jest.fn(),
  saveHotelItem: jest.fn(),
}));

let mockCanUpdate = true;
let mockCanCreate = true;

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
  mockCanCreate = true;
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

  test("batches keep the server's FEFO order, the first marked Next out, with expiry badges on IST days", async () => {
    // 25 Oct 2026, 23:00 IST (17:30 UTC): late on the 25th, still the 25th in IST
    const now = jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-25T17:30:00.000Z"));
    try {
      getStockItem.mockResolvedValue(card({
        batches: [
          { batchNo: "B-70", expiryDate: "2026-10-24", qty: 1 },
          { batchNo: "B-71", expiryDate: "2026-10-25", qty: 1 },
          { batchNo: "B-72", expiryDate: "2026-10-26", qty: 1 },
          { batchNo: "B-73", expiryDate: "2026-11-24", qty: 1 },
          { batchNo: "B-74", expiryDate: "2026-11-25", qty: 1 },
          { batchNo: null, expiryDate: null, qty: 1 },
        ],
      }));
      render(<ItemCard hotelId="46" invItemId="9" />);
      const table = await screen.findByRole("table", { name: "Batches" });
      const rows = within(table).getAllByRole("row").slice(1);
      expect(rows.map((tr) => within(tr).getAllByRole("cell")[0].textContent)).toEqual([
        "B-70 Next out", "B-71", "B-72", "B-73", "B-74", "No batch",
      ]);
      expect(within(table).getAllByText("Next out")).toHaveLength(1);
      const expiryOf = (i) => within(rows[i]).getAllByRole("cell")[1].textContent;
      expect(expiryOf(0)).toBe("24 Oct 2026 Expired");
      expect(expiryOf(1)).toBe("25 Oct 2026 Expires today");
      expect(expiryOf(2)).toBe("26 Oct 2026 Expires in 1 day");
      expect(expiryOf(3)).toBe("24 Nov 2026 Expires in 30 days");
      expect(expiryOf(4)).toBe("25 Nov 2026");
      expect(expiryOf(5)).toBe("—");
    } finally {
      now.mockRestore();
    }
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

  test("the bin card filters by date and Clear dates goes back to everything", async () => {
    render(<ItemCard hotelId="46" invItemId="9" />);
    await screen.findByRole("table", { name: "Bin card" });
    expect(getStockLedger).toHaveBeenLastCalledWith(46, 9, { page: 1 });
    expect(screen.queryByRole("button", { name: "Clear dates" })).toBeNull();

    getStockLedger.mockResolvedValue({ rows: [], total: 0 });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } });
    await waitFor(() => expect(getStockLedger).toHaveBeenLastCalledWith(46, 9, { from: "2026-10-01", page: 1 }));
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-15" } });
    await waitFor(() =>
      expect(getStockLedger).toHaveBeenLastCalledWith(46, 9, { from: "2026-10-01", to: "2026-10-15", page: 1 })
    );
    expect(screen.getByLabelText("To")).toHaveAttribute("min", "2026-10-01");
    expect(screen.getByLabelText("From")).toHaveAttribute("max", "2026-10-15");
    expect(await screen.findByText("No movement in these dates")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
    await waitFor(() => expect(getStockLedger).toHaveBeenLastCalledWith(46, 9, { page: 1 }));
    expect(screen.getByLabelText("From")).toHaveValue("");
  });

  test("Print labels needs update rights; Adjustment and Mark out need create rights", async () => {
    mockCanUpdate = false;
    const { unmount } = render(<ItemCard hotelId="46" invItemId="9" />);
    await screen.findByRole("heading", { name: /Paneer/ });
    expect(screen.queryByRole("link", { name: /Print labels/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Adjustment/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/adjustments?hotelId=46");
    expect(screen.getByRole("link", { name: /Mark out/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/out?hotelId=46");
    unmount();

    mockCanUpdate = true;
    mockCanCreate = false;
    render(<ItemCard hotelId="46" invItemId="9" />);
    expect(await screen.findByRole("link", { name: /Print labels/ })).toHaveAttribute(
      "href", "/dashboard/buyer/inventory/labels?hotelId=46&items=9"
    );
    expect(screen.queryByRole("link", { name: /Adjustment/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Mark out/ })).toBeNull();
  });

  test("a bin label stops at 64 characters", async () => {
    render(<ItemCard hotelId="46" invItemId="9" />);
    expect(await screen.findByLabelText("Bin")).toHaveAttribute("maxLength", "64");
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
