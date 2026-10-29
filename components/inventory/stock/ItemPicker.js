import React, { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { getStock, listItems } from "@/services/inventory";
import { fmtQty } from "@/components/inventory/receive/receiveUtils";
import { errorInfo, messageOf } from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// Find an item by name or code and add it: the manual fallback next to every
// scan box, and the way to pick items where nothing is scanned.
//
//   source "stock": the hotel's stock rows (GET /stock?hotelId&search), with
//                   the qty on hand. Needs hotelId.
//   source "items": the company's item master (GET /items?search&hotelId).
//
// onPick({invItemId, displayName, itemCode, stockUom, qty|null, trackExpiry})
// (trackExpiry as the row reports it; false when the row doesn't say)
// `exclude` is a Set of invItemIds already picked (shown, not addable).

const SEARCH_DELAY_MS = 250;

const fromStock = (row) => ({
  invItemId: Number(row.invItemId),
  displayName: row.displayName,
  itemCode: row.itemCode ?? null,
  stockUom: row.stockUom,
  qty: row.qty != null ? Number(row.qty) : null,
  trackExpiry: row.trackExpiry === true,
});
const fromItem = (row) => ({
  invItemId: Number(row.id),
  displayName: row.displayName,
  itemCode: row.itemCode ?? null,
  stockUom: row.stockUom,
  qty: null,
  trackExpiry: row.trackExpiry === true,
});

const ItemPicker = ({ source = "stock", hotelId, onPick, exclude, disabled = false, label = "Find an item", placeholder = "Item name or code" }) => {
  const inputId = useId();
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const term = text.trim();
    if (!term || (source === "stock" && !hotelId)) {
      seqRef.current += 1;
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    const t = setTimeout(async () => {
      const seq = ++seqRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = source === "stock"
          ? await getStock({ hotelId: Number(hotelId), search: term, page: 1 })
          : await listItems(hotelId ? { search: term, hotelId: Number(hotelId), page: 1 } : { search: term, page: 1 });
        if (seq !== seqRef.current) return;
        const rows = Array.isArray(res?.rows) ? res.rows : [];
        setResults(rows.map(source === "stock" ? fromStock : fromItem).slice(0, 12));
      } catch (err) {
        if (seq !== seqRef.current) return;
        setResults([]);
        setError(messageOf(errorInfo(err, "Could not search items.")));
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text, source, hotelId]);

  const pick = (item) => {
    onPick?.(item);
    setText("");
    setResults([]);
  };

  const term = text.trim();
  return (
    <div className={s.picker}>
      <label className={r.label} htmlFor={inputId}>{label}</label>
      <div className={r.searchBox}>
        <Search size={14} aria-hidden="true" />
        <input
          id={inputId}
          className={r.input}
          type="search"
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
        />
      </div>
      {term && (
        <ul className={s.pickerResults} aria-label="Matching items" aria-busy={loading || undefined}>
          {loading && results.length === 0 && (
            <li className={s.pickerEmpty}>
              <Loader2 size={13} className={r.spin} aria-hidden="true" /> Searching…
            </li>
          )}
          {!loading && error && <li className={s.pickerEmpty}>{error}</li>}
          {!loading && !error && results.length === 0 && (
            <li className={s.pickerEmpty}>No item matches “{term}”.</li>
          )}
          {results.map((it) => {
            const taken = exclude?.has(it.invItemId);
            return (
              <li key={it.invItemId}>
                <button
                  type="button"
                  className={s.pickerItem}
                  onClick={() => pick(it)}
                  disabled={taken}
                  aria-label={`Add ${it.displayName}`}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className={s.pickerName}>{it.displayName}</span>
                    {it.itemCode && <span className={`${s.pickerMeta} ${s.mono}`}> · {it.itemCode}</span>}
                  </span>
                  <span className={s.pickerMeta}>
                    {taken ? (
                      "Added"
                    ) : (
                      <>
                        {it.qty != null && (
                          <>
                            <span className={s.mono}>{fmtQty(it.qty)}</span> {it.stockUom} in stock ·{" "}
                          </>
                        )}
                        <Plus size={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Add
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ItemPicker;
