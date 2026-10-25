import React, { useEffect, useId, useRef, useState } from "react";
import { Loader2, RotateCcw, Search } from "lucide-react";
import { listRootCategories, searchVariants } from "@/services/arc_v2";
import { errorInfo } from "@/components/inventory/stock/stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Find a catalogue product variant: pick a category, then search inside it
// (the catalogue search needs a category). Used to map a variant to an item
// and to start a new item from a variant.
//
// Props: { onPick({id, name}), actionLabel ("Map", "Use"), exclude: Set<variantId>, disabled }

const SEARCH_DELAY_MS = 250;
const LIMIT = 20;

const VariantPicker = ({ onPick, actionLabel = "Pick", exclude, disabled = false }) => {
  const catId = useId();
  const qId = useId();
  const [categories, setCategories] = useState(null);
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [more, setMore] = useState(false);
  const [catError, setCatError] = useState(null);
  const [catAttempt, setCatAttempt] = useState(0);
  const seqRef = useRef(0);

  useEffect(() => {
    let live = true;
    setCategories(null);
    setCatError(null);
    listRootCategories()
      .then((res) => {
        if (live) setCategories((res?.data?.categories || res?.categories || []).map((c) => ({ id: Number(c.id), title: c.title })));
      })
      .catch((err) => {
        if (!live) return;
        setCategories([]);
        setCatError(errorInfo(err, "Could not load the catalogue categories.").message);
      });
    return () => {
      live = false;
    };
  }, [catAttempt]);

  useEffect(() => {
    if (!categoryId) {
      seqRef.current += 1;
      setResults([]);
      setMore(false);
      setLoading(false);
      return undefined;
    }
    const t = setTimeout(async () => {
      const seq = ++seqRef.current;
      setLoading(true);
      setError(null);
      try {
        const res = await searchVariants({ category_id: Number(categoryId), q: q.trim() || undefined, page: 1, limit: LIMIT });
        if (seq !== seqRef.current) return;
        const list = res?.data?.variants || res?.variants || [];
        const total = Number(res?.data?.total ?? res?.data?.pagination?.total ?? res?.total);
        setResults(list.map((v) => ({ id: Number(v.id), name: v.name })));
        setMore(Number.isFinite(total) ? total > list.length : list.length >= LIMIT);
      } catch (err) {
        if (seq !== seqRef.current) return;
        setResults([]);
        setMore(false);
        setError(errorInfo(err, "Could not search the catalogue.").message);
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [categoryId, q]);

  return (
    <div className={s.picker}>
      <div className={r.formGrid}>
        <div>
          <label className={r.label} htmlFor={catId}>Category</label>
          <select
            id={catId}
            className={r.select}
            value={categoryId}
            disabled={disabled || !categories}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{categories ? "Choose a category…" : "Loading…"}</option>
            {(categories || []).map((c) => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label className={r.label} htmlFor={qId}>Search variants</label>
          <div className={r.searchBox}>
            <Search size={14} aria-hidden="true" />
            <input
              id={qId}
              className={r.input}
              type="search"
              value={q}
              placeholder="Product or variant name"
              disabled={disabled || !categoryId}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>
      {catError && (
        <div className={r.formError} role="alert" style={{ marginTop: 8 }}>
          {catError}{" "}
          <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setCatAttempt((n) => n + 1)}>
            <RotateCcw size={13} aria-hidden="true" /> Try again
          </button>
        </div>
      )}
      {categoryId && (
        <ul className={s.pickerResults} aria-label="Matching variants" aria-busy={loading || undefined}>
          {loading && results.length === 0 && (
            <li className={s.pickerEmpty}><Loader2 size={13} className={r.spin} aria-hidden="true" /> Searching…</li>
          )}
          {!loading && error && <li className={s.pickerEmpty}>{error}</li>}
          {!loading && !error && results.length === 0 && <li className={s.pickerEmpty}>No variant matches.</li>}
          {results.map((v) => {
            const taken = exclude?.has(v.id);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  className={s.pickerItem}
                  aria-label={`${actionLabel} ${v.name}`}
                  disabled={disabled || taken}
                  onClick={() => onPick?.(v)}
                >
                  <span className={s.pickerName}>{v.name}</span>
                  <span className={s.pickerMeta}>{taken ? "Mapped" : actionLabel}</span>
                </button>
              </li>
            );
          })}
          {!loading && !error && more && (
            <li className={s.pickerEmpty} role="note">Showing the first {LIMIT}. Refine your search to find others.</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default VariantPicker;
