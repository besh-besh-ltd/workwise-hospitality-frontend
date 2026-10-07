// Cross-tab: when another tab switches the vendor-network acting entity, the
// shared `token` changes under this tab. A tab showing a network profile
// reloads (so it rehydrates the persisted profile) instead of running with a
// new token and an old profile. Wired into the layout's existing storage
// listener, not a competing one.

const mockReload = jest.fn();
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardReload: () => mockReload(), hardNavigate: jest.fn() }));
let mockProfile = null;
jest.mock("@/redux/store", () => ({ __esModule: true, store: { getState: () => ({ userProfile: mockProfile }) } }));
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: "/aboutus", asPath: "/aboutus", query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
jest.mock("./Header", () => ({ __esModule: true, default: () => null }));
jest.mock("./DashboardShell", () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock("@/components/shared/GuestAccessModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/PushPermissionPrompt", () => ({ __esModule: true, default: () => null }));
jest.mock("@/services/cms", () => ({ __esModule: true, getCmsData: jest.fn() }));
jest.mock("@/services/Auth", () => ({ __esModule: true, SWSubscribe: jest.fn(), verifyVendorToken: jest.fn(), getProfile: jest.fn() }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { error: jest.fn(), success: jest.fn() } }));

import React from "react";
import { render, act } from "@testing-library/react";
import Layout from "./index";

const fireStorage = (init) => act(() => { window.dispatchEvent(new StorageEvent("storage", init)); });

beforeEach(() => {
  mockReload.mockClear();
  mockProfile = null;
});

test("a token swapped by another tab reloads a tab showing a network profile", () => {
  mockProfile = { id: 10, network: { role: "ORG_ADMIN", acting_entity_id: 10 } };
  render(<Layout><div /></Layout>);
  fireStorage({ key: "token", oldValue: "tok-hq", newValue: "tok-up" });
  expect(mockReload).toHaveBeenCalledTimes(1);
});

test("a vendor in no network, and a logout elsewhere, do not reload", () => {
  mockProfile = { id: 10, network: null };
  render(<Layout><div /></Layout>);
  fireStorage({ key: "token", oldValue: "tok-a", newValue: "tok-b" });
  mockProfile = { id: 10, network: { role: "ORG_ADMIN" } };
  fireStorage({ key: "token", oldValue: "tok-a", newValue: null });
  expect(mockReload).not.toHaveBeenCalled();
});
