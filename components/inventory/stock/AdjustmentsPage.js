import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { Check, ChevronLeft, ChevronRight, FilePen, Loader2, Plus, RefreshCw, Warehouse } from "lucide-react";
import { approveAdjustment, listAdjustments } from "@/services/inventory";
import { fmtInstant, inr } from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "./HotelSelect";
import useInventoryHotels from "./useInventoryHotels";
import usePermittedHotels from "./usePermittedHotels";
import { onTabKeyDown, tabIndexFor } from "./tabKeys";
import NewAdjustmentModal from "./NewAdjustmentModal";
import AdjustmentDetailModal from "./AdjustmentDetailModal";
import RejectAdjustmentModal from "./RejectAdjustmentModal";
import { ADJUSTMENT_STATUS, adjustmentRefusal, errorInfo, messageOf, reasonLabel, stockRoutes, toId } from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// Adjustments (GET /adjustments): wastage, breakage, expiry, theft, found and
// corrections. Raising one always submits it, at a hotel where the caller has
// inventory.create. Approve / Reject show only where the server says this
// caller may (`can` on each row); a row's Approve opens the adjustment (lines
// and value) and approves from there, never blind from the list. A
// notification opens `?id=` straight into the adjustment.
//
// Props: initialHotelId (?hotelId=), initialId (?id=).

const PAGE_SIZE = 50;
const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "posted", label: "Posted" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_VALUES = STATUS_TABS.map((t) => t.value);

