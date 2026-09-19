import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, Download } from "lucide-react";
import FyFilter from "@/components/shared/FyFilter";
import HotelFilter from "@/components/shared/HotelFilter";
import { defaultFyState } from "@/utils/financialYear";
import { previewReport, downloadReport } from "@/services/reports";

/* ─────────────────────────────────────────────────────────────────────────
   Running one report: pick filters, check the preview, download.

   The preview exists so nobody downloads a workbook to find out their filters
   caught the wrong period. It renders the same columns in the same order the
   workbook will, because the server derives both from one column list.

   Filters are sent, never rows. The server re-runs the caller's own scoped
   query to build the file, so the download cannot contain anything the preview
   was not allowed to show.
   ───────────────────────────────────────────────────────────────────────── */

const PREVIEW_DEBOUNCE_MS = 250;

/** Display-only. The workbook does its own formatting server-side. */
function formatCell(value, type) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "money") return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (type === "percent") return `${(Number(value) * 100).toFixed(1)}%`;
  if (type === "int") return Number(value).toLocaleString("en-IN");
  if (type === "date") {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(value);
}

export default function ReportRunner({ report, onBack }) {
  const [fy, setFy] = useState(defaultFyState());
  const [hotelIds, setHotelIds] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const seq = useRef(0);

  const supports = useMemo(() => {
    const keys = new Set((report.filters || []).map((f) => f.key));
    return { fy: keys.has("fy"), hotels: keys.has("hotel_ids") };
  }, [report]);

  // The payload both preview and download send. One object, so what was
  // previewed is exactly what gets built.
  const payload = useMemo(() => {
    const body = {};
    if (supports.fy) {
      if (fy.mode === "fy") body.fy = fy.fy;
      else if (fy.mode === "custom" && fy.from && fy.to) {
        body.from = fy.from;
        body.to = fy.to;
      }
    }
    if (supports.hotels && hotelIds.length > 0) body.hotel_ids = hotelIds;
    return body;
  }, [fy, hotelIds, supports]);

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      previewReport(report.key, payload)
        .then((res) => {
          if (id !== seq.current) return;
          setPreview(res?.data || null);
        })
        .catch(() => {
          if (id !== seq.current) return;
          setPreview(null);
        })
        .finally(() => {
          if (id === seq.current) setLoading(false);
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [report.key, payload]);

  const onDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadReport(report.key, payload);
    } catch (e) {
      toast.error(e?.message || "Could not download the report");
    } finally {
      setDownloading(false);
    }
  }, [report.key, payload]);

  const periodLabel = preview?.period?.label
    || (fy.mode === "fy" ? `FY ${fy.fy}` : fy.mode === "custom" ? `${fy.from} to ${fy.to}` : "—");

  const hasRows = (preview?.rows?.length || 0) > 0;

  return (
    <main className="main-body">
      <div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> All reports
        </button>
      </div>

      <div>
        <div className="page-eyebrow">{report.family} · {report.number}</div>
        <h1 className="page-h1">{report.title}</h1>
        <div className="page-sub">{report.description}</div>
      </div>

      <div className="contracts-layout">
        <aside className="filter-sidebar">
          <div className="fs-head">
            <span>Filters</span>
            <button
              type="button"
              className="reset-link"
              onClick={() => {
                setFy(defaultFyState());
                setHotelIds([]);
              }}
            >
              Reset
            </button>
          </div>

          {/* FyFilter is controlled and holds no state; the payload maps its
              shape on the way out, so there is nothing to translate here. */}
          {supports.fy && <FyFilter value={fy} onChange={setFy} />}

          {supports.hotels && (
            <div className="filter-group">
              <div className="fg-label">Business unit</div>
              <HotelFilter
                selectedHotelIds={hotelIds}
                onSelectionChange={setHotelIds}
                placeholder="All I can access"
              />
            </div>
          )}
        </aside>

        <div>
          <div className="list-toolbar">
            <div className="lt-left">
              {loading ? (
                "Checking…"
              ) : (
                <>
                  <span className="em">{preview?.total_rows ?? 0}</span> rows · {periodLabel}
                </>
              )}
            </div>
            <div className="lt-right">
              <button
                type="button"
                className="btn btn-blue btn-sm"
                onClick={onDownload}
                disabled={downloading || loading || !hasRows}
              >
                <Download size={13} />
                {downloading ? "Preparing…" : "Download Excel"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="section-card">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="arc-sk" style={{ height: 22, display: "block", marginBottom: 8 }} />
              ))}
            </div>
          )}

          {!loading && !hasRows && (
            <div className="empty-state">
              <h2>Nothing to report</h2>
              <p>
                No records match these filters for {periodLabel}. Try a different financial year or
                clear the business-unit filter.
              </p>
            </div>
          )}

          {!loading && hasRows && (
            <div className="section-card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {preview.columns.map((c) => (
                      <th
                        key={c.key}
                        style={{
                          textAlign: c.align === "right" ? "right" : c.align === "center" ? "center" : "left",
                          padding: "8px 10px",
                          borderBottom: "1px solid var(--border-strong)",
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                        }}
                      >
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>
                      {preview.columns.map((c) => (
                        <td
                          key={c.key}
                          style={{
                            textAlign: c.align === "right" ? "right" : c.align === "center" ? "center" : "left",
                            padding: "7px 10px",
                            borderBottom: "1px solid var(--border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCell(row[c.key], c.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {preview.truncated && (
                <div className="page-sub" style={{ marginTop: 10 }}>
                  Showing the first {preview.rows.length} of {preview.total_rows} rows. The download
                  contains all of them.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
