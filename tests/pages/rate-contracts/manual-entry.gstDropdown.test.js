// ARC v2 — Manual ARC Entry: a vendor quote line's GST % is picked from the
// GST list (5 / 12 / 18 / 28 / 40 %) instead of typed, like the vendor's own
// rate contract quote.
//
// A draft saved before the list keeps reading as saved: an odd rate (13%) or 0%
// is shown as an extra option until a listed rate is picked. The quotes section
// still autosaves on leaving the box, now with the picked rate.
//
// Product-level: drive the REAL page and assert what it shows and sends.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getManualDraft: jest.fn(),
  createManualDraft: jest.fn(),
  patchManualDraft: jest.fn(),
  saveManualSection: jest.fn(),
  finalizeManualArc: jest.fn(),
  uploadManualContractDoc: jest.fn(),
  listRootCategories: jest.fn(),
  listAccessibleHotels: jest.fn(),
  getSubCategories: jest.fn(),
  getDepartmentsForHotel: jest.fn(),
  searchVariants: jest.fn(),
  listEligibleVendors: jest.fn(),
  listAllVendors: jest.fn(),
}));

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    isReady: true,
    query: { d: "42" },
    pathname: "/dashboard/buyer/rate-contracts/manual-entry",
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ManualArcEntryPage from "@/pages/dashboard/buyer/rate-contracts/manual-entry";

const HOTEL = { id: 3, name: "Hotel One" };
const CATEGORY = { id: 7, title: "Dairy" };
const DEPT = { id: 9, title: "F&B" };
const VENDOR = { id: 501, name: "Alpha Supplies", email: "alpha@example.com" };

const ITEMS = [
  { id: 9001, product_variant_id: 4241, variant_name: "MALAI PANEER", indicative_qty: 100, uom: "KG", spec_text: "spec", target_price: 450 },
  { id: 9002, product_variant_id: 4242, variant_name: "CURD FRESH", indicative_qty: 200, uom: "KG", spec_text: "spec", target_price: 300 },
  { id: 9003, product_variant_id: 4243, variant_name: "BUTTER", indicative_qty: 50, uom: "KG", spec_text: "spec", target_price: 500 },
];

// A Floated-stage (S1) manual draft: vendor picked, three items, and the
// vendor's quote already entered — line 1 at 13% (not on the list), line 2
// with no GST yet, line 3 at 0%.
const draft = () => ({
  arc: {
    id: 42,
    arc_number: "ARC-2026-27-0007",
    title: "Manual backfill",
    description: "",
    type: "product",
    eligibility_type: "open",
    technical_response_required: false,
    sample_required: false,
    hotel_id: HOTEL.id,
    category_id: CATEGORY.id,
    department_id: DEPT.id,
    sub_category_ids: [],
    status: "draft",
    created_at: "2026-04-01 00:00:00",
    submission_start_at: null,
    submission_end_at: null,
    contract_start_at: null,
    contract_end_at: null,
    payment_terms_expected: "",
    delivery_expected: "",
    penalty_clause: "",
  },
  manual_entry: {
    target_stage: "floated",
    eligibility_overridden: false,
    backdated_dates: { created_at: "2026-04-01T00:00", floated_at: "2026-04-02T00:00" },
  },
  items: ITEMS,
  invitations: [{ vendor_id: VENDOR.id }],
  quotes: [{
    vendor_id: VENDOR.id,
    submitted_at: "2026-04-03 10:00:00",
    lines: [
      { arc_item_id: 9001, rate: 450, gst_pct: 13 },
      { arc_item_id: 9002, rate: 300, gst_pct: null },
      { arc_item_id: 9003, rate: 500, gst_pct: 0 },
    ],
  }],
  awards: [],
  contracts: [],
});

beforeEach(() => {
  window.scrollTo = jest.fn();
  window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  ArcApi.listRootCategories.mockResolvedValue({ data: { categories: [CATEGORY] } });
  ArcApi.listAccessibleHotels.mockResolvedValue({ data: { hotels: [HOTEL] } });
  ArcApi.getSubCategories.mockResolvedValue({ data: { sub_categories: [] } });
  ArcApi.getDepartmentsForHotel.mockResolvedValue({ data: { departments: [DEPT] } });
  ArcApi.searchVariants.mockResolvedValue({ data: { variants: [], total: 0 } });
  ArcApi.listEligibleVendors.mockResolvedValue({ data: { vendors: [VENDOR] } });
  ArcApi.listAllVendors.mockResolvedValue({ data: { vendors: [VENDOR] } });
  ArcApi.saveManualSection.mockResolvedValue({ data: { ok: true } });
  ArcApi.patchManualDraft.mockResolvedValue({ data: { arc: {} } });
  ArcApi.getManualDraft.mockResolvedValue({ data: draft() });
});
afterEach(() => jest.clearAllMocks());

