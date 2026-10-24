import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { Check, ChevronLeft, ChevronRight, FilePen, Loader2, Plus, RefreshCw, Warehouse } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { approveAdjustment, listAdjustments } from "@/services/inventory";
import { fmtInstant, inr } from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "./HotelSelect";
import useInventoryHotels from "./useInventoryHotels";
import NewAdjustmentModal from "./NewAdjustmentModal";
import AdjustmentDetailModal from "./AdjustmentDetailModal";
import RejectAdjustmentModal from "./RejectAdjustmentModal";
import { ADJUSTMENT_STATUS, adjustmentRefusal, errorInfo, reasonLabel, stockRoutes, toId } from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// Adjustments (GET /adjustments): wastage, breakage, expiry, theft, found and
// corrections. Raising one always submits it; Approve / Reject show only where
// the server says this caller may (`can` on each row). A notification opens
// `?id=` straight into the adjustment.
//
// Props: initialHotelId (?hotelId=), initialId (?id=).

const PAGE_SIZE = 50;
const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "posted", label: "Posted" },
  { value: "rejected", label: "Rejected" },
];

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
  const seqRef = useRef(0);

  // A hotel from the URL counts only if the server lists it for this caller.
  useEffect(() => {
    if (hotelsLoading || hotelId == null) return;
    if (!hotels.some((h) => h.id === hotelId)) setHotelId(null);
  }, [hotelsLoading, hotels, hotelId]);

  const permHotelIds = useMemo(
    () => (hotelId ? [hotelId] : hotels.map((h) => h.id)),
    [hotelId, hotels]
  );
  const { canCreate } = useModulePermissions({ moduleKey: "inventory", hotelIds: permHotelIds, enabled: permHotelIds.length > 0 });

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
      setLoadError(errorInfo(err, "Could not load adjustments.").message);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [hotelId, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const closeDetail = () => {
    setDetailId(null);
    if (router.query?.id) {
      router.replace(stockRoutes.adjustments({ hotelId: hotelId || undefined }), undefined, { shallow: true });
    }
  };

  const approve = async (row) => {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const res = await approveAdjustment(row.id);
      const number = res?.adjustmentNumber || row.adjustmentNumber;
      toast.success(res?.status === "pending_approval" ? `${number} approved; it needs one more approval` : `${number} approved and posted`);
      setDetailKey((k) => k + 1);
      load();
    } catch (err) {
      const info = errorInfo(err, "Could not approve this adjustment.");
      toast.error(adjustmentRefusal(info));
      if (info.code === "CONFLICT") {
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

  const onCreated = (res) => {
    setCreating(false);
    const number = res?.adjustmentNumber || "Adjustment";
    if (res?.replayed) toast.info(`${number} was already recorded`);
    else if (res?.status === "posted") toast.success(`${number} posted to stock`);
    else toast.success(`${number} sent for approval`);
    load();
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
                      className={`${s.tab} ${status === t.value ? s.tabActive : ""}`}
                      onClick={() => {
                        setStatus(t.value);
                        setPage(1);
                      }}
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
                  <table className={r.listTable} aria-label="Adjustments">
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
                              <button type="button" className={`${r.btnLink} ${r.docNo} ${s.tapLink}`} onClick={() => setDetailId(row.id)}>
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
                                    >
                                      Reject
                                    </button>
                                  )}
                                  {row.can?.approve && (
                                    <button
                                      type="button"
                                      className={`${r.btn} ${r.btnSuccess} ${r.btnSm}`}
                                      onClick={() => approve(row)}
                                      disabled={busy}
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
        hotels={hotels}
        defaultHotelId={hotelId || hotels[0]?.id || null}
        onHide={() => setCreating(false)}
        onCreated={onCreated}
      />
      <AdjustmentDetailModal
        id={rejecting ? null : detailId}
        refreshKey={detailKey}
        busyId={busyId}
        onHide={closeDetail}
        onApprove={approve}
        onReject={(adj) => setRejecting(adj)}
      />
      <RejectAdjustmentModal adjustment={rejecting} onHide={() => setRejecting(null)} onRejected={onRejected} />
    </div>
  );
};

export default AdjustmentsPage;
