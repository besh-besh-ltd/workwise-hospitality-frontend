// The administrator's landing page.
//
// Reported as "data is not being shown on the Overview dashboard of the Admin
// — Phileein Hospitality". Three things were true at once:
//
//   1. There was no admin Overview. /dashboard/admin rendered <BuyerDashboard>
//      verbatim, so an administrator landed on a buyer's procurement report.
//   2. Every widget on it ANDs a role-scope predicate requiring rfq.read or
//      the like. Administrators hold `company.admin` and nothing else, so all
//      seven cards returned zero — the module's own landing page was blank for
//      its own users, with no error to explain it.
//   3. Phileein genuinely has no sourcing data — 0 RFQs, 0 POs on staging.
//
// So fixing the scope alone would still have shown an empty page. This screen
// answers administrator questions instead, from data Phileein does have: one
// business unit, sixteen people, seven approval workflows.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockCompanies = jest.fn();
const mockUsers = jest.fn();
const mockStuck = jest.fn();
const mockCover = jest.fn();
const mockFacets = jest.fn();

jest.mock("@/services/hospitality", () => ({
  getHospitalityCompanies: (...a) => mockCompanies(...a),
}));
jest.mock("@/services/Auth", () => ({
  getCompanyUsersDetailed: (...a) => mockUsers(...a),
}));
jest.mock("@/services/approval", () => ({
  getStuckApprovals: (...a) => mockStuck(...a),
  getApprovalDelegations: (...a) => mockCover(...a),
}));
jest.mock("@/services/activity", () => ({
  getActivityFacets: (...a) => mockFacets(...a),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminOverview from "./AdminOverview";

const COMPANY = {
  id: 6,
  name: "Phileein Hospitality Private Limited",
  hotels: [{ id: 31, name: "Phileein HO", is_head_office: true }],
};

const ok = () => {
  mockCompanies.mockResolvedValue({ data: [COMPANY] });
  mockUsers.mockResolvedValue({
    data: { users: [], stats: { total_count: 16, active_count: 15, inactive_count: 1, mapped_count: 16 } },
  });
  mockStuck.mockResolvedValue({ data: { counts: { blocked: 2, waiting: 5, overtaken: 9, total: 16 } } });
  mockCover.mockResolvedValue({ data: [{ id: 1, is_active: true }, { id: 2, is_active: false }] });
  mockFacets.mockResolvedValue({ data: { severities: [{ severity: "critical", count: 3 }] } });
};

beforeEach(() => {
  jest.clearAllMocks();
  ok();
});

describe("what an administrator is shown", () => {
  it("reports the estate", async () => {
    render(<AdminOverview />);
    expect(await screen.findByText("Phileein Hospitality Private Limited")).toBeInTheDocument();
    expect(screen.getByTestId("tile-units")).toHaveTextContent("1");
    expect(screen.getByTestId("tile-people")).toHaveTextContent("16");
  });

  it("leads with what needs a person, not with what happened", async () => {
    // "Two approvals nobody can act on" is the only number on this page that
    // asks the administrator to do something today.
    render(<AdminOverview />);
    // The tile renders immediately with an em dash, so wait for the number
    // rather than for the element.
    await waitFor(() => expect(screen.getByTestId("tile-blocked")).toHaveTextContent("2"));
  });

  it("counts cover that is running now, not cover ever arranged", async () => {
    render(<AdminOverview />);
    await waitFor(() => expect(screen.getByTestId("tile-cover")).toHaveTextContent("1"));
  });

  it("shows the critical activity of the last 30 days", async () => {
    render(<AdminOverview />);
    await waitFor(() => expect(screen.getByTestId("tile-critical")).toHaveTextContent("3"));
  });
});

describe("a company with nothing in it yet", () => {
  it("says so plainly instead of showing a wall of zeros", async () => {
    mockStuck.mockResolvedValue({ data: { counts: { blocked: 0, waiting: 0, overtaken: 0, total: 0 } } });
    mockFacets.mockResolvedValue({ data: { severities: [] } });
    render(<AdminOverview />);

    expect(await screen.findByText(/nothing needs your attention/i)).toBeInTheDocument();
  });

  it("still reports the estate it does have", async () => {
    mockStuck.mockResolvedValue({ data: { counts: { blocked: 0, waiting: 0, overtaken: 0, total: 0 } } });
    render(<AdminOverview />);
    // The reported bug: a company with one unit and sixteen people was shown
    // an empty page because it had no RFQs.
    await waitFor(() => expect(screen.getByTestId("tile-units")).toHaveTextContent("1"));
    expect(screen.getByTestId("tile-people")).toHaveTextContent("16");
  });
});

describe("when a part of the page cannot load", () => {
  it("keeps the rest, rather than failing whole", async () => {
    // Each panel answers a different question and they come from different
    // endpoints; one 403 should not blank the page.
    mockStuck.mockRejectedValue(new Error("403"));
    render(<AdminOverview />);

    await waitFor(() => expect(screen.getByTestId("tile-people")).toHaveTextContent("16"));
    expect(screen.getByTestId("tile-blocked")).toHaveTextContent("—");
  });
});

describe("getting somewhere from here", () => {
  it("points every number at the screen that acts on it", async () => {
    render(<AdminOverview />);
    await waitFor(() => expect(screen.getByTestId("tile-blocked")).toHaveTextContent("2"));

    expect(screen.getByTestId("tile-blocked").closest("a")).toHaveAttribute(
      "href", expect.stringContaining("/dashboard/admin/approvals")
    );
    expect(screen.getByTestId("tile-units").closest("a")).toHaveAttribute(
      "href", expect.stringContaining("/dashboard/admin/hospitality-manager")
    );
    expect(screen.getByTestId("tile-critical").closest("a")).toHaveAttribute(
      "href", expect.stringContaining("severity=critical")
    );
  });
});
