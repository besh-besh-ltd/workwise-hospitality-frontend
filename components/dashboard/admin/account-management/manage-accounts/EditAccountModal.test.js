/**
 * The Edit Account modal must never reach a submittable state on data it does
 * not have.
 *
 * `roles: []` / `department_ids: []` mean "delete every one of this user's
 * grants" to the API. The modal used to open before its fetches resolved and
 * seeded itself from empty arrays, so an admin who saved early — or whose
 * request failed (both fetches swallowed errors with `.catch(() => [])`) —
 * silently wiped the user's entire access.
 */

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/rbac", () => ({
  __esModule: true,
  getDepartments: jest.fn(),
}));
jest.mock("@/lib/otel", () => ({
  __esModule: true,
  sendLog: jest.fn(),
  SeverityNumber: { ERROR: 17 },
}));
// Stub the selector but keep its removal callback reachable, so a test can
// act out "the admin deleted the last role" without driving the real widget.
jest.mock("@/components/hospitality/RoleScopeSelector", () => ({
  __esModule: true,
  default: ({ existingRoles, onRemoveRole }) => (
    <div data-testid="role-scope-selector">
      {(existingRoles || []).map((_, i) => (
        <button key={i} type="button" onClick={() => onRemoveRole(i)}>
          remove role {i}
        </button>
      ))}
    </div>
  ),
}));

import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import EditAccountModal from "./EditAccountModal";
import { getDepartments } from "@/services/rbac";
import { sendLog } from "@/lib/otel";

const ACCOUNT = {
  id: 127,
  name: "Varun Sahani",
  email: "varun@test.local",
  mobile: "+91-9000000001",
  status: "active",
  role: 2,
};

const renderModal = async (props = {}) => {
  let utils;
  await act(async () => {
    utils = render(
      <EditAccountModal
        isOpen
        onClose={jest.fn()}
        account={ACCOUNT}
        isHospitality
        roleOptions={[]}
        initialRoleScopes={[]}
        userDepartments={[]}
        userMappings={[]}
        dataStatus="ready"
        onRetryLoad={jest.fn()}
        onSave={jest.fn()}
        {...props}
      />
    );
  });
  return utils;
};

const submitButton = () => screen.getByRole("button", { name: /update account|loading/i });

beforeEach(() => {
  getDepartments.mockReset();
  getDepartments.mockResolvedValue({ data: { data: [{ id: 1, title: "Procurement" }] } });
  sendLog.mockReset();
});

describe("<EditAccountModal> load gating", () => {
  it("cannot be submitted while the account's roles are still loading", async () => {
    const onSave = jest.fn();
    await renderModal({ dataStatus: "loading", initialRoleScopes: null, onSave });

    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(/loading roles and departments/i)).toBeInTheDocument();

    fireEvent.submit(submitButton().closest("form"));
    await waitFor(() => expect(onSave).not.toHaveBeenCalled());
  });

  it("shows an error with a retry instead of an empty form when a fetch fails", async () => {
    const onRetryLoad = jest.fn();
    const onSave = jest.fn();
    await renderModal({ dataStatus: "error", initialRoleScopes: null, onRetryLoad, onSave });

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this account's roles/i);
    expect(submitButton()).toBeDisabled();

    fireEvent.submit(submitButton().closest("form"));
    await waitFor(() => expect(onSave).not.toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    });
    expect(onRetryLoad).toHaveBeenCalled();
  });

  it("surfaces a failed department-options fetch rather than an empty picker", async () => {
    getDepartments.mockRejectedValue(new Error("boom"));
    await renderModal();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(sendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ "log.source": "getDepartments" }),
      })
    );
  });

  it("submits once the data has loaded", async () => {
    const onSave = jest.fn();
    await renderModal({ initialRoleScopes: [], onSave });

    expect(submitButton()).toBeEnabled();
    await act(async () => {
      fireEvent.submit(submitButton().closest("form"));
    });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });
});

describe("<EditAccountModal> wipe-intent signalling", () => {
  it("omits `roles` entirely when the scopes were never fetched", async () => {
    const onSave = jest.fn();
    // isHospitality=false → the parent never fetches role scopes, so it passes
    // null. Sending `roles: []` here would delete grants this screen never saw.
    await renderModal({ isHospitality: false, initialRoleScopes: null, onSave });

    await act(async () => {
      fireEvent.submit(submitButton().closest("form"));
    });

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload).not.toHaveProperty("roles");
    expect(payload).not.toHaveProperty("confirm_clear_all_scopes");
  });

  it("does not claim clear-intent when nothing was there to clear", async () => {
    const onSave = jest.fn();
    await renderModal({ initialRoleScopes: [], userDepartments: [], onSave });

    await act(async () => {
      fireEvent.submit(submitButton().closest("form"));
    });

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.roles).toEqual([]);
    expect(payload).not.toHaveProperty("confirm_clear_all_scopes");
  });

  it("claims clear-intent when a loaded, non-empty role list was emptied", async () => {
    const onSave = jest.fn();
    // The parent loaded one scope and the admin then removed it — the
    // legitimate "last role removed" case, which must still go through.
    await renderModal({
      initialRoleScopes: [{ role_id: 13, company_id: 5, hotel_id: 7 }],
      userDepartments: [],
      onSave,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /remove role 0/i }));
    });

    await act(async () => {
      fireEvent.submit(submitButton().closest("form"));
    });

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.roles).toEqual([]);
    expect(payload.confirm_clear_all_scopes).toBe(true);
  });
});
