// Approvals — the way in to the approval matrix.
//
// Before this screen existed the matrix was reachable only by opening
// Hospitality Network, selecting a company, finding the right business unit
// card and pressing "Set Hierarchy". There was no nav entry and no way to see
// which units had a workflow at all, so a unit that had never been configured
// looked identical to one that had. These tests pin the two things that make
// the screen worth having: every unit is listed, and the chosen unit lives in
// the URL rather than in component state, so Back returns you to it.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockPush = jest.fn();
let mockQuery = {};
jest.mock("next/router", () => ({
  useRouter: () => ({ query: mockQuery, push: mockPush }),
}));

jest.mock("@/services/hospitality", () => ({
  getHospitalityCompanies: jest.fn(),
}));

// The editor itself is covered by its own suite; here it only needs to be
// identifiable so we can assert we handed over to it.
jest.mock("@/components/dashboard/admin/hospitality-manager/approval-hierarchy", () => ({
  __esModule: true,
  default: () => <div data-testid="hierarchy-editor" />,
}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getHospitalityCompanies } from "@/services/hospitality";
import ApprovalsPage from "./ApprovalsPage";

const COMPANIES = [
  {
    id: 5,
    name: "Kamat Hotels India Limited",
    hotels: [
      { id: 31, name: "Kamat Hotels India Limited - HO", city: "Mumbai", state: "MH" },
      { id: 32, name: "The Orchid Pune", city: "Pune", state: "MH" },
    ],
  },
  { id: 9, name: "Sayaji Hotels", hotels: [{ id: 40, name: "Sayaji Indore" }] },
];

beforeEach(() => {
  mockPush.mockReset();
  mockQuery = {};
  getHospitalityCompanies.mockReset();
  getHospitalityCompanies.mockResolvedValue({ data: COMPANIES });
});

describe("Approvals unit picker", () => {
  it("lists every business unit, grouped by company", async () => {
    render(<ApprovalsPage />);

    expect(await screen.findByText("Kamat Hotels India Limited")).toBeInTheDocument();
    expect(screen.getByText("Sayaji Hotels")).toBeInTheDocument();
    expect(screen.getByText("Kamat Hotels India Limited - HO")).toBeInTheDocument();
    expect(screen.getByText("The Orchid Pune")).toBeInTheDocument();
    expect(screen.getByText("Sayaji Indore")).toBeInTheDocument();
  });

  it("puts the chosen unit in the URL, so Back can return to it", async () => {
    render(<ApprovalsPage />);
    fireEvent.click(await screen.findByText("The Orchid Pune"));

    expect(mockPush).toHaveBeenCalledWith(
      { pathname: "/dashboard/admin/approvals", query: { companyId: 5, hotelId: 32 } },
      undefined,
      { shallow: true }
    );
  });

  it("says so when there are no units to configure, rather than rendering blank", async () => {
    getHospitalityCompanies.mockResolvedValue({ data: [{ id: 5, name: "Empty Co", hotels: [] }] });
    render(<ApprovalsPage />);

    expect(await screen.findByText(/no business units yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Empty Co")).not.toBeInTheDocument();
  });

  it("reports a failed load instead of showing an empty picker", async () => {
    getHospitalityCompanies.mockRejectedValue(new Error("network"));
    render(<ApprovalsPage />);

    expect(await screen.findByText(/could not load your business units/i)).toBeInTheDocument();
  });
});

describe("Approvals with a unit selected", () => {
  beforeEach(() => {
    mockQuery = { companyId: "5", hotelId: "32" };
  });

  it("hands over to the hierarchy editor and names the unit it is editing", async () => {
    render(<ApprovalsPage />);

    expect(screen.getByTestId("hierarchy-editor")).toBeInTheDocument();
    expect(await screen.findByText("The Orchid Pune")).toBeInTheDocument();
    expect(screen.getByText("Kamat Hotels India Limited")).toBeInTheDocument();
  });

  it("offers a way back to the full list", async () => {
    render(<ApprovalsPage />);
    await screen.findByText("The Orchid Pune");
    fireEvent.click(screen.getByRole("button", { name: /all business units/i }));

    expect(mockPush).toHaveBeenCalledWith(
      { pathname: "/dashboard/admin/approvals" },
      undefined,
      { shallow: true }
    );
  });

  it("still renders the editor when the unit is not in the loaded list", async () => {
    // A deep link to a unit the admin can no longer see must not blank out.
    mockQuery = { companyId: "999", hotelId: "888" };
    render(<ApprovalsPage />);

    expect(await screen.findByText("Unit #888")).toBeInTheDocument();
    expect(screen.getByTestId("hierarchy-editor")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
  });
});
