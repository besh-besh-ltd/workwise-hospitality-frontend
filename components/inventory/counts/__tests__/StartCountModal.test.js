// Starting a count: FULL or SELECTED at a hotel, blind by default; an item
// already in an open or submitted count links to that count.
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getCompanySettings: jest.fn(),
  getStock: jest.fn(),
  startCount: jest.fn(),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => (
    <a href={typeof href === "string" ? href : ""} {...rest}>
      {children}
    </a>
  ),
}));

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getCompanySettings, getStock, startCount } from "@/services/inventory";
import StartCountModal from "../StartCountModal";

const HOTELS = [{ id: 46, name: "Orchid Mumbai" }];
const stockRow = (o) => ({ invItemId: 7, displayName: "Basmati rice", itemCode: "RICE-01", stockUom: "kg", qty: 10, binLabel: "A-01", belowReorder: false, ...o });
const refusal = (status, data) => Object.assign(new Error(data.message), { isAxiosError: true, response: { status, data } });

const mount = async (props = {}) => {
  const onStarted = jest.fn();
  render(<StartCountModal show hotels={HOTELS} onHide={jest.fn()} onStarted={onStarted} {...props} />);
  await act(async () => {});
  return { onStarted };
};

beforeEach(() => {
  jest.clearAllMocks();
  getCompanySettings.mockResolvedValue({ countFreeze: false });
  getStock.mockResolvedValue({
    hotelId: 46,
    stockStartedAt: "2026-10-01T00:00:00.000Z",
    hotels: HOTELS,
    rows: [stockRow(), stockRow({ invItemId: 8, displayName: "Sugar", itemCode: "SUG-01", binLabel: "B-02" })],
    total: 2,
  });
});

describe("StartCountModal", () => {
  it("starts a blind full count at the only hotel", async () => {
    const started = { id: 41, countNumber: "CNT/46/2026-27/00003" };
    startCount.mockResolvedValue(started);
    const { onStarted } = await mount();

    expect(screen.getByLabelText("Hotel")).toHaveValue("46");
    fireEvent.click(screen.getByRole("button", { name: "Start count" }));
    await act(async () => {});
    expect(startCount).toHaveBeenCalledWith({ hotelId: 46, scope: "FULL", isBlind: true });
    expect(onStarted).toHaveBeenCalledWith(started);
  });

  it("a selected count sends the picked items", async () => {
    startCount.mockResolvedValue({ id: 42 });
    await mount();

    fireEvent.click(screen.getByLabelText(/Selected items/));
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Start count" })).toBeDisabled();
    fireEvent.click(await screen.findByLabelText(/Sugar/));
    fireEvent.click(screen.getByRole("button", { name: "Start count of 1 item" }));
    await act(async () => {});
    expect(startCount).toHaveBeenCalledWith({ hotelId: 46, scope: "SELECTED", isBlind: true, invItemIds: [8] });
  });

  it("an item already being counted links to that count, and can be left out", async () => {
    startCount.mockRejectedValueOnce(
      refusal(409, {
        status: 0,
        code: "CONFLICT",
        message: "Some of these items are already being counted in CNT/46/2026-27/00002",
        details: { countId: 40, countNumber: "CNT/46/2026-27/00002", invItemIds: [8] },
      })
    );
    await mount();
    fireEvent.click(screen.getByLabelText(/Selected items/));
    await act(async () => {});
    fireEvent.click(await screen.findByLabelText(/Basmati rice/));
    fireEvent.click(screen.getByLabelText(/Sugar/));
    fireEvent.click(screen.getByRole("button", { name: "Start count of 2 items" }));
    await act(async () => {});

    expect(screen.getByRole("link", { name: "CNT/46/2026-27/00002" })).toHaveAttribute("href", "/dashboard/buyer/inventory/counts/40");
    fireEvent.click(screen.getByRole("button", { name: "Leave them out" }));
    expect(screen.getByRole("button", { name: "Start count of 1 item" })).toBeEnabled();
  });

  it("says that an open count freezes stock movements when count freeze is on", async () => {
    getCompanySettings.mockResolvedValue({ countFreeze: true });
    await mount();
    expect(screen.getByText(/Count freeze is on: while this count is open, mark-out, returns and adjustments at Orchid Mumbai are blocked/)).toBeInTheDocument();
  });
});
