// Vendor quote page — the HERO must agree with the page under it.
//
// Found in a browser pass: for a group rate contract the hero still named one
// hotel ("Hotel A-1", "Business unit: Hotel A-1") — the lead hotel — directly
// above a body that said "2 invited · group rate contract". The vendor is
// quoting for several hotels; the hero has to say so.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetRequestDetail: jest.fn(),
  vendorGetRequestLifecycle: jest.fn(),
  vendorAcceptTerms: jest.fn(),
  vendorSaveQuoteDraft: jest.fn(),
  vendorSubmitQuote: jest.fn(),
  vendorWithdrawQuote: jest.fn(),
  vendorPreviewQuote: jest.fn(),
  vendorQuoteHistory: jest.fn(),
  downloadVendorQuotePdf: jest.fn(),
  vendorGetTechClauses: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, getChargeNames: jest.fn().mockResolvedValue({ data: [] }) }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: { contractId: "3" }, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@/components/dashboard/rate-contracts/vendor/stages/VendorArcStageTimeline", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/vendor/stages/VendorOverviewStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/vendor/stages/VendorTechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/vendor/stages/VendorCommercialStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/vendor/VendorArcNegotiationBanner", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import VendorQuotePage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/quote";

const detail = (arcOver) => ({
  data: {
    arc: {
      id: 3, arc_number: "ARC-1", title: "Group beverages", category_title: "BEVERAGES",
      hotel_name: "Hotel A-1", status: "floated",
      submission_end_at: "2026-10-03T13:22:00.000Z", contract_start_at: "2026-09-22", contract_end_at: "2027-07-20",
      ...arcOver,
    },
    items: [], invitation: {}, quote: null, lines: [], tech_envelope: null,
    renewal_needed_hotel_ids: [],
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  ArcApi.vendorGetRequestLifecycle.mockResolvedValue({ data: { stages: [] } });
  ArcApi.vendorGetTechClauses.mockResolvedValue({ data: { clauses: [] } });
});

test("a group invitation's hero names the hotels, not just the lead", async () => {
  ArcApi.vendorGetRequestDetail.mockResolvedValue(detail({
    is_group: true,
    hotels: [{ hotel_id: 3, name: "Hotel A-1" }, { hotel_id: 4, name: "Hotel A-2" }],
  }));

  render(<VendorQuotePage />);

  expect(await screen.findByText("Group · 2 hotels")).toBeInTheDocument();
  // Named in the hero sub-line and again in the detail grid.
  expect(screen.getAllByText("Hotel A-1, Hotel A-2").length).toBe(2);
  expect(screen.getByText("Hotels")).toBeInTheDocument();
});

test("a single-hotel invitation still names its business unit", async () => {
  ArcApi.vendorGetRequestDetail.mockResolvedValue(detail({ is_group: false, hotels: [] }));

  render(<VendorQuotePage />);

  expect(await screen.findByText("Business unit")).toBeInTheDocument();
  expect(screen.getAllByText("Hotel A-1").length).toBeGreaterThan(0);
});
