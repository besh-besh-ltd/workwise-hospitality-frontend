// L2 dead end (RFQ #536894): the status payload says is_complete, but the
// evaluation is recoverable, so the screen asks the buyer to evaluate and
// submit Round 2. The product's submit row must offer Submit, not
// "Evaluation Complete".
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/x", push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 4, hospitality_mappings: [] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqs: jest.fn(() => Promise.resolve([])),
  fetchVendorSelectionOption: jest.fn(() => Promise.resolve({ data: [] })),
  getAllClauses: jest.fn(),
  getRFQById: jest.fn(),
  submitTechEvalForApproval: jest.fn(),
  addToTA: jest.fn(),
  fetchVendorAgreement: jest.fn(),
  getClausesByRfqProductId: jest.fn(),
  getSummarisedDeviation: jest.fn(),
  getTechClearedVendorsResult: jest.fn(),
  updateBuyerMarks: jest.fn(),
  submitTechEvalApprovalAction: jest.fn(),
  fetchDeviationPreviews: jest.fn(() => Promise.resolve({ data: [] })),
  getTechEvalStatus: jest.fn(),
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
jest.mock("@/components/shared/RFQListSidebar", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/FullLoader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/ReadMore", () => ({ __esModule: true, default: ({ content }) => <span>{content}</span> }));
jest.mock("./buyerVendorChat", () => ({ __esModule: true, default: () => null }));
jest.mock("./VendorDeviationModal", () => ({ __esModule: true, default: () => null }));
jest.mock("./TE_Modal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/approval", () => ({ __esModule: true, ApprovalWorkflowSection: () => null }));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getRFQById, getAllClauses, getTechEvalStatus } from "@/services/rfq";
import BuyerTechnicalEvaluation from "./index";

const RFQ = {
  id: 720, rfq_no: "536894", hotel_id: 30, department_id: 2, status: 1,
  bid_end_date: "2020-01-01 10:00", products: [{ id: 10 }], vendors: [],
};

const l2Status = {
  tech_evaluation_id: 1, current_round: 1, is_complete: true,
  blocked_insufficient_vendors: true, total_passed_verified: 0, required_passed_vendors: 5,
  reopened: false, is_stuck: false, bid_window_open: false,
  eligible_unscored_vendors: [{ vendor_id: 3, vendor_name: "Vendor C" }],
  rounds: [{ round_number: 1, status: "APPROVED" }],
  vendors: { selected: [{}, {}], passed_verified: [], failed_verified: [{}, {}], pending_evaluation: [] },
};

const scored = (id) => ({ vendor_id: id, vendor_response: "I Agree", buyer_id: 9, buyer_marks: 10 });
const product = {
  rfq_product_id: 10, evaluation_id: 5, minimum_passing_score: 60,
  vendors: [
    { vendor_id: 1, rfq_product_vendor_id: 101, has_quoted: true, is_verified: true, is_passed: false, calculated_score: 40 },
    { vendor_id: 3, rfq_product_vendor_id: 303, has_quoted: true, is_verified: false },
  ],
  clauses: [{
    clause_id: 11, clause_text: "Clause one", clause_type: "regular", weightage: 25, files: [],
    vendor_responses: [scored(1), scored(3)],
  }],
};

beforeEach(() => {
  jest.clearAllMocks();
  getRFQById.mockResolvedValue({ data: RFQ });
  getAllClauses.mockResolvedValue({ data: [product] });
});

it("L2: a fully scored eligible vendor leaves an enabled Submit, not 'Evaluation Complete'", async () => {
  getTechEvalStatus.mockResolvedValue({ data: { data: l2Status } });
  render(<BuyerTechnicalEvaluation rfqId="720" rfq={RFQ} embedded />);
  // Wait until the status payload has been applied (the banner comes from it).
  expect(await screen.findByText("New vendors ready for evaluation")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText("Evaluation Complete")).not.toBeInTheDocument());
  const submit = await screen.findByRole("button", { name: "Submit for Approval" });
  expect(submit).toBeEnabled();
});

it("a genuinely completed evaluation (passes, nobody eligible) still shows 'Evaluation Complete'", async () => {
  getTechEvalStatus.mockResolvedValue({
    data: { data: { ...l2Status, blocked_insufficient_vendors: false, total_passed_verified: 2, eligible_unscored_vendors: [] } },
  });
  render(<BuyerTechnicalEvaluation rfqId="720" rfq={RFQ} embedded />);
  expect(await screen.findByText("Evaluation Complete")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Submit for Approval" })).not.toBeInTheDocument();
});
