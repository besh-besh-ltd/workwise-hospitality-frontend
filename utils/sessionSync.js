import storageInstance from "@/utils/storageInstance";

/**
 * Cross-tab session sync for vendor networks.
 *
 * Switching the acting entity in one tab rewrites the shared `token` and, once
 * the new profile is fetched and persisted, the shared redux-persist profile.
 * Other tabs showing a network profile must then reload to pick both up.
 *
 * They must NOT reload on the token change itself: the token is written before
 * the profile is fetched and flushed, so a reload at that moment would
 * rehydrate the OLD persisted profile with the NEW token. The switching tab
 * therefore writes a separate completion signal, ENTITY_SWITCH_DONE_KEY, only
 * after token + profile + flush all succeeded (never on rollback), and other
 * tabs reload on a change to that key alone.
 */
export const ENTITY_SWITCH_DONE_KEY = "entity-switch-done";

/** Announce a completed switch to other tabs. A fresh nonce, so every switch changes the value. */
export const markEntitySwitchDone = () => {
  storageInstance.setStorage(
    ENTITY_SWITCH_DONE_KEY,
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
};

/** True when another tab completed a switch and this tab shows a network profile. */
export const entitySwitchNeedsReload = (event, profile) =>
  !!event &&
  event.key === ENTITY_SWITCH_DONE_KEY &&
  !!event.newValue &&
  event.newValue !== event.oldValue &&
  !!profile?.network;

/**
 * True when a persisted vendor profile predates vendor networks: get-profile
 * now always sends `network` (null when in no network), so a vendor profile
 * WITHOUT the key was stored by an older build and every `network === null`
 * gate misreads it until it is refetched. Not for guest emailed-link sessions.
 */
export const profileNeedsNetworkRefresh = (profile, isGuest) =>
  !!profile &&
  Number(profile.user_type) === 3 &&
  !Object.prototype.hasOwnProperty.call(profile, "network") &&
  !isGuest;
