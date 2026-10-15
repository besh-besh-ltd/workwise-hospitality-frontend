/**
 * The self-profile page must not corrupt the mobile it is showing.
 *
 * This page is where the admin-edit failure started. It split the stored
 * mobile on "-", so a bulk-imported bare "9876500001" became country code
 * "9876500001" with a blank number field. The form had no validation, so
 * saving — to change a name, say — wrote "9876500001-". Two months later an
 * admin's edit of that account failed with "An internal error has occurred".
 *
 * This page had no tests at all.
 */

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => jest.fn() }));
jest.mock("@/redux/slice", () => ({ __esModule: true, setUserProfile: (x) => ({ type: "x", payload: x }) }));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));
jest.mock("@/components/modal/LocationModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/services/hospitality", () => ({ __esModule: true, getMyHospitalityContexts: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/services/cms", () => ({
  __esModule: true,
  getCountries: jest.fn(() => Promise.resolve({ data: [] })),
  getStates: jest.fn(() => Promise.resolve({ data: [] })),
  getCities: jest.fn(() => Promise.resolve({ data: [] })),
  getCountryCodes: jest.fn(() =>
    Promise.resolve({ data: [{ id: 1, country_code: "IN", phone_code: "+91" }] })
  ),
}));
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  getProfile: jest.fn(),
  updateProfile: jest.fn(() => Promise.resolve({ message: "Profile updated" })),
  createVendorLocation: jest.fn(),
  deleteVendorLocation: jest.fn(),
  getVendorlocations: jest.fn(() => Promise.resolve({ data: [] })),
  handleChangeProfilePicture: jest.fn(),
  updatecompany: jest.fn(),
  updateVendorlocations: jest.fn(),
}));

import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import EditProfile from "./editprofile";
import { getProfile, updateProfile } from "@/services/Auth";

const renderWithStoredMobile = async (mobile) => {
  getProfile.mockResolvedValue({
    data: { id: 9001, name: "Test Account", email: "test.account@example.com", mobile, user_type: 2 },
  });
  await act(async () => {
    render(<EditProfile />);
  });
  await waitFor(() => expect(document.querySelector('input[name="mobile"]')).toBeInTheDocument());
};

const numberField = () => document.querySelector('input[name="mobile"]');
const saveContact = () =>
  act(async () => {
    fireEvent.click(document.getElementById("save_contact_details-contact_details-edit_profile_page"));
  });

beforeEach(() => updateProfile.mockClear());

describe("self-profile contact details", () => {
  it("reads a bare bulk-imported number into the number field — not into the country code", async () => {
    await renderWithStoredMobile("9876500001");

    expect(numberField()).toHaveValue(9876500001);
  });

  it("saves it back canonical, never as '9876500001-' — the value that broke the admin edit", async () => {
    await renderWithStoredMobile("9876500001");

    await saveContact();

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile.mock.calls[0][0].mobile).toBe("+91-9876500001");
  });

  it("refuses to save with the number left blank", async () => {
    await renderWithStoredMobile("+91-9876500001");

    fireEvent.change(numberField(), { target: { value: "" } });
    await saveContact();

    expect(await screen.findByText(/mobile number is required/i)).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
