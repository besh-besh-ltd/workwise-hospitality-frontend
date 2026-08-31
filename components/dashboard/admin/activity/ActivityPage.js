"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { BsArrowUp, BsDownload } from "react-icons/bs";
import { getActivity, getActivityFacets } from "@/services/activity";
import useActivityStream from "@/hooks/useActivityStream";
import Loader from "@/components/shared/Loader";
import ActivityFilters from "./ActivityFilters";
import ActivityRow from "./ActivityRow";
import ActivityRiskBar from "./ActivityRiskBar";
import { groupByDay } from "./activityPresentation";
import styles from "./Activity.module.css";

const POLL_MS = 30000;
const PAGE_SIZE = 50;

const FILTER_KEYS = [
  "q",
  "from",
  "to",
  "severity",
  "category",
  "hotel_id",
  "actor_user_id",
  "actor_type",
];

/**
 * Activity — everything that has happened, anywhere in the company.
 *
 * Filters live in the URL rather than in component state. A view of an audit
 * trail is something people send each other ("look at what happened to this
 * unit last Tuesday"), and Back should return you to the view you were reading
 * rather than to a default. It is the same durability the Hospitality Network
 * screen lacked.
 *
 * New entries arriving live are announced, not injected. Prepending rows under
 * someone who is mid-sentence moves the thing they are reading; a count they
 * can click respects that they are reading.
 */
const ActivityPage = () => {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pending, setPending] = useState(0);

  const filters = useMemo(() => {
    const out = {};
    for (const key of FILTER_KEYS) {
      const value = router.query[key];
      if (value) out[key] = Array.isArray(value) ? value[0] : value;
    }
    out.page = Number(router.query.page) || 1;
    return out;
  }, [router.query]);

  const queryRef = useRef(filters);
  queryRef.current = filters;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = { ...queryRef.current, limit: PAGE_SIZE };
      const res = await getActivity(params);
      setRows(res?.data?.rows || []);
      setTotal(res?.data?.total || 0);
      setLoadError(null);
      setPending(0);
    } catch (err) {
      setLoadError("Could not load activity.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Waits for router.isReady. Next.js leaves router.query empty until
  // hydration, so firing the fetch on mount asks for an UNFILTERED feed and
  // renders it — a link to ?severity=critical showed everything, and the tile
  // sat visibly pressed above a list that contradicted it. Client-side
  // navigation always worked, which is exactly why this survived: the bug
  // only appears on a cold load, and a shared or bookmarked link is always a
  // cold load.
  useEffect(() => {
    if (!router.isReady) return;
    load();
  }, [load, router.isReady, router.query]);

  useEffect(() => {
    getActivityFacets()
      .then((res) => setFacets(res?.data || {}))
      .catch(() => setFacets({}));
  }, []);

  // The floor. The socket below is an enhancement on top of this, not a
  // replacement — wherever websockets are not proxied through, the feed still
  // updates, just not instantly.
  useEffect(() => {
    const id = setInterval(() => {
      if (queryRef.current.page === 1) load({ silent: true });
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useActivityStream(
    useCallback(() => setPending((n) => n + 1), []),
    { enabled: true }
  );

  const applyFilters = useCallback(
    (next) => {
      const query = {};
      for (const [key, value] of Object.entries(next)) {
        if (value && !(key === "page" && value === 1)) query[key] = value;
      }
      router.push({ pathname: "/dashboard/admin/activity", query }, undefined, {
        shallow: true,
      });
    },
    [router]
  );

  const clearFilters = useCallback(() => {
    router.push({ pathname: "/dashboard/admin/activity" }, undefined, { shallow: true });
  }, [router]);

  const exportCsv = useCallback(() => {
    const header = [
      "When", "What happened", "Importance", "Area", "Who", "Kind", "Business unit", "Reconstructed",
    ];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      header.map(escape).join(","),
      ...rows.map((r) =>
        [
          r.occurred_at,
          r.summary,
          r.severity,
          r.category,
          r.actor_label,
          r.actor_type,
          r.hotel_id || "",
          r.is_reconstructed ? "yes" : "no",
        ]
          .map(escape)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const groups = useMemo(() => groupByDay(rows), [rows]);
  const page = filters.page || 1;
  const hasMore = page * PAGE_SIZE < total;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Activity</h1>
          <p className={styles.subtitle}>
            Everything that has happened across your business units — who did it,
            when, and what changed.
          </p>
        </div>
        <button
          type="button"
          className={styles.exportBtn}
          onClick={exportCsv}
          disabled={rows.length === 0}
        >
          <BsDownload size={13} /> Export this view
        </button>
      </header>

      <ActivityRiskBar
        severities={facets.severities}
        active={filters.severity}
        onSelect={(severity) => applyFilters({ ...filters, severity, page: 1 })}
      />

      <ActivityFilters
        filters={filters}
        facets={facets}
        onChange={applyFilters}
        onClear={clearFilters}
        resultCount={loading ? null : total}
      />

      <div className={styles.body}>
        <main className={styles.feed}>
          {pending > 0 && (
            <button type="button" className={styles.newPill} onClick={() => load()}>
              <BsArrowUp size={12} /> {pending} new{" "}
              {pending === 1 ? "entry" : "entries"} — show
            </button>
          )}

          {loadError && <div className={styles.errorBanner}>{loadError}</div>}

          {loading ? (
            <Loader />
          ) : rows.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>Nothing matches</h2>
              <p>
                No activity fits these filters. Try widening the dates, or clear
                the filters to see everything.
              </p>
            </div>
          ) : (
            <>
              {groups.map((group) => {
                const criticalToday = group.rows.filter(
                  (r) => r.severity === "critical"
                ).length;
                return (
                <section key={group.label} className={styles.dayGroup}>
                  <h2 className={styles.dayHeading}>
                    <span>{group.label}</span>
                    {/* Only shown when there is something to say. A "0
                        critical" on every quiet day trains the eye to skip the
                        place the number appears. */}
                    {criticalToday > 0 && (
                      <span className={styles.dayCritical}>
                        {criticalToday} critical
                      </span>
                    )}
                  </h2>
                  <ul className={styles.rows}>
                    {group.rows.map((event) => (
                      <ActivityRow key={event.id} event={event} />
                    ))}
                  </ul>
                </section>
                );
              })}

              <nav className={styles.pager}>
                <button
                  type="button"
                  className={styles.pagerBtn}
                  disabled={page <= 1}
                  onClick={() => applyFilters({ ...filters, page: page - 1 })}
                >
                  Newer
                </button>
                <span className={styles.pagerState}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{" "}
                  {total.toLocaleString()}
                </span>
                <button
                  type="button"
                  className={styles.pagerBtn}
                  disabled={!hasMore}
                  onClick={() => applyFilters({ ...filters, page: page + 1 })}
                >
                  Older
                </button>
              </nav>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ActivityPage;
