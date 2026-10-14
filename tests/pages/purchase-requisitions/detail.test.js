// PR detail page — product-level behaviour with the service layer mocked.
// Every actor (requester, reviewer, approver, buyer) works here, so the tests
// pin what each one sees and what each button sends.

jest.mock("@/services/pr", () => ({
  __esModule: true,
  getPr: jest.fn(),
  submitPr: jest.fn(),
  withdrawPr: jest.fn(),
  cancelPr: jest.fn(),
  copyPr: jest.fn(),
  sendBackPr: jest.fn(),
  completeReview: jest.fn(),
  sendBackReview: jest.fn(),
  updateLineSpec: jest.fn(),
  addClause: jest.fn(),
  deleteClause: jest.fn(),
  addAttachment: jest.fn(),
  deleteAttachment: jest.fn(),
  addComment: jest.fn(),
  cancelLine: jest.fn(),
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  handleUploadFile: jest.fn(),
}));
const push = jest.fn();
const replace = jest.fn();
let mockQuery = { prId: "55" };
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, push, replace }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as PrApi from "@/services/pr";
import { submitApprovalAction } from "@/services/approval";
import { handleUploadFile } from "@/services/rfq";
import PrDetailPage from "@/pages/dashboard/buyer/purchase-requisitions/[prId]";
import { ERROR_COPY } from "@/components/dashboard/purchase-requisitions/prFormat";

const NO_CAPS = {
  can_edit: false, can_submit: false, can_withdraw: false, can_cancel: false, can_copy: false,
  can_cancel_lines: [], review: null, approval: null,
};

const line = (over = {}) => ({
  id: 501, line_no: 1, line_kind: "catalog", product_variant_id: 300, variant_name: "Bath towel", product_name: "Towel",
  free_text_name: null, category_id: 7, category_title: "Linen", quantity: "10.000", uom: "pcs",
  estimated_unit_price: "250.00", line_value: "2500.00", specification: "600 GSM cotton", suggested_vendor_note: null,
  status: "active", close_reason: null, closed_by: null, closed_at: null,
  mapped_variant_id: null, mapped_variant_name: null, mapped_by: null, mapped_at: null,
  progress: "pending", clauses: [], attachments: [], links: [], ...over,
});

const pr = (over = {}) => ({
  id: 55, pr_number: "PR-2026-0055", title: "Lobby towels", pr_type: "goods", hospitality_company_id: 4, hotel_id: 12,
  department_id: 9, urgency: "urgent", required_by_date: "2099-01-15", justification: "Old ones are worn",
  delivery_location: "Main store", status: "draft", revision: 0, estimated_total: "2500.00", raised_by: 7,
  submitted_at: null, approved_at: null, approval_instance_id: null, assigned_buyer_id: null, returned_note: null,
  cancelled_reason: null, created_at: "2026-10-10T05:00:00.000Z", updated_at: "2026-10-10T05:00:00.000Z",
  hotel_name: "Mumbai Suites", department_name: "Housekeeping", raised_by_name: "Asha Rao", assigned_buyer_name: null,
  now_with: "You", ...over,
});

const detail = (over = {}) => ({
  pr: pr(over.pr),
  lines: over.lines || [line()],
  attachments: over.attachments || [],
  reviews: over.reviews || [],
  events: over.events || [],
  comments: over.comments || [],
  capabilities: { ...NO_CAPS, ...(over.capabilities || {}) },
  approval: over.approval === undefined ? null : over.approval,
});

const axiosErr = (status, data) => Object.assign(new Error("Request failed"), { isAxiosError: true, response: { status, data } });

