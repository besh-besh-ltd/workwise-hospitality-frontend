// The real SideNav and MobileNav, mounted the way DashboardShell mounts them
// (MobileNav is always in the tree, its drawer closed). Before the provider
// each ran its own 5 s poll, so every dashboard page made two identical
// approval-count requests every 5 seconds. Now: one request, shared.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({ getPendingApprovalCounts: jest.fn() }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: {
    getStorage: jest.fn((key) => (key === "token" ? "t" : key === "current-user-type" ? "buyer" : null)),
    setStorage: jest.fn(),
  },
}));
jest.mock("@/utils/hospitalityContext", () => ({
  getStoredHospitalityContext: jest.fn(() => null),
  subscribeHospitalityContext: jest.fn(() => () => {}),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    pathname: "/dashboard/buyer",
    query: {},
    push: jest.fn(),
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (sel) => sel({ userProfile: { is_hospitality: 1 } }),
}));

import React from "react";
import { render, act } from "@testing-library/react";
import { getPendingApprovalCounts } from "@/services/approval";
import { ApprovalIndicatorsProvider } from "@/hooks/usePendingApprovalIndicators";
import { __setRealtimeLoaderForTests, __emitRealtimeForTests } from "@/lib/realtimeSocket";
import SideNav from "./SideNav";
import MobileNav from "./MobileNav";

__setRealtimeLoaderForTests(() => new Promise(() => {}));

const user = { name: "Asha Menon" };

beforeEach(() => {
  jest.useFakeTimers();
  getPendingApprovalCounts.mockReset();
  getPendingApprovalCounts.mockResolvedValue({ data: [{ entity_type: "PO", count: "3" }] });
});
afterEach(() => jest.useRealTimers());

test("SideNav + closed MobileNav make one approval-count request, not two per 5 s", async () => {
  render(
    <ApprovalIndicatorsProvider enabled>
      <SideNav user={user} currentUserType="buyer" />
      <MobileNav open={false} onClose={() => {}} user={user} currentUserType="buyer" />
    </ApprovalIndicatorsProvider>
  );
  await act(async () => {});
  expect(getPendingApprovalCounts).toHaveBeenCalledTimes(1);

  // A minute of the old behaviour was 2 x 12 = 24 requests.
  await act(async () => { jest.advanceTimersByTime(53000); });
  expect(getPendingApprovalCounts).toHaveBeenCalledTimes(1);

  await act(async () => {
    __emitRealtimeForTests("approval:changed", { entity_type: "PO", entity_id: 1 });
  });
  expect(getPendingApprovalCounts).toHaveBeenCalledTimes(2);
});
