// The profile is persisted by redux-persist and fetched only at login, so a
// change to the vendor's network (set up, joined) must refetch it, or the nav,
// the entity switcher and these pages keep the old `network`.

import { getProfile } from "@/services/Auth";
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