const pendingApproval = (over = {}) => ({
  id: 900, entity_type: "PR", entity_id: 55, status: "PENDING", current_step: 1, total_steps: 1,
  can_user_approve: true, user_approval_step_id: 3001, metadata: { amount: "2500.00" }, action_history: [],
  steps: [{
    id: 3001, step_order: 1, decision_rule: "ANY", status: "PENDING", approval_type: null, completed_at: null,
    added_mid_flight: false, removed_mid_flight: false,
    approvers: [{ user_id: 9, user_name: "Hari Head", status: "PENDING", account_active: true, acted_at: null, comment: null, removed_at: null }],
  }],
  ...over,
});

const approverDetail = (over = {}) => detail({
  pr: { status: "pending_approval", revision: 1, submitted_at: "2026-10-11T05:00:00.000Z", approval_instance_id: 900, now_with: "Approval step 1: Hari Head" },
  approval: pendingApproval(),
  capabilities: { approval: { instance_id: 900, current_step_id: 3001, can_approve: true, can_reject: true, can_send_back: true } },
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = { prId: "55" };
});

const renderPage = async (d) => {
  PrApi.getPr.mockResolvedValue({ status: 1, data: d });
  render(<PrDetailPage />);
  await screen.findByRole("heading", { level: 1 });
};

// ---------------------------------------------------------------------------
// 1. Requester, draft
// ---------------------------------------------------------------------------

test("a requester's draft shows Edit / Submit / Cancel and no approval buttons", async () => {
  await renderPage(detail({ capabilities: { can_edit: true, can_submit: true, can_cancel: true, can_copy: true } }));

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Lobby towels");
  expect(screen.getByText("PR-2026-0055")).toBeInTheDocument();
  expect(screen.getByTestId("now-with")).toHaveTextContent("Now with: You");
  expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions/create?id=55");
  expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Cancel PR" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy as new" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Withdraw" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Send back" })).not.toBeInTheDocument();
  // Hero facts
  expect(screen.getByText("Mumbai Suites")).toBeInTheDocument();
  expect(screen.getByText("Housekeeping")).toBeInTheDocument();
  expect(screen.getByText("Asha Rao")).toBeInTheDocument();
  expect(screen.getAllByText("₹2,500").length).toBeGreaterThan(0);
});

test("Cancel PR needs a reason and sends it", async () => {
  await renderPage(detail({ capabilities: { can_edit: true, can_submit: true, can_cancel: true } }));
  PrApi.cancelPr.mockResolvedValue({ status: 1, message: "Purchase requisition cancelled", data: { id: 55, status: "cancelled" } });

  fireEvent.click(screen.getByRole("button", { name: "Cancel PR" }));
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", { name: "Cancel this PR" });
  expect(confirm).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "  Bought locally  " } });
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);

  await waitFor(() => expect(PrApi.cancelPr).toHaveBeenCalledWith("55", "Bought locally"));
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole("status")).toHaveTextContent("Purchase requisition cancelled");
});

test("a returned PR shows the approver's note", async () => {
  await renderPage(detail({ pr: { status: "returned", returned_note: "Add the GSM rating" }, capabilities: { can_edit: true, can_submit: true } }));
  const banner = screen.getByTestId("returned-banner");
  expect(banner).toHaveTextContent("Add the GSM rating");
});

test("Withdraw is offered only while in review / pending approval and explains what it does", async () => {
  await renderPage(detail({ pr: { status: "in_review", now_with: "Technical review: Engineering" }, capabilities: { can_withdraw: true } }));
  PrApi.withdrawPr.mockResolvedValue({ status: 1, message: "Purchase requisition withdrawn", data: detail({ capabilities: { can_edit: true } }) });
  fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent(/back to draft/i);
  fireEvent.click(within(dialog).getByRole("button", { name: "Withdraw PR" }));
  await waitFor(() => expect(PrApi.withdrawPr).toHaveBeenCalledWith("55"));
});

// ---------------------------------------------------------------------------
// 2. Reviewer
// ---------------------------------------------------------------------------

