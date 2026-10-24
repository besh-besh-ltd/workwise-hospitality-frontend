import React, { useCallback, useEffect, useId, useState } from "react";
import { Modal } from "react-bootstrap";
import { Check, Loader2, X, XCircle } from "lucide-react";
import { getAdjustment } from "@/services/inventory";
import { fmtInstant, inr } from "@/components/inventory/receive/receiveUtils";
import { ADJUSTMENT_STATUS, errorInfo, fmtSigned, reasonLabel } from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// One adjustment (GET /adjustments/:id): its lines with signed qty and value,
// who raised and who decided it. Approve / Reject follow the server's `can`.
//
// Props: { id | null, onHide, onApprove(adjustment), onReject(adjustment),
//          busyId, refreshKey (bump to reload after a decision) }

const AdjustmentDetailModal = ({ id, onHide, onApprove, onReject, busyId = null, refreshKey = 0 }) => {
  const titleId = useId();
  const [adj, setAdj] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setAdj(await getAdjustment(id));
    } catch (err) {
      setAdj(null);
      setError(errorInfo(err, "Could not load this adjustment.").message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
    else setAdj(null);
  }, [id, load, refreshKey]);

  const status = adj ? ADJUSTMENT_STATUS[adj.status] || { label: adj.status, tone: "Neutral" } : null;
  const busy = adj && busyId === adj.id;
  const lines = Array.isArray(adj?.lines) ? adj.lines : [];

  return (
    <Modal
      show={!!id}
      onHide={onHide}
      centered
      size="lg"
      aria-labelledby={titleId}
      dialogClassName={r.sheetDialog}
      contentClassName={r.sheet}
    >
      <div className={r.sheetHead}>
        <div>
          <h2 id={titleId} className={r.sheetTitle}>
            {adj ? <span className={r.mono}>{adj.adjustmentNumber}</span> : "Adjustment"}
          </h2>
          {adj && (
            <div className={r.sheetSub}>
              {reasonLabel(adj.reasonCode)} · {adj.hotelName}
            </div>
          )}
        </div>
        <button type="button" className={r.sheetClose} onClick={onHide} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={r.sheetBody}>
        {loading && !adj ? (
          <div aria-busy="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={r.sk} style={{ width: `${88 - i * 14}%`, marginBottom: 12 }} />
            ))}
          </div>
        ) : error ? (
          <div className={r.sheetError} role="alert">{error}</div>
        ) : adj ? (
          <>
            <div className={r.flags} style={{ marginBottom: 12 }}>
              <span className={`${r.pill} ${r[`pill${status.tone}`] || ""}`}>
                <span className={r.dot} />{status.label}
              </span>
              <span className={r.meta}>
                Raised by {adj.createdByName || "—"}{adj.createdAt ? ` · ${fmtInstant(adj.createdAt)}` : ""}
              </span>
            </div>
            {adj.status === "posted" && adj.approvedByName && (
              <p className={r.meta}>
                Posted{adj.approvedByName ? ` by ${adj.approvedByName}` : ""}{adj.approvedAt ? ` · ${fmtInstant(adj.approvedAt)}` : ""}
              </p>
            )}
            {adj.status === "rejected" && (
              <div className={r.sheetNote} style={{ marginBottom: 12 }}>
                <strong>Rejected{adj.rejectedByName ? ` by ${adj.rejectedByName}` : ""}</strong>
                {adj.rejectedAt ? ` · ${fmtInstant(adj.rejectedAt)}` : ""}
                {adj.rejectionReason && <div>{adj.rejectionReason}</div>}
              </div>
            )}
            {adj.remarks && <p className={r.meta}>Remarks: {adj.remarks}</p>}
            <div style={{ overflowX: "auto" }}>
              <table className={r.modalTable} aria-label="Adjustment lines">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className={r.num}>Qty</th>
                    <th className={r.num}>Unit cost</th>
                    <th className={r.num}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const q = Number(l.qty) || 0;
                    const v = Number(l.value);
                    return (
                      <tr key={l.id || l.invItemId}>
                        <td>
                          <div className={r.itName}>{l.displayName}</div>
                          {(l.itemCode || l.remarks) && (
                            <div className={s.subtle}>
                              {l.itemCode && <span className={s.mono}>{l.itemCode}</span>}
                              {l.itemCode && l.remarks ? " · " : ""}
                              {l.remarks}
                            </div>
                          )}
                        </td>
                        <td className={`${r.num} ${q < 0 ? s.qtyOut : s.qtyIn}`}>
                          {fmtSigned(q, { plus: true })}<span className={s.unit}>{l.stockUom}</span>
                        </td>
                        <td className={r.num}>{inr(l.unitCost)}</td>
                        <td className={r.num}>{Number.isFinite(v) ? `${v < 0 ? "−" : ""}${inr(Math.abs(v))}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>{adj.status === "posted" ? "Value posted" : "Estimated value at today's average cost"}</td>
                    <td className={r.num}><strong>{inr(adj.value)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : null}
      </div>
      <div className={r.sheetFoot}>
        <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={onHide}>
          Close
        </button>
        {adj?.can?.reject && (
          <button type="button" className={`${r.btn} ${r.btnDangerQuiet || r.btnSecondary}`} onClick={() => onReject?.(adj)} disabled={busy}>
            <XCircle size={14} aria-hidden="true" /> Reject
          </button>
        )}
        {adj?.can?.approve && (
          <button type="button" className={`${r.btn} ${r.btnSuccess}`} onClick={() => onApprove?.(adj)} disabled={busy}>
            {busy ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} Approve
          </button>
        )}
      </div>
    </Modal>
  );
};

export default AdjustmentDetailModal;
