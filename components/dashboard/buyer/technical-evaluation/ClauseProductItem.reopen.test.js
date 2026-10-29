// Mounted test for the reopened-eval screen (RFQ #536894 follow-up): vendor C
// quoted after the round-1 verdicts, so after the deadline closes again C's
// cells must be scoreable, a banner must say so, and a responder who never
// quoted must be labelled rather than shown as a locked "- / 25".
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  addToTA: jest.fn(),
  fetchVendorAgreement: jest.fn(),
  getClausesByRfqProductId: jest.fn(),
  getSummarisedDeviation: jest.fn(),
  getTechClearedVendorsResult: jest.fn(),
  updateBuyerMarks: jest.fn(),
  submitTechEvalForApproval: jest.fn(),
  submitTechEvalApprovalAction: jest.fn(),
  fetchDeviationPreviews: jest.fn(() => Promise.resolve({ data: [] })),
  getTechEvalStatus: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/FullLoader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/ReadMore", () => ({ __esModule: true, default: ({ content }) => <span>{content}</span> }));
jest.mock("./buyerVendorChat", () => ({ __esModule: true, default: () => null }));
jest.mock("./VendorDeviationModal", () => ({ __esModule: true, default: () => null }));
jest.mock("./TE_Modal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/approval", () => ({ __esModule: true, ApprovalWorkflowSection: () => null }));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getTechEvalStatus, fetchVendorAgreement, getTechClearedVendorsResult, getClausesByRfqProductId } from "@/services/rfq";
import ClauseProductItem from "./ClauseProductItem";

const status = {
  tech_evaluation_id: 1,
  current_round: 1,
  is_complete: false,
  blocked_insufficient_vendors: true,
  total_passed_verified: 0,
  required_passed_vendors: 5,
  reopened: true,
  is_stuck: false,
  bid_window_open: false,
  eligible_unscored_vendors: [{ vendor_id: 3, vendor_name: "Vendor C" }],
  rounds: [{ round_number: 1, status: "APPROVED" }],
  vendors: { selected: [{}, {}], passed_verified: [], failed_verified: [{}, {}], pending_evaluation: [] },
};

const vendors = [
  { vendor_id: 1, rfq_product_vendor_id: 101, has_quoted: true, is_verified: true, is_passed: false, calculated_score: 40 },
  { vendor_id: 3, rfq_product_vendor_id: 303, has_quoted: true, is_verified: false },
  { vendor_id: 4, rfq_product_vendor_id: 404, has_quoted: false, is_verified: false },
];
const clauseInfo = [{
  clause_id: 11, clause_text: "Clause one", clause_type: "regular", weightage: 25, files: [],
  vendor_responses: [1, 3, 4].map((id) => ({ vendor_id: id, vendor_response: "I Agree", buyer_id: id === 1 ? 9 : null, buyer_marks: id === 1 ? 10 : null })),
}];

it("reopened, window closed: banner for new vendors, C scoreable, unquoted responder labelled", async () => {
  getTechEvalStatus.mockResolvedValue({ data: { data: status } });
  render(
    <ClauseProductItem
      rfq_id={536894}
      product={{ id: 10 }}
      currentUserProfile={{}}
      clauseInfo={clauseInfo}
      currentRfq={{ id: 536894, bid_end_date: "2020-01-01 10:00" }}
      vendors={vendors}
      refetch={jest.fn()}
      selectedVendors={[]}
      minimumPassingScore={60}
      canWrite
      quotedVendorsOnly={false}
    />
  );
  expect(await screen.findByText("New vendors ready for evaluation")).toBeInTheDocument();
  expect(screen.getByText("1 vendor(s) quoted since the last round. Evaluate them and submit Round 2.")).toBeInTheDocument();
  expect(screen.getByText("Hasn't quoted — can't be evaluated")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTitle("Click to score")).toHaveAttribute("role", "button"));
  expect(screen.queryByTitle("Evaluation locked")).not.toBeInTheDocument();
});

it("L2 (locked before the reopen rule): eligible vendor is scoreable, verified vendor stays locked, banner shows", async () => {
  getTechEvalStatus.mockResolvedValue({
    data: { data: { ...status, is_complete: true, reopened: false } },
  });
  render(
    <ClauseProductItem
      rfq_id={536894}
      product={{ id: 10 }}
      currentUserProfile={{}}
      clauseInfo={clauseInfo}
      currentRfq={{ id: 536894, bid_end_date: "2020-01-01 10:00" }}
      vendors={vendors}
      refetch={jest.fn()}
      selectedVendors={[]}
      minimumPassingScore={60}
      canWrite
      quotedVendorsOnly={false}
    />
  );
  expect(await screen.findByText("New vendors ready for evaluation")).toBeInTheDocument();
  expect(screen.getByText("1 vendor(s) quoted since the last round. Evaluate them and submit Round 2.")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTitle("Click to score")).toHaveAttribute("role", "button"));
  expect(screen.getByTitle(/Cannot edit/)).not.toHaveAttribute("role", "button");
  expect(screen.queryByTitle("Evaluation locked")).not.toBeInTheDocument();
});

