// The vendor-network invitation page is a standalone task with its own brand
// frame: the layout must not wrap it in the public site header, which renders
// unstyled there and overlaps the card. Other public pages keep the header.

let mockPathname = "/vendor/network/accept-invite";
let mockAsPath = null;
let mockQuery = {};
jest.mock("@/redux/store", () => ({ __esModule: true, store: { getState: () => ({ userProfile: null }) } }));
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => jest.fn() }));
jest.mock("@/utils/guestSession", () => ({ __esModule: true, isGuestSession: () => false }));
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardReload: jest.fn(), hardNavigate: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: mockPathname, asPath: mockAsPath ?? mockPathname, query: mockQuery, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/head", () => ({ __esModule: true, default: ({ children }) => <>{children}</> }));
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
import { verifyVendorToken } from "@/services/Auth";

beforeEach(() => {
  mockQuery = {};
  mockAsPath = null;
});

test("the network invitation page renders without the site header", () => {
  mockPathname = "/vendor/network/accept-invite";
  render(<Layout><div data-testid="page" /></Layout>);
  expect(screen.getByTestId("page")).toBeInTheDocument();
  expect(screen.queryByTestId("site-header")).toBeNull();
});

test("the inventory short-link landing renders without the site header", () => {
  mockPathname = "/s/[t]/[id]";
  render(<Layout><div data-testid="page" /></Layout>);
  expect(screen.getByTestId("page")).toBeInTheDocument();
  expect(screen.queryByTestId("site-header")).toBeNull();
});

test("the site-rep receive link renders bare, and its token is never sent for a vendor login", () => {
  // A legacy link reaches /receive/token with its old ?token= forwarded by the redirect.
  mockPathname = "/receive/token";
  mockQuery = { t: "tok", token: "tok" };
  render(<Layout><div data-testid="page" /></Layout>);
  expect(screen.getByTestId("page")).toBeInTheDocument();
  expect(screen.queryByTestId("site-header")).toBeNull();
  expect(verifyVendorToken).not.toHaveBeenCalled();
});

test("other public pages keep the site header", () => {
  mockPathname = "/for-vendors";
  render(<Layout><div data-testid="page" /></Layout>);
  expect(screen.getByTestId("site-header")).toBeInTheDocument();
});

test("the canonical link never carries a link's token or #fragment, and keeps a public page's own query", () => {
  const canonical = () => document.querySelector('link[rel="canonical"]').getAttribute("href");
  const at = (pathname, asPath) => {
    mockPathname = pathname;
    mockAsPath = asPath;
    const view = render(<Layout><div /></Layout>);
    const href = canonical();
    view.unmount();
    return href;
  };
  expect(at("/receive/token", "/receive/token#t=Zk3pQ9wXr7Lm2Nv8Bt4Yc6Hd1Js5Fg0Ka"))
    .toBe("https://letsworkwise.com/receive/token");
  expect(at("/receive/token", "/receive/token?t=Zk3pQ9wXr7Lm2Nv8Bt4Yc6Hd1Js5Fg0Ka&token=x#y"))
    .toBe("https://letsworkwise.com/receive/token");
  // A public vendor profile is the query: each one keeps its own canonical.
  expect(at("/vendor/vendor-profile", "/vendor/vendor-profile?id=8123"))
    .toBe("https://letsworkwise.com/vendor/vendor-profile?id=8123");
  expect(at("/for-vendors", "/for-vendors?utm_source=mail"))
    .toBe("https://letsworkwise.com/for-vendors?utm_source=mail");
});
