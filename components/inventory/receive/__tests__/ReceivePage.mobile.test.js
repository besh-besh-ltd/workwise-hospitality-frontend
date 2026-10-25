// Receive page on a phone (<768px): a scan-first card list (scanned lines on
// top), a sticky scan bar and a sticky Post bar. jsdom has no media queries,
// so the layout switch is driven by useIsMobile and the phone CSS is pinned
// by reading receive.module.scss.

import fs from "fs";
import path from "path";

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/dashboard/buyer/inventory/receive/[poId]", push: jest.fn(), replace: jest.fn() }),
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
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false, hasPermission: () => true,
  }),
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  getReceiveContext: jest.fn(),
  createGrn: jest.fn(),
  updateGrn: jest.fn(),
  postGrn: jest.fn(),
  discardGrn: jest.fn(),
  uploadGrnAttachment: jest.fn(),
  deleteGrnAttachment: jest.fn(),
  resolveScan: jest.fn(),
  addItemBarcode: jest.fn(),
  listItems: jest.fn(() => Promise.resolve({ rows: [] })),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getReceiveContext, resolveScan } from "@/services/inventory";
import ReceivePage from "../ReceivePage";
import ReceiveLineCard from "../ReceiveLineCard";
import { blankLine } from "../receiveUtils";

const line = (poLineId, productName, unit, open, over = {}) => ({
  poLineId, productVariantId: 500 + poLineId, productName, unit, invItemId: poLineId, stockUom: unit, uomFactor: 1,
  needsUomFactor: false, trackExpiry: false, minShelfLifeDays: null, plannedAtHotel: open, openAtHotel: open,
  maxAcceptable: open, defaultMarkOutOnArrival: false, costPerPoUnit: 100, barcodes: [], ...over,
});

const ctx = {
  po: { id: 52, poNumber: "PO/2026/0052", vendorName: "Fresh Farms", isCallOff: false, departmentId: 7 },
  hotel: { id: 46, name: "Orchid Mumbai" },
  hotelChoices: [{ id: 46, name: "Orchid Mumbai" }],
  lines: [
    line(11, "Basmati rice 25kg", "bag", 24),
    line(12, "Toor dal", "bag", 10),
    line(13, "Sugar", "bag", 8),
    line(14, "Dish soap", "box", 6, { stockUom: "piece", uomFactor: null, needsUomFactor: true }),
  ],
  dispatches: [],
  departments: [{ id: 7, title: "Kitchen" }],
  itemSuggestions: {},
  draft: null,
};

const cardNames = () =>
  screen.getAllByTestId("receive-card").map((c) => within(c).getByRole("heading", { level: 3 }).textContent);

beforeEach(() => {
  jest.clearAllMocks();
  getReceiveContext.mockResolvedValue(ctx);
});

describe("ReceivePage on a phone", () => {
  it("mobile layout renders cards and sticky post bar", async () => {
    render(<ReceivePage poId="52" />);
    await screen.findByText("Basmati rice 25kg");

    // Cards, not the desktop table.
    expect(screen.queryByRole("table", { name: "Receive lines" })).toBeNull();
    expect(cardNames()).toEqual(["Basmati rice 25kg", "Toor dal", "Sugar", "Dish soap"]);

    // Sticky scan bar holds the one scan box; the Post button lives in the phone action bar.
    const dock = screen.getByTestId("scan-dock");
    expect(within(dock).getByLabelText("Scan or type a code")).toBeInTheDocument();
    // MobileActionBar portals to <body> from an effect, a tick after the cards.
    const bar = await screen.findByRole("region", { name: "Receive actions" });
    expect(within(bar).getByRole("button", { name: "Post receipt" })).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Save draft" })).toBeInTheDocument();

    // The unit-conversion pill is a real (44px on a phone) button.
    const soapCard = screen.getAllByTestId("receive-card")[3];
    expect(within(soapCard).getByRole("button", { name: /Set unit conversion/ })).toHaveClass("pillBtn");

    // Big steppers on each card.
    const sugar = screen.getAllByTestId("receive-card")[2];
    fireEvent.click(within(sugar).getByRole("button", { name: "Add one bag of Sugar" }));
    expect(within(sugar).getByRole("button", { name: "Edit received qty for Sugar" })).toHaveTextContent("1");
  });

  it("scanned lines move to the top of the list", async () => {
    render(<ReceivePage poId="52" />);
    await screen.findByText("Basmati rice 25kg");
    resolveScan.mockResolvedValue({
      kind: "item", code: "SUGAR", gs1: null,
      item: { invItemId: 13, displayName: "Sugar", stockUom: "bag", packFactor: 1, poLineId: 13 },
    });
    const box = screen.getByLabelText("Scan or type a code");
    fireEvent.change(box, { target: { value: "SUGAR" } });
    fireEvent.keyDown(box, { key: "Enter" });

    await waitFor(() => expect(cardNames()[0]).toBe("Sugar"));
    expect(cardNames()).toEqual(["Sugar", "Basmati rice 25kg", "Toor dal", "Dish soap"]);
  });

  it("a scanner read while the Rejected box has focus scans the next item; the rejects stay", async () => {
    let now = 40_000_000;
    const clock = jest.spyOn(Date, "now").mockImplementation(() => now);
    try {
      render(<ReceivePage poId="52" />);
      await screen.findByText("Basmati rice 25kg");
      resolveScan.mockResolvedValue({
        kind: "item", code: "8901234567893", gs1: null,
        item: { invItemId: 13, displayName: "Sugar", stockUom: "bag", packFactor: 1, poLineId: 13 },
      });
      const rice = screen.getAllByTestId("receive-card")[0];
      fireEvent.click(within(rice).getByRole("button", { name: "Add one bag of Basmati rice 25kg" }));
      fireEvent.click(within(rice).getByRole("button", { name: "Add one bag of Basmati rice 25kg" }));
      const rejected = within(rice).getByLabelText("Rejected qty for Basmati rice 25kg");
      rejected.focus();
      const key = (k, gap) => {
        now += gap;
        fireEvent.keyDown(rejected, { key: k });
        fireEvent.change(rejected, { target: { value: `${rejected.value}${k}` } });
      };
      key("1", 2000);
      now += 1000;
      for (const k of "8901234567893") key(k, 6);
      now += 6;
      expect(fireEvent.keyDown(rejected, { key: "Enter" })).toBe(false);

      expect(rejected).toHaveValue("1");
      await waitFor(() => expect(cardNames()[0]).toBe("Sugar"));
      const sugar = screen.getAllByTestId("receive-card")[0];
      expect(within(sugar).getByRole("button", { name: "Edit received qty for Sugar" })).toHaveTextContent("1");
      const riceNow = screen.getAllByTestId("receive-card")[1];
      expect(within(riceNow).getByLabelText("Rejected qty for Basmati rice 25kg")).toHaveValue("1");
      expect(within(riceNow).getByLabelText("Accepted qty for Basmati rice 25kg")).toHaveValue("1");
      expect(within(riceNow).getByRole("button", { name: "Edit received qty for Basmati rice 25kg" })).toHaveTextContent("2");
    } finally {
      clock.mockRestore();
    }
  });
});

