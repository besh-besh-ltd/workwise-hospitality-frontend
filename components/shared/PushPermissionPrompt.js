import { useEffect, useState } from "react";
import { getVapidPublicKey, subscribePush } from "@/services/Notifications";
import storageInstance from "@/utils/storageInstance";

const DISMISS_KEY = "pushPromptDismissedAt";
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(base64) : "";
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
};

const ensureSubscription = async () => {
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
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
  await subscribePush(subscription.toJSON());
  return subscription;
};

const PushPermissionPrompt = () => {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const token = storageInstance.getStorage("token");
    if (!token) return;

    const permission = Notification.permission;

    if (permission === "granted") {
      // Already granted but subscription may have rotated — re-register silently.
      ensureSubscription().catch(() => {});
      return;
    }

    if (permission === "denied") return;

    const dismissedAt = parseInt(storageInstance.getStorage(DISMISS_KEY) || "0", 10);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_WINDOW_MS) return;

    setShow(true);
  }, []);

  const onEnable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await ensureSubscription();
      } else {
        storageInstance.setStorage(DISMISS_KEY, String(Date.now()));
      }
    } catch (err) {
      // swallow — user can retry later from settings
    } finally {
      setBusy(false);
      setShow(false);
    }
  };

  const onDismiss = () => {
    storageInstance.setStorage(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        background: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
        padding: 16,
        maxWidth: 340,
        fontFamily: "inherit"
      }}
    >
      <div style={{ fontWeight: 600, color: "#111827", marginBottom: 6 }}>
        Stay on top of Purchase Orders
      </div>
      <div style={{ color: "#4B5563", fontSize: 14, marginBottom: 12 }}>
        Get instant browser alerts for PO approvals, acceptance and rejection events
        so nothing slips through email.
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "1px solid #D1D5DB",
            color: "#374151",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer"
          }}
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onEnable}
          disabled={busy}
          style={{
            background: "#3B82F6",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "6px 14px",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1
          }}
        >
          {busy ? "Enabling…" : "Enable"}
        </button>
      </div>
    </div>
  );
};

export default PushPermissionPrompt;
