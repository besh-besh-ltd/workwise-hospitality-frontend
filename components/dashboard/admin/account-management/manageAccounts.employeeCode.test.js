// The edit flow's hand-off: manage-accounts makes the save request, and a
// refusal about one field (an employee code another account already holds)
// must come back to the modal as `fieldErrors` so it can show the sentence
// under that field. EditAccountModal.employeeCode.test.js covers the modal's
// half; this covers the page's.
//
// The page's children are stubbed down to the one interaction under test.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/lib/otel", () => ({ __esModule: true, sendLog: jest.fn(), SeverityNumber: { ERROR: 17 } }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

const mockUpdate = jest.fn();
const mockGetUsers = jest.fn();
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  getCompanyUsersDetailed: (...args) => mockGetUsers(...args),
  updateUserAccount: (...args) => mockUpdate(...args),
  sendPasswordReset: jest.fn(),
}));
jest.mock("@/services/hospitality", () => ({
  __esModule: true,
  getHospitalityCompanies: jest.fn().mockResolvedValue({ data: [] }),
  getHospitalityHotels: jest.fn().mockResolvedValue({ data: [] }),
  mapHospitalityUsers: jest.fn(),
  deleteUserMapping: jest.fn(),
  getUserMappingsById: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getUserRoleScopes: jest.fn().mockResolvedValue({ data: { data: [] } }),
  getUserDepartments: jest.fn().mockResolvedValue({ data: { data: [] } }),
}));

const mockState = { userProfile: { id: 80002, is_hospitality: 1, company_id: 13 } };
jest.mock("react-redux", () => ({ useSelector: (fn) => fn(mockState) }));

jest.mock("./manage-accounts/StatsBar", () => ({ __esModule: true, default: () => null }));
jest.mock("./manage-accounts/UserFilters", () => ({ __esModule: true, default: () => null }));
jest.mock("./manage-accounts/AssignAccessModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/modal/CustomRolePermissionsModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/modal/ConfirmationModal", () => ({ __esModule: true, default: () => null }));
jest.mock("./manage-accounts/UserTable", () => ({
  __esModule: true,
  default: ({ users, onEdit }) =>
    users?.length ? <button onClick={() => onEdit(users[0])}>edit first</button> : null,
}));
// The modal reduced to "save this, and show me what came back".
const mockSaved = jest.fn();
jest.mock("./manage-accounts/EditAccountModal", () => ({
  __esModule: true,
  default: ({ isOpen, onSave }) =>
    isOpen ? (
      <button onClick={async () => mockSaved(await onSave({ id: 360, employee_code: "EMP0417" }))}>save</button>
    ) : null,
}));

import React from "react";
import { AxiosError } from "axios";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import ManageAccounts from "./manage-accounts";

const TAKEN = "Employee code EMP0417 is already used by Ravi, whose account is deactivated. Reactivate that account, or change its employee code first.";

const rejection = (status, data) => {
  const err = new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", {}, {});
  err.response = { status, data };
  return { message: err };
};

const openAndSave = async () => {
  fireEvent.click(await screen.findByText("edit first"));
  await act(async () => {
    fireEvent.click(await screen.findByText("save"));
  });
};

const ACCOUNT = { id: 360, name: "Ravi Menon", employee_code: "EMP0417", status: "active", role: 2 };

beforeEach(() => {
  mockGetUsers.mockReset().mockResolvedValue({
    status: 1,
    data: { users: [ACCOUNT], pagination: { total: 1 }, stats: {} },
  });
  mockUpdate.mockReset();
  mockSaved.mockReset();
  toast.error.mockReset();
});

it("hands an employee-code refusal back to the modal as a field error, and says it", async () => {
  mockUpdate.mockRejectedValue(
    rejection(409, { status: 0, code: "EMPLOYEE_CODE_TAKEN", field: "employee_code", message: TAKEN })
  );
  render(<ManageAccounts />);

  await openAndSave();

  await waitFor(() => expect(mockSaved).toHaveBeenCalledWith({ fieldErrors: { employee_code: TAKEN } }));
  expect(toast.error).toHaveBeenCalledWith(TAKEN);
});

it("hands back nothing for a refusal that names no field", async () => {
  mockUpdate.mockRejectedValue(rejection(400, { status: 0, message: "Something else went wrong." }));
  render(<ManageAccounts />);

  await openAndSave();

  await waitFor(() => expect(mockSaved).toHaveBeenCalledWith(undefined));
  expect(toast.error).toHaveBeenCalledWith("Something else went wrong.");
});
