// ViewRFQ — the buyer RFQ workspace page body.
//
// P0 REGRESSION GUARD. The stage-timeline rewrite shipped this page with no
// approve/reject control at all: the server said `action.can_approve = true`,
// the rail rendered the words "Your approval needed", and there was nothing to
// click. Buyers could not approve an RFQ anywhere in the UI.
//
// The single assertion that would have caught it: an Approve control is in the
// page's DOM when GET /rfq/:id/lifecycle says the caller can approve, and is
// absent when it doesn't. Everything here is product-level — what the approver
// sees, and what the app would POST — not internal wiring.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "536299" },
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
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
  getRfqLifecycle: jest.fn(),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(() => Promise.resolve({ status: 1, data: {} })),
}));
jest.mock("@/hooks/useHasTechClauses", () => ({
  __esModule: true,
  default: () => ({ hasClauses: false, loading: false }),
}));
// The legacy right-rail journey self-fetches its own endpoint — stub it so the
// only Approve control the page can render is the one under test.
jest.mock("./RFQLifecycleJourneyV2", () => ({ __esModule: true, default: () => null }));
jest.mock("./RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/StageShared", () => ({
  __esModule: true,
  StageSkeleton: () => null,
  LifecycleContext: () => null,
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRfqLifecycle } from "@/services/rfq";
import { submitApprovalAction } from "@/services/approval";
import ViewRFQ from "./ViewRFQ";

const RFQ_ID = 536299;
const INSTANCE_ID = 4242;
const STEP_ID = 99;

const RFQ = {
  id: RFQ_ID,
  rfq_no: "536299",
  title: "Housekeeping consumables — Q3",
  status: 3,
  is_published: 0,
  is_tender: 0,
  products: [],
  terms: [],
  company_name: "Phileein Hospitality",
  hotel_name: "Hotel One",
  timestamp: "2026-07-20T10:00:00.000Z",
};

// The shaper always returns 4 stages for a non-tender RFQ — that is precisely
// why the old `!(stages.length > 0)` gate hid the rail forever.
const lockedStage = (key, label) => ({
  key, label, state: "locked", reason: "not_started", summary: null,
  phase: { key, label, status: "upcoming" }, action: null,
});

// `lapsed` reproduces the shape the server actually returns for every
// outstanding RFQ approval in production: the RFQ auto-published while the
// approval was open, so getLifecycleSummary marks the phase `expired` and
// clears the TOP-LEVEL grant — while the instance itself stays PENDING with
// can_user_approve = true. Gating only on action.can_approve would leave all
// 193 of those unapprovable.
const lifecyclePayload = ({ canApprove, lapsed = false } = {}) => {
  const action = {
    required: canApprove && !lapsed,
    can_approve: canApprove && !lapsed,
    label: "You have a pending approval action",
    instance_id: canApprove && !lapsed ? INSTANCE_ID : null,
  };
  return {
    rfq_id: RFQ_ID,
    current_status: "RFQ_APPROVAL",
    default_stage: "overview",
    action,
    permissions: {},
    stages: [
      {
        key: "overview", label: "Overview", state: "active",
        reason: lapsed ? "expired_pending" : "in_progress", summary: null,
        action,
        phase: {
          key: "rfq_approval", label: "RFQ Approval",
          status: lapsed ? "expired" : "current",
          approval_instances: [{
            id: INSTANCE_ID, status: "PENDING", entity_type: "RFQ", entity_id: RFQ_ID,
            current_step: 1, total_steps: 2,
            can_user_approve: canApprove,
            user_approval_step_id: STEP_ID,
            steps: [{
              step_order: 1, decision_rule: "ANY", status: "PENDING",
              approvers: [{ user_id: 7, user_name: "Asha Menon", status: "PENDING" }],
            }],
          }],
        },
      },
      lockedStage("technical", "Technical Evaluation"),
      lockedStage("negotiation-award", "Negotiation & Award"),
      lockedStage("purchase-order", "Purchase Order"),
    ],
  };
};

const renderWithLifecycle = async (opts) => {
  const args = typeof opts === "boolean" ? { canApprove: opts } : opts;
  getRfqLifecycle.mockResolvedValue({ status: 1, data: lifecyclePayload(args) });
  const view = render(<ViewRFQ data={RFQ} isCreator={false} />);
  await waitFor(() => expect(getRfqLifecycle).toHaveBeenCalled());
  return view;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ViewRFQ — approve/reject decision surface", () => {
  test("renders an Approve control when the lifecycle says the caller can approve", async () => {
    await renderWithLifecycle(true);

    expect(await screen.findByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
    expect(screen.getByText(/your decision is needed/i)).toBeInTheDocument();
  });

  test("renders NO approve/reject control when the caller cannot approve", async () => {
    await renderWithLifecycle(false);

    // Wait for the lifecycle-driven body to settle before asserting absence.
    expect(await screen.findByText(/lifecycle journey/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/your decision is needed/i)).not.toBeInTheDocument();
  });

  test("still offers a decision when the RFQ auto-published with the approval open", async () => {
    await renderWithLifecycle({ canApprove: true, lapsed: true });

    expect(await screen.findByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    // …and says so, rather than pretending the decision still gates publishing.
    expect(screen.getByText(/no longer gates publication/i)).toBeInTheDocument();
  });

  test("renders nothing for a lapsed approval the caller is not an approver on", async () => {
    await renderWithLifecycle({ canApprove: false, lapsed: true });

    expect(await screen.findByText(/lifecycle journey/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
  });

  test("Approve submits the instance + step the lifecycle handed us", async () => {
    await renderWithLifecycle(true);

    fireEvent.click(await screen.findByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(submitApprovalAction).toHaveBeenCalledTimes(1));
    expect(submitApprovalAction).toHaveBeenCalledWith({
      approval_instance_id: INSTANCE_ID,
      approval_instance_step_id: STEP_ID,
      action: "APPROVE",
    });
  });

  test("falls back to the stage action's step_id when the instance omits one", async () => {
    // Older/leaner instance payloads carry no user_approval_step_id; the stage
    // action block now does. Passing a real step is stricter than passing none.
    const payload = lifecyclePayload({ canApprove: true });
    payload.stages[0].phase.approval_instances[0].user_approval_step_id = null;
    payload.stages[0].action = { ...payload.stages[0].action, step_id: 555, entity_type: "RFQ" };
    getRfqLifecycle.mockResolvedValue({ status: 1, data: payload });

    render(<ViewRFQ data={RFQ} isCreator={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(submitApprovalAction).toHaveBeenCalledTimes(1));
    expect(submitApprovalAction).toHaveBeenCalledWith({
      approval_instance_id: INSTANCE_ID,
      approval_instance_step_id: 555,
      action: "APPROVE",
    });
  });

  test("omits the step id entirely when no source provides one", async () => {
    const payload = lifecyclePayload({ canApprove: true });
    payload.stages[0].phase.approval_instances[0].user_approval_step_id = null;
    getRfqLifecycle.mockResolvedValue({ status: 1, data: payload });

    render(<ViewRFQ data={RFQ} isCreator={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(submitApprovalAction).toHaveBeenCalledTimes(1));
    expect(submitApprovalAction).toHaveBeenCalledWith({
      approval_instance_id: INSTANCE_ID,
      action: "APPROVE",
    });
  });

  test("Reject requires a reason before anything is submitted", async () => {
    await renderWithLifecycle(true);

    fireEvent.click(await screen.findByRole("button", { name: /^reject$/i }));
    expect(submitApprovalAction).not.toHaveBeenCalled();
    expect(screen.getByText(/add a reason before rejecting/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/remark for the approval trail/i), {
      target: { value: "Budget not sanctioned yet" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^reject$/i }));

    await waitFor(() => expect(submitApprovalAction).toHaveBeenCalledTimes(1));
    expect(submitApprovalAction).toHaveBeenCalledWith({
      approval_instance_id: INSTANCE_ID,
      approval_instance_step_id: STEP_ID,
      action: "REJECT",
      comment: "Budget not sanctioned yet",
    });
  });
});
