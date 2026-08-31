// SendQuoteWizard — the GSTIN box seeds from the vendor's company profile.
//
// CLIENT-REPORTED DEFECT. Vendors said their GSTIN "was not auto filled" and
// they could no longer tell whether they had ever supplied one.
//
// What was actually happening: `gstin` is a column on tbl_quotes, so it is
// scoped to ONE quote. Re-opening the same quote did restore it (verified
// against production: 93 quote updates on GSTIN-bearing quotes, 93 preserved
// it, 0 wiped). But every NEW RFQ presented an empty box, and a vendor quoting
// on 60 RFQs reads that as "the GSTIN I entered was lost". 566 of 967
// production quotes are blank while that vendor's own company profile holds a
// GSTIN.
//
// Two behaviours are locked in here:
//
//   SEED, NEVER OVERRIDE. An empty box is filled from `vendor_profile_gstin`.
//   A quote that already carries its own GSTIN keeps it untouched — delivery
//   location GSTINs legitimately differ from the head-office one, and that
//   value is what the vendor actually submitted.
//
//   EDITABLE DURING A NEGOTIATION ROUND. The box used to lock on bid expiry
//   (`disabled={isReadOnly || isBidExpired}`), so a vendor invited to a round
//   with no GSTIN on file could not supply one — 215 of 331 production quotes
//   on negotiated RFQs are in that state. The backend never intended this:
//   rfqController.updateQuoteItems states "`gstin` is deliberately not
//   guarded: it carries no price and has no negotiation-vocabulary name, so
//   freezing it would block a legitimate correction for no security gain."
//   The frontend was stricter than the contract it talks to.

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRFQById: jest.fn(),
  sendQuotation: jest.fn(() => Promise.resolve({ status: 1 })),
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
    query: { id: "4242" },
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

import { getRFQById, updateQuotation } from "@/services/rfq";
import { getAllActiveNegotiationRounds } from "@/services/negotiation";
import SendQuoteWizard from "./SendQuoteWizard";

const VENDOR_ID = 7001;
const RFQ_PRODUCT_ID = 11;
const PROFILE_GSTIN = "29AAACW1234F1Z5";
const QUOTE_GSTIN = "27BBBCW9876K1Z3";

const quotedLine = () => ({
  product_id: 12248,
  variant: "standard",
  pricing_method: "TRADITIONAL",
  unit_price: 100,
  tax: 18,
  tax_mode: "percentage",
  delivery_period: 7,
});

/**
 * @param {object} o
 * @param {string|null} o.profileGstin  what tbl_company holds for this vendor
 * @param {string|null|undefined} o.quoteGstin  what tbl_quotes holds; `undefined` = no quote yet
 * @param {boolean} o.expired  bid window closed (the negotiation-round state)
 */
const mkRfq = ({ profileGstin = null, quoteGstin = undefined, expired = false } = {}) => ({
  id: 4242,
  rfq_no: 536999,
  title: "Room door locks",
  is_tender: 0,
  company_name: "Orchid Passaros Goa",
  hotel_name: "Orchid Passaros Goa",
  department_name: "Engineering",
  bid_end_date: expired ? "2020-01-01 12:00:00" : "2099-01-01 12:00:00",
  comment: "",
  terms: [],
  vendor_profile_gstin: profileGstin,
  ...(quoteGstin === undefined
    ? { quotations: [] }
    : {
        quote_details: {
          is_regret: 0,
          regret_reason: null,
          global_payment_term: "",
          global_comment: "",
          global_charges: [],
          gstin: quoteGstin,
        },
        quotations: [
          {
            id: 1103,
            status: 1,
            created_by: VENDOR_ID,
            is_regret: 0,
            pricing_method: "TRADITIONAL",
            global_comment: "",
            global_charges: [],
            payment_terms: [
              { id: 1, type: "advance", value: 100, days: null, comment: "" },
            ],
            products: [quotedLine()],
          },
        ],
      }),
  products: [
    {
      id: RFQ_PRODUCT_ID,
      product_id: 12248,
      variant: "standard",
      product_details: [{ name: "Room door lock", description: "" }],
      product_specs: [
        { title: "Quantity", value: "40" },
        { title: "Unit", value: "nos" },
      ],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
});

/** An RFQ-level round the vendor is invited to — the only reason to open an expired RFQ. */
const rfqLevelRound = () => ({
  id: 944,
  round_number: 3,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    {
      is_rfq_level: true,
      vendor_targets: [
        { vendor_id: VENDOR_ID, fields: [{ name: "payment_terms", demand: "60 days credit" }] },
      ],
    },
  ],
});

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  getAllActiveNegotiationRounds.mockResolvedValue({ data: [] });
  updateQuotation.mockResolvedValue({ status: 1 });
});

/**
 * Render, then walk to the Commercial terms step where the GSTIN box lives.
 *
 * A returning quote lands on Review and can jump straight there. A brand-new
 * quote lands on step 1 and the stepper will not let it past Pricing until a
 * line is actually priced (`canVisit` → `canContinueStep3`), so this walks the
 * real vendor path rather than reaching around it.
 */
