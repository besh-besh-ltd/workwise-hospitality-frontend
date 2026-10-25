// Scan home on a phone: three big actions (Receive, Mark out, Count) plus
// Look up, which resolves a code at the hotel and opens the item card.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, pathname: "/dashboard/buyer/inventory/scan", push: mockPush, replace: jest.fn() }),
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
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => true }));
jest.mock("@/services/inventory", () => ({ __esModule: true, getStock: jest.fn(), resolveScan: jest.fn() }));
jest.mock("@/services/hospitality", () => ({ __esModule: true, getMyHospitalityContexts: jest.fn() }));
jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getBulkPermissions: jest.fn((moduleKey, ids) =>
    Promise.resolve({ status: 1, data: { permissions: { [moduleKey]: (mockRights[moduleKey] || {})[ids[0]] || [] } } })
  ),
}));

let mockQuery = {};
let mockRights = {};
const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getStock, resolveScan } from "@/services/inventory";
import { getMyHospitalityContexts } from "@/services/hospitality";
import ScanHomePage from "../ScanHomePage";

const stockAt = (hotels) => ({
  hotelId: hotels[0]?.id ?? null, stockStartedAt: null, hotels, totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
});

const lookUp = async (code) => {
  const box = await screen.findByLabelText("Scan or type a code");
  await waitFor(() => expect(box).not.toBeDisabled());
  fireEvent.change(box, { target: { value: code } });
  fireEvent.keyDown(box, { key: "Enter" });
};

const contexts = (hotels) => ({ status: 1, data: [{ id: 5, name: "Orchid Hotels", hotels }] });
const RICE_ITEM = {
  kind: "item", code: "RICE", gs1: null,
  item: { invItemId: 9, displayName: "Basmati rice", stockUom: "bag", packFactor: 1, poLineId: null, stockedAtHotel: true },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  mockRights = { inventory: { 46: ["read", "create"], 47: ["read"] }, grn: { 46: ["read", "create"] } };
  getStock.mockResolvedValue(stockAt([{ id: 46, name: "Orchid Mumbai" }]));
  getMyHospitalityContexts.mockResolvedValue(contexts([{ id: 46, name: "Orchid Mumbai" }]));
});

