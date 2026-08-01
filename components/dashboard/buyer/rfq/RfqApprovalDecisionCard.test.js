// RfqApprovalDecisionCard — what the approver is shown, per approval type.
//
// P0 REGRESSION GUARD. The card is rendered page-level on rfq-management-details,
// so it serves every approval the lifecycle loads. It used to render ONE
// anonymous Approve/Reject block for all of them: "Negotiation & Award —
// awaiting your approval" / "You have a pending approval action".
//
// On RFQ #536264 that meant four pending vendor-award approvals — four different
// product lines — produced four identical cards in a row. An approver approved
// one, the card refetched, and the next one rendered with the same headline, the
// same body and the same approver list. It read as "stuck". It was progressing
// invisibly. Vendor awards now render an urgency banner that states the scale,
// carries the item context and points at the comparison sheet's per-cell
// controls, which is where the decision has always actually lived.
//
// Everything asserted here is what the approver sees or what the app POSTs.

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(() => Promise.resolve({ status: 1, data: {} })),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";

import { submitApprovalAction } from "@/services/approval";
import RfqApprovalDecisionCard, { resolveRfqApprovalDecision } from "./RfqApprovalDecisionCard";

const RFQ_ID = 720;

// One pending approval instance the caller may act on, shaped exactly like
// getLifecycleSummary's formatApprovalInstances() output.
const instance = ({
  id,
  entityType,
  entityId = null,
  metadata = null,
  approvers,
  currentStep = 1,
  totalSteps = 1,
}) => ({
  id,
  status: "PENDING",
  entity_type: entityType,
  entity_id: entityId,
  current_step: currentStep,
  total_steps: totalSteps,
  can_user_approve: true,
  user_approval_step_id: 900 + id,
  metadata,
  steps: [
    {
      step_order: currentStep,
      decision_rule: "ALL",
      status: "PENDING",
      approvers,
    },
  ],
});

// The shared `action` object the shaper hangs off EVERY current stage
// (rfqLifecycleShaper.js:64 assigns the same reference), which is why the entity
// type must be read off the instance and never off the stage.
const sharedAction = (instanceId) => ({
  required: true,
  can_approve: true,
  label: "You have a pending approval action",
  instance_id: instanceId,
  step_id: null,
  entity_type: "RFQ",
});

const lifecycleWith = ({ instances, phaseProducts = null, stageKey = "negotiation-award" }) => {
  const action = sharedAction(instances[0].id);
  return {
    rfq_id: RFQ_ID,
    current_status: "QUOTATION_APPROVAL",
    default_stage: stageKey,
    action,
    permissions: {},
    stages: [
      {
        key: stageKey,
        label: stageKey === "negotiation-award" ? "Negotiation & Award" : "Overview",
        state: "active",
        reason: "in_progress",
        summary: null,
        action, // same reference — deliberately
        phase: {
          key: "commercial",
          label: "Commercial Evaluation",
          status: "current",
          products: phaseProducts,
          approval_instances: instances,
        },
      },
    ],
  };
};

// RFQ #536264's real shape: four NEGOTIATION_QUOTE instances, one per product
// line, ALL rule, four approvers on step 1. `product_name` comes back empty in
// production, so the name has to come off the commercial phase's products[].
const FOUR_AWARDS = [
  instance({
    id: 3879,
    entityType: "NEGOTIATION_QUOTE",
    entityId: 8801,
    metadata: {
      rfq_id: RFQ_ID,
      rfq_product_id: 8801,
      vendor_id: 5512,
      po_payload: { total_value: 184500 },
    },
    approvers: [
      { user_id: 1, user_name: "Asha Menon", status: "APPROVED" },
      { user_id: 2, user_name: "Vineet Iyer", status: "APPROVED" },
      { user_id: 3, user_name: "Rhea Kapoor", status: "APPROVED" },
      { user_id: 4, user_name: "Prashant Joshi", status: "PENDING" },
    ],
    totalSteps: 2,
  }),
  instance({
    id: 3880,
    entityType: "NEGOTIATION_QUOTE",
    entityId: 8802,
    metadata: { rfq_id: RFQ_ID, rfq_product_id: 8802, vendor_id: 5512 },
    approvers: [
      { user_id: 1, user_name: "Asha Menon", status: "APPROVED" },
      { user_id: 4, user_name: "Prashant Joshi", status: "PENDING" },
    ],
    totalSteps: 2,
  }),
  instance({
    id: 3881,
    entityType: "NEGOTIATION_QUOTE",
    entityId: 8803,
    metadata: { rfq_id: RFQ_ID, rfq_product_id: 8803, vendor_id: 5512 },
    approvers: [{ user_id: 4, user_name: "Prashant Joshi", status: "PENDING" }],
  }),
  instance({
    id: 3882,
    entityType: "NEGOTIATION_QUOTE",
    entityId: 8804,
    metadata: { rfq_id: RFQ_ID, rfq_product_id: 8804, vendor_id: 5512 },
    approvers: [{ user_id: 4, user_name: "Prashant Joshi", status: "PENDING" }],
  }),
];

