// The device copy of an in-progress receipt, in IndexedDB, keyed
// `grn-draft:<poId>:<hotelId>` (spec §10.2: a dropped signal loses nothing).
// The server draft is the shared copy; this one covers the seconds between
// autosaves, and a draft create or post whose reply never came.
//
// Every call is best effort: no IndexedDB (jsdom, private mode, build-time
// evaluation) makes them no-ops, and nothing here touches `indexedDB` at
// module scope.

const DB_NAME = "workwise-inventory";
const STORE = "receive-drafts";
const VERSION = 1;

export const grnDraftKey = (poId, hotelId) => `grn-draft:${poId}:${hotelId}`;

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

/** @returns {Promise<object|null>} the saved copy, or null. */
export const loadLocalDraft = (key) => run("readonly", (s) => s.get(key));
/** Saves `{savedAt, draftId, sessionKey, header, entries}` under the key. */
export const saveLocalDraft = (key, value) => run("readwrite", (s) => s.put(value, key));
export const clearLocalDraft = (key) => run("readwrite", (s) => s.delete(key));
