import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronLeft, ChevronRight, ClipboardList, Filter, RefreshCw, ScanBarcode, X } from "lucide-react";
import { listGrns } from "@/services/inventory";
import { errorInfo, fmtDay, fmtInstant, fmtQty, inr, routes } from "./receiveUtils";
import { HotelFilter, StatusPill, useHotelOptions } from "./receiveShared";
import styles from "./receive.module.scss";

// GRN register: every goods receipt and reversal at the hotels the user can
// read (GET /inventory/grn, grn.read). Hotel, status and dates filter on the
// server; ?poId= (the PO's "View its GRNs" link) narrows it to one PO.
// Drafts are listed only on the Drafts tab.

const PAGE_SIZE = 50;

const TABS = [
  { key: "", label: "All" },
  { key: "posted", label: "Posted" },
  { key: "partially_reversed", label: "Partly reversed" },
  { key: "reversed", label: "Reversed" },
  { key: "draft", label: "Drafts" },
];

const GrnRegister = () => {
  const router = useRouter();
  const hotels = useHotelOptions();

  const ready = router.isReady !== false;
  const queryPoId = ready && router.query?.poId && /^\d+$/.test(String(router.query.poId)) ? Number(router.query.poId) : null;

  const [status, setStatus] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const seqRef = useRef(0);

  const load = useCallback(async () => {
    if (!ready) return;
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadError(null);
    const params = { page };
    if (status) params.status = status;
    if (hotelId) params.hotelId = Number(hotelId);
    if (from) params.from = from;
    if (to) params.to = to;
    if (queryPoId) params.poId = queryPoId;
    try {
      const res = await listGrns(params);
      if (seq !== seqRef.current) return;
      setData({ rows: Array.isArray(res?.rows) ? res.rows : [], total: Number(res?.total) || 0 });
    } catch (err) {
      if (seq !== seqRef.current) return;
      setLoadError(errorInfo(err, "Could not load the GRN register.").message);
      setData({ rows: [], total: 0 });
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [ready, page, status, hotelId, from, to, queryPoId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetPage = (fn) => (value) => {
    fn(value);
    setPage(1);
  };
  const clearPo = () => {
    const query = { ...router.query };
    delete query.poId;
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
    setPage(1);
  };

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className={styles.page}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>Inventory · Receive</div>
            <h1 className={styles.pageTitle}>GRN register</h1>
            <div className={styles.pageSub}>Every goods receipt and reversal at your hotels.</div>
          </div>
          <div className={`${styles.headerActions} ${styles.headerActionsKeep}`}>
            <Link href={routes.awaiting()} className={`${styles.btn} ${styles.btnPrimary}`}>
              <ScanBarcode size={14} aria-hidden="true" /> Receive goods
            </Link>
          </div>
        </div>
      </section>

      <main className={styles.pageBody}>
        <section className={styles.card} aria-label="Goods receipts">
          {queryPoId && (
            <div className={`${styles.lineMsg} ${styles.lineNote}`} style={{ margin: "12px 18px 0" }} role="status">
              <Filter size={14} aria-hidden="true" />
              <span>Showing GRNs for one PO.</span>
              <button type="button" className={styles.btnLink} onClick={clearPo}>
                <X size={12} aria-hidden="true" /> Show all
              </button>
            </div>
          )}
          <div className={styles.filterBar}>
            <div className={styles.tabs} role="tablist" aria-label="Status">
              {TABS.map((t) => (
                <button
                  key={t.key || "all"}
                  type="button"
                  role="tab"
                  aria-selected={status === t.key}
                  className={`${styles.tab} ${status === t.key ? styles.tabActive : ""}`}
                  onClick={() => resetPage(setStatus)(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className={styles.filterGrow} />
            <HotelFilter id="grn-hotel" hotels={hotels} value={hotelId} onChange={resetPage(setHotelId)} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label className={styles.srOnly} htmlFor="grn-from">From</label>
              <input
                id="grn-from"
                type="date"
                className={styles.input}
                style={{ width: "auto" }}
                value={from}
                max={to || undefined}
                onChange={(e) => resetPage(setFrom)(e.target.value)}
              />
              <span className={styles.muted} aria-hidden="true">to</span>
              <label className={styles.srOnly} htmlFor="grn-to">To</label>
              <input
                id="grn-to"
                type="date"
                className={styles.input}
                style={{ width: "auto" }}
                value={to}
                min={from || undefined}
                onChange={(e) => resetPage(setTo)(e.target.value)}
              />
            </div>
          </div>

          {loadError ? (
            <div className={styles.emptyState} role="alert">
              <div className={styles.emptyTitle}>{loadError}</div>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginTop: 12 }} onClick={load}>
                <RefreshCw size={14} aria-hidden="true" /> Try again
              </button>
            </div>
          ) : loading && data.rows.length === 0 ? (
            <div className={styles.cardBody} aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={styles.sk} style={{ width: `${92 - i * 9}%`, marginBottom: 16 }} />
              ))}
            </div>
          ) : data.rows.length === 0 ? (
            <div className={styles.emptyState}>
              <ClipboardList size={22} aria-hidden="true" />
              <div className={styles.emptyTitle} style={{ marginTop: 8 }}>No goods receipts here</div>
              <div>{status === "draft" ? "No receipt is waiting as a draft." : "Try another status or date range."}</div>
            </div>
          ) : (
            <div className={styles.tableWrap} aria-busy={loading || undefined}>
              <table className={styles.listTable} aria-label="Goods receipts">
                <thead>
                  <tr>
                    <th>GRN</th>
                    <th>Type</th>
                    <th>Hotel</th>
                    <th>Received</th>
                    <th>Posted</th>
                    <th className={styles.num}>Lines</th>
                    <th className={styles.num}>Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => {
                    const open = () => router.push(routes.grn(r.id));
                    return (
                      <tr
                        key={r.id}
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") open();
                        }}
                      >
                        <td><span className={styles.docNo}>{r.grnNumber || `Draft #${r.id}`}</span></td>
                        <td data-label="Type">
                          {r.docType === "REVERSAL" ? (
                            <span className={`${styles.pill} ${styles.pillIndigo}`}>Reversal</span>
                          ) : (
                            <span className={`${styles.pill} ${styles.pillNeutral}`}>Receipt</span>
                          )}
                        </td>
                        <td data-label="Hotel">{r.hotelName}</td>
                        <td data-label="Received">{fmtDay(r.receivedAt)}</td>
                        <td data-label="Posted">
                          {r.postedAt ? (
                            <>
                              <div>{fmtInstant(r.postedAt)}</div>
                              {r.postedByName && <div className={styles.muted}>{r.postedByName}</div>}
                            </>
                          ) : (
                            <span className={styles.muted}>Not posted</span>
                          )}
                        </td>
                        <td className={styles.num} data-label="Lines">{fmtQty(r.lineCount)}</td>
                        <td className={styles.num} data-label="Value">{r.acceptedValue != null ? inr(r.acceptedValue) : "—"}</td>
                        <td data-label="Status">
                          <StatusPill status={r.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.total > PAGE_SIZE && (
            <div className={styles.pagination}>
              <span>
                Page <span className={styles.mono}>{page}</span> of <span className={styles.mono}>{pages}</span> ·{" "}
                <span className={styles.mono}>{data.total}</span> GRNs
              </span>
              <div className={styles.pages}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages || loading}
                  aria-label="Next page"
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default GrnRegister;
