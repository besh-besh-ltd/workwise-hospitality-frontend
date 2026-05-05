import React, { useEffect } from "react";

// Phase 3.5 — Iteration Snapshot Drawer.
//
// When the buyer clicks "View Iteration N data" on the IterationHistoryPanel,
// this side drawer opens and renders every populated snapshot blob as
// readable tables. Read-only — the data is preserved for audit only.
//
// Bespoke styling, no Bootstrap.

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
};

// Renders a generic row of arbitrary objects as a small table. Picks
// columns from the first row's keys; primitives only — nested values
// get JSON-stringified.
const SnapshotTable = ({ title, rows }) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const cols = Object.keys(rows[0]).filter((k) => !k.startsWith("_"));
  return (
    <div style={{ marginBottom: 18 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>{title}</h4>
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {cols.map((c) => (
                <th
                  key={c}
                  style={{
                    padding: "6px 8px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    fontSize: 10,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                {cols.map((c) => {
                  const v = row[c];
                  const display = v == null
                    ? "—"
                    : typeof v === "object"
                      ? JSON.stringify(v)
                      : String(v);
                  return (
                    <td
                      key={c}
                      style={{ padding: "6px 8px", color: "#0f172a", verticalAlign: "top", maxWidth: 240 }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {display}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const IterationSnapshotDrawer = ({ isOpen, onClose, history }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !history) return null;

  const arc = history.snapshot_arc || null;
  const finalization = history.snapshot_finalization || null;
  const negotiation = history.snapshot_negotiation || null;
  const techEval = history.snapshot_tech_eval || null;
  const quotes = history.snapshot_quotes || null;
  const approvalInstances = history.snapshot_approval_instances || null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2070 }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="iteration-drawer-title"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "min(720px, 100vw)",
          background: "#fff",
          boxShadow: "-12px 0 32px rgba(15,23,42,0.18)",
          zIndex: 2071,
          overflowY: "auto",
          padding: "22px 26px",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                background: "#fef3c7",
                color: "#92400e",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Iteration {history.iteration_number} · Snapshot
            </span>
            <h2 id="iteration-drawer-title" style={{ fontSize: 17, fontWeight: 600, color: "#0f172a", margin: 0 }}>
              Sent back from {history.sent_back_from_stage} to {history.sent_back_to_stage}
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              by {history.sent_back_by_name || `User #${history.sent_back_by}`} on {formatDate(history.sent_back_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              color: "#64748b",
              cursor: "pointer",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </header>

        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "#78350f",
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          This data was wiped on the send-back to <strong>{history.sent_back_to_stage}</strong>. It is preserved
          here for audit only and is not editable.
        </div>

        {history.reason && (
          <section style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px", color: "#0f172a" }}>Reason</h4>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: 1.6,
                color: "#0f172a",
                whiteSpace: "pre-wrap",
              }}
            >
              {history.reason}
            </div>
          </section>
        )}

        {arc && (
          <>
            <SnapshotTable title="ARC envelopes (per vendor)" rows={arc.envelopes || []} />
            <SnapshotTable title="ARC items (per product × vendor)" rows={arc.items || []} />
            <SnapshotTable title="ARC hotels covered" rows={arc.hotels || []} />
          </>
        )}

        {finalization && (
          <>
            <SnapshotTable title="Quote finalization" rows={finalization.finalizations || []} />
            <SnapshotTable title="Finalization history" rows={finalization.history || []} />
          </>
        )}

        {negotiation && (
          <>
            <SnapshotTable title="Negotiation rounds" rows={negotiation.rounds || []} />
            <SnapshotTable title="Round quotes" rows={negotiation.round_quotes || []} />
            <SnapshotTable title="Round approvals" rows={negotiation.round_approvals || []} />
          </>
        )}

        {techEval && Object.keys(techEval).length > 0 && (
          <>
            {Object.entries(techEval).map(([table, rows]) => (
              <SnapshotTable key={table} title={`Tech eval · ${table}`} rows={rows} />
            ))}
          </>
        )}

        {quotes && (
          <>
            <SnapshotTable title="Quotes (deleted on send-back to DRAFT)" rows={quotes.quotes || []} />
            <SnapshotTable title="Quote items" rows={quotes.quote_items || []} />
          </>
        )}

        {approvalInstances && approvalInstances.length > 0 && (
          <SnapshotTable title="Approval instances (cancelled, not deleted)" rows={approvalInstances} />
        )}

        {(history.affected_products?.length > 0 || history.affected_vendors?.length > 0) && (
          <section style={{ marginTop: 18, fontSize: 12, color: "#475569" }}>
            <div>
              <strong>Affected products:</strong>{" "}
              {history.affected_products?.length ? history.affected_products.join(", ") : "—"}
            </div>
            <div>
              <strong>Affected vendors:</strong>{" "}
              {history.affected_vendors?.length ? history.affected_vendors.join(", ") : "—"}
            </div>
          </section>
        )}
      </aside>
    </>
  );
};

export default IterationSnapshotDrawer;
