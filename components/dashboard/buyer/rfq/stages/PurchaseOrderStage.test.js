// The Purchase Order stage panel — the tab an approver lands on from a "your
// approval is needed" notification.
//
// Two things it has to get right, and both have burned production before:
//
//   1. The tab carries no Approve/Reject controls. The only way to act is to
//      open the PO, so the card for a PO waiting on YOU has to be unmistakably
//      the live thing on the page and has to point at the right PO.
//   2. Approver rosters are audit records, not lists of live people. A REMOVED
//      row is a tombstone and must never be counted, named, or read as
//      pending; and because nothing ever closes out an approver who wasn't
//      needed, a closed ANY level leaves six people stored as PENDING for good
//      — rendering those as "pending" claims a finished level is still waiting.
//
// Fixtures are the real record: RFQ 235 / PO 29 (po_number 108194, ₹33,495,
// NovaTech Hospitality Solutions), approval instance 253 on policy 157 —
// L1 ANY cleared by Vineet I, L2 ALL cleared by Vineet II, L3 ALL live with
// seven approvers of whom one (Vineet I) has approved.

import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import PurchaseOrderStage, { PO_AWAITING_ANCHOR_ID } from "./PurchaseOrderStage";

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ asPath: "/dashboard/buyer/rfq-management-details?id=235", query: {}, push: jest.fn() }),
}));

const ap = (user_id, user_name, status, extra = {}) => ({
  user_id, user_name, user_email: `${user_id}@example.com`,
  user_designation: "Approver", user_department: "Purchase",
  status, acted_at: status === "APPROVED" || status === "REJECTED" ? "2026-06-12 09:30:00" : null,
  comment: null, added_mid_flight: false, removed_at: null, removal_reason: null,
  ...extra,
});

// The seven approvers on level 3, in the order the server sends them.
const L3_APPROVERS = [
  ap(407, "Siddharth Kothari", "PENDING"),
  ap(408, "Vineet I", "APPROVED"),
  ap(412, "Vineet II", "PENDING"),
  ap(424, "Sarvesh", "PENDING"),
  ap(426, "Kushal Shah", "PENDING"),
  ap(435, "Vineet III", "PENDING"),
  ap(436, "QA-Vineet", "PENDING"),
];

const instance253 = (over = {}) => ({
  id: 253, status: "PENDING", entity_type: "PO", entity_id: 29,
  current_step: 3, total_steps: 3,
  can_user_approve: false, user_approval_step_id: null,
  initiated_by: { user_id: 401, name: "Mukul Sharma" },
  created_at: "2026-06-11 10:00:00", completed_at: null,
  steps: [
    { step_order: 1, decision_rule: "ANY", status: "APPROVED", completed_at: "2026-06-11 11:00:00", approvers: [ap(408, "Vineet I", "APPROVED")] },
    { step_order: 2, decision_rule: "ALL", status: "APPROVED", completed_at: "2026-06-11 12:00:00", approvers: [ap(412, "Vineet II", "APPROVED")] },
    { step_order: 3, decision_rule: "ALL", status: "PENDING", completed_at: null, approvers: L3_APPROVERS },
  ],
  ...over,
});

const po29 = (over = {}) => ({
  id: 29, po_number: "108194", status: "pending",
  vendor_name: "NovaTech", vendor_company: "NovaTech Hospitality Solutions",
  total_amount: 33495, product_names: "KEYBOARD", created_at: "2026-06-11 10:00:00",
  ...over,
});

// ── The concluded-approval fixture, taken from stage ──────────────────────
// Instance 111 → PO 5 on RFQ 212 (and 119/130/132/169/254 → POs 6/7/8/9/11):
// APPROVED, a single ANY level of five approvers cleared by one of them, and
// `current_step` reset to 0 — an order that names no step that exists. This is
// the shape a reviewer opening the nominated QA records actually receives.
const FIVE_APPROVERS = [
  ap(408, "Vineet I", "APPROVED"),
  ap(407, "Siddharth Kothari", "PENDING"),
  ap(412, "Vineet II", "PENDING"),
  ap(424, "Sarvesh", "PENDING"),
  ap(426, "Kushal Shah", "PENDING"),
];

const instance111 = (over = {}) => ({
  id: 111, status: "APPROVED", entity_type: "PO", entity_id: 5,
  current_step: 0, total_steps: 1,
  can_user_approve: false, user_approval_step_id: null,
  initiated_by: { user_id: 401, name: "Mukul Sharma" },
  created_at: "2026-05-02 10:00:00", completed_at: "2026-05-02 11:00:00",
  steps: [{ step_order: 1, decision_rule: "ANY", status: "APPROVED", completed_at: "2026-05-02 11:00:00", approvers: FIVE_APPROVERS }],
  ...over,
});

// The per-PO summary the OLD shaper built out of that instance: it resolved the
// current step by `step_order === current_step`, 0 matches nothing, so the rule
// and every count came back empty and the level named no level. 203 instances
// across all entity types sit at current_step = 0 and no step anywhere is
// stored with step_order = 0, so this shape is still on the wire until the
// backend deploy lands everywhere.
const BAD_SERVER_APPROVAL = {
  instance_id: 111, current_step: 0, total_steps: 1, decision_rule: null,
  approved_count: 0, pending_count: 0, total_count: 0,
};

