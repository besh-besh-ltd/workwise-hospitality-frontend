// ARC v2 — OverviewStage for a GROUP rate contract: each item shows the
// quantity every covered hotel expects.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getContractDetail: jest.fn(),
  getPublishApproval: jest.fn(),
  publishApprovalDecide: jest.fn(),
  extendSubmission: jest.fn(),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/storageInstance", () => ({ __esModule: true, default: { getStorage: jest.fn(() => null) } }));
jest.mock("./StageShared", () => ({ __esModule: true, StageSkeleton: () => null, removalReasonLabel: () => "" }));
jest.mock("./StageAside", () => ({
  __esModule: true,
  StageColumns: (props) => props.children,
  ActorFlowCard: () => null,
  ApprovalDecisionCard: () => null,
}));

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import OverviewStage from "./OverviewStage";

test("each item shows every covered hotel's quantity", async () => {
  const hotels = [
    { hotel_id: 3, name: "Goa Resort", is_lead: true },
    { hotel_id: 4, name: "Mumbai Suites", is_lead: false },
  ];
  ArcApi.getContractDetail.mockResolvedValue({
    data: {
      arc: { id: 42, is_group: true, hotels },
      items: [{
        id: 900, variant_name: "Bath towel", uom: "pcs", indicative_qty: 650,
        hotel_qtys: [{ hotel_id: 3, indicative_qty: 400 }, { hotel_id: 4, indicative_qty: 250 }],
      }],
      invitations: [],
    },
  });

  render(
    <OverviewStage
      arc={{ id: 42, status: "floated", is_group: true, hotels }}
      stage={{ key: "overview", state: "current" }}
      lifecycle={{ stages: [] }}
      permissions={{ arc: ["read"] }}
      onRefresh={jest.fn()}
    />
  );

  const row = (await screen.findByText("Bath towel")).closest("tr");
  expect(within(row).getByTitle("Goa Resort")).toHaveTextContent("400");
  expect(within(row).getByTitle("Mumbai Suites")).toHaveTextContent("250");
});
