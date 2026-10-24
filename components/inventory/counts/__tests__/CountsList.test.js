// The counts list: every count at the user's hotels, with status and hotel
// filters and Start count for users who may create.
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getStock: jest.fn(),
  listCounts: jest.fn(),
  startCount: jest.fn(),
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: jest.fn(({ hotelIds }) => ({ canCreate: hotelIds.length > 0 })),
}));
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn(), events: { on: jest.fn(), off: jest.fn() } }) }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => (
    <a href={typeof href === "string" ? href : ""} {...rest}>
      {children}
    </a>
  ),
}));

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getStock, listCounts } from "@/services/inventory";
import CountsList from "../CountsList";

const HOTELS = [
  { id: 46, name: "Orchid Mumbai" },
  { id: 47, name: "Orchid Pune" },
];
const refusal = (status, data) => Object.assign(new Error(data.message), { isAxiosError: true, response: { status, data } });

beforeEach(() => {
  jest.clearAllMocks();
  [getStock, listCounts].forEach((fn) => fn.mockReset());
  listCounts.mockResolvedValue({ rows: [], total: 0 });
});

describe("CountsList", () => {
  it("a failed hotels fetch says so with Retry, not that the user has no stock access", async () => {
    getStock
      .mockRejectedValueOnce(refusal(500, { status: 3, message: "Could not load your hotels" }))
      .mockResolvedValueOnce({ hotels: HOTELS, rows: [], total: 0 });
    render(<CountsList />);
    await act(async () => {});

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your hotels");
    expect(screen.queryByText(/don.t have stock access/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Start count" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => {});
    expect(getStock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Start count" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: "Orchid Pune" })).toBeInTheDocument();
  });

  it("a user with no stock hotel is told so", async () => {
    getStock.mockResolvedValue({ hotels: [], rows: [], total: 0 });
    render(<CountsList />);
    await act(async () => {});
    expect(screen.getByText(/don.t have stock access at any hotel yet/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
