// The incoming link-invite banner on the vendor dashboard home (spec §5, §9).
// A vendor in no network that another network invited sees who invited it and
// as what; accepting joins the network (and refetches the profile, which now
// carries `network`), declining dismisses the invitation.

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
jest.mock("@/components/dashboard/vendor", () => ({ __esModule: true, default: () => <div>vendor dashboard</div> }));
let mockGuest = false;
jest.mock("@/utils/guestSession", () => ({ __esModule: true, isGuestSession: () => mockGuest }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile } from "@/redux/slice";
import { listIncomingLinkInvites, acceptLinkInvite, declineLinkInvite } from "@/services/vendorNetwork";
import { getProfile } from "@/services/Auth";
import IncomingLinkInvitesBanner from "./IncomingLinkInvitesBanner";
import VendorDashboardPage from "@/pages/dashboard/vendor/index";

const INVITE = {
  id: 91,
  org_id: 7,
  org_name: "Daikin India",
  relationship: "BRANCH",
  status: "PENDING",
  expires_at: "2026-10-14T00:00:00Z",
  created_at: "2026-10-07T00:00:00Z",
};

const renderWith = (profile, ui = <IncomingLinkInvitesBanner />) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile(profile));
  render(<Provider store={store}>{ui}</Provider>);
  return store;
};

const SOLO = { id: 20, user_type: 3, name: "Daikin UP", network: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockGuest = false;
});

test("renders nothing when there is no pending invitation", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [] });
  const { container } = render(
    <Provider store={(() => { const s = configureStore({ reducer }); s.dispatch(setUserProfile(SOLO)); return s; })()}>
      <IncomingLinkInvitesBanner />
    </Provider>
  );
  await waitFor(() => expect(listIncomingLinkInvites).toHaveBeenCalledTimes(1));
  expect(container).toBeEmptyDOMElement();
});

test("is not fetched for a vendor already in a network", () => {
  renderWith({ ...SOLO, network: { org_id: 7, role: "ORG_ADMIN", is_principal: true } });
  expect(listIncomingLinkInvites).not.toHaveBeenCalled();
});

test("shows the inviting network and the relationship", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  renderWith(SOLO);
  expect(await screen.findByText("Daikin India")).toBeInTheDocument();
  expect(screen.getByText(/as a branch/)).toBeInTheDocument();
});

test("accepting joins, refetches the profile and hides the banner", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  acceptLinkInvite.mockResolvedValue({
    status: 1,
    message: "You have joined the network",
    data: { org_id: 7, relationship: "BRANCH", seat: { id: 1, status: "active", payable: false, amount: 0 } },
  });
  const joined = { ...SOLO, network: { org_id: 7, org_name: "Daikin India", role: "ENTITY_MEMBER", is_principal: false } };
  getProfile.mockResolvedValue({ status: 1, data: joined });
  const store = renderWith(SOLO);

  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  await waitFor(() => expect(acceptLinkInvite).toHaveBeenCalledWith(91));
  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
  expect(toast.success).toHaveBeenCalledWith("You have joined the network");
  await waitFor(() => expect(store.getState().userProfile.network.org_id).toBe(7));
  await waitFor(() => expect(screen.queryByText("Daikin India")).toBeNull());
});

test("declining calls decline and removes the invitation", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  declineLinkInvite.mockResolvedValue({ status: 1, message: "Invitation declined", data: { id: 91 } });
  renderWith(SOLO);
  fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
  await waitFor(() => expect(declineLinkInvite).toHaveBeenCalledWith(91));
  await waitFor(() => expect(screen.queryByText("Daikin India")).toBeNull());
  expect(getProfile).not.toHaveBeenCalled();
});

test("a 409 on accept shows the server's message and keeps the invitation", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  acceptLinkInvite.mockRejectedValue({
    response: { status: 409, data: { status: 0, message: "This invitation is already cancelled" } },
  });
  renderWith(SOLO);
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This invitation is already cancelled"));
  expect(screen.getByText("Daikin India")).toBeInTheDocument();
});

test("the vendor dashboard home renders the banner", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  renderWith(SOLO, <VendorDashboardPage />);
  expect(screen.getByText("vendor dashboard")).toBeInTheDocument();
  expect(await screen.findByText("Daikin India")).toBeInTheDocument();
});

test("is not fetched for a guest emailed-link session", () => {
  mockGuest = true;
  renderWith(SOLO);
  expect(listIncomingLinkInvites).not.toHaveBeenCalled();
});
