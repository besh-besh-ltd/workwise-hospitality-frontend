import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { ClipboardCheck, PackageMinus, PackagePlus, RotateCcw, Search } from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import { routes as receiveRoutes } from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "@/components/inventory/stock/HotelSelect";
import useInventoryHotels from "@/components/inventory/stock/useInventoryHotels";
import usePermittedHotels from "@/components/inventory/stock/usePermittedHotels";
import { stockRoutes } from "@/components/inventory/stock/stockUtils";
import { getMyHospitalityContexts } from "@/services/hospitality";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// The store's phone home: three big actions (Receive, Mark out, Count) and
// Look up, which resolves a scanned or typed code at the chosen hotel and
// opens what it names. An item opens its card at that hotel, even one the
// hotel has never stocked (the card says so).
//
// Look-up hotels are the ones the caller can read stock at (GET /stock) plus
// the ones they can read goods receipts at (grn.read), since a receiving clerk
// scans PO and dispatch codes too. A code only opens a page the caller has
// rights for at that hotel. Each action shows only to users who can use it
// somewhere: Receive with grn.create at a hotel, Mark out and Count with
// inventory.create at a hotel. The server checks every call again.

const useContextHotels = () => {
  const [state, setState] = useState({ hotels: [], loading: true });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyHospitalityContexts();
        const companies = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        const list = [];
        for (const c of companies) {
          for (const h of Array.isArray(c?.hotels) ? c.hotels : []) {
            const id = Number(h?.id);
            if (id > 0 && !list.some((x) => x.id === id)) list.push({ id, name: h.name || `Hotel ${id}` });
          }
        }
        if (!cancelled) setState({ hotels: list, loading: false });
      } catch {
        // No receiving hotels beyond the stock ones: look up still works there.
        if (!cancelled) setState({ hotels: [], loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
};

const ScanHomePage = () => {
  const router = useRouter();
  const { hotels: stockHotels, loading: stockLoading, error: stockError, reload } = useInventoryHotels();
  const ctx = useContextHotels();
  const grnPerm = usePermittedHotels({ moduleKey: "grn", action: "read", hotels: ctx.hotels, enabled: !ctx.loading });
  const receivePerm = usePermittedHotels({ moduleKey: "grn", action: "create", hotels: ctx.hotels, enabled: !ctx.loading });
  const createPerm = usePermittedHotels({
    moduleKey: "inventory", action: "create", hotels: stockHotels, enabled: !stockLoading,
  });
  const [hotelId, setHotelId] = useState(null);

  const stockIds = useMemo(() => new Set(stockHotels.map((h) => h.id)), [stockHotels]);
  const hotels = useMemo(() => {
    const list = [...stockHotels];
    for (const h of ctx.hotels) if (grnPerm.ids.has(h.id) && !stockIds.has(h.id)) list.push(h);
    return list;
  }, [stockHotels, ctx.hotels, grnPerm.ids, stockIds]);
  const loading = stockLoading || ctx.loading || grnPerm.loading;

  useEffect(() => {
    if (loading) return;
    if (!hotels.length) setHotelId(null);
    else if (hotelId == null || !hotels.some((h) => h.id === hotelId)) setHotelId(hotels[0].id);
  }, [loading, hotels, hotelId]);

  const hotel = hotels.find((h) => h.id === hotelId) || null;
  const markOutHotel = createPerm.ids.has(hotelId) ? hotelId : stockHotels.find((h) => createPerm.ids.has(h.id))?.id ?? null;
  const canReceive = receivePerm.ids.size > 0;
  const canCount = createPerm.ids.size > 0;

  const onResolved = (result) => {
    if (!hotelId || !result) return;
    const where = hotel?.name || "this hotel";
    switch (result.kind) {
      case "item":
        if (!stockIds.has(hotelId)) {
          toast.info(`You can't see stock at ${where}, so its item cards don't open here.`);
          return;
        }
        if (result.item?.invItemId) router.push(stockRoutes.item(hotelId, result.item.invItemId));
        return;
      case "po":
      case "dispatch":
        if (!grnPerm.ids.has(hotelId)) {
          toast.info(`Receiving at ${where} needs goods receipt rights there.`);
          return;
        }
        if (result.poId) {
          router.push(
            receiveRoutes.receive(result.poId, result.kind === "dispatch" ? { hotelId, dispatchId: result.dispatchId } : { hotelId })
          );
        }
        return;
      case "grn":
        if (result.grnId) router.push(stockRoutes.grn(result.grnId));
        return;
      default:
        toast.info("That code doesn't open anything here.");
    }
  };

  const onUnknown = (code) => {
    toast.warn(`${code || "That code"} isn't a known item or document. Find the item by name in Stock.`);
  };

  const noHotels = !loading && hotels.length === 0;

  return (
    <div className={r.page}>
      <section className={r.pageHeader}>
        <div className={r.pageHeaderInner}>
          <div className={r.headMain}>
            <div className={r.eyebrow}>Inventory</div>
            <h1 className={r.pageTitle}>Scan</h1>
            <div className={r.pageSub}>Receive goods, mark them out, count, or look anything up</div>
          </div>
        </div>
      </section>

      <main className={r.pageBody}>
        <div className={r.stack}>
          {(canReceive || markOutHotel != null || canCount) && (
          <nav aria-label="Scan actions" className={s.homeActions}>
            {canReceive && (
              <Link href={stockRoutes.receive()} className={s.homeAction}>
                <span className={s.homeActionIc}><PackagePlus size={24} aria-hidden="true" /></span>
                <span>
                  <span className={s.homeActionLabel}>Receive</span>
                  <span className={s.homeActionSub}>Scan the PO or delivery note</span>
                </span>
              </Link>
            )}
            {markOutHotel != null && (
              <Link href={stockRoutes.markOut({ hotelId: markOutHotel })} className={s.homeAction}>
                <span className={s.homeActionIc}><PackageMinus size={24} aria-hidden="true" /></span>
                <span>
                  <span className={s.homeActionLabel}>Mark out</span>
                  <span className={s.homeActionSub}>Issue stock to a department</span>
                </span>
              </Link>
            )}
            {canCount && (
              <Link href={stockRoutes.counts()} className={s.homeAction}>
                <span className={s.homeActionIc}><ClipboardCheck size={24} aria-hidden="true" /></span>
                <span>
                  <span className={s.homeActionLabel}>Count</span>
                  <span className={s.homeActionSub}>Count the shelves</span>
                </span>
              </Link>
            )}
          </nav>
          )}

          <section className={r.card} aria-labelledby="scan-lookup-title">
            <div className={r.cardHead}>
              <h2 id="scan-lookup-title" className={r.cardTitle}>
                <Search size={15} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Look up
              </h2>
            </div>
            <div className={r.cardBody}>
              {stockError && (
                <div className={`${r.lineMsg} ${r.lineWarn}`} role="alert" style={{ marginBottom: 12 }}>
                  <span>{stockError}</span>
                  <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={reload}>
                    <RotateCcw size={14} aria-hidden="true" /> Try again
                  </button>
                </div>
              )}
              {noHotels ? (
                <p className={r.meta} style={{ margin: 0 }} role="status">
                  You don&apos;t have stock or receiving access at any hotel, so there is nothing to look up.
                </p>
              ) : (
                <>
                  {hotels.length > 1 && hotelId != null && (
                    <div style={{ marginBottom: 12 }}>
                      <HotelSelect hotels={hotels} value={hotelId} onChange={(id) => id && setHotelId(id)} />
                    </div>
                  )}
                  <ScanInput
                    context={hotelId ? `hotel:${hotelId}` : undefined}
                    onResolved={onResolved}
                    onUnknown={onUnknown}
                    placeholder="Item barcode, label QR or document"
                    disabled={!hotelId}
                  />
                  {stockIds.has(hotelId) && (
                    <p className={r.meta} style={{ marginBottom: 0 }}>
                      No barcode? <Link href={stockRoutes.stock({ hotelId })} className={r.docLink}>Find the item by name</Link>
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ScanHomePage;
