// Assign a requisition in the purchase queue to a buyer (POST /pr/:id/assign).
// The pick list is GET /pr/buyers for the PR's hotel; it defaults to the
// signed-in buyer when they work that hotel's queue.
// Render inside the page's .main-body so the arc_v2 form styles apply.

import { useEffect, useState } from "react";
import { getBuyers, assignPr } from "@/services/pr";
import { PrModal } from "./PrReasonModal";
import { errorCopy } from "./prFormat";
import { useGuardedSubmit } from "./prQueueShared";

export default function AssignModal({ row, meId, onClose, onDone, onStale }) {
  const [buyers, setBuyers] = useState(null); // null = loading
  const [loadError, setLoadError] = useState("");
  const [pick, setPick] = useState("");
  const { busy, error, run } = useGuardedSubmit({ onStale });

  useEffect(() => {
    let cancelled = false;
    getBuyers(row.hotel_id)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setBuyers(list);
        const me = list.find((b) => String(b.id) === String(meId));
        const current = list.find((b) => String(b.id) === String(row.assigned_buyer_id));
        setPick(String((me || current || {}).id ?? ""));
      })
      .catch((e) => {
        if (cancelled) return;
        setBuyers([]);
        setLoadError(errorCopy(e));
      });
    return () => { cancelled = true; };
  }, [row.hotel_id, row.assigned_buyer_id, meId]);

  const submit = () => {
    if (!pick) return;
    run(() => assignPr(row.pr_id, Number(pick)), { onSuccess: (res) => onDone(res?.message || "Assigned") });
  };

  return (
    <PrModal
      title={`Assign ${row.pr_number}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className="btn btn-blue" disabled={!pick || busy} onClick={submit}>{busy ? "Working…" : "Assign"}</button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
        The whole requisition is assigned, with every one of its lines in the queue. Now:{" "}
        <strong>{row.assigned_buyer_name || "unassigned"}</strong>.
      </p>
      <label className="label" htmlFor="pr-assign-buyer">Buyer <span className="req">*</span></label>
      <select
        id="pr-assign-buyer" aria-label="Buyer" className="select" value={pick} disabled={!buyers || busy}
        onChange={(e) => setPick(e.target.value)}
      >
        <option value="">{buyers ? "Choose a buyer…" : "Loading…"}</option>
        {(buyers || []).map((b) => (
          <option key={b.id} value={String(b.id)}>{String(b.id) === String(meId) ? `${b.name} (you)` : b.name}</option>
        ))}
      </select>
      {buyers && buyers.length === 0 && !loadError && (
        <div className="help-text">Nobody works the purchase queue at {row.hotel_name}.</div>
      )}
      {(loadError || error) && (
        <div role="alert" className="guide danger" style={{ marginTop: 10 }}><div>{error || loadError}</div></div>
      )}
    </PrModal>
  );
}