const COMMERCIAL_PRODUCTS = [
  {
    product_id: 8801,
    product_name: "WINDOW",
    finalization: { vendor_name: "R. Sharma", vendor_company: "Sharma Glassworks", total_price: 184500 },
    negotiation_rounds: [],
  },
  { product_id: 8802, product_name: "WINDOW", finalization: null, negotiation_rounds: [] },
  { product_id: 8803, product_name: "WINDOW", finalization: null, negotiation_rounds: [] },
  { product_id: 8804, product_name: "WINDOW", finalization: null, negotiation_rounds: [] },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("vendor award (NEGOTIATION_QUOTE) — banner, not a second approve path", () => {
  const awardLifecycle = () =>
    lifecycleWith({ instances: FOUR_AWARDS, phaseProducts: COMMERCIAL_PRODUCTS });

  test("renders a banner and NO Approve/Reject controls", () => {
    render(<RfqApprovalDecisionCard lifecycle={awardLifecycle()} onFocusAward={jest.fn()} />);

    expect(screen.getByText(/action needed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
    // …and none of the anonymous copy that made four different awards look
    // like the same unmoving card.
    expect(screen.queryByText(/you have a pending approval action/i)).not.toBeInTheDocument();
  });

  test("states the scale — how many awards are waiting on this user", () => {
    render(<RfqApprovalDecisionCard lifecycle={awardLifecycle()} onFocusAward={jest.fn()} />);

    expect(
      screen.getByText(/4 vendor awards on this RFQ are waiting on your approval/i)
    ).toBeInTheDocument();
  });

  test("names the item: product, vendor and value", () => {
    render(<RfqApprovalDecisionCard lifecycle={awardLifecycle()} onFocusAward={jest.fn()} />);

    // product_name is empty on the instance in production → the commercial
    // phase's products[] supplies it, matched on rfq_product_id.
    expect(screen.getByText(/WINDOW/)).toBeInTheDocument();
    expect(screen.getByText(/Sharma Glassworks/)).toBeInTheDocument();
    expect(screen.getByText(/1,84,500/)).toBeInTheDocument();
  });

  test("shows how far the current step has got and who is holding it", () => {
    render(<RfqApprovalDecisionCard lifecycle={awardLifecycle()} onFocusAward={jest.fn()} />);

    expect(screen.getByText(/3 of 4 approvers done/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting on Prashant Joshi/i)).toBeInTheDocument();
  });

  test("its call to action hands off to the comparison sheet", () => {
    const onFocusAward = jest.fn();
    render(<RfqApprovalDecisionCard lifecycle={awardLifecycle()} onFocusAward={onFocusAward} />);

    fireEvent.click(screen.getByRole("button", { name: /comparison sheet/i }));
    expect(onFocusAward).toHaveBeenCalledTimes(1);
    // It never posts a decision of its own.
    expect(submitApprovalAction).not.toHaveBeenCalled();
  });

  test("still renders the context when no handoff is wired", () => {
    render(<RfqApprovalDecisionCard lifecycle={awardLifecycle()} />);

    expect(
      screen.getByText(/4 vendor awards on this RFQ are waiting on your approval/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
  });

  test("falls back to the instance's own metadata when the phase has no products", () => {
    const lifecycle = lifecycleWith({ instances: FOUR_AWARDS, phaseProducts: null });
    render(<RfqApprovalDecisionCard lifecycle={lifecycle} onFocusAward={jest.fn()} />);

    // No product name and no vendor to be had — but the ₹ from po_payload and
    // the scale still land, and nothing is invented.
    expect(screen.getByText(/1,84,500/)).toBeInTheDocument();
    expect(screen.queryByText(/Sharma Glassworks/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/4 vendor awards on this RFQ are waiting on your approval/i)
    ).toBeInTheDocument();
  });

  test("a single award says so in the singular", () => {
    const lifecycle = lifecycleWith({
      instances: [FOUR_AWARDS[0]],
      phaseProducts: COMMERCIAL_PRODUCTS,
    });
    render(<RfqApprovalDecisionCard lifecycle={lifecycle} onFocusAward={jest.fn()} />);

    expect(
      screen.getByText(/1 vendor award on this RFQ is waiting on your approval/i)
    ).toBeInTheDocument();
  });
});

describe("negotiation ROUND (NEGOTIATION) — points at the Negotiations module", () => {
  // NOTE: the lifecycle endpoint never loads NEGOTIATION instances today
  // (rfqModel.js:4612-4615), so this cannot render on the RFQ page yet. The
  // branch exists so it never becomes a second, wrong approve path.
  test("links into Negotiations instead of offering Approve/Reject", () => {
    const lifecycle = lifecycleWith({
      instances: [
        instance({
          id: 4100,
          entityType: "NEGOTIATION",
          entityId: 55,
          approvers: [{ user_id: 4, user_name: "Prashant Joshi", status: "PENDING" }],
        }),
      ],
    });

    render(<RfqApprovalDecisionCard lifecycle={lifecycle} rfqId={RFQ_ID} />);

    expect(screen.getByText(/negotiation round on this RFQ is waiting/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open in negotiations/i })).toHaveAttribute(
      "href",
      `/dashboard/buyer/negotiation/${RFQ_ID}/approve`
    );
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
  });
});

describe("every other approval type keeps working Approve/Reject", () => {
  const cases = [
    { entityType: "RFQ", noun: "RFQ" },
    { entityType: "TENDER", noun: "RFQ" }, // entityLabel prop supplies the noun
    { entityType: "TECHNICAL", noun: "Technical evaluation" },
    { entityType: "PO", noun: "Purchase order" },
  ];

  test.each(cases)("$entityType renders Approve and Reject", ({ entityType }) => {
    const lifecycle = lifecycleWith({
      instances: [
        instance({
          id: 501,
          entityType,
          entityId: 77,
          approvers: [{ user_id: 4, user_name: "Prashant Joshi", status: "PENDING" }],
        }),
      ],
    });

    render(<RfqApprovalDecisionCard lifecycle={lifecycle} onFocusAward={jest.fn()} />);

    expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
  });

  test.each(cases)("$entityType submits the instance it resolved", async ({ entityType }) => {
    const lifecycle = lifecycleWith({
      instances: [
        instance({
          id: 501,
          entityType,
          entityId: 77,
          approvers: [{ user_id: 4, user_name: "Prashant Joshi", status: "PENDING" }],
        }),
      ],
    });

    render(<RfqApprovalDecisionCard lifecycle={lifecycle} />);
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(submitApprovalAction).toHaveBeenCalledTimes(1));
    expect(submitApprovalAction).toHaveBeenCalledWith({
      approval_instance_id: 501,
      approval_instance_step_id: 1401,
      action: "APPROVE",
    });
  });

  test.each(cases)("$entityType's toast names $noun, not always the RFQ", async ({ entityType, noun }) => {
    const lifecycle = lifecycleWith({
      instances: [
        instance({
          id: 501,
          entityType,
          entityId: 77,
          approvers: [{ user_id: 4, user_name: "Prashant Joshi", status: "PENDING" }],
        }),
      ],
    });

    render(<RfqApprovalDecisionCard lifecycle={lifecycle} entityLabel="RFQ" />);
    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(`${noun} approved`));
  });
});

describe("resolveRfqApprovalDecision", () => {
  test("reads the entity type off the INSTANCE, not the shared stage action", () => {
    // The stage action says RFQ for every current stage — it is one shared
    // object. A technical approval must not be mistaken for an RFQ approval.
    const lifecycle = lifecycleWith({
      instances: [
        instance({
          id: 610,
          entityType: "TECHNICAL",
          entityId: 77,
          approvers: [{ user_id: 4, user_name: "Prashant Joshi", status: "PENDING" }],
        }),
      ],
    });
    expect(lifecycle.stages[0].action.entity_type).toBe("RFQ"); // the trap

    expect(resolveRfqApprovalDecision(lifecycle).entityType).toBe("TECHNICAL");
  });

  test("counts every award awaiting this user, and describes the pointed-at one first", () => {
    const lifecycle = lifecycleWith({
      instances: FOUR_AWARDS,
      phaseProducts: COMMERCIAL_PRODUCTS,
    });
    // The server pointed at the SECOND instance.
    lifecycle.action.instance_id = 3880;

    const d = resolveRfqApprovalDecision(lifecycle);
    expect(d.awardCount).toBe(4);
    expect(d.awardItems).toHaveLength(4);
    expect(d.awardItems[0].instanceId).toBe(3880);
    expect(d.instanceId).toBe(3880);
  });

  test("returns null when nothing is awaiting this user", () => {
    const lifecycle = lifecycleWith({ instances: FOUR_AWARDS });
    lifecycle.action = { required: false, can_approve: false, instance_id: null };
    lifecycle.stages[0].action = lifecycle.action;
    lifecycle.stages[0].phase.approval_instances = FOUR_AWARDS.map((i) => ({
      ...i,
      can_user_approve: false,
    }));

    expect(resolveRfqApprovalDecision(lifecycle)).toBeNull();
  });
});
