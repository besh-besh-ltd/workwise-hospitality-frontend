import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Printer, Tags, Trash2 } from "lucide-react";
import { getStockItem, printItemLabels } from "@/services/inventory";
import HotelSelect from "@/components/inventory/stock/HotelSelect";
import ItemPicker from "@/components/inventory/stock/ItemPicker";
import useInventoryHotels from "@/components/inventory/stock/useInventoryHotels";
import usePermittedHotels from "@/components/inventory/stock/usePermittedHotels";
import { errorInfo, isNotFound, notAvailable, stockRoutes, toId } from "@/components/inventory/stock/stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Item labels (POST /labels/items, B4): pick items, copies each and a layout;
// the server renders a PDF with a QR per item and answers {url}. With a hotel
// chosen the labels carry that hotel's bin.
//
// Printing needs inventory.update: at the "Bins from" hotel, or (with no
// hotel) somewhere in each item's company. The picker offers only hotels with
// update rights, and a ?hotelId= that isn't one of them is corrected before
// any item is looked up.
//
// Props: initialHotelId (?hotelId=), initialItems (?items=9,11 from the item card).

export const LABEL_LAYOUTS = [
  { value: "A4_65", label: "A4 sheet, 65 labels", note: "38.1 × 21.2 mm" },
  { value: "A4_24", label: "A4 sheet, 24 labels", note: "63.5 × 33.9 mm" },
  { value: "THERMAL_50x25", label: "Thermal roll", note: "50 × 25 mm, one per label" },
];
const MAX_LABELS = 1000;
const MAX_ITEMS = 200;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const parseCopies = (text) => {
  const t = String(text ?? "").trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 ? n : null; // the job total (≤ 1,000) caps it
};

