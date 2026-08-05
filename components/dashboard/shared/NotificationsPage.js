import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import moment from "moment";
import {
  Bell, Check, CheckCheck, ArrowUpRight, Loader2,
  CircleDot, MailOpen, Search,
} from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/Notifications";
import styles from "./NotificationsPage.module.scss";

const PAGE_SIZE = 20;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

// Group items into "Today", "Yesterday", "Earlier This Week", "Older" buckets.
// Keeps the scan-friendly digest feel without showing a date label per row.
const groupByPeriod = (items) => {
  const today = moment().startOf("day");
  const yesterday = today.clone().subtract(1, "day");
  const weekAgo = today.clone().subtract(7, "days");
  const groups = { Today: [], Yesterday: [], "This week": [], Older: [] };
  for (const n of items) {
    const t = n.created_at ? moment(n.created_at) : null;
    if (!t || !t.isValid()) {
      groups.Older.push(n);
      continue;
    }
    if (t.isSameOrAfter(today)) groups.Today.push(n);
    else if (t.isSameOrAfter(yesterday)) groups.Yesterday.push(n);
    else if (t.isSameOrAfter(weekAgo)) groups["This week"].push(n);
    else groups.Older.push(n);
  }
  return groups;
};

const formatRelative = (iso) => {
  if (!iso) return "";
  const t = moment(iso);
  if (!t.isValid()) return "";
  const diffMin = moment().diff(t, "minutes");
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = moment().diff(t, "hours");
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = moment().diff(t, "days");
  if (diffDay < 7) return `${diffDay}d ago`;
  return t.format("DD MMM");
};

const NotificationsPage = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchPage = useCallback(
    async (p, opts = {}) => {
      const isFirst = p === 1;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      try {
        const resp = await listNotifications(p, PAGE_SIZE);
        const next = Array.isArray(resp?.data) ? resp.data : [];
        setItems((curr) => (isFirst ? next : [...curr, ...next]));
        if (next.length < PAGE_SIZE) setDone(true);
      } catch (_) {
        setDone(true);
      } finally {
        if (isFirst) setLoading(false);
        else setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleItemClick = useCallback(
    async (n) => {
      if (!n.is_read) {
        setItems((curr) =>
          curr.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))
        );
        markNotificationRead(n.id).catch(() => {});
      }
      if (n.action_url) {
        try {
          const url = new URL(n.action_url, window.location.origin);
          if (url.origin === window.location.origin) {
            router.push(url.pathname + url.search + url.hash);
          } else {
            window.location.href = n.action_url;
          }
        } catch (_) {
          router.push(n.action_url);
        }
      }
    },
    [router]
  );

  const handleMarkAll = useCallback(async () => {
    setItems((curr) => curr.map((x) => ({ ...x, is_read: 1 })));
    try {
      await markAllNotificationsRead();
    } catch (_) {}
  }, []);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }, [page, fetchPage]);

  // Filter + search the local list. Server pagination still applies; we
  // filter the already-loaded buffer so "Load more" stays consistent.
  const visible = useMemo(() => {
    let out = items;
    if (filter === "unread") out = out.filter((n) => !n.is_read);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.message || "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [items, filter, search]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items]
  );
  const groups = useMemo(() => groupByPeriod(visible), [visible]);
  const groupOrder = ["Today", "Yesterday", "This week", "Older"];

  return (
    <>
      <Head>
        <title>Notifications | Workwise</title>
      </Head>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Notifications</h1>
            <p className={styles.subtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread · the latest first`
                : "You're all caught up."}
            </p>
          </div>
          <button
            type="button"
            className={styles.markAllBtn}
            onClick={handleMarkAll}
            disabled={unreadCount === 0}
            title="Mark all notifications as read"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup} role="tablist" aria-label="Filter">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={`${styles.filterBtn} ${
                  filter === f.key ? styles.filterBtnActive : ""
                }`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key === "unread" && unreadCount > 0 && (
                  <span className={styles.filterCount}>{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          /* Skeleton mirrors the real list layout: a faux group label
             followed by a card containing rows that match the production
             row geometry (icon + title + 2-line message + time pip + arrow).
             Two faux groups so the rhythm of "Today + Yesterday" reads
             without revealing actual content. */
          <div className={styles.list} aria-hidden="true">
            {["__skg1", "__skg2"].map((g, gIdx) => (
              <section key={g} className={styles.group}>
                <div className={styles.groupLabel}>
                  <span className={styles.skeletonLabel} />
                </div>
                <ul className={styles.groupItems}>
                  {Array.from({ length: gIdx === 0 ? 3 : 2 }).map((_, i) => (
                    <li key={i} className={styles.row}>
                      <div className={styles.rowBtn}>
                        <span
                          className={`${styles.rowIcon} ${styles.skeletonShimmer}`}
                        />
                        <div className={styles.rowBody}>
                          <div className={styles.rowHead}>
                            <span
                              className={`${styles.skeletonLine} ${styles.skeletonTitle} ${styles.skeletonShimmer}`}
                            />
                            <span
                              className={`${styles.skeletonLine} ${styles.skeletonTime} ${styles.skeletonShimmer}`}
                            />
                          </div>
                          <div
                            className={`${styles.skeletonLine} ${styles.skeletonMsg} ${styles.skeletonShimmer}`}
                          />
                          <div
                            className={`${styles.skeletonLine} ${styles.skeletonMsgShort} ${styles.skeletonShimmer}`}
                          />
                        </div>
                        <span
                          className={`${styles.rowArrow} ${styles.skeletonArrow} ${styles.skeletonShimmer}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <MailOpen size={20} />
            </span>
            <p className={styles.emptyTitle}>
              {items.length === 0
                ? "Nothing here yet"
                : filter === "unread"
                ? "No unread notifications"
                : "No matches"}
            </p>
            <p className={styles.emptyHint}>
              {items.length === 0
                ? "Updates about your RFQs, POs and approvals will appear here."
                : filter === "unread"
                ? "Switch to All to see what you've already cleared."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {groupOrder.map((label) => {
              const rows = groups[label];
              if (!rows || rows.length === 0) return null;
              return (
                <section key={label} className={styles.group}>
                  <div className={styles.groupLabel}>{label}</div>
                  <ul className={styles.groupItems}>
                    {rows.map((n) => (
                      <li
                        key={n.id}
                        className={`${styles.row} ${
                          n.is_read ? "" : styles.rowUnread
                        }`}
                      >
                        <button
                          type="button"
                          className={styles.rowBtn}
                          onClick={() => handleItemClick(n)}
                        >
                          <span
                            className={`${styles.rowIcon} ${
                              n.is_read ? "" : styles.rowIconUnread
                            }`}
                          >
                            {n.is_read ? <Bell size={13} /> : <CircleDot size={13} />}
                          </span>
                          <div className={styles.rowBody}>
                            <div className={styles.rowHead}>
                              <span className={styles.rowTitle}>{n.title}</span>
                              <span className={styles.rowTime}>
                                {formatRelative(n.created_at)}
                              </span>
                            </div>
                            {n.message && (
                              <div className={styles.rowMessage}>{n.message}</div>
                            )}
                          </div>
                          {n.action_url && (
                            <span className={styles.rowArrow} aria-hidden="true">
                              <ArrowUpRight size={14} />
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <div className={styles.footer}>
              {!done && (
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={13} className={styles.spinner} /> Loading…
                    </>
                  ) : (
                    "Load more"
                  )}
                </button>
              )}
              {done && (
                <span className={styles.footerCaught}>
                  <Check size={12} /> You're all caught up
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPage;
