// ARC v2 — AwardingStage after the committee approves: the contract copies
// wait here as drafts until the buyer reviews and sends them.

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
jest.mock("./ContractReviewPanel", () => ({
  __esModule: true,
  default: ({ arcId, onSent }) => (
    <div data-testid="contract-review-panel" data-arc={arcId}>
      <button type="button" onClick={() => onSent([{ id: 11 }, { id: 12 }])}>fake send</button>
    </div>
  ),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import AwardingStage from "./AwardingStage";

function committeeView() {
  return {
    data: {
      arc: { id: 555, is_group: false },
      comm_evaluation: { id: 1, status: "finalized", finalized_at: "2026-11-10T10:00:00Z" },
      items: [{ id: 900, variant_name: "Bath towel", uom: "pcs" }],
      awards: [{
        id: 71, arc_item_id: 900, awarded_vendor_id: 1, vendor_name: "Alpha Linen", l_rank: "L1",
        allocated_qty: 600, awarded_quote_snapshot: { rate: 90, gst_pct: 5 },
      }],
      approval: { status: "APPROVED", steps: [], current_step: 1, total_steps: 1, completed_at: "2026-11-10T11:00:00Z" },
      approval_instance: { id: 9, status: "APPROVED" },
    },
  };
}

beforeEach(() => jest.clearAllMocks());

test("committee approved + contract_review: the copies are held for review, not yet sent", async () => {
  ArcApi.getCommitteeView.mockResolvedValue(committeeView());
  render(
    <AwardingStage
      arc={{ id: 555, status: "contract_generated" }}
      stage={{ state: "active", reason: "contract_review" }}
      permissions={{ "arc-committee": ["read"], arc: ["read"] }}
      onRefresh={jest.fn()}
    />
  );

  expect(await screen.findByText(/check the contract copies before they go out/)).toBeInTheDocument();
  expect(screen.getByTestId("contract-review-panel")).toHaveAttribute("data-arc", "555");
  expect(screen.queryByText(/Contracts were reviewed and sent/)).not.toBeInTheDocument();
  expect(screen.getByText("Contract copies reviewed")).toBeInTheDocument();
});

test("after sending, the stage refreshes and advances", async () => {
  ArcApi.getCommitteeView.mockResolvedValue(committeeView());
  const onRefresh = jest.fn().mockResolvedValue(undefined);
  render(
    <AwardingStage
      arc={{ id: 555, status: "contract_generated" }}
      stage={{ state: "active", reason: "contract_review" }}
      permissions={{ "arc-committee": ["read"], arc: ["read"] }}
      onRefresh={onRefresh}
    />
  );
  fireEvent.click(await screen.findByRole("button", { name: "fake send" }));
  await waitFor(() => expect(onRefresh).toHaveBeenCalledWith({ advance: true }));
  expect(await screen.findByText("Sent to 2 vendors for signature")).toBeInTheDocument();
});

test("once sent (awarding complete), the panel is gone and the trail says sent", async () => {
  ArcApi.getCommitteeView.mockResolvedValue(committeeView());
  render(
    <AwardingStage
      arc={{ id: 555, status: "awaiting_vendor_acceptance" }}
      stage={{ state: "complete", reason: "contracts_generated" }}
      permissions={{ "arc-committee": ["read"], arc: ["read"] }}
      onRefresh={jest.fn()}
    />
  );
  expect(await screen.findByText(/Contracts were reviewed and sent/)).toBeInTheDocument();
  expect(screen.queryByTestId("contract-review-panel")).not.toBeInTheDocument();
});
