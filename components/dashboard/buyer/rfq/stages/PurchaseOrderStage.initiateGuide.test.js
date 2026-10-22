// T1 — the initiate guide inside the Purchase Order stage.
//
// Navigation only: one link per draft to the PO page, never an initiate,
// approve or reject control on the RFQ page (the client's August 2026 decision).
// The viewer classes and copy are t1 §6.2 / §6.3.

import React from "react";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import PurchaseOrderStage from "./PurchaseOrderStage";
import { getPOInitiators } from "@/services/po";

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ asPath: "/x", query: {}, push: jest.fn() }),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPOInitiators: jest.fn(() => new Promise(() => {})),
}));

beforeEach(() => {
  getPOInitiators.mockReset();
  getPOInitiators.mockImplementation(() => new Promise(() => {}));
});

const DAY = 24 * 3600 * 1000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

const INITIATORS = [
  { user_id: 12, name: "Bharat Bhusan Biswal", email: "b@example.com", mobile: "9820011223", role_title: "Commercial Approver" },
  { user_id: 13, name: "Varun Sahani", email: "v@example.com", mobile: null, role_title: "Commercial Approver" },
  { user_id: 14, name: "Vishal Kamat", email: "k@example.com", mobile: null, role_title: "Final Awarding" },
];
const answer = (over = {}) => ({ can_initiate: false, initiators: INITIATORS, total: 3, ...over });

const draft = (over = {}) => ({
  id: 41, po_number: "139141", status: "draft",
  vendor_name: "Acme", vendor_company: "Acme Foods Pvt Ltd",
  total_amount: 51330, product_names: "Rice", created_at: ago(DAY),
  raised_by: { id: 5, name: "Prashant Joshi" }, initiated_by: null,
  po_product_count: 2, rfq_product_count: 2, products_on_other_pos: 0, products_unawarded: 0,
  initiate_kind: "complete", initiate_awaiting_me: true,
  ...over,
});

const render_ = (pos, { canInitiate = true, userId = 99, phaseExtra = {}, rfq = {} } = {}) =>
  render(
    <PurchaseOrderStage
      currentUserId={userId}
      rfq={{ id: 235, rfq_no: "536552", hotel_name: "IRA Bhavnagar", ...rfq }}
      stage={{
        key: "purchase-order", label: "Purchase Order", state: "active", reason: "in_progress", summary: null, action: null,
        phase: {
          key: "purchase_order", label: "Purchase Order", status: "current",
          purchase_orders: pos, approval_instances: [],
          ...(canInitiate === null ? {} : { can_initiate: canInitiate }),
          ...phaseExtra,
        },
      }}
    />,
  );

