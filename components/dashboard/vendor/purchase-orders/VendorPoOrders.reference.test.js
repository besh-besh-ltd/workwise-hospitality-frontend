// Vendors refer to a PO by the RFQ (or contract) it came from, not by the PO
// number. The Orders table gets a third "RFQ / Contract" column; the phone
// card layout is positional (nth-child), so inserting a column must re-map it.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getVendorPoListView: jest.fn(),
  downloadVendorPoExcel: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getVendorPoListView } from "@/services/po";
import VendorPoOrders from "./VendorPoOrders";

const scss = fs.readFileSync(
  path.join(__dirname, "../../buyer/purchase-orders/PurchaseOrders.module.scss"),
  "utf8",
);

const base = {
  status: "acceptance_pending",
  buyer_name: "Phileein",
  hotel_name: "Orchid Goa",
  total_value: 1000,
  created_at: "2026-10-20T10:00:00Z",
};
const rfqRow = {
  ...base,
  id: 1,
  po_number: "138859",
  is_call_off: false,
  rfq_no: "536894",
  rfq_title: "Bath &amp; Body &lt;Amenities&gt; &quot;Q4&quot; it&#39;s",
};
const longTitle = "ORCHID PASSAROS GOA - 5 WATT LED PANEL LIGHT WITH A VERY LONG DESCRIPTION";
const longRow = { ...base, id: 2, po_number: "138860", is_call_off: false, rfq_no: "536895", rfq_title: longTitle };
const callOffRow = {
  ...base,
  id: 3,
  po_number: "138861",
  is_call_off: true,
  arc_number: "77",
  arc_title: "Linen rate contract 2026",
  mr_number: "MR-5",
  rfq_no: null,
};
const oldBackendRow = { ...base, id: 4, po_number: "138862", is_call_off: false };

const mountWith = async (rows) => {
  getVendorPoListView.mockResolvedValue({ data: { rows, facets: {}, tab_counts: {}, total: rows.length, limit: 20 } });
  render(<VendorPoOrders />);
  await screen.findByText("#" + rows[0].po_number);
};
const rowOf = (poNo) => screen.getByText("#" + poNo).closest("tr");

beforeEach(() => jest.clearAllMocks());

describe("vendor Orders: RFQ / Contract column", () => {
  it("has the header in the 3rd position", async () => {
    await mountWith([rfqRow]);
    const heads = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(heads.slice(0, 4)).toEqual(["Status", "PO #", "RFQ / Contract", "Buyer / Hotel"]);
    expect(heads).toHaveLength(7);
  });

  it("RFQ PO: bold RFQ number, then the title, decoded once", async () => {
    await mountWith([rfqRow]);
    const cell = rowOf("138859").querySelectorAll("td")[2];
    const no = within(cell).getByText("RFQ #536894");
    expect(no.tagName).toBe("STRONG");
    expect(cell).toHaveTextContent(`Bath & Body <Amenities> "Q4" it's`);
    expect(cell.querySelector("a")).toBeNull();
  });

  it("clamps the title and keeps the full title in title=", async () => {
    await mountWith([longRow]);
    const cell = rowOf("138860").querySelectorAll("td")[2];
    const t = within(cell).getByText(longTitle);
    expect(t).toHaveAttribute("title", longTitle);
    expect(t.className).toContain("refTitle");
  });

  it("call-off: ARC number + title, then a small MR line, no RFQ", async () => {
    await mountWith([callOffRow]);
    const cell = rowOf("138861").querySelectorAll("td")[2];
    expect(within(cell).getByText("ARC 77")).toBeInTheDocument();
    expect(cell).toHaveTextContent("Linen rate contract 2026");
    expect(within(cell).getByText("MR MR-5")).toBeInTheDocument();
    expect(cell).not.toHaveTextContent("RFQ #");
  });

  it("an older backend (no reference fields) renders an empty cell, never 'undefined'", async () => {
    await mountWith([oldBackendRow]);
    const cell = rowOf("138862").querySelectorAll("td")[2];
    expect(cell.textContent).toBe("");
    expect(document.body.textContent).not.toMatch(/undefined|null/);
  });

  it("search placeholder names the new fields", async () => {
    await mountWith([rfqRow]);
    expect(screen.getByPlaceholderText("Search PO #, RFQ #, title, ARC, buyer…")).toBeInTheDocument();
  });

  it("loading/empty rows span all 7 columns", async () => {
    getVendorPoListView.mockResolvedValue({ data: { rows: [], facets: {}, tab_counts: {}, total: 0, limit: 20 } });
    render(<VendorPoOrders />);
    const cell = await screen.findByText("No purchase orders");
    expect(cell.closest("td")).toHaveAttribute("colspan", "7");
  });
});

describe("phone card layout keeps every cell on its own slot", () => {
  const vendorBlock = () => {
    const at = scss.indexOf(".poCardsVendor tbody");
    return scss.slice(at, scss.indexOf("\n  }", at));
  };
  const rule = (block, n) => (block.match(new RegExp(`td:nth-child\\(${n}\\)\\s*{([^}]*)}`)) || [])[1] || "";

  it("Status / PO# / RFQ / Buyer / Value / Created / Actions", () => {
    const b = vendorBlock();
    expect(rule(b, 2)).toMatch(/grid-column: 1; grid-row: 1/); // PO #
    expect(rule(b, 5)).toMatch(/grid-column: 2; grid-row: 1; text-align: right/); // Value
    expect(rule(b, 3)).toMatch(/grid-column: 1 \/ -1; grid-row: 2/); // RFQ / Contract
    expect(rule(b, 4)).toMatch(/grid-column: 1 \/ -1; grid-row: 3/); // Buyer
    expect(rule(b, 1)).toMatch(/grid-column: 1; grid-row: 4/); // Status
    expect(rule(b, 6)).toMatch(/grid-column: 2; grid-row: 4; text-align: right/); // Created
    expect(rule(b, 7)).toMatch(/display: none/); // Actions
  });

  it("title is clamped to 2 lines, 3 on phones", () => {
    expect(scss).toMatch(/\.refTitle\s*{[^}]*-webkit-line-clamp: 2/);
    expect(scss).toMatch(/Phone layer[\s\S]*\.refTitle\s*{[^}]*-webkit-line-clamp: 3/);
  });
});
