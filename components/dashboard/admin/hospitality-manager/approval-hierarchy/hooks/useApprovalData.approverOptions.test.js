// Role picker offers only roles that can approve the stage being configured.
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/services/approval", () => ({
  getApprovalPolicies: jest.fn().mockResolvedValue({ data: [] }),
  deleteApprovalPolicy: jest.fn(),
  getDepartmentSubGraphPreview: jest.fn(),
}));
jest.mock("@/services/rbac", () => ({
  getRoles: jest.fn(),
  getBatchUserRoleScopes: jest.fn().mockResolvedValue({ data: {} }),
  getBatchUserDepartments: jest.fn().mockResolvedValue({ data: {} }),
  getDepartments: jest.fn().mockResolvedValue({ data: [] }),
}));
jest.mock("@/services/hospitality", () => ({
  getCompanyUserMappings: jest.fn().mockResolvedValue({ data: [] }),
  getHospitalityHotels: jest.fn().mockResolvedValue({ data: [] }),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { getRoles } from "@/services/rbac";
import useApprovalData from "./useApprovalData";

const load = async (roles) => {
  getRoles.mockResolvedValue({ data: { data: roles } });
  const hook = renderHook(() => useApprovalData(1, 2));
  await waitFor(() => expect(hook.result.current.roles).toHaveLength(roles.length));
  return hook.result.current;
};

describe("getApproverOptions for ROLE", () => {
  const ROLES = [
    { id: 1, title: "RFQ Creator", approvable_entity_types: [], performs_entity_types: ["RFQ"] },
    { id: 2, title: "RFQ Approver", approvable_entity_types: ["RFQ", "TENDER"], performs_entity_types: [] },
  ];

  it("disables roles that cannot approve the stage, with a reason", async () => {
    const api = await load(ROLES);
    const opts = api.getApproverOptions("ROLE", null, null, "RFQ");
    const creator = opts.find((o) => o.label === "RFQ Creator");
    const approver = opts.find((o) => o.label === "RFQ Approver");
    expect(creator.isDisabled).toBe(true);
    expect(creator.reason).toBe("RFQ Creator can't approve RFQ Approval");
    expect(approver.isDisabled).toBe(false);
  });

  it("disables nothing when no stage is given", async () => {
    const api = await load(ROLES);
    expect(api.getApproverOptions("ROLE", null).every((o) => !o.isDisabled)).toBe(true);
  });

  it("disables nothing when the backend does not send approvable_entity_types", async () => {
    const api = await load([{ id: 1, title: "RFQ Creator" }]);
    expect(api.getApproverOptions("ROLE", null, null, "RFQ")[0].isDisabled).toBeFalsy();
  });
});
