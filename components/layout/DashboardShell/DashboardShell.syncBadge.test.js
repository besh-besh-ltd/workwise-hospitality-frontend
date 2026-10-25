// The inventory offline-sync chip is mounted by the shell on every page of a
// signed-in non-vendor session (queued scans keep sending after the user
// leaves the scan screen), before
// the page content. Rails, top bar and data hooks are stubbed; the chip
// itself (next/dynamic) is a marker.
let mockPathname = "/dashboard/buyer/inventory/out";
let mockUserType = "buyer";

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: mockPathname, query: {}, push: jest.fn(), events: { on: jest.fn(), off: jest.fn() } }),
}));
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => function SyncBadgeMarker() {
    return <div data-testid="pending-sync-badge" />;
  },
}));
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => jest.fn() }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { reset: jest.fn() } }));
jest.mock("@/redux/slice", () => ({ __esModule: true, clearUserProfile: jest.fn() }));
jest.mock("@/services/Auth", () => ({ __esModule: true, getUserDetails: () => ({ name: "Asha Menon" }) }));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { getStorage: (key) => (key === "current-user-type" ? mockUserType : null), removeStorege: jest.fn() },
}));
jest.mock("@/utils/hospitalityContext", () => ({ __esModule: true, setStoredHospitalityContext: jest.fn() }));
jest.mock("@/components/modal/ConfirmationModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/hooks/usePendingApprovalIndicators", () => ({
  __esModule: true,
  ApprovalIndicatorsProvider: ({ children }) => <>{children}</>,
}));
jest.mock("@/hooks/useNavPermissions", () => ({ __esModule: true, default: () => null }));
jest.mock("./SideNav", () => ({ __esModule: true, default: () => null }));
jest.mock("./TopBar", () => ({ __esModule: true, default: () => null }));
jest.mock("./MobileNav", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DashboardShell from "./DashboardShell";

const mount = () => render(<DashboardShell><p>page</p></DashboardShell>);

beforeEach(() => {
  mockPathname = "/dashboard/buyer/inventory/out";
  mockUserType = "buyer";
});

it("mounts the sync chip on an inventory route, before the page content", async () => {
  mount();
  const chip = await screen.findByTestId("pending-sync-badge");
  const page = screen.getByText("page");
  expect(chip.compareDocumentPosition(page) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("mounts it on other buyer pages too", async () => {
  mockPathname = "/dashboard/buyer/purchase-orders";
  mount();
  expect(await screen.findByTestId("pending-sync-badge")).toBeInTheDocument();
});

it.each(["admin", "management", "engineering", "finance", "other"])(
  "mounts it for a signed-in %s session too (they reach inventory as well)",
  async (type) => {
    mockUserType = type;
    mount();
    expect(await screen.findByTestId("pending-sync-badge")).toBeInTheDocument();
  }
);

it("leaves it out for a vendor", async () => {
  mockUserType = "vendor";
  mount();
  await screen.findByText("page");
  expect(screen.queryByTestId("pending-sync-badge")).not.toBeInTheDocument();
});