const guide = (container) => container.querySelector(".guide");
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("initiate guide — V1 (can initiate)", () => {
  test("complete draft: heading, 3 steps, one button-link to the PO with ?action=initiate", () => {
    const { container } = render_([draft()]);
    const g = within(guide(container));
    expect(g.getByText("Next step: initiate the purchase order")).toBeInTheDocument();
    expect(guide(container)).toHaveClass("success");
    expect(g.getByText(/draft PO 139141 for Acme Foods Pvt Ltd/)).toBeInTheDocument();
    expect(g.getByText(/It does not go to the approvers or the vendor until someone initiates it, and you can\./)).toBeInTheDocument();
    expect(g.getByText("Open the draft purchase order.")).toBeInTheDocument();
    expect(g.getByText("Check the vendor, the lines and the total.")).toBeInTheDocument();
    expect(g.getByText(/It goes to the PO approvers, then to the vendor for acceptance\./)).toBeInTheDocument();
    const link = g.getByRole("link", { name: /Open PO 139141 to initiate/ });
    expect(link).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/41?action=initiate");
    expect(g.getByText(/Drafted 1 day ago, when Prashant Joshi approved the award\./)).toBeInTheDocument();
  });

  test("V1 never asks who else can initiate", async () => {
    render_([draft()]);
    await settle();
    expect(getPOInitiators).not.toHaveBeenCalled();
  });

  test("split draft adds the 'other products are already on PO' line", () => {
    const { container } = render_([draft({
      initiate_kind: "split", po_product_count: 4, rfq_product_count: 5, products_on_other_pos: 1,
    })]);
    expect(within(guide(container)).getByText(/This PO covers 4 of 5 products\. The other 1 is already on another purchase order, so nothing else is waiting\./)).toBeInTheDocument();
    expect(guide(container)).toHaveClass("success");
  });

  test("partial draft: warn guide with initiate-now-or-wait copy", () => {
    const { container } = render_([draft({
      id: 50, po_number: "139150", initiate_kind: "partial",
      po_product_count: 8, rfq_product_count: 9, products_unawarded: 1,
    })]);
    const g = within(guide(container));
    expect(guide(container)).toHaveClass("warn");
    expect(g.getByText("You can initiate this purchase order now, or wait")).toBeInTheDocument();
    expect(g.getByText(/covers 8 of 9 products\. 1 product is still being awarded\./)).toBeInTheDocument();
    expect(g.getByText(/If you wait, anything later awarded to this vendor is added to this draft automatically\./)).toBeInTheDocument();
    expect(g.getByRole("link", { name: /Open PO 139150/ })).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/50?action=initiate");
  });

  test("several drafts: count heading and one row per draft, oldest first", () => {
    const { container } = render_([
      draft({ id: 2, po_number: "138930", vendor_company: "B Ltd", total_amount: 69434, po_product_count: 17, created_at: ago(19 * DAY) }),
      draft({ id: 1, po_number: "138929", vendor_company: "A Ltd", total_amount: 24945, po_product_count: 9, created_at: ago(20 * DAY) }),
    ]);
    const g = within(guide(container));
    expect(g.getByText("2 purchase orders are waiting for you to initiate")).toBeInTheDocument();
    expect(g.getByText(/Each one goes to its own approvers\. Open each one and press Initiate\./)).toBeInTheDocument();
    const rows = g.getAllByRole("link");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/1?action=initiate");
    expect(rows[0]).toHaveTextContent("PO 138929");
    expect(rows[0]).toHaveTextContent("A Ltd");
    expect(rows[0]).toHaveTextContent("₹24,945.00");
    expect(rows[0]).toHaveTextContent("9 lines");
    expect(rows[0]).toHaveTextContent("20 days");
    expect(rows[1]).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/2?action=initiate");
  });

  test("seven drafts show 5 rows then 'Show all 7'", () => {
    const seven = Array.from({ length: 7 }).map((_, i) =>
      draft({ id: 100 + i, po_number: `2000${i}`, created_at: ago((10 - i) * DAY) }));
    const { container } = render_(seven);
    const g = within(guide(container));
    expect(g.getAllByRole("link")).toHaveLength(5);
    fireEvent.click(g.getByRole("button", { name: "Show all 7" }));
    expect(g.getAllByRole("link")).toHaveLength(7);
  });

  test("draft card: 'Raised by', and 'Next: initiate (you)'", () => {
    const { container } = render_([draft()]);
    const card = within(container.querySelector(".prop-card"));
    expect(card.getByText("Raised by")).toBeInTheDocument();
    expect(card.getByText("Prashant Joshi")).toBeInTheDocument();
    expect(card.queryByText("Initiated by")).not.toBeInTheDocument();
    expect(card.getByText("Next: initiate (you)")).toBeInTheDocument();
  });
});

