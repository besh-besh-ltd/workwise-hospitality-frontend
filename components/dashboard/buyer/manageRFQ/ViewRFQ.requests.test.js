// RFQ detail page — what it asks the server for on a page view.
//
//   * /rfq/:id/lifecycle was requested twice on mount: once with the URL id,
//     then again when the RFQ payload arrived (the effect keyed on data?.id and
//     data?.is_tender separately). It is now requested once per id.
//   * negotiation/rounds was requested once PER PRODUCT. The endpoint already
//     returns every round of the RFQ when rfq_product_id is omitted, so it is
//     now one request, split per product with the server's own coverage rule.
//   (The wrapper's refetch-on-stage-click is covered next to the wrapper, in
//   rfq-management-details.requests.test.js.)

const mockRouter = {
  query: { id: "720" },
  asPath: "/dashboard/buyer/rfq-management-details?id=720",
  pathname: "/dashboard/buyer/rfq-management-details",
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
};
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => mockRouter }));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 4, name: "Prashant Joshi" } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqLineage: jest.fn(() => Promise.resolve({ data: { copied_from: null, copies: [] } })),
  getTechEvalStatus: jest.fn(() => Promise.resolve({ data: null })),
  getRfqLifecycle: jest.fn(() => Promise.resolve({ data: null })),
}));
// negotiation service is REAL — only the wire is mocked, so the per-product
// split is exercised end to end.
const mockGet = jest.fn();
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: (...a) => mockGet(...a), post: jest.fn(() => Promise.resolve({})) },
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(() => Promise.resolve({ status: 1, data: {} })),
}));
jest.mock("@/hooks/useHasTechClauses", () => ({
  __esModule: true,
  default: () => ({ hasClauses: false, loading: false }),
}));
jest.mock("./RFQLifecycleJourneyV2", () => ({ __esModule: true, default: () => null }));
jest.mock("./RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/StageShared", () => ({
  __esModule: true,
  StageSkeleton: () => null,
  LifecycleContext: () => null,
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRfqLifecycle } from "@/services/rfq";
import { clearRequestCache } from "@/utils/requestCache";
import ViewRFQ from "./ViewRFQ";

const product = (id, name) => ({
  id,
  product_details: [{ name }],
  finalization_status: "No vendor finalized yet",
  tech_evaluation_status: { has_tech_eval: false },
});

const RFQ = {
  id: 720,
  rfq_no: "536264",
  title: "Window fittings",
  status: 1,
  is_published: 1,
  is_tender: 0,
  products: [product(11, "HINGE"), product(12, "HANDLE"), product(13, "LATCH")],
  terms: [],
  company_name: "Phileein Hospitality",
  hotel_name: "Hotel One",
  timestamp: "2026-07-20T10:00:00.000Z",
};

// Every round of RFQ 720, as GET /negotiation/rounds/720 returns them:
// two legacy rounds on HINGE, one multi-product round covering HINGE + HANDLE.
const ROUNDS = [
  { id: 1, rfq_product_id: 11, round_number: 1, status: "COMPLETED", products: [] },
  { id: 2, rfq_product_id: 11, round_number: 2, status: "ACTIVE", products: null },
  { id: 3, rfq_product_id: null, round_number: 1, status: "ACTIVE",
    products: [{ rfq_product_id: 11 }, { rfq_product_id: 12 }] },
];

const roundsCalls = () => mockGet.mock.calls.filter(([url]) => String(url).startsWith("/negotiation/rounds/"));

beforeEach(() => {
  jest.clearAllMocks();
  clearRequestCache();
  mockRouter.query = { id: "720" };
  mockGet.mockImplementation((url) => {
    if (String(url).startsWith("/negotiation/rounds/720")) {
      return Promise.resolve({ status: 1, data: ROUNDS, vendors: {} });
    }
    return Promise.resolve({ status: 1, data: [] });
  });
});

describe("lifecycle", () => {
  it("is requested exactly once on mount, even though the RFQ payload lands after the URL id", async () => {
    // The wrapper renders ViewRFQ with no data first, then with the payload.
    const { rerender } = render(<ViewRFQ data="" />);
    rerender(<ViewRFQ data={RFQ} />);
    await screen.findByText("HINGE");
    await waitFor(() => expect(getRfqLifecycle).toHaveBeenCalled());
    expect(getRfqLifecycle).toHaveBeenCalledTimes(1);
    expect(String(getRfqLifecycle.mock.calls[0][0])).toBe("720");
  });

  it("is not requested at all for a tender once the payload says so", async () => {
    render(<ViewRFQ data={{ ...RFQ, is_tender: 1 }} />);
    await screen.findByText("HINGE");
    expect(getRfqLifecycle).not.toHaveBeenCalled();
  });
});
