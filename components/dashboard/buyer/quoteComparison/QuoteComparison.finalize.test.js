// QuoteComparison — a bulk award that only half-lands must say what did not.
//
// The defect, reproduced live on RFQ 363: finalising 3 products across 2
// vendors, one product was refused by /rfq/finalize with a perfectly clear
// reason —
//
//   400 { status: 2, message: "An active negotiation round is ongoing for this
//         product. Vendor finalization is restricted until the round ends." }
//
// — and the sheet rendered "1 finalization failed." The buyer was left
// part-awarded, not knowing which product, which vendor, or why, with no route
// back except guessing.
//
// The endpoint refuses for more than one reason (an open negotiation round; a
// technically disqualified vendor) and will learn others, so nothing here may
// be specific to a single message: the server's sentence is passed through
// verbatim, whatever it says. The "two different reasons in one run" case
// below exists to keep that honest.

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
  finalizeQuotation: jest.fn(() => Promise.resolve({ status: 1 })),
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
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import { finalizeQuotation } from "@/services/rfq";
import QuoteComparison, { awardCellAnchorId } from "./QuoteComparison";

const RFQ_ID = "363";
const ACME = 431;
const METRO = 433;

// The three products of the live case. `product_variant_id` is what the
// finalize payload carries, so the stub keys its verdicts on it.
const SCREEN = { id: 9001, pvid: 71001, name: "LAPTOP SCREEN" };
const KEYBOARD = { id: 9002, pvid: 71002, name: "KEYBOARD" };
const MOUSE = { id: 9003, pvid: 71003, name: "MOUSE" };

// The server's own words, quoted exactly as production sends them.
const NEGOTIATION_REASON =
  "An active negotiation round is ongoing for this product. Vendor finalization is restricted until the round ends.";
const TECH_REASON =
  "This vendor failed the technical evaluation for this product (scored 20 against a minimum of 50). A technically disqualified vendor cannot be finalized.";

const cell = (base, vendorId, quoteId) => ({
  base,
  subtotal: base * 10,
  tax_amt: Math.round(base * 10 * 0.18),
  delivery_charges: 0,
  total: Math.round(base * 10 * 1.18),
  other_charges: [],
  global_charges: [],
  history: [],
  negotiation: null,
  finalize: {
    vendor_id: vendorId,
    quote_id: quoteId,
    quote_item_id: quoteId * 10,
    unit_price: base,
    total_value: base * 10,
    charges_meta: {},
  },
});

const product = (p, over = {}) => ({
  id: p.id,
  product_variant_id: p.pvid,
  variant: 0,
  name: p.name,
  qty: 10,
  unit: "nos",
  category: 1,
  state: "open",
  awaiting_me: false,
  finalized_vendor: null,
  finalized_by: null,
  negotiation: null,
  reject_info: null,
  quoted_count: 2,
  tech: { configured: false, scores: {} },
  quotes: { [ACME]: cell(1000, ACME, 11), [METRO]: cell(1200, METRO, 12) },
  quotes_absence: {},
  approval: { current_approvers: [] },
  ...over,
});

const payload = (over = {}) => ({
  rfq: {
    id: 363, rfq_no: "535917", number: "535917", title: "IT hardware", status: "OPEN",
    project_id: null, tech_clauses: true,
  },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [
    { id: ACME, name: "Acme Systems", short: "AS" },
    { id: METRO, name: "Metro Fittings", short: "MF" },
  ],
  categories: [{ id: 1, name: "IT" }],
  products: [product(SCREEN), product(KEYBOARD), product(MOUSE)],
  approval_chain: [],
  has_delivery_charges: false,
  ...over,
});

// How services/rfq.js rejects: the whole axios error wrapped in `{ message }`,
// so the server's sentence sits at err.message.response.data.message.
const refusal = (message) => ({
  message: Object.assign(new Error("Request failed with status code 400"), {
    response: { status: 400, data: { status: 2, message } },
  }),
});

beforeEach(() => {
  jest.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  finalizeQuotation.mockResolvedValue({ status: 1 });
  getQuoteComparisonView.mockResolvedValue(payload());
});

const cellFor = (productId, vendorId) =>
  document.getElementById(awardCellAnchorId(productId, vendorId));

const renderSheet = async (view = payload()) => {
  getQuoteComparisonView.mockResolvedValue(view);
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded />);
  await screen.findByText("LAPTOP SCREEN");
  return utils;
};

const select = (productId, vendorId) =>
  fireEvent.click(
    within(cellFor(productId, vendorId)).getByRole("button", { name: /select for this item/i })
  );

// Open the finalize sheet, write the mandatory comment, submit.
const submitAward = async () => {
  fireEvent.click(screen.getByRole("button", { name: /^Finalise \d+ ·/ }));
  await screen.findByText("Finalise vendor selection");
  fireEvent.change(screen.getByLabelText(/comment/i), {
    target: { value: "Lowest landed cost across the shortlist." },
  });
  // One POST per selected product, then a silent refetch — let the whole chain
  // settle inside act() so the result view is asserted against a quiet tree.
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /confirm & create po draft/i }));
  });
};

