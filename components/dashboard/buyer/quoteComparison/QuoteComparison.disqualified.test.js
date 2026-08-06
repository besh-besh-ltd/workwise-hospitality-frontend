// QuoteComparison — an empty cell must say WHY it is empty.
//
// The defect, reproduced live on RFQ 363 (#535917): a vendor who submitted a
// quote and then FAILED the buyer's own technical evaluation was rendered
// exactly like a vendor who never replied — "Awaiting quote" in the cell, and
// "2/3 · Partial — 2 of 3 items quoted" in the column header. The backend's
// quote-comparison shaper dropped the technically-failed quote to a bare
// `null`, carrying no reason, so the screen could not tell the two apart.
//
// That misrepresents vendor performance on the exact screen where buyers decide
// who is worth inviting again.
//
// What must NOT change: the PRICE stays suppressed. A disqualified vendor must
// remain non-comparable and non-awardable, which is why the cell still carries
// no `finalize` payload and is not selectable. Only the reason is restored,
// from the contract's `quotes_absence` map.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/quote-comparison?rfq=363",
    pathname: "/dashboard/buyer/quote-comparison",
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparisonView: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  finalizeQuotation: jest.fn(() => Promise.resolve({})),
  getRFQById: jest.fn(() => Promise.resolve({ data: { hotel_ids: [1], department_id: 2 } })),
  getRfqs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  approveNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  rejectNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })),
}));

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import QuoteComparison, { awardCellAnchorId } from "./QuoteComparison";
import styles from "./QuoteComparison.module.scss";
import * as C from "./computeHelpers";
import { __test__ as XL } from "./quoteComparisonExcel";

const RFQ_ID = "363";
// Mirrors the live case: WORKWISE quoted every line, passed two, failed one.
const WORKWISE = 429;   // quoted all 3, technically failed on LAPTOP SCREEN
const ACME = 431;       // quoted and passed everywhere
const SILENT = 433;     // quoted the other lines, never quoted LAPTOP SCREEN

const cell = (base) => ({
  base,
  subtotal: base * 10,
  tax_amt: Math.round(base * 10 * 0.18),
  delivery_charges: 0,
  total: Math.round(base * 10 * 1.18),
  other_charges: [],
  global_charges: [],
  history: [],
  negotiation: null,
  finalize: { vendor_id: ACME, quote_id: 11, quote_item_id: 21, unit_price: base, total_value: base * 10, charges_meta: {} },
});

// The product at the centre of the bug: three vendors, three different reasons
// for what the buyer sees.
const screenProduct = (over = {}) => ({
  id: 9001,
  name: "LAPTOP SCREEN",
  qty: 10,
  unit: "nos",
  category: 1,
  state: "open",
  awaiting_me: false,
  finalized_vendor: null,
  finalized_by: null,
  negotiation: null,
  reject_info: null,
  quoted_count: 1,
  tech: { configured: true, scores: { [ACME]: 90, [WORKWISE]: 20 } },
  quotes: { [ACME]: cell(1000), [WORKWISE]: null, [SILENT]: null },
  // WORKWISE quoted and was disqualified. SILENT is absent from this map, which
  // is the contract's way of saying "genuine non-response".
  quotes_absence: {
    [WORKWISE]: { status: "TECH_FAILED", tech_score: 20, min_score: 50 },
  },
  approval: { current_approvers: [] },
  ...over,
});

// Two more lines everyone quoted and passed, so WORKWISE is a legitimate column
// (the backend's technical gate drops a vendor entirely unless they clear at
// least one line) and the coverage counters have something to count.
const otherProduct = (id, name) => ({
  id,
  name,
  qty: 10,
  unit: "nos",
  category: 1,
  state: "open",
  awaiting_me: false,
  finalized_vendor: null,
  finalized_by: null,
  negotiation: null,
  reject_info: null,
  quoted_count: 3,
  tech: { configured: true, scores: {} },
  quotes: { [ACME]: cell(900), [WORKWISE]: cell(950), [SILENT]: cell(980) },
  quotes_absence: {},
  approval: { current_approvers: [] },
});

