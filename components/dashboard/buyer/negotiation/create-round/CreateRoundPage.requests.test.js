// Create Round — product approval statuses in ONE request.
//
// Step 1 disables products whose negotiated quote is already APPROVED or
// PENDING approval. That status came from GET /negotiation/quotes/:id/
// approval-status, once PER PRODUCT, after the page's other loads had finished.
// The approval bundle (GET /negotiation/rounds/:rfq/approval-bundle) already
// carries every product's NEGOTIATION_QUOTE instances newest-first, healed by
// the same rule, so it now answers for all products at once, in parallel with
// the other loads. The per-product call survives only as a fallback.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { rfqId: "601" },
    asPath: "/dashboard/buyer/negotiation/create-round?rfqId=601",
    pathname: "/dashboard/buyer/negotiation/create-round",
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    isReady: true,
  }),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  createNegotiationRound: jest.fn(),
  getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ status: 1, data: [] })),
  getNegotiationApprovalBundle: jest.fn(),
  getQuoteApprovalStatus: jest.fn(),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparison: jest.fn(),
  getQuoteComparisonView: jest.fn(() => Promise.resolve(null)),
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, getChargeNames: jest.fn(() => Promise.resolve({ data: [] })) }));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getNegotiationApprovalBundle, getQuoteApprovalStatus } from "@/services/negotiation";
import { getQuoteComparison } from "@/services/pricing";
import CreateRoundPage from "./CreateRoundPage";

const product = (id, name) => ({ id, product_details: [{ name }], quotations: [] });
const PRODUCTS = [product(11, "HINGE"), product(12, "HANDLE"), product(13, "LATCH")];

beforeEach(() => {
  jest.clearAllMocks();
  getQuoteComparison.mockResolvedValue({ data: { products: PRODUCTS } });
  getNegotiationApprovalBundle.mockResolvedValue({
    status: 1,
    data: {
      negotiation_instances: {},
      rounds_history: [],
      negotiation_quote_instances: {
        // newest first, as the server orders them
        11: [{ id: 501, status: "APPROVED" }, { id: 400, status: "REJECTED" }],
        12: [{ id: 502, status: "PENDING" }],
      },
    },
  });
});

it("N products → one approval-bundle request, no per-product approval-status calls", async () => {
  render(<CreateRoundPage />);
  expect(await screen.findByText("HINGE")).toBeInTheDocument();

  await waitFor(() => expect(screen.getByText("Approved")).toBeInTheDocument());
  expect(screen.getByText("Pending Approval")).toBeInTheDocument();
  expect(getNegotiationApprovalBundle).toHaveBeenCalledTimes(1);
  expect(getNegotiationApprovalBundle).toHaveBeenCalledWith(601);
  expect(getQuoteApprovalStatus).not.toHaveBeenCalled();
});

it("falls back to per-product status when the bundle is unavailable", async () => {
  getNegotiationApprovalBundle.mockRejectedValue({ status: 0, message: "forbidden" });
  getQuoteApprovalStatus.mockImplementation((id) => Promise.resolve(
    id === 11
      ? { status: 1, data: { approval_instance: { id: 501, status: "APPROVED" } } }
      : { status: 1, data: { approval_instance: null } }
  ));
  render(<CreateRoundPage />);
  await waitFor(() => expect(screen.getByText("Approved")).toBeInTheDocument());
  expect(getQuoteApprovalStatus).toHaveBeenCalledTimes(3);
});