const reviewerDetail = () => detail({
  pr: { status: "in_review", revision: 1, now_with: "Technical review: Engineering", submitted_at: "2026-10-11T05:00:00.000Z" },
  lines: [
    line(),
    line({ id: 502, line_no: 2, line_kind: "free_text", product_variant_id: null, variant_name: null, product_name: null, free_text_name: "Pool chlorine", category_title: "Chemicals", specification: null }),
  ],
  reviews: [
    { id: 71, revision: 1, department_id: 3, department_title: "Engineering", status: "pending", acted_by: null, acted_by_name: null, acted_at: null, note: null, self_reviewed: false, created_at: "2026-10-11T05:00:00.000Z", line_ids: [501], eligible_reviewers: ["Rita Reviewer"], no_eligible_reviewer: false },
    { id: 72, revision: 1, department_id: 4, department_title: "Kitchen", status: "pending", acted_by: null, acted_by_name: null, acted_at: null, note: null, self_reviewed: false, created_at: "2026-10-11T05:00:00.000Z", line_ids: [502], eligible_reviewers: [], no_eligible_reviewer: true },
  ],
  capabilities: { review: { review_id: 71, can_edit_lines: [501] } },
});

test("a reviewer can edit the spec of an eligible line only", async () => {
  await renderPage(reviewerDetail());
  PrApi.updateLineSpec.mockResolvedValue({ status: 1, message: "Specification updated", data: { line_id: 501, specification: "700 GSM" } });

  const edits = screen.getAllByRole("button", { name: "Edit specification" });
  expect(edits).toHaveLength(1);
  expect(within(screen.getByTestId("line-work-501")).getByRole("button", { name: "Edit specification" })).toBeInTheDocument();
  expect(screen.queryByTestId("line-work-502")).not.toBeInTheDocument();

  fireEvent.click(edits[0]);
  const box = screen.getByLabelText("Specification for item 1");
  expect(screen.getByText("14/1000")).toBeInTheDocument();
  fireEvent.change(box, { target: { value: "700 GSM" } });
  expect(screen.getByText("7/1000")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save specification" }));

  await waitFor(() => expect(PrApi.updateLineSpec).toHaveBeenCalledWith("55", 501, "700 GSM"));
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledTimes(2));
});

test("review list shows each department and flags one nobody can review", async () => {
  await renderPage(reviewerDetail());
  const panel = screen.getByTestId("pr-review-panel");
  expect(within(panel).getByText("Engineering")).toBeInTheDocument();
  expect(within(panel).getByText(/Rita Reviewer/)).toBeInTheDocument();
  expect(within(panel).getByText("No eligible reviewer — contact your admin")).toBeInTheDocument();
});

test("a reviewer's Send back requires a note", async () => {
  await renderPage(reviewerDetail());
  PrApi.sendBackReview.mockResolvedValue({ status: 1, message: "Sent back to the requester", data: detail({ pr: { status: "returned", returned_note: "Need GSM" } }) });

  fireEvent.click(screen.getByRole("button", { name: "Send back" }));
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", { name: "Send back to requester" });
  expect(confirm).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Note to the requester"), { target: { value: "   " } });
  expect(confirm).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Note to the requester"), { target: { value: "Need GSM" } });
  fireEvent.click(confirm);
  await waitFor(() => expect(PrApi.sendBackReview).toHaveBeenCalledWith("55", 71, "Need GSM"));
  expect(await screen.findByTestId("returned-banner")).toHaveTextContent("Need GSM");
});

