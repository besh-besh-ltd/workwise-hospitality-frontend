// Labels: pick items, copies and a layout, then print through B4's label API.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, pathname: "/dashboard/buyer/inventory/labels", push: jest.fn(), replace: jest.fn() }),
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
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStock: jest.fn(),
  listItems: jest.fn(),
  getStockItem: jest.fn(),
  printItemLabels: jest.fn(),
}));

jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getBulkPermissions: jest.fn((moduleKey, ids) =>
    Promise.resolve({ status: 1, data: { permissions: { [moduleKey]: mockRights[ids[0]] || ["read"] } } })
  ),
}));

let mockQuery = {};
let mockRights = {};

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getStock, listItems, getStockItem, printItemLabels } from "@/services/inventory";
import LabelsPage from "../LabelsPage";

const RICE = { id: 9, displayName: "Basmati rice", itemCode: "RICE-25", stockUom: "bag", trackExpiry: false, variants: [], barcodes: [] };
const SOAP = { id: 11, displayName: "Dish soap", itemCode: null, stockUom: "piece", trackExpiry: false, variants: [], barcodes: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  mockRights = { 46: ["read", "update"], 47: ["read", "update"] };
  getStock.mockResolvedValue({
    hotelId: 46, stockStartedAt: null, hotels: [{ id: 46, name: "Orchid Mumbai" }], totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
  });
  listItems.mockImplementation(({ search } = {}) =>
    Promise.resolve({ rows: [RICE, SOAP].filter((r) => !search || r.displayName.toLowerCase().includes(search.toLowerCase())), total: 2 })
  );
  window.open = jest.fn(() => ({}));
});

describe("LabelsPage", () => {
  test("prints the picked items with their copies and layout", async () => {
    printItemLabels.mockResolvedValue({ url: "https://s3.example/labels.pdf" });
    render(<LabelsPage />);
    fireEvent.change(await screen.findByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await screen.findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(screen.getByLabelText("Find an item"), { target: { value: "soap" } });
    fireEvent.click(await screen.findByRole("button", { name: /Add Dish soap/ }));
    fireEvent.change(screen.getByLabelText("Copies of Basmati rice"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("radio", { name: /Thermal/ }));
    fireEvent.click(screen.getByRole("button", { name: "Print 13 labels" }));

    await waitFor(() => expect(printItemLabels).toHaveBeenCalledTimes(1));
    expect(printItemLabels).toHaveBeenCalledWith({
      layout: "THERMAL_50x25",
      hotelId: 46,
      items: [{ invItemId: 9, copies: 12 }, { invItemId: 11, copies: 1 }],
    });
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://s3.example/labels.pdf", "_blank", "noopener"));
    expect(screen.getByRole("link", { name: /Open the labels PDF/ })).toHaveAttribute("href", "https://s3.example/labels.pdf");
  });

  test("too many labels are refused before printing", async () => {
    render(<LabelsPage />);
    fireEvent.change(await screen.findByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await screen.findByRole("button", { name: /Add Basmati rice/ }));
    fireEvent.change(screen.getByLabelText("Copies of Basmati rice"), { target: { value: "1001" } });
    expect(screen.getByText(/at most 1,000 labels/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print/ })).toBeDisabled();
  });

  test("an item that tracks expiry takes a batch and expiry, and they print", async () => {
    printItemLabels.mockResolvedValue({ url: "https://s3.example/milk.pdf" });
    listItems.mockResolvedValue({
      rows: [{ id: 21, displayName: "Milk 1L", itemCode: "MILK-1", stockUom: "packet", trackExpiry: true, variants: [], barcodes: [] }],
      total: 1,
    });
    render(<LabelsPage />);
    fireEvent.change(await screen.findByLabelText("Find an item"), { target: { value: "milk" } });
    fireEvent.click(await screen.findByRole("button", { name: /Add Milk 1L/ }));
    fireEvent.change(screen.getByLabelText("Batch of Milk 1L"), { target: { value: " B-77 " } });
    fireEvent.change(screen.getByLabelText("Expiry of Milk 1L"), { target: { value: "2026-11-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Print 1 label" }));
    await waitFor(() =>
      expect(printItemLabels).toHaveBeenCalledWith({
        layout: "A4_65",
        hotelId: 46,
        items: [{ invItemId: 21, copies: 1, batchNo: "B-77", expiryDate: "2026-11-30" }],
      })
    );
  });

  test("an item without expiry tracking has no batch or expiry fields", async () => {
    render(<LabelsPage />);
    fireEvent.change(await screen.findByLabelText("Find an item"), { target: { value: "rice" } });
    fireEvent.click(await screen.findByRole("button", { name: /Add Basmati rice/ }));
    expect(screen.queryByLabelText("Expiry of Basmati rice")).toBeNull();
  });

  test("a hotel without update rights is corrected before any item is looked up", async () => {
    getStock.mockResolvedValue({
      hotelId: 46, stockStartedAt: null, totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
      hotels: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }],
    });
    mockRights = { 46: ["read"], 47: ["read", "update"] };
    getStockItem.mockResolvedValue({ item: { ...RICE }, hotel: { id: 47, name: "Orchid Pune" } });
    render(<LabelsPage initialHotelId="46" initialItems="9" />);
    const picked = await screen.findByRole("list", { name: "Items to label" });
    expect(await within(picked).findByText("Basmati rice")).toBeInTheDocument();
    expect(getStockItem).toHaveBeenCalledTimes(1);
    expect(getStockItem).toHaveBeenCalledWith(47, 9);
    const picker = screen.getByLabelText("Bins from");
    expect(picker).toHaveValue("47");
    expect(within(picker).queryByRole("option", { name: "Orchid Mumbai" })).toBeNull();
  });

  test("without update rights anywhere, printing is off and says why", async () => {
    mockRights = { 46: ["read"] };
    render(<LabelsPage />);
    expect(await screen.findByText(/Printing labels needs inventory update rights/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print labels" })).toBeDisabled();
  });

  test("?items= preselects items from the item card", async () => {
    getStockItem.mockResolvedValue({ item: { ...RICE }, hotel: { id: 46, name: "Orchid Mumbai" } });
    render(<LabelsPage initialHotelId="46" initialItems="9" />);
    const picked = await screen.findByRole("list", { name: "Items to label" });
    expect(await within(picked).findByText("Basmati rice")).toBeInTheDocument();
    expect(getStockItem).toHaveBeenCalledWith(46, 9);
  });
});
