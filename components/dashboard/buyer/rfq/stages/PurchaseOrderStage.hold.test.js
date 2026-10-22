import React from "react";
import { render, screen } from "@testing-library/react";
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
const po = (id, over = {}) => ({ id, po_number: `PO${id}`, vendor_company: `Vendor ${id}`, status: "pending_approval", total_amount: 1000, ...over });
const render_ = (pos) => render(<PurchaseOrderStage stage={{ phase: { purchase_orders: pos, approval_instances: [] } }} rfq={{}} currentUserId={1} />);

describe("PurchaseOrderStage: held POs", () => {
  test("a held PO is hoisted above the others and carries the hold line", () => {
    render_([po(1), po(2, { hold })]);
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