test("a reviewer adds a sampling clause with a whole-number weightage", async () => {
  await renderPage(reviewerDetail());
  PrApi.addClause.mockResolvedValue({ status: 1, message: "Clause added", data: { clause: { id: 1 } } });
  const work = screen.getByTestId("line-work-501");

  fireEvent.change(within(work).getByLabelText("Clause text"), { target: { value: "Send 2 samples" } });
  fireEvent.change(within(work).getByLabelText("Clause type"), { target: { value: "sampling" } });
  fireEvent.change(within(work).getByLabelText("Weightage"), { target: { value: "150" } });
  fireEvent.click(within(work).getByRole("button", { name: "Add clause" }));
  expect(within(work).getByText("Weightage is a whole number from 0 to 100")).toBeInTheDocument();
  expect(PrApi.addClause).not.toHaveBeenCalled();

  fireEvent.change(within(work).getByLabelText("Weightage"), { target: { value: "20" } });
  fireEvent.click(within(work).getByRole("button", { name: "Add clause" }));
  await waitFor(() => expect(PrApi.addClause).toHaveBeenCalledWith("55", 501, { clause_text: "Send 2 samples", clause_type: "sampling", weightage: 20 }));
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledTimes(2));
});

test("a reviewer attaches a file through the shared upload endpoint", async () => {
  await renderPage(reviewerDetail());
  const url = "https://ww-bucket.s3.ap-south-1.amazonaws.com/uploads/spec.pdf";
  handleUploadFile.mockResolvedValue({ status: 1, data: [{ file_path: url, file_name: "spec.pdf" }] });
  PrApi.addAttachment.mockResolvedValue({ status: 1, message: "File attached", data: { attachment: { id: 9 } } });
  const work = screen.getByTestId("line-work-501");

  fireEvent.change(within(work).getByLabelText("File type"), { target: { value: "datasheet" } });
  const file = new File(["x"], "spec.pdf", { type: "application/pdf" });
  fireEvent.change(within(work).getByLabelText("Attach a file"), { target: { files: [file] } });

  await waitFor(() => expect(handleUploadFile).toHaveBeenCalledWith(file));
  await waitFor(() => expect(PrApi.addAttachment).toHaveBeenCalledWith("55", { pr_line_id: 501, kind: "datasheet", file_url: url, file_name: "spec.pdf" }));
});

test("the last review completing into a broken chain says so and keeps the review pending", async () => {
  await renderPage(reviewerDetail());
  PrApi.completeReview.mockRejectedValue(axiosErr(422, { status: 0, code: "PR_NO_POLICY", message: "no policy" }));
  fireEvent.click(screen.getByRole("button", { name: "Complete review" }));
  await waitFor(() => expect(PrApi.completeReview).toHaveBeenCalledWith("55", 71, undefined));
  const alert = await screen.findByTestId("action-error");
  expect(alert).toHaveTextContent("Approval chain problem — contact your admin");
  expect(alert).toHaveTextContent(ERROR_COPY.PR_NO_POLICY);
});

// ---------------------------------------------------------------------------
// 3. Approver
// ---------------------------------------------------------------------------

test("an approver sees Approve / Reject / Send back and Approve sends the instance and step ids", async () => {
  await renderPage(approverDetail());
  expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send back" })).toBeInTheDocument();

  submitApprovalAction.mockResolvedValue({ status: 1, data: { status: "APPROVED", instance_status: "APPROVED" } });
  PrApi.getPr.mockResolvedValue({ status: 1, data: detail({ pr: { status: "approved", now_with: "Purchase team" }, approval: pendingApproval({ status: "APPROVED" }) }) });

  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm approve" }));

  await waitFor(() => expect(submitApprovalAction).toHaveBeenCalledWith({
    approval_instance_id: 900, approval_instance_step_id: 3001, action: "APPROVE", comment: undefined,
  }));
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole("status")).toHaveTextContent(/Approved/);
  expect(screen.getByTestId("now-with")).toHaveTextContent("Purchase team");
});

test("decision buttons come from capabilities.approval, not the engine's can_user_approve", async () => {
  await renderPage(approverDetail({ capabilities: { approval: null } }));
  expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
});

