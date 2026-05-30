import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import storageInstance from "@/utils/storageInstance";
import { ensurePushSubscription } from "@/utils/pushSubscription";
import styles from "./PushPermissionPrompt.module.css";

const DISMISS_KEY = "pushPromptDismissedAt";
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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
      ensurePushSubscription().catch(() => {});
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
        await ensurePushSubscription();
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
    <div className={styles.card} role="dialog" aria-label="Enable notifications">
      <div className={styles.row}>
        <span className={styles.icon}>
          <Bell size={15} strokeWidth={2} />
        </span>
        <div className={styles.body}>
          <div className={styles.title}>Never miss a critical update</div>
          <div className={styles.desc}>
            Get instant browser alerts for new RFQs, quote rounds, approvals, and purchase
            order actions — so important moves don&apos;t slip through your inbox.
          </div>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onDismiss}>
          Not now
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onEnable}
          disabled={busy}
        >
          {busy ? "Enabling…" : "Enable"}
        </button>
      </div>
    </div>
  );
};

export default PushPermissionPrompt;
