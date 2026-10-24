// The device copy of a mark-out / return session, keyed `out-session:<hotelId>`
// (one open session per hotel). It lives in the same IndexedDB key-value
// store as the receive drafts (C1's draftStore), so a dropped signal or a
// reload loses nothing, and it is cleared once the session is posted.
//
// Saved value: {savedAt, hotelId, sessionKey, docType, departmentId,
//               requestedByName, lines:[{invItemId, displayName, itemCode, stockUom, qty, available}]}
// Every call is a no-op without IndexedDB.

import { clearLocalDraft, loadLocalDraft, saveLocalDraft } from "@/components/inventory/receive/draftStore";

export const outSessionKey = (hotelId) => `out-session:${hotelId}`;

/** @returns {Promise<object|null>} */
export const loadOutSession = (hotelId) => loadLocalDraft(outSessionKey(hotelId));
export const saveOutSession = (hotelId, session) => saveLocalDraft(outSessionKey(hotelId), session);
export const clearOutSession = (hotelId) => clearLocalDraft(outSessionKey(hotelId));
