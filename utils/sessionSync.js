/**
 * Cross-tab session sync for vendor networks.
 *
 * Switching the acting entity in one tab rewrites the shared `token` in
 * localStorage. Another tab that is still showing a network profile would keep
 * running with the NEW token (every request now acts as the other entity) and
 * the OLD in-memory profile (UI still shows the old one). That tab must reload
 * so it rehydrates the profile the switching tab persisted.
 *
 * Only a token REPLACED by another token counts: a logout (newValue null) and
 * a first login are handled by the existing login-status listener, and a
 * vendor in no network has nothing to switch.
 */
export const tokenSwapNeedsReload = (event, profile) =>
  !!event &&
  event.key === "token" &&
  !!event.newValue &&
  !!event.oldValue &&
  event.newValue !== event.oldValue &&
  !!profile?.network;
