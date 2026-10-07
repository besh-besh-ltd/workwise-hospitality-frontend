// Cross-tab: when another tab FINISHES switching the vendor-network acting
// entity (token + persisted profile, signalled by `entity-switch-done`), a tab
// showing a network profile reloads to pick both up. The bare token write is
// not the signal: it lands just before the new profile is persisted. Wired into the
// layout's existing storage listener, not a competing one.

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
// A networked profile is refetched once per load (never settles here: not under test).
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  SWSubscribe: jest.fn(),
  verifyVendorToken: jest.fn(),
  getProfile: jest.fn(() => new Promise(() => {})),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { error: jest.fn(), success: jest.fn() } }));

import React from "react";
import { render, act } from "@testing-library/react";
import Layout from "./index";

const fireStorage = (init) => act(() => { window.dispatchEvent(new StorageEvent("storage", init)); });

beforeEach(() => {
  mockReload.mockClear();
  mockProfile = null;
});

test("a token-only change from another tab does NOT reload (its profile may not be persisted yet)", () => {
  mockProfile = { id: 10, network: { role: "ORG_ADMIN", acting_entity_id: 10 } };
  render(<Layout><div /></Layout>);
  fireStorage({ key: "token", oldValue: "tok-hq", newValue: "tok-up" });
  expect(mockReload).not.toHaveBeenCalled();
});

test("another tab's completed switch (entity-switch-done) reloads a tab showing a network profile", () => {
  mockProfile = { id: 10, network: { role: "ORG_ADMIN", acting_entity_id: 10 } };
  render(<Layout><div /></Layout>);
  fireStorage({ key: "entity-switch-done", oldValue: null, newValue: "1700000000000-abc" });
  expect(mockReload).toHaveBeenCalledTimes(1);
});

test("a completed switch elsewhere leaves a no-network tab alone", () => {
  mockProfile = { id: 10, network: null };
  render(<Layout><div /></Layout>);
  fireStorage({ key: "entity-switch-done", oldValue: null, newValue: "1700000000000-abc" });
  expect(mockReload).not.toHaveBeenCalled();
});
