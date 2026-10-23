import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Modal from "react-modal";
import { toast } from "react-toastify";
import { getPoReinstateState, reinstatePo } from "@/services/po";
import { fmtDateTime } from "@/components/dashboard/buyer/purchase-orders/shared";
import { recoveryBlockerMessage } from "@/components/dashboard/shared/poRecoveryCopy";
import { poDetail } from "@/components/dashboard/shared/dashboardLinks";

// REQ-0032: shown on a PO the vendor rejected. A buyer who holds
// quote-compare.create on the PO's business unit can send the SAME order back
// to the vendor for acceptance, with a required internal note (never shown to
// the vendor).
const NOTE_MAX = 1000;
const BLANK_NOTE_ERROR = "Add a note saying why the order is being sent back.";

// Quote Compare vendor-rejection banner: pointer to the PO. Hidden when the
// rejection entry carries no po_id.
export const SendBackLink = ({ poId, color = "inherit" }) => {
  if (poId === undefined || poId === null || poId === "") return null;
  return (
    <div style={{ marginTop: 8, fontSize: 12.5 }}>
      <Link href={poDetail(poId)} style={{ color, fontWeight: 600, textDecoration: "underline" }}>
        Rejected by mistake? Open the PO to send it back
      </Link>
    </div>
  );
};

const VendorRejectionRecovery = ({ poId, poNumber, isCallOff = false, onReinstated }) => {
  const [state, setState] = useState(null); // null = loading / error -> render nothing
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const submitting = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await getPoReinstateState(poId);
      const d = res?.data;
      if (alive.current) setState(d && typeof d === "object" ? d : null);
    } catch {
      if (alive.current) setState(null);
    }
  }, [poId]);

  useEffect(() => {
    load();
  }, [load]);

  const close = () => {
    if (submitting.current) return;
    setOpen(false);
    setNote("");
    setError("");
  };

  const confirm = async () => {
    if (submitting.current) return;
    const trimmed = note.trim();
    if (!trimmed) {
      setError(BLANK_NOTE_ERROR);
      return;
    }
    submitting.current = true;
    setBusy(true);
    let done = false;
    try {
      await reinstatePo(poId, trimmed);
      done = true;
    } catch (e) {
      if (e?.response?.status === 400) {
        // NOTE_REQUIRED / NOTE_TOO_LONG: keep the modal open and the typed note.
        if (alive.current) setError(e?.response?.data?.message || "Check the note and try again.");
        return;
      }
      toast.error(e?.response?.data?.message || e?.message || "Couldn't send this order back.");
      if (alive.current) setOpen(false);
      await load();
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
    if (!done) return;
    toast.success(`PO #${poNumber} sent back to the vendor.`);
    if (alive.current) {
      setOpen(false);
      setNote("");
      setError("");
    }
    try {
      if (typeof onReinstated === "function") await onReinstated();
    } catch (e) {
      console.error("Refresh after sending the PO back failed:", e);
    }
  };

  if (!state) return null;

  const rej = state.rejection || {};
  const blockers = Array.isArray(state.blockers) ? state.blockers : [];

  const box = {
    marginTop: 12,
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#fff",
    fontSize: 13.5,
    color: "#334155",
    lineHeight: 1.5,
  };

  let body;
  if (!state.permitted) {
    body = `Only users with ${
      isCallOff ? "material-requisition · create on the requisition's hotel" : "quote-compare · create on this business unit"
    } can send it back to the vendor.`;
  } else if (!state.available) {
    body = `This order can't be sent back: ${recoveryBlockerMessage(blockers[0])}`;
  } else {
    body = (
      <>
        <div style={{ margin: "4px 0 10px" }}>
          If the vendor rejected it by mistake, you can send this same order back to them to accept. Its number, prices
          and approvals stay as they are.
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          Send back to vendor
        </button>
      </>
    );
  }

  return (
    <div style={box}>
      <div style={{ fontWeight: 600, color: "#0f172a" }}>
        {`${rej.vendor_name || "The vendor"} rejected this order on ${fmtDateTime(rej.rejected_at)}`}
        {rej.reason ? `: “${rej.reason}”` : ""}
      </div>
      {typeof body === "string" ? <div style={{ marginTop: 4 }}>{body}</div> : body}

      <Modal
        isOpen={open}
        onRequestClose={close}
        contentLabel={`Send PO #${poNumber} back to the vendor`}
        ariaHideApp={false}
        style={{
          overlay: { backgroundColor: "rgba(15,23,42,0.5)", zIndex: 2000 },
          content: { inset: "auto", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(520px, 92vw)", padding: 20, borderRadius: 12 },
        }}
      >
        <h5 style={{ margin: "0 0 12px", fontSize: 17 }}>{`Send PO #${poNumber} back to the vendor?`}</h5>
        <label htmlFor="po-send-back-note" style={{ fontWeight: 600, fontSize: 13 }}>
          Note for your team
        </label>
        <textarea
          id="po-send-back-note"
          aria-describedby={error ? "po-send-back-help po-send-back-error" : "po-send-back-help"}
          className="form-control"
          rows={4}
          maxLength={NOTE_MAX}
          placeholder="e.g. Vendor called — they rejected it by mistake."
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (error) setError("");
          }}
          aria-invalid={error ? "true" : "false"}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginTop: 4 }}>
          <span id="po-send-back-help">The vendor won&apos;t see this note.</span>
          <span>{`${note.length}/${NOTE_MAX}`}</span>
        </div>
        {error && (
          <div id="po-send-back-error" role="alert" style={{ color: "#b91c1c", fontSize: 12.5, marginTop: 6 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-outline-secondary" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" data-testid="send-back-confirm" onClick={confirm} disabled={busy}>
            Send back to vendor
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default VendorRejectionRecovery;
