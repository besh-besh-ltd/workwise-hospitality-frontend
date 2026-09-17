// Nav badges — every approval a buyer can be asked for must light up the
// module where they act on it. Publishing a rate contract (ARC_PUBLISH) and
// approving an ARC negotiation round (ARC_NEGOTIATION) both land on Rate
// Contracts; before this they raised approvals that no badge ever showed.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({ getPendingApprovalCounts: jest.fn() }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { getStorage: jest.fn((key) => (key === "token" ? "t" : key === "current-user-type" ? "buyer" : null)) },
}));
jest.mock("@/utils/hospitalityContext", () => ({
  getStoredHospitalityContext: jest.fn(() => ({ companyId: 4, hotelId: 12 })),
  subscribeHospitalityContext: jest.fn(() => () => {}),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPendingApprovalCounts } from "@/services/approval";
import usePendingApprovalIndicators from "./usePendingApprovalIndicators";

const Probe = ({ href }) => {
  const { pendingCountFor } = usePendingApprovalIndicators();
  return <div data-testid="count">{pendingCountFor(href)}</div>;
};

test("rate contract publish and negotiation approvals badge Rate Contracts", async () => {
  getPendingApprovalCounts.mockResolvedValue({
    data: [
      { entity_type: "ARC_PUBLISH", count: "2" },
      { entity_type: "ARC_NEGOTIATION", count: "1" },
      { entity_type: "ARC_COMMITTEE", count: "3" },
      { entity_type: "PO", count: "5" },
    ],
  });

  render(<Probe href="/dashboard/buyer/rate-contracts" />);

  await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("6"));
});
