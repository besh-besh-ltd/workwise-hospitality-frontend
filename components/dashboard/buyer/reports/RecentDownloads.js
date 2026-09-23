import React, { useEffect, useMemo, useRef, useState } from "react";
import { History } from "lucide-react";
import { getExportHistory } from "@/services/reports";

/* ─────────────────────────────────────────────────────────────────────────
   Your recent downloads.

   Every report the server produces writes a ledger row, including the
   synchronous ones where there is no job to track — the row records the
   DISCLOSURE, not the work. This panel is the user-facing half of that: it
   answers "did that download actually go through, and what filters was it
   built with" without anyone having to open the file to find out.

   Scoped to the caller by the endpoint. It is your history, never anyone
   else's, so this is not an audit surface for other people's exports.
   ───────────────────────────────────────────────────────────────────────── */

const LIMIT = 8;

function whenLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} hr ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** The filters a row was built with, as a short human line. */
function filterLabel(filters) {
  if (!filters || typeof filters !== "object") return null;
  const bits = [];
  if (filters.fy) bits.push(`FY ${filters.fy}`);
  else if (filters.from && filters.to) bits.push(`${filters.from} to ${filters.to}`);
  const units = Array.isArray(filters.hotel_ids) ? filters.hotel_ids.length : 0;
  if (units > 0) bits.push(`${units} business unit${units === 1 ? "" : "s"}`);
  return bits.length ? bits.join(" · ") : null;
}

export default function RecentDownloads({ titleFor }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    getExportHistory(LIMIT)
      .then((res) => {
        if (id !== seq.current) return;
        setRows(res?.data?.exports || []);
      })
      // A history panel is a convenience. If it cannot load, the page should
      // carry on rendering the reports rather than failing around it.
      .catch(() => {
        if (id === seq.current) setRows([]);
      })
      .finally(() => {
        if (id === seq.current) setLoaded(true);
      });
  }, []);

  const visible = useMemo(() => rows.slice(0, LIMIT), [rows]);

  // Nothing downloaded yet is not worth an empty state — it would just be a
  // box explaining that a box is empty.
  if (!loaded || visible.length === 0) return null;

  return (
    <section>
      <div className="section-label">
        <History size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        Your recent downloads
      </div>
      <div className="section-card">
        {visible.map((r) => {
          const filters = filterLabel(r.filters);
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                padding: "7px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{titleFor(r.report_key) || r.report_key}</div>
                {filters && <div className="kt-sub">{filters}</div>}
              </div>
              <div className="kt-sub" style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                {r.status === "FAILED" ? (
                  <span style={{ color: "var(--danger)" }}>Failed</span>
                ) : (
                  <>
                    {r.row_count === null || r.row_count === undefined
                      ? ""
                      : `${Number(r.row_count).toLocaleString("en-IN")} rows · `}
                    {whenLabel(r.created_at)}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