// The CORRECTED shape, field for field as the backend emits it: the instance's
// state is `instance_status` (NOT `status`) beside a boolean `is_concluded`,
// `current_step` is a resolved step_order, `pending_count` is effective, and
// approved + rejected + pending + not_required + not_reached === total_count.
// Values measured from stage: PO 8 / instance 132.
const GOOD_SERVER_APPROVAL = {
  instance_id: 132, instance_status: "APPROVED", is_concluded: true,
  current_step: 1, total_steps: 1, step_status: "APPROVED", decision_rule: "ANY",
  approved_count: 1, pending_count: 0, rejected_count: 0,
  not_required_count: 4, not_reached_count: 0, total_count: 5,
};

// PO 8 itself: the approval concluded APPROVED and the VENDOR then rejected the
// order. Two different facts about one card, and neither may be read off the
// other.
const po8 = (over = {}) => ({
  id: 8, po_number: "108183", status: "rejected_by_vendor",
  vendor_name: "NovaTech", vendor_company: "NovaTech Hospitality Solutions",
  total_amount: 45000, product_names: "KEYBOARD", created_at: "2026-05-03 10:00:00",
  stage_label: "Rejected by vendor", awaiting_me: false, current_actors: [],
  initiated_by: { user_id: 401, name: "Mukul Sharma" },
  approval: GOOD_SERVER_APPROVAL,
  ...over,
});

// ── RFQ 213: three POs, the shape 7 of the 26 stage RFQs with POs are in ──
// The viewer is an approver on the SECOND one and nothing else. The instances
// are ordered A, B, C, so the old `instances[instances.length - 1]` panel would
// have shown C's chain — beside all three cards.
const rfq213 = () => ({
  pos: [
    { id: 7, po_number: "108182", status: "approved", vendor_company: "Alpha Supplies", total_amount: 10000, product_names: "CHAIR", created_at: "2026-05-01 10:00:00", awaiting_me: false },
    { id: 8, po_number: "108183", status: "pending", vendor_company: "Beta Traders", total_amount: 20000, product_names: "DESK", created_at: "2026-05-02 10:00:00", awaiting_me: true },
    { id: 11, po_number: "108208", status: "rejected", vendor_company: "Gamma Corp", total_amount: 30000, product_names: "LAMP", created_at: "2026-05-03 10:00:00", awaiting_me: false },
  ],
  instances: [
    { id: 130, status: "APPROVED", entity_type: "PO", entity_id: 7, current_step: 0, total_steps: 1, can_user_approve: false, initiated_by: null,
      steps: [{ step_order: 1, decision_rule: "ANY", status: "APPROVED", approvers: FIVE_APPROVERS }] },
    { id: 132, status: "PENDING", entity_type: "PO", entity_id: 8, current_step: 2, total_steps: 2, can_user_approve: true, initiated_by: null,
      steps: [
        { step_order: 1, decision_rule: "ANY", status: "APPROVED", approvers: [ap(408, "Vineet I", "APPROVED")] },
        { step_order: 2, decision_rule: "ALL", status: "PENDING", approvers: [ap(407, "Siddharth Kothari", "APPROVED"), ap(424, "Sarvesh", "PENDING"), ap(426, "Kushal Shah", "PENDING")] },
      ] },
    { id: 254, status: "REJECTED", entity_type: "PO", entity_id: 11, current_step: 0, total_steps: 2, can_user_approve: false, initiated_by: null,
      steps: [
        { step_order: 1, decision_rule: "ANY", status: "APPROVED", approvers: [ap(408, "Vineet I", "APPROVED")] },
        { step_order: 2, decision_rule: "ALL", status: "REJECTED", approvers: [ap(435, "Vineet III", "REJECTED"), ap(436, "QA-Vineet", "PENDING")] },
      ] },
  ],
});

const po5 = (over = {}) => ({
  id: 5, po_number: "108005", status: "approved",
  vendor_name: "NovaTech", vendor_company: "NovaTech Hospitality Solutions",
  total_amount: 12000, product_names: "KEYBOARD", created_at: "2026-05-02 10:00:00",
  stage_label: "With vendor · Approved", awaiting_me: false,
  current_actors: [], initiated_by: { user_id: 401, name: "Mukul Sharma" },
  approval: BAD_SERVER_APPROVAL,
  ...over,
});

const stageWith = (purchase_orders, approval_instances) => ({
  key: "purchase-order", label: "Purchase Order", state: "active", reason: "in_progress",
  summary: null, action: null,
  phase: { key: "purchase_order", label: "Purchase Order", status: "current", purchase_orders, approval_instances },
});

const renderStage = (purchase_orders, approval_instances) =>
  render(<PurchaseOrderStage rfq={{ id: 235, rfq_no: "535789" }} stage={stageWith(purchase_orders, approval_instances)} />);

const aside = (container) => within(container.querySelector(".ccm-aside"));
const list = (container) => within(container.querySelector(".prop-list"));
const levelBtn = (container, n) => aside(container).getByRole("button", { name: new RegExp(`Level ${n}\\b`) });

