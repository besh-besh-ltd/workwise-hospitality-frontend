import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getVendorRejectionUndo, withdrawVendorRejection } from "@/services/po";
import styles, { fmtDateTime } from "@/components/dashboard/buyer/purchase-orders/shared";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

// REQ-0032: shown on a vendor-rejected PO. For 24 hours (while the buyer has
// not given the order to someone else) the vendor can take the rejection back
// and accept the order in one step.
const VendorRejectionUndo = ({ poId, poNumber, buyerName, onDone }) => {
  const [state, setState] = useState(null); // null = loading / error -> render nothing
  const [open, setOpen] = useState(false);
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
      const res = await getVendorRejectionUndo(poId);
      const d = res?.data;
      if (alive.current) setState(d && typeof d === "object" ? d : null);
    } catch {
      if (alive.current) setState(null);
    }
  }, [poId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async () => {
    if (submitting.current) return;
    submitting.current = true;
    let withdrawn = false;
    try {
      await withdrawVendorRejection(poId);
      withdrawn = true;
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Couldn't accept this order.");
      setOpen(false);
      await load();
    } finally {
      submitting.current = false;
    }
    if (!withdrawn) return;
    toast.success(`PO #${poNumber} accepted.`);
    setOpen(false);
    try {
      if (typeof onDone === "function") await onDone();
    } catch (e) {
      console.error("Refresh after withdrawing rejection failed:", e);
    }
  };

  if (!state) return null;

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

  if (!state.available) {
    // Buyers have no time window, so "they can" only holds when the expired
    // window is the sole blocker; otherwise the buyer may be blocked too.
    const blockers = Array.isArray(state.blockers) ? state.blockers : [];
    const windowOnly = blockers.length === 1 && blockers[0] === "UNDO_WINDOW_EXPIRED";
    return (
      <div style={box}>
        {`Rejected this by mistake? Contact ${buyerName || "the buyer"} — they ${windowOnly ? "can" : "may be able to"} send the order back to you.`}
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ fontWeight: 600, color: "#0f172a" }}>Rejected by mistake?</div>
      <div style={{ margin: "4px 0 10px" }}>
        {`You can still accept this order until ${fmtDateTime(state.deadline)}, as long as the buyer hasn't given it to someone else.`}
      </div>
      <button type="button" className={`${styles.btn} ${styles.btnSuccess}`} onClick={() => setOpen(true)}>
        Accept this order instead
      </button>
      <ConfirmationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        title="Accept this order instead?"
        description="This withdraws your rejection and confirms your commitment to fulfil this order."
        confirmButtonColor="success"
        confirmButtonText="Yes, accept PO"
        cancelButtonText="Cancel"
      />
    </div>
  );
};

export default VendorRejectionUndo;
