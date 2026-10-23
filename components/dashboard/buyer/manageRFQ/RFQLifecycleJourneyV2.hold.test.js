// RFQLifecycleJourneyV2 (the fallback lifecycle rail) — a held PO.
//
// While every live PO is on hold, the server's action holders for the PO phase
// are the people asked for information: { kind: 'response', label: 'Asked for
// information', users }. They are not approvers, and there is nothing for them
// to approve, so the rail must not call them "Approvers" or say "Approve PO #X".

const mockSummary = { data: null };
jest.mock("@/hooks/useRFQLifecycleSummary", () => ({
  __esModule: true,
  default: () => ({ data: mockSummary.data, loading: false, actionLoading: false, submitAction: jest.fn() }),
}));
jest.mock("@/components/dashboard/buyer/approval/ApprovalActionModal", () => ({
  __esModule: true,
  default: () => null,
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RFQLifecycleJourneyV2 from "./RFQLifecycleJourneyV2";

const poPhase = (actionHolders) => ({
  key: "purchase_order",
  label: "Purchase Order",
  status: "current",
  sub_status: "approving",
  action_holders: actionHolders,
  approval_instances: [
    {
      id: 41,
      status: "PENDING",
      current_step: 1,
      steps: [{ step_order: 1, decision_rule: "ANY" }],
      metadata: { po_number: "138877", vendor_name: "Acme" },
    },
  ],
});

const mount = (actionHolders) => {
  mockSummary.data = {
    phases: [
      { key: "rfq_approval", label: "RFQ Approval", status: "completed" },
      poPhase(actionHolders),
    ],
  };
  return render(<RFQLifecycleJourneyV2 rfqId={719} />);
};

test("the person asked is labelled with the hold, not as an approver", () => {
  mount({ type: "information", kind: "response", label: "Asked for information", users: [{ id: 5, name: "Asha Rao" }] });
  expect(screen.getByText("Asha Rao")).toBeInTheDocument();
  expect(screen.getAllByText("Asked for information").length).toBeGreaterThan(0);
  expect(screen.queryByText("Approvers")).toBeNull();
  expect(screen.queryByText(/Approve PO #138877/)).toBeNull();
});

test("an approval holder still reads as before", () => {
  mount({ type: "approval", kind: "approval", users: [{ id: 9, name: "Priya Nair" }] });
  expect(screen.getByText("Priya Nair")).toBeInTheDocument();
  expect(screen.getAllByText("Approvers").length).toBeGreaterThan(0);
  expect(screen.getByText("Approve PO #138877")).toBeInTheDocument();
});
