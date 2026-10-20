// The final-vendor stage has one name everywhere: "Final Vendor Approval".
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import { LIFECYCLE_CONFIG } from "./RFQCard/statusConfig";
import { getResourceLabel } from "@/components/dashboard/admin/shared/permissionLabels";

test("the QUOTATION_APPROVAL lifecycle stage reads Final Vendor Approval", () => {
  expect(LIFECYCLE_CONFIG.QUOTATION_APPROVAL.label).toBe("Final Vendor Approval");
  expect(LIFECYCLE_CONFIG.QUOTATION_APPROVAL.shortLabel).toBe("Final Vendor Approval");
});

test("the ARC permission resource is not called Unit ARC (it also governs Group ARC)", () => {
  expect(getResourceLabel("ARC")).toBe("Annual Rate Contracts");
});
