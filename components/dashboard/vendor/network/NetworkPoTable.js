import React, { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (entityId) params.entity_vendor_id = Number(entityId);
      const res = await getNetworkDashboardPos(params);
      setData(res?.data || { items: [], total: 0 });
    } catch (err) {
      setError(networkErrorMessage(err, "Could not load the network's purchase orders."));
    } finally {
      setLoading(false);
    }
  }, [page, entityId]);

  useEffect(() => {
    load();
  }, [load]);

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
            {entities.map((e) => (
              <option key={e.vendor_id} value={String(e.vendor_id)}>
                {e.name}
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
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
