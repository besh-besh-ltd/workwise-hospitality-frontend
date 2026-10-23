import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import PurchaseOrderStage from "./PurchaseOrderStage";

jest.mock("@/hooks/usePoInitiators", () => ({
  __esModule: true,
  default: () => ({ initiators: [], total: 0, loading: false }),
  INITIATORS_VISIBLE: 3,
  mailtoHref: () => "#",
  telHref: () => "#",
}));

const hold = {
  send_back_id: 1, target_role: "TECHNICAL_EVALUATOR", target: { id: 5, name: "Asha Rao" },
  reason_category: "TECH_QUERY", since: "2026-10-20T10:00:00Z", requested_by: { id: 9, name: "Vishal" },
};
// As the lifecycle sends them (rfqModel): an unheld PO waits on its approvers;
// a held one waits on the person asked, and is not awaiting its approvers.
const PRIYA = { user_id: 9, name: "Priya Nair" };
const po = (id, over = {}) => ({
  id, po_number: `PO${id}`, vendor_company: `Vendor ${id}`, status: "pending_approval", total_amount: 1000,
  current_actors: [PRIYA], awaiting_me: false, hold: null,
  ...over,
});
const heldPo = (id, over = {}) => po(id, { hold, current_actors: [{ user_id: 5, name: "Asha Rao" }], awaiting_me: false, ...over });
const instance = (poId) => ({
  id: 700 + poId, entity_type: "PO", entity_id: poId, status: "PENDING", current_step: 1, total_steps: 1,
  steps: [{ step_order: 1, status: "PENDING", decision_rule: "ANY", approvers: [{ user_id: 9, user_name: "Priya Nair", status: "PENDING" }] }],
});
const render_ = (pos, instances = []) =>
  render(<PurchaseOrderStage stage={{ phase: { purchase_orders: pos, approval_instances: instances } }} rfq={{}} currentUserId={1} />);
const panel = () => screen.getByRole("heading", { name: /Approval/ }).closest(".section-card");

describe("PurchaseOrderStage: held POs", () => {
  test("a held PO is hoisted above the others and carries the hold line", () => {
    render_([po(1), heldPo(2)]);
    const cards = screen.getAllByRole("link").filter((l) => /open the purchase order/.test(l.getAttribute("aria-label") || ""));
    expect(cards[0]).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/2");
    expect(screen.getByText("On hold, waiting on Asha Rao for: Question on the technical evaluation")).toBeInTheDocument();
  });

  test("no holds: server order and no hold line", () => {
    render_([po(1), po(2)]);
    const cards = screen.getAllByRole("link").filter((l) => /open the purchase order/.test(l.getAttribute("aria-label") || ""));
    expect(cards[0]).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/1");
    expect(screen.queryByText(/On hold/)).toBeNull();
  });
});

describe("PurchaseOrderStage: the approval panel of a held PO", () => {
  test("names the person asked, as the card does, not the approvers it is 'waiting on'", () => {
    render_([heldPo(2)], [instance(2)]);
    const p = panel();
    expect(within(p).getByText("On hold, waiting on Asha Rao for: Question on the technical evaluation")).toBeInTheDocument();
    expect(within(p).queryByText(/^Waiting on \(/)).toBeNull();
    expect(within(p).getByText("Priya Nair")).toBeInTheDocument();
  });

  test("an unheld PO's panel still says who it is waiting on", () => {
    render_([po(2)], [instance(2)]);
    const p = panel();
    expect(within(p).getByText("Waiting on (1)")).toBeInTheDocument();
    expect(within(p).queryByText(/On hold/)).toBeNull();
  });
});
