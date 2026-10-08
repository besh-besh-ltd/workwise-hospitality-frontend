// The PO list pages on a phone (buyer dashboard + tracking + analytics, and the
// vendor pages that share PurchaseOrders.module.scss).
//
// At 390px: the 9-column PO table was a sideways-scrolling strip, the awaiting
// cards had a 340px minimum inside a ~330px card, the inline 240px search box
// pushed the section header off-screen, and the Vendor / Date filter panels
// (absolute, right:0, minWidth 220) opened off the left edge. The fixes are
// CSS-only, so this file pins (a) the markup hooks the phone CSS keys on and
// (b) the phone rules themselves — jsdom cannot apply media queries.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 125, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, loading: false }),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPOKpis: jest.fn(() => Promise.resolve({})),
  getPOAwaiting: jest.fn(() => Promise.resolve({ data: [] })),
  getPODashboardList: jest.fn(),
  downloadPOListExcel: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODashboardList } from "@/services/po";
import PODashboard from "./PODashboard";

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), "utf8");
// Every `@media (max-width: <w>px)` block after the file's "Phone layer" marker.
const phoneBlocks = (css, w) => {
  const layer = css.slice(css.indexOf("Phone layer"));
  const q = `@media (max-width: ${w}px)`;
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

beforeEach(() => {
  jest.clearAllMocks();
  getPODashboardList.mockResolvedValue({
    data: [
      {
        id: 605,
        po_number: "138877",
        rfq_no: "536263",
        status: "pending_approval",
        vendor: { id: 1, name: "PHILEEIN HOSPITALITY PRIVATE LIMITED" },
        items_label: "INDUCTION BRATT PAN SS · +2 more",
        items_count: 3,
        total_value: 1555004,
        created_at: "2026-09-18T04:33:00.000Z",
        current_approvers: [],
      },
    ],
    total_items: 1,
    page: 1,
    limit: 10,
    status_counts: { all: 1 },
    vendors: [{ id: 1, key: "1", label: "PHILEEIN HOSPITALITY PRIVATE LIMITED", count: 1 }],
  });
});

describe("PO dashboard markup hooks for the phone layout", () => {
  it("marks the PO table for the phone card layout", async () => {
    render(<PODashboard />);
    await screen.findByText("#138877");
    const table = screen.getByText("#138877").closest("table");
    expect(table.className).toContain("poCards");
    expect(table.className).toContain("poCardsBuyer");
  });

  it("gives the filter popovers the class the phone bottom-sheet rule targets", async () => {
    render(<PODashboard />);
    await screen.findByText("#138877");
    fireEvent.click(screen.getByRole("button", { name: /Vendor/ }));
    const option = await screen.findByRole("button", { name: /All vendors/ });
    expect(option.parentElement.className).toContain("filterMenu");
  });
});

describe("phone CSS contract", () => {
  const shared = read("PurchaseOrders.module.scss");
  const phone = phoneBlocks(shared, 768);

  it("PO list rows become cards: header hidden, positions mapped for buyer and vendor tables", () => {
    expect(phone).toMatch(/\.poCards\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
    expect(phone).toMatch(/\.poCardsBuyer tbody\s*{/);
    expect(phone).toMatch(/\.poCardsVendor tbody\s*{/);
    // loading / empty rows keep spanning the whole card
    expect(phone).toMatch(/\.poCards tbody td\[colspan\]\s*{\s*grid-column:\s*1 \/ -1;/);
  });

  it("awaiting cards drop their 340px minimum", () => {
    expect(phone).toMatch(/\.awaitingGrid\s*{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  });

  it("the inline 240px search box takes the full row", () => {
    expect(phone).toMatch(/\.sectionHead \.searchInput\s*{\s*width:\s*100% !important/);
  });

  it("pagination wraps with 40px buttons", () => {
    expect(phone).toMatch(/\.pagination\s*{\s*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/\.pages button\s*{\s*width:\s*40px;\s*height:\s*40px/);
  });

  it("the vendor 4-card KPI strip is a class, so it can collapse on phones", () => {
    expect(shared).toMatch(/@media \(max-width: 720px\)\s*{\s*\.kpiStrip\.kpiStrip4\s*{\s*grid-template-columns:\s*1fr 1fr;/);
    const vendorDash = read("../../vendor/purchase-orders/VendorPoDashboard.js");
    expect(vendorDash).not.toMatch(/gridTemplateColumns:\s*"repeat\(4, 1fr\)"/);
    expect(vendorDash).toMatch(/styles\.kpiStrip4/);
  });

  it("tracking cancels the 16px shell padding and restacks its table", () => {
    const css = read("POTracking.module.scss");
    expect(phoneBlocks(css, 991)).toMatch(/\.page\s*{\s*margin:\s*-16px;/);
    const p = phoneBlocks(css, 768);
    expect(p).toMatch(/\.trackTable\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
    expect(p).toMatch(/\.filterMenu\s*{[^}]*position:\s*fixed !important/);
  });

  it("analytics: vendor ranking scrolls inside its card and bar values are printed (no hover on phones)", () => {
    const css = read("POAnalytics.module.scss");
    expect(phoneBlocks(css, 991)).toMatch(/\.page\s*{\s*margin:\s*-16px;/);
    const p = phoneBlocks(css, 768);
    expect(p).toMatch(/\.rankScroll\s*{\s*overflow-x:\s*auto/);
    expect(p).toMatch(/\.vShort\s*{\s*display:\s*block/);
    // …and the printed values are hidden on desktop, where hover works.
    expect(css.slice(0, css.indexOf("Phone layer"))).toMatch(/\.vShort\s*{\s*display:\s*none;\s*}/);
  });
});

describe("Recent awards widget links to the PO detail page", () => {
  it("uses /dashboard/buyer/purchase-orders/<id>, not the legacy ?id= route that lands on an empty state", () => {
    // Dashboard V3 routes widget links through the shared dashboardLinks helpers.
    const { poDetail } = require("@/components/dashboard/shared/dashboardLinks");
    expect(poDetail(4410)).toBe("/dashboard/buyer/purchase-orders/4410");
    const src = read("../persona-widgets/awarding/RecentAwards.js");
    expect(src).toMatch(/poDetail\(/);
    expect(src).not.toMatch(/purchase-order\?id=/);
  });
});