it("completed eval WITH passes and eligible vendors: no banner, grid stays locked", async () => {
  getTechEvalStatus.mockResolvedValue({
    data: { data: { ...status, is_complete: true, reopened: false, blocked_insufficient_vendors: false, total_passed_verified: 2 } },
  });
  render(
    <ClauseProductItem
      rfq_id={536894}
      product={{ id: 10 }}
      currentUserProfile={{}}
      clauseInfo={clauseInfo}
      currentRfq={{ id: 536894, bid_end_date: "2020-01-01 10:00" }}
      vendors={vendors}
      refetch={jest.fn()}
      selectedVendors={[]}
      minimumPassingScore={60}
      canWrite
      quotedVendorsOnly={false}
    />
  );
  await waitFor(() => expect(getTechEvalStatus).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByTitle("Click to score")).not.toBeInTheDocument());
  expect(screen.queryByText("New vendors ready for evaluation")).not.toBeInTheDocument();
});

const renderItem = (props = {}) =>
  render(
    <ClauseProductItem
      rfq_id={536894}
      product={{ id: 10 }}
      currentUserProfile={{}}
      clauseInfo={clauseInfo}
      currentRfq={{ id: 536894, bid_end_date: "2020-01-01 10:00" }}
      vendors={vendors}
      refetch={jest.fn()}
      selectedVendors={[]}
      minimumPassingScore={60}
      canWrite
      quotedVendorsOnly={false}
      {...props}
    />
  );

it("L2: only vendors on the eligible list are scoreable; another unverified quoted vendor stays locked", async () => {
  getTechEvalStatus.mockResolvedValue({
    data: { data: { ...status, is_complete: true, reopened: false } },
  });
  const five = [
    ...vendors,
    { vendor_id: 5, rfq_product_vendor_id: 505, has_quoted: true, is_verified: false },
  ];
  const clauses = [{
    ...clauseInfo[0],
    vendor_responses: [1, 3, 4, 5].map((id) => ({ vendor_id: id, vendor_response: "I Agree", buyer_id: id === 1 ? 9 : null, buyer_marks: id === 1 ? 10 : null })),
  }];
  renderItem({ vendors: five, clauseInfo: clauses });
  await screen.findByText("New vendors ready for evaluation");
  await waitFor(() => expect(screen.getAllByTitle("Click to score")).toHaveLength(1));
  // Vendor 5 quoted but is not eligible: the server would answer 409.
  expect(screen.queryAllByTitle("Click to score")).toHaveLength(1);
});

it("renders the minimum passing score, and omits the label when it is undefined", async () => {
  getTechEvalStatus.mockResolvedValue({ data: { data: status } });
  const { unmount } = renderItem();
  expect(await screen.findByText(/Minimum passing score:/)).toBeInTheDocument();
  unmount();
  getTechEvalStatus.mockClear();
  renderItem({ minimumPassingScore: undefined });
  await waitFor(() => expect(getTechEvalStatus).toHaveBeenCalled());
  expect(screen.queryByText(/Minimum passing score:/)).not.toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/undefined%/);
});

// Legacy accept/reject buttons write a verdict with no round; the server
// answers 409 TECH_EVAL_USE_ROUND on a blocked, zero-passed evaluation.
const ROUND_TITLE = "Score this vendor and submit the round for approval";
const oneVendor = { label: "Vendor C", value: 3, vendor_id: 3, vendor_name: "Vendor C" };
const renderSingleVendor = async () => {
  fetchVendorAgreement.mockResolvedValue({ status: 1, data: [{ clause_id: 11, vendor_response: "I Agree" }] });
  getTechClearedVendorsResult.mockResolvedValue({ status: 0, data: {} });
  getClausesByRfqProductId.mockResolvedValue({ status: 1, data: [] });
  renderItem({ selectedVendor: oneVendor, selectedVendors: [oneVendor] });
  await screen.findByText("Technically Accepted");
};

it("reopened eval: accept and reject buttons are disabled and point to the round", async () => {
  getTechEvalStatus.mockResolvedValue({ data: { data: status } });
  await renderSingleVendor();
  await waitFor(() => expect(screen.getByRole("button", { name: /Technically Accepted/ })).toBeDisabled());
  expect(screen.getByRole("button", { name: /Technically Accepted/ })).toHaveAttribute("title", ROUND_TITLE);
  expect(screen.getByRole("button", { name: /Technically Not Accepted/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Technically Not Accepted/ })).toHaveAttribute("title", ROUND_TITLE);
});

it("recoverable (L2) eval: accept and reject buttons are disabled", async () => {
  getTechEvalStatus.mockResolvedValue({ data: { data: { ...status, is_complete: true, reopened: false } } });
  await renderSingleVendor();
  await waitFor(() => expect(screen.getByRole("button", { name: /Technically Accepted/ })).toBeDisabled());
  expect(screen.getByRole("button", { name: /Technically Accepted/ })).toHaveAttribute("title", ROUND_TITLE);
  expect(screen.getByRole("button", { name: /Technically Not Accepted/ })).toBeDisabled();
});

it("ordinary open eval, bidding closed: accept and reject buttons stay enabled", async () => {
  getTechEvalStatus.mockResolvedValue({
    data: { data: { ...status, reopened: false, blocked_insufficient_vendors: false, eligible_unscored_vendors: [], rounds: [], vendors: { selected: [{}], passed_verified: [], failed_verified: [], pending_evaluation: [{}] } } },
  });
  await renderSingleVendor();
  await waitFor(() => expect(getTechEvalStatus).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: /Technically Accepted/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: /Technically Not Accepted/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: /Technically Accepted/ })).not.toHaveAttribute("title", ROUND_TITLE);
});
