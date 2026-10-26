import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import {
  OUTBOX_KIND_LABELS,
  discardPending,
  dismissFailed,
  flush,
  mayBeRecorded,
  outboxLinkFor,
  retryNow,
  useFailedItems,
  useOutboxAutoSync,
  useOutboxReady,
  usePendingItems,
} from "./outbox";
import styles from "./PendingSyncBadge.module.scss";

// What this device still owes the server, on every dashboard page of a
// signed-in, non-vendor session: a small chip ("Pending sync (N)", "N not
// recorded", "N may not be recorded") that opens a panel with
//   - each waiting event: what it is, why it is still waiting (offline, no
//     answer, the server's status), Retry now, Discard (with a confirm);
//   - each event the server refused (not recorded): its message, Open (the
//     screen that made it) and Discard (with a confirm);
//   - each event given up on after no answer or repeated server errors: the
//     server may have recorded it, so the panel says to open it and check, or
//     send it again (the same clientEventId: the server answers a repeat with
//     the original).
// Desktop: fixed bottom-right. Phone: in the page flow above the content, so
// it never covers a scan bar or a bottom sheet. A new failure opens the panel
// and is announced. Renders only the (empty) announcer when there is nothing
// to show. Mounted once by DashboardShell; it also keeps the queue moving
// (useOutboxAutoSync).

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

const kindLabel = (item) => OUTBOX_KIND_LABELS[item.kind] || item.kind;
const nameOf = (item) => item.summary || kindLabel(item);

const waitingWhy = (item, online) => {
  if (!online) return "Offline: sends when you are back online";
  const e = item.lastError;
  if (!e) return "Waiting to send";
  // A 401 mid-send: not recorded, and it goes once its owner signs in again.
  if (e.code === "SIGNED_OUT") return "Signed out before it was sent: sends when you sign in";
  if (e.httpStatus) return `The server answered ${e.httpStatus}: retrying`;
  return "No answer from the server yet: retrying";
};

/** Two kinds of failed item: refused (certain) and given up on (uncertain). */
const isUnsure = (item) => item.error?.uncertain === true;

const announce = (fresh) => {
  const unsure = fresh.filter(isUnsure).length;
  if (fresh.length === 1) {
    const [item] = fresh;
    return unsure
      ? `May not have been recorded: ${nameOf(item)}. Open it to check, or send it again.`
      : `Not recorded: ${nameOf(item)}. ${item.error?.message || "The server did not record this."}`;
  }
  if (!unsure) return `${fresh.length} entries were not recorded.`;
  if (unsure === fresh.length) return `${fresh.length} entries may not have been recorded.`;
  return `${fresh.length - unsure} entries were not recorded; ${unsure} may not have been.`;
};

const ConfirmDiscard = ({ question, onConfirm, onCancel, busy }) => (
  <div className={styles.confirm} role="group" aria-label={question}>
    <span className={styles.confirmText}>{question}</span>
    <div className={styles.actions}>
      <button type="button" className={styles.dangerBtn} onClick={onConfirm} disabled={busy}>
        Discard
      </button>
      <button type="button" className={styles.ghostBtn} onClick={onCancel} disabled={busy}>
        Keep
      </button>
    </div>
  </div>
);

