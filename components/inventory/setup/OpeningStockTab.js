import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Lock, Upload } from "lucide-react";
import { previewOpeningStock, postOpeningStock } from "@/services/inventory";
import { fmtQty, inr, newClientEventId } from "@/components/inventory/receive/receiveUtils";
import { errorInfo, stockRoutes } from "@/components/inventory/stock/stockUtils";
import { loadXlsx } from "@/utils/xlsx";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Opening stock for one hotel: upload a sheet → preview (no side effects) →
// post every row as one OPENING adjustment. A row whose Variant SKU has no
// item yet comes back `willCreate`; posting creates that item from the
// variant in the same transaction. Any row error blocks the post.
//
// Props: { hotelId, hotelName, canAdmin (inventory.admin at this hotel) }

const COLUMNS = ["Item Code or Variant SKU", "Item Name", "Qty", "Unit", "Unit Cost", "Bin"];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const downloadTemplate = async () => {
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.aoa_to_sheet([COLUMNS, ["RICE-25", "Basmati rice", 24, "bag", 1800, "A-01"]]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Opening stock");
  XLSX.writeFile(book, "opening-stock-template.xlsx");
};

/** The post body row for a clean preview row (B3: willCreate rows carry their variant). */
export const postRowOf = (row) =>
  row.willCreate
    ? {
      invItemId: null,
      productVariantId: row.productVariantId,
      stockUom: row.stockUom,
      stockQty: row.stockQty,
      unitCost: row.unitCost,
      binLabel: row.binLabel ?? null,
    }
    : { invItemId: row.invItemId, stockQty: row.stockQty, unitCost: row.unitCost, binLabel: row.binLabel ?? null };

const OpeningStockTab = ({ hotelId, hotelName, canAdmin }) => {
  const fileId = useId();
  const inputRef = useRef(null);
  const keyRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null); // {rows, okCount, errorCount}
  const [rowErrors, setRowErrors] = useState({}); // preview index → message (from the post)
  const [previewing, setPreviewing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const [posted, setPosted] = useState(null); // {adjustmentId, adjustmentNumber}

  const reset = () => {
    setFileName("");
    setPreview(null);
    setRowErrors({});
    setError(null);
    setPosted(null);
    keyRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  // Another hotel means another import.
  useEffect(() => {
    reset();
  }, [hotelId]);

  if (!canAdmin) {
    return (
      <div className={r.stateCard}>
        <div className={r.stateIc}><Lock size={20} aria-hidden="true" /></div>
        <h2 className={r.stateTitle}>Opening stock is set by an inventory admin</h2>
        <p className={r.stateSub}>
          Ask an admin{hotelName ? ` at ${hotelName}` : ""} to import it, or start a count instead.
        </p>
        <div className={r.stateActions}>
          <Link href={stockRoutes.counts()} className={`${r.btn} ${r.btnSecondary}`}>Go to counts</Link>
        </div>
      </div>
    );
  }

  if (!hotelId) {
    return <div className={r.emptyState}><div className={r.emptyTitle}>Choose a hotel to import its opening stock</div></div>;
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setRowErrors({});
    setError(null);
    setPosted(null);
    setPreviewing(true);
    try {
      const res = await previewOpeningStock(hotelId, file);
      setPreview({
        rows: Array.isArray(res?.rows) ? res.rows : [],
        okCount: Number(res?.okCount) || 0,
        errorCount: Number(res?.errorCount) || 0,
      });
      keyRef.current = newClientEventId();
    } catch (err) {
      setError(errorInfo(err, "Could not read this file.").message);
    } finally {
      setPreviewing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const rows = preview?.rows || [];
  const errorCount = preview ? preview.errorCount + Object.keys(rowErrors).length : 0;
  const canPost = !!preview && !posting && rows.length > 0 && preview.errorCount === 0 && Object.keys(rowErrors).length === 0;
  const total = rows.reduce((sum, row) => (row.error ? sum : sum + (Number(row.stockQty) || 0) * (Number(row.unitCost) || 0)), 0);

  const post = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      const res = await postOpeningStock(hotelId, { clientEventId: keyRef.current, rows: rows.map(postRowOf) });
      setPosted(res || {});
      setPreview(null);
      keyRef.current = null;
    } catch (err) {
      const info = errorInfo(err, "Could not post the opening stock.");
      const d = info.details || {};
      if (info.httpStatus == null) {
        setError("The connection dropped before the server answered. Post again: the same import is never recorded twice.");
      } else if (info.code === "VALIDATION" && Array.isArray(d.rows) && d.rows.length) {
        const next = {};
        for (const x of d.rows) if (Number.isInteger(x?.index)) next[x.index] = x.error || info.message;
        setRowErrors(next);
        setError("Some rows were refused. Fix the sheet and upload it again.");
      } else {
        if (info.code === "CONFLICT" && d.field === "clientEventId") keyRef.current = newClientEventId();
        setError(info.message);
      }
    } finally {
      setPosting(false);
    }
  };

  if (posted) {
    return (
      <div className={r.stateCard} role="status">
        <div className={`${r.stateIc} ${r.stateIcOk}`}><CheckCircle2 size={20} aria-hidden="true" /></div>
        <h2 className={r.stateTitle}>Opening stock posted{hotelName ? ` at ${hotelName}` : ""}</h2>
        <p className={r.stateSub}>
          Recorded as <span className={r.docNo}>{posted.adjustmentNumber}</span>
        </p>
        <div className={r.stateActions}>
          <Link href={stockRoutes.stock({ hotelId })} className={`${r.btn} ${r.btnPrimary}`}>View stock</Link>
          <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={reset}>Import another file</button>
        </div>
      </div>
    );
  }

  return (
    <div className={r.stack}>
      <section className={r.card}>
        <div className={r.cardHead}>
          <h2 className={r.cardTitle}>Opening stock{hotelName ? ` · ${hotelName}` : ""}</h2>
        </div>
        <div className={r.cardBody}>
          <p className={r.meta} style={{ marginTop: 0 }}>
            One row per item, with the columns {COLUMNS.join(", ")}. Nothing is saved until you post.
          </p>
          <p className={r.lineNote} style={{ marginTop: 0 }}>
            In the preview, cost is per stock unit: enter each row&apos;s cost per its own Unit and the preview divides it
            by the unit factor. Check it before posting.
          </p>
          <div className={s.uploadZone}>
            <FileSpreadsheet size={22} aria-hidden="true" />
            <label htmlFor={fileId} className={`${r.btn} ${r.btnPrimary}`} style={{ cursor: previewing ? "default" : "pointer" }}>
              {previewing ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
              {previewing ? "Reading…" : "Choose a sheet"}
            </label>
            <input
              ref={inputRef}
              id={fileId}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              aria-label="Opening stock file"
              className={r.srOnly}
              onChange={onFile}
              disabled={previewing || posting}
            />
            {fileName && <span className={r.meta}>{fileName}</span>}
            <button type="button" className={`${r.btn} ${r.btnGhost} ${r.btnSm}`} onClick={() => downloadTemplate().catch(() => setError("Could not make the template. Try again."))}>
              <Download size={13} aria-hidden="true" /> Template
            </button>
          </div>
          {error && <div className={r.formError} role="alert" style={{ marginTop: 12 }}>{error}</div>}
        </div>
      </section>

      {preview && (
        <section className={r.card}>
          <div className={r.cardHead}>
            <h2 className={r.cardTitle}>Preview</h2>
            <span className={r.meta}>
              {plural(preview.okCount, "row", "rows")} ready
              {errorCount > 0 && (
                <> · <span style={{ color: "var(--bs-danger, #b42318)" }}>{errorCount === 1 ? "1 row has a problem" : `${errorCount} rows have a problem`}</span></>
              )}
            </span>
          </div>
          {rows.length === 0 ? (
            <div className={r.emptyState}><div className={r.emptyTitle}>The sheet has no rows</div></div>
          ) : (
            <div className={r.tableWrap}>
              <table className={r.listTable} aria-label="Opening stock preview">
                <thead>
                  <tr>
                    <th className={r.num}>Row</th>
                    <th>Item</th>
                    <th className={r.num}>Sheet qty</th>
                    <th className={r.num}>Stock qty</th>
                    <th className={r.num}>Cost per stock unit</th>
                    <th className={r.num}>Value</th>
                    <th>Bin</th>
                    <th>Check</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const problem = row.error || rowErrors[i];
                    return (
                      <tr key={`${row.rowNo}-${i}`} className={problem ? s.rowError : undefined}>
                        <td className={r.num}>{row.rowNo}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.displayName || <span className={r.faint}>—</span>}</div>
                          {row.willCreate && (
                            <span className={`${r.pill} ${r.pillInfo}`} title="Created from the product variant when you post">
                              <span className={r.dot} />New item
                            </span>
                          )}
                        </td>
                        <td className={r.num} data-label="Sheet qty">
                          {row.qty != null ? fmtQty(row.qty) : "—"}<span className={s.unit}>{row.uom}</span>
                        </td>
                        <td className={r.num} data-label="Stock qty">
                          {row.stockQty != null ? fmtQty(row.stockQty) : "—"}
                          {row.stockUom && <span className={s.unit}>{row.stockUom}</span>}
                        </td>
                        <td className={r.num} data-label="Cost per stock unit">{row.unitCost != null ? inr(row.unitCost) : "—"}</td>
                        <td className={r.num} data-label="Value">
                          {row.stockQty != null && row.unitCost != null ? inr(Number(row.stockQty) * Number(row.unitCost)) : "—"}
                        </td>
                        <td data-label="Bin">{row.binLabel ? <span className={s.mono}>{row.binLabel}</span> : <span className={r.faint}>—</span>}</td>
                        <td data-label="Check">
                          {problem ? (
                            <span className={s.rowNote} style={{ color: "var(--bs-danger, #b42318)" }}>{problem}</span>
                          ) : (
                            <span className={`${r.pill} ${r.pillOk}`}><span className={r.dot} />OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className={r.cardFoot}>
            <span className={r.meta}>Total value {inr(total)}</span>
            <button type="button" className={`${r.btn} ${r.btnPrimary}`} onClick={post} disabled={!canPost}>
              {posting ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              Post opening stock
            </button>
          </div>
          {errorCount > 0 && (
            <div className={r.cardBody} style={{ paddingTop: 0 }}>
              <p className={r.meta} style={{ margin: 0 }}>Fix the rows with a problem in the sheet, then upload it again.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default OpeningStockTab;