// The result sheet, scoped: product names also appear in the grid behind it.
const resultPanel = () => screen.getByRole("dialog", { name: /finalize result/i });
// The row (list item) that carries a given piece of text, inside a container.
const rowWith = (text, container = resultPanel()) =>
  within(container).getByText(text).closest("li");
const closeResult = () => fireEvent.click(screen.getByRole("button", { name: /back to the sheet/i }));

// ===========================================================================
// 1. A partial award names every line, on both sides of the split.
// ===========================================================================

describe("bulk finalize — a partial award is reported per item, not as a count", () => {
  it("names the refused product, the vendor it was for, and the server's reason — and still reports the successes", async () => {
    finalizeQuotation.mockImplementation((body) =>
      body.product_variant_id === SCREEN.pvid
        ? Promise.reject(refusal(NEGOTIATION_REASON))
        : Promise.resolve({ status: 1 })
    );

    await renderSheet();
    select(SCREEN.id, METRO);
    select(KEYBOARD.id, ACME);
    select(MOUSE.id, ACME);
    await submitAward();

    // The old copy — a bare count with no subject — must be gone.
    await screen.findByText("Partly finalized");
    expect(screen.queryByText(/finalization failed/i)).toBeNull();

    // Every field the product owner asked for, on one row.
    const failed = rowWith(NEGOTIATION_REASON);
    expect(within(failed).getByText("LAPTOP SCREEN")).toBeInTheDocument();
    expect(within(failed).getByText(/Metro Fittings/)).toBeInTheDocument();

    // The successes are not swallowed by the failure.
    const panel = resultPanel();
    expect(within(panel).getByText(/Finalized · 2/)).toBeInTheDocument();
    expect(within(panel).getByText(/Not finalized · 1/)).toBeInTheDocument();
    const awarded = rowWith("KEYBOARD");
    expect(within(awarded).getByText(/Awarded to Acme Systems/)).toBeInTheDocument();
    expect(rowWith("MOUSE")).not.toBeNull();

    // …and the buyer is told, in words, that the award is incomplete.
    expect(within(panel).getByText(/2 of 3 products were finalized/i)).toBeInTheDocument();
  });

  it("reports two different refusals with their own reasons in one run", async () => {
    // Proves the reporting is generic over whatever the endpoint refuses. The
    // technical-disqualification refusal is a second, independently added guard
    // on the same endpoint; neither message is known to the client.
    finalizeQuotation.mockImplementation((body) => {
      if (body.product_variant_id === SCREEN.pvid) return Promise.reject(refusal(NEGOTIATION_REASON));
      if (body.product_variant_id === MOUSE.pvid) return Promise.reject(refusal(TECH_REASON));
      return Promise.resolve({ status: 1 });
    });

    await renderSheet();
    select(SCREEN.id, METRO);
    select(KEYBOARD.id, ACME);
    select(MOUSE.id, ACME);
    await submitAward();

    await screen.findByText("Partly finalized");
    expect(within(resultPanel()).getByText(/Not finalized · 2/)).toBeInTheDocument();

    const negRow = rowWith(NEGOTIATION_REASON);
    expect(within(negRow).getByText("LAPTOP SCREEN")).toBeInTheDocument();
    expect(within(negRow).getByText(/Metro Fittings/)).toBeInTheDocument();

    const techRow = rowWith(TECH_REASON);
    expect(within(techRow).getByText("MOUSE")).toBeInTheDocument();
    expect(within(techRow).getByText(/Acme Systems/)).toBeInTheDocument();

    // Two refusals, two different sentences — not one message applied to both.
    expect(negRow).not.toBe(techRow);
  });

  it("says so plainly when nothing at all was finalized", async () => {
    finalizeQuotation.mockRejectedValue(refusal(NEGOTIATION_REASON));

    await renderSheet();
    select(SCREEN.id, ACME);
    select(KEYBOARD.id, ACME);
    await submitAward();

    await screen.findByText("Nothing was finalized");
    const panel = resultPanel();
    expect(within(panel).getByText(/Not finalized · 2/)).toBeInTheDocument();
    expect(within(panel).queryByText(/^Finalized · \d/)).toBeNull();
  });
});

// ===========================================================================
// 2. A reason the client cannot read is still a reason the buyer must see.
// ===========================================================================

