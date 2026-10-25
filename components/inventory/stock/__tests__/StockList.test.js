// Stock list: hotel picker from the server's own list, search, the
// below-reorder filter, totals and the "Stock not started yet" banner.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, pathname: "/dashboard/buyer/inventory/stock", push: mockPush, replace: jest.fn() }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/services/inventory", () => ({ __esModule: true, getStock: jest.fn() }));
jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getBulkPermissions: jest.fn((moduleKey, ids) =>
    Promise.resolve({ status: 1, data: { permissions: { [moduleKey]: mockRights[ids[0]] || ["read"] } } })
  ),
}));

let mockQuery = {};
let mockRights = {};
const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getStock } from "@/services/inventory";
import { getBulkPermissions } from "@/services/rbac";
import StockList from "../StockList";

const HOTELS = [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }];
const RICE = {
  invItemId: 9, displayName: "Basmati rice", itemCode: "RICE-25", stockUom: "bag", qty: 4, avgCost: 1800, value: 7200,
  minQty: 2, reorderLevel: 5, maxQty: 20, binLabel: "A-01", belowReorder: true, lastMovementAt: "2026-10-24T06:00:00.000Z",
};
const SOAP = {
  invItemId: 11, displayName: "Dish soap", itemCode: null, stockUom: "piece", qty: 120, avgCost: 45.5, value: 5460,
  minQty: null, reorderLevel: null, maxQty: null, binLabel: null, belowReorder: false, lastMovementAt: null,
};
const stock = (over = {}) => ({
  hotelId: 46,
  stockStartedAt: "2026-10-01T04:30:00.000Z",
  hotels: HOTELS,
  totals: { qtyItems: 2, value: 12660 },
  rows: [RICE, SOAP],
  total: 2,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  mockRights = { 46: ["read", "create"], 47: ["read"] };
  getStock.mockResolvedValue(stock());
});

