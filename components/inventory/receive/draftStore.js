// The device copy of an in-progress receipt, in IndexedDB, keyed
// `grn-draft:<userId>:<poId>:<hotelId>` (spec §10.2: a dropped signal loses
// nothing). The server draft is the shared copy; this one covers the seconds
// between autosaves, and a draft create or post whose reply never came.
//
// Per user: on a shared device the next person to sign in never resumes (or
// reuses the session key of) someone else's receipt. A copy also records its
// owner, and one whose owner is not the reader is ignored. Copies under the
// older `grn-draft:<poId>:<hotelId>` keys are never read again.
//
// Every call is best effort: no IndexedDB (jsdom, private mode, build-time
// evaluation) makes them no-ops, and nothing here touches `indexedDB` at
// module scope.

import { store } from "@/redux/store";

const DB_NAME = "workwise-inventory";
const STORE = "receive-drafts";
const VERSION = 1;

/** The signed-in user (redux) whose device copies these are; null when nobody is. */
export const draftOwnerId = () => {
  try {
    const id = store.getState()?.userProfile?.id;
    return id === undefined || id === null || id === "" ? null : String(id);
  } catch {
    return null;
  }
};

/** The device-copy key; null without a user (then nothing is kept on the device). */
export const grnDraftKey = (userId, poId, hotelId) =>
  userId === undefined || userId === null || userId === "" ? null : `grn-draft:${userId}:${poId}:${hotelId}`;

const available = () => typeof indexedDB !== "undefined" && indexedDB !== null;

let dbPromise = null;
const openDb = () => {
  if (!available()) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    }).then((db) => {
      if (!db) dbPromise = null; // try again next time
      return db;
    });
  }
  return dbPromise;
};

const run = async (mode, fn) => {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result ?? null);
      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

/** @returns {Promise<object|null>} the saved copy when `ownerId` owns it, or null. */
export const loadLocalDraft = async (key, ownerId) => {
  if (!key || ownerId === undefined || ownerId === null) return null;
  const value = await run("readonly", (s) => s.get(key));
  return value && String(value.ownerId) === String(ownerId) ? value : null;
};
/** Saves `{ownerId, savedAt, draftId, sessionKey, header, entries}` under the key. */
export const saveLocalDraft = (key, value) => (key ? run("readwrite", (s) => s.put(value, key)) : Promise.resolve(null));
export const clearLocalDraft = (key) => (key ? run("readwrite", (s) => s.delete(key)) : Promise.resolve(null));