// The approval panels, in render order. There is one per PO that has an
// approval, so "the panel" is only unambiguous on a single-PO RFQ.
const panels = (container) => Array.from(container.querySelectorAll(".ccm-aside .section-card"));
const panelHeadings = (container) => panels(container).map((el) => within(el).getByRole("heading").textContent);
// The panel that names a given PO — the binding this whole fix exists to make.
const panelFor = (container, poNumber) => {
  const el = panels(container).find((p) => within(p).queryByRole("heading", { name: new RegExp(poNumber) }));
  if (!el) throw new Error(`no approval panel names PO ${poNumber}`);
  return { el, q: within(el) };
};
const cardFor = (container, poNumber) =>
  within(list(container).getByRole("link", { name: new RegExp(poNumber) }));

describe("PurchaseOrderStage — the PO waiting on you is the thing to click", () => {
  test("a PO awaiting this user is labelled and links to that PO", () => {
    const { container } = renderStage(
      [po29({ awaiting_me: true, stage_label: "Awaiting L3 approval" })],
      [instance253()],
    );

    const card = list(container).getByRole("link", { name: /waiting on your approval/i });
    expect(card).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/29");
    expect(within(card).getByText("Waiting on you")).toBeInTheDocument();
    expect(within(card).getByText(/open to review and decide/i)).toBeInTheDocument();
  });

  test("a PO not awaiting this user stays calm — still a link, no claim on the viewer", () => {
    const { container } = renderStage(
      [po29({ awaiting_me: false, stage_label: "Awaiting L3 approval" })],
      [instance253()],
    );

    expect(list(container).queryByText("Waiting on you")).not.toBeInTheDocument();
    expect(list(container).getByRole("link", { name: /open the purchase order/i }))
      .toHaveAttribute("href", "/dashboard/buyer/purchase-orders/29");
  });

  test("without awaiting_me it falls back to the instance's own can_user_approve", () => {
    // Deploy skew: the frontend ships before the backend adds the field.
    const { container } = renderStage([po29()], [instance253({ can_user_approve: true, user_approval_step_id: 268 })]);
    expect(list(container).getByText("Waiting on you")).toBeInTheDocument();
  });

  test("pending status alone never claims the viewer is the approver", () => {
    // Everyone with read access sees the same `pending`; only some of them are
    // approvers on it. A status-only inference would lie to the rest.
    const { container } = renderStage([po29()], [instance253({ can_user_approve: false })]);
    expect(list(container).queryByText("Waiting on you")).not.toBeInTheDocument();
  });

  test("the PO awaiting you is hoisted above the ones that aren't", () => {
    const { container } = renderStage(
      [
        po29({ id: 30, po_number: "108195", awaiting_me: false, total_amount: 1000 }),
        po29({ id: 31, po_number: "108196", awaiting_me: false, total_amount: 1000 }),
        po29({ id: 29, po_number: "108194", awaiting_me: true }),
      ],
      [],
    );
    const hrefs = Array.from(container.querySelectorAll(".prop-list a")).map((a) => a.getAttribute("href"));
    expect(hrefs[0]).toBe("/dashboard/buyer/purchase-orders/29");
    expect(hrefs).toEqual([
      "/dashboard/buyer/purchase-orders/29",
      "/dashboard/buyer/purchase-orders/30",
      "/dashboard/buyer/purchase-orders/31",
    ]);
  });
});

describe("PurchaseOrderStage — richer PO cards", () => {
  test("the card says who raised it, where it is, and who holds it now", () => {
    const { container } = renderStage(
      [po29({
        awaiting_me: true,
        initiated_by: { user_id: 401, name: "Mukul Sharma" },
        stage_label: "Awaiting L3 approval",
        current_actors: [{ user_id: 407, name: "Siddharth Kothari" }, { user_id: 412, name: "Vineet II" }, { user_id: 424, name: "Sarvesh" }],
        approval: { instance_id: 253, current_step: 3, total_steps: 3, decision_rule: "ALL", approved_count: 1, pending_count: 6, total_count: 7 },
      })],
      [instance253()],
    );

    const card = list(container).getByRole("link", { name: /108194/ });
    expect(within(card).getByText("Awaiting L3 approval")).toBeInTheDocument();
    expect(within(card).getByText("Mukul Sharma")).toBeInTheDocument();
    expect(within(card).getByText("Siddharth Kothari, Vineet II +1")).toBeInTheDocument();
    expect(within(card).getByText("Level 3 of 3")).toBeInTheDocument();
    expect(within(card).getByText("all must approve")).toBeInTheDocument();
    expect(within(card).getByText("1 of 7 approved")).toBeInTheDocument();
    expect(within(card).getByText("₹33,495.00")).toBeInTheDocument();
    expect(within(card).getByText("KEYBOARD")).toBeInTheDocument();
  });

  test("a payload with none of the new fields still renders a usable card", () => {
    // Old cached lifecycle response: no approval instances, no B1 fields.
    const { container } = renderStage([po29({ status: "dispatched" })], null);
    const card = list(container).getByRole("link", { name: /108194/ });
    expect(within(card).getByText(/With vendor · Dispatched/)).toBeInTheDocument();
    expect(within(card).queryByText("Waiting on you")).not.toBeInTheDocument();
    expect(card).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/29");
  });
});

