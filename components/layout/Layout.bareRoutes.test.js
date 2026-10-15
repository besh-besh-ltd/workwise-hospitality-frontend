// The vendor-network invitation page is a standalone task with its own brand
// frame: the layout must not wrap it in the public site header, which renders
// unstyled there and overlaps the card. Other public pages keep the header.

let mockPathname = "/vendor/network/accept-invite";
jest.mock("@/redux/store", () => ({ __esModule: true, store: { getState: () => ({ userProfile: null }) } }));
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => jest.fn() }));
jest.mock("@/utils/guestSession", () => ({ __esModule: true, isGuestSession: () => false }));
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardReload: jest.fn(), hardNavigate: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: mockPathname, asPath: mockPathname, query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
jest.mock("./Header", () => ({ __esModule: true, default: () => <div data-testid="site-header" /> }));
jest.mock("./DashboardShell", () => ({ __esModule: true, default: ({ children }) => children }));
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
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Layout from "./index";

test("the network invitation page renders without the site header", () => {
  mockPathname = "/vendor/network/accept-invite";
  render(<Layout><div data-testid="page" /></Layout>);
  expect(screen.getByTestId("page")).toBeInTheDocument();
  expect(screen.queryByTestId("site-header")).toBeNull();
});

test("other public pages keep the site header", () => {
  mockPathname = "/for-vendors";
  render(<Layout><div data-testid="page" /></Layout>);
  expect(screen.getByTestId("site-header")).toBeInTheDocument();
});
