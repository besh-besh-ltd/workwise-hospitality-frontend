// D4: the Inventory Overview lays out GET /inventory/overview with the
// dashboard's KPI tiles and rank lists. The numbers are the server's; the page
// only formats them, so these tests feed a payload and read what a person sees.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: "/dashboard/buyer/inventory", query: {}, push: jest.fn(), back: jest.fn() }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("@/services/inventory", () => ({ __esModule: true, getInventoryOverview: jest.fn() }));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getInventoryOverview } from "@/services/inventory";
import OverviewPage from "../OverviewPage";

const overview = (over = {}) => ({
  hotels: [
    { id: 10101, name: "Hotel A-1" },
    { id: 10102, name: "Hotel A-2" },
  ],
  stockValueByHotel: [
    { hotelId: 10101, hotelName: "Hotel A-1", value: 120000 },
    { hotelId: 10102, hotelName: "Hotel A-2", value: 30000 },
  ],
  lowStockCount: 3,
  deliveries: { dueToday: 1, dueThisWeek: 4, overdue: 2 },
  outThisMonthByDept: [
    { departmentId: 10203, departmentName: "F&B", value: 45250 },
    { departmentId: 10204, departmentName: "Housekeeping", value: 8000 },
  ],
  wastageThisMonth: 2500,
  stockNotStartedHotels: [{ hotelId: 10102, hotelName: "Hotel A-2" }],
  ...over,
});

// KpiTile: tile > row > label.
const tile = (label) => screen.getByText(label).parentElement.parentElement;

beforeEach(() => {
  getInventoryOverview.mockReset();
});

it("overview renders KPIs from getInventoryOverview", async () => {
  getInventoryOverview.mockResolvedValue(overview());
  render(<OverviewPage />);

  expect(await screen.findByText("Stock value")).toBeInTheDocument();
  expect(getInventoryOverview).toHaveBeenCalledWith({});

  // Stock value is the sum over hotels (₹1,50,000 → ₹1.5L).
  expect(tile("Stock value")).toHaveTextContent("₹1.5L");
  expect(tile("Stock value")).toHaveTextContent("2 hotels");
  expect(tile("Low stock")).toHaveTextContent("3");
  expect(tile("Overdue deliveries")).toHaveTextContent("2");
  expect(tile("Overdue deliveries")).toHaveTextContent("1 due today · 4 due this week");
  expect(tile("Wastage this month")).toHaveTextContent("₹2.5K");

  // The two rank lists carry the per-hotel and per-department figures.
  expect(screen.getByText("₹1,20,000")).toBeInTheDocument();
  expect(screen.getByText("₹45,250")).toBeInTheDocument();
  expect(screen.getByText("Housekeeping")).toBeInTheDocument();

  // A hotel whose stock has not started is called out.
  expect(screen.getByText("Stock not started at 1 hotel")).toBeInTheDocument();
});

it("narrows to one hotel through the picker", async () => {
  getInventoryOverview.mockResolvedValueOnce(overview());
  getInventoryOverview.mockResolvedValueOnce(
    overview({
      hotels: [{ id: 10101, name: "Hotel A-1" }],
      stockValueByHotel: [{ hotelId: 10101, hotelName: "Hotel A-1", value: 120000 }],
      lowStockCount: 1,
      deliveries: { dueToday: 0, dueThisWeek: 1, overdue: 0 },
      stockNotStartedHotels: [],
    })
  );
  render(<OverviewPage />);
  await screen.findByText("Stock value");

  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "10101" } });
  await waitFor(() => expect(getInventoryOverview).toHaveBeenLastCalledWith({ hotelId: "10101" }));
  await waitFor(() => expect(tile("Stock value")).toHaveTextContent("₹1.2L"));
  expect(tile("Overdue deliveries")).toHaveTextContent("0 due today · 1 due this week");
  expect(screen.queryByText(/Stock not started/)).not.toBeInTheDocument();

  // The picker still offers every hotel after narrowing.
  const picker = screen.getByLabelText("Hotel");
  expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "All hotels",
    "Hotel A-1",
    "Hotel A-2",
  ]);
});

it("shows access denied when no hotel is in scope", async () => {
  getInventoryOverview.mockResolvedValue(
    overview({ hotels: [], stockValueByHotel: [], outThisMonthByDept: [], stockNotStartedHotels: [], lowStockCount: 0 })
  );
  render(<OverviewPage />);
  expect(await screen.findByText(/inventory or goods-receipt access/)).toBeInTheDocument();
  expect(screen.queryByText("Stock value")).not.toBeInTheDocument();
});

it("shows the server's message when the overview fails", async () => {
  getInventoryOverview.mockRejectedValueOnce({ response: { status: 500, data: { message: "Database unavailable" } } });
  getInventoryOverview.mockResolvedValueOnce(overview());
  render(<OverviewPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Stock value")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
