jest.mock("@/utils/storageInstance", () => ({ __esModule: true, default: { setStorage: jest.fn() } }));

import storageInstance from "@/utils/storageInstance";
import { ENTITY_SWITCH_DONE_KEY, entitySwitchNeedsReload, markEntitySwitchDone } from "./sessionSync";

const done = { key: ENTITY_SWITCH_DONE_KEY, oldValue: "1-a", newValue: "2-b" };
const networkProfile = { id: 10, network: { role: "ORG_ADMIN", acting_entity_id: 10 } };

test("a completed switch in another tab reloads a tab showing a network profile", () => {
  expect(ENTITY_SWITCH_DONE_KEY).toBe("entity-switch-done");
  expect(entitySwitchNeedsReload(done, networkProfile)).toBe(true);
  expect(entitySwitchNeedsReload({ ...done, oldValue: null }, networkProfile)).toBe(true); // first switch ever
});

test("a token-only change never reloads: the profile may not be persisted yet", () => {
  expect(entitySwitchNeedsReload({ key: "token", oldValue: "tok-hq", newValue: "tok-up" }, networkProfile)).toBe(false);
});

test("no network profile, a cleared key, an unchanged value or another key is left alone", () => {
  expect(entitySwitchNeedsReload(done, { id: 10, network: null })).toBe(false);
  expect(entitySwitchNeedsReload(done, null)).toBe(false);
  expect(entitySwitchNeedsReload({ ...done, newValue: null }, networkProfile)).toBe(false);
  expect(entitySwitchNeedsReload({ ...done, newValue: "1-a" }, networkProfile)).toBe(false);
  expect(entitySwitchNeedsReload({ key: null }, networkProfile)).toBe(false);
});

test("each mark writes a fresh nonce", () => {
  markEntitySwitchDone();
  markEntitySwitchDone();
  const [[k1, v1], [k2, v2]] = storageInstance.setStorage.mock.calls;
  expect(k1).toBe(ENTITY_SWITCH_DONE_KEY);
  expect(k2).toBe(ENTITY_SWITCH_DONE_KEY);
  expect(v1).not.toBe(v2);
});
