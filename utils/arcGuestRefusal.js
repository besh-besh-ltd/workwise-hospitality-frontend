// A rate-contract request refused to an emailed-link guest session (Task 26).
//
// The backend refuses every vendor ARC endpoint, read or write, to the 30-minute guest
// session minted from an RFQ email link: 403 { reason: "GUEST_SESSION" }. The shared
// axios instance notes such a refusal for an /arc-v2/ request (lib/axios.js), and a page
// loader that catches one notes it too; RateContractGuestGate, mounted by the dashboard
// layout, then shows the sign-in notice in place of the rate-contract page. One flag for
// the tab, cleared when the page changes or the guest signs in.

import { useSyncExternalStore } from "react";

export const GUEST_SESSION_REASON = "GUEST_SESSION";

// services/*.js reject either with the AxiosError or with { message: AxiosError }.
const responseOf = (err) => err?.response || err?.message?.response || null;

/** True for the backend's 403 { reason: "GUEST_SESSION" }, raw or wrapped. */
export function isGuestSessionRefusal(err) {
  const res = responseOf(err);
  return res?.status === 403 && res?.data?.reason === GUEST_SESSION_REASON;
}

let refused = false;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Notes `err` when it is a guest-session refusal; returns whether it was one. */
export function noteArcGuestRefusal(err) {
  if (!isGuestSessionRefusal(err)) return false;
  if (!refused) {
    refused = true;
    emit();
  }
  return true;
}

export function clearArcGuestRefusal() {
  if (!refused) return;
  refused = false;
  emit();
}

/** Whether a rate-contract request was refused to this guest session (outside React). */
export const isArcGuestRefused = () => refused;

/** The same, as a hook that re-renders when it changes. */
export function useArcGuestRefusal() {
  return useSyncExternalStore(subscribe, isArcGuestRefused, () => false);
}

export default { isGuestSessionRefusal, noteArcGuestRefusal, clearArcGuestRefusal, isArcGuestRefused, useArcGuestRefusal };