const LabelsPage = ({ initialHotelId = null, initialItems = null }) => {
  const { hotels, loading: hotelsLoading } = useInventoryHotels();
  const updatePerm = usePermittedHotels({ moduleKey: "inventory", action: "update", hotels, enabled: !hotelsLoading });
  const printHotels = useMemo(() => hotels.filter((h) => updatePerm.ids.has(h.id)), [hotels, updatePerm.ids]);
  const ready = !hotelsLoading && !updatePerm.loading;
  const [hotelId, setHotelId] = useState(() => toId(initialHotelId));
  const [hotelChosen, setHotelChosen] = useState(false);
  const [items, setItems] = useState([]); // {invItemId, displayName, itemCode, stockUom, trackExpiry, copies, batchNo, expiryDate}
  const [layout, setLayout] = useState("A4_65");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);
  const preloadRef = useRef(false);

  // The hotel must be one the server listed where labels can be printed;
  // default to the first.
  useEffect(() => {
    if (!ready || hotelChosen) return;
    if (!printHotels.length) {
      setHotelId(null);
      return;
    }
    if (hotelId == null || !printHotels.some((h) => h.id === hotelId)) setHotelId(printHotels[0].id);
  }, [ready, printHotels, hotelId, hotelChosen]);
  const hotelValid = hotelId != null && printHotels.some((h) => h.id === hotelId);

  // ?items= from the item card: look each one up at the (corrected) hotel.
  useEffect(() => {
    if (preloadRef.current || !ready || !hotelValid) return;
    const ids = String(initialItems || "")
      .split(",")
      .map(toId)
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
    preloadRef.current = true;
    if (!ids.length) return;
    (async () => {
      const found = [];
      for (const id of ids) {
        try {
          const card = await getStockItem(hotelId, id);
          if (card?.item) found.push(card.item);
        } catch {
          // An id that isn't visible is simply left out (404s are uniform).
        }
      }
      setItems((list) => {
        const have = new Set(list.map((x) => x.invItemId));
        const add = found
          .filter((it) => !have.has(Number(it.id)))
          .map((it) => ({
            invItemId: Number(it.id),
            displayName: it.displayName,
            itemCode: it.itemCode ?? null,
            stockUom: it.stockUom,
            trackExpiry: !!it.trackExpiry,
            copies: "1",
            batchNo: "",
            expiryDate: "",
          }));
        return [...list, ...add];
      });
    })();
  }, [ready, hotelValid, hotelId, initialItems]);

  const picked = useMemo(() => new Set(items.map((x) => x.invItemId)), [items]);

  const add = (it) => {
    setUrl(null);
    setItems((list) => (list.some((x) => x.invItemId === it.invItemId)
      ? list
      : [...list, { ...it, trackExpiry: !!it.trackExpiry, copies: "1", batchNo: "", expiryDate: "" }]));
  };
  const patch = (id, change) => {
    setUrl(null);
    setItems((list) => list.map((x) => (x.invItemId === id ? { ...x, ...change } : x)));
  };

  const copies = items.map((x) => parseCopies(x.copies));
  const badCopies = copies.some((c) => c == null);
  const total = copies.reduce((sum, c) => sum + (c || 0), 0);
  const badExpiry = items.some((x) => x.expiryDate && !DAY.test(x.expiryDate));
  const tooMany = total > MAX_LABELS;
  const tooManyItems = items.length > MAX_ITEMS;
  const noRights = ready && !updatePerm.error && printHotels.length === 0;
  const canPrint =
    ready && printHotels.length > 0 && !busy && items.length > 0 && !badCopies && !badExpiry && !tooMany && !tooManyItems;

  const print = async () => {
    if (!canPrint) return;
    setBusy(true);
    setError(null);
    setUrl(null);
    const payload = {
      layout,
      ...(hotelId ? { hotelId } : {}),
      items: items.map((x) => {
        const line = { invItemId: x.invItemId, copies: parseCopies(x.copies) };
        if (x.batchNo.trim()) line.batchNo = x.batchNo.trim();
        if (x.expiryDate) line.expiryDate = x.expiryDate;
        return line;
      }),
    };
    try {
      const res = await printItemLabels(payload);
      if (res?.url) {
        setUrl(res.url);
        window.open(res.url, "_blank", "noopener");
      } else {
        setError("The labels were made but no file came back. Try again.");
      }
    } catch (err) {
      const info = errorInfo(err, "Could not make the labels.");
      // C3: with a hotel named, a hotel you can't see (or one that's gone) answers 404 like a missing item.
      setError(
        isNotFound(info)
          ? hotelId
            ? `${notAvailable("hotel, or one of these items,")} Remove any item that's gone and try again.`
            : "One of these items isn't available any more. Remove it and try again."
          : info.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={r.page}>
      <section className={r.pageHeader}>
        <div className={r.pageHeaderInner}>
          <div className={r.headMain}>
            <div className={r.eyebrow}>
              <Link href={stockRoutes.stock({ hotelId: hotelId || undefined })} className={r.btnLink}>Stock</Link>
            </div>
            <h1 className={r.pageTitle}>Print labels</h1>
            <div className={r.pageSub}>Each label has a QR code that opens the item, so it can be scanned anywhere</div>
          </div>
        </div>
      </section>

      <main className={r.pageBody}>
        <div className={r.stack}>
          {updatePerm.error && (
            <div className={`${r.lineMsg} ${r.lineWarn}`} role="alert">
              <span>{updatePerm.error}</span>
              <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={updatePerm.retry}>
                Try again
              </button>
            </div>
          )}
          {noRights && (
            <div className={`${r.lineMsg} ${r.lineWarn}`} role="status">
              Printing labels needs inventory update rights at a hotel. Ask your admin if you need them.
            </div>
          )}
          <section className={r.card}>
            <div className={r.cardHead}>
              <h2 className={r.cardTitle}>Items</h2>
              <span className={r.count}>{items.length}</span>
            </div>
            <div className={r.cardBody}>
              <div className={r.formGrid}>
                <HotelSelect
                  hotels={printHotels}
                  value={hotelId ?? ""}
                  disabled={busy}
                  allLabel="No hotel (labels without a bin)"
                  label="Bins from"
                  onChange={(id) => {
                    setHotelChosen(true);
                    setHotelId(id || null);
                    setUrl(null);
                  }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <ItemPicker source="items" hotelId={hotelId || undefined} onPick={add} exclude={picked} disabled={busy} />
              </div>

              {items.length === 0 ? (
                <div className={r.emptyState}>
                  <Tags size={22} aria-hidden="true" />
                  <div className={r.emptyTitle} style={{ marginTop: 8 }}>No items yet</div>
                  <div>Find the items to label above.</div>
                </div>
              ) : (
                <ul className={s.lineList} aria-label="Items to label" style={{ marginTop: 12 }}>
                  {items.map((x, i) => {
                    const bad = copies[i] == null;
                    return (
                      <li key={x.invItemId} className={`${s.line} ${bad ? s.lineBad : ""}`}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className={s.lineName}>{x.displayName}</div>
                          <div className={s.lineMeta}>
                            {x.itemCode && <span className={s.mono}>{x.itemCode} · </span>}
                            {x.stockUom}
                          </div>
                          {x.trackExpiry && (
                            <div className={r.flags} style={{ marginTop: 6 }}>
                              <input
                                className={`${r.input} ${s.inlineInput}`}
                                aria-label={`Batch of ${x.displayName}`}
                                placeholder="Batch (optional)"
                                maxLength={64}
                                value={x.batchNo}
                                onChange={(e) => patch(x.invItemId, { batchNo: e.target.value })}
                              />
                              <input
                                className={`${r.input} ${s.inlineInput}`}
                                type="date"
                                aria-label={`Expiry of ${x.displayName}`}
                                value={x.expiryDate}
                                onChange={(e) => patch(x.invItemId, { expiryDate: e.target.value })}
                              />
                            </div>
                          )}
                          {bad && <div className={s.lineProblem}>Copies must be a whole number, 1 or more</div>}
                        </div>
                        <div className={s.lineQty}>
                          <input
                            className={`${r.input} ${s.qtyField}`}
                            inputMode="numeric"
                            aria-label={`Copies of ${x.displayName}`}
                            aria-invalid={bad ? "true" : undefined}
                            value={x.copies}
                            onChange={(e) => patch(x.invItemId, { copies: e.target.value })}
                          />
                          <span className={s.unit}>copies</span>
                          <button
                            type="button"
                            className={s.removeBtn}
                            aria-label={`Remove ${x.displayName}`}
                            onClick={() => {
                              setUrl(null);
                              setItems((list) => list.filter((y) => y.invItemId !== x.invItemId));
                            }}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className={r.card}>
            <div className={r.cardHead}>
              <h2 className={r.cardTitle}>Layout</h2>
            </div>
            <div className={r.cardBody}>
              <div className={r.choiceRow} role="radiogroup" aria-label="Layout">
                {LABEL_LAYOUTS.map((l) => (
                  <label key={l.value} className={`${r.choice} ${layout === l.value ? r.choiceOn : ""}`}>
                    <input
                      type="radio"
                      name="label-layout"
                      aria-label={l.label}
                      checked={layout === l.value}
                      onChange={() => {
                        setLayout(l.value);
                        setUrl(null);
                      }}
                    />
                    <span><strong>{l.label}</strong>{l.note}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={r.cardFoot}>
              <div style={{ minWidth: 0 }}>
                {tooMany && (
                  <div className={r.formError} role="alert" style={{ margin: 0 }}>
                    One print job takes at most 1,000 labels; this one has {total.toLocaleString("en-IN")}.
                  </div>
                )}
                {tooManyItems && (
                  <div className={r.formError} role="alert" style={{ margin: 0 }}>One print job takes at most 200 items.</div>
                )}
                {error && <div className={r.formError} role="alert" style={{ margin: 0 }}>{error}</div>}
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className={r.docLink}>
                    <ExternalLink size={13} aria-hidden="true" /> Open the labels PDF
                  </a>
                )}
              </div>
              <button type="button" className={`${r.btn} ${r.btnPrimary}`} onClick={print} disabled={!canPrint}>
                {busy ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Printer size={14} aria-hidden="true" />}
                {canPrint || busy ? `Print ${total} label${total === 1 ? "" : "s"}` : "Print labels"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LabelsPage;
