// HN-1 — the selection survives the round trip through Approval Hierarchy.
//
// Ashlesha's report was that pressing Back after setting a unit's hierarchy
// threw the admin onto the default landing page instead of the business units
// under the company they had been in.
//
// The cause was not the Back button. Setting a hierarchy navigates to another
// page; its Back calls router.back(), which remounts this screen — and the
// selected company lived in useState, so every remount started from null. The
// fix is to keep the selection in the URL, which also makes the view linkable.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockQuery = {};
jest.mock("next/router", () => ({
  useRouter: () => ({
    query: mockQuery,
    pathname: "/dashboard/admin/hospitality-manager",
    replace: mockReplace,
    push: mockPush,
    back: jest.fn(),
  }),
}));

const COMPANIES = [
  { id: 10001, name: "Kamat Hotels", hotels: [{ id: 10101, name: "The Orchid Pune" }] },
  { id: 10002, name: "Envotel", hotels: [{ id: 10104, name: "Envotel Nashik" }] },
];

jest.mock("@/services/hospitality", () => ({
  getHospitalityCompanies: jest.fn(() => Promise.resolve({ data: COMPANIES })),
  getCompanyUserMappings: jest.fn(() => Promise.resolve({ data: [] })),
  createHospitalityCompany: jest.fn(),
  createHospitalityHotel: jest.fn(),
  createHOBusinessUnit: jest.fn(),
  updateHospitalityHotel: jest.fn(),
  getHotelDocuments: jest.fn(() => Promise.resolve({ data: [] })),
  deleteUserMapping: jest.fn(),
  sendBUCredentials: jest.fn(),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import HospitalityManager from "./HospitalityManager";

beforeEach(() => {
  mockReplace.mockReset();
  mockPush.mockReset();
  mockQuery = {};
});

describe("where the selection lives", () => {
  it("opens on the company the URL names, not on the first one", async () => {
    // This is the whole fix: a remount — which is what Back produces — must
    // land on the company that was being worked on.
    mockQuery = { companyId: "10002" };
    render(<HospitalityManager />);

    await waitFor(() => expect(screen.getByText("Envotel")).toBeInTheDocument());
    // And it must not overwrite that choice with the default, which is the
    // exact failure Ashlesha reported.
    expect(
      mockReplace.mock.calls.some(([arg]) => String(arg?.query?.companyId) === "10001")
    ).toBe(false);
  });

  it("falls back to the first company only when the URL names none", async () => {
    render(<HospitalityManager />);
    await waitFor(() =>
      expect(
        mockReplace.mock.calls.some(([arg]) => String(arg?.query?.companyId) === "10001")
      ).toBe(true)
    );
  });

  it("falls back when the URL names a company that no longer exists", async () => {
    mockQuery = { companyId: "999999" };
    render(<HospitalityManager />);
    await waitFor(() =>
      expect(
        mockReplace.mock.calls.some(([arg]) => String(arg?.query?.companyId) === "10001")
      ).toBe(true)
    );
  });

  it("writes a tab change to the URL rather than to component state", async () => {
    // Same fix, same reason: the round trip through Approval Hierarchy must
    // not silently drop you back onto a different tab.
    mockQuery = { companyId: "10001" };
    render(<HospitalityManager />);
    const peopleTab = await screen.findByRole("button", { name: /^People/ });

    fireEvent.click(peopleTab);
    await waitFor(() =>
      expect(mockReplace.mock.calls.some(([arg]) => arg?.query?.tab === "users")).toBe(true)
    );
  });

  it("replaces rather than pushes, so Back leaves the screen", async () => {
    // Changing a tab is not a place anyone should have to press Back through.
    // Back is reserved for leaving, which is the point of HN-1.
    mockQuery = { companyId: "10001" };
    render(<HospitalityManager />);
    const peopleTab = await screen.findByRole("button", { name: /^People/ });

    fireEvent.click(peopleTab);
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("opens on the tab the URL names", async () => {
    mockQuery = { companyId: "10001", tab: "users" };
    render(<HospitalityManager />);
    // The People tab's own heading renders only when that tab is active, so
    // two "People" means the tab button plus the panel it opened.
    await waitFor(() => expect(screen.getAllByText("People").length).toBeGreaterThan(1));
  });

  it("keeps the company when only the tab changes", async () => {
    mockQuery = { companyId: "10002", tab: "hotels" };
    render(<HospitalityManager />);
    const peopleTab = await screen.findByRole("button", { name: /^People/ });

    fireEvent.click(peopleTab);
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const last = mockReplace.mock.calls.at(-1)[0];
    expect(String(last.query.companyId)).toBe("10002");
  });
});
