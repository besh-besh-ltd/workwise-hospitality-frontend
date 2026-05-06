import React, { useMemo, useState } from "react";
import moment from "moment";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import { toast } from "react-toastify";
import styles from "./ArcCommittee.module.scss";

const formatMoney = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${addCommasToNumber(Math.round(v))}`;
};

/**
 * Decision Matrix — products × vendors. Each cell is a single
 * (product × vendor) ARC line item with its own approval instance.
 *
 * Cells colour-code by status + pricing:
 *   - APPROVED → solid green, "Approved by … on …"
 *   - REJECTED → solid red, with rejection remarks
 *   - PENDING with L1 unit_price ≤ baseline → green ("good")
 *   - PENDING above baseline OR L2+ → amber ("review")
 *
 * Empty cells (vendor wasn't finalized for the row's product) render
 * as a dashed grey placeholder so the absence is clearly intentional.
 *
 * Bulk "Approve all" fans out to onCellAction per pending cell. Reject
 * uses an inline remarks field (no modal) — minimum ceremony for the
 * common case ("not happy with this one, give them a reason to fix").
 */
const DecisionMatrix = ({
  rfq,
  arcEnvelopes = [],
  arcItems = [],
  rfqProducts = [],
  arcHandlers,
  onAfterAction,
}) => {
  const [busyCell, setBusyCell] = useState(null);
  const [rejectingCell, setRejectingCell] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Helper: read a value from the rfq product's specs array. The
  // `productQuery` (rfqModel.getRfqById) shapes specs as
  // [{title, value}, ...] — Quantity + Unit live there as separate
  // rows, NOT as direct columns. Without this lookup the matrix
  // showed "Total ₹0" because qty defaulted to 0 in the multiplier.
  const specValue = (rfqProduct, titleRegex) => {
    const specs = rfqProduct?.product_specs || rfqProduct?.specifications || [];
    if (!Array.isArray(specs)) return null;
    const hit = specs.find((s) => titleRegex.test(String(s?.title || "")));
    return hit?.value ?? null;
  };

  // Build the row order from finalized products. We prefer the
  // distinct rfq_product_id list found in arcItems (only products
  // that actually have at least one finalized vendor are surfaced).
  const productRows = useMemo(() => {
    const byProductId = new Map();
    for (const item of arcItems) {
      if (!byProductId.has(item.rfq_product_id)) {
        const rfqProduct = rfqProducts.find(
          (p) => p.id === item.rfq_product_id || String(p.id) === String(item.rfq_product_id)
        );
        const qtySpec = specValue(rfqProduct, /^quantity$/i);
        const unitSpec = specValue(rfqProduct, /^unit$/i);
        byProductId.set(item.rfq_product_id, {
          rfq_product_id: item.rfq_product_id,
          product_variant_id: item.product_variant_id,
          product_name:
            item.product_name ||
            rfqProduct?.name ||
            rfqProduct?.product_name ||
            rfqProduct?.product_details?.[0]?.name ||
            "Item",
          quantity: qtySpec != null ? Number(qtySpec) : (rfqProduct?.quantity ?? null),
          unit: unitSpec || rfqProduct?.unit || null,
          last_purchase_price: Number(rfqProduct?.last_purchase_price) || null,
        });
      }
    }
    return Array.from(byProductId.values());
  }, [arcItems, rfqProducts]);

  // Vendor columns: every envelope (one per vendor under this tender).
  const vendorColumns = useMemo(
    () =>
      arcEnvelopes.map((env) => ({
        arc_id: env.id,
        vendor_id: env.vendor_id,
        vendor_name: env.vendor_name || `Vendor ${env.vendor_id}`,
        status: env.status,
      })),
    [arcEnvelopes]
  );

  // Lookup: { `${rfq_product_id}|${vendor_id}` → arc_item }
  const cellMap = useMemo(() => {
    const m = new Map();
    for (const item of arcItems) {
      m.set(`${item.rfq_product_id}|${item.vendor_id}`, item);
    }
    return m;
  }, [arcItems]);

  // Per-row L1/L2 ranking: sort each product's finalized cells by
  // unit_price ascending. Matches procurement convention (L1 = lowest).
  const rankByItemId = useMemo(() => {
    const rank = new Map();
    for (const row of productRows) {
      const cellsInRow = arcItems
        .filter((it) => it.rfq_product_id === row.rfq_product_id)
        .sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
      cellsInRow.forEach((it, idx) => rank.set(it.id, idx + 1));
    }
    return rank;
  }, [arcItems, productRows]);

  const pendingCells = useMemo(
    () =>
      arcItems.filter(
        (it) => (it.status || "PENDING").toUpperCase() === "PENDING"
      ),
    [arcItems]
  );

  const runCellAction = async (item, action, comment = null) => {
    if (!arcHandlers?.onCellAction) {
      toast.error("Action handler not available");
      return false;
    }
    setBusyCell(item.id);
    try {
      const result = await arcHandlers.onCellAction(item.id, action, comment);
      if (result?.success === false) {
        toast.error(result.error || `Failed to ${action.toLowerCase()}`);
        return false;
      }
      toast.success(
        action.toUpperCase() === "APPROVE"
          ? "Cell approved"
          : "Cell rejected"
      );
      if (onAfterAction) await onAfterAction();
      return true;
    } catch (err) {
      toast.error(err?.message || `Failed to ${action.toLowerCase()}`);
      return false;
    } finally {
      setBusyCell(null);
    }
  };

  const handleApproveAll = async () => {
    if (pendingCells.length === 0) return;
    setBulkBusy(true);
    let okCount = 0;
    for (const item of pendingCells) {
      // Sequential to keep BE write contention manageable + so each
      // failure is isolated. With realistic envelopes this is N≤20
      // calls, sub-second each.
      const ok = await runCellAction(item, "APPROVE");
      if (ok) okCount++;
    }
    setBulkBusy(false);
    if (okCount > 0) {
      toast.success(`Approved ${okCount} of ${pendingCells.length} cells`);
    }
  };

  const beginReject = (item) => {
    setRejectingCell(item.id);
    setRejectRemarks("");
  };
  const cancelReject = () => {
    setRejectingCell(null);
    setRejectRemarks("");
  };
  const confirmReject = async (item) => {
    const remarks = (rejectRemarks || "").trim();
    if (!remarks) {
      toast.warn("Please enter a rejection reason.");
      return;
    }
    const ok = await runCellAction(item, "REJECT", remarks);
    if (ok) cancelReject();
  };

  if (productRows.length === 0 || vendorColumns.length === 0) {
    return (
      <section className={styles.card}>
        <div className={styles.cardBody}>
          <div className={styles.matrixHeader}>
            <div>
              <div className={styles.matrixHeading}>Decision matrix</div>
              <div className={styles.matrixSub}>
                Vendors haven't been finalized yet. The matrix appears once at least one
                vendor is finalized for a product on this tender.
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Inline grid template: 140px for the product label + 1fr per vendor.
  const gridTemplate = `140px ${vendorColumns.map(() => "1fr").join(" ")}`;

  return (
    <section className={styles.card}>
      <div className={styles.cardBody}>
        <div className={styles.matrixHeader}>
          <div>
            <div className={styles.matrixHeading}>Decision matrix</div>
            <div className={styles.matrixSub}>
              {pendingCells.length === 0
                ? "All cells decided. Review the audit trail below."
                : `${pendingCells.length} ${
                    pendingCells.length === 1 ? "cell" : "cells"
                  } pending action · click a cell's Approve / Reject to act.`}
            </div>
          </div>
          <button
            type="button"
            className={styles.matrixApproveAll}
            onClick={handleApproveAll}
            disabled={pendingCells.length === 0 || bulkBusy}
          >
            {bulkBusy
              ? "Approving…"
              : pendingCells.length === 0
              ? "Nothing pending"
              : `Approve all (${pendingCells.length})`}
          </button>
        </div>

        <div className={styles.matrixGrid} style={{ gridTemplateColumns: gridTemplate }}>
          {/* Header row */}
          <div className={styles.matrixHeaderCell}>Product</div>
          {vendorColumns.map((v) => (
            <div key={`vh_${v.vendor_id}`} className={styles.matrixHeaderCell}>
              {v.vendor_name}
            </div>
          ))}

          {/* Body rows */}
          {productRows.map((row) => (
            <React.Fragment key={`row_${row.rfq_product_id}`}>
              <div className={styles.matrixProductCell}>
                <div className={styles.matrixProductName}>{row.product_name}</div>
                <div className={styles.matrixProductSub}>
                  {row.quantity != null && row.unit
                    ? `${row.quantity} ${row.unit}`
                    : row.quantity != null
                    ? `${row.quantity}`
                    : "—"}
                  {row.last_purchase_price
                    ? ` · last ${formatMoney(row.last_purchase_price)}`
                    : ""}
                </div>
              </div>

              {vendorColumns.map((v) => {
                const item = cellMap.get(`${row.rfq_product_id}|${v.vendor_id}`);
                if (!item) {
                  return (
                    <div
                      key={`c_${row.rfq_product_id}_${v.vendor_id}`}
                      className={styles.matrixEmptyCell}
                    >
                      Not finalized for this product
                    </div>
                  );
                }

                const status = (item.status || "PENDING").toUpperCase();
                const unitPrice = Number(item.unit_price) || 0;
                // Total = engine grand total (base + base_tax + every
                // other_charge with its own tax). Comes pre-computed
                // from the BE — see arcController's engine_total
                // enrichment using pricingEngine.calculateLineTotal.
                // We never recompute here.
                const total = Number(item.engine_total) || 0;
                const breakdown = item.engine_breakdown || null;
                // Last purchase: prefer per-cell from BE (truthful for
                // this product variant); fall back to the row-level
                // hint if the BE didn't surface it.
                const last = Number(item.last_purchase_unit_price) || Number(row.last_purchase_price) || 0;
                const savings = last > 0 ? last - unitPrice : 0;
                const savingsPct = last > 0 ? (savings / last) * 100 : 0;
                const rank = rankByItemId.get(item.id);
                const aboveBaseline = last > 0 && unitPrice > last;
                const isL1 = rank === 1;
                const leadTimeDays = item.lead_time_days != null ? String(item.lead_time_days) : null;
                const quoteComment =
                  (item.quote_comment && String(item.quote_comment).trim()) ||
                  (item.quote_global_comment && String(item.quote_global_comment).trim()) ||
                  null;
                const paymentTerms = (() => {
                  const arr = Array.isArray(item.vendor_payment_terms) ? item.vendor_payment_terms : [];
                  if (!arr.length) return null;
                  return arr
                    .map((t) => {
                      const label = t.comment || t.type || "";
                      const pct = t.value != null && t.value !== "" ? ` (${t.value}%)` : "";
                      const days = t.days ? `, ${t.days} days` : "";
                      return `${label}${pct}${days}`.trim();
                    })
                    .filter(Boolean)
                    .join(" · ");
                })();
                const priorPoCount = Number(item.vendor_prior_po_count) || 0;
                const priorPoRejections = Number(item.vendor_prior_po_rejections) || 0;

                let cellClass = "";
                if (status === "APPROVED") cellClass = styles.cellApproved;
                else if (status === "REJECTED") cellClass = styles.cellRejected;
                else if (isL1 && !aboveBaseline) cellClass = styles.cellPendingGood;
                else cellClass = styles.cellPendingWarn;

                const isBusy = busyCell === item.id;
                const isRejecting = rejectingCell === item.id;

                return (
                  <div
                    key={`c_${row.rfq_product_id}_${v.vendor_id}`}
                    className={`${styles.matrixDataCell} ${cellClass}`}
                  >
                    <div className={styles.cellTopRow}>
                      <span className={styles.cellPrice}>
                        {formatMoney(unitPrice)}
                        {row.unit ? `/${row.unit}` : ""}
                      </span>
                      {rank && (
                        <span
                          className={`${styles.rankChip} ${
                            isL1 ? styles.rankL1 : styles.rankL2Plus
                          }`}
                        >
                          L{rank}
                        </span>
                      )}
                    </div>
                    {last > 0 && (
                      <div className={styles.cellSavings}>
                        {savings > 0
                          ? `↓ ${savingsPct.toFixed(1)}% vs last`
                          : aboveBaseline
                          ? `↑ ${Math.abs(savingsPct).toFixed(1)}% above last`
                          : "matches last purchase"}
                      </div>
                    )}
                    {/* Total row + hover tooltip with the engine
                        breakdown. Single source of truth =
                        pricingEngine.calculateLineTotal on the BE. */}
                    <div className={styles.cellTotalRow}>
                      <span
                        className={styles.totalWithTooltip}
                        tabIndex={0}
                      >
                        <span className={styles.cellTotalLabel}>Total</span>
                        <strong className={styles.cellTotalValue}>{formatMoney(total)}</strong>
                        {breakdown && <span className={styles.cellTotalInfo}>ⓘ</span>}
                        {breakdown && (
                          <span className={styles.totalTooltip}>
                            <span className={styles.totalTooltipRow}>
                              <span>Base ({breakdown.quantity} × {formatMoney(unitPrice)})</span>
                              <span>{formatMoney(breakdown.base)}</span>
                            </span>
                            {breakdown.base_tax > 0 && (
                              <span className={styles.totalTooltipRow}>
                                <span>
                                  GST{breakdown.base_tax_rate != null ? ` (${breakdown.base_tax_rate}%)` : ''}
                                </span>
                                <span>{formatMoney(breakdown.base_tax)}</span>
                              </span>
                            )}
                            {(breakdown.charges || []).map((c, idx) => (
                              <span key={`ch_${idx}`} className={styles.totalTooltipRow}>
                                <span>
                                  {c.name || 'Charge'}
                                  {c.tax > 0 ? ` (incl. tax)` : ''}
                                  {c.comment ? ` · ${c.comment}` : ''}
                                </span>
                                <span>{formatMoney(c.subtotal)}</span>
                              </span>
                            ))}
                            <span className={`${styles.totalTooltipRow} ${styles.totalTooltipGrand}`}>
                              <span>Grand total</span>
                              <span>{formatMoney(breakdown.total)}</span>
                            </span>
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Decision-grade detail strip — the data a CXO
                        needs to act without leaving the matrix. Last
                        purchase comparator, lead time, payment terms,
                        vendor's note, vendor track record. Every line
                        is conditional so cells stay tight when data
                        is genuinely missing. */}
                    <div className={styles.cellDetails}>
                      {last > 0 && (
                        <div className={styles.cellDetailRow}>
                          <span className={styles.cellDetailLabel}>Last purchase</span>
                          <span className={styles.cellDetailValue}>{formatMoney(last)} / {row.unit || 'unit'}</span>
                        </div>
                      )}
                      {leadTimeDays != null && (
                        <div className={styles.cellDetailRow}>
                          <span className={styles.cellDetailLabel}>Lead time</span>
                          <span className={styles.cellDetailValue}>{leadTimeDays} days</span>
                        </div>
                      )}
                      {paymentTerms && (
                        <div className={styles.cellDetailRow}>
                          <span className={styles.cellDetailLabel}>Payment</span>
                          <span className={styles.cellDetailValue} title={paymentTerms}>
                            {paymentTerms}
                          </span>
                        </div>
                      )}
                      {(priorPoCount > 0 || priorPoRejections > 0) && (
                        <div className={styles.cellDetailRow}>
                          <span className={styles.cellDetailLabel}>Track record</span>
                          <span
                            className={`${styles.cellDetailValue} ${
                              priorPoRejections > 0 ? styles.trackRecordWarn : styles.trackRecordGood
                            }`}
                          >
                            {priorPoCount} prior PO{priorPoCount === 1 ? '' : 's'}
                            {priorPoRejections > 0
                              ? ` · ${priorPoRejections} rejected`
                              : ' · clean'}
                          </span>
                        </div>
                      )}
                    </div>

                    {quoteComment && (
                      <div className={styles.cellComment}>
                        <span className={styles.cellCommentIcon}>“</span>
                        <span className={styles.cellCommentText}>{quoteComment}</span>
                      </div>
                    )}

                    {status === "APPROVED" && (
                      <div className={styles.cellResolvedNote}>
                        ✓ Approved
                        {item.approved_at && ` · ${moment(item.approved_at).format("DD MMM YYYY")}`}
                      </div>
                    )}
                    {status === "REJECTED" && (
                      <div className={styles.cellResolvedNote}>
                        ✗ Rejected
                        {item.rejection_remarks && ` · ${item.rejection_remarks}`}
                      </div>
                    )}

                    {status === "PENDING" && !isRejecting && (
                      <div className={styles.cellActions}>
                        <button
                          type="button"
                          className={`${styles.cellBtn} ${styles.cellBtnApprove}`}
                          disabled={isBusy || bulkBusy}
                          onClick={() => runCellAction(item, "APPROVE")}
                        >
                          {isBusy ? "…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.cellBtn} ${styles.cellBtnReject}`}
                          disabled={isBusy || bulkBusy}
                          onClick={() => beginReject(item)}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {status === "PENDING" && isRejecting && (
                      <div className={styles.rejectRemarksRow}>
                        <input
                          type="text"
                          className={styles.rejectRemarksInput}
                          placeholder="Reason for rejection (required)"
                          value={rejectRemarks}
                          onChange={(e) => setRejectRemarks(e.target.value)}
                          autoFocus
                          disabled={isBusy}
                        />
                        <button
                          type="button"
                          className={`${styles.cellBtn} ${styles.cellBtnReject}`}
                          style={{ flex: 'none' }}
                          disabled={isBusy || !rejectRemarks.trim()}
                          onClick={() => confirmReject(item)}
                        >
                          {isBusy ? "…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          className={styles.cellBtn}
                          style={{ flex: 'none', background: '#fff', borderColor: '#d1d5db', color: '#6b7280' }}
                          disabled={isBusy}
                          onClick={cancelReject}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DecisionMatrix;
