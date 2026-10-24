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

let mockQuery = {};
const mockPush = jest.fn();

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getStock, resolveScan } from "@/services/inventory";
import ScanHomePage from "../ScanHomePage";

const stockAt = (hotels) => ({
  hotelId: hotels[0]?.id ?? null, stockStartedAt: null, hotels, totals: { qtyItems: 0, value: 0 }, rows: [], total: 0,
});

const lookUp = async (code) => {
  const box = await screen.findByLabelText("Scan or type a code");
  fireEvent.change(box, { target: { value: code } });
  fireEvent.keyDown(box, { key: "Enter" });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  getStock.mockResolvedValue(stockAt([{ id: 46, name: "Orchid Mumbai" }]));
});

describe("ScanHomePage on a phone", () => {
  test("scan home renders three actions on mobile", async () => {
    render(<ScanHomePage />);
    const actions = await screen.findByRole("navigation", { name: "Scan actions" });
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

  test("phone layer keeps every target at least 44px", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../stock/stock.module.scss"), "utf8");
    const layer = css.slice(css.indexOf("Phone layer"));
    expect(layer).toMatch(/@media \(max-width: 768px\)/);
    expect(css).toMatch(/\.homeAction\s*{[^}]*min-height:\s*(9\d|1\d\d)px/);
    expect(layer).toMatch(/\.stepBtn[^{]*{[^}]*min-(height|width):\s*44px/);
    expect(layer).toMatch(/\.toastUndo[^{]*{[^}]*min-height:\s*44px/);
    expect(layer).toMatch(/\.tab\b[^{]*{[^}]*min-height:\s*44px/);
    expect(layer).toMatch(/\.qtyField[^{]*{[^}]*min-height:\s*44px/);
  });
});
