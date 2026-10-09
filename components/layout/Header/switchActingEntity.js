import { switchEntity } from "@/services/vendorNetwork";
import { getProfileAs } from "@/services/Auth";
import { setUserProfile } from "@/redux/slice";
import { persistor } from "@/redux/store";
import storageInstance from "@/utils/storageInstance";
import { hardNavigate } from "@/utils/hardNavigate";
import { markEntitySwitchDone } from "@/utils/sessionSync";

export const SWITCH_FAILED = "Could not switch entity. Please try again.";

// Same-origin app paths only ("/x", never "//host" or "/\host").
const isAppPath = (p) => typeof p === "string" && /^\/(?![/\\])/.test(p) && !/\s/.test(p);

/**
 * Act as another entity of the network, then HARD-navigate to `target`
 * (default the vendor dashboard). Shared by the header switcher and the
 * network pages' "Act as" actions.
 *
 * Order matters across tabs: every tab reads the one shared `token`. So the new
 * entity's profile (its `id` is now the new acting entity) is fetched WITH the
 * new token in an explicit header while the stored token is still the old one.
 * Only then are token, profile (flushed) and the done signal written back to
 * back. A failed fetch leaves storage untouched; a failed flush puts the
 * previous token and profile back. The session is never half-switched (server
 * acting as B, UI showing A).
 *
 * Resolves { ok: true } once navigation has started, or { ok: false, message }
 * with nothing changed.
 */
export async function switchActingEntity({ vendorId, profile, dispatch, target = "/dashboard/vendor" }) {
  let token;
  let newProfile;
  try {
    const res = await switchEntity(Number(vendorId));
    token = res?.data?.token;
    if (!token) throw new Error("No token");
  } catch (err) {
    return { ok: false, message: err?.response?.data?.message || SWITCH_FAILED };
  }
  try {
    // The stored token is still the old one: other tabs keep acting as it.
    newProfile = (await getProfileAs(token))?.data;
    if (!newProfile) throw new Error("No profile");
  } catch (_) {
    return { ok: false, message: SWITCH_FAILED };
  }
  const previousToken = storageInstance.getStorage("token");
  try {
    storageInstance.setStorage("token", token);
    dispatch(setUserProfile(newProfile));
    await persistor.flush();
  } catch (_) {
    // Roll back: keep acting as the entity the UI still shows.
    if (previousToken) storageInstance.setStorage("token", previousToken);
    else storageInstance.removeStorege("token");
    dispatch(setUserProfile(profile));
    try { await persistor.flush(); } catch (_) {}
    return { ok: false, message: SWITCH_FAILED };
  }
  // Only now tell other tabs. If the signal cannot be written (storage blocked),
  // this tab still moves on: its token and profile are already the new entity's.
  try { markEntitySwitchDone(); } catch (_) {}
  hardNavigate(isAppPath(target) ? target : "/dashboard/vendor");
  return { ok: true };
}

export default switchActingEntity;
