import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronLeft, ChevronRight, ClipboardCheck, EyeOff, Plus, RotateCcw } from "lucide-react";
import { getStock, listCounts } from "@/services/inventory";
import usePermittedHotels from "@/components/inventory/stock/usePermittedHotels";
import { getApiErrorMessage } from "@/utils/apiError";
import StartCountModal from "./StartCountModal";
import { SCOPE_LABEL, countPath, fmtDate, statusMeta } from "./countUtils";
import styles from "./counts.module.scss";

// /dashboard/buyer/inventory/counts: every count at the hotels the user can
// read (the server filters), newest first, with status and hotel filters and
// "Start count" for users who hold inventory.create. The start modal lists only
// the hotels where they hold it.

const PAGE_SIZE = 50;
const STATUS_TABS = [
  ["", "All"],
  ["open", "Counting"],
  ["submitted", "Awaiting approval"],
  ["approved", "Approved"],
  ["cancelled", "Cancelled"],
];

const CountsList = () => {
  const router = useRouter();
  const [hotels, setHotels] = useState(null);
  const [hotelsError, setHotelsError] = useState(null);
  const [hotelsKey, setHotelsKey] = useState(0);
  const [hotelId, setHotelId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStart, setShowStart] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const seq = useRef(0);

  // The hotels the user can read stock at (GET /stock lists them). A failed
  // fetch is not "no access": say so and offer a retry.
  useEffect(() => {
    let alive = true;
    setHotelsError(null);
    getStock({})
      .then((res) => alive && setHotels(Array.isArray(res?.hotels) ? res.hotels : []))
      .catch((err) => alive && setHotelsError(getApiErrorMessage(err, "Could not load your hotels")));
    return () => {
      alive = false;
    };
  }, [hotelsKey]);

  // Hotel by hotel: the bulk check answers with the union over the hotels it is
  // given, which would offer read-only hotels in the start modal.
  const createPerm = usePermittedHotels({ moduleKey: "inventory", action: "create", hotels, enabled: !!hotels });
  const createHotels = useMemo(
    () => (hotels || []).filter((h) => createPerm.ids.has(Number(h.id))),
    [hotels, createPerm.ids]
  );
  const canCreate = createHotels.length > 0;

  useEffect(() => {
    const n = ++seq.current;
    setLoading(true);
    setError(null);
    const params = { page };
    if (hotelId) params.hotelId = Number(hotelId);
    if (status) params.status = status;
    listCounts(params)
      .then((res) => {
        if (n !== seq.current) return;
        setData({ rows: Array.isArray(res?.rows) ? res.rows : [], total: Number(res?.total) || 0 });
      })
      .catch((err) => {
        if (n !== seq.current) return;
        setError(getApiErrorMessage(err, "Could not load counts"));
      })
      .finally(() => {
        if (n === seq.current) setLoading(false);
      });
  }, [hotelId, status, page, reloadKey]);

  const open = (row) => router.push(countPath(row.id));
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const from = data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, data.total);

  return (
    <div className={styles.page}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>Inventory</div>
            <h1 className={styles.pageTitle}>Counts</h1>
            <p className={styles.headLead}>Full stock takes and spot checks. Differences post to stock once an approver signs them off.</p>
          </div>
          {canCreate && (
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowStart(true)}>
              <Plus size={15} aria-hidden="true" />
              Start count
            </button>
          )}
        </div>
      </section>

      <main className={styles.pageBody}>
        {hotelsError && (
          <div className={`${styles.notice} ${styles.noticeDanger}`} role="alert">
            <strong>{hotelsError}</strong>
            <span>Starting a count and the hotel filter need your hotels.</span>
            <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={() => setHotelsKey((k) => k + 1)}>
              <RotateCcw size={14} aria-hidden="true" />
              Retry
            </button>
          </div>
        )}
        <div className={styles.listBar}>
          <div className={styles.tabs} role="tablist" aria-label="Status">
            {STATUS_TABS.map(([key, label]) => (
              <button
                key={key || "all"}
                type="button"
                role="tab"
                aria-selected={status === key}
                className={`${styles.tab} ${status === key ? styles.tabOn : ""}`}
                onClick={() => {
                  setStatus(key);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {hotels && hotels.length > 1 && (
            <label className={styles.inlineSelect}>
              <span className={styles.srOnly}>Hotel</span>
              <select
                className={styles.select}
                value={hotelId}
                onChange={(e) => {
                  setHotelId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All my hotels</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <section className={styles.card}>
          {error ? (
            <div className={styles.emptyState}>
              <p>{error}</p>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setReloadKey((k) => k + 1)}>
                <RotateCcw size={15} aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : loading && !data.rows.length ? (
            <div className={styles.skeleton} aria-busy="true" aria-label="Loading counts">
              <span />
              <span />
              <span />
            </div>
          ) : !data.rows.length ? (
            <div className={styles.emptyState}>
              <ClipboardCheck size={22} aria-hidden="true" />
              {hotels && !hotels.length ? (
                <p>You don&apos;t have stock access at any hotel yet.</p>
              ) : status || hotelId ? (
                <p>No counts match these filters.</p>
              ) : (
                <>
                  <p>No counts yet. A full count sets the starting position of a hotel; a spot check covers a few items.</p>
                  {canCreate && (
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowStart(true)}>
                      <Plus size={15} aria-hidden="true" />
                      Start count
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.tableLinks}`} aria-label="Counts">
                <thead>
                  <tr>
                    <th scope="col">Count</th>
                    <th scope="col">Hotel</th>
                    <th scope="col">Type</th>
                    <th scope="col" className={styles.right}>Counted</th>
                    <th scope="col">Status</th>
                    <th scope="col">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => {
                    const meta = statusMeta(r.status);
                    return (
                      <tr key={r.id} onClick={() => open(r)}>
                        <td data-label="Count">
                          <Link href={countPath(r.id)} className={`${styles.mono} ${styles.rowLink}`} onClick={(e) => e.stopPropagation()}>
                            {r.countNumber || `#${r.id}`}
                          </Link>
                        </td>
                        <td data-label="Hotel">{r.hotelName}</td>
                        <td data-label="Type">
                          <span>{SCOPE_LABEL[r.scope] || r.scope}</span>
                          {r.isBlind && (
                            <span className={styles.metaFlag}>
                              <EyeOff size={12} aria-hidden="true" />
                              Blind
                            </span>
                          )}
                        </td>
                        <td data-label="Counted" className={styles.right}>
                          <span className={styles.num}>{`${r.countedCount} / ${r.lineCount}`}</span>
                        </td>
                        <td data-label="Status">
                          <span className={`${styles.pill} ${styles[`tone_${meta.tone}`]}`}>
                            <span className={styles.dot} aria-hidden="true" />
                            {meta.label}
                          </span>
                        </td>
                        <td data-label="Started">
                          <span>{fmtDate(r.startedAt)}</span>
                          {r.createdByName && <span className={styles.faint}>{` · ${r.createdByName}`}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.total > PAGE_SIZE && (
            <div className={styles.pager}>
              <span className={styles.muted}>{`${from}–${to} of ${data.total}`}</span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm}`}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm}`}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages || loading}
                aria-label="Next page"
              >
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      </main>

      <StartCountModal
        show={showStart}
        onHide={() => setShowStart(false)}
        hotels={createHotels}
        defaultHotelId={createHotels.some((h) => String(h.id) === String(hotelId)) ? hotelId : undefined}
        onStarted={(count) => {
          setShowStart(false);
          if (count?.id) router.push(countPath(count.id));
        }}
      />
    </div>
  );
};

export default CountsList;
