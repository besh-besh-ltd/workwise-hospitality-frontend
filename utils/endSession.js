// Ends this browser's session: the keys of the DashboardShell logout, the persisted
// profile and the hospitality context. Shared by the vendor-network invite page, Leave
// network and the rate-contract guest notice.

import posthog from "@/lib/analytics";
import { persistor } from "@/redux/store";
import { clearUserProfile } from "@/redux/slice";
import storageInstance from "@/utils/storageInstance";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";

export const SESSION_STORAGE_KEYS = Object.freeze([
  "token",
  "current-user-type",
  "current-user-name",
  "current-user-email",
  "user-permissions",
  "guest-session",
]);

/**
 * @param dispatch  the Redux dispatch (the profile is cleared, then flushed to storage so a
 *                  reload never rehydrates it)
 * @param emitLoginStatusChanged  also tell this tab's Layout that the login state changed
 *                  ("loginStatusChanged"). A caller that hard-navigates next leaves it off:
 *                  the Layout would re-render the page without a token before the navigation.
 */
export async function endSession(dispatch, { emitLoginStatusChanged = false } = {}) {
  try { posthog.reset(); } catch (_) {}
  dispatch(clearUserProfile());
  SESSION_STORAGE_KEYS.forEach((key) => storageInstance.removeStorege(key));
  setStoredHospitalityContext(null);
  try { await persistor.flush(); } catch (_) {}
  if (emitLoginStatusChanged) window.dispatchEvent(new Event("loginStatusChanged"));
}

export default endSession;