const openCommercialTerms = async (rfq) => {
  getRFQById.mockResolvedValue({ data: rfq });
  render(<SendQuoteWizard />);
  await screen.findAllByText("Commercial terms");

  const acceptance = screen.queryByRole("checkbox", { name: /accept the terms/i });
  if (acceptance) {
    await userEvent.click(acceptance);
    await userEvent.click(screen.getAllByText("Pricing")[0]);
    await userEvent.type(await screen.findByPlaceholderText("0.00"), "100");
    await userEvent.type(screen.getByPlaceholderText("7"), "7");
  }

  await userEvent.click(screen.getAllByText("Commercial terms")[0]);
  return screen.findByPlaceholderText("29ABCDE1234F1Z5");
};

const gstinBox = () => screen.getByPlaceholderText("29ABCDE1234F1Z5");

describe("GSTIN seeding from the vendor's company profile", () => {
  it("fills an empty box on a first quote", async () => {
    const input = await openCommercialTerms(mkRfq({ profileGstin: PROFILE_GSTIN }));

    expect(input).toHaveValue(PROFILE_GSTIN);
  });

  it("leaves the box empty when the profile carries no GSTIN", async () => {
    const input = await openCommercialTerms(mkRfq({ profileGstin: null }));

    expect(input).toHaveValue("");
  });

  it("refuses to seed a malformed profile GSTIN", async () => {
    // 18 of 422 production vendor profiles hold junk in this column —
    // truncated to 14 chars, a stray leading ':', and in one case a password.
    // Seeding one would put a value the vendor never typed into the box and
    // then block them at step 4 for a format error on it.
    const input = await openCommercialTerms(mkRfq({ profileGstin: "27AABCJ9086F1Z" }));

    expect(input).toHaveValue("");
    expect(screen.queryByText(/from your company profile/i)).not.toBeInTheDocument();
  });

  it("never overwrites the GSTIN already stored on the quote", async () => {
    const input = await openCommercialTerms(
      mkRfq({ profileGstin: PROFILE_GSTIN, quoteGstin: QUOTE_GSTIN })
    );

    // The head-office GSTIN must not clobber the one submitted for this
    // delivery location.
    expect(input).toHaveValue(QUOTE_GSTIN);
  });

  it("fills a returning quote that was submitted without a GSTIN", async () => {
    const input = await openCommercialTerms(
      mkRfq({ profileGstin: PROFILE_GSTIN, quoteGstin: null })
    );

    expect(input).toHaveValue(PROFILE_GSTIN);
  });

  it("keeps the vendor's own edit — the seed does not reassert itself", async () => {
    const input = await openCommercialTerms(mkRfq({ profileGstin: PROFILE_GSTIN }));

    await userEvent.clear(input);
    await userEvent.type(input, QUOTE_GSTIN);

    expect(gstinBox()).toHaveValue(QUOTE_GSTIN);
  });

  it("tells the vendor where a seeded value came from", async () => {
    await openCommercialTerms(mkRfq({ profileGstin: PROFILE_GSTIN }));

    // The whole complaint was "I cannot tell whether I filled this in".
    expect(screen.getByText(/from your company profile/i)).toBeInTheDocument();
  });

  it("does not claim a profile origin for a GSTIN the vendor actually submitted", async () => {
    await openCommercialTerms(
      mkRfq({ profileGstin: PROFILE_GSTIN, quoteGstin: QUOTE_GSTIN })
    );

    expect(screen.queryByText(/from your company profile/i)).not.toBeInTheDocument();
  });

  it("submits the seeded GSTIN so it reaches tbl_quotes", async () => {
    await openCommercialTerms(
      mkRfq({ profileGstin: PROFILE_GSTIN, quoteGstin: null })
    );

    await userEvent.click(screen.getAllByText("Review & submit")[0]);
    const submit = await screen.findByRole("button", { name: /Confirm & Update/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    // A seed that never persists is just a nicer-looking blank field.
    await waitFor(() => expect(updateQuotation).toHaveBeenCalled());
    expect(updateQuotation.mock.calls[0][1]).toMatchObject({
      vendorGSTIN: PROFILE_GSTIN,
    });
  });
});

describe("GSTIN during an active negotiation round", () => {
  it("stays editable after the bid window closed", async () => {
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [rfqLevelRound()] });

    const input = await openCommercialTerms(
      mkRfq({ profileGstin: null, quoteGstin: null, expired: true })
    );

    // The vendor has no GSTIN on this quote and is being asked to revise it.
    // Locking the field is what left them unable to answer the question.
    await waitFor(() => expect(input).toBeEnabled());
  });

  it("accepts a GSTIN typed during the round", async () => {
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [rfqLevelRound()] });

    const input = await openCommercialTerms(
      mkRfq({ profileGstin: null, quoteGstin: null, expired: true })
    );
    await waitFor(() => expect(input).toBeEnabled());
    await userEvent.type(input, PROFILE_GSTIN);

    expect(gstinBox()).toHaveValue(PROFILE_GSTIN);
  });

  it("blocks submission of a malformed GSTIN now that it can be corrected", async () => {
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [rfqLevelRound()] });

    const input = await openCommercialTerms(
      mkRfq({ profileGstin: null, quoteGstin: null, expired: true })
    );
    await waitFor(() => expect(input).toBeEnabled());
    await userEvent.type(input, "NOTAGSTIN");

    // Validation was skipped post-expiry precisely because the field was
    // locked and the vendor could not act on the complaint. Now they can, so
    // the step gates again and the action bar names the reason.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Continue to review/i })
      ).toBeDisabled()
    );
    expect(
      screen.getByText(/The GSTIN format looks off — it should be 15 characters/i)
    ).toBeInTheDocument();
  });
});