describe("ScanHomePage on a phone", () => {
  test("scan home renders three actions on mobile", async () => {
    render(<ScanHomePage />);
    const actions = await screen.findByRole("navigation", { name: "Scan actions" });
    await within(actions).findByRole("link", { name: /Mark out/ });
    const links = actions.querySelectorAll("a");
    expect([...links].map((a) => a.textContent)).toEqual([
      expect.stringContaining("Receive"),
      expect.stringContaining("Mark out"),
      expect.stringContaining("Count"),
    ]);
    expect(screen.getByRole("link", { name: /Receive/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/receive");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Mark out/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/out?hotelId=46")
    );
    expect(screen.getByRole("link", { name: /Count/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/counts");
    // Look up is always there as the manual fallback
    expect(await screen.findByRole("button", { name: "Look up" })).toBeInTheDocument();
  });

  test("look up opens the item card at the hotel", async () => {
    resolveScan.mockResolvedValue({
      kind: "item", code: "RICE", gs1: null,
      item: { invItemId: 9, displayName: "Basmati rice", stockUom: "bag", packFactor: 1, poLineId: null, stockedAtHotel: true },
    });
    render(<ScanHomePage />);
    await lookUp("RICE");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/stock/46/9"));
    expect(resolveScan).toHaveBeenCalledWith("RICE", "hotel:46");
  });

  test("a known item not stocked here still opens its card", async () => {
    resolveScan.mockResolvedValue({
      kind: "item", code: "OIL", gs1: null,
      item: { invItemId: 12, displayName: "Olive oil", stockUom: "bottle", packFactor: 1, poLineId: null, stockedAtHotel: false },
    });
    render(<ScanHomePage />);
    await lookUp("OIL");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/stock/46/12"));
  });

  test("documents open their own pages and unknown codes are explained", async () => {
    resolveScan.mockResolvedValueOnce({ kind: "grn", code: "G", gs1: null, item: null, grnId: 900, poId: 52 });
    render(<ScanHomePage />);
    await lookUp("G");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/grn/900"));

    resolveScan.mockResolvedValueOnce({ kind: "unknown", code: "ZZZ", gs1: null, item: null });
    await lookUp("ZZZ");
    await waitFor(() => expect(toast.warn).toHaveBeenCalledWith(expect.stringMatching(/ZZZ/)));
  });

  test("with several hotels the look-up hotel can be changed", async () => {
    getStock.mockResolvedValue(stockAt([{ id: 46, name: "Orchid Mumbai" }, { id: 47, name: "Orchid Pune" }]));
    resolveScan.mockResolvedValue({
      kind: "item", code: "RICE", gs1: null,
      item: { invItemId: 9, displayName: "Basmati rice", stockUom: "bag", packFactor: 1, poLineId: null, stockedAtHotel: true },
    });
    render(<ScanHomePage />);
    fireEvent.change(await screen.findByLabelText("Hotel"), { target: { value: "47" } });
    await lookUp("RICE");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/stock/47/9"));
  });

  test("with no camera, a typed code and the Look up button still work", async () => {
    resolveScan.mockResolvedValue(RICE_ITEM);
    render(<ScanHomePage />);
    const box = await screen.findByLabelText("Scan or type a code");
    await waitFor(() => expect(box).not.toBeDisabled());
    fireEvent.change(box, { target: { value: "RICE" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/stock/46/9"));
  });

  test("a PO code opens receiving for that PO at the hotel", async () => {
    resolveScan.mockResolvedValue({ kind: "po", code: "PO/52", gs1: null, item: null, poId: 52 });
    render(<ScanHomePage />);
    await lookUp("PO/52");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/52?hotelId=46"));
  });

  test("a dispatch code opens receiving with that dispatch picked", async () => {
    resolveScan.mockResolvedValue({ kind: "dispatch", code: "DSP/7", gs1: null, item: null, poId: 52, dispatchId: 7 });
    render(<ScanHomePage />);
    await lookUp("DSP/7");
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/52?hotelId=46&dispatch=7")
    );
  });

  test("a PO code at a hotel without receiving rights doesn't open receiving", async () => {
    mockRights.grn = {};
    resolveScan.mockResolvedValue({ kind: "po", code: "PO/52", gs1: null, item: null, poId: 52 });
    render(<ScanHomePage />);
    await lookUp("PO/52");
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Receiving at Orchid Mumbai needs goods receipt rights there."));
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("a receiving-only hotel can look up documents but not item cards", async () => {
    getMyHospitalityContexts.mockResolvedValue(contexts([{ id: 46, name: "Orchid Mumbai" }, { id: 48, name: "Orchid Goa" }]));
    mockRights.grn = { 48: ["read"] };
    render(<ScanHomePage />);
    const picker = await screen.findByLabelText("Hotel");
    expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual(["Orchid Mumbai", "Orchid Goa"]);
    fireEvent.change(picker, { target: { value: "48" } });
    expect(screen.queryByRole("link", { name: /Find the item by name/ })).toBeNull();

    resolveScan.mockResolvedValueOnce(RICE_ITEM);
    await lookUp("RICE");
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/can't see stock at Orchid Goa/)));
    expect(resolveScan).toHaveBeenLastCalledWith("RICE", "hotel:48");
    expect(mockPush).not.toHaveBeenCalled();

    resolveScan.mockResolvedValueOnce({ kind: "po", code: "PO/52", gs1: null, item: null, poId: 52 });
    await lookUp("PO/52");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/52?hotelId=48"));
  });

  test("Mark out shows only with create rights at a hotel", async () => {
    mockRights.inventory = { 46: ["read"] };
    render(<ScanHomePage />);
    await screen.findByRole("button", { name: "Look up" });
    await act(async () => {});
    const actions = screen.getByRole("navigation", { name: "Scan actions" });
    expect(within(actions).queryByRole("link", { name: /Mark out/ })).toBeNull();
    expect(within(actions).getByRole("link", { name: /Receive/ })).toBeInTheDocument();
    // Counting is inventory.create too (M-5).
    expect(within(actions).queryByRole("link", { name: /Count/ })).toBeNull();
  });

  test("a read-only store user gets no dead-end actions, only Look up (M-5)", async () => {
    mockRights = { inventory: { 46: ["read"] }, grn: { 46: ["read"] } };
    render(<ScanHomePage />);
    await screen.findByRole("button", { name: "Look up" });
    await act(async () => {});
    const actions = screen.queryByRole("navigation", { name: "Scan actions" });
    if (actions) expect(within(actions).queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /Receive/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Count/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Mark out/ })).toBeNull();
  });

  test("a receiving clerk sees Receive but not Count (M-5)", async () => {
    getStock.mockResolvedValue(stockAt([]));
    mockRights = { inventory: {}, grn: { 46: ["read", "create"] } };
    render(<ScanHomePage />);
    const actions = await screen.findByRole("navigation", { name: "Scan actions" });
    expect(await within(actions).findByRole("link", { name: /Receive/ })).toHaveAttribute("href", "/dashboard/buyer/inventory/receive");
    expect(within(actions).queryByRole("link", { name: /Count/ })).toBeNull();
    expect(within(actions).queryByRole("link", { name: /Mark out/ })).toBeNull();
  });

  test("with no stock or receiving access there is nothing to look up", async () => {
    getStock.mockResolvedValue(stockAt([]));
    getMyHospitalityContexts.mockResolvedValue(contexts([]));
    render(<ScanHomePage />);
    expect(
      await screen.findByText("You don't have stock or receiving access at any hotel, so there is nothing to look up.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Scan or type a code")).toBeNull();
    expect(screen.queryByRole("link", { name: /Mark out/ })).toBeNull();
  });
});
