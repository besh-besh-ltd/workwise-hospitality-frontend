// "Acting as {entity} · {org}" (spec §4, §9). Only a person who can act for
// more than one entity gets the switcher. Switching swaps the session token,
// reloads the profile (whose `id` is now the new acting entity), reconnects the
// realtime socket (the server binds the socket room to the entity at
// handshake) and lands on the vendor dashboard.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  switchEntity: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  getProfile: jest.fn(),
}));
jest.mock("@/lib/realtimeSocket", () => ({
  __esModule: true,
  reconnectRealtimeSocket: jest.fn(),
}));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { setStorage: jest.fn(), getStorage: jest.fn(() => null) },
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));
const mockReplace = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), pathname: "/dashboard/vendor/purchase-orders", query: {} }),
}));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import reducer, { setUserProfile } from "@/redux/slice";
import { switchEntity } from "@/services/vendorNetwork";
import { getProfile } from "@/services/Auth";
import { reconnectRealtimeSocket } from "@/lib/realtimeSocket";
import storageInstance from "@/utils/storageInstance";
import EntitySwitcher from "./EntitySwitcher";

const network = (overrides = {}) => ({
  org_id: 7,
  org_name: "Daikin India",
  role: "ORG_ADMIN",
  actor_user_id: 500,
  actor_name: "Asha",
  acting_entity_id: 10,
  is_principal: true,
  actable_entities: [
    { vendor_id: 10, name: "Daikin HQ", relationship: "PRINCIPAL", org_id: 7 },
    { vendor_id: 11, name: "Daikin UP", relationship: "BRANCH", org_id: 7 },
  ],
  ...overrides,
});

const renderWith = (profile) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile(profile));
  render(
    <Provider store={store}>
      <EntitySwitcher />
    </Provider>
  );
  return store;
};

beforeEach(() => jest.clearAllMocks());

test("hidden for a vendor in no network", () => {
  renderWith({ id: 10, name: "Solo Vendor", network: null });
  expect(screen.queryByText(/Acting as/)).not.toBeInTheDocument();
});

test("hidden when the person can act for a single entity only", () => {
  renderWith({
    id: 11,
    network: network({
      role: "ENTITY_MEMBER",
      acting_entity_id: 11,
      is_principal: false,
      actable_entities: [{ vendor_id: 11, name: "Daikin UP", relationship: "BRANCH", org_id: 7 }],
    }),
  });
  expect(screen.queryByText(/Acting as/)).not.toBeInTheDocument();
});

test("shows the acting entity and org, and switching swaps token, profile and socket", async () => {
  switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
  const switched = { id: 11, name: "Daikin UP", network: network({ acting_entity_id: 11, is_principal: false }) };
  getProfile.mockResolvedValue({ status: 1, data: switched });

  const store = renderWith({ id: 10, name: "Daikin HQ", network: network() });

  const trigger = screen.getByRole("button", { name: /Acting as/ });
  expect(trigger).toHaveTextContent("Acting as Daikin HQ · Daikin India");

  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin UP/ }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/dashboard/vendor"));
  expect(switchEntity).toHaveBeenCalledWith(11);
  expect(storageInstance.setStorage).toHaveBeenCalledWith("token", "tok-up");
  expect(reconnectRealtimeSocket).toHaveBeenCalledTimes(1);
  expect(getProfile).toHaveBeenCalledTimes(1);
  expect(store.getState().userProfile).toEqual(switched);

  // The token is stored before the socket reconnects and the profile is refetched,
  // otherwise both would still run as the old entity.
  const tokenAt = storageInstance.setStorage.mock.invocationCallOrder[0];
  expect(tokenAt).toBeLessThan(reconnectRealtimeSocket.mock.invocationCallOrder[0]);
  expect(tokenAt).toBeLessThan(getProfile.mock.invocationCallOrder[0]);
  expect(await screen.findByRole("button", { name: /Acting as/ })).toHaveTextContent("Acting as Daikin UP · Daikin India");
});

test("picking the entity already acted as does nothing", () => {
  renderWith({ id: 10, network: network() });
  fireEvent.click(screen.getByRole("button", { name: /Acting as/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin HQ/ }));
  expect(switchEntity).not.toHaveBeenCalled();
});

test("a refused switch keeps the current session untouched", async () => {
  switchEntity.mockRejectedValue({ response: { status: 403, data: { status: 0, message: "You cannot act for this entity" } } });
  renderWith({ id: 10, network: network() });
  fireEvent.click(screen.getByRole("button", { name: /Acting as/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin UP/ }));

  const { toast } = require("react-toastify");
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You cannot act for this entity"));
  expect(storageInstance.setStorage).not.toHaveBeenCalled();
  expect(reconnectRealtimeSocket).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});
