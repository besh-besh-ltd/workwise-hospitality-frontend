import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Lock, Upload } from "lucide-react";
import { getHotelSettings, previewOpeningStock, postOpeningStock } from "@/services/inventory";
import { fmtQty, inr, newClientEventId } from "@/components/inventory/receive/receiveUtils";
import { errorInfo, fmtIstDay, freezeMessage, isUncertainFailure, stockRoutes } from "@/components/inventory/stock/stockUtils";
import { loadXlsx } from "@/utils/xlsx";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "@/components/inventory/stock/stock.module.scss";

// Opening stock for one hotel: upload a sheet → preview (no side effects) →
// confirm → post every row as one OPENING adjustment. A row whose Variant SKU
// has no item yet comes back `willCreate`; posting creates that item from the
// variant in the same transaction. Any row error blocks the post.
//
// Each matched row SETS the item's on-hand to the sheet qty: what posts is the
// difference from current stock, so the confirm step says so. Once the hotel's
// stock has started (hotel settings or the preview's stockStartedAt), an item
// with stock activity since then is refused (use a count or an adjustment),
// and while a count freezes the hotel the post is refused (countFreeze).
//
// Props: { hotelId, hotelName, canAdmin (inventory.admin at this hotel),
//          onBusyChange(posting) (the page locks its hotel picker) }

// The backend reads these headers (openingImport HEADERS); matching order is
// Item Code, then Variant SKU, then the exact Item Name.
export const TEMPLATE_HEADERS = ["Item Code", "Variant SKU", "Item Name", "Qty", "Unit", "Unit Cost", "Bin"];
const TEMPLATE_EXAMPLES = [
  ["RICE-25", "", "Basmati rice", 24, "bag", 1800, "A-01"],
  ["", "OLV-1L", "Olive oil 1 L", 12, "bottle", 650, "B-04"],
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const downloadTemplate = async () => {
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES]);
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

// The stock unit a row's stock qty is in: the preview's own (new items), else
// the sheet unit when it converts 1:1 (it is the stock unit, or an alias).
const stockUnitOf = (row) => row.stockUom || (Number(row.factor) === 1 ? row.uom : null);

