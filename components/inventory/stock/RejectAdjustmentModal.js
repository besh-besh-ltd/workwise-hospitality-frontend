import React, { useEffect, useId, useState } from "react";
import { Modal } from "react-bootstrap";
import { Loader2, X, XCircle } from "lucide-react";
import { rejectAdjustment } from "@/services/inventory";
import { adjustmentRefusal, errorInfo } from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";

// Reject a pending adjustment (POST /adjustments/:id/reject). A reason is
// required (at most 1000 characters); the creator sees it on the adjustment.
//
// Props: { adjustment {id, adjustmentNumber} | null, onHide, onRejected(adjustment) }

const MAX_REASON = 1000;

const RejectAdjustmentModal = ({ adjustment, onHide, onRejected }) => {
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (adjustment) {
      setReason("");
      setError(null);
    }
  }, [adjustment]);

  const canSubmit = !busy && reason.trim() !== "" && reason.trim().length <= MAX_REASON;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await rejectAdjustment(adjustment.id, reason.trim());
      onRejected?.(res || adjustment);
    } catch (err) {
      const info = errorInfo(err, "Could not reject this adjustment.");
      setError(info.code === "VALIDATION" ? info.message : adjustmentRefusal(info));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      show={!!adjustment}
      onHide={busy ? undefined : onHide}
      backdrop={busy ? "static" : true}
      keyboard={!busy}
      centered
      aria-labelledby={titleId}
      dialogClassName={r.sheetDialog}
      contentClassName={r.sheet}
    >
      <div className={r.sheetHead}>
        <div>
          <h2 id={titleId} className={r.sheetTitle}>Reject adjustment</h2>
          <div className={r.sheetSub}>
            <span className={r.mono}>{adjustment?.adjustmentNumber}</span> · nothing is posted to stock
          </div>
        </div>
        <button type="button" className={r.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={r.sheetBody}>
        <label className={r.label} htmlFor={reasonId}>Reason</label>
        <textarea
          id={reasonId}
          className={r.textarea}
          value={reason}
          maxLength={MAX_REASON}
          placeholder="Why is this adjustment being rejected?"
          onChange={(e) => setReason(e.target.value)}
        />
        {error && (
          <div className={r.sheetError} role="alert" style={{ marginTop: 12 }}>{error}</div>
        )}
      </div>
      <div className={r.sheetFoot}>
        <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={onHide} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`${r.btn} ${r.btnDanger}`} onClick={submit} disabled={!canSubmit}>
          {busy ? <Loader2 size={14} className={r.spin} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
          Reject adjustment
        </button>
      </div>
    </Modal>
  );
};

export default RejectAdjustmentModal;
