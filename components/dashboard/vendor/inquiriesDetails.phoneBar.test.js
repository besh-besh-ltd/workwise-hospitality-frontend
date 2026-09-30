// Vendor inquiry page (/dashboard/vendor/inquiries-details) on a phone.
//
// This is where email / WhatsApp invitation links land. The header action
// row (Queries · Clarification · Regret · Send Quote) did not wrap, so on a
// 390px phone the main CTA sat off-screen. The main CTA (+ an enabled Regret)
// is now mirrored into the shared MobileActionBar; the header copies are
// hidden by CSS at <=768px only. These tests pin that the bar button does
// exactly what the header button does.

const mockPush = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  Router: {},
  useRouter: () => ({
    query: { id: "918" },
    pathname: "/dashboard/vendor/inquiries-details",
    push: mockPush,
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));
jest.mock("next/dynamic", () => ({ __esModule: true, default: () => () => null }));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 872, user_type: 3, name: "Vendor" } }),
}));
jest.mock("@/services/rfq", () => {
  const ok = () => Promise.resolve({ data: [] });
  return {
    __esModule: true,
    getRFQById: jest.fn(),
    closeRFQ: jest.fn(), withdrawPublish: jest.fn(), terminateRFQ: jest.fn(), forcePublishRFQ: jest.fn(),
    getAllClauses: jest.fn(ok), sendQuotation: jest.fn(ok), fetchVendorAgreement: jest.fn(ok),
    getTechClearedVendorsResult: jest.fn(ok), submitRFQApprovalAction: jest.fn(ok),
    getTechEvalStatus: jest.fn(() => Promise.resolve({ data: {} })),
  };
});
jest.mock("@/services/clarification", () => ({ __esModule: true, getClarifications: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/services/negotiation", () => ({ __esModule: true, getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/hooks/useApprovalWorkflow", () => ({ __esModule: true, default: () => ({}) }));
jest.mock("@/hooks/usePreviewTotals", () => ({ __esModule: true, default: () => ({ totals: null, isLoading: false }) }));
jest.mock("@/components/dashboard/buyer/approval", () => ({ __esModule: true, ApprovalPendingBanner: () => null }));
jest.mock("@/components/dashboard/buyer/manageRFQ/RFQLifecycleJourney/RFQLifecycleJourney", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/manageRFQ/RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/negotiation/NegotiationColumnCell", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/clarification", () => ({
  __esModule: true,
  ClarificationBlockingBanner: () => null, RaiseClarificationModal: () => null,
  ClarificationDetailModal: () => null, ClarificationListModal: () => null,
}));
jest.mock("@/components/AuthContainer/LoginContainer", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/modal/RegretQuoteReasonModal", () => ({
  __esModule: true,
  default: (p) => (p.showModal ? <div role="dialog" aria-label="Regret reason" /> : null),
}));
jest.mock("react-placeholder-loading", () => ({ __esModule: true, default: () => null }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import RfqManagementPreview from "./inquiries-details";

const rfq = (over = {}) => ({
  id: 918, rfq_no: 536457, is_tender: 0, status: 1, is_published: 1,
  company_name: "Buyer Co", bid_end_date: "2099-01-01 17:00:00",
  quotations: [], terms: [], unseen_query_count: 0,
  // One product still open for bids; with none, every() is vacuously true
  // and the page (correctly) reports "All Products are Finalized".
  products: [{ id: 1, rfq_product_id: 1, finalization_status: "Not Finalized", product_details: [{ product_name: "Bath towel" }], quantity: 10 }],
  ...over,
});

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});
beforeEach(() => jest.clearAllMocks());

test("an open, unquoted inquiry puts Send Quote and Regret in the phone bar", async () => {
  getRFQById.mockResolvedValue({ data: rfq() });
  render(<RfqManagementPreview />);
  const bar = await screen.findByRole("region", { name: "Quote actions" });

  fireEvent.click(within(bar).getByRole("button", { name: "Send Quote" }));
  expect(mockPush).toHaveBeenCalledWith(
    "/dashboard/vendor/quote?id=918&showTechEvalRestrictions=false"
  );

  // The header button (hidden on phones by CSS) routes identically.
  const header = screen.getAllByRole("button", { name: "Send Quote" }).find((b) => !bar.contains(b));
  fireEvent.click(header);
  expect(mockPush).toHaveBeenLastCalledWith(mockPush.mock.calls[0][0]);

  fireEvent.click(within(bar).getByRole("button", { name: "Regret" }));
  expect(await screen.findByRole("dialog", { name: "Regret reason" })).toBeInTheDocument();
});

test("an existing quote offers Update Your Quote, routed to the update wizard", async () => {
  getRFQById.mockResolvedValue({ data: rfq({ quotations: [{ id: 5, is_regret: 0, timestamp: "2026-09-01 10:00:00", products: [] }] }) });
  render(<RfqManagementPreview />);
  const bar = await screen.findByRole("region", { name: "Quote actions" });
  expect(within(bar).queryByRole("button", { name: "Regret" })).not.toBeInTheDocument();
  fireEvent.click(within(bar).getByRole("button", { name: /Update Your Quote|View Quote/ }));
  expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/dashboard\/vendor\/quote\?type=update-quote&id=918/));
});

describe("phone CSS contract (jsdom has no media queries)", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "components/dashboard/vendor/InquiriesDetails.module.scss"), "utf8");
  const phone = css.slice(css.indexOf("@media (max-width: 768px)"));

  test("header row wraps and disabled reasons are printed, not hover-only", () => {
    expect(phone).toMatch(/\.actions\s*{\s*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/:global\(\.quote-status-tooltip\)\s*{\s*display:\s*block;\s*position:\s*static/);
  });

  test("header copies of the bar's buttons hide only on phones, beating the shell's !important", () => {
    expect(css.indexOf(".phoneHide")).toBeGreaterThan(css.indexOf("@media (max-width: 768px)"));
    expect(phone).toMatch(/:global\(body\) \.actions \.phoneHide\s*{\s*display:\s*none !important/);
  });

  test("the products table lets text wrap on a phone", () => {
    expect(phone).toMatch(/\.productsTable\.productsTable :global\(\.table\)\s*{\s*min-width:\s*0/);
  });

  test("the loading wrapper has no box on desktop", () => {
    expect(css).toMatch(/^\.loading\s*{\s*display:\s*contents;/m);
  });
});
