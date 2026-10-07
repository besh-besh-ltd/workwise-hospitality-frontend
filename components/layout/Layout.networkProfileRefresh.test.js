// Deploy transition: a vendor profile persisted by a build before vendor
// networks has no `network` key, so every `network === null` gate misreads it
// until re-login. On load the layout refetches such a profile exactly once
// (never for a guest emailed-link session, never when the key is present).

const mockGetProfile = jest.fn();
const mockDispatch = jest.fn();
let mockProfile = null;
let mockGuest = false;
jest.mock("@/redux/store", () => ({ __esModule: true, store: { getState: () => ({ userProfile: mockProfile }) } }));
jest.mock("react-redux", () => ({ __esModule: true, useDispatch: () => mockDispatch }));
jest.mock("@/utils/guestSession", () => ({ __esModule: true, isGuestSession: () => mockGuest }));
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardReload: jest.fn(), hardNavigate: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: "/dashboard/vendor", asPath: "/dashboard/vendor", query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
jest.mock("./Header", () => ({ __esModule: true, default: () => null }));
jest.mock("./DashboardShell", () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock("@/components/shared/GuestAccessModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/PushPermissionPrompt", () => ({ __esModule: true, default: () => null }));
jest.mock("@/services/cms", () => ({ __esModule: true, getCmsData: jest.fn() }));
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  SWSubscribe: jest.fn(),
  verifyVendorToken: jest.fn(),
  getProfile: (...a) => mockGetProfile(...a),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { error: jest.fn(), success: jest.fn() } }));

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { setUserProfile, setNetworkProfileRefreshSettled } from "@/redux/slice";
import Layout from "./index";

const fresh = { id: 10, user_type: 3, name: "Daikin HQ", network: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockGuest = false;
  mockGetProfile.mockResolvedValue({ status: 1, data: fresh });
});

test("a vendor profile without the network key is refetched exactly once", async () => {
  mockProfile = { id: 10, user_type: 3, name: "Daikin HQ" };
  const { rerender } = render(<Layout><div /></Layout>);
  rerender(<Layout><div /></Layout>);
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(setUserProfile(fresh)));
  expect(mockGetProfile).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(setNetworkProfileRefreshSettled()));
});

test("a failed refetch still settles, without touching the stored profile", async () => {
  mockProfile = { id: 10, user_type: 3, name: "Daikin HQ" };
  mockGetProfile.mockRejectedValue(new Error("offline"));
  render(<Layout><div /></Layout>);
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(setNetworkProfileRefreshSettled()));
  expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: setUserProfile.type }));
});

test("a profile that already has network: null is not refetched (and is settled at once)", async () => {
  mockProfile = { id: 10, user_type: 3, network: null };
  render(<Layout><div /></Layout>);
  await Promise.resolve();
  expect(mockGetProfile).not.toHaveBeenCalled();
  expect(mockDispatch).toHaveBeenCalledWith(setNetworkProfileRefreshSettled());
});

test("a guest emailed-link session is not refetched", async () => {
  mockGuest = true;
  mockProfile = { id: 10, user_type: 3 };
  render(<Layout><div /></Layout>);
  await Promise.resolve();
  expect(mockGetProfile).not.toHaveBeenCalled();
});

test("a buyer profile without the key is not refetched", async () => {
  mockProfile = { id: 5, user_type: 2 };
  render(<Layout><div /></Layout>);
  await Promise.resolve();
  expect(mockGetProfile).not.toHaveBeenCalled();
});
