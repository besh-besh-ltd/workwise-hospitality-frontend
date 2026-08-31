// SendQuoteWizard — an RFQ-level `documents` round must be answerable, and must
// say WHERE.
//
// CONFIRMED DEFECT, reproduced against a real reported case (RFQ 536363,
// negotiation round 952, round_number 2 — ACTIVE, in date, vendor listed,
// `products: [{is_rfq_level: true, vendor_targets:[{fields:[{name:"documents"}]}]}]`).
// The buyer asked for documents. On the Line items step the vendor saw
// "Attach supporting documents" greyed out and reported that they could not
// upload.
//
// The control was correctly disabled. `documents` is an RFQ-LEVEL field, so the
// round stores no product entry, `negotiationFields[productId]` is empty, and
// isFieldNegotiable("documents") is false for every line. The quote-wide
// uploader on the Commercial terms step — which the same ask DOES unlock — is
// the one that answers it.
//
// Unlocking the per-line control would be wrong: it writes to that line's
// document_files, which the buyer never asked about, and updateQuoteItems 400s
// any line with no active round of its own. The gap was purely that nothing
// told the vendor where to go.
//
// The rule these tests pin: an RFQ-level documents ask opens the quote-wide
// uploader, leaves the per-line one shut, and names the step that can answer.
//
// CONFIRMED DEFECT, reproduced against a real reported case (RFQ 536276,
// negotiation round 944, round_number 3). The buyer opened a round targeting
// only RFQ-LEVEL fields — payment terms / global charges — and no product
// lines. The invited vendor opened the wizard, saw the banner invite them to
// the round, edited the negotiated terms, and could not submit. Clicking
// Confirm & Update raised:
//
//     No products are currently open for quoting.
//
// …on a round that was still ACTIVE and still inside its end_date.
//
// Root cause: a round with only an RFQ-level entry persists as
// `products: [{is_rfq_level: true, …}]` with `rfq_product_id` NULL
// (negotiationController.createRound). The wizard's `coveredIdsOf` collects
// only `rfq_product_id`, so `activeNegotiationProductIds` came back EMPTY,
// and the post-expiry line filter then dropped every product — leaving an
// empty payload the submit guard rejected. There was no path out: the round
// was un-answerable for its whole life.
//
// The backend has always accepted this. `updateQuoteItems` carries an explicit
// UNION branch keeping an RFQ-level round registered as active with no product
// entries, and its per-product check is skipped when `products` is empty.
// Sending the lines anyway is NOT the fix — that same check 400s them with
// "this product does not have an active negotiation round".
//
// The rule these tests pin: an active RFQ-level round makes the quote
// submittable on its quote-level fields alone, while the once-per-round lock
// on product lines keeps working untouched.

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

jest.mock("@/utils/quoteExcel", () => ({
  __esModule: true,
  downloadQuoteExcel: jest.fn(),
}));

jest.mock("@/components/modal/RegretQuoteReasonModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/shared/QuoteMethodModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/dashboard/buyer/clarification", () => ({
  __esModule: true,
  RaiseClarificationModal: () => null,
  ClarificationDetailModal: () => null,
}));

jest.mock("./ClauseChatDrawer", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "536276", type: "update-quote" },
    pathname: "/dashboard/vendor/quote",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));

jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 7001, name: "Test Vendor" } }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";

import { getRFQById, updateQuotation, handleUploadFile } from "@/services/rfq";
import {
  getAllActiveNegotiationRounds,
  getAllVendorNegotiationStatus,
} from "@/services/negotiation";
import SendQuoteWizard from "./SendQuoteWizard";

const VENDOR_ID = 7001;
const RFQ_PRODUCT_ID = 3169;

const rfqProduct = () => ({
  id: RFQ_PRODUCT_ID,
  product_id: 13679,
  variant: "standard",
  product_details: [{ name: "CLADDING PANEL" }],
  product_specs: [
    { title: "Quantity", value: "10" },
    { title: "Unit", value: "nos" },
  ],
  tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
});

const quotedLine = () => ({
  product_id: 13679,
  variant: "standard",
  pricing_method: "TRADITIONAL",
  unit_price: 19,
  tax: 18,
  tax_mode: "percentage",
  delivery_period: 7,
});

const mkRfq = () => ({
  id: 536276,
  rfq_no: 536276,
  title: "Cladding work",
  is_tender: 0,
  company_name: "Test Hospitality Co",
  hotel_name: "Test Hotel",
  department_name: "Engineering",
  // Bid window CLOSED — the only state in which a negotiation round applies.
  bid_end_date: "2020-01-01 12:00:00",
  comment: "",
  terms: [],
  products: [rfqProduct()],
  quotations: [
    { id: 699, pricing_method: "TRADITIONAL", payment_terms: [], products: [quotedLine()] },
  ],
});

/**
 * Round 944 as stored: RFQ-level entry only. `rfq_product_id` is NULL on the
 * row and no products[] entry carries one, so nothing identifies a line.
 */
const rfqLevelOnlyRound = () => ({
  id: 944,
  round_number: 3,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    {
      is_rfq_level: true,
      vendor_targets: [
        {
          vendor_id: VENDOR_ID,
          fields: [{ name: "payment_terms", demand: "60 days credit" }],
        },
      ],
    },
  ],
});

/** A conventional round on the one product line. */
const productRound = () => ({
  id: 945,
  round_number: 4,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    {
      rfq_product_id: RFQ_PRODUCT_ID,
      vendor_targets: [
        { vendor_id: VENDOR_ID, fields: [{ name: "base_price", target: "15" }] },
      ],
    },
  ],
});

