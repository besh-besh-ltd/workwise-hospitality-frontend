import { tokenSwapNeedsReload } from "./sessionSync";

const swap = { key: "token", oldValue: "tok-hq", newValue: "tok-up" };
const networkProfile = { id: 10, network: { role: "ORG_ADMIN", acting_entity_id: 10 } };

test("another tab swapping the token while this tab shows a network profile needs a reload", () => {
  expect(tokenSwapNeedsReload(swap, networkProfile)).toBe(true);
});

test("a vendor in no network, or no profile yet, is left alone", () => {
  expect(tokenSwapNeedsReload(swap, { id: 10, network: null })).toBe(false);
  expect(tokenSwapNeedsReload(swap, null)).toBe(false);
});

test("logout, first login, unchanged token and other keys are not a swap", () => {
  expect(tokenSwapNeedsReload({ ...swap, newValue: null }, networkProfile)).toBe(false);
  expect(tokenSwapNeedsReload({ ...swap, oldValue: null }, networkProfile)).toBe(false);
  expect(tokenSwapNeedsReload({ ...swap, newValue: "tok-hq" }, networkProfile)).toBe(false);
  expect(tokenSwapNeedsReload({ ...swap, key: "persist:root" }, networkProfile)).toBe(false);
  expect(tokenSwapNeedsReload({ key: null }, networkProfile)).toBe(false);
});
