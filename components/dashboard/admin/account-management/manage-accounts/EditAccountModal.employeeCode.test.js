/**
 * An employee code can belong to one live account only.
 *
 * Production, 2026-10-15: two accounts shared a buyer's code — his active
 * account and his old, deactivated one — and every login was checked against
 * the wrong one. The API now refuses a code another account holds (409,
 * `field: "employee_code"`). The admin has to see that sentence where they
 * typed the code, not only in a toast that disappears.
 *
 * The parent (manage-accounts.js) makes the request; it hands the field
 * errors back as the resolved value of `onSave`.
 */

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/rbac", () => ({ __esModule: true, getDepartments: jest.fn() }));
jest.mock("@/services/cms", () => ({
  __esModule: true,
  getCountryCodes: jest.fn(() =>
    Promise.resolve({ data: [{ id: 1, country_code: "IN", phone_code: "+91" }] })
  ),
}));
jest.mock("@/lib/otel", () => ({ __esModule: true, sendLog: jest.fn(), SeverityNumber: { ERROR: 17 } }));
jest.mock("@/components/hospitality/RoleScopeSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="role-scope-selector" />,
}));

import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import EditAccountModal from "./EditAccountModal";
import { getDepartments } from "@/services/rbac";

const TAKEN = "Employee code EMP0417 is already used by Ravi, whose account is deactivated. Reactivate that account, or change its employee code first.";

const account = {
  id: 360,
  name: "Test Account",
  email: "test.account@example.com",
  mobile: "+91-9000000001",
  employee_code: "EMP0001",
  status: "active",
  role: 2,
};

const renderModal = async (onSave) => {
  await act(async () => {
    render(
      <EditAccountModal
        isOpen
        onClose={jest.fn()}
        account={account}
        isHospitality
        initialRoleScopes={[]}
        userDepartments={[]}
        userMappings={[]}
        dataStatus="ready"
        onRetryLoad={jest.fn()}
        onSave={onSave}
      />
    );
  });
};

const codeInput = () => document.querySelector('input[name="employee_code"]');
const typeCode = (value) => fireEvent.change(codeInput(), { target: { value } });
const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /update account/i }));
  });

beforeEach(() => {
  getDepartments.mockReset();
  getDepartments.mockResolvedValue({ data: { data: [] } });
});

describe("<EditAccountModal> when the employee code is taken", () => {
  it("shows the server's sentence under the Employee Code field", async () => {
    const onSave = jest.fn().mockResolvedValue({ fieldErrors: { employee_code: TAKEN } });
    await renderModal(onSave);

    typeCode("EMP0417");
    await submit();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(await screen.findByText(TAKEN)).toBeInTheDocument();
    expect(codeInput()).toHaveClass("is-invalid");
  });

  it("clears the sentence once the admin changes the code", async () => {
    await renderModal(jest.fn().mockResolvedValue({ fieldErrors: { employee_code: TAKEN } }));
    typeCode("EMP0417");
    await submit();
    expect(await screen.findByText(TAKEN)).toBeInTheDocument();

    await act(async () => typeCode("EMP0418"));

    await waitFor(() => expect(screen.queryByText(TAKEN)).not.toBeInTheDocument());
  });

  it("shows nothing extra when the save succeeds", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    await renderModal(onSave);

    typeCode("EMP0499");
    await submit();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].employee_code).toBe("EMP0499");
    expect(codeInput()).not.toHaveClass("is-invalid");
  });
});
