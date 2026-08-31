// ARC v2 vendor quote page — the GSTIN box seeds from the vendor's company
// profile.
//
// Same defect and same rule as the RFQ quote wizard: `gstin_used` is a column
// on tbl_arc_quote, so it is scoped to ONE contract quote and every new ARC
// opened with an empty box. Both surfaces now go through utils/gstin.seedGstin
// so they cannot answer the vendor differently.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetRequestDetail: jest.fn(),
  vendorGetRequestLifecycle: jest.fn(),
  vendorQuoteHistory: jest.fn(() => Promise.resolve({ data: [] })),
  vendorGetTechClauses: jest.fn(() => Promise.resolve({ data: { clauses: [] } })),
  vendorSaveQuoteDraft: jest.fn(() => Promise.resolve({ data: {} })),
  vendorSubmitQuote: jest.fn(() => Promise.resolve({ data: {} })),
  vendorWithdrawQuote: jest.fn(() => Promise.resolve({ data: {} })),
  vendorAcceptTerms: jest.fn(() => Promise.resolve({ data: {} })),
  downloadVendorQuotePdf: jest.fn(),
  vendorSaveTechEnvelopeDraft: jest.fn(),
  vendorSaveUniversalTechEnvelopeDraft: jest.fn(),
  vendorUploadTechEvidence: jest.fn(),
  vendorDeleteTechEvidence: jest.fn(),
  vendorUploadUniversalTechEvidence: jest.fn(),
  vendorDeleteUniversalTechEvidence: jest.fn(),
  vendorSubmitTechEnvelope: jest.fn(),
}));

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getChargeNames: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock("@/hooks/useArcQuotePreview", () => ({
  __esModule: true,
  default: () => ({ preview: null, isLoading: false, error: null }),
}));

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const replace = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { contractId: "77", stage: "commercial" },
    pathname: "/dashboard/vendor/rate-contracts/[contractId]/quote",
    push: jest.fn(),
    replace,
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import VendorArcQuotePage from "./quote";

const PROFILE_GSTIN = "29AAACW1234F1Z5";
const QUOTE_GSTIN = "27BBBCW9876K1Z3";

const lifecycle = () => ({
  data: {
    default_stage: "commercial",
    stages: [
      { key: "overview", label: "Overview", state: "done" },
      { key: "commercial", label: "Pricing", state: "current" },
    ],
  },
});

const detail = ({ profileGstin = null, quoteGstin = undefined } = {}) => ({
  data: {
    arc: {
      id: 77,
      arc_number: "ARC-0077",
      title: "Beverages rate contract",
      status: "floated",
      submission_end_at: "2099-01-01T00:00:00.000Z",
      terms_and_conditions: "",
    },
    items: [
      { id: 501, product_variant_id: 1, indicative_qty: 500, uom: "litre", product_name: "Cola" },
    ],
    invitation: { status: "viewed" },
    quote:
      quoteGstin === undefined
        ? null
        : {
            id: 9001,
            gstin_used: quoteGstin,
            payment_terms_notes: "",
            terms_accepted_at: "2026-08-01 10:00:00",
            pricing_method: "TRADITIONAL",
            quote_pricing: {},
          },
    lines: [],
    tech_envelope: { required: false, tech_submitted_at: null, clauses_total: 0, clauses_answered: 0 },
    vendor_profile_gstin: profileGstin,
  },
});

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  ArcApi.vendorGetRequestLifecycle.mockResolvedValue(lifecycle());
});

const gstinBox = async () => screen.findByPlaceholderText("29ABCDE1234F1Z5");

describe("ARC quote page — GSTIN seeding", () => {
  it("fills an empty box from the vendor's company profile", async () => {
    ArcApi.vendorGetRequestDetail.mockResolvedValue(detail({ profileGstin: PROFILE_GSTIN, quoteGstin: null }));

    render(<VendorArcQuotePage />);

    await waitFor(async () => expect(await gstinBox()).toHaveValue(PROFILE_GSTIN));
  });

  it("never overwrites the gstin_used already on the contract quote", async () => {
    ArcApi.vendorGetRequestDetail.mockResolvedValue(
      detail({ profileGstin: PROFILE_GSTIN, quoteGstin: QUOTE_GSTIN })
    );

    render(<VendorArcQuotePage />);

    await waitFor(async () => expect(await gstinBox()).toHaveValue(QUOTE_GSTIN));
  });

  it("leaves the box empty when the profile carries no GSTIN", async () => {
    ArcApi.vendorGetRequestDetail.mockResolvedValue(detail({ profileGstin: null, quoteGstin: null }));

    render(<VendorArcQuotePage />);

    const box = await gstinBox();
    await waitFor(() => expect(box).toHaveValue(""));
  });

  it("refuses to seed a malformed profile GSTIN", async () => {
    ArcApi.vendorGetRequestDetail.mockResolvedValue(detail({ profileGstin: "27AABCJ9086F1Z", quoteGstin: null }));

    render(<VendorArcQuotePage />);

    const box = await gstinBox();
    await waitFor(() => expect(box).toHaveValue(""));
  });
});
