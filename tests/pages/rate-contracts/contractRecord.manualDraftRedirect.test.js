// ARC v2 — the ARC record page sends a draft to the wizard that owns it.
//
// Opening a draft's record page bounces into a wizard. It always picked the
// create wizard, so a Manual ARC opened from anywhere that links to
// /rate-contracts/<id> — a notification, a bookmark, a search result — landed on
// a page that cannot represent it. Which wizard now follows the draft's origin.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getLifecycle: jest.fn(),
}));

const replace = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    isReady: true,
    query: { contractId: "42" },
    push: jest.fn(),
    replace,
  }),
}));

// The stage panels are irrelevant to the redirect and pull in the world.
// Factories are inline because jest.mock is hoisted above any const.
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/ArcStageTimeline", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/OverviewStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/CommercialStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/AwardingStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/ActiveStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/shared/LifecycleHero", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/rate-contracts/buyer/stages/StageShared", () => ({
  __esModule: true,
  StageNoPermission: () => null,
}));

import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ContractRecordPage from "@/pages/dashboard/buyer/rate-contracts/[contractId]/index";

const lifecycle = (arcOver = {}) => ({
  data: {
    arc: { id: 42, status: "draft", hotel_id: 3, department_id: 9, ...arcOver },
    stages: [{ key: "overview", label: "Overview", state: "current" }],
    default_stage: "overview",
    permissions: { arc: ["read"], "arc-tech": [], "arc-comm": [], "arc-committee": [] },
  },
});

afterEach(() => jest.clearAllMocks());

describe("ARC record page — a draft bounces to the right wizard", () => {
  test("a manual draft goes to the Manual ARC workspace", async () => {
    ArcApi.getLifecycle.mockResolvedValue(lifecycle({ is_manual: true }));
    render(<ContractRecordPage />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/dashboard/buyer/rate-contracts/manual-entry?d=42")
    );
  });

  test("an ordinary draft still goes to the create wizard", async () => {
    ArcApi.getLifecycle.mockResolvedValue(lifecycle({ is_manual: false }));
    render(<ContractRecordPage />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/dashboard/buyer/rate-contracts/create?c=42")
    );
  });

  test("a live contract is not redirected anywhere", async () => {
    ArcApi.getLifecycle.mockResolvedValue(lifecycle({ status: "contract_active", is_manual: true }));
    render(<ContractRecordPage />);
    await waitFor(() => expect(ArcApi.getLifecycle).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });
});