// jsdom can't apply media queries: pin the stylesheet contract instead.
describe("ReceiveLineCard fold", () => {
  const card = (l, props) =>
    render(<ReceiveLineCard line={l} entry={blankLine(l)} onChange={jest.fn()} onStep={jest.fn()} onOpenPad={jest.fn()} {...props} />);

  it("names only what it holds: no mark out when marking out is off", () => {
    const sugar = line(13, "Sugar", "bag", 8);
    const { unmount } = card(sugar, {});
    expect(screen.getByText("Reject or mark out")).toBeInTheDocument();
    unmount();

    card(sugar, { allowMarkOut: false });
    expect(screen.getByText("Reject")).toBeInTheDocument();
    expect(screen.queryByText(/mark out/i)).toBeNull();
    expect(screen.queryByLabelText("Mark out on arrival for Sugar")).toBeNull();
  });

  it("keeps the batch title on lines that track expiry", () => {
    card(line(15, "Paneer", "kg", 20, { trackExpiry: true, minShelfLifeDays: 3 }), { allowMarkOut: false });
    expect(screen.getByText("Reject, batch and expiry")).toBeInTheDocument();
  });
});

describe("phone CSS contract (receive.module.scss)", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "receive.module.scss"), "utf8");
  const layer = css.slice(css.indexOf("Phone layer"));
  const block = (q) => {
    const out = [];
    let at = layer.indexOf(q);
    while (at !== -1) {
      let depth = 0;
      let i = layer.indexOf("{", at);
      const start = i;
      for (; i < layer.length; i++) {
        if (layer[i] === "{") depth++;
        else if (layer[i] === "}" && --depth === 0) break;
      }
      out.push(layer.slice(start, i + 1));
      at = layer.indexOf(q, i);
    }
    return out.join("\n");
  };
  const phone = block("@media (max-width: 768px)");

  it("has a phone layer", () => {
    expect(css.indexOf("Phone layer")).toBeGreaterThan(0);
    expect(phone.length).toBeGreaterThan(0);
  });

  it("keeps the scan bar stuck under the shell's top bar", () => {
    expect(phone).toMatch(/\.scanDock\s*{[^}]*position:\s*sticky;[^}]*top:\s*56px;/);
  });

  it("never scrolls sideways at 360px", () => {
    expect(phone).toMatch(/\.page\s*{[^}]*overflow-x:\s*clip;/);
    expect(phone).toMatch(/\.cardList\s*{[^}]*min-width:\s*0;/);
  });

  it("gives every card control a 44px target", () => {
    expect(phone).toMatch(/\.stepBtn\s*{[^}]*min-height:\s*44px;[^}]*min-width:\s*44px;/);
    expect(phone).toMatch(/\.cardField[^{]*{[^}]*min-height:\s*44px;/);
  });

  it("keeps every other phone tap target at 44px", () => {
    expect(phone).toMatch(/\.tab\s*{[^}]*min-height:\s*44px;/);
    expect(phone).toMatch(/\.toastUndo\s*{[^}]*min-height:\s*44px;/);
    expect(phone).toMatch(/\.cardMore summary\s*{[^}]*min-height:\s*44px;/);
    expect(phone).toMatch(/\.pillBtn\s*{[^}]*min-height:\s*44px;/);
    expect(phone).toMatch(/\.btnLink\s*{[^}]*min-height:\s*44px;/);
    expect(phone).toMatch(/\.iconBtn\s*{[^}]*min-width:\s*44px;/);
    expect(phone).toMatch(/\.sheetClose\s*{[^}]*height:\s*44px;/);
    // Nothing in the phone layer sizes a target below 44px.
    expect(phone).not.toMatch(/min-(height|width):\s*([0-3]?\d|4[0-3])px/);
  });

  it("makes the post bar taller for its summary row", () => {
    expect(phone).toMatch(/--mobile-action-bar-h:\s*\d+px;/);
  });
});