const AdjustmentsPage = ({ initialHotelId = null, initialId = null }) => {
  const router = useRouter();
  const { hotels, loading: hotelsLoading } = useInventoryHotels();
  const [hotelId, setHotelId] = useState(() => toId(initialHotelId));
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(() => toId(initialId));
  const [detailKey, setDetailKey] = useState(0);
  const [rejecting, setRejecting] = useState(null);
  const [approveError, setApproveError] = useState(null);
  const seqRef = useRef(0);

  // A hotel from the URL counts only if the server lists it for this caller.
  useEffect(() => {
    if (hotelsLoading || hotelId == null) return;
    if (!hotels.some((h) => h.id === hotelId)) setHotelId(null);
  }, [hotelsLoading, hotels, hotelId]);

  // Raising an adjustment needs inventory.create at the hotel it is for.
  const createPerm = usePermittedHotels({ moduleKey: "inventory", action: "create", hotels, enabled: !hotelsLoading });
  const createHotels = useMemo(() => hotels.filter((h) => createPerm.ids.has(h.id)), [hotels, createPerm.ids]);
  const canCreate = createHotels.length > 0;

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadError(null);
    const params = {};
    if (hotelId) params.hotelId = hotelId;
    if (status) params.status = status;
    params.page = page;
    try {
      const res = await listAdjustments(params);
      if (seq !== seqRef.current) return;
      setData({ rows: Array.isArray(res?.rows) ? res.rows : [], total: Number(res?.total) || 0 });
    } catch (err) {
      if (seq !== seqRef.current) return;
      // C3: a hotel you can't see (or one that's gone) answers 404.
      setLoadError(messageOf(errorInfo(err, "Could not load adjustments.")));
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [hotelId, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = (id) => {
    setApproveError(null);
    setDetailId(id);
  };

  const closeDetail = () => {
    setDetailId(null);
    setApproveError(null);
    if (router.query?.id) {
      router.replace(stockRoutes.adjustments({ hotelId: hotelId || undefined }), undefined, { shallow: true });
    }
  };

  // Called from the detail dialog only: the approver has the lines and value in front of them.
  const approve = async (adj) => {
    if (busyId) return;
    setBusyId(adj.id);
    setApproveError(null);
    try {
      const res = await approveAdjustment(adj.id);
      toast.success(`${res?.adjustmentNumber || adj.adjustmentNumber} approved and posted`);
      setDetailKey((k) => k + 1);
      load();
    } catch (err) {
      const info = errorInfo(err, "Could not approve this adjustment.");
      setApproveError(adjustmentRefusal(info, { action: "approve" }));
      // Decided elsewhere, or gone (C3: 404 also when it can't be seen any more): the list catches up.
      if (info.code === "CONFLICT" || info.code === "NOT_FOUND" || info.httpStatus === 404) {
        setDetailKey((k) => k + 1);
        load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const onRejected = (res) => {
    toast.success(`${res?.adjustmentNumber || rejecting?.adjustmentNumber || "Adjustment"} rejected`);
    setRejecting(null);
    setDetailKey((k) => k + 1);
    load();
  };

  const onCreated = (res, { linesDiffer = false } = {}) => {
    setCreating(false);
    const number = res?.adjustmentNumber || "Adjustment";
    if (linesDiffer) {
      // The request key had already been used for different lines: show what is recorded.
      toast.warn(`${number} was already recorded with different lines. Check it before raising another.`);
      if (res?.id) openDetail(res.id);
    } else if (res?.replayed) toast.info(`${number} was already recorded`);
    else if (res?.status === "posted") toast.success(`${number} posted to stock`);
    else toast.success(`${number} sent for approval`);
    load();
  };

  const selectStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const rows = data.rows;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const noHotels = !hotelsLoading && hotels.length === 0;

  return (
    <div className={r.page}>
      <section className={r.pageHeader}>
        <div className={r.pageHeaderInner}>
          <div className={r.headMain}>
            <div className={r.eyebrow}>
              <Link href={stockRoutes.stock({ hotelId: hotelId || undefined })} className={r.btnLink}>Stock</Link>
            </div>
            <h1 className={r.pageTitle}>Adjustments</h1>
            <div className={r.pageSub}>Wastage, breakage, expiry, loss, found stock and corrections</div>
          </div>
          {canCreate && !noHotels && (
            <div className={`${r.headerActions} ${r.headerActionsKeep}`}>
              <button type="button" className={`${r.btn} ${r.btnPrimary}`} onClick={() => setCreating(true)} disabled={hotelsLoading}>
                <Plus size={14} aria-hidden="true" /> New adjustment
              </button>
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
              <p className={r.stateSub}>Ask your admin for inventory rights at the hotels you look after.</p>
            </div>
          ) : (
            <section className={r.card} aria-label="Adjustments list">
              <div className={r.filterBar}>
                {hotels.length > 1 && (
                  <HotelSelect
                    hotels={hotels}
                    value={hotelId ?? ""}
                    allLabel="All hotels"
                    onChange={(id) => {
                      setHotelId(id || null);
                      setPage(1);
                    }}
                  />
                )}
                <div className={s.tabs} role="tablist" aria-label="Status" style={{ alignSelf: "flex-end" }}>
                  {STATUS_TABS.map((t) => (
                    <button
                      key={t.value || "all"}
                      type="button"
                      role="tab"
                      aria-selected={status === t.value}
                      tabIndex={tabIndexFor(status === t.value)}
                      className={`${s.tab} ${status === t.value ? s.tabActive : ""}`}
                      onClick={() => selectStatus(t.value)}
                      onKeyDown={(e) => onTabKeyDown(e, STATUS_VALUES, status, selectStatus)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadError ? (
                <div className={r.emptyState} role="alert">
                  <div className={r.emptyTitle}>{loadError}</div>
                  <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ marginTop: 12 }} onClick={load}>
                    <RefreshCw size={14} aria-hidden="true" /> Try again
                  </button>
                </div>
              ) : loading && rows.length === 0 ? (
                <div className={r.cardBody} aria-busy="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={r.sk} style={{ width: `${90 - i * 10}%`, marginBottom: 16 }} />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className={r.emptyState}>
                  <FilePen size={22} aria-hidden="true" />
                  <div className={r.emptyTitle} style={{ marginTop: 8 }}>
                    {status === "pending_approval" ? "Nothing waiting for approval" : "No adjustments yet"}
                  </div>
                </div>
              ) : (
                <div className={r.tableWrap} aria-busy={loading || undefined}>
                  <table className={`${r.listTable} ${s.labelledTable}`} aria-label="Adjustments">
                    <thead>
                      <tr>
                        <th>Adjustment</th>
                        <th>Reason</th>
                        <th className={r.num}>Items</th>
                        <th className={r.num}>Value</th>
                        <th>Status</th>
                        <th>Raised</th>
                        <th><span className={r.srOnly}>Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const st = ADJUSTMENT_STATUS[row.status] || { label: row.status, tone: "Neutral" };
                        const busy = busyId === row.id;
                        return (
                          <tr key={row.id}>
                            <td>
                              <button type="button" className={`${r.btnLink} ${r.docNo} ${s.tapLink}`} onClick={() => openDetail(row.id)}>
                                {row.adjustmentNumber}
                              </button>
                              {hotels.length > 1 && <div className={s.subtle}>{row.hotelName}</div>}
                            </td>
                            <td data-label="Reason">{reasonLabel(row.reasonCode)}</td>
                            <td className={r.num} data-label="Items">{row.lineCount ?? "—"}</td>
                            <td className={r.num} data-label="Value">{inr(row.value)}</td>
                            <td data-label="Status">
                              <span className={`${r.pill} ${r[`pill${st.tone}`] || ""}`}>
                                <span className={r.dot} />{st.label}
                              </span>
                            </td>
                            <td data-label="Raised" className={r.muted}>
                              <div>{row.createdByName || "—"}</div>
                              <div className={s.subtle}>{row.createdAt ? fmtInstant(row.createdAt) : ""}</div>
                            </td>
                            <td>
                              {(row.can?.approve || row.can?.reject) && (
                                <div className={r.flags} style={{ justifyContent: "flex-end" }}>
                                  {row.can?.reject && (
                                    <button
                                      type="button"
                                      className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                                      onClick={() => setRejecting(row)}
                                      disabled={busy}
                                      aria-label={`Reject ${row.adjustmentNumber}`}
                                    >
                                      Reject
                                    </button>
                                  )}
                                  {row.can?.approve && (
                                    <button
                                      type="button"
                                      className={`${r.btn} ${r.btnSuccess} ${r.btnSm}`}
                                      onClick={() => openDetail(row.id)}
                                      disabled={busy}
                                      aria-label={`Approve ${row.adjustmentNumber}`}
                                    >
                                      {busy ? <Loader2 size={13} className={r.spin} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
                                      Approve
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {data.total > PAGE_SIZE && (
                <div className={r.pagination}>
                  <span>
                    Page <span className={s.mono}>{page}</span> of <span className={s.mono}>{pages}</span>
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
          )}
        </div>
      </main>

      <NewAdjustmentModal
        show={creating}
        hotels={createHotels}
        defaultHotelId={createHotels.some((h) => h.id === hotelId) ? hotelId : createHotels[0]?.id ?? null}
        onHide={() => setCreating(false)}
        onCreated={onCreated}
      />
      <AdjustmentDetailModal
        id={rejecting ? null : detailId}
        refreshKey={detailKey}
        busyId={busyId}
        actionError={approveError}
        onHide={closeDetail}
        onApprove={approve}
        onReject={(adj) => {
          setApproveError(null);
          setRejecting(adj);
        }}
      />
      <RejectAdjustmentModal
        adjustment={rejecting}
        onHide={() => setRejecting(null)}
        onRejected={onRejected}
        onStale={() => {
          setDetailKey((k) => k + 1);
          load();
        }}
      />
    </div>
  );
};

export default AdjustmentsPage;