const FailedGroup = ({ label, title, items, question, messageOf, detailOf, confirmId, busyId, onAsk, onDiscard }) => (
  <section className={styles.group} aria-label={label}>
    <header className={`${styles.groupHead} ${styles.groupHeadDanger}`}>
      <TriangleAlert size={13} aria-hidden="true" />
      <span className={styles.groupTitle}>{title}</span>
    </header>
    <ul className={styles.list}>
      {items.map((item) => {
        const href = outboxLinkFor(item);
        const detail = detailOf ? detailOf(item) : null;
        return (
          <li key={item.id} className={styles.item}>
            <div className={styles.itemTop}>
              <span className={styles.kind}>{kindLabel(item)}</span>
              <span className={styles.when}>{fmtWhen(item.failedAt)}</span>
            </div>
            <div className={styles.summary}>{item.summary}</div>
            <div className={styles.message}>{messageOf(item)}</div>
            {detail && <div className={styles.why}>{detail}</div>}
            {confirmId === item.id ? (
              <ConfirmDiscard
                question={question}
                busy={busyId === item.id}
                onConfirm={() => onDiscard(item)}
                onCancel={() => onAsk(null)}
              />
            ) : (
              <div className={styles.actions}>
                {href && (
                  <Link href={href} className={styles.linkBtn} aria-label={`Open ${nameOf(item)}`}>
                    Open
                  </Link>
                )}
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => onAsk(item.id)}
                  aria-label={`Discard ${nameOf(item)}`}
                >
                  Discard
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

const PendingSyncBadge = ({ autoSync = true }) => {
  const ready = useOutboxReady();
  const pending = usePendingItems();
  const failed = useFailedItems();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const seenFailed = useRef(null);
  const mounted = useRef(true);
  const panelId = useId();
  useOutboxAutoSync({ enabled: autoSync });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A failure that happens while this page is open opens the panel and is
  // announced; ones already stored when the page loaded only show in the chip.
  useEffect(() => {
    if (!ready) return;
    const ids = new Set(failed.map((f) => f.id));
    if (seenFailed.current === null) {
      seenFailed.current = ids;
      return;
    }
    const fresh = failed.filter((f) => !seenFailed.current.has(f.id));
    seenFailed.current = ids;
    if (!fresh.length) return;
    setOpen(true);
    setAnnouncement(announce(fresh));
  }, [failed, ready]);

  const pendingCount = pending.length;
  const refused = failed.filter((f) => !isUnsure(f));
  const unsure = failed.filter(isUnsure);
  const visible = pendingCount > 0 || failed.length > 0;
  const memoryOnly = pending.filter((i) => i.persisted === false).length;

  useEffect(() => {
    if (!visible) {
      setOpen(false);
      setConfirmId(null);
    }
  }, [visible]);

  const guard = async (id, work) => {
    setBusyId(id);
    try {
      await work();
    } catch {
      // the item keeps its state; the list shows what is left
    } finally {
      if (mounted.current) setBusyId(null);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await flush({ force: true });
    } catch {
      // each item shows its own last error
    } finally {
      if (mounted.current) setSyncing(false);
    }
  };

  const discard = (item, isFailed) =>
    guard(item.id, async () => {
      await (isFailed ? dismissFailed(item.id) : discardPending(item.id));
      if (mounted.current) setConfirmId(null);
    });

  return (
    <div className={styles.dock}>
      <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {visible && (
        <section className={`${styles.wrap} ${open ? styles.wrapOpen : ""}`} aria-label="Offline sync">
          <button
            type="button"
            className={`${styles.chip} ${failed.length ? styles.chipDanger : ""}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
          >
            {failed.length > 0 ? (
              <TriangleAlert size={14} className={styles.chipIconDanger} aria-hidden="true" />
            ) : online ? (
              <span className={`${styles.dot} ${styles.dotWarn}`} aria-hidden="true" />
            ) : (
              <CloudOff size={14} className={styles.offIcon} aria-hidden="true" />
            )}
            {pendingCount > 0 && <span className={styles.label}>Pending sync ({pendingCount})</span>}
            {pendingCount > 0 && refused.length > 0 && <span className={styles.sep} aria-hidden="true">·</span>}
            {refused.length > 0 && <span className={styles.labelDanger}>{refused.length} not recorded</span>}
            {pendingCount + refused.length > 0 && unsure.length > 0 && (
              <span className={styles.sep} aria-hidden="true">·</span>
            )}
            {unsure.length > 0 && <span className={styles.labelDanger}>{unsure.length} may not be recorded</span>}
            <ChevronDown size={14} className={`${styles.chev} ${open ? styles.chevOpen : ""}`} aria-hidden="true" />
          </button>

          {open && (
            <div id={panelId} className={styles.panel}>
              {pendingCount > 0 && (
                <section className={styles.group} aria-label="Waiting to sync">
                  <header className={styles.groupHead}>
                    <span className={styles.groupTitle}>Waiting to sync</span>
                    <button type="button" className={styles.btn} onClick={syncNow} disabled={syncing || !online}>
                      <RefreshCw size={13} className={syncing ? styles.spin : undefined} aria-hidden="true" />
                      {syncing ? "Syncing…" : "Sync now"}
                    </button>
                  </header>
                  {memoryOnly > 0 && (
                    <p className={styles.note}>
                      Kept on this page only: this browser could not save{" "}
                      {memoryOnly === 1 ? "one entry" : `${memoryOnly} entries`} on the device. Keep this tab open until{" "}
                      {memoryOnly === 1 ? "it sends" : "they send"}.
                    </p>
                  )}
                  <ul className={styles.list}>
                    {pending.map((item) => (
                      <li key={item.id} className={styles.item}>
                        <div className={styles.itemTop}>
                          <span className={styles.kind}>{kindLabel(item)}</span>
                          <span className={styles.when}>{fmtWhen(item.createdAt)}</span>
                        </div>
                        <div className={styles.summary}>{item.summary}</div>
                        <div className={styles.why}>
                          {waitingWhy(item, online)}
                          {item.persisted === false ? " · kept on this page only" : ""}
                        </div>
                        {confirmId === item.id ? (
                          <ConfirmDiscard
                            question={
                              mayBeRecorded(item)
                                ? "Discard it? It may already have been recorded; this device will stop sending it."
                                : "Discard it? It will not be sent."
                            }
                            busy={busyId === item.id}
                            onConfirm={() => discard(item, false)}
                            onCancel={() => setConfirmId(null)}
                          />
                        ) : (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.ghostBtn}
                              onClick={() => guard(item.id, () => retryNow(item.id))}
                              disabled={!online || busyId === item.id || syncing}
                              aria-label={`Retry now: ${nameOf(item)}`}
                            >
                              Retry now
                            </button>
                            <button
                              type="button"
                              className={styles.ghostBtn}
                              onClick={() => setConfirmId(item.id)}
                              aria-label={`Discard ${nameOf(item)}`}
                            >
                              Discard
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {refused.length > 0 && (
                <FailedGroup
                  label="Not recorded"
                  title={refused.length === 1 ? "1 entry was not recorded" : `${refused.length} entries were not recorded`}
                  items={refused}
                  question="Discard it? It was not recorded and will not be sent."
                  messageOf={(item) => item.error?.message || "The server did not record this."}
                  confirmId={confirmId}
                  busyId={busyId}
                  onAsk={setConfirmId}
                  onDiscard={(item) => discard(item, true)}
                />
              )}

              {unsure.length > 0 && (
                <FailedGroup
                  label="May not have been recorded"
                  title={
                    unsure.length === 1
                      ? "1 entry may not have been recorded"
                      : `${unsure.length} entries may not have been recorded`
                  }
                  items={unsure}
                  question="Discard it? It may already have been recorded; it will not be sent again."
                  messageOf={() => "May not have been recorded: open it to check, or send it again."}
                  detailOf={(item) => item.error?.message}
                  confirmId={confirmId}
                  busyId={busyId}
                  onAsk={setConfirmId}
                  onDiscard={(item) => discard(item, true)}
                />
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default PendingSyncBadge;
