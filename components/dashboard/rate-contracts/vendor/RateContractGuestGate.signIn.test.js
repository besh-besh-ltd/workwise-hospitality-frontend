// Task 26 fix round 1: Sign in on the rate-contract guest notice must leave for the
// sign-in modal without the page underneath coming back. Before, it cleared the refusal
// and emitted loginStatusChanged after removing the token: the real page re-rendered,
// fired its /arc-v2/ request with no token, got 401, and the shared axios instance
// mounted the session-expired modal over the sign-in modal (whose hard redirect then
// dropped the prefill). The server here answers like the real one: 401 without a token,
// 403 GUEST_SESSION with the guest token.

let mockPathname = "/dashboard/vendor/rate-contracts/[contractId]";
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ pathname: mockPathname, asPath: mockPathname, query: { contractId: "77" }, push: jest.fn(), replace: mockReplace }),
}));
const mockReplace = jest.fn();
const mockHardNavigate = jest.fn();
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardNavigate: (...a) => mockHardNavigate(...a), hardReload: jest.fn() }));
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { reset: jest.fn() } }));
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { dispatch: jest.fn(), getState: () => ({}) },
  persistor: { flush: jest.fn(() => Promise.resolve()) },
}));

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import reducer from "@/redux/slice";
import axiosInstance from "@/lib/axios";
import * as ArcApi from "@/services/arc_v2";
import { clearArcGuestRefusal } from "@/utils/arcGuestRefusal";
import RateContractGuestGate from "./RateContractGuestGate";

/** A rate-contract page: loads its contract on mount, as [contractId]/index.js does. */
function ContractPageProbe() {
  useEffect(() => {
    ArcApi.vendorGetContract(77).catch(() => {});
  }, []);
  return <div data-testid="contract-page">Contract not found</div>;
}

let requests;
const server = async (config) => {
  const auth = typeof config.headers?.get === "function" ? config.headers.get("Authorization") : config.headers?.Authorization;
  requests.push({ url: config.url, auth: !!auth });
  const err = new Error("refused");
  err.config = config;
  err.response = auth
    ? { status: 403, data: { status: 0, reason: "GUEST_SESSION", message: "Sign in to your account to do this." }, headers: {}, config }
    : { status: 401, data: { status: 0, message: "Unauthorized" }, headers: {}, config };
  throw err;
};
const savedAdapter = axiosInstance.defaults.adapter;

beforeEach(() => {
  jest.clearAllMocks();
  clearArcGuestRefusal();
  requests = [];
  axiosInstance.defaults.adapter = server;
  window.localStorage.clear();
  window.sessionStorage.clear();
  for (const [k, v] of Object.entries({
    token: "guest.jwt.token",
    "current-user-type": "vendor",
    "current-user-name": "Alpha West",
    "current-user-email": "alpha.west@example.com",
    "guest-session": "true",
  })) {
    window.localStorage.setItem(k, v);
  }
});
afterEach(() => {
  axiosInstance.defaults.adapter = savedAdapter;
  document.getElementById("session-expired-root")?.remove();
});

const flush = () => new Promise((r) => setTimeout(r, 20));

test("Sign in hard-navigates to the prefilled sign-in modal: no token-less request, no session-expired modal", async () => {
  const loginStatus = jest.fn();
  window.addEventListener("loginStatusChanged", loginStatus);
  render(
    <Provider store={configureStore({ reducer })}>
      <RateContractGuestGate>
        <ContractPageProbe />
      </RateContractGuestGate>
    </Provider>
  );

  // The page's request is refused to the guest: the notice replaces it.
  await screen.findByRole("region", { name: "Sign in to open rate contracts" });
  expect(screen.queryByTestId("contract-page")).toBeNull();
  expect(requests).toEqual([{ url: "/arc-v2/vendor/contracts/77", auth: true }]);

  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(mockHardNavigate).toHaveBeenCalledWith("/?login=true"));
  await flush();
  window.removeEventListener("loginStatusChanged", loginStatus);

  // The page never came back, so nothing went out without a token.
  expect(requests).toEqual([{ url: "/arc-v2/vendor/contracts/77", auth: true }]);
  expect(screen.queryByTestId("contract-page")).toBeNull();
  expect(document.getElementById("session-expired-root")).toBeNull();
  expect(loginStatus).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  // The sign-in modal finds the prefill, and the guest session is gone.
  expect(JSON.parse(window.sessionStorage.getItem("pending-sign-in"))).toEqual({
    email: "alpha.west@example.com",
    message: "Sign in with your email and password to open your rate contracts.",
  });
  for (const k of ["token", "current-user-type", "current-user-name", "current-user-email", "guest-session"]) {
    expect(window.localStorage.getItem(k)).toBeNull();
  }
});