test("an approver who may reject but not approve is told why", async () => {
  await renderPage(approverDetail({ capabilities: { approval: { instance_id: 900, current_step_id: 3001, can_approve: false, can_reject: true, can_send_back: true } } }));
  expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  expect(screen.getByTestId("decision-banner")).toHaveTextContent(/can't approve/i);
});

test("Reject needs a reason; an engine refusal shows its message and refetches", async () => {
  await renderPage(approverDetail());
  submitApprovalAction.mockRejectedValue({ message: axiosErr(400, { status: 3, message: "Provided step is not the current pending step" }) });

  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", { name: "Confirm reject" });
  expect(confirm).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Reason for rejection"), { target: { value: "Too costly" } });
  fireEvent.click(confirm);

  await waitFor(() => expect(submitApprovalAction).toHaveBeenCalledWith({
    approval_instance_id: 900, approval_instance_step_id: 3001, action: "REJECT", comment: "Too costly",
  }));
  expect(await screen.findByTestId("action-error")).toHaveTextContent("Provided step is not the current pending step");
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledTimes(2));
});

test("an approve that changed nothing reports the real state after refetch", async () => {
  await renderPage(approverDetail());
  submitApprovalAction.mockResolvedValue({ status: 1, data: { status: "APPROVED", instance_status: "CANCELLED" } });
  PrApi.getPr.mockResolvedValue({ status: 1, data: detail({ pr: { status: "draft", now_with: "You" }, approval: pendingApproval({ status: "CANCELLED" }) }) });
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm approve" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Your approval didn't change this PR — it is now Draft.");
});

test("an approver's Send back calls sendBackPr with the note", async () => {
  await renderPage(approverDetail());
  PrApi.sendBackPr.mockResolvedValue({ status: 1, message: "Sent back to the requester", data: detail({ pr: { status: "returned", returned_note: "Split by floor" } }) });
  fireEvent.click(screen.getByRole("button", { name: "Send back" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Note to the requester"), { target: { value: "Split by floor" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send back to requester" }));
  await waitFor(() => expect(PrApi.sendBackPr).toHaveBeenCalledWith("55", "Split by floor"));
});

// ---------------------------------------------------------------------------
// 4. Skipped steps + no eligible approver
// ---------------------------------------------------------------------------

test("steps that don't apply are shown in policy order with the reason", async () => {
  const approval = pendingApproval({
    metadata: {
      amount: "2500.00",
      approval_diagnostics: {
        policy_step_count: 3, resolved_step_count: 1,
        skipped_steps: [
          { policy_step_id: 12, step_order: 2, reason: "below_threshold", min_amount: "100000.00" },
          { policy_step_id: 11, step_order: 1, reason: "sod_self" },
        ],
      },
    },
  });
  await renderPage(approverDetail({
    approval,
    events: [{ id: 1, pr_line_id: null, revision: 1, actor_id: 7, actor_name: "Asha Rao", event_type: "approval_started", payload: { instance_id: 900, amount: "2500.00", steps: [{ step_order: 1, policy_step_order: 3, approver_ids: [9] }] }, created_at: "2026-10-11T05:00:00.000Z" }],
  }));

  const rows = screen.getAllByTestId(/^approval-row-/);
  expect(rows.map((r) => r.getAttribute("data-testid"))).toEqual(["approval-row-skip-1", "approval-row-skip-2", "approval-row-step-1"]);
  expect(screen.getByText("Not required below ₹1,00,000")).toBeInTheDocument();
  expect(screen.getByText("Skipped — raised by the requester")).toBeInTheDocument();
});

test("a pending step nobody can act on says so and explains recovery", async () => {
  const approval = pendingApproval({
    steps: [{
      id: 3001, step_order: 1, decision_rule: "ANY", status: "PENDING", approvers: [
        { user_id: 9, user_name: "Hari Head", status: "REMOVED", account_active: true, removed_at: "2026-10-12T05:00:00.000Z" },
      ],
    }],
  });
  await renderPage(approverDetail({ approval, pr: { status: "pending_approval", approval_instance_id: 900, now_with: "No eligible approver — contact your admin" }, capabilities: { approval: null } }));
  const row = screen.getByTestId("approval-row-step-1");
  expect(row).toHaveTextContent("No eligible approver — contact your admin");
  expect(row).toHaveTextContent("ask the requester to withdraw and resubmit, or your admin to fix the approver role");
});