const OpeningStockTab = ({ hotelId, hotelName, canAdmin, onBusyChange }) => {
  const fileId = useId();
  const inputRef = useRef(null);
  const keyRef = useRef(null);
  const confirmId = useId();
  // The confirm takes focus when it opens; Cancel hands it back to the button.
  const cancelRef = useRef(null);
  const postBtnRef = useRef(null);
  const refocusPostRef = useRef(false);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null); // {rows, okCount, errorCount, stockStartedAt, countFreeze}
  const [rowErrors, setRowErrors] = useState({}); // preview index → message (from the post)
  const [previewing, setPreviewing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [frozen, setFrozen] = useState(null); // LOCKED on post: {countId, countNumber}
  const [posted, setPosted] = useState(null); // {adjustmentId, adjustmentNumber}
  const [settingsStartedAt, setSettingsStartedAt] = useState(null);

  const reset = () => {
    setFileName("");
    setPreview(null);
    setRowErrors({});
    setError(null);
    setFrozen(null);
    setConfirming(false);
    setPosted(null);
    keyRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  // Another hotel means another import.
  useEffect(() => {
    reset();
    setSettingsStartedAt(null);
    if (!hotelId || !canAdmin) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await getHotelSettings(hotelId);
        if (!cancelled) setSettingsStartedAt(res?.stockStartedAt || null);
      } catch {
        // The preview reports it too.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId, canAdmin]);

  useEffect(() => {
    onBusyChange?.(posting);
  }, [posting, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (refocusPostRef.current) {
      refocusPostRef.current = false;
      postBtnRef.current?.focus();
    }
  }, [confirming]);

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
    setFrozen(null);
    setConfirming(false);
    setPosted(null);
    setPreviewing(true);
    try {
      const res = await previewOpeningStock(hotelId, file);
      setPreview({
        rows: Array.isArray(res?.rows) ? res.rows : [],
        okCount: Number(res?.okCount) || 0,
        errorCount: Number(res?.errorCount) || 0,
        stockStartedAt: res?.stockStartedAt || null,
        countFreeze: res?.countFreeze === true,
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
  const startedAt = preview?.stockStartedAt || settingsStartedAt;
  const countFreeze = !!preview?.countFreeze || !!frozen;
  const rowErrorCount = Object.keys(rowErrors).length;
  const errorCount = preview ? preview.errorCount + rowErrorCount : 0;
  const ready =
    !!preview && rows.length > 0 && preview.errorCount === 0 && rowErrorCount === 0 && !countFreeze;
  const canPost = ready && !posting;
  const sheetValue = rows.reduce(
    (sum, row) => (row.error ? sum : sum + (Number(row.stockQty) || 0) * (Number(row.unitCost) || 0)),
    0
  );
  const activityRows = rows.some((row) => /stock activity since stock started/i.test(row.error || ""));

  const cancelConfirm = () => {
    if (posting) return;
    refocusPostRef.current = true;
    setConfirming(false);
  };

  const post = async () => {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      const res = await postOpeningStock(hotelId, { clientEventId: keyRef.current, rows: rows.map(postRowOf) });
      setPosted(res || {});
      setPreview(null);
      setConfirming(false);
      keyRef.current = null;
    } catch (err) {
      const info = errorInfo(err, "Could not post the opening stock.");
      const d = info.details || {};
      if (isUncertainFailure(info)) {
        // Same key: a repeat is answered with the import if it did go through.
        setError(
          `${info.httpStatus ? "The server had a problem before it answered" : "The connection dropped before the server answered"}. ` +
            "Post again: the same import is never recorded twice."
        );
      } else if (info.code === "LOCKED") {
        setFrozen(d);
        setConfirming(false);
        setError(`${freezeMessage(d)}: opening stock is refused until it's submitted or cancelled.`);
      } else if (info.code === "VALIDATION" && Array.isArray(d.rows) && d.rows.length) {
        const next = {};
        for (const x of d.rows) if (Number.isInteger(x?.index)) next[x.index] = x.error || info.message;
        setRowErrors(next);
        setConfirming(false);
        setError("Some rows were refused. Fix the sheet and upload it again.");
      } else {
        if (info.code === "CONFLICT" && d.field === "clientEventId") keyRef.current = newClientEventId();
        setConfirming(false);
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
      {startedAt && (
        <div className={s.banner} role="status" aria-label="Stock already started">
          <span className={s.bannerIc}><AlertTriangle size={16} aria-hidden="true" /></span>
          <div className={s.bannerBody}>
            <h2 className={s.bannerTitle}>Stock has already started here</h2>
            <p className={s.bannerText}>
              Stock started on {fmtIstDay(startedAt)}. Items with stock activity since then can&apos;t be imported; use a
              count or an adjustment. Other rows set on-hand to the sheet quantity.
            </p>
          </div>
        </div>
      )}

      <section className={r.card}>
        <div className={r.cardHead}>
          <h2 className={r.cardTitle}>Opening stock{hotelName ? ` · ${hotelName}` : ""}</h2>
        </div>
        <div className={r.cardBody}>
          <p className={r.meta} style={{ marginTop: 0 }}>
            One row per item, with the columns {TEMPLATE_HEADERS.join(", ")}. Each row names its item by Item Code, or
            Variant SKU, or the exact Item Name (matched in that order). Nothing is saved until you post.
          </p>
          <p className={r.lineNote} style={{ marginTop: 0 }}>
            In the preview, cost is per stock unit: enter each row&apos;s Unit Cost per its own Unit and the preview divides
            it by the unit factor. Check it before posting.
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
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-label="Opening stock file"
              className={r.srOnly}
              onChange={onFile}
              disabled={previewing || posting}
            />
            {fileName && <span className={r.meta}>{fileName}</span>}
            <button
              type="button"
              className={`${r.btn} ${r.btnGhost} ${r.btnSm}`}
              onClick={() => downloadTemplate().catch(() => setError("Could not make the template. Try again."))}
            >
              <Download size={13} aria-hidden="true" /> Template
            </button>
          </div>
          {error && (
            <div className={r.formError} role="alert" style={{ marginTop: 12 }}>
              {error}
              {frozen?.countId && (
                <>
                  {" "}
                  <Link href={stockRoutes.count(frozen.countId)} className={r.btnLink}>Open the count</Link>
                </>
              )}
            </div>
          )}
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
              <table className={`${r.listTable} ${s.labelledTable}`} aria-label="Opening stock preview">
                <thead>
                  <tr>
                    <th className={r.num}>Row</th>
                    <th>Item</th>
                    <th className={r.num}>Sheet qty</th>
                    <th className={r.num}>Stock qty</th>
                    <th className={r.num}>Cost per stock unit</th>
                    <th className={r.num}>Sheet value</th>
                    <th>Bin</th>
                    <th>Check</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const problem = row.error || rowErrors[i];
                    const unit = stockUnitOf(row);
                    return (
                      <tr key={`${row.rowNo}-${i}`} className={problem ? s.rowError : undefined}>
                        <td className={r.num} data-label="Row">{row.rowNo}</td>
                        <td data-label="Item">
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
                          {row.stockQty != null && unit && <span className={s.unit}>{unit}</span>}
                        </td>
                        <td className={r.num} data-label="Cost per stock unit">{row.unitCost != null ? inr(row.unitCost) : "—"}</td>
                        <td className={r.num} data-label="Sheet value">
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
            <div style={{ minWidth: 0 }}>
              <div className={r.meta}>Sheet value {inr(sheetValue)}</div>
              <div className={s.subtle}>
                What posts is the difference between each row and the item&apos;s current stock, not the sheet value.
              </div>
              {countFreeze && (
                <div className={s.fieldError} role="status">
                  A count is in progress at {hotelName || "this hotel"}: opening stock can&apos;t be posted until it&apos;s
                  submitted or cancelled.
                </div>
              )}
            </div>
            {!confirming && (
              <button
                ref={postBtnRef}
                type="button"
                className={`${r.btn} ${r.btnPrimary}`}
                onClick={() => setConfirming(true)}
                disabled={!canPost}
                title={countFreeze ? "A count is in progress" : undefined}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                Post opening stock
              </button>
            )}
          </div>
          {confirming && ready && (
            <div className={r.cardBody} style={{ paddingTop: 0 }}>
              <div
                className={`${r.lineMsg} ${r.lineWarn}`}
                role="alertdialog"
                aria-label="Confirm opening stock"
                aria-describedby={confirmId}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    cancelConfirm();
                  }
                }}
              >
                <span id={confirmId}>
                  Posting sets the on-hand of each of the {plural(rows.length, "item", "items")} at{" "}
                  {hotelName || "this hotel"} to its sheet qty. The difference from current stock is posted as one
                  opening adjustment.
                </span>
                <div className={r.flags}>
                  <button
                    ref={cancelRef}
                    type="button"
                    className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                    onClick={cancelConfirm}
                    disabled={posting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`${r.btn} ${r.btnPrimary} ${r.btnSm}`}
                    onClick={post}
                    disabled={!canPost}
                  >
                    {posting && <Loader2 size={13} className={r.spin} aria-hidden="true" />}
                    Set on-hand and post
                  </button>
                </div>
              </div>
            </div>
          )}
          {errorCount > 0 && (
            <div className={r.cardBody} style={{ paddingTop: 0 }}>
              <p className={r.meta} style={{ margin: 0 }}>
                {activityRows
                  ? "Remove the rows with stock activity from the sheet (use a count or an adjustment for those items), fix any other problems, then upload it again."
                  : "Fix the rows with a problem in the sheet, then upload it again."}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default OpeningStockTab;
