// The device copies of mark-out / return sessions, per signed-in user, in the
// same IndexedDB key-value store as the receive drafts (C1's draftStore), so a
// dropped signal or a reload loses nothing.
//
//   out-session:<userId>:<hotelId>        the open session at a hotel (one per
//                                         user and hotel), from its first line
//                                         until it is recorded or handed to the
//                                         outbox. status "open" | "uncertain".
//   out-queued:<userId>:<clientEventId>   a session the outbox is holding: the
//                                         lines as the screen showed them, kept
//                                         until the outbox says "sent", or the
//                                         user takes it back.
//   out-queued-index:<userId>             [{clientEventId, hotelId, queuedAt}],
//                                         so the queued copies can be listed.
//
// Every value carries its owner's userId and is only ever returned to that
// user: a session belonging to someone else on this device is never shown,
// posted or cleared. Without a userId, or without IndexedDB, every call is a
// no-op.
//
// Open session: {userId, savedAt, hotelId, sessionKey, docType, departmentId,
//   requestedByName, lines:[{invItemId, displayName, itemCode, stockUom, qty,
//   exact, available, confirmedQty}], status, sentPayload?, lastError?}
// Queued copy: the same fields plus {clientEventId, departmentName, queuedAt,
//   sentPayload}.

import { clearLocalDraft, loadLocalDraft, saveLocalDraft } from "@/components/inventory/receive/draftStore";

const uid = (userId) => (userId === undefined || userId === null || userId === "" ? null : String(userId));

export const outSessionKey = (userId, hotelId) => `out-session:${uid(userId)}:${hotelId}`;
export const outQueuedKey = (userId, clientEventId) => `out-queued:${uid(userId)}:${clientEventId}`;
const indexKey = (userId) => `out-queued-index:${uid(userId)}`;

const owned = (value, userId) => (value && typeof value === "object" && uid(value.userId) === uid(userId) ? value : null);

// ── The open session ─────────────────────────────────────────────────────────

/** @returns {Promise<object|null>} this user's open session at the hotel. */
export const loadOutSession = async (userId, hotelId) => {
  if (!uid(userId) || !hotelId) return null;
  return owned(await loadLocalDraft(outSessionKey(userId, hotelId)), userId);
};
export const saveOutSession = (userId, hotelId, session) =>
  uid(userId) && hotelId ? saveLocalDraft(outSessionKey(userId, hotelId), { ...session, userId: uid(userId) }) : Promise.resolve(null);
export const clearOutSession = (userId, hotelId) =>
  uid(userId) && hotelId ? clearLocalDraft(outSessionKey(userId, hotelId)) : Promise.resolve(null);
/** Clear the open session only while it is still the one under `sessionKey` (a newer one stays). */
export const clearOutSessionIf = async (userId, hotelId, sessionKey) => {
  const cur = await loadOutSession(userId, hotelId);
  if (cur && (cur.sessionKey || cur.clientEventId) === sessionKey) await clearOutSession(userId, hotelId);
  return null;
};

// ── Queued copies ────────────────────────────────────────────────────────────
// Index updates are read-modify-write, so they run one at a time in this tab.
let chain = Promise.resolve();
const serial = (work) => {
  const run = chain.then(work, work);
  chain = run.catch(() => {});
  return run;
};

const readIndex = async (userId) => {
  const value = owned(await loadLocalDraft(indexKey(userId)), userId);
  return Array.isArray(value?.entries) ? value.entries.filter((e) => e && e.clientEventId) : [];
};
const writeIndex = (userId, entries) =>
  entries.length
    ? saveLocalDraft(indexKey(userId), { userId: uid(userId), entries })
    : clearLocalDraft(indexKey(userId));

/** @returns {Promise<Array<{clientEventId, hotelId, queuedAt}>>} this user's queued copies, oldest first. */
export const listQueuedOuts = (userId) => (uid(userId) ? serial(() => readIndex(userId)) : Promise.resolve([]));

/** @returns {Promise<object|null>} one of this user's queued copies. */
export const loadQueuedOut = async (userId, clientEventId) => {
  if (!uid(userId) || !clientEventId) return null;
  return owned(await loadLocalDraft(outQueuedKey(userId, clientEventId)), userId);
};

/** Keep a queued copy (the copy first, then its index entry). */
export const saveQueuedOut = (userId, copy) => {
  if (!uid(userId) || !copy?.clientEventId) return Promise.resolve(null);
  const value = { ...copy, userId: uid(userId) };
  return serial(async () => {
    await saveLocalDraft(outQueuedKey(userId, copy.clientEventId), value);
    const entries = (await readIndex(userId)).filter((e) => e.clientEventId !== copy.clientEventId);
    entries.push({ clientEventId: copy.clientEventId, hotelId: Number(copy.hotelId), queuedAt: copy.queuedAt || Date.now() });
    await writeIndex(userId, entries);
    return value;
  });
};

/** Forget a queued copy (its index entry first, then the copy). */
export const clearQueuedOut = (userId, clientEventId) => {
  if (!uid(userId) || !clientEventId) return Promise.resolve(null);
  return serial(async () => {
    const entries = await readIndex(userId);
    const rest = entries.filter((e) => e.clientEventId !== clientEventId);
    if (rest.length !== entries.length) await writeIndex(userId, rest);
    await clearLocalDraft(outQueuedKey(userId, clientEventId));
    return null;
  });
};
