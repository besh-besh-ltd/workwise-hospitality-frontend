import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { ClipboardCheck, PackageMinus, PackagePlus, Search } from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import { routes as receiveRoutes } from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "@/components/inventory/stock/HotelSelect";
import useInventoryHotels from "@/components/inventory/stock/useInventoryHotels";
import { stockRoutes } from "@/components/inventory/stock/stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// The store's phone home: three big actions (Receive, Mark out, Count) and
// Look up, which resolves a scanned or typed code at the chosen hotel and
// opens what it names. An item opens its card at that hotel, even one the
// hotel has never stocked (the card says so).

const ScanHomePage = () => {
  const router = useRouter();
  const { hotels, loading } = useInventoryHotels();
  const [hotelId, setHotelId] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!hotels.length) setHotelId(null);
    else if (hotelId == null || !hotels.some((h) => h.id === hotelId)) setHotelId(hotels[0].id);
  }, [loading, hotels, hotelId]);

  const onResolved = (result) => {
    if (!hotelId || !result) return;
    switch (result.kind) {
      case "item":
        if (result.item?.invItemId) router.push(stockRoutes.item(hotelId, result.item.invItemId));
        return;
      case "po":
        if (result.poId) router.push(receiveRoutes.receive(result.poId, { hotelId }));
        return;
      case "dispatch":
        if (result.poId) router.push(receiveRoutes.receive(result.poId, { hotelId, dispatchId: result.dispatchId }));
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
          <nav aria-label="Scan actions" className={s.homeActions}>
            <Link href={stockRoutes.receive()} className={s.homeAction}>
              <span className={s.homeActionIc}><PackagePlus size={24} aria-hidden="true" /></span>
              <span>
                <span className={s.homeActionLabel}>Receive</span>
                <span className={s.homeActionSub}>Scan the PO or delivery note</span>
              </span>
            </Link>
            <Link href={stockRoutes.markOut({ hotelId: hotelId || undefined })} className={s.homeAction}>
              <span className={s.homeActionIc}><PackageMinus size={24} aria-hidden="true" /></span>
              <span>
                <span className={s.homeActionLabel}>Mark out</span>
                <span className={s.homeActionSub}>Issue stock to a department</span>
              </span>
            </Link>
            <Link href={stockRoutes.counts()} className={s.homeAction}>
              <span className={s.homeActionIc}><ClipboardCheck size={24} aria-hidden="true" /></span>
              <span>
                <span className={s.homeActionLabel}>Count</span>
                <span className={s.homeActionSub}>Count the shelves</span>
              </span>
            </Link>
          </nav>

          <section className={r.card} aria-labelledby="scan-lookup-title">
            <div className={r.cardHead}>
              <h2 id="scan-lookup-title" className={r.cardTitle}>
                <Search size={15} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Look up
              </h2>
            </div>
            <div className={r.cardBody}>
              {noHotels ? (
                <p className={r.meta} style={{ margin: 0 }}>You don&apos;t have stock access at any hotel, so there is nothing to look up.</p>
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
                  <p className={r.meta} style={{ marginBottom: 0 }}>
                    No barcode? <Link href={stockRoutes.stock({ hotelId: hotelId || undefined })} className={r.docLink}>Find the item by name</Link>
                  </p>
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
