// Creating an account on an employee code somebody already holds.
//
// Production, 2026-10-13: an administrator created a new starter on a departed
// employee's code, and nothing objected — the create screen checked email and
// mobile but not the code. Two days later a different pair of accounts sharing
// a code left a buyer unable to log in after seven password resets. The API
// now refuses the code (409, `field: "employee_code"`); this page has to put
// that sentence under the field the admin typed it into.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockCreate = jest.fn();
jest.mock("@/services/Auth", () => ({
  createBuyerCompanyUser: (...args) => mockCreate(...args),
  checkIdentity: jest.fn().mockResolvedValue({ data: { email: { taken: false }, mobile: { taken: false } } }),
}));
jest.mock("@/services/rbac", () => ({
  getDepartments: jest.fn().mockResolvedValue({ data: { data: [{ id: 1, title: "Procurement" }] } }),
}));
jest.mock("@/services/hospitality", () => ({
  getHospitalityCompanies: jest.fn().mockResolvedValue({ data: [] }),
  getHospitalityHotels: jest.fn().mockResolvedValue({ data: [] }),
  getHospitalityEntities: jest.fn().mockResolvedValue({ data: [] }),
  getUserMappingsById: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock("@/services/cms", () => ({
  __esModule: true,
  getCountryCodes: jest.fn(() => Promise.resolve({ data: [{ id: 1, country_code: "IN", phone_code: "+91" }] })),
}));
const mockPush = jest.fn();
jest.mock("next/router", () => ({ useRouter: () => ({ push: mockPush, query: {} }) }));
// One state object for the whole run: the page re-fetches whenever `userProfile`
// changes identity, so a fresh object per render would re-fetch forever.
const mockReduxState = { userProfile: { is_hospitality: 1, id: 80002 } };
jest.mock("react-redux", () => ({
  useSelector: (fn) => fn(mockReduxState),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

import React from "react";
import { AxiosError } from "axios";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import CreateAccountPage from "./create-account";

const TAKEN = "Employee code EMP0417 is already used by Ravi Menon.";

// What services/*.js rejects with: the AxiosError wrapped as { message: error }.
const rejection = (status, data) => {
  const err = new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", {}, {});
  err.response = { status, data };
  return { message: err };
};

const field = (name) => document.querySelector(`[name="${name}"]`);
const type = (name, value) => fireEvent.change(field(name), { target: { value } });

const pick = async (selectId, optionText) => {
  const input = document.getElementById(selectId).querySelector("input");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.click(await screen.findByText(optionText));
};

const fillValidForm = async (code) => {
  await screen.findByText("Team member");
  type("name", "New Starter");
  type("email", "new.starter@example.com");
  type("mobile", "9876543210");
  await pick("department_id", "Procurement");
  await pick("employee_type", "Full Time");
  type("employee_code", code);
  type("password", "Str0ng!Pass1");
  type("confirmPassword", "Str0ng!Pass1");
};

const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
  });

jest.setTimeout(15000);

beforeEach(() => {
  mockCreate.mockReset();
  mockPush.mockReset();
  toast.error.mockReset();
});

describe("creating an account whose employee code is taken", () => {
  it("puts the server's sentence under the Employee Code field and stays on the page", async () => {
    mockCreate.mockRejectedValue(
      rejection(409, { status: 0, code: "EMPLOYEE_CODE_TAKEN", field: "employee_code", message: TAKEN })
    );
    render(<CreateAccountPage />);
    await fillValidForm("EMP0417");

    await submit();

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(await screen.findByText(TAKEN)).toBeInTheDocument();
    expect(field("employee_code")).toHaveClass("is-invalid");
    expect(mockPush).not.toHaveBeenCalled();
    // Said once as a toast too — the field may be scrolled out of view.
    expect(toast.error).toHaveBeenCalledWith(TAKEN);
  });

  it("still only toasts a refusal that names no field", async () => {
    mockCreate.mockRejectedValue(rejection(400, { status: 0, message: "Something else went wrong." }));
    render(<CreateAccountPage />);
    await fillValidForm("EMP0499");

    await submit();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something else went wrong."));
    expect(field("employee_code")).not.toHaveClass("is-invalid");
  });

  it("goes back to the list when the account is created", async () => {
    mockCreate.mockResolvedValue({ status: 1 });
    render(<CreateAccountPage />);
    await fillValidForm("EMP0499");

    await submit();

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][0].employee_code).toBe("EMP0499");
  });
});