const shown = (sel) => sel.options[sel.selectedIndex].text;
const optionTexts = (sel) => [...sel.options].map((o) => o.text);
const gstBox = (name) => screen.getByLabelText(`GST % for ${name}`);

const openQuotes = async () => {
  render(<ManualArcEntryPage />);
  await screen.findByText("Resume Manual ARC Entry");
  const rail = await screen.findByRole("complementary", { name: "Manual entry steps" });
  const quotesStep = [...rail.querySelectorAll("button")].find((b) => /Quotes/.test(b.textContent));
  fireEvent.click(quotesStep);
  await screen.findByLabelText("GST % for MALAI PANEER");
};

test("each quote line's GST % is a dropdown of the listed rates", async () => {
  await openQuotes();
  for (const name of ["MALAI PANEER", "CURD FRESH", "BUTTER"]) {
    expect(gstBox(name).tagName).toBe("SELECT");
  }
});

test("a line saved at 13% shows 13%, added to the list in order", async () => {
  await openQuotes();
  const sel = gstBox("MALAI PANEER");
  expect(shown(sel)).toBe("13%");
  expect(optionTexts(sel)).toEqual(["Select", "5%", "12%", "13%", "18%", "28%", "40%"]);
});

test("a line with no GST shows Select, which can't be picked; a line at 0% shows 0%", async () => {
  await openQuotes();
  const blank = gstBox("CURD FRESH");
  expect(shown(blank)).toBe("Select");
  expect(blank.options[0].disabled).toBe(true);
  expect(optionTexts(blank)).toEqual(["Select", "5%", "12%", "18%", "28%", "40%"]);
  expect(shown(gstBox("BUTTER"))).toBe("0%");
});

test("picking 18% on the 13% line and leaving the box autosaves the quote with 18", async () => {
  await openQuotes();
  const sel = gstBox("MALAI PANEER");
  fireEvent.change(sel, { target: { value: "18" } });
  expect(shown(gstBox("MALAI PANEER"))).toBe("18%");
  // 13% stays offered while the page is open, so the buyer can go back to it.
  expect(optionTexts(gstBox("MALAI PANEER"))).toContain("13%");

  fireEvent.blur(gstBox("MALAI PANEER"));
  await waitFor(() =>
    expect(ArcApi.saveManualSection.mock.calls.some((c) => c[1] === "quotes")).toBe(true)
  );
  const body = ArcApi.saveManualSection.mock.calls.filter((c) => c[1] === "quotes").pop()[2];
  const lines = body.quotes.find((q) => q.vendor_id === VENDOR.id).lines;
  expect(lines.map((l) => [l.arc_item_id, l.gst_pct])).toEqual([[9001, 18], [9002, 0], [9003, 0]]);
});

test("picking a rate on the blank line saves that rate", async () => {
  await openQuotes();
  fireEvent.change(gstBox("CURD FRESH"), { target: { value: "5" } });
  fireEvent.blur(gstBox("CURD FRESH"));
  await waitFor(() =>
    expect(ArcApi.saveManualSection.mock.calls.some((c) => c[1] === "quotes")).toBe(true)
  );
  const body = ArcApi.saveManualSection.mock.calls.filter((c) => c[1] === "quotes").pop()[2];
  const line = body.quotes[0].lines.find((l) => l.arc_item_id === 9002);
  expect(line.gst_pct).toBe(5);
});

// The quote boxes used to be rebuilt on every change (the section card was a
// component declared inside the page), so the box being typed in lost focus and
// the dropdown's leave-the-box autosave was skipped.
test("typing a rate or picking a GST keeps the same box, so focus and the blur autosave survive", async () => {
  await openQuotes();
  const rate = gstBox("MALAI PANEER").closest("tr").querySelector("input");
  rate.focus();
  fireEvent.change(rate, { target: { value: "455" } });
  const rateNow = gstBox("MALAI PANEER").closest("tr").querySelector("input");
  expect(rateNow).toBe(rate);
  expect(document.activeElement).toBe(rate);

  const gst = gstBox("MALAI PANEER");
  fireEvent.change(gst, { target: { value: "18" } });
  expect(gstBox("MALAI PANEER")).toBe(gst);
});
