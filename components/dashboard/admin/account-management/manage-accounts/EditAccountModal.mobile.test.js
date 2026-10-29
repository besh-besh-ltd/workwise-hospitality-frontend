/**
 * Editing a user must not be broken by the shape of the mobile already on file.
 *
 * Reported 2026-10-13: an admin changing a user's employee ID and contact
 * number got "An internal error has occurred". The user's stored mobile was
 * "9876500001-" (a bare bulk-imported number the self-profile page had saved
 * with a blank number field). This modal split it on "-", took the NUMBER as
 * the country code and showed a blank number field — while the country picker,
 * which had no such option, quietly displayed a valid-looking code. The admin
 * typed the number in, and the save sent "9876500001-9876500001": 21
 * characters into a varchar(15) column.
 *
 * The existing modal tests could not see this: their one fixture is the
 * well-formed "+91-9000000001".
 */

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/rbac", () => ({ __esModule: true, getDepartments: jest.fn() }));
jest.mock("@/services/cms", () => ({
  __esModule: true,
  getCountryCodes: jest.fn(() =>
    Promise.resolve({
      data: [
        { id: 1, country_code: "IN", phone_code: "+91" },
        { id: 2, country_code: "US", phone_code: "+1" },
      ],
    })
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

const accountWith = (mobile) => ({
  id: 347,
  name: "Test Account",
  email: "test.account@example.com",
  mobile,
  employee_code: "EMP0001",
  status: "active",
  role: 2,
});

const renderModal = async (mobile, onSave = jest.fn()) => {
  await act(async () => {
    render(
      <EditAccountModal
        isOpen
        onClose={jest.fn()}
        account={accountWith(mobile)}
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
  return onSave;
};

const numberField = () => document.querySelector('input[name="mobile"]');
const codeField = () => document.querySelector('select[name="countryCode"]');
const submit = () =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /update account/i }));
  });

beforeEach(() => {
  getDepartments.mockReset();
  getDepartments.mockResolvedValue({ data: { data: [] } });
});

describe("<EditAccountModal> with a legacy-shaped mobile on file", () => {
  it("shows the number in the number field, not as the country code — the production case", async () => {
    await renderModal("9876500001-");

    expect(numberField()).toHaveValue(9876500001);
    expect(codeField()).toHaveValue("+91");
  });

  it("saves the canonical form when the admin changes only the employee ID", async () => {
    const onSave = await renderModal("9876500001-");

    fireEvent.change(document.querySelector('input[name="employee_code"]'), {
      target: { value: "EMP0002" },
    });
    await submit();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.mobile).toBe("+91-9876500001");
    expect(payload.employee_code).toBe("EMP0002");
  });

  it.each([
    ["a bare bulk-imported number", "9876500001", "+91-9876500001"],
    ["a space-formatted number", "+91-98765 00001", "+91-9876500001"],
    ["a well-formed number (unchanged)", "+91-9000000001", "+91-9000000001"],
    ["a non-Indian number (unchanged)", "+1-9540095143", "+1-9540095143"],
  ])("round-trips %s to a value the column can hold", async (_label, stored, expected) => {
    const onSave = await renderModal(stored);

    await submit();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const { mobile } = onSave.mock.calls[0][0];
    expect(mobile).toBe(expected);
    expect(mobile.length).toBeLessThanOrEqual(15);
  });

  it("blocks a number too long for the column instead of sending it", async () => {
    const onSave = await renderModal("+91-9876500001");

    fireEvent.change(numberField(), { target: { value: "123456789012" } }); // 12 digits → 16 chars
    await submit();

    expect(await screen.findByText(/cannot exceed 11 digits/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
