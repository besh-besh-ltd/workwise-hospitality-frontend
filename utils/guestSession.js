import storageInstance from "@/utils/storageInstance";

/**
 * True when the stored session token is a guest token: the short-lived JWT
 * minted for an emailed vendor link (backend jwtHelper.signGuestAccessToken
 * sets `guest: true`). Read from the token itself rather than the
 * `guest-session` localStorage flag, which is never cleared on a later
 * normal login. Any unreadable token counts as not-guest.
 */
export const isGuestSession = () => {
  const token = storageInstance.getStorage("token");
  if (!token || typeof token !== "string") return false;
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(window.atob(padded))?.guest === true;
  } catch (_) {
    return false;
  }
};
