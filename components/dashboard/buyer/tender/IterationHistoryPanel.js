import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getTenderIterationHistory } from "@/services/arc";
import IterationSnapshotDrawer from "./IterationSnapshotDrawer";

// Phase 3.5 — Iteration History panel.
//
// Sits prominently above the tender details / lifecycle timeline.
// Shows every send-back as an amber-bordered card with: from→to,
// reason, who, when, and a "View Iteration N data" button that opens
// the IterationSnapshotDrawer.
//
// Bespoke styling, no Bootstrap. Returns null when there are no
// send-back rows so the panel doesn't render extraneous UI.

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
};

const HUMAN_STAGE = (raw) => {
  if (!raw) return "—";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const IterationHistoryPanel = ({ rfqId, currentIteration }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    if (!rfqId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getTenderIterationHistory(rfqId);
        const rows = res?.data?.data || res?.data || [];
        if (!cancelled) setHistory(rows);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message?.response?.data?.message || "Failed to load iteration history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rfqId]);

  if (loading) return null;
  if (!history || history.length === 0) return null;

  return (
    <section
      role="region"
      aria-label="Iteration history"
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 18px",
        marginBottom: 18,
        borderRadius: 10,
        border: "1px solid #f59e0b",
        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        boxShadow: "0 1px 3px rgba(245,158,11,0.18)",
      }}
    >
      <div
        aria-hidden
        style={{
          flex: "0 0 auto",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#f59e0b",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        ↺
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "3px 10px",
              background: "#92400e",
              color: "#fff",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Iteration History
          </span>
          {currentIteration ? (
            <span
              style={{
                padding: "3px 10px",
                background: "#fff",
                color: "#92400e",
                border: "1px solid #f59e0b",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Current iteration: {currentIteration}
            </span>
          ) : null}
          <span style={{ fontSize: 12, color: "#78350f" }}>
            This tender has been sent back {history.length} time{history.length === 1 ? "" : "s"}.
          </span>
        </div>

        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {history.map((row) => (
            <li
              key={row.id}
              style={{
                background: "#fff8e1",
                border: "1px solid #fde68a",
                borderRadius: 6,
                padding: "10px 12px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#451a03" }}>
                  Iteration {row.iteration_number} → sent back from{" "}
                  <strong>{HUMAN_STAGE(row.sent_back_from_stage)}</strong> to{" "}
                  <strong>{HUMAN_STAGE(row.sent_back_to_stage)}</strong>
                </div>
                <div style={{ fontSize: 11, color: "#78350f", marginTop: 2 }}>
                  by {row.sent_back_by_name || `User #${row.sent_back_by}`} · {formatDate(row.sent_back_at)}
                </div>
                {row.reason && (
                  <div style={{
                    fontSize: 11.5,
                    color: "#451a03",
                    marginTop: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}>
                    "{row.reason}"
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDrawer(row)}
                style={{
                  background: "transparent",
                  border: "1px solid #f59e0b",
                  color: "#92400e",
                  padding: "7px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                View Iteration {row.iteration_number} data →
              </button>
            </li>
          ))}
        </ol>
      </div>

      <IterationSnapshotDrawer
        isOpen={!!drawer}
        history={drawer}
        onClose={() => setDrawer(null)}
      />
    </section>
  );
};

export default IterationHistoryPanel;
