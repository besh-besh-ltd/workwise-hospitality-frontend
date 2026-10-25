// The device copy of a receipt, against fake-indexeddb: one per user.
const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
const { IDBFactory } = require("fake-indexeddb");

let mockProfile = { id: 407 };
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { getState: () => ({ userProfile: mockProfile }) },
}));

import { clearLocalDraft, draftOwnerId, grnDraftKey, loadLocalDraft, saveLocalDraft } from "../draftStore";

beforeAll(() => {
  globalThis.indexedDB = new IDBFactory();
});

beforeEach(() => {
  mockProfile = { id: 407 };
});

it("keys a copy by the signed-in user, PO and hotel; no user, no key", () => {
  expect(draftOwnerId()).toBe("407");
  expect(grnDraftKey(draftOwnerId(), 52, 46)).toBe("grn-draft:407:52:46");
  mockProfile = null;
  expect(draftOwnerId()).toBeNull();
  expect(grnDraftKey(draftOwnerId(), 52, 46)).toBeNull();
});

it("returns a copy only to its owner", async () => {
  const key = grnDraftKey("407", 52, 46);
  await saveLocalDraft(key, { ownerId: "407", savedAt: 1, sessionKey: "k1", entries: { 11: { received: "3" } } });
  await expect(loadLocalDraft(key, "407")).resolves.toMatchObject({ sessionKey: "k1" });
  await expect(loadLocalDraft(key, "999")).resolves.toBeNull();
  await expect(loadLocalDraft(key, null)).resolves.toBeNull();

  // Another user's receipt for the same PO and hotel lives under its own key.
  await expect(loadLocalDraft(grnDraftKey("999", 52, 46), "999")).resolves.toBeNull();
  // A copy without an owner (the older per-PO key format) is never resumed.
  await saveLocalDraft("grn-draft:52:46", { savedAt: 1, sessionKey: "old" });
  await expect(loadLocalDraft("grn-draft:52:46", "407")).resolves.toBeNull();

  await clearLocalDraft(key);
  await expect(loadLocalDraft(key, "407")).resolves.toBeNull();
});

it("does nothing without a key", async () => {
  await expect(saveLocalDraft(null, { ownerId: "407" })).resolves.toBeNull();
  await expect(loadLocalDraft(null, "407")).resolves.toBeNull();
  await expect(clearLocalDraft(null)).resolves.toBeNull();
});
