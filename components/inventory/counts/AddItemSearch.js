import React, { useEffect, useRef, useState } from "react";
import { Loader2, PackagePlus, Search } from "lucide-react";
import { listItems } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import styles from "./counts.module.scss";

/**
 * Manual fallback for an item that is not on the count (and has no barcode):
 * search the item master and add it.
 *
 * Props: { query, hotelId, onPick({invItemId, displayName, itemCode, stockUom}) }
 */
const AddItemSearch = ({ query, hotelId, onPick }) => {
  const [state, setState] = useState({ loading: false, rows: null, error: null });
  const seq = useRef(0);

  useEffect(() => {
    setState({ loading: false, rows: null, error: null });
  }, [query]);

  const search = async () => {
    const n = ++seq.current;
    setState({ loading: true, rows: null, error: null });
    try {
      const res = await listItems({ search: query, hotelId });
      if (n !== seq.current) return;
      setState({ loading: false, rows: res?.rows || [], error: null });
    } catch (err) {
      if (n !== seq.current) return;
      setState({ loading: false, rows: null, error: getApiErrorMessage(err, "Could not search items") });
    }
  };

  return (
    <div className={styles.addSearch}>
      <p>No item on this count matches “{query}”.</p>
      {state.rows === null ? (
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={search} disabled={state.loading}>
          {state.loading ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
          Search all items
        </button>
      ) : state.rows.length ? (
        <ul className={styles.pickList}>
          {state.rows.slice(0, 20).map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={styles.pickRow}
                onClick={() => onPick({ invItemId: it.id, displayName: it.displayName, itemCode: it.itemCode, stockUom: it.stockUom })}
              >
                <PackagePlus size={16} aria-hidden="true" />
                <span className={styles.pickName}>{it.displayName}</span>
                {it.itemCode && <span className={styles.mono}>{it.itemCode}</span>}
                <span className={styles.uom}>{it.stockUom}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.faint}>No item in the item master matches either.</p>
      )}
      {state.error && <p className={styles.errorText}>{state.error}</p>}
    </div>
  );
};

export default AddItemSearch;
