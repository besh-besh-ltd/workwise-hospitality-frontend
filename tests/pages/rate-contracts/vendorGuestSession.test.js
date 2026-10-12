// Rate-contract pages opened in an emailed-link guest session (Task 26). Every vendor ARC
// request answers 403 GUEST_SESSION; the page, inside the gate the dashboard layout mounts,
// shows the sign-in notice instead of "Contract not found" or an empty list, and the
// contract and accept pages' loaders handle the rejection (no unhandled rejection).

const mockReplace = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    isReady: true,
    pathname: mockPathname,
    asPath: mockPathname,
    query: { contractId: "77" },
    push: jest.fn(),
    replace: mockReplace,
  }),
}));
let mockPathname = "/dashboard/vendor/rate-contracts/[contractId]";
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getOrg: jest.fn(),
  getRoutingQueue: jest.fn(),
  assignSubject: jest.fn(),
  revokeAssignment: jest.fn(),
  respondToAssignment: jest.fn(),
}));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import reducer, { setUserProfile } from "@/redux/slice";
import axiosInstance from "@/lib/axios";
import { clearArcGuestRefusal } from "@/utils/arcGuestRefusal";
import RateContractGuestGate, { GUEST_NOTICE_TEXT } from "@/components/dashboard/rate-contracts/vendor/RateContractGuestGate";
import VendorContractPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/index";
import VendorAcceptPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/accept";
import VendorActiveContractsPage from "@/pages/dashboard/vendor/rate-contracts/active";

// Every request goes through the real shared axios instance; the server answers a guest.
const guestRefusal = async (config) => {
  const err = new Error("Request failed with status code 403");
  err.config = config;
  err.response = {
    status: 403,
    data: { status: 0, message: "Sign in to your account to do this. Emailed links only open the RFQ.", reason: "GUEST_SESSION" },
    headers: {},
    config,
  };
  throw err;
};

const renderInGate = (Page) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 10, user_type: 3, name: "Alpha Linen", network: null }));
  return render(
    <Provider store={store}>
      <RateContractGuestGate>
        <Page />
      </RateContractGuestGate>
    </Provider>
  );
};

let unhandled;
const onUnhandled = (reason) => unhandled.push(reason);
const savedAdapter = axiosInstance.defaults.adapter;

beforeEach(() => {
  jest.clearAllMocks();
  clearArcGuestRefusal();
  axiosInstance.defaults.adapter = guestRefusal;
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});
afterEach(() => {
  axiosInstance.defaults.adapter = savedAdapter;
  process.off("unhandledRejection", onUnhandled);
});

const flush = () => new Promise((r) => setTimeout(r, 0));

test.each([
  ["the contract page", "/dashboard/vendor/rate-contracts/[contractId]", VendorContractPage],
  ["the accept page", "/dashboard/vendor/rate-contracts/[contractId]/accept", VendorAcceptPage],
  ["the Active Contracts list", "/dashboard/vendor/rate-contracts/active", VendorActiveContractsPage],
])("%s shows the sign-in notice, not 'Contract not found' or an empty list", async (_label, path, Page) => {
  mockPathname = path;
  renderInGate(Page);
  expect(await screen.findByRole("region", { name: "Sign in to open rate contracts" })).toHaveTextContent(GUEST_NOTICE_TEXT);
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.queryByText(/Contract not found/i)).toBeNull();
  expect(screen.queryByText(/No active contracts/i)).toBeNull();
  await flush();
  expect(unhandled).toEqual([]);
});
