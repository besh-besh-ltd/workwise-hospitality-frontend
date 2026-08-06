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
// Only the skeleton and the "action now / up next" strip are stubbed. The rest
// is real: StageCard / ApprovalChain / StatusPill are what the Overview
// approval panel is built from, and stubbing them would make its assertions
// vacuous.
jest.mock("@/components/dashboard/buyer/rfq/stages/StageShared", () => ({
  ...jest.requireActual("@/components/dashboard/buyer/rfq/stages/StageShared"),
  __esModule: true,
  StageSkeleton: () => null,
  LifecycleContext: () => null,
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

const activeStage = (key, label) => ({
  key, label, state: "active", reason: "in_progress", summary: null,
  phase: { key, label, status: "current" }, action: null,
});

// `lapsed` reproduces what the server returns once an RFQ has published with
// its approval still open: getLifecycleSummary marks the phase `expired`, the
// shaper settles it as state `ended` / reason `expired_pending`, and BOTH
// grants are cleared — the top-level one because expired phases are skipped,
// the per-instance one because a published RFQ's approval is no longer
// decidable (submitApprovalAction returns 400). The instance itself stays
// PENDING; nothing closes it.
//
// `staleGrant` forces can_user_approve back to true on that lapsed instance —
// a payload the fixed server never sends, used to prove the client refuses to
// offer a decision the API would reject even if it somehow arrived.
const lifecyclePayload = ({
  canApprove, lapsed = false, staleGrant = false, approvedOnTime = false,
} = {}) => {
  const live = canApprove && !lapsed && !approvedOnTime;
  const action = {
    required: live,
    can_approve: live,
    label: "You have a pending approval action",
    instance_id: live ? INSTANCE_ID : null,
  };

  const approvalInstance = approvedOnTime
    ? {
        id: INSTANCE_ID, status: "APPROVED", entity_type: "RFQ", entity_id: RFQ_ID,
        current_step: 2, total_steps: 2,
        can_user_approve: false, user_approval_step_id: null,
        initiated_by: { name: "Ravi Iyer" },
        created_at: "2026-05-05T02:54:12.000Z",
        completed_at: "2026-05-05T02:58:00.000Z",
        steps: [{
          step_order: 1, decision_rule: "ANY", status: "APPROVED",
          approvers: [{
            user_id: 7, user_name: "Asha Menon", user_designation: "Purchase Head",
            status: "APPROVED", acted_at: "2026-05-05T02:58:00.000Z",
            comment: "Rates benchmarked, go ahead.",
          }],
        }],
      }
    : {
        id: INSTANCE_ID, status: "PENDING", entity_type: "RFQ", entity_id: RFQ_ID,
        current_step: 1, total_steps: 2,
        can_user_approve: lapsed ? staleGrant : canApprove,
        user_approval_step_id: STEP_ID,
        initiated_by: { name: "Ravi Iyer" },
        created_at: "2026-05-05T02:54:12.000Z",
        steps: [{
          step_order: 1, decision_rule: "ANY", status: "PENDING",
          approvers: [{
            user_id: 7, user_name: "Asha Menon", user_designation: "Purchase Head",
            status: "PENDING",
          }],
        }],
      };

  const overview = approvedOnTime
    ? {
        key: "overview", label: "Overview", state: "complete", reason: "done",
        summary: "Approved by Asha Menon", action: null,
        phase: {
          key: "rfq_approval", label: "RFQ Approval", status: "completed",
          published_without_approval: false,
          completed_at: "2026-05-05T02:58:00.000Z",
          approval_instances: [approvalInstance],
        },
      }
    : lapsed
      ? {
          key: "overview", label: "Overview", state: "ended", reason: "expired_pending",
          summary: "Auto-published — approval was not completed in time", action: null,
          phase: {
            key: "rfq_approval", label: "RFQ Approval", status: "expired",
            published_without_approval: true,
            approval_instances: [approvalInstance],
          },
        }
      : {
          key: "overview", label: "Overview", state: "active", reason: "in_progress",
          summary: null, action,
          phase: {
            key: "rfq_approval", label: "RFQ Approval", status: "current",
            published_without_approval: false,
            approval_instances: [approvalInstance],
          },
        };

  // Once Overview settles, the live work is downstream — which is exactly why
  // default_stage must stop pointing at Overview.
  const settled = lapsed || approvedOnTime;

  return {
    rfq_id: RFQ_ID,
    current_status: settled ? "AWAITING_QUOTES" : "RFQ_APPROVAL",
    default_stage: settled ? "negotiation-award" : "overview",
    action,
    permissions: {},
    stages: [
      overview,
      lockedStage("technical", "Technical Evaluation"),
      settled
        ? activeStage("negotiation-award", "Negotiation & Award")
        : lockedStage("negotiation-award", "Negotiation & Award"),
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

// The Overview approval panel lives in the Overview tab body, and a settled
// RFQ no longer opens there — so reach it the way a user would.
const openOverviewTab = async () => {
  fireEvent.click(await screen.findByRole("tab", { name: /overview/i }));
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

  // THE REPORTED BUG. This assertion used to say the opposite — that a decision
  // is "still offered" on an auto-published RFQ, with copy explaining it no
  // longer gates publication. In production that put a live Approve/Reject in
  // front of 43 approvers across 194 already-published RFQs (112 with a PO
  // already issued), and approvers acted on it: two instances were decided
  // months after their RFQ went out.
  test("offers NO decision once the RFQ has published without its approval", async () => {
    await renderWithLifecycle({ canApprove: true, lapsed: true });

    expect(await screen.findByText(/lifecycle journey/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/your decision is needed/i)).not.toBeInTheDocument();
    // The old explanatory copy goes with it — there is nothing to explain.
    expect(screen.queryByText(/no longer gates publication/i)).not.toBeInTheDocument();
  });

  test("offers no decision even if the payload still carries a stale approve grant", async () => {
    await renderWithLifecycle({ canApprove: true, lapsed: true, staleGrant: true });

    expect(await screen.findByText(/lifecycle journey/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/your decision is needed/i)).not.toBeInTheDocument();
  });

  test("renders nothing for a lapsed approval the caller is not an approver on", async () => {
    await renderWithLifecycle({ canApprove: false, lapsed: true });

    expect(await screen.findByText(/lifecycle journey/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
  });

  test("a published-without-approval RFQ opens on the stage that needs work, not Overview", async () => {
    await renderWithLifecycle({ canApprove: true, lapsed: true });

    // default_stage drives the initial tab; Overview must no longer win it just
    // because its approval never completed.
    const negotiation = await screen.findByRole("tab", { name: /negotiation & award/i });
    await waitFor(() => expect(negotiation).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute("aria-selected", "false");
  });

  test("the Overview rail reads 'Published without approval' and not 'Journey ended'", async () => {
    await renderWithLifecycle({ canApprove: true, lapsed: true });

    expect(await screen.findByText(/published without approval/i)).toBeInTheDocument();
    // The RFQ carried on to negotiation — the journey did not end.
    expect(screen.queryByText(/journey ended/i)).not.toBeInTheDocument();
  });
});

describe("ViewRFQ — Overview approval workflow panel", () => {
  test("shows who approved, when, and their comment", async () => {
    await renderWithLifecycle({ canApprove: false, approvedOnTime: true });
    await openOverviewTab();

    // Scoped to the panel: the stage rail separately (and correctly) shows
    // "Approved by Asha Menon", so an unscoped name query is ambiguous.
    const panel = (await screen.findByText(/publish approval/i)).closest("section");
    expect(within(panel).getByText(/approved before publication/i)).toBeInTheDocument();
    expect(within(panel).getByText(/asha menon/i)).toBeInTheDocument();
    expect(within(panel).getByText(/rates benchmarked, go ahead\./i)).toBeInTheDocument();
    // Who decided, what they decided, and when — on the approver's own row.
    // 02:58 UTC is 08:28 IST; a naive Date() here would render 02:58.
    expect(
      within(panel).getByText(/APPROVED · 05 May 2026, 08:28 am/i)
    ).toBeInTheDocument();
    expect(within(panel).getByText(/raised by ravi iyer/i)).toBeInTheDocument();
  });

  test("states plainly when the RFQ published without its approval", async () => {
    await renderWithLifecycle({ canApprove: true, lapsed: true });
    await openOverviewTab();

    expect(await screen.findByText(/publish approval/i)).toBeInTheDocument();
    expect(
      screen.getByText(/reached its publish date while the approval below was still open/i)
    ).toBeInTheDocument();
    // The outstanding approver is still named — that is the point of the record.
    expect(screen.getByText(/asha menon/i)).toBeInTheDocument();
  });

  test("is visible to a reader who is not an approver at all", async () => {
    await renderWithLifecycle({ canApprove: false, approvedOnTime: true });
    await openOverviewTab();

    // The decision card renders only for the approver; this record does not.
    expect(await screen.findByText(/publish approval/i)).toBeInTheDocument();
    expect(screen.queryByText(/your decision is needed/i)).not.toBeInTheDocument();
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

// ─────────────────────────────────────────────────────────────────────────────
// P0 REGRESSION GUARD — header "Queries" deep link.
//
// The header link was built from `data.rfq_no` (the DISPLAY number) while the
// query page resolves `rfq_id` as the INTERNAL id. Live on id=363/rfq_no=535917
// that produced "Queries for RFQ#undefined" with an empty vendor list, so every
// vendor question raised against the RFQ was invisible from this workspace —
// the buyer's only in-app route to vendor clarifications.
//
// The fixture below deliberately gives `id` and `rfq_no` DIFFERENT values. A
// fixture where they match cannot fail, which is why the original suite (id
// 536299 / rfq_no "536299") sailed straight past this bug.
describe("ViewRFQ header — Queries link target", () => {
  const DISTINCT = {
    ...RFQ,
    id: 363,           // internal id — what `?id=` carries and the query page wants
    rfq_no: "535917",  // display number — what the buyer reads on screen
  };

  const renderHeader = async (rfq = DISTINCT) => {
    getRfqLifecycle.mockResolvedValue({
      status: 1,
      data: { ...lifecyclePayload({ canApprove: false }), rfq_id: rfq.id },
    });
    const view = render(<ViewRFQ data={rfq} isCreator={false} />);
    await waitFor(() => expect(getRfqLifecycle).toHaveBeenCalled());
    return view;
  };

  test("points at the internal RFQ id, not the display rfq_no", async () => {
    await renderHeader();

    const queries = await screen.findByRole("link", { name: /queries/i });
    expect(queries).toHaveAttribute(
      "href",
      "/dashboard/buyer/query?rfq_id=363&role=buyer",
    );
    // The display number must never reach the query page as `rfq_id`.
    expect(queries.getAttribute("href")).not.toContain("535917");
  });

  test("the header still shows the display number to the buyer", async () => {
    // Guards the other direction: fixing the link must not swap the
    // human-facing RFQ number for the internal id anywhere in the hero.
    await renderHeader();

    expect(await screen.findByText(/#535917/)).toBeInTheDocument();
  });
});
