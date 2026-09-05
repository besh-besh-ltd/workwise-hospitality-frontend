// SendQuoteWizard — a `documents` negotiation round must be answerable, and the
// vendor must be able to read what was actually asked for.
//
// Reported on RFQ 536312 (prod rounds 912/950/980 — is_rfq_level; 1005 —
// per-product). Four rounds asking for product photos; the vendor uploaded
// nothing across three weeks and reported the upload button was dead and that
// nothing on screen said a negotiation was running.
//
// Two independent defects, both confirmed against the production round shapes:
//
// 1. THE ASK IS INVISIBLE. Two writers emit `documents` fields:
//      - negotiationHelpers.js:357 (per-vendor)  -> { target: [ …docs ], demand: "…" }
//      - negotiationHelpers.js:402 (global/RFQ)  -> { target: "kindly add photos" }
//    `parseDocAsks` only ever read `demand`, so the second shape — 7 of the 8
//    `documents` fields in the production `products[]` column — rendered as an
//    empty hint. The buyer's words never reached the vendor.
//
// 2. THE UPLOADER IS UNCLICKABLE. An RFQ-level round names no product, so every
//    line is `bidExpiredForProduct` and gets `.lineCard.locked`, which sets
//    `pointer-events: none` on the whole card. The documents input is
//    deliberately left `disabled={false}` for exactly this case, but the CSS
//    took it down with everything else — the input was enabled in the DOM and
//    dead to the mouse. Verified in a browser: elementFromPoint at the button's
//    centre returned the card, not the label.
//
// jsdom applies no CSS, so (2) is pinned here on the mechanism that causes it:
// the fully-locked class must not be on a card whose uploader is live.

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRFQById: jest.fn(),
  sendQuotation: jest.fn(),
  updateQuotation: jest.fn(() => Promise.resolve({ status: 1 })),
  fetchVendorAgreement: jest.fn(() => Promise.resolve({ data: [] })),
  addVendorAgreement: jest.fn(),
  fetchQuoteHistory: jest.fn(() => Promise.resolve({ data: [] })),
  fetchDeviationPreviews: jest.fn(() => Promise.resolve({ data: [] })),
  handleUploadFile: jest.fn(),
  createTenderPaymentOrder: jest.fn(),
  verifyTenderPayment: jest.fn(),
  getChargeNames: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  getAllVendorNegotiationStatus: jest.fn(() => Promise.resolve({ status: 1, data: [] })),
}));

jest.mock("@/services/clarification", () => ({
  __esModule: true,
  getClarifications: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock("@/hooks/usePreviewTotals", () => ({
  __esModule: true,
  default: () => ({ totals: null, isLoading: false, error: null }),
}));

jest.mock("@/utils/quoteExcel", () => ({ __esModule: true, downloadQuoteExcel: jest.fn() }));
jest.mock("@/components/modal/RegretQuoteReasonModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/QuoteMethodModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/clarification", () => ({
  __esModule: true,
  RaiseClarificationModal: () => null,
  ClarificationDetailModal: () => null,
}));
jest.mock("./ClauseChatDrawer", () => ({ __esModule: true, default: () => null }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "771", type: "update-quote" },
    pathname: "/dashboard/vendor/quote",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));

jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 834, name: "Bhavesh Gawad" } }),
}));

import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { getRFQById, updateQuotation, handleUploadFile } from "@/services/rfq";
import { toast } from "react-toastify";
import {
  getAllActiveNegotiationRounds,
  getAllVendorNegotiationStatus,
} from "@/services/negotiation";
import SendQuoteWizard from "./SendQuoteWizard";

const VENDOR_ID = 834;
const P1 = 4222;
const P2 = 4224;

