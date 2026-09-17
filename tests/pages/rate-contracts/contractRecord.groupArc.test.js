// ARC v2 — the ARC record page for a GROUP rate contract names what it covers.
//
// The hero used to say "Single-BU" for every contract. A group rate contract
// covers several hotels; the hero says how many and which.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getLifecycle: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: { contractId: "42" }, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/ArcStageTimeline", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/OverviewStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/CommercialStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/AwardingStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/ActiveStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/StageShared", () => ({
  __esModule: true,
  StageNoPermission: () => null,
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ContractRecordPage from "@/pages/dashboard/buyer/rate-contracts/[contractId]/index";

const lifecycle = (arcOver = {}) => ({
  data: {
    arc: {
      id: 42, status: "floated", title: "Linen 2026", arc_number: "ARC-1", hotel_id: 3, hotel_name: "Goa Resort",
      department_id: 9, eligibility_type: "open", ...arcOver,
    },
    stages: [{ key: "overview", label: "Overview", state: "current" }],
    default_stage: "overview",
    permissions: { arc: ["read"], "arc-tech": [], "arc-comm": [], "arc-committee": [] },
  },
});

afterEach(() => jest.clearAllMocks());

test("a group rate contract's hero names its hotels", async () => {
  ArcApi.getLifecycle.mockResolvedValue(lifecycle({
    is_group: true,
    hotels: [
      { hotel_id: 3, name: "Goa Resort", is_lead: true },
      { hotel_id: 4, name: "Mumbai Suites", is_lead: false },
      { hotel_id: 5, name: "Delhi Inn", is_lead: false },
    ],
  }));
  render(<ContractRecordPage />);

  expect(await screen.findByText("Group · 3 hotels")).toBeInTheDocument();
  expect(screen.getByText("Goa Resort (lead), Mumbai Suites, Delhi Inn")).toBeInTheDocument();
  expect(screen.queryByText("Single-BU")).not.toBeInTheDocument();
});

test("a single-hotel rate contract still reads Single hotel", async () => {
  ArcApi.getLifecycle.mockResolvedValue(lifecycle({ is_group: false, hotels: [] }));
  render(<ContractRecordPage />);

  expect(await screen.findByText("Single hotel")).toBeInTheDocument();
  expect(screen.getByText("Goa Resort")).toBeInTheDocument();
});
