// "Acting as {entity} · {org}" (spec §4, §9). Only a person who can act for
// more than one entity gets the switcher. Switching fetches the new entity's
// profile WITH the new token (explicit header) while the shared token is still
// the old one, then stores token, profile (flushed) and the cross-tab done
// signal back to back, and HARD-navigates to the vendor dashboard so every
// page, cache and the realtime socket start over.

jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  switchEntity: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({
  __esModule: true,
  getProfileAs: jest.fn(),
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
import { getProfileAs as getProfile } from "@/services/Auth";
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
  const { container } = (() => {
    const store = configureStore({ reducer });
    store.dispatch(setUserProfile({ id: 10, name: "Solo Vendor", network: null }));
    return render(<Provider store={store}><EntitySwitcher /></Provider>);
  })();
  expect(container).toBeEmptyDOMElement();
});

// Task 20 / D7: a member of one entity still sees which entity and network it acts for,
// as a static label with nothing to open.
test("a person who can act for a single entity sees a static 'entity · network' label", () => {
  renderWith({
    id: 11,
    name: "Daikin UP",
    network: network({
      role: "ENTITY_MEMBER",
      acting_entity_id: 11,
      is_principal: false,
      actable_entities: [{ vendor_id: 11, name: "Daikin UP", relationship: "BRANCH", org_id: 7 }],
    }),
  });
  const label = screen.getByLabelText("Acting entity");
  expect(label).toHaveTextContent("Daikin UP · Daikin India");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText(/Acting as/)).not.toBeInTheDocument();
});

test("the static label falls back to the profile's name when the entity list is empty", () => {
  renderWith({ id: 11, name: "Daikin UP", network: network({ acting_entity_id: 11, is_principal: false, actable_entities: [] }) });
  expect(screen.getByLabelText("Acting entity")).toHaveTextContent("Daikin UP · Daikin India");
});

test("shows the acting entity and org; switching fetches the profile with the new token, then stores token, profile and done signal, then hard-navigates", async () => {
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
  // The new entity's profile is fetched with the new token itself.
  expect(getProfile).toHaveBeenCalledWith("tok-up");
  expect(storageInstance.setStorage).toHaveBeenCalledWith("token", "tok-up");
  expect(store.getState().userProfile).toEqual(switched);

  // Cross-tab ordering: other tabs read the shared token, so it is written only AFTER the
  // new profile is in hand, then the profile is flushed, then the done signal, then the
  // navigation.
  const tokenIdx = storageInstance.setStorage.mock.calls.findIndex(([k]) => k === "token");
  const tokenAt = storageInstance.setStorage.mock.invocationCallOrder[tokenIdx];
  const navAt = mockAssign.mock.invocationCallOrder[0];
  const flushAt = mockFlush.mock.invocationCallOrder[0];
  expect(getProfile.mock.invocationCallOrder[0]).toBeLessThan(tokenAt);
  expect(tokenAt).toBeLessThan(flushAt);
  const doneIdx = storageInstance.setStorage.mock.calls.findIndex(([k]) => k === "entity-switch-done");
  expect(doneIdx).toBeGreaterThan(-1);
  const doneAt = storageInstance.setStorage.mock.invocationCallOrder[doneIdx];
  expect(flushAt).toBeLessThan(doneAt);
  expect(doneAt).toBeLessThan(navAt);
});

test("a failed profile fetch never touches the stored token or profile and does not navigate", async () => {
  switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
  getProfile.mockRejectedValue(new Error("network"));
  const before = { id: 10, name: "Daikin HQ", network: network() };
  const store = renderWith(before);
  fireEvent.click(screen.getByRole("button", { name: /Acting as/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin UP/ }));

  const { toast } = require("react-toastify");
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not switch entity. Please try again."));
  // Other tabs never saw the new token: nothing was written.
  expect(storageInstance.setStorage).not.toHaveBeenCalled();
  expect(store.getState().userProfile).toEqual(before);
  expect(mockFlush).not.toHaveBeenCalled();
  expect(mockAssign).not.toHaveBeenCalled();
  // Switching state cleared: the trigger is usable again and shows the old entity.
  const trigger = screen.getByRole("button", { name: /Acting as/ });
  expect(trigger).not.toBeDisabled();
  expect(trigger).toHaveTextContent("Acting as Daikin HQ · Daikin India");
});

test("a failing persist flush rolls back token and profile, and the rollback's own failing flush does not throw", async () => {
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

test("a throwing done signal (storage blocked) still navigates: token and profile are already the new entity's", async () => {
  switchEntity.mockResolvedValue({ status: 1, data: { token: "tok-up", acting_entity_id: 11 } });
  getProfile.mockResolvedValue({ status: 1, data: { id: 11, network: network({ acting_entity_id: 11 }) } });
  storageInstance.setStorage.mockImplementation((key) => {
    if (key === "entity-switch-done") throw new Error("QuotaExceededError");
  });
  renderWith({ id: 10, name: "Daikin HQ", network: network() });
  fireEvent.click(screen.getByRole("button", { name: /Acting as/ }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: /Daikin UP/ }));

  await waitFor(() => expect(mockAssign).toHaveBeenCalledWith("/dashboard/vendor"));
  const { toast } = require("react-toastify");
  expect(toast.error).not.toHaveBeenCalled();
  storageInstance.setStorage.mockImplementation(() => {});
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
