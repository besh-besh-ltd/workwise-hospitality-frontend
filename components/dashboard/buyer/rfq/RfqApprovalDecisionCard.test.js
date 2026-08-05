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
// PURCHASE ORDERS are the same defect with money on it: an Approve button on a
// card that shows neither the line items, nor the quantities, nor the rates,
// nor the taxes, nor the approval trail — "why would someone accept/reject a PO
// without ever verifying or auditing it properly?". So the buttons went, and a
// pointer banner into /dashboard/buyer/purchase-orders/{id} took their place.
//
// Then the banner went too. The stage timeline already marks the Purchase Order
// stage as needing this user's action, and the stage panel hoists and
// highlights the PO card waiting on them — a banner above the tab was a third
// telling of the same fact. A PO approval now renders NOTHING here. The pinned
// behaviour is: nothing rendered for a PO, the resolver still recognising it so
// the timeline and stage panel keep their signal, and every other entity type
// keeping its buttons untouched.
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

// The purchase-order stage as the shaper emits it: phase key `purchase_order`,
// the `purchase_orders[]` array the PO stage panel already renders, and the PO
// approval instances. Ground truth: RFQ 235, PO 29 (#108194), instance 253.
const poLifecycleWith = ({ instances, purchaseOrders = null }) => {
  const action = sharedAction(instances[0].id);
  return {
    rfq_id: RFQ_ID,
    current_status: "PO_APPROVAL",
    default_stage: "purchase-order",
    action,
    permissions: {},
    stages: [
      {
        key: "purchase-order",
        label: "Purchase Order",
        state: "active",
        reason: "in_progress",
        summary: null,
        can_read: true,
        action, // same shared reference — deliberately
        phase: {
          key: "purchase_order",
          label: "Purchase Order",
          status: "current",
          purchase_orders: purchaseOrders,
          approval_instances: instances,
        },
      },
    ],
  };
};

// Instance 253: level 3 of 3, ALL rule, 7 approvers, 1 of them APPROVED.
const poInstance = (over = {}) =>
  instance({
    id: 253,
    entityType: "PO",
    entityId: 29,
    currentStep: 3,
    totalSteps: 3,
    approvers: [
      { user_id: 407, user_name: "Siddharth Kothari", status: "PENDING" },
      { user_id: 408, user_name: "Vineet Iyer", status: "APPROVED" },
      { user_id: 412, user_name: "Vineet Bhatia", status: "PENDING" },
      { user_id: 424, user_name: "Sarvesh Rane", status: "PENDING" },
      { user_id: 426, user_name: "Kushal Shah", status: "PENDING" },
      { user_id: 435, user_name: "Vineet Rao", status: "PENDING" },
      { user_id: 436, user_name: "QA Vineet", status: "PENDING" },
    ],
    ...over,
  });

// One row of phase.purchase_orders. `initiated_by` / `stage_label` /
// `current_actors` / `awaiting_me` / `approval` are the fields the lifecycle
// endpoint is gaining alongside this change — the card must render with them
// AND without them, because the two repos deploy separately.
const PO_ROW = {
  id: 29,
  po_number: "108194",
  status: "pending",
  vendor_name: "Nova Sales",
  vendor_company: "NovaTech Hospitality Solutions",
  total_amount: 33495,
  product_names: "KEYBOARD",
  created_at: "2026-07-30T09:12:00Z",
  initiated_by: { user_id: 401, name: "Rohit Nair" },
  stage_label: "Awaiting L3 approval",
  current_actors: [{ user_id: 407, name: "Siddharth Kothari" }],
  awaiting_me: true,
  approval: {
    instance_id: 253, current_step: 3, total_steps: 3, decision_rule: "ALL",
    approved_count: 1, pending_count: 6, total_count: 7,
  },
};

