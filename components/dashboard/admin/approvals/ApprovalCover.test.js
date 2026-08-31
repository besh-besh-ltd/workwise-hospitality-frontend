// Cover — "while I am away, X approves for me".
//
// The platform ships a system role titled "Proxy Approver" with zero holders
// and nothing behind it: a name promising cover the product did not provide.
//
// The thing this screen has to make unmistakable is that cover is
// forward-only. It is applied when an approval is created, so arranging it
// moves nothing already sitting in a queue. An admin who expects otherwise
// will arrange cover, watch nothing move, and conclude it is broken — so the
// explanation is on the screen, not in a tooltip nobody opens.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockList = jest.fn();
const mockCreate = jest.fn();
const mockRevoke = jest.fn();
const mockUsers = jest.fn();
jest.mock("@/services/approval", () => ({
  getApprovalDelegations: (...a) => mockList(...a),
  createApprovalDelegation: (...a) => mockCreate(...a),
  revokeApprovalDelegation: (...a) => mockRevoke(...a),
}));
jest.mock("@/services/Auth", () => ({
  getCompanyUsersDetailed: (...a) => mockUsers(...a),
}));
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ApprovalCover from "./ApprovalCover";

const PEOPLE = [
  { id: 11, name: "Priya Sharma", status: 1 },
  { id: 12, name: "Ravi Nair", status: 1 },
  { id: 13, name: "Left The Company", status: 0 },
];

const ROWS = [
  {
    id: 5,
    delegator_name: "Priya Sharma",
    delegate_name: "Ravi Nair",
    starts_at: "2026-09-10T00:00:00Z",
    ends_at: "2026-09-20T23:59:59Z",
    reason: "Annual leave",
    is_active: true,
  },
  {
    id: 6,
    delegator_name: "Ravi Nair",
    delegate_name: "Priya Sharma",
    starts_at: "2026-12-01T00:00:00Z",
    ends_at: "2026-12-10T23:59:59Z",
    reason: null,
    is_active: false,
  },
];

beforeEach(() => {
  mockList.mockReset().mockResolvedValue({ data: ROWS });
  mockUsers.mockReset().mockResolvedValue({ data: { users: PEOPLE } });
  mockCreate.mockReset().mockResolvedValue({ status: 1 });
  mockRevoke.mockReset().mockResolvedValue({ status: 1 });
});

describe("what cover is", () => {
  it("says on the screen that it does not move what is already waiting", async () => {
    // The single most likely misunderstanding, and the one that makes the
    // feature look broken. It belongs in the open, not behind a tooltip.
    render(<ApprovalCover />);
    expect(
      await screen.findByText(/does not move anything already waiting/i)
    ).toBeInTheDocument();
  });

  it("points at the screen that does move them", async () => {
    render(<ApprovalCover />);
    await screen.findByText(/does not move anything already waiting/i);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("tells apart cover running now from cover booked for later", async () => {
    // Different facts, acted on differently: one explains where today's
    // approvals went, the other is a plan that can still be cancelled.
    render(<ApprovalCover />);
    const active = (await screen.findByText(/Ravi Nair covers Priya Sharma/)).closest("li");
    const future = screen.getByText(/Priya Sharma covers Ravi Nair/).closest("li");
    expect(within(active).getByText("Active now")).toBeInTheDocument();
    expect(within(future).getByText("Scheduled")).toBeInTheDocument();
  });
});

describe("arranging it", () => {
  it("does not offer people who cannot sign in", async () => {
    // Cover handed to a deactivated account is refused by the server and would
    // silently do nothing; offering the name is the wrong place to find out.
    render(<ApprovalCover />);
    const away = await screen.findByRole("combobox", { name: /Who is away/i });
    expect(within(away).queryByRole("option", { name: "Left The Company" })).toBeNull();
    expect(within(away).getByRole("option", { name: "Priya Sharma" })).toBeInTheDocument();
  });

  it("will not let somebody cover for themselves", async () => {
    render(<ApprovalCover />);
    const away = await screen.findByRole("combobox", { name: /Who is away/i });
    fireEvent.change(away, { target: { value: "11" } });

    const covers = screen.getByRole("combobox", { name: /Who covers/i });
    expect(within(covers).queryByRole("option", { name: "Priya Sharma" })).toBeNull();
  });

  it("needs both people and both dates before it will submit", async () => {
    render(<ApprovalCover />);
    const button = await screen.findByRole("button", { name: /Arrange cover/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByRole("combobox", { name: /Who is away/i }), {
      target: { value: "11" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Who covers/i }), {
      target: { value: "12" },
    });
    expect(button).toBeDisabled();

    const dates = screen.getAllByDisplayValue("").filter((el) => el.type === "date");
    fireEvent.change(dates[0], { target: { value: "2026-09-10" } });
    fireEvent.change(dates[1], { target: { value: "2026-09-20" } });
    expect(button).toBeEnabled();
  });

  it("treats the end date as inclusive, the way a person reads it", async () => {
    // "Back on the 20th" and "covered until the 19th" have to mean the same
    // thing. Sending the bare date would end cover at midnight and leave the
    // last day uncovered.
    render(<ApprovalCover />);
    fireEvent.change(await screen.findByRole("combobox", { name: /Who is away/i }), {
      target: { value: "11" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Who covers/i }), {
      target: { value: "12" },
    });
    const dates = screen.getAllByDisplayValue("").filter((el) => el.type === "date");
    fireEvent.change(dates[0], { target: { value: "2026-09-10" } });
    fireEvent.change(dates[1], { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("button", { name: /Arrange cover/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const sent = mockCreate.mock.calls[0][0];
    // Must land at the END of the chosen day in the viewer's own timezone.
    // Comparing against that day's *start* proves nothing: a bare "2026-09-20"
    // parses as UTC midnight, which is already later than local midnight east
    // of Greenwich, so the naive assertion passes against the bug.
    expect(new Date(sent.ends_at).getTime()).toBeGreaterThan(
      new Date("2026-09-20T23:00:00").getTime()
    );
    expect(new Date(sent.ends_at).getTime()).toBeLessThan(
      new Date("2026-09-21T00:00:01").getTime()
    );
  });
});

describe("ending it early", () => {
  it("sends the revoke and reloads", async () => {
    render(<ApprovalCover />);
    const row = (await screen.findByText(/Ravi Nair covers Priya Sharma/)).closest("li");
    const before = mockList.mock.calls.length;
    fireEvent.click(within(row).getByRole("button", { name: /End early/i }));

    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith(5));
    await waitFor(() => expect(mockList.mock.calls.length).toBeGreaterThan(before));
  });
});
