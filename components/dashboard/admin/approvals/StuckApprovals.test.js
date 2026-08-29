// What is stuck — the operational half of Approvals.
//
// The number that justifies this screen: production holds 332 pending
// approvals, 198 of them older than a month. Asked "is anything stuck?", an
// admin could only be told "332 things, probably", which is the same as not
// being told. Classified, they are 215 whose work has already moved past the
// point where approving changes anything, 114 waiting on a live person, and 3
// where nobody can act at all.
//
// So these tests are about the classification carrying its meaning to the
// reader, and about the guard rails on the one action that changes who
// authorises spend.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockGet = jest.fn();
const mockCandidates = jest.fn();
const mockReassign = jest.fn();
jest.mock("@/services/approval", () => ({
  getStuckApprovals: (...a) => mockGet(...a),
  getReassignmentCandidates: (...a) => mockCandidates(...a),
  reassignApprover: (...a) => mockReassign(...a),
}));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import StuckApprovals from "./StuckApprovals";

const COUNTS = { blocked: 3, waiting: 114, overtaken: 215, total: 332 };

const BLOCKED_ROW = {
  id: 901,
  entity_type: "RFQ",
  entity_id: 536445,
  hotel_name: "The Orchid Pune",
  age_days: 96,
  class: "blocked",
  approvers: [
    {
      user_id: 41,
      name: "Priya Sharma",
      row_status: "PENDING",
      can_act: false,
      account_active: false,
    },
  ],
};

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({
    data: { counts: COUNTS, items: [BLOCKED_ROW], total: 3 },
  });
  mockCandidates.mockReset().mockResolvedValue({
    data: [{ id: 77, name: "Ravi Nair", email: "ravi@example.com" }],
  });
  mockReassign.mockReset().mockResolvedValue({ status: 1 });
});

describe("the shape of the problem", () => {
  it("opens on the handful that actually need an administrator", async () => {
    // Not on all 332. The default is the only class where the admin is the
    // sole way forward.
    render(<StuckApprovals />);
    await screen.findByText("Nobody can act");
    expect(mockGet).toHaveBeenCalledWith(expect.objectContaining({ classes: "blocked" }));
  });

  it("shows all three counts at once, not just the selected one", async () => {
    // The point of the screen is the comparison: 3 against 215 is what tells
    // an admin that most of this list is not a problem to chase.
    render(<StuckApprovals />);
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("114")).toBeInTheDocument();
    expect(screen.getByText("215")).toBeInTheDocument();
  });

  it("says what each state means and what to do about it", async () => {
    render(<StuckApprovals />);
    await screen.findByText("Nobody can act");
    expect(screen.getByText(/Reassign to someone who can approve/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /No longer matters/i }));
    await waitFor(() =>
      expect(screen.getByText(/approving it now changes nothing/i)).toBeInTheDocument()
    );
  });

  it("says why an approver cannot act, in words", async () => {
    // A greyed-out name leaves the admin guessing between "left the company"
    // and "was taken off this step deliberately", which are different problems.
    render(<StuckApprovals />);
    const row = (await screen.findByText("Priya Sharma")).closest("li");
    expect(within(row).getByText("account deactivated")).toBeInTheDocument();
  });

  it("distinguishes a tombstone from a deactivated account", async () => {
    mockGet.mockResolvedValue({
      data: {
        counts: COUNTS,
        items: [
          {
            ...BLOCKED_ROW,
            approvers: [
              {
                user_id: 41,
                name: "Priya Sharma",
                row_status: "REMOVED",
                removal_reason: "Left the procurement team",
                can_act: false,
                account_active: true,
              },
            ],
          },
        ],
        total: 3,
      },
    });
    render(<StuckApprovals />);
    const row = (await screen.findByText("Priya Sharma")).closest("li");
    expect(within(row).getByText(/removed — Left the procurement team/i)).toBeInTheDocument();
    expect(within(row).queryByText("account deactivated")).not.toBeInTheDocument();
  });
});

describe("handing it to somebody else", () => {
  const openPanel = async () => {
    render(<StuckApprovals />);
    fireEvent.click(await screen.findByRole("button", { name: "Reassign" }));
    return screen.findByRole("button", { name: /Reassign approval/i });
  };

  it("will not submit without a reason", async () => {
    const confirm = await openPanel();
    await screen.findByRole("option", { name: /Ravi Nair/ });

    fireEvent.change(screen.getByRole("combobox", { name: /Give it to/i }), {
      target: { value: "77" },
    });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "On leave until the end of the month" },
    });
    expect(confirm).toBeEnabled();
  });

  it("will not submit without somebody to hand it to", async () => {
    const confirm = await openPanel();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "On leave until the end of the month" },
    });
    expect(confirm).toBeDisabled();
  });

  it("says the reason will be recorded, before the click rather than after", async () => {
    await openPanel();
    expect(screen.getByText(/shown in the activity trail/i)).toBeInTheDocument();
    expect(screen.getByText(/recorded against/i)).toBeInTheDocument();
  });

  it("sends the reassignment and reloads the list", async () => {
    const confirm = await openPanel();
    await screen.findByRole("option", { name: /Ravi Nair/ });
    fireEvent.change(screen.getByRole("combobox", { name: /Give it to/i }), {
      target: { value: "77" },
    });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "On leave until the end of the month" },
    });

    const callsBefore = mockGet.mock.calls.length;
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(mockReassign).toHaveBeenCalledWith(901, {
        from_user_id: 41,
        to_user_id: 77,
        reason: "On leave until the end of the month",
      })
    );
    await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