describe("PurchaseOrderStage — approval progress levels collapse", () => {
  test("settled levels start collapsed, the live level starts open", () => {
    const { container } = renderStage([po29()], [instance253()]);

    expect(levelBtn(container, 1)).toHaveAttribute("aria-expanded", "false");
    expect(levelBtn(container, 2)).toHaveAttribute("aria-expanded", "false");
    expect(levelBtn(container, 3)).toHaveAttribute("aria-expanded", "true");
  });

  test("a collapsed level still reports its rule, its N of M and who it waits on", () => {
    const { container } = renderStage([po29()], [instance253()]);

    expect(levelBtn(container, 1)).toHaveTextContent("any one approves");
    expect(levelBtn(container, 1)).toHaveTextContent("1 of 1 approved");
    expect(levelBtn(container, 1)).toHaveTextContent("Cleared");
    expect(levelBtn(container, 3)).toHaveTextContent("1 of 7 approved");
    expect(levelBtn(container, 3)).toHaveTextContent("Reviewing now");
  });

  test("expanding a settled level reveals its roster", () => {
    const { container } = renderStage([po29()], [instance253()]);

    // Only level 3's copy of Vineet I is on screen while level 1 is shut.
    expect(aside(container).getAllByText("Vineet I")).toHaveLength(1);
    fireEvent.click(levelBtn(container, 1));
    expect(levelBtn(container, 1)).toHaveAttribute("aria-expanded", "true");
    expect(aside(container).getAllByText("Vineet I")).toHaveLength(2);
  });

  test("the open level shows all seven approvers of an ALL rule, not a preview", () => {
    const { container } = renderStage([po29()], [instance253()]);
    const panel = aside(container);

    ["Siddharth Kothari", "Vineet II", "Sarvesh", "Kushal Shah", "Vineet III", "QA-Vineet"]
      .forEach((n) => expect(panel.getByText(n)).toBeInTheDocument());
    expect(panel.getAllByText("Vineet I").length).toBeGreaterThan(0);

    // Segregated: the six outstanding above, the one who acted below.
    expect(panel.getByText("Waiting on (6)")).toBeInTheDocument();
    expect(panel.getByText("Already acted (1)")).toBeInTheDocument();
  });

  test("a concluded instance opens nothing — every level is settled", () => {
    const { container } = renderStage([po29({ status: "approved" })], [instance253({
      status: "APPROVED", current_step: 3, completed_at: "2026-06-13 09:00:00",
      steps: instance253().steps.map((s) => (s.step_order === 3
        ? { ...s, status: "APPROVED", approvers: L3_APPROVERS.map((a) => ({ ...a, status: "APPROVED", acted_at: "2026-06-13 09:00:00" })) }
        : s)),
    })]);

    [1, 2, 3].forEach((n) => expect(levelBtn(container, n)).toHaveAttribute("aria-expanded", "false"));
  });
});

