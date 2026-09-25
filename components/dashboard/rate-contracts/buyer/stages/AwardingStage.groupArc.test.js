// ARC v2 — AwardingStage for a GROUP rate contract.
//
// The committee approves the award hotel by hotel, so each product shows who
// supplies every hotel that needs it — and which hotels have no supplier.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getCommitteeView: jest.fn(),
  decideCommittee: jest.fn(),
}));
jest.mock("react-redux", () => ({ useSelector: (fn) => fn({ userProfile: { id: 7 } }) }));
jest.mock("./StageShared", () => ({
  __esModule: true,
  StageNoPermission: () => null,
  removalReasonLabel: () => "",
}));
jest.mock("./StageAside", () => ({
  __esModule: true,
  ActorFlowCard: () => null,
  ApprovalDecisionCard: () => null,
}));

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import AwardingStage from "./AwardingStage";

const ITEM = 900;

test("each product lists every hotel that needs it with its supplier", async () => {
  ArcApi.getCommitteeView.mockResolvedValue({
    data: {
      arc: { id: 555, is_group: true },
      comm_evaluation: { id: 1, status: "finalized", finalized_at: "2026-09-10T10:00:00Z" },
      items: [{ id: ITEM, variant_name: "Bath towel", uom: "pcs" }],
      awards: [{
        id: 71, arc_item_id: ITEM, awarded_vendor_id: 1, vendor_name: "Alpha Linen", l_rank: "L1",
        allocated_qty: 400, awarded_quote_snapshot: { rate: 100, gst_pct: 5 },
        hotels: [{ hotel_id: 3, allocated_qty: 400 }],
      }],
      hotels: [
        { hotel_id: 3, name: "Goa Resort", is_lead: true },
        { hotel_id: 4, name: "Mumbai Suites", is_lead: false },
      ],
      item_hotel_qtys: { [ITEM]: [{ hotel_id: 3, indicative_qty: 400 }, { hotel_id: 4, indicative_qty: 250 }] },
      approval: null,
      approval_instance: null,
    },
  });

  render(
    <AwardingStage
      arc={{ id: 555 }}
      stage={{ state: "active", reason: null }}
      permissions={{ "arc-committee": ["read"], arc: [] }}
      onRefresh={jest.fn()}
    />
  );

  const table = await screen.findByRole("table", { name: "Bath towel by hotel" });
  const goa = within(table).getByRole("row", { name: /Goa Resort/ });
  expect(goa).toHaveTextContent("400");
  expect(goa).toHaveTextContent("Alpha Linen");
  const mumbai = within(table).getByRole("row", { name: /Mumbai Suites/ });
  expect(mumbai).toHaveTextContent("250");
  expect(mumbai).toHaveTextContent("No supplier");
});