// ---------------------------------------------------------------------------
// 5. Approved with links (buyer view)
// ---------------------------------------------------------------------------

test("an approved PR with links shows the RFQ number, its POs and 'In sourcing'", async () => {
  await renderPage(detail({
    pr: { status: "approved", revision: 1, now_with: "Bina Buyer", assigned_buyer_name: "Bina Buyer", approved_at: "2026-10-12T05:00:00.000Z" },
    lines: [
      line({
        progress: "in_sourcing",
        links: [{ rfq_id: 536700, rfq_no: 536700, rfq_status_label: "Open", live: true, po: [{ po_id: 77, po_number: "PO-77", status: "draft" }] }],
      }),
      line({ id: 502, line_no: 2, line_kind: "free_text", product_variant_id: null, variant_name: null, product_name: null, free_text_name: "Pool chlorine", mapped_variant_id: 410, mapped_variant_name: "Chlorine 10kg", progress: "in_pool" }),
    ],
  }));
  expect(screen.getByRole("link", { name: "RFQ #536700" })).toHaveAttribute("href", "/dashboard/buyer/rfq-management-details?id=536700");
  expect(screen.getByRole("link", { name: "PO-77" })).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/77");
  expect(screen.getByText("Open")).toBeInTheDocument();
  expect(screen.getAllByText("In sourcing").length).toBeGreaterThan(0);
  expect(screen.getByTestId("header-progress")).toHaveTextContent("Partly in sourcing");
  expect(screen.getByText(/Mapped to Chlorine 10kg/)).toBeInTheDocument();
});

