// REQ-0026 — the ARC approver sees the creator's remarks; reject reason stays separate.
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn() }) }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getArcNegotiationRounds: jest.fn(),
  getArcNegotiationRoundQuotes: jest.fn(() => Promise.resolve({ data: { quotes: [] } })),
  approveArcNegotiationRound: jest.fn(),
  rejectArcNegotiationRound: jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import * as ArcApi from "@/services/arc_v2";
import ArcApproveRoundPanel from "./ArcApproveRoundPanel";

const round = (over) => ({
  id: 4, round_number: 1, effective_status: "PENDING_APPROVAL", can_user_approve: true,
  vendor_ids: [1], end_date: "2026-11-01T04:30:00Z", ...over,
});

describe("ArcApproveRoundPanel creator remarks", () => {
  it("shows creator remarks to the approver", async () => {
    ArcApi.getArcNegotiationRounds.mockResolvedValue({ data: [round({ creator_remarks: "Align payment terms" })] });
    render(<ArcApproveRoundPanel arcId="9" roundId="4" />);
    expect(await screen.findByTestId("round-remarks")).toHaveTextContent("Align payment terms");
  });

  it("shows nothing extra when there are no creator remarks, and keeps the reject reason display", async () => {
    ArcApi.getArcNegotiationRounds.mockResolvedValue({ data: [round({ remarks: "too high" })] });
    render(<ArcApproveRoundPanel arcId="9" roundId="4" />);
    expect(await screen.findByText(/too high/)).toBeInTheDocument();
    expect(screen.queryByTestId("round-remarks")).not.toBeInTheDocument();
  });
});
