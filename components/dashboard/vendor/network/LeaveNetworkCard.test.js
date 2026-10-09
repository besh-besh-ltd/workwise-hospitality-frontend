// Scope audit #6: a member entity on its OWN login can leave its network
// (POST /entities/self/leave). Never offered to the principal, to a network
// person acting for the entity, or to a guest emailed-link session.

jest.mock("@/services/vendorNetwork", () => ({ __esModule: true, leaveNetwork: jest.fn() }));
jest.mock("@/services/Auth", () => ({ __esModule: true, getProfile: jest.fn() }));
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: jest.fn(() => Promise.resolve()) } }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
let mockGuest = false;
jest.mock("@/utils/guestSession", () => ({ __esModule: true, isGuestSession: () => mockGuest }));
const mockHardNavigate = jest.fn();
jest.mock("@/utils/hardNavigate", () => ({ __esModule: true, hardNavigate: (...a) => mockHardNavigate(...a) }));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import reducer, { setUserProfile } from "@/redux/slice";
import { leaveNetwork } from "@/services/vendorNetwork";
import { getProfile } from "@/services/Auth";
import LeaveNetworkCard from "./LeaveNetworkCard";

const memberNetwork = {
  org_id: 7,
  org_name: "Daikin India",
  role: "ENTITY_MEMBER",
  actor_user_id: 20,
  acting_entity_id: 20,
  is_principal: false,
  entity_relationship: "BRANCH",
  entity_status: "ACTIVE",
  actable_entities: [{ vendor_id: 20, name: "Daikin UP", relationship: "BRANCH", org_id: 7 }],
};
const OWN = { id: 20, user_type: 3, name: "Daikin UP", network: memberNetwork };

const renderWith = (profile) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile(profile));
  const utils = render(
    <Provider store={store}>
      <LeaveNetworkCard />
    </Provider>
  );
  return { store, ...utils };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGuest = false;
});

test("the entity's own login sees Leave network", () => {
  renderWith(OWN);
  expect(screen.getByRole("button", { name: "Leave network: Daikin India" })).toBeInTheDocument();
});

test.each([
  ["the principal", { ...OWN, network: { ...memberNetwork, is_principal: true, role: "ORG_ADMIN", entity_relationship: "PRINCIPAL" } }],
  ["a network person acting for the entity", { ...OWN, network: { ...memberNetwork, actor_user_id: 500 } }],
  ["a vendor in no network", { ...OWN, network: null }],
])("hidden for %s", (_, profile) => {
  const { container } = renderWith(profile);
  expect(container).toBeEmptyDOMElement();
});

test("hidden for a guest emailed-link session", () => {
  mockGuest = true;
  const { container } = renderWith(OWN);
  expect(container).toBeEmptyDOMElement();
});

test("asks for confirmation; cancelling leaves nothing", async () => {
  renderWith(OWN);
  fireEvent.click(screen.getByRole("button", { name: "Leave network: Daikin India" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(/admins can no longer act as this account/);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(leaveNetwork).not.toHaveBeenCalled();
});

test("confirming leaves, refreshes the profile and reloads the dashboard", async () => {
  leaveNetwork.mockResolvedValue({ status: 1, message: "You have left the network", data: { vendor_id: 20 } });
  getProfile.mockResolvedValue({ status: 1, data: { ...OWN, network: null } });
  const { store } = renderWith(OWN);
  fireEvent.click(screen.getByRole("button", { name: "Leave network: Daikin India" }));
  fireEvent.click(await screen.findByRole("button", { name: "Leave network" }));
  await waitFor(() => expect(mockHardNavigate).toHaveBeenCalledWith("/dashboard/vendor"));
  expect(leaveNetwork).toHaveBeenCalledTimes(1);
  expect(getProfile).toHaveBeenCalledTimes(1);
  expect(getProfile.mock.invocationCallOrder[0]).toBeLessThan(mockHardNavigate.mock.invocationCallOrder[0]);
  expect(store.getState().userProfile.network).toBeNull();
  expect(toast.success).toHaveBeenCalledWith("You have left the network");
});

test("a refused leave shows the server's message and stays", async () => {
  leaveNetwork.mockRejectedValue({ response: { status: 403, data: { status: 0, message: "Only the entity's own login can leave the network" } } });
  renderWith(OWN);
  fireEvent.click(screen.getByRole("button", { name: "Leave network: Daikin India" }));
  fireEvent.click(await screen.findByRole("button", { name: "Leave network" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Only the entity's own login can leave the network"));
  expect(mockHardNavigate).not.toHaveBeenCalled();
  expect(getProfile).not.toHaveBeenCalled();
});
