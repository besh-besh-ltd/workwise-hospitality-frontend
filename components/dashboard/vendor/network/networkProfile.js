// The profile is persisted by redux-persist and fetched only at login, so a
// change to the vendor's network (set up, joined) must refetch it, or the nav,
// the entity switcher and these pages keep the old `network`.

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { getProfile } from "@/services/Auth";
import { isGuestSession } from "@/utils/guestSession";
import { setUserProfile } from "@/redux/slice";
import { persistor } from "@/redux/store";

export async function refreshNetworkProfile(dispatch) {
  const res = await getProfile();
  if (!res?.data) throw new Error("No profile");
  dispatch(setUserProfile(res.data));
  await persistor.flush();
  return res.data;
}

export const isNetworkAdmin = (profile) => profile?.network?.role === "ORG_ADMIN";

/**
 * The profile as the network pages should read it.
 *
 * A vendor profile persisted before vendor networks has no `network` key; the
 * layout refetches it once per load. Until that refetch settles, `pending` is
 * true (render a loading state, not a guess). Once it has settled, success or
 * failure, a still-absent key reads as `network: null` for rendering only: the
 * stored profile is untouched, so the refetch is tried again on the next load.
 */
export function useNetworkProfile() {
  const profile = useSelector((state) => state.userProfile);
  const settled = useSelector((state) => state.networkProfileRefreshSettled);
  const legacy = !!profile && Number(profile.user_type) === 3 && profile.network === undefined;
  const pending = legacy && !settled && !isGuestSession();
  const effective = useMemo(
    () => (legacy && !pending ? { ...profile, network: null } : profile),
    [profile, legacy, pending]
  );
  return { profile: effective, pending };
}
