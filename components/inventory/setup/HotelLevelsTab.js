import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Save, Search } from "lucide-react";
import { listHotelItems, saveHotelItem } from "@/services/inventory";
import { BIN_MAX, LEVEL_FIELDS, checkLevels, errorInfo, levelsForm, stockRoutes } from "@/components/inventory/stock/stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Min / reorder / max and bin for every item at one hotel
// (GET /hotel-items, PUT /hotel-items/:hotelId/:invItemId per row).
//
// Props: { hotelId, canUpdate (inventory.update at this hotel) }

const PAGE_SIZE = 50;
const FIELDS = [...LEVEL_FIELDS, { key: "binLabel", label: "Bin" }];

const sameForm = (a, b) => FIELDS.every((f) => String(a?.[f.key] ?? "").trim() === String(b?.[f.key] ?? "").trim());

const HotelLevelsTab = ({ hotelId, canUpdate }) => {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [forms, setForms] = useState({}); // invItemId → form
  const [errors, setErrors] = useState({}); // invItemId → {field: message, _row: message}
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const seqRef = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = useCallback(async () => {
    if (!hotelId) return;
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadError(null);
    const params = { hotelId: Number(hotelId) };
    if (search) params.search = search;
    params.page = page;
    try {
      const res = await listHotelItems(params);
      if (seq !== seqRef.current) return;
      const list = Array.isArray(res?.rows) ? res.rows : [];
      setRows(list);
      setTotal(Number(res?.total) || 0);
      setForms(Object.fromEntries(list.map((row) => [row.invItemId, levelsForm(row)])));
      setErrors({});
    } catch (err) {
      if (seq !== seqRef.current) return;
      setLoadError(errorInfo(err, "Could not load the levels.").message);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [hotelId, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (id, key, value) => {
    setForms((f) => ({ ...f, [id]: { ...f[id], [key]: value } }));
    setErrors((e) => (e[id] ? { ...e, [id]: undefined } : e));
  };

  const save = async (row) => {
    const id = row.invItemId;
    if (savingId) return;
    const checked = checkLevels(forms[id] || {});
    if (checked.errors) {
      setErrors((e) => ({ ...e, [id]: checked.errors }));
      return;
    }
    setSavingId(id);
    try {
      const res = await saveHotelItem(Number(hotelId), id, checked.payload);
      const next = { ...row, ...checked.payload, ...(res && typeof res === "object" ? res : {}) };
      setRows((list) => list.map((x) => (x.invItemId === id ? next : x)));
      setForms((f) => ({ ...f, [id]: levelsForm(next) }));
      toast.success(`Levels saved for ${row.displayName}`);
    } catch (err) {
      const info = errorInfo(err, "Could not save the levels.");
      const field = info.details?.field;
      setErrors((e) => ({ ...e, [id]: field && FIELDS.some((f) => f.key === field) ? { [field]: info.message } : { _row: info.message } }));
    } finally {
      setSavingId(null);
    }
  };

  if (!hotelId) {
    return <div className={r.emptyState}><div className={r.emptyTitle}>Choose a hotel to set its levels</div></div>;
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className={r.card}>
      <div className={r.filterBar}>
        <div className={r.filterGrow}>
          <label className={r.label} htmlFor="levels-search">Search items</label>
          <div className={r.searchBox}>
            <Search size={14} aria-hidden="true" />
            <input
              id="levels-search"
              className={r.input}
              type="search"
              placeholder="Item name or code"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      </div>
      {!canUpdate && (
        <p className={r.meta} style={{ margin: "0 16px 12px" }}>You can see the levels here; changing them needs inventory update rights.</p>
      )}
      {loadError ? (
        <div className={r.emptyState} role="alert">
          <div className={r.emptyTitle}>{loadError}</div>
          <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ marginTop: 12 }} onClick={load}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className={r.cardBody} aria-busy="true">
          {[0, 1, 2].map((i) => <span key={i} className={r.sk} style={{ width: `${90 - i * 10}%`, marginBottom: 14 }} />)}
        </div>
      ) : rows.length === 0 ? (
        <div className={r.emptyState}>
          <div className={r.emptyTitle}>{search ? "No item matches" : "No items yet"}</div>
          <div>Items appear here once they are set up in the Items tab or received.</div>
        </div>
      ) : (
        <div className={r.tableWrap} aria-busy={loading || undefined}>
          <table className={`${r.listTable} ${s.labelledTable}`} aria-label="Levels at this hotel">
            <thead>
              <tr>
                <th>Item</th>
                {FIELDS.map((f) => <th key={f.key} className={f.key === "binLabel" ? undefined : r.num}>{f.label}</th>)}
                {canUpdate && <th><span className={r.srOnly}>Save</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = row.invItemId;
                const form = forms[id] || levelsForm(row);
                const err = errors[id] || {};
                const dirty = !sameForm(form, levelsForm(row));
                const messages = [...FIELDS.map((f) => err[f.key]).filter(Boolean), err._row].filter(Boolean);
                return (
                  <tr key={id} className={messages.length ? s.rowError : undefined}>
                    <td data-label="Item">
                      <Link href={stockRoutes.item(hotelId, id)} className={r.docLink}>{row.displayName}</Link>
                      <div className={s.subtle}>in {row.stockUom}</div>
                      {messages.map((m) => <div key={m} className={s.fieldError} role="alert">{m}</div>)}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} data-label={f.label} className={f.key === "binLabel" ? undefined : r.num}>
                        {canUpdate ? (
                          <input
                            className={`${r.input} ${s.inlineInput} ${err[f.key] ? r.inputInvalid : ""}`}
                            inputMode={f.key === "binLabel" ? undefined : "decimal"}
                            maxLength={f.key === "binLabel" ? BIN_MAX : undefined}
                            aria-label={`${f.label} of ${row.displayName}`}
                            aria-invalid={err[f.key] ? "true" : undefined}
                            value={form[f.key]}
                            onChange={(e) => edit(id, f.key, e.target.value)}
                          />
                        ) : (
                          <span className={f.key === "binLabel" ? s.mono : undefined}>{form[f.key] || "—"}</span>
                        )}
                      </td>
                    ))}
                    {canUpdate && (
                      <td>
                        <button
                          type="button"
                          className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                          aria-label={`Save ${row.displayName}`}
                          onClick={() => save(row)}
                          disabled={!dirty || savingId === id}
                        >
                          {savingId === id ? <Loader2 size={13} className={r.spin} aria-hidden="true" /> : <Save size={13} aria-hidden="true" />}
                          Save
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {total > PAGE_SIZE && (
        <div className={r.pagination}>
          <span>Page <span className={s.mono}>{page}</span> of <span className={s.mono}>{pages}</span></span>
          <div className={r.pages}>
            <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} aria-label="Previous page">
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || loading} aria-label="Next page">
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HotelLevelsTab;
