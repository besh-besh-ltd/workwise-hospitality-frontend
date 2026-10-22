// PO_REJECTED stage on the RFQ detail header: "PO rejected: {reason}".
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "968" },
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(), push: jest.fn(), back: jest.fn(),
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 7, name: "Asha Menon" } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqLineage: jest.fn(() => Promise.resolve({ data: { copied_from: null, copies: [] } })),
  getTechEvalStatus: jest.fn(() => Promise.resolve({ data: null })),
  getRfqLifecycle: jest.fn(() => Promise.resolve({ data: { stages: [], action: null, approval_instances: [] } })),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  getNegotiationRoundsByProduct: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(),
}));
jest.mock("@/hooks/useHasTechClauses", () => ({ __esModule: true, default: () => ({ hasClauses: false, loading: false }) }));
jest.mock("./RFQLifecycleJourneyV2", () => ({ __esModule: true, default: () => null }));
jest.mock("./RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ViewRFQ from "./ViewRFQ";



const RFQ = { id: 968, rfq_no: "536506", title: "Laptops", status: 1, is_published: 1, is_tender: 0, products: [], terms: [],
  company_name: "KHIL", timestamp: "2026-09-03 07:59:37", bid_end_date: "2026-09-05 14:30", lifecycle_stage: "PO_REJECTED" };
const ROWS = [
  { rejection_type: "vendor", reason_category: null, rejection_reason: "vendor said no" },
  { rejection_type: "approver", reason_category: "RENEGOTIATE", rejection_reason: "try another vendor" },
  { rejection_type: "approver", reason_category: "OTHER", rejection_reason: "older" },
];
const go = async (over) => { render(<ViewRFQ data={{ ...RFQ, ...over }} isCreator={false} />); await screen.findByText("Buyer & inquiry details"); };
beforeEach(() => jest.clearAllMocks());

test("names the newest approver rejection reason and shows its comment", async () => {
  await go({ vendor_rejections: ROWS });
  const el = screen.getByText(/PO rejected: Re-negotiate or change the vendor/);
  expect(el).toHaveAttribute("title", "try another vendor");
  expect(screen.getByText(/try another vendor/, { selector: "span span" })).toBeInTheDocument();
});

test("null reason_category shows just the stage label", async () => {
  await go({ vendor_rejections: [{ rejection_type: "approver", reason_category: null, rejection_reason: null }] });
  expect(screen.getByText("PO rejected by approver")).toBeInTheDocument();
  expect(screen.queryByText(/PO rejected:/)).toBeNull();
});

test("absent vendor_rejections keeps today's stage text", async () => {
  await go({});
  expect(screen.getByText("PO rejected by approver")).toBeInTheDocument();
});

test("other stages are untouched", async () => {
  await go({ lifecycle_stage: "AWAITING_PO", vendor_rejections: ROWS });
  expect(screen.getByText("awaiting po")).toBeInTheDocument();
});
