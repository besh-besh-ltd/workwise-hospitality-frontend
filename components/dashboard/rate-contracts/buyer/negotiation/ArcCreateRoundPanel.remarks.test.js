// REQ-0026 — ARC step 3 has the remarks textarea and submit forwards it.
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn(), query: {} }) }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getCommEval: jest.fn(() => Promise.resolve({ data: { items: [], quotes: [] } })),
  getArcNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  createArcNegotiationRound: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, getChargeNames: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/components/dashboard/buyer/negotiation/create-round/StepVendorsAndTargets", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/negotiation/create-round/useCreateRoundState", () => ({ __esModule: true, default: jest.fn() }));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import useCreateRoundState from "@/components/dashboard/buyer/negotiation/create-round/useCreateRoundState";
import * as ArcApi from "@/services/arc_v2";
import ArcCreateRoundPanel from "./ArcCreateRoundPanel";

const makeWizard = (over = {}) => ({
  step: 3,
  mode: "rfq",
  formData: { end_date: "2026-11-01T10:00" },
  endDateUtc: "2026-11-01T04:30:00Z",
  queuedRounds: [],
  queuedProductIds: new Set(),
  hasQueuedRfqRound: false,
  hasCurrentRound: true,
  canGoToStep3: true,
  canSubmit: true,
  selectedVendorIds: [],
  buildCurrentRoundPayload: () => ({ payload: { is_rfq_level: true, vendor_targets: [] } }),
  clearQueue: jest.fn(),
  updateFormData: jest.fn(),
  roundRemarks: "",
  setRoundRemarks: jest.fn(),
  ...over,
});

describe("ArcCreateRoundPanel remarks", () => {
  beforeEach(() => jest.clearAllMocks());

  it("step 3 shows a labelled remarks textarea with limit and counter", async () => {
    const w = makeWizard({ roundRemarks: "abc" });
    useCreateRoundState.mockReturnValue(w);
    render(<ArcCreateRoundPanel arcId="9" />);
    const ta = await screen.findByLabelText("Remarks for approvers");
    expect(ta.tagName).toBe("TEXTAREA");
    expect(ta).toHaveAttribute("maxlength", "1000");
    expect(ta).toHaveValue("abc");
    expect(screen.getByText("3/1000")).toBeInTheDocument();
    expect(
      screen.getByText("Why is this round being raised? Approvers and your team will see this. Vendors never do.")
    ).toBeInTheDocument();
    fireEvent.change(ta, { target: { value: "hello" } });
    expect(w.setRoundRemarks).toHaveBeenCalledWith("hello");
  });

  it("submit sends the remarks as creator_remarks", async () => {
    useCreateRoundState.mockReturnValue(makeWizard({ roundRemarks: "  match L1 " }));
    render(<ArcCreateRoundPanel arcId="9" />);
    fireEvent.click(await screen.findByRole("button", { name: /submit|create|send/i }));
    await waitFor(() => expect(ArcApi.createArcNegotiationRound).toHaveBeenCalled());
    expect(ArcApi.createArcNegotiationRound.mock.calls[0][1].creator_remarks).toBe("match L1");
  });
});
