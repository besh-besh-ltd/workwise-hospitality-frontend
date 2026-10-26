// Awaiting deliveries: the receiver's worklist. Filter tabs, hotel and search
// go to the server; a row (or a scanned PO / dispatch QR) opens Receive.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/dashboard/buyer/inventory/receive", push: mockPush, replace: jest.fn() }),
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
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => function MockCamera() { return <div data-testid="camera" />; },
}));
jest.mock("@/components/inventory/scan/scanFeedback", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    unlock: jest.fn(),
    installUnlock: jest.fn(() => () => {}),
    isMuted: jest.fn(() => false),
    setMuted: jest.fn(),
  },
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getAwaitingDeliveries: jest.fn(),
  resolveScan: jest.fn(),
}));

const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getAwaitingDeliveries, resolveScan } from "@/services/inventory";
import AwaitingList from "../AwaitingList";

const row = (over = {}) => ({
  poId: 52, poNumber: "PO/2026/0052", vendorName: "Fresh Farms", hotelId: 46, hotelName: "Orchid Mumbai",
  nextDueDate: "2026-10-20", overdue: true, openLineCount: 3, openValue: 52000, isCallOff: false,
  receiptLegacy: false, hasInTransitDispatch: true, ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  getAwaitingDeliveries.mockResolvedValue({
    rows: [row(), row({ poId: 53, poNumber: "PO/2026/0053", overdue: false, nextDueDate: null, hasInTransitDispatch: false, isCallOff: true })],
    total: 2,
    hotels: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }],
  });
});

describe("AwaitingList", () => {
  it("awaiting list filter tabs call getAwaitingDeliveries with filter", async () => {
    render(<AwaitingList />);
    await screen.findByText("PO/2026/0052");
    expect(getAwaitingDeliveries).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "all", page: 1 }));

    fireEvent.click(screen.getByRole("tab", { name: /Overdue/ }));
    await waitFor(() =>
      expect(getAwaitingDeliveries).toHaveBeenLastCalledWith(expect.objectContaining({ filter: "overdue", page: 1 }))
    );
    expect(screen.getByRole("tab", { name: /Overdue/ })).toHaveAttribute("aria-selected", "true");

    for (const [name, filter] of [
      [/Due today/, "due_today"], [/This week/, "this_week"], [/Unscheduled/, "unscheduled"], [/Older POs/, "older"],
    ]) {
      fireEvent.click(screen.getByRole("tab", { name }));
      await waitFor(() => expect(getAwaitingDeliveries).toHaveBeenLastCalledWith(expect.objectContaining({ filter })));
    }
  });

  it("shows due date, overdue badge, call-off and in-transit flags", async () => {
    render(<AwaitingList />);
    const first = (await screen.findByText("PO/2026/0052")).closest("tr");
    expect(within(first).getByText("Overdue")).toBeInTheDocument();
    expect(within(first).getByText("20 Oct 2026")).toBeInTheDocument();
    expect(within(first).getByText("In transit")).toBeInTheDocument();
    const second = screen.getByText("PO/2026/0053").closest("tr");
    expect(within(second).getByText("Not scheduled")).toBeInTheDocument();
    expect(within(second).getByText("Call-off")).toBeInTheDocument();
  });

  it("opening a row goes to Receive for that PO at that hotel", async () => {
    render(<AwaitingList />);
    fireEvent.click(await screen.findByText("PO/2026/0052"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/52?hotelId=46");
  });

  it("filters by hotel and search", async () => {
    render(<AwaitingList />);
    await screen.findByText("PO/2026/0052");
    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
    await waitFor(() => expect(getAwaitingDeliveries).toHaveBeenLastCalledWith(expect.objectContaining({ hotelId: 47 })));
    fireEvent.change(screen.getByLabelText("Search PO or vendor"), { target: { value: "fresh" } });
    await waitFor(() => expect(getAwaitingDeliveries).toHaveBeenLastCalledWith(expect.objectContaining({ search: "fresh" })));
  });

  it("the hotel filter offers the hotels the server lists for this user, nothing else", async () => {
    getAwaitingDeliveries.mockResolvedValue({ rows: [row()], total: 1, hotels: [{ id: 46, name: "Orchid Mumbai" }] });
    render(<AwaitingList />);
    await screen.findByText("PO/2026/0052");
    // One hotel in scope: no filter at all (a company mapping never adds one).
    expect(screen.queryByLabelText("Hotel")).toBeNull();
  });

  it("keeps the hotel choices while a filtered list is empty", async () => {
    render(<AwaitingList />);
    await screen.findByText("PO/2026/0052");
    getAwaitingDeliveries.mockResolvedValue({ rows: [], total: 0, hotels: [{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }] });
    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
    await screen.findByText("Nothing awaiting delivery here");
    expect([...screen.getByLabelText("Hotel").options].map((o) => o.textContent)).toEqual(["All my hotels", "Orchid Mumbai", "Orchid Pune"]);
  });

  it("an empty bucket says so", async () => {
    getAwaitingDeliveries.mockResolvedValue({ rows: [], total: 0 });
    render(<AwaitingList />);
    expect(await screen.findByText("Nothing awaiting delivery here")).toBeInTheDocument();
  });

  it("scanning a dispatch QR opens Receive with the dispatch", async () => {
    resolveScan.mockResolvedValue({ kind: "dispatch", code: "x", gs1: null, item: null, poId: 52, dispatchId: 31 });
    render(<AwaitingList />);
    await screen.findByText("PO/2026/0052");
    const box = screen.getByLabelText("Scan or type a code");
    fireEvent.change(box, { target: { value: "https://app/s/d/31" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/52?dispatch=31"));
  });

  it("a dispatch QR carries the hotel: the note's own, else the hotel the list is filtered to", async () => {
    render(<AwaitingList />);
    await screen.findByText("PO/2026/0052");
    const box = screen.getByLabelText("Scan or type a code");

    resolveScan.mockResolvedValueOnce({ kind: "dispatch", code: "x", gs1: null, item: null, poId: 52, dispatchId: 31, hotelId: 46 });
    fireEvent.change(box, { target: { value: "https://app/s/d/31" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/52?hotelId=46&dispatch=31"));

    fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "47" } });
    resolveScan.mockResolvedValueOnce({ kind: "dispatch", code: "y", gs1: null, item: null, poId: 52, dispatchId: 32 });
    fireEvent.change(screen.getByLabelText("Scan or type a code"), { target: { value: "https://app/s/d/32" } });
    fireEvent.keyDown(screen.getByLabelText("Scan or type a code"), { key: "Enter" });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/52?hotelId=47&dispatch=32"));
  });
});
