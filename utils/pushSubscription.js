// Shared push-subscription helpers — used by both the bottom-right permission
// prompt and the "Enable" button inside the notification dropdown banner.

import { getVapidPublicKey, subscribePush } from "@/services/Notifications";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(base64) : "";
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
};

// Register / refresh the browser's push subscription with the server. Returns the
// subscription object (or null when the environment can't support push). Safe to
// call repeatedly — re-registers a rotated subscription silently.
export const ensurePushSubscription = async () => {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await subscribePush(existing.toJSON()).catch(() => {});
    return existing;
  }

  let publicKey = process.env.NEXT_PUBLIC_SERVICEWORKER_PUBLIC_KEY;
  try {
    const resp = await getVapidPublicKey();
    if (resp && resp.data && resp.data.publicKey) publicKey = resp.data.publicKey;
  } catch (_) {}
  if (!publicKey) return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await subscribePush(subscription.toJSON());
  return subscription;
};
