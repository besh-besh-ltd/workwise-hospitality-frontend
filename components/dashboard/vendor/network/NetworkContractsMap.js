import React, { useCallback, useEffect, useRef, useState } from "react";
import { getNetworkDashboardContracts } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";
import { Pager } from "./networkFormat";

const PAGE_SIZE = 10;

// The org's routing assignment for that hotel (live one, else the latest).
const ASSIGNMENT_LABEL = {
  PENDING: { label: "Awaiting reply", tone: "info" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  TIMED_OUT: { label: "Timed out", tone: "warn" },
  REVOKED: { label: "Revoked", tone: "neutral" },
  SUPERSEDED: { label: "Superseded", tone: "neutral" },
};

const statusText = (s) => (s ? String(s).replace(/_/g, " ") : "—");

const ContractCell = ({ c, rowSpan }) => (
  <td rowSpan={rowSpan} style={{ verticalAlign: "top" }}>
    <div className="strong mono">{c.arc_number || `#${c.contract_id}`}</div>
    <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
      {c.title}
      {c.title ? " · " : ""}
      <span style={{ textTransform: "capitalize" }}>{statusText(c.status)}</span>
    </div>
  </td>
);

/**
 * The principal's rate contracts with, per hotel, the entity fulfilling it
 * (spec §8), from GET /dashboard/contracts.
 */
export default function NetworkContractsMap() {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  // Only the latest request may set state: a slow earlier page is dropped.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const res = await getNetworkDashboardContracts({ page, page_size: PAGE_SIZE });
      if (id !== latest.current) return;
      setData(res?.data || { items: [], total: 0 });
    } catch (err) {
      if (id !== latest.current) return;
      setError(networkErrorMessage(err, "Could not load the network's contracts."));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    latest.current += 1; // unmounted: drop whatever is in flight
  }, []);

  const items = data?.items || [];

  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <h2>Rate contracts and who fulfils each hotel</h2>
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
          Loading contracts…
        </div>
      ) : items.length === 0 ? (
        <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>
          No rate contracts yet.
        </div>
      ) : (
        <>
          <div className="section-body flush table-scroll">
            <table className="table" aria-label="Network contracts" aria-busy={loading}>
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Hotel</th>
                  <th>Fulfilled by</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const hotels = c.hotels || [];
                  if (hotels.length === 0) {
                    return (
                      <tr key={c.contract_id}>
                        <ContractCell c={c} rowSpan={1} />
                        <td style={{ color: "var(--fg-3)" }}>—</td>
                        <td style={{ color: "var(--fg-3)" }}>Supplied by HQ</td>
                      </tr>
                    );
                  }
                  return hotels.map((h, i) => {
                    const a = h.assignment_status ? ASSIGNMENT_LABEL[h.assignment_status] : null;
                    return (
                      <tr key={`${c.contract_id}-${h.hotel_id}`}>
                        {i === 0 && <ContractCell c={c} rowSpan={hotels.length} />}
                        <td>{h.hotel_name}</td>
                        <td>
                          <span className="flex items-center gap-2 flex-wrap">
                            <span>{h.fulfilling_name}</span>
                            {a && (
                              <span className={`status-pill ${a.tone}`}>
                                <span className="dot"></span>
                                <span>{a.label}</span>
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
          <Pager
            label="Contract pages"
            page={page}
            pageSize={data?.page_size || PAGE_SIZE}
            total={data?.total || 0}
            onPage={setPage}
          />
        </>
      )}
    </div>
  );
}
