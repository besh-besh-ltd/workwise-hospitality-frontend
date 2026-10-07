// "Acting as {entity} · {org}" (spec §4, §9). Only a person who can act for
// more than one entity gets the switcher. Switching swaps the session token,
// reloads and persists the profile (whose `id` is now the new acting entity),
// then HARD-navigates to the vendor dashboard so every page, cache and the
// realtime socket (room bound to the entity at handshake) start over.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  switchEntity: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  getProfile: jest.fn(),
}));
// The hard navigation is window.location.assign behind a one-line seam
// (jsdom's location is non-configurable).
const mockAssign = jest.fn();
jest.mock("@/utils/hardNavigate", () => ({
  __esModule: true,
  hardNavigate: (...args) => mockAssign(...args),
}));
const mockFlush = jest.fn(() => Promise.resolve());
jest.mock("@/redux/store", () => ({
  __esModule: true,
  persistor: { flush: (...args) => mockFlush(...args) },
}));
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: {
    setStorage: jest.fn(),
    removeStorege: jest.fn(),
    getStorage: jest.fn((key) => (key === "token" ? "tok-hq" : null)),
  },
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));

import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import reducer, { setUserProfile } from "@/redux/slice";
import { switchEntity } from "@/services/vendorNetwork";
import { getProfile } from "@/services/Auth";
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

test("shows the acting entity and org; switching stores the token, persists the profile, then hard-navigates", async () => {
  switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
  const switched = { id: 11, name: "Daikin UP", network: network({ acting_entity_id: 11, is_principal: false }) };
  getProfile.mockResolvedValue({ status: 1, data: switched });

  const store = renderWith({ id: 10, name: "Daikin HQ", network: network() });

  const trigger = screen.getByRole("button", { name: /Acting as/ });
  expect(trigger).toHaveTextContent("Acting as Daikin HQ · Daikin India");

  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin UP/ }));

  await waitFor(() => expect(mockAssign).toHaveBeenCalledWith("/dashboard/vendor"));
  expect(mockAssign).toHaveBeenCalledTimes(1);
  expect(switchEntity).toHaveBeenCalledWith(11);
  expect(storageInstance.setStorage).toHaveBeenCalledWith("token", "tok-up");
  expect(store.getState().userProfile).toEqual(switched);

  // Token first (so the profile fetch and the next page run as the new entity),
  // the persisted profile flushed, and only then the navigation.
  const tokenAt = storageInstance.setStorage.mock.invocationCallOrder[0];
  const navAt = mockAssign.mock.invocationCallOrder[0];
  expect(tokenAt).toBeLessThan(getProfile.mock.invocationCallOrder[0]);
  expect(tokenAt).toBeLessThan(navAt);
  expect(mockFlush.mock.invocationCallOrder[0]).toBeLessThan(navAt);

  // Other tabs are told only once token + profile + flush all succeeded.
  const doneIdx = storageInstance.setStorage.mock.calls.findIndex(([k]) => k === "entity-switch-done");
  expect(doneIdx).toBeGreaterThan(-1);
  const doneAt = storageInstance.setStorage.mock.invocationCallOrder[doneIdx];
  expect(mockFlush.mock.invocationCallOrder[0]).toBeLessThan(doneAt);
  expect(doneAt).toBeLessThan(navAt);
});

test("a failed profile refresh rolls back to the previous token and profile and does not navigate", async () => {
  switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
  getProfile.mockRejectedValue(new Error("network"));
  const before = { id: 10, name: "Daikin HQ", network: network() };
  const store = renderWith(before);
  fireEvent.click(screen.getByRole("button", { name: /Acting as/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin UP/ }));

  const { toast } = require("react-toastify");
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not switch entity. Please try again."));
  // New token stored, then the previous one put back: the session is never half-switched.
  expect(storageInstance.setStorage.mock.calls).toEqual([
    ["token", "tok-up"],
    ["token", "tok-hq"],
  ]);
  expect(store.getState().userProfile).toEqual(before);
  // The restored profile is persisted again, and other tabs are never told to reload.
  expect(mockFlush).toHaveBeenCalledTimes(1);
  expect(storageInstance.setStorage.mock.calls.some(([k]) => k === "entity-switch-done")).toBe(false);
  expect(mockAssign).not.toHaveBeenCalled();
  // Switching state cleared: the trigger is usable again and shows the old entity.
  const trigger = screen.getByRole("button", { name: /Acting as/ });
  expect(trigger).not.toBeDisabled();
  expect(trigger).toHaveTextContent("Acting as Daikin HQ · Daikin India");
});

test("a failing persist flush rolls back too, and the rollback's own failing flush does not throw", async () => {
  switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
  getProfile.mockResolvedValue({ status: 1, data: { id: 11, network: network({ acting_entity_id: 11 }) } });
  mockFlush.mockRejectedValue(new Error("quota"));
  const before = { id: 10, name: "Daikin HQ", network: network() };
  const store = renderWith(before);
  fireEvent.click(screen.getByRole("button", { name: /Acting as/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin UP/ }));

  const { toast } = require("react-toastify");
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not switch entity. Please try again."));
  expect(mockFlush).toHaveBeenCalledTimes(2); // the switch's flush, then the rollback's
  expect(storageInstance.setStorage.mock.calls).toEqual([["token", "tok-up"], ["token", "tok-hq"]]);
  expect(store.getState().userProfile).toEqual(before);
  expect(mockAssign).not.toHaveBeenCalled();
  mockFlush.mockImplementation(() => Promise.resolve());
});

test("keyboard: opening focuses the first entity, arrows move focus, Enter selects", async () => {
  switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
  getProfile.mockResolvedValue({ status: 1, data: { id: 11, network: network({ acting_entity_id: 11 }) } });
  renderWith({ id: 10, network: network() });
  fireEvent.click(screen.getByRole("button", { name: /Acting as/ }));

  const [hq, up] = screen.getAllByRole("menuitemradio");
  expect(hq).toHaveFocus();
  const menu = screen.getByRole("menu");
  fireEvent.keyDown(menu, { key: "ArrowDown" });
  expect(up).toHaveFocus();
  fireEvent.keyDown(menu, { key: "ArrowDown" });
  expect(hq).toHaveFocus(); // wraps
  fireEvent.keyDown(menu, { key: "ArrowUp" });
  expect(up).toHaveFocus(); // wraps backwards

  fireEvent.keyDown(menu, { key: "Enter" });
  await waitFor(() => expect(mockAssign).toHaveBeenCalledWith("/dashboard/vendor"));
  expect(switchEntity).toHaveBeenCalledWith(11);
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
  expect(mockAssign).not.toHaveBeenCalled();
});