const payload = (over = {}) => ({
  rfq: {
    id: 363, rfq_no: "535917", title: "IT hardware", status: "OPEN", project_id: null,
    quotes_invited: 3, quotes_received: 3,
  },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [
    { id: ACME, name: "Acme Systems", short: "AS" },
    { id: WORKWISE, name: "Workwise IT Wale", short: "WI" },
    { id: SILENT, name: "Silent Traders", short: "ST" },
  ],
  categories: [{ id: 1, name: "IT" }],
  products: [screenProduct(), otherProduct(9002, "KEYBOARD"), otherProduct(9003, "MOUSE")],
  approval_chain: [],
  has_delivery_charges: false,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

const renderSheet = async (view) => {
  getQuoteComparisonView.mockResolvedValue(view);
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded />);
  await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalled());
  await screen.findByText("LAPTOP SCREEN");
  return utils;
};

const cellFor = (productId, vendorId) =>
  document.getElementById(awardCellAnchorId(productId, vendorId));

// ===========================================================================
// 1. The cell says which kind of empty it is.
// ===========================================================================

describe("QuoteComparison — a disqualified vendor is not an absent vendor", () => {
  it("labels the technically-failed vendor's cell as disqualified, not 'Awaiting quote'", async () => {
    await renderSheet(payload());

    const td = cellFor(9001, WORKWISE);
    expect(td).not.toBeNull();
    expect(within(td).getByText(/technically disqualified/i)).toBeInTheDocument();
    expect(within(td).queryByText(/awaiting quote/i)).toBeNull();
    // The buyer is told the vendor DID respond — that is the whole point.
    expect(within(td).getByText(/^Quoted —/)).toBeInTheDocument();
  });

  it("still says 'Awaiting quote' for a vendor who genuinely did not respond", async () => {
    await renderSheet(payload());

    const td = cellFor(9001, SILENT);
    expect(td).not.toBeNull();
    expect(within(td).getByText(/awaiting quote/i)).toBeInTheDocument();
    expect(within(td).queryByText(/disqualified/i)).toBeNull();
  });

  it("shows the score against the threshold, so the verdict is checkable", async () => {
    await renderSheet(payload());

    const td = cellFor(9001, WORKWISE);
    expect(within(td).getByText(/scored 20 against a minimum of 50/i)).toBeInTheDocument();
  });

  it("falls back to plain copy when the shaper has no score to show", async () => {
    await renderSheet(payload({
      products: [
        screenProduct({
          quotes_absence: {
            [WORKWISE]: { status: "TECH_FAILED", tech_score: null, min_score: null },
          },
        }),
        otherProduct(9002, "KEYBOARD"),
        otherProduct(9003, "MOUSE"),
      ],
    }));

    const td = cellFor(9001, WORKWISE);
    expect(within(td).getByText(/technically disqualified/i)).toBeInTheDocument();
    expect(within(td).getByText(/quoted — failed technical evaluation/i)).toBeInTheDocument();
  });

  it("distinguishes an unfinished technical verdict from a failed one", async () => {
    await renderSheet(payload({
      products: [
        screenProduct({
          quotes_absence: {
            [WORKWISE]: { status: "TECH_PENDING", tech_score: null, min_score: 50 },
          },
        }),
        otherProduct(9002, "KEYBOARD"),
        otherProduct(9003, "MOUSE"),
      ],
    }));

    const td = cellFor(9001, WORKWISE);
    expect(within(td).getByText(/technical evaluation pending/i)).toBeInTheDocument();
    expect(within(td).queryByText(/disqualified/i)).toBeNull();
    expect(within(td).queryByText(/awaiting quote/i)).toBeNull();
  });

  it("keeps the price suppressed and the cell unselectable", async () => {
    // Suppression is the correct behaviour and must survive this fix: a
    // disqualified vendor cannot be compared on price or awarded. If the cell
    // ever renders a rupee figure or picks up the selectable affordance, the
    // discriminated absence has leaked into the commercial path.
    await renderSheet(payload());

    const td = cellFor(9001, WORKWISE);
    expect(td.textContent).not.toMatch(/₹/);
    expect(td.querySelector(`.${styles.selectable}`)).toBeNull();
    expect(td.querySelector(`.${styles.cellKebab}`)).toBeNull();
    // …while the vendor who passed keeps a normal, priced, selectable cell.
    const ok = cellFor(9001, ACME);
    expect(ok.textContent).toMatch(/₹/);
    expect(ok.querySelector(`.${styles.selectable}`)).not.toBeNull();
  });
});

