import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUserProfile } from "@/redux/slice";
import { seedBrowserSession, userProfileFor, getPersona } from "@/lib/ihgSession";

/**
 * Puts the signed-in persona where the forked portal already looks for it.
 *
 * The real app fetches `getProfile()` after login and keeps the result in
 * Redux; on a page refresh it relies on redux-persist. Neither happens here,
 * because there is no auth API — so on every mount we ask our own
 * `/api/auth/me` who the cookie says we are, and seed Redux and localStorage
 * from that. Screens, hooks and RBAC checks then behave exactly as they do in
 * production.
 */
const SessionBootstrap = () => {
  const dispatch = useDispatch();
  const userProfile = useSelector((state) => state.userProfile);

  useEffect(() => {
    if (userProfile?.id) return; // already restored by redux-persist
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return; // signed out — middleware handles the redirect
        const { persona } = await res.json();
        const full = getPersona(persona?.id);
        if (!full || cancelled) return;
        seedBrowserSession(full);
        dispatch(setUserProfile(userProfileFor(full)));
        // The shell listens for this to swap out of its signed-out state.
        window.dispatchEvent(new Event("loginStatusChanged"));
      } catch (_) {
        /* offline or signed out — nothing useful to do */
      }
    })();

    return () => { cancelled = true; };
  }, [dispatch, userProfile?.id]);

  return null;
};

export default SessionBootstrap;
