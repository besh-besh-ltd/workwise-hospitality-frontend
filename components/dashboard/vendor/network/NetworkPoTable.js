import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNetworkDashboardPos } from "@/services/vendorNetwork";
import { vendorStatusLabel } from "@/components/dashboard/vendor/purchase-orders/vendorPoStatus";
import { networkErrorMessage } from "./networkErrors";
import { Pager, fmtDate, fmtInr } from "./networkFormat";

const PAGE_SIZE = 10;

// The network view of a PO status: as vendorStatusLabel, except that a PO waiting to be
// accepted waits for its supplier entity, which is not necessarily the HQ reading this.
const AWAITING_SUPPLIER = new Set(["sent", "acceptance_pending"]);
export const networkPoStatusLabel = (status) =>
  AWAITING_SUPPLIER.has(status) ? "Awaiting supplier acceptance" : vendorStatusLabel(status);

/**
 * The network's purchase orders across every entity (spec §8), newest first,
 * from GET /dashboard/pos. `entities` (the summary's) feed the entity filter.
 */
export default function NetworkPoTable({ entities = [] }) {
  const [page, setPage] = useState(1);
  const [entityId, setEntityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  // Entities met in PO rows (a REMOVED entity keeps its POs but is not in the summary).
  const [seen, setSeen] = useState(() => new Map());
  // Only the latest request may set state: a slow earlier page or filter is dropped.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (entityId) params.entity_vendor_id = Number(entityId);
      const res = await getNetworkDashboardPos(params);
      if (id !== latest.current) return;
      const next = res?.data || { items: [], total: 0 };
      setData(next);
      setSeen((prev) => {
        const fresh = (next.items || []).filter((p) => p.entity_vendor_id != null && !prev.has(Number(p.entity_vendor_id)));
        if (!fresh.length) return prev;
        const map = new Map(prev);
        fresh.forEach((p) => map.set(Number(p.entity_vendor_id), p.entity_name));
        return map;
      });
    } catch (err) {
      if (id !== latest.current) return;
      setError(networkErrorMessage(err, "Could not load the network's purchase orders."));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [page, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    latest.current += 1; // unmounted: drop whatever is in flight
  }, []);

  // The summary's entities, then any entity seen only in PO rows; REMOVED ones say so.
  const entityOptions = useMemo(() => {
    const options = entities.map((e) => ({
      id: Number(e.vendor_id),
      label: e.status === "REMOVED" ? `${e.name} (removed)` : e.name,
    }));
    const known = new Set(options.map((o) => o.id));
    for (const [id, name] of seen) {
      if (!known.has(id)) options.push({ id, label: `${name || `Entity #${id}`} (removed)` });
    }
    return options;
  }, [entities, seen]);

  const items = data?.items || [];

  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <h2>Purchase orders</h2>
        </div>
        <div className="h-right flex items-center gap-2">
          <label htmlFor="vn-po-entity" style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
            Entity
          </label>
          <select
            id="vn-po-entity"
            className="select"
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All entities</option>
            {entityOptions.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <div className="section-body flex items-center justify-between gap-3">
          <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      ) : loading && !data ? (
        <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>
          Loading purchase orders…
        </div>
      ) : items.length === 0 ? (
        <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>
          {entityId ? "No purchase orders for this entity." : "No purchase orders in the network yet."}
        </div>
      ) : (
        <>
          <div className="section-body flush table-scroll">
            <table className="table" aria-label="Network purchase orders" aria-busy={loading}>
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Entity</th>
                  <th>Hotel</th>
                  <th className="right">Value</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="strong mono">
                      {p.po_number || `#${p.id}`}
                      {p.is_call_off && (
                        <span className="pill outline" style={{ marginLeft: 6 }}>
                          Call-off
                        </span>
                      )}
                    </td>
                    <td>{p.entity_name}</td>
                    <td>{p.hotel_name || "—"}</td>
                    <td className="right mono">{fmtInr(p.amount)}</td>
                    <td>
                      <span className="pill">{networkPoStatusLabel(p.status)}</span>
                    </td>
                    <td>{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            label="Purchase order pages"
            page={page}
            pageSize={data?.page_size || PAGE_SIZE}
            total={data?.total || 0}
            onPage={setPage}
            // The rows and total on screen belong to the previous request until the new one lands.
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