describe("StockList", () => {
  test("renders rows, totals and the reorder flag", async () => {
    render(<StockList />);
    const table = await screen.findByRole("table", { name: "Stock on hand" });
    const rice = within(table).getByText("Basmati rice").closest("tr");
    expect(within(rice).getByText("RICE-25")).toBeInTheDocument();
    expect(within(rice).getByText("A-01")).toBeInTheDocument();
    expect(within(rice).getByText("Below reorder")).toBeInTheDocument();
    const soap = within(table).getByText("Dish soap").closest("tr");
    expect(within(soap).queryByText("Below reorder")).toBeNull();
    expect(screen.getByText("₹12,660.00")).toBeInTheDocument();
    expect(getStock).toHaveBeenCalledWith({ page: 1 });
    expect(screen.queryByText(/Stock not started yet/)).toBeNull();
  });

  test("the server's default hotel is shown without asking for it again", async () => {
    render(<StockList />);
    await screen.findByRole("table", { name: "Stock on hand" });
    await act(async () => {});
    expect(getStock).toHaveBeenCalledTimes(1);
    expect(getStock).toHaveBeenCalledWith({ page: 1 });
  });

  test("before stock has started no item is flagged below reorder", async () => {
    getStock.mockResolvedValue(stock({ stockStartedAt: null }));
    render(<StockList />);
    const table = await screen.findByRole("table", { name: "Stock on hand" });
    expect(within(table).queryByText("Below reorder")).toBeNull();
    expect(screen.getByRole("status", { name: "Stock not started yet" })).toBeInTheDocument();
  });

  test("Mark out and Adjustments show only with the rights at the hotel shown", async () => {
    render(<StockList />);
    expect(await screen.findByRole("link", { name: /Mark out/ })).toHaveAttribute(
      "href", "/dashboard/buyer/inventory/out?hotelId=46"
    );
    expect(screen.getByRole("link", { name: /Adjustments/ })).toHaveAttribute(
      "href", "/dashboard/buyer/inventory/adjustments?hotelId=46"
    );
    expect(getBulkPermissions).toHaveBeenCalledWith("inventory", [46], null);

    getStock.mockResolvedValue(stock({ hotelId: 47 }));
    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
    await waitFor(() => expect(getBulkPermissions).toHaveBeenCalledWith("inventory", [47], null));
    await waitFor(() => expect(screen.queryByRole("link", { name: /Mark out/ })).toBeNull());
    expect(screen.queryByRole("link", { name: /Adjustments/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Scan/ })).toBeInTheDocument();
  });

  test("an approver without create rights still gets to Adjustments, not Mark out", async () => {
    mockRights = { 46: ["read", "approve"] };
    render(<StockList />);
    expect(await screen.findByRole("link", { name: /Adjustments/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Mark out/ })).toBeNull();
  });

  test("pages through a long list at the same hotel", async () => {
    getStock.mockResolvedValue(stock({ total: 120 }));
    render(<StockList />);
    await screen.findByRole("table", { name: "Stock on hand" });
    expect(screen.getByText(/^Page/).textContent).toMatch(/Page 1 of 3 · 120 items/);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(getStock).toHaveBeenLastCalledWith({ hotelId: 46, page: 2 }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Previous page" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(getStock).toHaveBeenLastCalledWith({ hotelId: 46, page: 3 }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled());
  });

  test("a hotel from an old link that isn't ours falls back to the default", async () => {
    const gone = Object.assign(new Error("Not found"), { response: { status: 404, data: { code: "NOT_FOUND", message: "Not found" } } });
    getStock.mockImplementation((params) => (params.hotelId === 99 ? Promise.reject(gone) : Promise.resolve(stock())));
    render(<StockList initialHotelId="99" />);
    expect(await screen.findByRole("table", { name: "Stock on hand" })).toBeInTheDocument();
    expect(getStock.mock.calls.map((c) => c[0])).toEqual([{ hotelId: 99, page: 1 }, { page: 1 }]);
    expect(screen.getByLabelText("Hotel")).toHaveValue("46");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("stock list shows not-started banner", async () => {
    getStock.mockResolvedValue(stock({ stockStartedAt: null, rows: [], total: 0, totals: { qtyItems: 0, value: 0 } }));
    render(<StockList />);
    const banner = await screen.findByRole("status", { name: "Stock not started yet" });
    expect(banner).toHaveTextContent("Stock not started yet");
    expect(within(banner).getByRole("link", { name: /Start a count/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/counts");
    expect(within(banner).getByRole("link", { name: /Import opening stock/ })).toHaveAttribute(
      "href",
      "/dashboard/buyer/inventory/setup?tab=opening&hotelId=46"
    );
  });

  test("the hotel picker lists the server's hotels and refetches", async () => {
    render(<StockList />);
    const picker = await screen.findByLabelText("Hotel");
    expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual(["Orchid Mumbai", "Orchid Pune"]);
    expect(picker).toHaveValue("46");
    fireEvent.change(picker, { target: { value: "47" } });
    await waitFor(() => expect(getStock).toHaveBeenLastCalledWith({ hotelId: 47, page: 1 }));
  });

  test("search and the below-reorder filter go to the server", async () => {
    render(<StockList />);
    await screen.findByRole("table", { name: "Stock on hand" });
    fireEvent.change(screen.getByLabelText("Search items"), { target: { value: "rice" } });
    await waitFor(() => expect(getStock).toHaveBeenLastCalledWith({ hotelId: 46, search: "rice", page: 1 }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Below reorder only" }));
    await waitFor(() =>
      expect(getStock).toHaveBeenLastCalledWith({ hotelId: 46, search: "rice", belowReorder: true, page: 1 })
    );
  });

  test("a row opens the item card at that hotel", async () => {
    render(<StockList />);
    fireEvent.click(await screen.findByText("Basmati rice"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/stock/46/9");
  });

  test("no readable hotel says so", async () => {
    getStock.mockResolvedValue({ hotelId: null, stockStartedAt: null, hotels: [], totals: { qtyItems: 0, value: 0 }, rows: [], total: 0 });
    render(<StockList />);
    expect(await screen.findByText(/don't have stock access at any hotel/i)).toBeInTheDocument();
    expect(screen.queryByText(/Stock not started yet/)).toBeNull();
  });
});