const mkRfq = () => ({
  id: 771,
  rfq_no: 536312,
  title: "Ira By Orchid Bhavnagar :- Mobile for the F&B Service and Front Office",
  is_tender: 0,
  company_name: "Kamat Hotels (India) Ltd",
  bid_end_date: "2026-08-08 14:00",
  comment: "",
  terms: [],
  products: [
    {
      id: P1,
      product_id: 2092,
      variant: 0,
      product_details: [{ name: "Mobile - F&B Service" }],
      product_specs: [{ title: "Quantity", value: "2" }, { title: "Unit", value: "nos" }],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
    {
      id: P2,
      product_id: 2248,
      variant: 0,
      product_details: [{ name: "Mobile - Front Office" }],
      product_specs: [{ title: "Quantity", value: "1" }, { title: "Unit", value: "nos" }],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
  quotations: [
    {
      id: 926,
      pricing_method: "TRADITIONAL",
      payment_terms: [{ id: 1, type: "advance", value: 100, days: null, comment: "" }],
      products: [
        { product_id: 2092, variant: 0, pricing_method: "TRADITIONAL", unit_price: 21000, tax: 18, tax_mode: "percentage", delivery_period: 7 },
        { product_id: 2248, variant: 0, pricing_method: "TRADITIONAL", unit_price: 1620, tax: 18, tax_mode: "percentage", delivery_period: 7 },
      ],
    },
  ],
});

/** Round 980 as stored: is_rfq_level, `target` a plain STRING, no `demand`. */
const rfqLevelStringRound = (text = "kindly add Product image") => ({
  id: 980,
  round_number: 3,
  status: "ACTIVE",
  end_date: "2099-08-27 11:30:00",
  rfq_product_id: null,
  products: [
    {
      is_rfq_level: true,
      vendor_targets: [
        { vendor_id: VENDOR_ID, fields: [{ name: "documents", target: text }] },
      ],
    },
  ],
});

/** Round 1005 as stored: per-product, `target` a plain STRING. */
const perProductStringRound = (text = "Need Photos") => ({
  id: 1005,
  round_number: 4,
  status: "ACTIVE",
  end_date: "2099-09-01 12:30:00",
  rfq_product_id: null,
  products: [
    { rfq_product_id: P1, vendor_targets: [{ vendor_id: VENDOR_ID, fields: [{ name: "documents", target: text }] }] },
    { rfq_product_id: P2, vendor_targets: [{ vendor_id: VENDOR_ID, fields: [{ name: "documents", target: text }] }] },
  ],
});

/** The other writer's shape — array of per-doc comments plus a free-text demand. */
const rfqLevelArrayRound = () => ({
  id: 981,
  round_number: 5,
  status: "ACTIVE",
  end_date: "2099-08-27 11:30:00",
  rfq_product_id: null,
  products: [
    {
      is_rfq_level: true,
      vendor_targets: [
        {
          vendor_id: VENDOR_ID,
          fields: [
            {
              name: "documents",
              target: [{ document_index: 0, file_url: "https://f/a.pdf", comment: "illegible" }],
              demand: "Send the datasheet",
            },
          ],
        },
      ],
    },
  ],
});

let container;
const renderWizard = async (rounds) => {
  getRFQById.mockResolvedValue({ data: mkRfq() });
  getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
  getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: [] });
  ({ container } = render(<SendQuoteWizard />));
  await screen.findByText(/Negotiation round in progress/i, {}, { timeout: 5000 });
};

const gotoStep = async (label) => {
  const tab = (await screen.findAllByText(label))[0];
  await userEvent.click(tab.closest("button") || tab);
};

const lineCards = () => [...container.querySelectorAll('[class*="lineCard"]')];

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("a documents ask stored as a plain string (the shape most rounds use)", () => {
  test("per-product: the buyer's words reach the vendor", async () => {
    await renderWizard([perProductStringRound("Need Photos")]);
    await gotoStep("Pricing");
    expect(await screen.findAllByText(/Need Photos/)).not.toHaveLength(0);
  });

  test("RFQ-level: the buyer's words reach the vendor on the line hint", async () => {
    await renderWizard([rfqLevelStringRound("kindly add Product image")]);
    await gotoStep("Pricing");
    expect(
      await screen.findAllByText(/kindly add Product image/)
    ).not.toHaveLength(0);
  });

  test("RFQ-level: the buyer's words reach the vendor on Commercial terms", async () => {
    await renderWizard([rfqLevelStringRound("kindly add Product image")]);
    await gotoStep("Commercial terms");
    expect(
      await screen.findAllByText(/kindly add Product image/)
    ).not.toHaveLength(0);
  });

  test("the array+demand shape still renders its demand", async () => {
    await renderWizard([rfqLevelArrayRound()]);
    await gotoStep("Commercial terms");
    expect(await screen.findAllByText(/Send the datasheet/)).not.toHaveLength(0);
  });
});

describe("the uploader on a line frozen only by an RFQ-level documents ask", () => {
  // `.lineCard.locked` sets `pointer-events: none` on the whole card. Every
  // other control inside is already `disabled` in its own right, so that class
  // buys nothing — and it silently un-clicked the one control deliberately left
  // enabled. The card must therefore not carry it while the uploader is live.
  test("the card is not rendered fully locked", async () => {
    await renderWizard([rfqLevelStringRound()]);
    await gotoStep("Pricing");

    const cards = lineCards();
    expect(cards.length).toBe(2);
    cards.forEach((card) => {
      expect(card.className).not.toMatch(/\blocked\b/);
    });
  });

  test("the file input is enabled and the price input is not", async () => {
    await renderWizard([rfqLevelStringRound()]);
    await gotoStep("Pricing");

    const card = lineCards()[0];
    const fileInput = card.querySelector('input[type="file"]');
    expect(fileInput).toBeEnabled();

    // The freeze that matters is still in force: this round did not open price.
    const priceInput = within(card).getByPlaceholderText("0.00");
    expect(priceInput).toBeDisabled();
  });

  test("a line finalized for another vendor stays fully locked", async () => {
    const rfq = mkRfq();
    rfq.products[0].finalization_status = "Another vendor is finalized";
    getRFQById.mockResolvedValue({ data: rfq });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [rfqLevelStringRound()] });
    getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: [] });
    ({ container } = render(<SendQuoteWizard />));
    await screen.findByText(/Negotiation round in progress/i, {}, { timeout: 5000 });
    await gotoStep("Pricing");

    // Finalization is a real lock, not the not-named-by-this-round freeze.
    expect(lineCards()[0].className).toMatch(/\blocked\b/);
    expect(lineCards()[0].querySelector('input[type="file"]')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 3. THE ASK OUTLIVES THE ANSWER.
//
// Reported again on RFQ 536312 after the first two defects were fixed: round
// 1005 is ACTIVE and asks BOTH lines for photos, the banner says so, the hint
// renders "Need Photos" — and "Attach supporting documents" is still dead.
//
// `docsLocked` inherits `negSubmitted`, the once-per-round rule. The vendor
// answers the round's PRICE, that sets `hasSubmittedQuote`, and the uploader
// closes underneath them while the very same round is still asking that line
// for the document. The Sep 1 fix lifted the freeze only for `rfqLevelDocAsk`,
// so a per-product ask never reached the exemption.
//
// A document is not a price. Answering one must not forfeit the other.
describe("a per-product documents ask, after the vendor has answered the round", () => {
  const answered = (...productIds) =>
    productIds.map((pid) => ({
      id: 1005,
      round_number: 4,
      rfq_product_id: pid,
      hasSubmittedQuote: true,
      vendor_quoted_price: 20000,
      vendor_submitted_at: "2026-09-02 10:00:00",
      target_price: null,
    }));

  const renderAnswered = async (rounds, status) => {
    getRFQById.mockResolvedValue({ data: mkRfq() });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
    getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: status });
    ({ container } = render(<SendQuoteWizard />));
    await screen.findByText(/Negotiation round in progress/i, {}, { timeout: 5000 });
  };

  test("the uploader stays open on the line the round is asking about", async () => {
    await renderAnswered([perProductStringRound("Need Photos")], answered(P1, P2));
    await gotoStep("Pricing");

    const card = lineCards()[0];
    expect(card.querySelector('input[type="file"]')).toBeEnabled();
  });

  test("the card is not rendered fully locked, so the uploader is clickable", async () => {
    await renderAnswered([perProductStringRound("Need Photos")], answered(P1, P2));
    await gotoStep("Pricing");

    // `.lineCard.locked` is `pointer-events: none` — enabled in the DOM and
    // dead to the mouse is exactly how this was reported the first time.
    lineCards().forEach((card) => {
      expect(card.className).not.toMatch(/\blocked\b/);
    });
  });

  test("the price stays closed — once per round still means once per round", async () => {
    await renderAnswered([perProductStringRound("Need Photos")], answered(P1, P2));
    await gotoStep("Pricing");

    const priceInput = within(lineCards()[0]).getByPlaceholderText("0.00");
    expect(priceInput).toBeDisabled();
  });

  test("a round that does NOT ask for documents keeps the uploader shut", async () => {
    const priceOnlyRound = {
      id: 1006,
      round_number: 5,
      status: "ACTIVE",
      end_date: "2099-09-01 12:30:00",
      rfq_product_id: null,
      products: [
        { rfq_product_id: P1, vendor_targets: [{ vendor_id: VENDOR_ID, fields: [{ name: "base_price", target: 19000 }] }] },
        { rfq_product_id: P2, vendor_targets: [{ vendor_id: VENDOR_ID, fields: [{ name: "base_price", target: 1500 }] }] },
      ],
    };
    await renderAnswered([priceOnlyRound], answered(P1, P2));
    await gotoStep("Pricing");

    expect(lineCards()[0].querySelector('input[type="file"]')).toBeDisabled();
  });

  test("a line finalized for another vendor stays locked even with a live ask", async () => {
    const rfq = mkRfq();
    rfq.products[0].finalization_status = "Another vendor is finalized";
    getRFQById.mockResolvedValue({ data: rfq });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [perProductStringRound("Need Photos")] });
    getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: answered(P1, P2) });
    ({ container } = render(<SendQuoteWizard />));
    await screen.findByText(/Negotiation round in progress/i, {}, { timeout: 5000 });
    await gotoStep("Pricing");

    expect(lineCards()[0].className).toMatch(/\blocked\b/);
    expect(lineCards()[0].querySelector('input[type="file"]')).toBeDisabled();
  });
  test("the answered line carries its new file all the way to the server", async () => {
    // The silent-data-loss half. filteredProducts drops every line whose round
    // the vendor has already answered, so opening the uploader without this
    // exemption would let them attach a file, see it listed, submit, and lose
    // it - strictly worse than the disabled control they reported.
    handleUploadFile.mockResolvedValue({ data: [{ file_path: "https://files/photo.jpg" }] });
    await renderAnswered([perProductStringRound("Need Photos")], answered(P1, P2));
    await gotoStep("Pricing");

    const input = lineCards()[0].querySelector('input[type="file"]');
    await userEvent.upload(input, new File(["x"], "photo.jpg", { type: "image/jpeg" }));

    const review = (await screen.findAllByText("Review & submit"))[0];
    await userEvent.click(review.closest("button") || review);
    const submit = await screen.findByRole("button", { name: /Confirm & Update/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    await waitFor(() => expect(updateQuotation).toHaveBeenCalled());
    const [, payload] = updateQuotation.mock.calls[0];
    expect(payload.products).toHaveLength(1);
    expect(payload.products[0].id).toBe(P1);
    expect(payload.products[0].document_files).toContain("https://files/photo.jpg");
  });

  test("with nothing attached, the once-per-round refusal still stands", async () => {
    // The exemption is scoped to lines that actually carry a file. With none,
    // every line is still dropped and the submit is refused exactly as before —
    // opening the uploader must not reopen the price round by a side door.
    await renderAnswered([perProductStringRound("Need Photos")], answered(P1, P2));

    const review = (await screen.findAllByText("Review & submit"))[0];
    await userEvent.click(review.closest("button") || review);
    const submit = await screen.findByRole("button", { name: /Confirm & Update/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/already submitted your revised quote/i)
      )
    );
    expect(updateQuotation).not.toHaveBeenCalled();
  });
});
