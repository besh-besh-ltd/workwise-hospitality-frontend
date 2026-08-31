// Choosing an account type, and what that choice is allowed to mean (T0).
//
// This form used to hardcode user_type: "2", and that hardcode was the only
// thing standing between a company admin and a cross-tenant super admin —
// the endpoint accepted any value with no validation at all. The hole is
// closed server-side, which is what makes offering the choice safe at all.
//
// The choice is described by what it lets someone do. A role name on its own
// tells an admin nothing about the blast radius of what they are granting,
// which is the point Stripe's "can do / can't do" role copy makes.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockCreate = jest.fn();
jest.mock("@/services/Auth", () => ({
  createBuyerCompanyUser: (...args) => mockCreate(...args),
  checkIdentity: jest.fn().mockResolvedValue({ data: { email: { taken: false }, mobile: { taken: false } } }),
}));
jest.mock("@/services/rbac", () => ({ getDepartments: jest.fn().mockResolvedValue({ data: { data: [] } }) }));
jest.mock("@/services/hospitality", () => ({
  getHospitalityCompanies: jest.fn().mockResolvedValue({ data: [] }),
  getHospitalityHotels: jest.fn().mockResolvedValue({ data: [] }),
  getHospitalityEntities: jest.fn().mockResolvedValue({ data: [] }),
  getUserMappingsById: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock("next/router", () => ({ useRouter: () => ({ push: jest.fn(), query: {} }) }));
jest.mock("react-redux", () => ({
  useSelector: (fn) => fn({ userProfile: { is_hospitality: 1, id: 80002 } }),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateAccountPage from "./create-account";

beforeEach(() => mockCreate.mockReset().mockResolvedValue({ status: 1 }));

describe("account type", () => {
  it("offers exactly two kinds, and no more", async () => {
    render(<CreateAccountPage />);
    expect(await screen.findByText("Team member")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    // Vendor and super admin are not offerable from here. The endpoint refuses
    // them; the form should not imply otherwise.
    expect(screen.queryByText(/vendor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/super admin/i)).not.toBeInTheDocument();
  });

  it("starts on the ordinary choice", async () => {
    render(<CreateAccountPage />);
    const radios = await screen.findAllByRole("radio");
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
  });

  it("says what each type can actually do", async () => {
    // A name alone does not tell an admin what they are granting.
    render(<CreateAccountPage />);
    expect(await screen.findByText(/raises and works on rfqs/i)).toBeInTheDocument();
    expect(screen.getByText(/managing people, business units, roles and approval workflows/i)).toBeInTheDocument();
  });

  it("warns only when administrator is chosen", async () => {
    render(<CreateAccountPage />);
    const warning = /can change who approves spend/i;
    expect(screen.queryByText(warning)).not.toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("radio"))[1]);
    expect(screen.getByText(warning)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });
});