describe("initiate guide — V2 / V3 / nobody", () => {
  test("V2: the viewer raised it and cannot initiate", async () => {
    getPOInitiators.mockResolvedValue(answer());
    const { container } = render_([draft({ raised_by: { id: 99, name: "Me" } })], { canInitiate: false, userId: 99 });
    expect(await screen.findByText("Draft PO 139141 is ready for a PO initiator")).toBeInTheDocument();
    const g = within(guide(container));
    expect(g.getByText(/Your approval created this draft\. Initiating it is a separate step, and you can't do it for IRA Bhavnagar\. Any of these people can:/)).toBeInTheDocument();
    expect(g.getByText("Bharat Bhusan Biswal")).toBeInTheDocument();
    expect(g.getByText("Varun Sahani")).toBeInTheDocument();
    expect(g.getByRole("link", { name: "View the draft" })).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/41");
    expect(g.queryByRole("link", { name: /to initiate/ })).not.toBeInTheDocument();
    expect(getPOInitiators).toHaveBeenCalledTimes(1);
    expect(getPOInitiators).toHaveBeenCalledWith(41);
  });

  test("V2 matches the id across number/string", async () => {
    getPOInitiators.mockResolvedValue(answer());
    render_([draft({ raised_by: { id: "99", name: "Me" } })], { canInitiate: false, userId: 99 });
    expect(await screen.findByText("Draft PO 139141 is ready for a PO initiator")).toBeInTheDocument();
  });

  test("V3: any other reader", async () => {
    getPOInitiators.mockResolvedValue(answer());
    const { container } = render_([draft()], { canInitiate: false, userId: 99 });
    expect(await screen.findByText("Waiting for a PO initiator")).toBeInTheDocument();
    const g = within(guide(container));
    expect(g.getByText(/Draft PO 139141 is ready but has not been initiated yet\. You can't initiate it for IRA Bhavnagar\. Any of these people can:/)).toBeInTheDocument();
    expect(g.getByRole("link", { name: "View the draft" })).toBeInTheDocument();
  });

  test("names keep the order the server returned", async () => {
    getPOInitiators.mockResolvedValue(answer({ initiators: [INITIATORS[2], INITIATORS[0], INITIATORS[1]] }));
    const { container } = render_([draft()], { canInitiate: false });
    await screen.findByText("Vishal Kamat");
    const names = Array.from(container.querySelectorAll(".mr-name")).map((n) => n.textContent);
    expect(names).toEqual(["Vishal Kamat", "Bharat Bhusan Biswal", "Varun Sahani"]);
  });

  test("V3 with a partial draft still just waits for an initiator", async () => {
    getPOInitiators.mockResolvedValue(answer());
    render_([draft({ initiate_kind: "partial", products_unawarded: 1 })], { canInitiate: false });
    expect(await screen.findByText("Waiting for a PO initiator")).toBeInTheDocument();
    expect(screen.getByText(/1 product is still being awarded/)).toBeInTheDocument();
  });

  test("several drafts for V3 carry the count", async () => {
    getPOInitiators.mockResolvedValue(answer());
    render_([draft(), draft({ id: 42, po_number: "139142" })], { canInitiate: false });
    expect(await screen.findByText(/2 draft purchase orders are waiting for a PO initiator/)).toBeInTheDocument();
  });

  test("draft card says 'Next: a PO initiator'", async () => {
    getPOInitiators.mockResolvedValue(answer());
    const { container } = render_([draft()], { canInitiate: false });
    await screen.findByText("Waiting for a PO initiator");
    expect(within(container.querySelector(".prop-card")).getByText("Next: a PO initiator")).toBeInTheDocument();
  });

  test("zero initiators: the danger guide with the admin note", async () => {
    getPOInitiators.mockResolvedValue(answer({ initiators: [], total: 0 }));
    const { container } = render_([draft()], { canInitiate: false });
    expect(await screen.findByText("No one can initiate this purchase order yet")).toBeInTheDocument();
    expect(guide(container)).toHaveClass("danger");
    expect(screen.getByText(/Nobody at IRA Bhavnagar can initiate purchase orders\. Ask your administrator to give someone the PO Initiator or Commercial Approver role for IRA Bhavnagar\./)).toBeInTheDocument();
    expect(screen.getByText(/Admin note: this needs awarding · create on this business unit\./)).toBeInTheDocument();
  });

  test("a failed lookup renders no guide and costs nothing", async () => {
    getPOInitiators.mockRejectedValue(new Error("404"));
    const { container } = render_([draft()], { canInitiate: false });
    await settle();
    expect(guide(container)).toBeNull();
    expect(container.querySelector(".prop-card")).toBeInTheDocument();
  });
});

describe("initiate guide — navigation only", () => {
  test.each([
    ["V1", true, null],
    ["V3", false, answer()],
    ["zero", false, answer({ initiators: [], total: 0 })],
  ])("%s: no initiate, approve or reject control anywhere in the stage", async (_n, can, ans) => {
    if (ans) getPOInitiators.mockResolvedValue(ans);
    const { container } = render_([draft(), draft({ id: 42, po_number: "139142" })], { canInitiate: can });
    await settle();
    const buttons = within(container).queryAllByRole("button");
    for (const b of buttons) expect(b).not.toHaveAccessibleName(/initiate|approve|reject/i);
    expect(container.querySelectorAll("form, input[type=submit]")).toHaveLength(0);
  });
});

describe("initiate guide — old backend payload (deploy window)", () => {
  test("no can_initiate: no new guide, today's card and no crash", async () => {
    const legacy = draft();
    for (const k of ["raised_by", "initiate_kind", "initiate_awaiting_me", "po_product_count", "rfq_product_count", "products_on_other_pos", "products_unawarded"]) delete legacy[k];
    legacy.initiated_by = { user_id: 5, name: "Prashant Joshi" };
    const { container } = render_([legacy], { canInitiate: null });
    await settle();
    expect(screen.queryByText("Next step: initiate the purchase order")).not.toBeInTheDocument();
    expect(guide(container)).toBeNull();
    const card = within(container.querySelector(".prop-card"));
    expect(card.getByText("Initiated by")).toBeInTheDocument();
    expect(card.getByText("Current action taker")).toBeInTheDocument();
    expect(card.getByText("Draft — not yet initiated")).toBeInTheDocument();
  });

  test("can_initiate true but the per-PO fields missing still renders without crashing", () => {
    const bare = { id: 41, po_number: "139141", status: "draft", total_amount: 100, created_at: ago(DAY) };
    const { container } = render_([bare]);
    expect(within(guide(container)).getByRole("link", { name: /Open PO 139141 to initiate/ })).toBeInTheDocument();
  });

  test("non-draft POs are untouched by the new contract", () => {
    const { container } = render_([draft({ id: 7, po_number: "1", status: "approved", initiated_by: { id: 3, name: "Ravi", at: ago(DAY) } })]);
    expect(guide(container)).toBeNull();
    expect(within(container.querySelector(".prop-card")).getByText("Initiated by")).toBeInTheDocument();
  });
});
