// NegotiationBanner — the creator of a stuck round must be offered a way out.
//
// REPORTED DEFECT (RFQ #536326). A round waiting on approval blocks any new
// round on the same fields for the same vendor. One approver on an ALL-rule
// step never acted, so the buyer was blocked for 24.5 hours and told to "wait
// for the existing round to complete" — something that was never going to
// happen, because the round could only be approved or expire.
//
// The escape hatch existed on the server the whole time, but this banner
// rendered Approve/Reject only when `isCurrentApprover`, so the person who
// CREATED the round was shown nothing at all. Production holds 179 rounds that
// died waiting like this; 107 of them blocked for over 12 hours, one for a week.
//
// Withdraw is deliberately NOT the same control as Reject:
//   Reject   = an approver's verdict. Shown to a current approver.
//   Withdraw = the author taking their own request back. Creator only, and the
//              server refuses it once the round has gone live to the vendor.

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(),
  getActiveNegotiationRound: jest.fn(),
  approveNegotiationRound: jest.fn(),
  rejectNegotiationRound: jest.fn(),
  withdrawNegotiationRound: jest.fn(),
  closeNegotiationRound: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock("./NegotiationRoundForm", () => ({ __esModule: true, default: () => null }));
jest.mock("./RoundApprovalsList", () => ({ __esModule: true, default: () => null }));
jest.mock("./NegotiationRoundHistoryModal", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import {
  getNegotiationRounds,
  getActiveNegotiationRound,
  withdrawNegotiationRound,
} from "@/services/negotiation";
import NegotiationBanner from "./NegotiationBanner";

const CREATOR = 8001;
const APPROVER = 8002;
const BYSTANDER = 8003;

const pendingRound = (over = {}) => ({
  id: 909,
  round_number: 1,
  status: "PENDING_APPROVAL",
  created_by: CREATOR,
  created_by_name: "Test Buyer",
  created_at: "2026-08-11 09:59:36",
  end_date: "2026-08-13 10:30:00",
  rfq_product_id: 4272,
  vendor_ids: [848],
  approvals: [{ approver_user_id: APPROVER, status: "PENDING" }],
  ...over,
});

const mountAs = async (userId, round) => {
  getNegotiationRounds.mockResolvedValue({ status: 1, data: [round] });
  getActiveNegotiationRound.mockResolvedValue({ status: 1, data: round });
  render(<NegotiationBanner rfq_id={785} currentUser={{ id: userId }} />);
  await waitFor(() => expect(getActiveNegotiationRound).toHaveBeenCalled());
};

const withdrawButton = () => screen.queryByRole("button", { name: /withdraw round/i });

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NegotiationBanner — withdrawing a round stuck in approval", () => {
  test("the creator is offered Withdraw", async () => {
    await mountAs(CREATOR, pendingRound());
    await waitFor(() => expect(withdrawButton()).toBeInTheDocument());
    // …and told WHY it matters, since the blocking is the whole problem.
    expect(screen.getByText(/cannot open another round on the same fields/i)).toBeInTheDocument();
  });

  test("withdrawing sends the reason to the server", async () => {
    withdrawNegotiationRound.mockResolvedValue({ status: 1, message: "Round withdrawn" });
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue("approver on leave");

    await mountAs(CREATOR, pendingRound());
    await waitFor(() => expect(withdrawButton()).toBeInTheDocument());
    fireEvent.click(withdrawButton());

    await waitFor(() =>
      expect(withdrawNegotiationRound).toHaveBeenCalledWith(909, "approver on leave"));
    promptSpy.mockRestore();
  });

  test("cancelling the prompt withdraws nothing", async () => {
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue(null);

    await mountAs(CREATOR, pendingRound());
    await waitFor(() => expect(withdrawButton()).toBeInTheDocument());
    fireEvent.click(withdrawButton());

    expect(withdrawNegotiationRound).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  test("a blank reason withdraws nothing — the server requires one", async () => {
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue("   ");

    await mountAs(CREATOR, pendingRound());
    await waitFor(() => expect(withdrawButton()).toBeInTheDocument());
    fireEvent.click(withdrawButton());

    expect(withdrawNegotiationRound).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  test("a pending APPROVER still sees Approve/Reject, not Withdraw", async () => {
    await mountAs(APPROVER, pendingRound());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Approve$/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^Reject$/i })).toBeInTheDocument();
    // Withdraw is authorship, not review — an approver rejects, they do not withdraw.
    expect(withdrawButton()).not.toBeInTheDocument();
  });

  test("someone who neither created nor approves sees no controls", async () => {
    await mountAs(BYSTANDER, pendingRound());
    await waitFor(() => expect(getActiveNegotiationRound).toHaveBeenCalled());
    expect(withdrawButton()).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Approve$/i })).not.toBeInTheDocument();
  });

  test("a LIVE round offers the creator no Withdraw — the vendor can see it", async () => {
    await mountAs(CREATOR, pendingRound({ status: "ACTIVE" }));
    await waitFor(() => expect(getActiveNegotiationRound).toHaveBeenCalled());
    expect(withdrawButton()).not.toBeInTheDocument();
  });
});
