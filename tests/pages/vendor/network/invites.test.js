// /dashboard/vendor/network/invites — where the NETWORK_LINK_INVITE
// notification lands. Lists the incoming link invitations (same component and
// logic as the dashboard banner); accepting refetches the profile and then
// goes to the network overview.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  listIncomingLinkInvites: jest.fn(),
  acceptLinkInvite: jest.fn(),
  declineLinkInvite: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({ __esModule: true, getProfile: jest.fn() }));
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: jest.fn(() => Promise.resolve()) } }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock("next/head", () => ({ __esModule: true, default: () => null }));
const mockPush = jest.fn();
jest.mock("next/router", () => ({ __esModule: true, useRouter: () => ({ push: mockPush, pathname: "/dashboard/vendor/network/invites", query: {} }) }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile } from "@/redux/slice";
import { listIncomingLinkInvites, acceptLinkInvite, declineLinkInvite } from "@/services/vendorNetwork";
import { getProfile } from "@/services/Auth";
import NetworkInvitesPage from "@/pages/dashboard/vendor/network/invites";

const INVITE = {
  id: 91,
  org_id: 7,
  org_name: "Daikin India",
  relationship: "DISTRIBUTOR",
  status: "PENDING",
  expires_at: "2026-10-14T00:00:00Z",
  created_at: "2026-10-07T00:00:00Z",
};
const SOLO = { id: 20, user_type: 3, name: "Cool Distributors", network: null };

const renderWith = (profile) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile(profile));
  render(
    <Provider store={store}>
      <NetworkInvitesPage />
    </Provider>
  );
  return store;
};

beforeEach(() => jest.clearAllMocks());

test("lists the incoming invitations", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  renderWith(SOLO);
  expect(await screen.findByText("Daikin India")).toBeInTheDocument();
  expect(screen.getByText(/as a distributor/)).toBeInTheDocument();
});

test("shows an empty state when there are none", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [] });
  renderWith(SOLO);
  expect(await screen.findByText("No pending invitations")).toBeInTheDocument();
});

test("accepting refetches the profile, then goes to the network overview", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  acceptLinkInvite.mockResolvedValue({
    status: 1,
    message: "You have joined the network",
    data: { org_id: 7, relationship: "DISTRIBUTOR", seat: { id: 1, status: "active", payable: false, amount: 0 } },
  });
  getProfile.mockResolvedValue({
    status: 1,
    data: { ...SOLO, network: { org_id: 7, org_name: "Daikin India", role: "ENTITY_MEMBER", is_principal: false } },
  });
  const store = renderWith(SOLO);

  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/network"));
  expect(acceptLinkInvite).toHaveBeenCalledWith(91);
  expect(getProfile).toHaveBeenCalledTimes(1);
  expect(getProfile.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]);
  expect(store.getState().userProfile.network.org_id).toBe(7);
  expect(toast.success).toHaveBeenCalledWith("You have joined the network");
});

test("declining removes the invitation and stays on the page", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  declineLinkInvite.mockResolvedValue({ status: 1, message: "Invitation declined", data: { id: 91 } });
  renderWith(SOLO);
  fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
  await waitFor(() => expect(declineLinkInvite).toHaveBeenCalledWith(91));
  expect(await screen.findByText("No pending invitations")).toBeInTheDocument();
  expect(mockPush).not.toHaveBeenCalled();
});

test("a 409 on accept is worded for the accepting vendor and does not navigate", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  acceptLinkInvite.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "You already belong to a network", reason: "ALREADY_IN_NETWORK" } },
  });
  renderWith(SOLO);
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You already belong to a network."));
  expect(mockPush).not.toHaveBeenCalled();
  expect(screen.getByText("Daikin India")).toBeInTheDocument();
});

test("an HQ (IS_PRINCIPAL) is told it cannot join another network", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  acceptLinkInvite.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "You run your own network and cannot join another", reason: "IS_PRINCIPAL" } },
  });
  renderWith(SOLO);
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("A network HQ cannot join another network."));
});

test("shows a loading state until the profile is loaded, not the in-a-network text", () => {
  const store = configureStore({ reducer });
  render(
    <Provider store={store}>
      <NetworkInvitesPage />
    </Provider>
  );
  expect(screen.getByText("Loading invitations…")).toBeInTheDocument();
  expect(screen.queryByText(/already part of a network/)).toBeNull();
  expect(listIncomingLinkInvites).not.toHaveBeenCalled();
});

test("a pre-release vendor profile (no network key) also waits", () => {
  renderWith({ id: 20, user_type: 3, name: "Cool Distributors" });
  expect(screen.getByText("Loading invitations…")).toBeInTheDocument();
  expect(screen.queryByText(/already part of a network/)).toBeNull();
});
