import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck, FilePen, PackageMinus, RefreshCw, ScanBarcode, Search, Upload, Warehouse,
} from "lucide-react";
import { fmtQty, inr } from "@/components/inventory/receive/receiveUtils";
import { getStock } from "@/services/inventory";
import HotelSelect from "./HotelSelect";
import { errorInfo, stockRoutes, toId } from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// Stock on hand at one hotel (GET /inventory/stock): the hotel picker lists the
// hotels the server says the caller can read, search and "below reorder" are
// server filters, totals cover the whole hotel. Until the hotel's first full
// count or opening import, a banner says stock has not started.
//
// Props: initialHotelId (from ?hotelId=; used only if the server lists it).

const PAGE_SIZE = 50;
const SEARCH_DELAY_MS = 300;

const fmtWhen = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

const StockList = ({ initialHotelId = null }) => {
  const router = useRouter();
  const [hotelId, setHotelId] = useState(() => toId(initialHotelId));
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [belowReorder, setBelowReorder] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const seqRef = useRef(0);
  const firstSearchRef = useRef(true);

  useEffect(() => {
    if (firstSearchRef.current) {
      firstSearchRef.current = false;
      return undefined;
    }
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
    const params = {};
    if (hotelId) params.hotelId = hotelId;
    if (search) params.search = search;
    if (belowReorder) params.belowReorder = true;
    params.page = page;
    try {
      const res = await getStock(params);
      if (seq !== seqRef.current) return;
      setData(res || null);
      // The server answers for its default hotel when none (or a stale one)
      // was asked for; follow it so the picker and links agree.
      if (res?.hotelId && res.hotelId !== hotelId) setHotelId(Number(res.hotelId));
    } catch (err) {
      if (seq !== seqRef.current) return;
      const info = errorInfo(err, "Could not load stock.");
      if (info.httpStatus === 404 && hotelId) {
        // A hotel from an old link that isn't ours any more: show the default.
        setHotelId(null);
        return;
      }
      setLoadError(info.message);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [hotelId, search, belowReorder, page]);

  useEffect(() => {
    load();
  }, [load]);

  const hotels = Array.isArray(data?.hotels) ? data.hotels : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const total = Number(data?.total) || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentHotel = hotels.find((h) => Number(h.id) === Number(hotelId)) || null;
  const noHotels = data && hotels.length === 0 && !data.hotelId;
  const filtered = !!(search || belowReorder);

  const open = (row) => router.push(stockRoutes.item(hotelId, row.invItemId));

  return (
    <div className={r.page}>
      <section className={r.pageHeader}>
        <div className={r.pageHeaderInner}>
          <div className={r.headMain}>
            <div className={r.eyebrow}>Inventory</div>
            <h1 className={r.pageTitle}>Stock</h1>
            <div className={r.pageSub}>
              {currentHotel ? <span>On hand at <strong>{currentHotel.name}</strong></span> : <span>Stock on hand by hotel</span>}
            </div>
          </div>
          {hotelId && (
            <div className={`${r.headerActions} ${r.headerActionsKeep}`}>
              <Link href={stockRoutes.scan()} className={`${r.btn} ${r.btnSecondary}`}>
                <ScanBarcode size={14} aria-hidden="true" /> Scan
              </Link>
              <Link href={stockRoutes.adjustments({ hotelId })} className={`${r.btn} ${r.btnSecondary}`}>
                <FilePen size={14} aria-hidden="true" /> Adjustments
              </Link>
              <Link href={stockRoutes.markOut({ hotelId })} className={`${r.btn} ${r.btnPrimary}`}>
                <PackageMinus size={14} aria-hidden="true" /> Mark out
              </Link>
            </div>
          )}
        </div>
      </section>

      <main className={r.pageBody}>
        <div className={r.stack}>
          {noHotels ? (
            <div className={r.stateCard}>
              <div className={r.stateIc}><Warehouse size={20} aria-hidden="true" /></div>
              <h2 className={r.stateTitle}>You don&apos;t have stock access at any hotel</h2>
              <p className={r.stateSub}>Ask your admin for inventory read rights at the hotels you look after.</p>
            </div>
          ) : (
            <>
              {data && data.hotelId && !data.stockStartedAt && (
                <div className={s.banner} role="status" aria-label="Stock not started yet">
                  <span className={s.bannerIc}><AlertTriangle size={16} aria-hidden="true" /></span>
                  <div className={s.bannerBody}>
                    <h2 className={s.bannerTitle}>Stock not started yet</h2>
                    <p className={s.bannerText}>
                      Run an opening count or import opening stock so balances and reorder alerts start from real figures.
                    </p>
                    <div className={s.bannerActions}>
                      <Link href={stockRoutes.counts()} className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}>
                        <ClipboardCheck size={13} aria-hidden="true" /> Start a count
                      </Link>
                      <Link
                        href={stockRoutes.setup({ tab: "opening", hotelId: data.hotelId })}
                        className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                      >
                        <Upload size={13} aria-hidden="true" /> Import opening stock
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {data && data.hotelId && (
                <div className={s.tiles}>
                  <div className={s.tile}>
                    <div className={s.tileLabel}>Stock value</div>
                    <div className={s.tileValue}>{inr(data.totals?.value)}</div>
                  </div>
                  <div className={s.tile}>
                    <div className={s.tileLabel}>Items in stock</div>
                    <div className={s.tileValue}>{fmtQty(data.totals?.qtyItems)}</div>
                  </div>
                </div>
              )}

              <section className={r.card} aria-label="Stock">
                <div className={r.filterBar}>
                  <HotelSelect
                    hotels={hotels}
                    value={hotelId ?? ""}
                    onChange={(id) => {
                      if (!id) return;
                      setHotelId(id);
                      setPage(1);
                    }}
                  />
                  <div className={r.filterGrow}>
                    <label className={r.label} htmlFor="stock-search">Search items</label>
                    <div className={r.searchBox}>
                      <Search size={14} aria-hidden="true" />
                      <input
                        id="stock-search"
                        className={r.input}
                        type="search"
                        placeholder="Item name or code"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </div>
                  </div>
                  <label className={r.checkRow} style={{ alignSelf: "flex-end", minHeight: 34 }}>
                    <input
                      type="checkbox"
                      checked={belowReorder}
                      onChange={(e) => {
                        setBelowReorder(e.target.checked);
                        setPage(1);
                      }}
                    />
                    Below reorder only
                  </label>
                </div>

                {loadError ? (
                  <div className={r.emptyState} role="alert">
                    <div className={r.emptyTitle}>{loadError}</div>
                    <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ marginTop: 12 }} onClick={load}>
                      <RefreshCw size={14} aria-hidden="true" /> Try again
                    </button>
                  </div>
                ) : loading && !data ? (
                  <div className={r.cardBody} aria-busy="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className={r.sk} style={{ width: `${92 - i * 9}%`, marginBottom: 16 }} />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <div className={r.emptyState}>
                    <Warehouse size={22} aria-hidden="true" />
                    <div className={r.emptyTitle} style={{ marginTop: 8 }}>
                      {filtered ? "No item matches" : "No stock at this hotel yet"}
                    </div>
                    <div>
                      {filtered
                        ? "Try another name or code, or clear the filter."
                        : "Items appear here after their first receipt, opening import or count."}
                    </div>
                  </div>
                ) : (
                  <div className={r.tableWrap} aria-busy={loading || undefined}>
                    <table className={r.listTable} aria-label="Stock on hand">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Bin</th>
                          <th className={r.num}>On hand</th>
                          <th className={r.num}>Avg cost</th>
                          <th className={r.num}>Value</th>
                          <th className={r.num}>Reorder at</th>
                          <th>Last movement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.invItemId}
                            tabIndex={0}
                            onClick={() => open(row)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") open(row);
                            }}
                          >
                            <td>
                              <div style={{ fontWeight: 600 }}>{row.displayName}</div>
                              <div className={r.flags} style={{ marginTop: 3 }}>
                                {row.itemCode && <span className={`${s.subtle} ${s.mono}`}>{row.itemCode}</span>}
                                {row.belowReorder && (
                                  <span className={`${r.pill} ${r.pillWarn}`}>
                                    <span className={r.dot} />Below reorder
                                  </span>
                                )}
                              </div>
                            </td>
                            <td data-label="Bin">
                              {row.binLabel ? <span className={s.mono}>{row.binLabel}</span> : <span className={r.faint}>—</span>}
                            </td>
                            <td className={r.num} data-label="On hand">
                              {fmtQty(row.qty)}<span className={s.unit}>{row.stockUom}</span>
                            </td>
                            <td className={r.num} data-label="Avg cost">{inr(row.avgCost)}</td>
                            <td className={r.num} data-label="Value">{inr(row.value)}</td>
                            <td className={r.num} data-label="Reorder at">
                              {row.reorderLevel != null ? fmtQty(row.reorderLevel) : <span className={r.faint}>—</span>}
                            </td>
                            <td data-label="Last movement" className={r.muted}>{fmtWhen(row.lastMovementAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {total > PAGE_SIZE && (
                  <div className={r.pagination}>
                    <span>
                      Page <span className={s.mono}>{page}</span> of <span className={s.mono}>{pages}</span> ·{" "}
                      <span className={s.mono}>{total}</span> items
                    </span>
                    <div className={r.pages}>
                      <button
                        type="button"
                        className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1 || loading}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
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
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StockList;