describe("purchase order (PO) — nothing renders here at all", () => {
  // A PO approval surfaces NO control and NO banner on the RFQ page.
  //
  // Two separate decisions landed here. First: no Approve/Reject, because
  // deciding a PO without the line items, quantities, rates and taxes in front
  // of you is not a decision — that surface is the PO details page. Then the
  // banner that replaced those buttons went too: RfqStageTimeline already marks
  // the Purchase Order stage as needing this user's action, and the stage panel
  // hoists and highlights the PO card that is waiting on them, so a third
  // announcement of the same fact above the tab was noise.
  //
  // These tests pin BOTH halves. The resolver must still SEE the PO approval
  // (so the timeline and stage panel keep working, and so re-introducing a
  // surface later is a rendering change, not a plumbing one) while the card
  // itself renders nothing.
  const poLifecycle = () =>
    poLifecycleWith({ instances: [poInstance()], purchaseOrders: [PO_ROW] });

  test("renders nothing — no buttons, no banner, no link", () => {
    const { container } = render(<RfqApprovalDecisionCard lifecycle={poLifecycle()} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/action needed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your decision is needed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /purchase order/i })).not.toBeInTheDocument();
  });

  test("names nothing about the PO — number, vendor and value stay off this page", () => {
    render(<RfqApprovalDecisionCard lifecycle={poLifecycle()} />);

    expect(screen.queryByText(/108194/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NovaTech/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/33,495/)).not.toBeInTheDocument();
  });

  test("the resolver still recognises the PO approval, it is only unrendered", () => {
    // If this ever stops being true the stage timeline loses its "action
    // needed" marker too, and the user would have no signal anywhere.
    const d = resolveRfqApprovalDecision(poLifecycle());

    // The resolver returns null when there is nothing to act on, so a non-null
    // object carrying the instance IS the "recognised" signal.
    expect(d).not.toBeNull();
    expect(d.entityType).toBe("PO");
    expect(d.instanceId).toBe(poInstance().id);
  });


  test("a non-PO approval on the same page still gets its Approve/Reject", () => {
    // Same stage shape, different entity type — the PO branch must not swallow
    // approvals whose decision genuinely belongs on this page.
    const lifecycle = poLifecycleWith({
      instances: [
        instance({
          id: 610,
          entityType: "TECHNICAL",
          entityId: 77,
          approvers: [{ user_id: 407, user_name: "Siddharth Kothari", status: "PENDING" }],
        }),
      ],
      purchaseOrders: [PO_ROW],
    });

    render(<RfqApprovalDecisionCard lifecycle={lifecycle} />);

    expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /purchase order/i })
    ).not.toBeInTheDocument();
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
  // PO is deliberately NOT in this list — it is decided inside the PO now (see
  // the purchase-order describe above). Everything else decides the page the
  // approver is already reading, so the buttons stay exactly where they were.
  const cases = [
    { entityType: "RFQ", noun: "RFQ" },
    { entityType: "TENDER", noun: "RFQ" }, // entityLabel prop supplies the noun
    { entityType: "TECHNICAL", noun: "Technical evaluation" },
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

describe("REMOVED approvers — mid-flight reconciler tombstones (PO 138699 / RFQ 681, instance 3628)", () => {
  // Real production shape: levels 1-2 already APPROVED, level 3 PENDING with
  // one live approver (added mid-flight, replacing someone) and one REMOVED
  // approver whose role was revoked while the approval was in progress, and
  // level 4 SKIPPED with no approvers left on it at all. This is the exact
  // shape that shipped "Vishal Kamat — pending" at level 3 and a level 4 that
  // read "waiting" though it was SKIPPED.
  //
  // It is a PO instance, so what renders is the PO banner — the step fraction,
  // the names and the level are asserted on that surface. The tombstone rules
  // are the point here and they hold whichever surface renders them.
  const REMOVED_INSTANCE = {
    id: 3628,
    status: "PENDING",
    entity_type: "PO",
    entity_id: null,
    current_step: 3,
    total_steps: 4,
    can_user_approve: true,
    user_approval_step_id: 7628,
    metadata: null,
    steps: [
      {
        step_order: 1,
        decision_rule: "ALL",
        status: "APPROVED",
        approvers: [{ user_id: 21, user_name: "Varun Sahani", status: "APPROVED" }],
      },
      {
        step_order: 2,
        decision_rule: "ALL",
        status: "APPROVED",
        approvers: [{ user_id: 22, user_name: "Maruti Kangane", status: "APPROVED" }],
      },
      {
        step_order: 3,
        decision_rule: "ALL",
        status: "PENDING",
        approvers: [
          { user_id: 22, user_name: "Maruti Kangane", status: "PENDING", added_mid_flight: true },
          {
            user_id: 23,
            user_name: "Vishal Kamat",
            status: "REMOVED",
            removal_reason: "role_removed",
            removed_at: "2026-08-01T07:08:31Z",
          },
        ],
      },
      { step_order: 4, decision_rule: "ALL", status: "SKIPPED", approvers: [] },
    ],
  };

  const removedLifecycle = () => lifecycleWith({ instances: [REMOVED_INSTANCE] });
  // The production record this block is built from is a PO, and the resolver
  // tests below keep using it as-is. But a PO approval now renders NOTHING on
  // this page (the decision moved inside the PO), so the two tests that assert
  // on the RENDERED output have to ride on an entity type that still draws a
  // card — otherwise the regression guard silently degrades into "renders
  // nothing", which would pass even if the removed-approver logic broke.
  const removedLifecycleRendered = () =>
    lifecycleWith({ instances: [{ ...REMOVED_INSTANCE, entity_type: "RFQ" }] });

  test("stepProgress excludes the REMOVED approver from the N-of-M total", () => {
    const d = resolveRfqApprovalDecision(removedLifecycle());
    // Only Maruti (PENDING) counts on level 3 — Vishal (REMOVED) must not
    // inflate the total or be counted as if he had acted.
    expect(d.progress).toEqual(expect.objectContaining({ total: 1, done: 0 }));
  });

  test("does not surface the REMOVED approver as someone the step is waiting on", () => {
    const d = resolveRfqApprovalDecision(removedLifecycle());
    expect(d.progress.waitingOn).toEqual(["Maruti Kangane"]);
    expect(d.progress.waitingOn).not.toContain("Vishal Kamat");
    // The "On this step" approver list is built from the same row — must
    // also exclude the removed row, not just the progress numbers.
    expect(d.approvers.map((a) => a.user_name)).toEqual(["Maruti Kangane"]);
  });

  test("renders the decision card without ever naming the removed approver", () => {
    render(<RfqApprovalDecisionCard lifecycle={removedLifecycleRendered()} />);
    expect(screen.getByText(/0 of 1 approver done/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting on Maruti Kangane/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vishal Kamat/)).not.toBeInTheDocument();
  });

  test("shows the true current step (3) — the SKIPPED level 4 is never presented as pending/current", () => {
    render(<RfqApprovalDecisionCard lifecycle={removedLifecycleRendered()} />);
    expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument();
    expect(screen.queryByText(/step 4 of 4/i)).not.toBeInTheDocument();
  });
});