describe("bulk finalize — when the server sends nothing usable", () => {
  it("falls back to actionable copy rather than axios boilerplate", async () => {
    // A 500 with an empty body: the axios error's own message is
    // "Request failed with status code 500", which tells a buyer nothing.
    finalizeQuotation.mockImplementation((body) =>
      body.product_variant_id === SCREEN.pvid
        ? Promise.reject({
            message: Object.assign(new Error("Request failed with status code 500"), {
              response: { status: 500, data: {} },
            }),
          })
        : Promise.resolve({ status: 1 })
    );

    await renderSheet();
    select(SCREEN.id, ACME);
    select(KEYBOARD.id, ACME);
    await submitAward();

    await screen.findByText("Partly finalized");
    const failed = rowWith("LAPTOP SCREEN");
    expect(within(failed).getByText(/did not give a reason/i)).toBeInTheDocument();
    expect(screen.queryByText(/request failed with status code/i)).toBeNull();
  });

  it("treats a refusal sent with a 2xx as a refusal, and quotes it", async () => {
    // This API marks failure with `status: 2` in the body; the axios wrapper
    // unwraps 2xx responses, so such a body arrives on the RESOLVE path.
    finalizeQuotation.mockImplementation((body) =>
      Promise.resolve(
        body.product_variant_id === SCREEN.pvid
          ? { status: 2, message: NEGOTIATION_REASON }
          : { status: 1 }
      )
    );

    await renderSheet();
    select(SCREEN.id, ACME);
    select(KEYBOARD.id, ACME);
    await submitAward();

    await screen.findByText("Partly finalized");
    expect(within(rowWith(NEGOTIATION_REASON)).getByText("LAPTOP SCREEN")).toBeInTheDocument();
  });
});

// ===========================================================================
// 3. The detail has to outlive the sheet, and the refused lines stay actionable.
// ===========================================================================

describe("bulk finalize — recovering from a partial award", () => {
  it("keeps naming the product, vendor and reason after the result sheet is closed", async () => {
    finalizeQuotation.mockImplementation((body) =>
      body.product_variant_id === SCREEN.pvid
        ? Promise.reject(refusal(NEGOTIATION_REASON))
        : Promise.resolve({ status: 1 })
    );

    await renderSheet();
    select(SCREEN.id, METRO);
    select(KEYBOARD.id, ACME);
    await submitAward();
    await screen.findByText("Partly finalized");

    closeResult();
    await waitFor(() => expect(screen.queryByText("Partly finalized")).toBeNull());

    // Still on screen, next to the grid the buyer has to act on.
    const banner = screen.getByText(new RegExp(NEGOTIATION_REASON.slice(0, 40))).closest("li");
    expect(within(banner).getByText("LAPTOP SCREEN")).toBeInTheDocument();
    expect(banner).toHaveTextContent(/Metro Fittings/);
    expect(screen.getByText(/Partly finalized — 1 awarded, 1 refused/i)).toBeInTheDocument();

    // And it goes away only when the buyer says so.
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    await waitFor(() => expect(screen.queryByText(/1 awarded, 1 refused/i)).toBeNull());
  });

  it("leaves the refused line selected so the buyer can retry it", async () => {
    finalizeQuotation.mockImplementation((body) =>
      body.product_variant_id === SCREEN.pvid
        ? Promise.reject(refusal(NEGOTIATION_REASON))
        : Promise.resolve({ status: 1 })
    );

    await renderSheet();
    select(SCREEN.id, METRO);
    select(KEYBOARD.id, ACME);
    select(MOUSE.id, ACME);
    await submitAward();
    await screen.findByText("Partly finalized");
    closeResult();

    // One line left over, still pointed at the vendor it was meant for.
    await screen.findByRole("button", { name: /^Finalise 1 ·/ });
    expect(within(cellFor(SCREEN.id, METRO)).getByText(/selected/i)).toBeInTheDocument();
    expect(within(cellFor(KEYBOARD.id, ACME)).queryByText(/^Selected$/)).toBeNull();
  });

  it("reopening the sheet shows the confirm step again, not the stale result", async () => {
    finalizeQuotation.mockRejectedValue(refusal(NEGOTIATION_REASON));

    await renderSheet();
    select(SCREEN.id, ACME);
    await submitAward();
    await screen.findByText("Nothing was finalized");
    closeResult();

    fireEvent.click(await screen.findByRole("button", { name: /^Finalise 1 ·/ }));
    expect(await screen.findByText("Finalise vendor selection")).toBeInTheDocument();
    expect(screen.queryByText("Nothing was finalized")).toBeNull();
  });
});

// ===========================================================================
// 4. The clean run is untouched.
// ===========================================================================

describe("bulk finalize — a run with nothing to report", () => {
  it("closes the sheet and confirms the awards", async () => {
    await renderSheet();
    select(SCREEN.id, ACME);
    select(KEYBOARD.id, ACME);
    await submitAward();

    await waitFor(() => expect(screen.queryByText("Finalise vendor selection")).toBeNull());
    expect(await screen.findByText(/2 products finalized/i)).toBeInTheDocument();
    expect(screen.queryByText(/Partly finalized/)).toBeNull();
    expect(screen.queryByText(/Not finalized · /)).toBeNull();
  });
});
