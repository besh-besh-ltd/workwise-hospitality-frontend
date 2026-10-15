// The dashboard layout mounts RateContractGuestGate around every logged-in page (Task 26):
// once a rate-contract request was refused to an emailed-link guest session, a
// rate-contract page shows the sign-in notice instead of itself.

let mockPathname = "/dashboard/vendor/rate-contracts/active";
jest.mock("@/redux/store", () => ({ __esModule: true, store: { getState: () => ({ userProfile: null }) }, persistor: { flush: jest.fn() } }));
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => jest.fn() }));
jest.mock("@/utils/guestSession", () => ({ __esModule: true, isGuestSession: () => true }));
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardReload: jest.fn(), hardNavigate: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: mockPathname, asPath: mockPathname, query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
jest.mock("./Header", () => ({ __esModule: true, default: () => <div data-testid="site-header" /> }));
jest.mock("./DashboardShell", () => ({ __esModule: true, default: ({ children }) => <div data-testid="shell">{children}</div> }));
jest.mock("@/components/shared/GuestAccessModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/PushPermissionPrompt", () => ({ __esModule: true, default: () => null }));
jest.mock("@/services/cms", () => ({ __esModule: true, getCmsData: jest.fn() }));
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  SWSubscribe: jest.fn(),
  verifyVendorToken: jest.fn(),
  getProfile: jest.fn(),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { error: jest.fn(), success: jest.fn() } }));

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { noteArcGuestRefusal, clearArcGuestRefusal } from "@/utils/arcGuestRefusal";
import Layout from "./index";

beforeEach(() => {
  clearArcGuestRefusal();
  window.localStorage.setItem("token", "guest.jwt.token");
});
afterEach(() => window.localStorage.clear());

test("a guest refusal replaces a rate-contract page inside the dashboard shell", async () => {
  mockPathname = "/dashboard/vendor/rate-contracts/active";
  render(<Layout><div data-testid="page">No active contracts</div></Layout>);
  expect(await screen.findByTestId("shell")).toBeInTheDocument();
  expect(screen.getByTestId("page")).toBeInTheDocument();

  act(() => {
    noteArcGuestRefusal({ response: { status: 403, data: { reason: "GUEST_SESSION" } } });
  });
  expect(screen.queryByTestId("page")).toBeNull();
  expect(screen.getByRole("region", { name: "Sign in to open rate contracts" })).toBeInTheDocument();
});

test("other dashboard pages are untouched", async () => {
  mockPathname = "/dashboard/vendor/network/assigned";
  noteArcGuestRefusal({ response: { status: 403, data: { reason: "GUEST_SESSION" } } });
  render(<Layout><div data-testid="page" /></Layout>);
  expect(await screen.findByTestId("shell")).toBeInTheDocument();
  expect(screen.getByTestId("page")).toBeInTheDocument();
});
