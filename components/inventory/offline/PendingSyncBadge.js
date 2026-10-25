import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import {
  OUTBOX_KIND_LABELS,
  dismissFailed,
  flush,
  useFailedItems,
  useOutboxAutoSync,
  usePendingCount,
} from "./outbox";
import styles from "./PendingSyncBadge.module.scss";

// What the device still owes the server, on every inventory screen: "Pending
// sync (N)" with Sync now, and the events the server refused after they were
// queued (kind, summary, the server's message, when) until dismissed. Renders
// nothing when the queue is empty. Mounted once, by DashboardShell, on the
// inventory routes; it also keeps the queue moving (useOutboxAutoSync).

const subscribeOnline = (cb) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
const onlineNow = () => typeof navigator === "undefined" || navigator.onLine !== false;
const useOnline = () => useSyncExternalStore(subscribeOnline, onlineNow, () => true);

const fmtWhen = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PendingSyncBadge = ({ autoSync = true }) => {
  const pending = usePendingCount();
  const failed = useFailedItems();
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [stuck, setStuck] = useState(false);
  const mounted = useRef(true);
  useOutboxAutoSync({ enabled: autoSync });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!pending) setStuck(false);
  }, [pending]);

  if (!pending && !failed.length) return null;

  const syncNow = async () => {
    setSyncing(true);
    setStuck(false);
    try {
      const res = await flush({ force: true });
      if (mounted.current) setStuck(res.pending > 0 && res.sent === 0);
    } catch {
      if (mounted.current) setStuck(true);
    } finally {
      if (mounted.current) setSyncing(false);
    }
  };

  return (
    <aside className={styles.dock} aria-label="Offline sync">
      {pending > 0 && (
        <div className={styles.pill} role="status" aria-live="polite">
          {online ? (
            <span className={`${styles.dot} ${styles.dotWarn}`} aria-hidden="true" />
          ) : (
            <CloudOff size={13} className={styles.offIcon} aria-hidden="true" />
          )}
          <span className={styles.label}>Pending sync ({pending})</span>
          {!online && <span className={styles.hint}>Offline: sends when you are back online</span>}
          {online && stuck && <span className={styles.hint}>Server not reachable yet: retrying</span>}
          <button type="button" className={styles.btn} onClick={syncNow} disabled={syncing || !online}>
            <RefreshCw size={13} className={syncing ? styles.spin : undefined} aria-hidden="true" />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      )}
      {failed.length > 0 && (
        <section className={styles.failed} aria-label="Not recorded">
          <header className={styles.failedHead}>
            <TriangleAlert size={13} aria-hidden="true" />
            <span>
              {failed.length === 1 ? "1 entry was not recorded" : `${failed.length} entries were not recorded`}
            </span>
          </header>
          <ul className={styles.failedList}>
            {failed.map((f) => (
              <li key={f.id} className={styles.failedItem}>
                <div className={styles.failedTop}>
                  <span className={styles.kind}>{OUTBOX_KIND_LABELS[f.kind] || f.kind}</span>
                  <span className={styles.when}>{fmtWhen(f.failedAt)}</span>
                </div>
                <div className={styles.summary}>{f.summary}</div>
                <div className={styles.message}>{f.error?.message || "The server did not record this."}</div>
                <button
                  type="button"
                  className={styles.dismiss}
                  onClick={() => dismissFailed(f.id)}
                  aria-label={`Dismiss ${f.summary || OUTBOX_KIND_LABELS[f.kind] || f.kind}`}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
};

export default PendingSyncBadge;
