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

let mockQuery = {};
const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getStock } from "@/services/inventory";
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
