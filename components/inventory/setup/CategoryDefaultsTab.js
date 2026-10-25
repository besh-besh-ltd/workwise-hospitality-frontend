import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { getCategoryDefaults, saveCategoryDefaults } from "@/services/inventory";
import { listRootCategories } from "@/services/arc_v2";
import { errorInfo } from "@/components/inventory/stock/stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Per-category defaults for the company (GET / PUT /category-defaults; the
// PUT replaces the whole set). A product takes the defaults of its nearest
// listed category, so top-level categories are usually enough.
//
// Props: { companyId (the Setup page's company, or null), canAdmin (inventory.admin) }

const toRow = (x) => ({
  categoryId: Number(x.categoryId),
  categoryName: x.categoryName || `Category ${x.categoryId}`,
  trackExpiry: !!x.trackExpiry,
  defaultMarkOutOnArrival: !!x.defaultMarkOutOnArrival,
});
const payloadOf = (rows) =>
  rows.map((x) => ({ categoryId: x.categoryId, trackExpiry: x.trackExpiry, defaultMarkOutOnArrival: x.defaultMarkOutOnArrival }));

const CategoryDefaultsTab = ({ companyId = null, canAdmin }) => {
  const [saved, setSaved] = useState(null);
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState(null);
  const [adding, setAdding] = useState("");
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await getCategoryDefaults(companyId);
      const list = (Array.isArray(res?.rows) ? res.rows : Array.isArray(res) ? res : []).map(toRow);
      setSaved(list);
      setRows(list);
    } catch (err) {
      setLoadError(errorInfo(err, "Could not load the category defaults.").message);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canAdmin) return undefined;
    let live = true;
    listRootCategories()
      .then((res) => {
        if (!live) return;
        const list = res?.data?.categories || res?.categories || [];
        setCategories(list.map((c) => ({ id: Number(c.id), title: c.title })));
      })
      .catch(() => {
        if (live) setCategories([]);
      });
    return () => {
      live = false;
    };
  }, [canAdmin]);

  const listed = useMemo(() => new Set(rows.map((x) => x.categoryId)), [rows]);
  const addable = (categories || []).filter((c) => !listed.has(c.id));
  const dirty = saved && JSON.stringify(payloadOf(rows)) !== JSON.stringify(payloadOf(saved));

  const patch = (id, change) => setRows((list) => list.map((x) => (x.categoryId === id ? { ...x, ...change } : x)));

  const add = () => {
    const c = (categories || []).find((x) => x.id === Number(adding));
    if (!c) return;
    setRows((list) => [...list, { categoryId: c.id, categoryName: c.title, trackExpiry: false, defaultMarkOutOnArrival: false }]);
    setAdding("");
  };

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await saveCategoryDefaults(payloadOf(rows), companyId);
      const list = Array.isArray(res?.rows) ? res.rows.map((x) => toRow({ ...rows.find((y) => y.categoryId === Number(x.categoryId)), ...x })) : rows;
      setSaved(list);
      setRows(list);
      toast.success("Category defaults saved");
    } catch (err) {
      setError(errorInfo(err, "Could not save the category defaults.").message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={r.card}>
      <div className={r.cardHead}>
        <h2 className={r.cardTitle}>Category defaults</h2>
      </div>
      <div className={r.cardBody}>
        <p className={r.meta} style={{ marginTop: 0 }}>
          New items start with their category&apos;s defaults. &ldquo;Mark out on arrival&rdquo; issues the goods to the PO&apos;s
          department as soon as they are received, for things that never sit in the store.
        </p>
        {loadError ? (
          <div className={r.emptyState} role="alert">
            <div className={r.emptyTitle}>{loadError}</div>
            <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ marginTop: 12 }} onClick={load}>
              <RefreshCw size={14} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : !saved ? (
          <div aria-busy="true">
            {[0, 1].map((i) => <span key={i} className={r.sk} style={{ width: `${80 - i * 15}%`, marginBottom: 14 }} />)}
          </div>
        ) : (
          <>
            {rows.length === 0 ? (
              <div className={r.emptyState}><div className={r.emptyTitle}>No category defaults yet</div></div>
            ) : (
              <div className={r.tableWrap}>
                <table className={`${r.listTable} ${s.labelledTable}`} aria-label="Category defaults">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Tracks expiry</th>
                      <th>Mark out on arrival</th>
                      {canAdmin && <th><span className={r.srOnly}>Remove</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((x) => (
                      <tr key={x.categoryId}>
                        <td data-label="Category" style={{ fontWeight: 600 }}>{x.categoryName}</td>
                        <td data-label="Tracks expiry">
                          <label className={s.switchHit}><input
                            type="checkbox"
                            className={s.switch}
                            role="switch"
                            aria-label={`Tracks expiry for ${x.categoryName}`}
                            checked={x.trackExpiry}
                            disabled={!canAdmin || saving}
                            onChange={(e) => patch(x.categoryId, { trackExpiry: e.target.checked })}
                          /></label>
                        </td>
                        <td data-label="Mark out on arrival">
                          <label className={s.switchHit}><input
                            type="checkbox"
                            className={s.switch}
                            role="switch"
                            aria-label={`Mark out on arrival for ${x.categoryName}`}
                            checked={x.defaultMarkOutOnArrival}
                            disabled={!canAdmin || saving}
                            onChange={(e) => patch(x.categoryId, { defaultMarkOutOnArrival: e.target.checked })}
                          /></label>
                        </td>
                        {canAdmin && (
                          <td>
                            <button
                              type="button"
                              className={s.removeBtn}
                              aria-label={`Remove ${x.categoryName}`}
                              onClick={() => setRows((list) => list.filter((y) => y.categoryId !== x.categoryId))}
                              disabled={saving}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canAdmin && (
              <div className={r.filterBar} style={{ padding: "14px 0 0" }}>
                <div className={r.filterGrow}>
                  <label className={r.label} htmlFor="cd-add">Add a category</label>
                  <select
                    id="cd-add"
                    className={r.select}
                    value={adding}
                    disabled={!categories || saving}
                    onChange={(e) => setAdding(e.target.value)}
                  >
                    <option value="">{categories ? "Choose a category…" : "Loading categories…"}</option>
                    {addable.map((c) => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
                  </select>
                </div>
                <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ alignSelf: "flex-end" }} onClick={add} disabled={!adding}>
                  <Plus size={14} aria-hidden="true" /> Add
                </button>
              </div>
            )}

            {error && <div className={r.formError} role="alert" style={{ marginTop: 12 }}>{error}</div>}
            {canAdmin ? (
              <div style={{ marginTop: 14 }}>
                <button type="button" className={`${r.btn} ${r.btnPrimary}`} onClick={save} disabled={saving || !dirty}>
                  {saving ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
                  Save category defaults
                </button>
              </div>
            ) : (
              <p className={r.meta} style={{ marginBottom: 0 }}>Only an inventory admin can change these.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default CategoryDefaultsTab;
