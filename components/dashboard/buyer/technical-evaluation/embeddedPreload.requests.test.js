// Technical evaluation embedded in the RFQ page: the host already fetched this
// RFQ (getRfqById with vendors — a superset of what this workspace reads), so
// the embedded stage must not fetch it again. Standalone it still does.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/dashboard/buyer/rfq-management-details", push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 4, hospitality_mappings: [] } }),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqs: jest.fn(() => Promise.resolve([])),
  fetchVendorSelectionOption: jest.fn(() => Promise.resolve({ data: [] })),
  getAllClauses: jest.fn(() => Promise.resolve({ data: [] })),
  getRFQById: jest.fn(),
  submitTechEvalForApproval: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({ __esModule: true, getUserDetails: jest.fn(() => null) }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: ({ enabled }) => ({
    canRead: !!enabled, canUpdate: !!enabled, canCreate: false, canApprove: false,
    allowedProcessIds: null, isProcessAllowed: () => true, loading: false,
  }),
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("./EvaluationProgressTracker", () => ({ __esModule: true, default: () => null }));
jest.mock("./UnifiedSubmitForApproval", () => ({ __esModule: true, default: () => null }));
jest.mock("./ClauseProductItem", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/RFQListSidebar", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById, getAllClauses } from "@/services/rfq";
import BuyerTechnicalEvaluation from "./index";

const RFQ = { id: 720, rfq_no: "536264", hotel_id: 30, department_id: 2, status: 1, products: [{ id: 11 }], vendors: [] };

beforeEach(() => {
  jest.clearAllMocks();
  getRFQById.mockResolvedValue({ data: RFQ });
});

it("uses the host's RFQ instead of fetching it again", async () => {
  render(<BuyerTechnicalEvaluation rfqId="720" rfq={RFQ} embedded />);
  // The evaluation data still loads (stage 2 runs off the preloaded RFQ)…
  await waitFor(() => expect(getAllClauses).toHaveBeenCalledWith("720", "tech_evaluation"));
  // …without a second getRfqById.
  expect(getRFQById).not.toHaveBeenCalled();
});

it("fetches the RFQ when embedded without a matching preload", async () => {
  render(<BuyerTechnicalEvaluation rfqId="720" rfq={{ ...RFQ, id: 999 }} embedded />);
  await waitFor(() => expect(getRFQById).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(getAllClauses).toHaveBeenCalledTimes(1));
});
