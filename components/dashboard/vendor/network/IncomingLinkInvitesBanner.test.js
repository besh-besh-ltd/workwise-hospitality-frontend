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
  fireEvent.click(await screen.findByRole("button", { name: "Accept and join" }));
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
  fireEvent.click(await screen.findByRole("button", { name: "Accept and join" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This invitation is already cancelled"));
  expect(screen.getAllByText("Daikin India").length).toBeGreaterThan(0);
});

// Security audit M2: one click used to hand every admin of the inviting org full
// control of this account. Accept now opens a confirmation that says so plainly.
test("Accept first opens a confirmation stating the admins can act fully as this account", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  renderWith(SOLO);
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  const dialog = await screen.findByRole("dialog");
  expect(acceptLinkInvite).not.toHaveBeenCalled();
  expect(dialog).toHaveTextContent("Every admin of Daikin India will be able to act fully as this account");
  expect(dialog).toHaveTextContent(/send quotes/);
  expect(dialog).toHaveTextContent(/accept or reject purchase orders/);
  expect(dialog).toHaveTextContent(/sign rate contracts/);
  expect(dialog).toHaveTextContent(/see this account's full history/);
});

test("cancelling the confirmation does not join", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  renderWith(SOLO);
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(acceptLinkInvite).not.toHaveBeenCalled();
  expect(screen.getByText("Daikin India")).toBeInTheDocument();
});

// Fix round 1: the network name is chosen by whoever invites, so it is never shown
// as the inviter's identity. The company (and GSTIN) come from the principal's account.
const WITH_COMPANY = {
  ...INVITE,
  principal_company_name: "Daikin Airconditioning India Pvt Ltd",
  principal_gstin: "07AAACD1234F1Z5",
};

test("with the principal's company, the card and the confirmation name it and its GSTIN, plus the network", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [WITH_COMPANY] });
  renderWith(SOLO);
  const card = await screen.findByRole("region", { name: "Network invitation" });
  expect(card).toHaveTextContent("Invited by Daikin Airconditioning India Pvt Ltd (GSTIN 07AAACD1234F1Z5)");
  expect(card).toHaveTextContent("Network: Daikin India");
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("Invited by Daikin Airconditioning India Pvt Ltd (GSTIN 07AAACD1234F1Z5)");
  expect(dialog).toHaveTextContent("Network: Daikin India");
});

test("a company without a GSTIN is named without one", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [{ ...WITH_COMPANY, principal_gstin: null }] });
  renderWith(SOLO);
  const card = await screen.findByRole("region", { name: "Network invitation" });
  expect(card).toHaveTextContent("Invited by Daikin Airconditioning India Pvt Ltd");
  expect(card).not.toHaveTextContent("GSTIN");
});

test("without the company, the network name is never presented as the inviter", async () => {
  listIncomingLinkInvites.mockResolvedValue({ status: 1, data: [INVITE] });
  renderWith(SOLO);
  const card = await screen.findByRole("region", { name: "Network invitation" });
  expect(card).toHaveTextContent("Network name (chosen by the inviter): Daikin India — company not shown");
  expect(card).not.toHaveTextContent("Invited by");
  expect(card).not.toHaveTextContent(/Daikin India invited you/);
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("Network name (chosen by the inviter): Daikin India — company not shown");
  expect(dialog).not.toHaveTextContent("Invited by");
  expect(dialog).not.toHaveTextContent("GSTIN");
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