test("Copy as new opens the new draft's edit page", async () => {
  await renderPage(detail({ pr: { status: "rejected", now_with: null }, capabilities: { can_copy: true } }));
  PrApi.copyPr.mockResolvedValue({ status: 1, message: "Copied as a new draft", data: { id: 88, pr_number: "PR-88" } });
  fireEvent.click(screen.getByRole("button", { name: "Copy as new" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/buyer/purchase-requisitions/create?id=88"));
});

test("the requester cancels an approved, unsourced line with a reason", async () => {
  await renderPage(detail({ pr: { status: "approved", now_with: "Purchase team" }, lines: [line({ progress: "in_pool" })], capabilities: { can_cancel_lines: [501] } }));
  PrApi.cancelLine.mockResolvedValue({ status: 1, message: "Line cancelled", data: { line_id: 501, status: "cancelled" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel item 1" }));
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", { name: "Cancel this item" });
  expect(confirm).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "No longer needed" } });
  fireEvent.click(confirm);
  await waitFor(() => expect(PrApi.cancelLine).toHaveBeenCalledWith("55", 501, "No longer needed"));
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledTimes(2));
});

// ---------------------------------------------------------------------------
// 6. Conflict
// ---------------------------------------------------------------------------

test("a 409 on submit shows the conflict copy and Refresh refetches", async () => {
  await renderPage(detail({ capabilities: { can_edit: true, can_submit: true, can_cancel: true } }));
  PrApi.submitPr.mockRejectedValue(axiosErr(409, { status: 0, code: "PR_STATE_CONFLICT", message: "This requisition is in_review" }));

  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  const alert = await screen.findByTestId("action-error");
  expect(alert).toHaveTextContent(ERROR_COPY.PR_STATE_CONFLICT);
  expect(PrApi.getPr).toHaveBeenCalledTimes(1);

  PrApi.getPr.mockResolvedValue({ status: 1, data: detail({ pr: { status: "in_review", now_with: "Technical review: Engineering" }, capabilities: { can_withdraw: true } }) });
  fireEvent.click(within(alert).getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByTestId("now-with")).toHaveTextContent("Technical review: Engineering"));
  expect(screen.queryByTestId("action-error")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// 7. Conversation + timeline
// ---------------------------------------------------------------------------

test("posting a comment appends it to the conversation", async () => {
  const first = { id: 1, author_id: 7, author_name: "Asha Rao", body: "Please hurry", created_at: "2026-10-11T05:00:00.000Z" };
  await renderPage(detail({ comments: [first] }));
  const convo = screen.getByTestId("pr-conversation");
  expect(within(convo).getByText("Please hurry")).toBeInTheDocument();

  const post = within(convo).getByRole("button", { name: "Post comment" });
  expect(post).toBeDisabled();
  fireEvent.change(within(convo).getByLabelText("Write a comment"), { target: { value: "On it" } });
  expect(within(convo).getByText("5/4000")).toBeInTheDocument();

  const second = { id: 2, author_id: 9, author_name: "Hari Head", body: "On it", created_at: "2026-10-11T06:00:00.000Z" };
  PrApi.addComment.mockResolvedValue({ status: 1, message: "Comment added", data: detail({ comments: [first, second] }) });
  fireEvent.click(post);

  await waitFor(() => expect(PrApi.addComment).toHaveBeenCalledWith("55", "On it"));
  await waitFor(() => expect(within(screen.getByTestId("pr-conversation")).getByText("On it")).toBeInTheDocument());
  expect(within(screen.getByTestId("pr-conversation")).getByText("Please hurry")).toBeInTheDocument();
  expect(within(screen.getByTestId("pr-conversation")).getByLabelText("Write a comment")).toHaveValue("");
});

test("the timeline labels events and shows a spec edit's before and after", async () => {
  await renderPage(detail({
    pr: { status: "in_review", now_with: "Technical review: Engineering" },
    events: [
      { id: 1, pr_line_id: null, revision: 0, actor_id: 7, actor_name: "Asha Rao", event_type: "created", payload: { line_count: 1 }, created_at: "2026-10-10T05:00:00.000Z" },
      { id: 2, pr_line_id: null, revision: 1, actor_id: 7, actor_name: "Asha Rao", event_type: "submitted", payload: { estimated_total: "2500.00", line_count: 1, from_status: "draft" }, created_at: "2026-10-11T05:00:00.000Z" },
      { id: 3, pr_line_id: 501, revision: 1, actor_id: 8, actor_name: "Rita Reviewer", event_type: "spec_edited", payload: { line_no: 1, before: "600 GSM", after: "700 GSM cotton" }, created_at: "2026-10-11T06:00:00.000Z" },
      { id: 4, pr_line_id: null, revision: 1, actor_id: 8, actor_name: "Rita Reviewer", event_type: "brand_new_event", payload: {}, created_at: "2026-10-11T07:00:00.000Z" },
    ],
  }));
  const tl = screen.getByTestId("pr-timeline");
  expect(within(tl).getByText("Draft created")).toBeInTheDocument();
  expect(within(tl).getByText("Submitted")).toBeInTheDocument();
  expect(within(tl).getByText("Specification changed on item 1")).toBeInTheDocument();
  expect(within(tl).getByText("600 GSM")).toBeInTheDocument();
  expect(within(tl).getByText("700 GSM cotton")).toBeInTheDocument();
  expect(within(tl).getAllByText(/Rita Reviewer/).length).toBeGreaterThan(0);
  expect(within(tl).getByText("Brand new event")).toBeInTheDocument();
});

test("an unreadable PR shows a not-found message", async () => {
  PrApi.getPr.mockRejectedValue(axiosErr(404, { status: 0, code: "PR_NOT_FOUND", message: "Purchase requisition not found" }));
  render(<PrDetailPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Purchase requisition not found");
});
