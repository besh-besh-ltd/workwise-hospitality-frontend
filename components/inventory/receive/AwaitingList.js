import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, ClipboardList, PackageCheck, RefreshCw, ScanBarcode, Search, Truck } from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import { getAwaitingDeliveries } from "@/services/inventory";
import { errorInfo, fmtDay, fmtQty, inr, routes } from "./receiveUtils";
import styles from "./receive.module.scss";

// Awaiting deliveries: every PO with goods still to come in at the hotels the
// receiver works for. Tabs, hotel and search are server filters
// (GET /inventory/receive/awaiting, grn.read on the hotel decides what shows).
// A row, or a scanned PO / dispatch QR, opens Receive.

const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "due_today", label: "Due today" },
  { key: "overdue", label: "Overdue", dot: "bad" },
  { key: "this_week", label: "This week" },
  { key: "unscheduled", label: "Unscheduled" },
  { key: "older", label: "Older POs" },
];

const EMPTY_SUB = {
  all: "No PO has goods still to come in at these hotels.",
  due_today: "No delivery is planned for today.",
  overdue: "No delivery is running late.",
  this_week: "No delivery is planned for this week.",
  unscheduled: "Every open PO has a planned delivery date.",
  older: "No PO from before delivery plans is still open.",
};

const AwaitingList = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);
  const hotels = useMemo(() => {
    const seen = new Map();
    for (const m of userProfile?.hospitality_mappings || []) {
      if (m?.hospitality_hotel_id == null || seen.has(Number(m.hospitality_hotel_id))) continue;
      seen.set(Number(m.hospitality_hotel_id), m.hotel_name || `Hotel ${m.hospitality_hotel_id}`);
    }
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [userProfile]);

  const [filter, setFilter] = useState("all");
  const [hotelId, setHotelId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadError(null);
    const params = { filter, page };
    if (hotelId) params.hotelId = Number(hotelId);
    if (search) params.search = search;
    try {
      const res = await getAwaitingDeliveries(params);
      if (seq !== seqRef.current) return;
      setData({ rows: Array.isArray(res?.rows) ? res.rows : [], total: Number(res?.total) || 0 });
    } catch (err) {
      if (seq !== seqRef.current) return;
      setLoadError(errorInfo(err, "Could not load awaiting deliveries.").message);
      setData({ rows: [], total: 0 });
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [filter, page, hotelId, search]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (row) => router.push(routes.receive(row.poId, { hotelId: row.hotelId }));

  const onScan = (result) => {
    if (!result) return;
    if (result.kind === "dispatch" && result.poId != null) {
      router.push(routes.receive(result.poId, { dispatchId: result.dispatchId }));
    } else if (result.kind === "po" && result.poId != null) {
      router.push(routes.receive(result.poId, { hotelId: hotelId || undefined }));
    } else if (result.kind === "grn" && result.grnId != null) {
      router.push(routes.grn(result.grnId));
    } else if (result.kind === "item") {
      toast.info("Scan the PO or the dispatch note here; items are scanned on the receive screen.");
    }
  };
  const onUnknown = (code) => toast.warn(`${code || "That code"} isn't a PO or dispatch note we know.`);

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const pickFilter = (key) => {
    setFilter(key);
    setPage(1);
  };

  return (
    <div className={styles.page}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>Inventory · Receive</div>
            <h1 className={styles.pageTitle}>Awaiting deliveries</h1>
            <div className={styles.pageSub}>
              Purchase orders with goods still to come in. Scan the PO or the vendor&apos;s dispatch note to start receiving.
            </div>
          </div>
          <div className={`${styles.headerActions} ${styles.headerActionsKeep}`}>
            <Link href={routes.grnRegister()} className={`${styles.btn} ${styles.btnSecondary}`}>
              <ClipboardList size={14} aria-hidden="true" /> GRN register
            </Link>
          </div>
        </div>
      </section>

      <main className={styles.pageBody}>
        <section className={styles.card} aria-label="Awaiting deliveries">
          <div className={styles.scanDock}>
            <ScanInput context={hotelId ? `hotel:${hotelId}` : undefined} onResolved={onScan} onUnknown={onUnknown} />
          </div>
          <div className={styles.filterBar}>
            <div className={styles.tabs} role="tablist" aria-label="Delivery due">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={`${styles.tab} ${filter === f.key ? styles.tabActive : ""}`}
                  onClick={() => pickFilter(f.key)}
                >
                  {f.dot === "bad" && <span className={`${styles.tabDot} ${styles.tabDotBad}`} aria-hidden="true" />}
                  {f.label}
                </button>
              ))}
            </div>
            <div className={styles.filterGrow} />
            {hotels.length > 1 && (
              <div>
                <label className={styles.srOnly} htmlFor="awaiting-hotel">Hotel</label>
                <select
                  id="awaiting-hotel"
                  className={styles.select}
                  value={hotelId}
                  onChange={(e) => {
                    setHotelId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All my hotels</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={String(h.id)}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.searchBox}>
              <Search size={14} aria-hidden="true" />
              <input
                className={styles.input}
                type="search"
                aria-label="Search PO or vendor"
                placeholder="Search PO or vendor"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
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
              <PackageCheck size={22} aria-hidden="true" />
              <div className={styles.emptyTitle} style={{ marginTop: 8 }}>Nothing awaiting delivery here</div>
              <div>{EMPTY_SUB[filter]}</div>
            </div>
          ) : (
            <div className={styles.tableWrap} aria-busy={loading || undefined}>
              <table className={styles.listTable} aria-label="POs awaiting delivery">
                <thead>
                  <tr>
                    <th>PO</th>
                    <th>Hotel</th>
                    <th>Next due</th>
                    <th className={styles.num}>Open lines</th>
                    <th className={styles.num}>Open value</th>
                    <th>Flags</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr
                      key={`${r.poId}-${r.hotelId}`}
                      tabIndex={0}
                      onClick={() => open(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") open(r);
                      }}
                    >
                      <td>
                        <div className={styles.docNo}>{r.poNumber}</div>
                        <div className={styles.muted}>{r.vendorName}</div>
                      </td>
                      <td data-label="Hotel">{r.hotelName}</td>
                      <td data-label="Next due">
                        <span className={styles.flags}>
                          {r.nextDueDate ? <span className={styles.mono}>{fmtDay(r.nextDueDate)}</span> : <span className={styles.muted}>Not scheduled</span>}
                          {r.overdue && (
                            <span className={`${styles.pill} ${styles.pillBad}`}><span className={styles.dot} />Overdue</span>
                          )}
                        </span>
                      </td>
                      <td className={styles.num} data-label="Open lines">{fmtQty(r.openLineCount)}</td>
                      <td className={styles.num} data-label="Open value">{inr(r.openValue)}</td>
                      <td>
                        <span className={styles.flags}>
                          {r.hasInTransitDispatch && (
                            <span className={`${styles.pill} ${styles.pillInfo}`}>
                              <Truck size={11} aria-hidden="true" />In transit
                            </span>
                          )}
                          {r.isCallOff && <span className={`${styles.pill} ${styles.pillIndigo}`}>Call-off</span>}
                          {r.receiptLegacy && <span className={`${styles.pill} ${styles.pillNeutral}`}>No delivery plan</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            open(r);
                          }}
                        >
                          <ScanBarcode size={13} aria-hidden="true" /> Receive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.total > PAGE_SIZE && (
            <div className={styles.pagination}>
              <span>
                Page <span className={styles.mono}>{page}</span> of <span className={styles.mono}>{pages}</span> ·{" "}
                <span className={styles.mono}>{data.total}</span> POs
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

export default AwaitingList;