describe("PurchaseOrderStage — a level's roster tells the truth about who is live", () => {
  test("a REMOVED approver is labelled with its reason and left out of the N of M", () => {
    const withTombstone = instance253();
    withTombstone.steps[2].approvers = [
      ...L3_APPROVERS,
      ap(499, "Revoked Approver", "REMOVED", { removed_at: "2026-06-12 08:00:00", removal_reason: "role_removed" }),
    ];
    const { container } = renderStage([po29()], [withTombstone]);
    const panel = aside(container);

    // Eight rows on the level, seven of them live.
    expect(levelBtn(container, 3)).toHaveTextContent("1 of 7 approved");
    expect(levelBtn(container, 3)).toHaveTextContent("1 removed");
    expect(panel.getByText("Removed from this level (1)")).toBeInTheDocument();
    expect(panel.getByText("Revoked Approver")).toBeInTheDocument();
    expect(panel.getByText(/Removed · Role Change/)).toBeInTheDocument();

    // And never counted among the people the level is waiting on.
    expect(panel.getByText("Waiting on (6)")).toBeInTheDocument();
    expect(levelBtn(container, 3)).not.toHaveTextContent("Revoked Approver");
  });

  test("a cleared ANY level shows its non-actors as not required, never as pending", () => {
    // Nothing ever closes out an approver who wasn't needed: six of these seven
    // rows are still literally PENDING in the database, on a level that closed.
    const anyLevel = {
      id: 260, status: "APPROVED", entity_type: "PO", entity_id: 29,
      current_step: 1, total_steps: 1, can_user_approve: false,
      initiated_by: null, created_at: "2026-06-11 10:00:00", completed_at: "2026-06-11 11:00:00",
      steps: [{ step_order: 1, decision_rule: "ANY", status: "APPROVED", completed_at: "2026-06-11 11:00:00", approvers: L3_APPROVERS }],
    };
    const { container } = renderStage([po29({ status: "approved" })], [anyLevel]);

    fireEvent.click(levelBtn(container, 1));
    const panel = aside(container);

    expect(panel.getByText("Not required (6)")).toBeInTheDocument();
    expect(panel.getAllByText("Not required")).toHaveLength(6);
    expect(panel.queryByText("Pending")).not.toBeInTheDocument();
    expect(panel.queryByText(/Waiting on \(/)).not.toBeInTheDocument();
    expect(levelBtn(container, 1)).toHaveTextContent("1 of 7 approved");
    expect(levelBtn(container, 1)).toHaveTextContent("6 not required");
    expect(levelBtn(container, 1)).not.toHaveTextContent("waiting on");
  });

  test("a CANCELLED level gets its own chip and its people read as not reached", () => {
    const cancelled = instance253({
      status: "CANCELLED", current_step: 3, completed_at: "2026-06-13 09:00:00",
      steps: instance253().steps.map((s) => (s.step_order === 3 ? { ...s, status: "CANCELLED" } : s)),
    });
    const { container } = renderStage([po29({ status: "cancelled" })], [cancelled]);

    expect(levelBtn(container, 3)).toHaveTextContent("Cancelled");
    expect(levelBtn(container, 3)).not.toHaveTextContent("Waiting");
    expect(levelBtn(container, 3)).not.toHaveTextContent("Reviewing now");
    // ...and the panel header agrees the instance is settled.
    expect(aside(container).getByText(/Concluded · cancelled/)).toBeInTheDocument();

    fireEvent.click(levelBtn(container, 3));
    const panel = aside(container);
    expect(panel.getByText("Not reached (6)")).toBeInTheDocument();
    expect(panel.queryByText("Pending")).not.toBeInTheDocument();
  });

  test("an unrecognised level status is reported plainly, never as 'waiting'", () => {
    // No new status enum value ships without a frontend case — but if one ever
    // does, the chip has to say so rather than mislabel a settled level.
    const odd = instance253({
      status: "PENDING",
      steps: instance253().steps.map((s) => (s.step_order === 3 ? { ...s, status: "ON_HOLD" } : s)),
    });
    const { container } = renderStage([po29()], [odd]);

    expect(levelBtn(container, 3)).toHaveTextContent("On hold");
    expect(levelBtn(container, 3)).not.toHaveTextContent("Reviewing now");
    expect(container.querySelector(".status-pill.ON_HOLD")).toBeNull();
  });
});

describe("PurchaseOrderStage — the tab points inward", () => {
  test("the column header tells the approver to go into the PO", () => {
    const { container } = renderStage([po29({ awaiting_me: true })], [instance253()]);
    expect(within(container).getByText(/1 purchase order is waiting on your approval/i)).toBeInTheDocument();
    expect(within(container).getByText(/approvals are taken inside the PO/i)).toBeInTheDocument();
  });

  test("no Approve or Reject control exists anywhere on the tab", () => {
    const { container } = renderStage([po29({ awaiting_me: true })], [instance253()]);
    expect(within(container).queryByRole("button", { name: /^approve/i })).not.toBeInTheDocument();
    expect(within(container).queryByRole("button", { name: /^reject/i })).not.toBeInTheDocument();
  });

  test("no purchase orders at all still renders the empty state", () => {
    render(<PurchaseOrderStage rfq={{ id: 235 }} stage={stageWith([], null)} />);
    expect(screen.getByRole("heading", { name: /no purchase orders yet/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// A settled approval has an OUTCOME, not a position.
//
// Six PO approval instances on stage (111/119/130/132/169/254 → POs 5, 6, 7, 8,
// 9, 11) are APPROVED with current_step = 0, and POs 8/5/9/7/6 are the exact
// records nominated for QA of this batch. The card used to print "LEVEL 0 OF 1"
// for them — a level that names no level — while the aside on the same screen
// read "Concluded · approved · 1 of 5 approved · 4 not required". Two panels,
// one instance, contradicting each other.
// ─────────────────────────────────────────────────────────────────────────
describe("PurchaseOrderStage — a concluded approval never renders a level", () => {
  const po5Card = (container) => list(container).getByRole("link", { name: /108005/ });

  test("the string 'Level 0' cannot reach the screen", () => {
    const { container } = renderStage([po5()], [instance111()]);
    expect(container.textContent).not.toMatch(/Level 0/i);
    expect(po5Card(container).textContent).not.toMatch(/\bLevel\b/);
  });

  test("the card states the outcome in the aside's exact words, so the two agree", () => {
    const { container } = renderStage([po5()], [instance111()]);
    expect(within(po5Card(container)).getByText("Concluded · approved")).toBeInTheDocument();
    expect(aside(container).getByText("Concluded · approved")).toBeInTheDocument();
  });

  test("the rule and the tally the server dropped are recovered from the instance", () => {
    const { container } = renderStage([po5()], [instance111()]);
    const card = within(po5Card(container));

    // Everything the bad payload zeroed out — and the same numbers the aside's
    // level header carries, because both are derived from the one roster.
    expect(card.getByText("any one approves")).toBeInTheDocument();
    expect(card.getByText("1 of 5 approved")).toBeInTheDocument();
    expect(card.getByText("4 not required")).toBeInTheDocument();
    expect(levelBtn(container, 1)).toHaveTextContent("any one approves");
    expect(levelBtn(container, 1)).toHaveTextContent("1 of 5 approved");
    expect(levelBtn(container, 1)).toHaveTextContent("4 not required");
  });

  test("no progress bar on a settled approval — 20% beside 'approved' says the opposite", () => {
    const { container } = renderStage([po5()], [instance111()]);
    expect(container.querySelector(".prop-list .vp-bar")).toBeNull();
  });

  test("a live approval still shows its level, its bar and its progress", () => {
    const { container } = renderStage([po29({ awaiting_me: true })], [instance253()]);
    const card = within(list(container).getByRole("link", { name: /108194/ }));
    expect(card.getByText("Level 3 of 3")).toBeInTheDocument();
    expect(card.getByText("1 of 7 approved")).toBeInTheDocument();
    expect(container.querySelector(".prop-list .vp-bar")).not.toBeNull();
  });

  test("a REJECTED instance names its outcome and the level that decided it", () => {
    const rejected = instance253({
      status: "REJECTED", current_step: 0, completed_at: "2026-06-13 09:00:00",
      steps: instance253().steps.map((s) => (s.step_order === 3
        ? { ...s, status: "REJECTED", approvers: [ap(407, "Siddharth Kothari", "REJECTED"), ...L3_APPROVERS.slice(1)] }
        : s)),
    });
    const { container } = renderStage([po29({ status: "rejected" })], [rejected]);
    const card = within(list(container).getByRole("link", { name: /108194/ }));

    expect(card.getByText("Concluded · rejected")).toBeInTheDocument();
    expect(card.getByText("1 of 7 approved")).toBeInTheDocument();
    expect(card.getByText("5 not reached")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Level 0/i);
    expect(aside(container).getByText("Concluded · rejected")).toBeInTheDocument();
  });
});

// Deploy skew runs both ways: the corrected server shape and the broken one are
// both in production at once, and neither may be printed unchecked.
describe("PurchaseOrderStage — the server's approval summary is validated, not trusted", () => {
  test("the broken summary with no instance chain to fall back on still refuses 'Level 0'", () => {
    // Redacted or pre-B1 payload: `po.approval` is all there is. The PO's own
    // status says the approval is over, so the card says so too.
    const { container } = renderStage([po5()], null);
    const card = within(list(container).getByRole("link", { name: /108005/ }));
    expect(container.textContent).not.toMatch(/Level 0/i);
    expect(card.getByText("Concluded · approved")).toBeInTheDocument();
  });

  test("the corrected shape renders identically, with or without the chain", () => {
    [[instance111()], null].forEach((instances) => {
      const { container, unmount } = renderStage([po5({ approval: GOOD_SERVER_APPROVAL })], instances);
      const card = within(list(container).getByRole("link", { name: /108005/ }));
      expect(card.getByText("Concluded · approved")).toBeInTheDocument();
      expect(card.getByText("any one approves")).toBeInTheDocument();
      expect(card.getByText("1 of 5 approved")).toBeInTheDocument();
      expect(card.getByText("4 not required")).toBeInTheDocument();
      expect(container.textContent).not.toMatch(/\bLevel 1 of 1\b/);
      unmount();
    });
  });

  test("the instance state is read from `instance_status`, not `status`", () => {
    // The cross-repo field-name trap. This payload's PO status is `pending`,
    // which infers a LIVE approval — so anything reading the wrong key (or no
    // key) prints "Level 3 of 3" here. Only `instance_status` says APPROVED.
    const { container } = renderStage([po29({
      status: "pending",
      approval: {
        instance_id: 253, instance_status: "APPROVED", is_concluded: true,
        current_step: 3, total_steps: 3, step_status: "APPROVED", decision_rule: "ALL",
        approved_count: 7, pending_count: 0, rejected_count: 0,
        not_required_count: 0, not_reached_count: 0, total_count: 7,
      },
    })], null);
    const card = within(list(container).getByRole("link", { name: /108194/ }));
    expect(card.getByText("Concluded · approved")).toBeInTheDocument();
    expect(card.queryByText(/^Level /)).not.toBeInTheDocument();
    expect(card.getByText("7 of 7 approved")).toBeInTheDocument();
  });

  test("`is_concluded: false` keeps a live approval live even on a settled-looking PO", () => {
    // The boolean is authoritative when present; the PO-status guess is not.
    const { container } = renderStage([po29({
      status: "approved",
      approval: { ...GOOD_SERVER_APPROVAL, instance_status: "PENDING", is_concluded: false, current_step: 2, total_steps: 3, step_status: "PENDING", decision_rule: "ALL", approved_count: 2, pending_count: 3, not_required_count: 0, total_count: 5 },
    })], null);
    const card = within(list(container).getByRole("link", { name: /108194/ }));
    expect(card.getByText("Level 2 of 3")).toBeInTheDocument();
    expect(card.queryByText(/Concluded/)).not.toBeInTheDocument();
  });

  test("PO 8: an APPROVED approval and a vendor rejection read correctly side by side", () => {
    const { container } = renderStage([po8()], null);
    const el = list(container).getByRole("link", { name: /108183/ });
    const head = within(el.querySelector(".prop-head"));
    const body = within(el.querySelector(".prop-body"));

    // The PO's own state lives in the head: status pill + stage label.
    expect(head.getAllByText("Rejected by vendor")).toHaveLength(2);
    expect(head.queryByText(/Concluded/)).not.toBeInTheDocument();
    // The APPROVAL's state lives in the band below, and is not derived from it.
    expect(body.getByText("Concluded · approved")).toBeInTheDocument();
    expect(body.getByText("any one approves")).toBeInTheDocument();
    expect(body.getByText("1 of 5 approved")).toBeInTheDocument();
    expect(body.getByText("4 not required")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// The approval panel belongs to ONE purchase order and says which.
//
// It used to render `instances[instances.length - 1]` — the newest instance on
// the phase — as a single panel beside every card. 7 of the 26 stage RFQs that
// have POs have more than one, so on 27% of them it described a different PO
// from the card next to it.
// ─────────────────────────────────────────────────────────────────────────
describe("PurchaseOrderStage — one approval panel per PO, each naming its PO", () => {
  const render213 = () => {
    const { pos, instances } = rfq213();
    return renderStage(pos, instances);
  };

  test("three POs get three panels, in the same order as the cards", () => {
    const { container } = render213();
    // The awaiting-you PO is hoisted to the top of the card column, and the
    // panels follow it, so the nth panel is the nth card.
    const hrefs = Array.from(container.querySelectorAll(".prop-list a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/dashboard/buyer/purchase-orders/8",
      "/dashboard/buyer/purchase-orders/7",
      "/dashboard/buyer/purchase-orders/11",
    ]);
    expect(panelHeadings(container)).toEqual([
      "Approval · 108183",
      "Approval · 108182",
      "Approval · 108208",
    ]);
  });

  test("the panel for the PO awaiting you describes THAT PO's chain, not another's", () => {
    const { container } = render213();
    const { q } = panelFor(container, "108183");

    // Its own two levels and its own roster...
    expect(q.getByText(/Level 2 of 2 in review/)).toBeInTheDocument();
    expect(q.getByText("Sarvesh")).toBeInTheDocument();
    expect(q.getByText("Kushal Shah")).toBeInTheDocument();
    // ...and nothing from PO 108208's chain, which is what the old single
    // panel would have been showing here.
    expect(q.queryByText("Vineet III")).not.toBeInTheDocument();
    expect(q.queryByText("QA-Vineet")).not.toBeInTheDocument();
  });

  test("each panel agrees with the card beside it", () => {
    const { container } = render213();

    // 108183 — live, level 2 of 2, one of three approved.
    expect(cardFor(container, "108183").getByText("Level 2 of 2")).toBeInTheDocument();
    expect(cardFor(container, "108183").getByText("1 of 3 approved")).toBeInTheDocument();
    expect(panelFor(container, "108183").q.getByText(/Level 2 of 2 in review/)).toBeInTheDocument();
    expect(panelFor(container, "108183").q.getByRole("button", { name: /Level 2\b/ })).toHaveTextContent("1 of 3 approved");

    // 108182 — concluded approved, an ANY level of five cleared by one.
    expect(cardFor(container, "108182").getByText("Concluded · approved")).toBeInTheDocument();
    expect(cardFor(container, "108182").getByText("1 of 5 approved")).toBeInTheDocument();
    expect(panelFor(container, "108182").q.getByText("Concluded · approved")).toBeInTheDocument();
    expect(panelFor(container, "108182").q.getByRole("button", { name: /Level 1\b/ })).toHaveTextContent("1 of 5 approved");

    // 108208 — concluded rejected at level 2.
    expect(cardFor(container, "108208").getByText("Concluded · rejected")).toBeInTheDocument();
    expect(panelFor(container, "108208").q.getByText("Concluded · rejected")).toBeInTheDocument();
    expect(panelFor(container, "108208").q.getByRole("button", { name: /Level 2\b/ })).toHaveTextContent("Rejected");
  });

  test("no panel can be mistaken for another — aria-controls ids are unique", () => {
    const { container } = render213();
    const controls = Array.from(container.querySelectorAll(".ccm-aside [aria-controls]"))
      .map((b) => b.getAttribute("aria-controls"));
    expect(controls.length).toBeGreaterThan(3);
    expect(new Set(controls).size).toBe(controls.length);
  });

  test("the 'waiting on you' card keeps its prominence and its link", () => {
    const { container } = render213();
    const card = list(container).getByRole("link", { name: /waiting on your approval/i });
    expect(card).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/8");
    expect(within(card).getByText("Waiting on you")).toBeInTheDocument();
    expect(within(card).getByText(/open to review and decide/i)).toBeInTheDocument();
    // Still the only one claiming the viewer, and still the first card.
    expect(list(container).getAllByText("Waiting on you")).toHaveLength(1);
    expect(container.querySelectorAll(".prop-list a")[0]).toBe(card);
  });

  test("a single-PO RFQ does not regress — the panel keeps its plain heading", () => {
    // 19 of the 26 stage RFQs with POs have exactly one; it reads fine today.
    const { container } = renderStage([po29()], [instance253()]);
    expect(panelHeadings(container)).toEqual(["Approval progress"]);
    expect(levelBtn(container, 3)).toHaveAttribute("aria-expanded", "true");
  });

  test("one panel beside three cards still says which card it belongs to", () => {
    // Naming follows the number of POs, not the number of panels: two of these
    // three have no approval yet, and an unnamed panel would be anyone's.
    const { pos, instances } = rfq213();
    const { container } = renderStage(pos, [instances[1]]);
    expect(panelHeadings(container)).toEqual(["Approval · 108183"]);
  });

  test("a PO with no approval instance gets no panel, and says so on its card", () => {
    const { pos, instances } = rfq213();
    const { container } = renderStage(
      [...pos, { id: 12, po_number: "108209", status: "draft", vendor_company: "Delta Ltd", total_amount: 5000, created_at: "2026-05-04 10:00:00" }],
      instances,
    );
    expect(panelHeadings(container)).toHaveLength(3);
    expect(() => panelFor(container, "108209")).toThrow(/no approval panel/);
    expect(cardFor(container, "108209").getByText("Draft — not yet initiated")).toBeInTheDocument();
  });

  test("no approval anywhere still renders the single empty panel", () => {
    const { container } = renderStage([po29({ status: "draft" })], []);
    expect(panelHeadings(container)).toEqual(["Approval progress"]);
    expect(aside(container).getByText(/no approval instance yet/i)).toBeInTheDocument();
  });

  test("a live instance whose current_step names no step falls back to the first level", () => {
    const { container } = renderStage(
      [po29({ approval: { ...BAD_SERVER_APPROVAL, total_steps: 3 } })],
      [instance253({ current_step: 0 })],
    );
    const card = within(list(container).getByRole("link", { name: /108194/ }));
    expect(card.getByText("Level 1 of 3")).toBeInTheDocument();
    expect(card.getByText("Awaiting L1 approval")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Level 0|Awaiting L0/i);
  });

  test("an approval summary with nothing true left in it renders no strip at all", () => {
    // Better an absent band than an empty box with a wrong number in it.
    const { container } = renderStage(
      [po29({ status: "draft", approval: { current_step: 0, total_steps: 0, decision_rule: null, approved_count: 0, pending_count: 0, total_count: 0 } })],
      null,
    );
    const card = list(container).getByRole("link", { name: /108194/ });
    expect(card.textContent).not.toMatch(/\bLevel\b|approved\b/);
    expect(card.querySelector(".vp-bar")).toBeNull();
  });
});

describe("PurchaseOrderStage — SKIPPED is 'Not required' everywhere", () => {
  test("a SKIPPED approver row reads 'Not required', never 'Pending'", () => {
    // SKIPPED is permitted by the CHECK constraint and does not occur today,
    // but the three surfaces that render an approver row must not answer it
    // three different ways.
    const withSkip = instance253();
    withSkip.steps[2].approvers = [...L3_APPROVERS, ap(500, "Bypassed Approver", "SKIPPED")];
    const { container } = renderStage([po29()], [withSkip]);
    const panel = aside(container);

    expect(panel.getByText("Not required (1)")).toBeInTheDocument();
    expect(panel.getByText("Bypassed Approver")).toBeInTheDocument();
    expect(levelBtn(container, 3)).toHaveTextContent("1 not required");
    // ...and is not one of the people the level is still waiting on.
    expect(panel.getByText("Waiting on (6)")).toBeInTheDocument();
  });
});

// The fallback below only runs when the server sent no stage_label — so if it
// disagrees with the server's own ordering, the label a PO shows depends on
// which build answered the request. These are rfqModel.buildPODetail's branches.
describe("PurchaseOrderStage — the local stage_label fallback matches the server's", () => {
  const cardOf = (container) => within(list(container).getByRole("link", { name: /108194/ }));

  test("a rejected PO with a live instance reads 'Rejected in approval', not 'Awaiting L3'", () => {
    const { container } = renderStage([po29({ status: "rejected" })], [instance253()]);
    expect(cardOf(container).getByText("Rejected in approval")).toBeInTheDocument();
    expect(cardOf(container).queryByText(/Awaiting L/)).not.toBeInTheDocument();
  });

  test("a draft that already has an instance is just 'Draft'", () => {
    const cancelled = instance253({
      status: "CANCELLED", current_step: 0, completed_at: "2026-06-13 09:00:00",
      steps: instance253().steps.map((s) => (s.step_order === 3 ? { ...s, status: "CANCELLED" } : s)),
    });
    const { container } = renderStage([po29({ status: "draft" })], [cancelled]);
    // Twice: the status pill and the stage label, both saying "Draft".
    expect(cardOf(container).getAllByText("Draft")).toHaveLength(2);
    expect(cardOf(container).queryByText(/not yet initiated/)).not.toBeInTheDocument();
  });

  test("a draft with no instance at all keeps 'Draft — not yet initiated'", () => {
    const { container } = renderStage([po29({ status: "draft" })], null);
    expect(cardOf(container).getByText("Draft — not yet initiated")).toBeInTheDocument();
  });

  test("'With vendor ·' is reserved for the server's five with-vendor statuses", () => {
    // rfqModel's PO_WITH_VENDOR_STATUSES: sent / approved / invoice_raised /
    // dispatched / GRN. "delivered" is not a po_status and no longer sits here.
    ["sent", "approved", "invoice_raised", "dispatched", "GRN"].forEach((status) => {
      const { container, unmount } = renderStage([po29({ status })], null);
      expect(cardOf(container).getByText(/^With vendor · /)).toBeInTheDocument();
      unmount();
    });
    const { container } = renderStage([po29({ status: "acceptance_pending" })], null);
    expect(cardOf(container).getByText("Awaiting vendor acceptance")).toBeInTheDocument();
  });
});

// Deep links from approval emails and the "Waiting on you" queue arrive with
// ?focus=approval. The page-level decision card renders nothing for a PO, so
// this card is the scroll target — without the anchor the link lands on the
// page and highlights nothing at all.
describe("PurchaseOrderStage — ?focus=approval deep-link anchor", () => {
  it("puts the anchor on the awaiting-you card, and only on that card", () => {
    const r = rfq213();
    const { container } = renderStage(r.pos, r.instances);
    const anchored = container.querySelectorAll(`#${PO_AWAITING_ANCHOR_ID}`);
    expect(anchored).toHaveLength(1);
    expect(anchored[0].getAttribute("href")).toBe("/dashboard/buyer/purchase-orders/8");
  });

  it("emits no anchor when no PO is awaiting this user", () => {
    const r = rfq213();
    for (const po of r.pos) po.awaiting_me = false;
    for (const inst of r.instances) inst.can_user_approve = false;
    const { container } = renderStage(r.pos, r.instances);
    expect(container.querySelectorAll(`#${PO_AWAITING_ANCHOR_ID}`)).toHaveLength(0);
  });
});