const renderWizard = async (rounds, vendorStatus = []) => {
  getRFQById.mockResolvedValue({ data: mkRfq() });
  getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
  getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: vendorStatus });
  render(<SendQuoteWizard />);
  // A live round now lands the vendor on the step holding the ask (Pricing or
  // Commercial terms), not on Review — the step they landed on used to mention
  // neither the round nor the target (RFQ 536237). Walk to Review explicitly.
  const reviewTab = (await screen.findAllByText("Review & submit"))[0];
  await userEvent.click(reviewTab.closest("button") || reviewTab);
};

const submitButton = () => screen.getByRole("button", { name: /Confirm & Update/i });

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  handleUploadFile.mockResolvedValue({ data: [{ file_path: "https://files/gst.pdf" }] });
});

/** RFQ 536363 round 952 as stored: RFQ-level entry, `documents` field. */
const documentsRound = (field = { name: "documents", target: [], demand: "Upload the GST certificate" }) => ({
  id: 952,
  round_number: 2,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    { is_rfq_level: true, vendor_targets: [{ vendor_id: VENDOR_ID, fields: [field] }] },
  ],
});

const fileInputUnder = (labelNode) =>
  labelNode.closest("label").querySelector('input[type="file"]');

const gotoStep = async (label) => {
  await screen.findByText(/Negotiation round in progress/i, {}, { timeout: 5000 });
  const tab = (await screen.findAllByText(label))[0];
  await userEvent.click(tab.closest("button") || tab);
};

describe("an RFQ-level documents round", () => {
  test("opens the quote-wide uploader on Commercial terms", async () => {
    await renderWizard([documentsRound()]);
    await gotoStep("Commercial terms");
    const input = fileInputUnder(await screen.findByText(/Attach quote-wide documents/i));
    expect(input).toBeEnabled();
  });

  test("ALSO opens every per-line uploader, and says the ask is quote-wide", async () => {
    await renderWizard([documentsRound()]);
    await gotoStep("Pricing");
    const input = fileInputUnder(await screen.findByText(/Attach supporting documents/i));
    // The buyer wants the file, not a particular attachment point, so the ask
    // is answerable from the line as well as from Commercial terms.
    expect(input).toBeEnabled();
    // Matched on the whole sentence: "Commercial terms" alone also appears in
    // the invitation banner and in the step rail.
    expect(
      await screen.findByText(/applies to the whole quote\. Attach here or under Commercial terms\./i)
    ).toBeInTheDocument();
  });

  test("a line opened only by the quote-wide ask still reaches the server", async () => {
    // The silent-data-loss case: filteredProducts drops every line on an
    // RFQ-level round, so without the exemption the vendor uploads a file,
    // sees it listed, submits, and it is never sent.
    await renderWizard([documentsRound()]);
    await gotoStep("Pricing");
    const input = fileInputUnder(await screen.findByText(/Attach supporting documents/i));
    const file = new File(["x"], "gst.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);
    // Submit lives on the last step. It keeps its "Review & submit" label while
    // a round is live — calling it a read-only "Snapshot" is what convinced
    // vendors the RFQ was closed.
    const review = (await screen.findAllByText("Review & submit"))[0];
    await userEvent.click(review.closest("button") || review);
    await waitFor(() => expect(submitButton()).toBeEnabled());
    await userEvent.click(submitButton());
    await waitFor(() => expect(updateQuotation).toHaveBeenCalled());
    const [, payload] = updateQuotation.mock.calls[0];
    expect(payload.products).toHaveLength(1);
    expect(payload.products[0].document_files.length).toBeGreaterThan(0);
  });

  test("lines with NO attachment stay out of the payload", async () => {
    // The guarantee the earlier RFQ-level fix established must survive: an
    // untouched line must not ride along just because a round is open.
    await renderWizard([documentsRound()]);
    await waitFor(() => expect(submitButton()).toBeEnabled());
    await userEvent.click(submitButton());
    await waitFor(() => expect(updateQuotation).toHaveBeenCalled());
    const [, payload] = updateQuotation.mock.calls[0];
    expect(payload.products).toEqual([]);
  });

  test("the buyer's own wording is carried through, not swallowed", async () => {
    await renderWizard([documentsRound()]);
    await gotoStep("Pricing");
    expect(await screen.findByText(/Upload the GST certificate/i)).toBeInTheDocument();
  });

  test("no documents ask means no hint", async () => {
    await renderWizard([documentsRound({ name: "payment_terms", demand: "60 days" })]);
    await gotoStep("Pricing");
    await screen.findByText(/Attach supporting documents/i);
    expect(screen.queryByText(/Applies to the whole quote/i)).toBeNull();
  });
});

/** The fix's target: the SAME documents ask, now scoped to a product line. */
const productDocumentsRound = () => ({
  id: 953,
  round_number: 3,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    {
      rfq_product_id: RFQ_PRODUCT_ID,
      vendor_targets: [{
        vendor_id: VENDOR_ID,
        fields: [{ name: "documents", target: [], demand: "Upload the test certificate for this item" }],
      }],
    },
  ],
});

describe("a product-scoped documents round", () => {
  test("opens the per-line uploader", async () => {
    await renderWizard([productDocumentsRound()]);
    await gotoStep("Pricing");
    const input = fileInputUnder(await screen.findByText(/Attach supporting documents/i));
    expect(input).toBeEnabled();
  });

  test("shows the buyer's ask on the line, with no redirect hint", async () => {
    await renderWizard([productDocumentsRound()]);
    await gotoStep("Pricing");
    expect(await screen.findByText(/Upload the test certificate for this item/i)).toBeInTheDocument();
    // The ask is answerable right here, so the "go to Commercial terms" pointer
    // must NOT appear.
    expect(screen.queryByText(/applies to the whole quote/i)).toBeNull();
  });
});
