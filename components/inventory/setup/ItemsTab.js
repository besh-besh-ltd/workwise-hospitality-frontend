import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Package, Plus, RefreshCw, Search } from "lucide-react";
import { listItems } from "@/services/inventory";
import { errorInfo } from "@/components/inventory/stock/stockUtils";
import ItemEditorModal from "./ItemEditorModal";
import NewItemModal from "./NewItemModal";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// The company's inventory items (GET /items, 50 a page). Opening one edits
// its details, mapped variants, units and barcodes.
//
// Props: { companyId (the company the Setup page acts on; sent as the list's
//          own hint, null to let the server decide), canAdmin (inventory.admin),
//          canUpdate (inventory.update) }

const PAGE_SIZE = 50;

const ItemsTab = ({ companyId = null, canAdmin, canUpdate }) => {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
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
    const seq = ++seqRef.current;
    setLoading(true);
    setLoadError(null);
    const params = {};
    if (search) params.search = search;
    params.page = page;
    if (companyId) params.hospitality_company_id = companyId;
    try {
      const res = await listItems(params);
      if (seq !== seqRef.current) return;
      setRows(Array.isArray(res?.rows) ? res.rows : []);
      setTotal(Number(res?.total) || 0);
    } catch (err) {
      if (seq !== seqRef.current) return;
      setLoadError(errorInfo(err, "Could not load the items.").message);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [search, page, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const onChanged = (item) => {
    setRows((list) => list.map((x) => (x.id === item.id ? { ...x, ...item } : x)));
    setEditing((cur) => (cur && cur.id === item.id ? { ...cur, ...item } : cur));
  };

  const onCreated = (item, { mapped } = {}) => {
    setCreating(false);
    if (item?.id) {
      toast.success(mapped ? `Variant mapped to ${item.displayName}` : `${item.displayName} created`);
      load();
      setEditing(item);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className={r.card}>
      <div className={r.filterBar}>
        <div className={r.filterGrow}>
          <label className={r.label} htmlFor="items-search">Search items</label>
          <div className={r.searchBox}>
            <Search size={14} aria-hidden="true" />
            <input
              id="items-search"
              className={r.input}
              type="search"
              placeholder="Item name or code"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
        {canAdmin && (
          <button type="button" className={`${r.btn} ${r.btnPrimary}`} style={{ alignSelf: "flex-end" }} onClick={() => setCreating(true)}>
            <Plus size={14} aria-hidden="true" /> New item
          </button>
        )}
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
          {[0, 1, 2].map((i) => <span key={i} className={r.sk} style={{ width: `${90 - i * 10}%`, marginBottom: 14 }} />)}
        </div>
      ) : rows.length === 0 ? (
        <div className={r.emptyState}>
          <Package size={22} aria-hidden="true" />
          <div className={r.emptyTitle} style={{ marginTop: 8 }}>{search ? "No item matches" : "No items yet"}</div>
          <div>Items are created when a PO line is first received, from the opening import, or here.</div>
        </div>
      ) : (
        <div className={r.tableWrap} aria-busy={loading || undefined}>
          <table className={`${r.listTable} ${s.labelledTable}`} aria-label="Items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Stock unit</th>
                <th>Expiry</th>
                <th className={r.num}>Variants</th>
                <th className={r.num}>Barcodes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id}>
                  <td>
                    <button type="button" className={`${r.btnLink} ${s.pickerName} ${s.tapLink}`} onClick={() => setEditing(it)}>
                      {it.displayName}
                    </button>
                    {it.itemCode && <div className={`${s.subtle} ${s.mono}`}>{it.itemCode}</div>}
                  </td>
                  <td data-label="Stock unit">{it.stockUom}</td>
                  <td data-label="Expiry">{it.trackExpiry ? "Tracked" : <span className={r.faint}>—</span>}</td>
                  <td className={r.num} data-label="Variants">{(it.variants || []).length}</td>
                  <td className={r.num} data-label="Barcodes">{(it.barcodes || []).length}</td>
                  <td data-label="Status">
                    {it.isActive === false
                      ? <span className={`${r.pill} ${r.pillNeutral}`}><span className={r.dot} />Inactive</span>
                      : <span className={`${r.pill} ${r.pillOk}`}><span className={r.dot} />Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className={r.pagination}>
          <span>Page <span className={s.mono}>{page}</span> of <span className={s.mono}>{pages}</span> · <span className={s.mono}>{total}</span> items</span>
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

      <ItemEditorModal item={editing} canAdmin={canAdmin} canUpdate={canUpdate} onHide={() => setEditing(null)} onChanged={onChanged} />
      <NewItemModal show={creating} companyId={companyId} onHide={() => setCreating(false)} onCreated={onCreated} />
    </section>
  );
};

export default ItemsTab;