// ===========================================================================
// 2. The vendor column stops calling a disqualified line un-quoted.
// ===========================================================================

describe("QuoteComparison — the vendor column counts replies, not comparable cells", () => {
  const columnFor = (vendorName) => screen.getByText(vendorName).closest("th");

  it("reports the disqualified line as quoted and names why it is not comparable", async () => {
    await renderSheet(payload());

    // Was: "Partial — 2 of 3 items quoted", of a vendor who quoted all three.
    const col = columnFor("Workwise IT Wale");
    expect(
      within(col).getByText(/3 of 3 items quoted · 1 technically disqualified/i)
    ).toBeInTheDocument();
    expect(within(col).queryByText(/^Partial —/i)).toBeNull();
  });

  it("leaves the genuinely partial vendor's wording alone", async () => {
    // Silent Traders really did skip a line. Nothing about this fix may soften
    // that — the two vendors must read differently, in the same header row.
    await renderSheet(payload());

    const col = columnFor("Silent Traders");
    expect(within(col).getByText(/Partial — 2 of 3 items quoted/i)).toBeInTheDocument();
    expect(within(col).queryByText(/disqualified/i)).toBeNull();
  });

  it("uses the plain wording when the shaper reports no disqualifications", async () => {
    await renderSheet(payload({
      products: [
        screenProduct({
          quotes: { [ACME]: cell(1000), [WORKWISE]: null, [SILENT]: null },
          quotes_absence: {},
        }),
        otherProduct(9002, "KEYBOARD"),
        otherProduct(9003, "MOUSE"),
      ],
    }));

    const col = columnFor("Workwise IT Wale");
    expect(within(col).getByText(/Partial — 2 of 3 items quoted/i)).toBeInTheDocument();
  });
});

// ===========================================================================
// 3. The helpers underneath, and the workbook that carries the same claim.
// ===========================================================================

describe("computeHelpers — coverage vs response", () => {
  const products = [
    screenProduct(),
    otherProduct(9002, "KEYBOARD"),
    otherProduct(9003, "MOUSE"),
  ];

  it("keeps vendorCoverage on COMPARABLE cells (it feeds the grand-total rank)", () => {
    // A grand total missing a disqualified line is not apples-to-apples with a
    // complete one, so the disqualified vendor must stay out of the L-rank.
    expect(C.vendorCoverage(WORKWISE, products)).toBe(2);
    expect(C.isFullCoverage(WORKWISE, products)).toBe(false);
    expect(C.vendorRanks([{ id: ACME }, { id: WORKWISE }], products)[WORKWISE]).toBeUndefined();
  });

  it("counts the disqualified line as a reply", () => {
    expect(C.vendorDisqualified(WORKWISE, products)).toBe(1);
    expect(C.vendorResponded(WORKWISE, products)).toBe(3);
    // The genuinely silent vendor is unaffected.
    expect(C.vendorDisqualified(SILENT, products)).toBe(0);
    expect(C.vendorResponded(SILENT, products)).toBe(2);
  });

  it("reads the absence reason only for vendors the gate held out", () => {
    expect(C.cellAbsence(products[0], WORKWISE).status).toBe("TECH_FAILED");
    expect(C.cellAbsence(products[0], SILENT)).toBeNull();
    expect(C.cellAbsence(products[0], ACME)).toBeNull();
  });
});

describe("quoteComparisonExcel — the workbook does not call a disqualified vendor a non-bidder", () => {
  const p = screenProduct();

  it("writes a distinct status for each kind of empty cell", () => {
    expect(XL.bidStatusOf(p, ACME)).toBe("Quoted");
    expect(XL.bidStatusOf(p, WORKWISE)).toBe(XL.TECH_FAILED);
    expect(XL.bidStatusOf(p, SILENT)).toBe(XL.NO_BID);
    // The exported sheet is forwarded and archived — "NO BID" against a vendor
    // who bid is a claim that outlives the screen.
    expect(XL.TECH_FAILED).not.toBe(XL.NO_BID);
  });

  it("marks an unfinished technical verdict separately from a failure", () => {
    const pending = screenProduct({
      quotes_absence: { [WORKWISE]: { status: "TECH_PENDING", tech_score: null, min_score: 50 } },
    });
    expect(XL.bidStatusOf(pending, WORKWISE)).toBe(XL.TECH_PENDING);
  });
});
