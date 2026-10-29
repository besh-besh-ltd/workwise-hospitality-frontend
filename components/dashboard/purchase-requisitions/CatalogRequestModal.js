// Ask the platform team to add a catalog item for a free-text PR line
// (POST /pr/:id/lines/:lineId/catalog-request). When they add it, the line is
// mapped to it and can be converted; until then it waits in the queue.
// Render inside the page's .main-body so the arc_v2 form styles apply.

import { useState } from "react";
import { requestCatalogItem } from "@/services/pr";
import { PrModal } from "./PrReasonModal";
import { useGuardedSubmit } from "./prQueueShared";

const NAME_MAX = 300;
const DESCRIPTION_MAX = 4000;

export default function CatalogRequestModal({ row, onClose, onDone, onStale }) {
  const [name, setName] = useState(() => String(row.free_text_name || row.item_name || "").slice(0, NAME_MAX));
  const [description, setDescription] = useState("");
  const { busy, error, run } = useGuardedSubmit({ onStale });
  const blocked = busy || !name.trim() || name.length > NAME_MAX || description.length > DESCRIPTION_MAX;

  const submit = () => {
    if (blocked) return;
    const body = { requested_name: name.trim() };
    if (description.trim()) body.description = description.trim();
    run(() => requestCatalogItem(row.pr_id, row.line_id, body), {
      onSuccess: (res) => onDone(res?.message || "Catalog item requested"),
    });
  };

  return (
    <PrModal
      title="Request a catalog item"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className="btn btn-blue" disabled={blocked} onClick={submit}>{busy ? "Working…" : "Send request"}</button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
        Ask the Workwise team to add this item to the catalog. When they add it, {row.pr_number} line {row.line_no} is
        mapped to it and can be converted. Until then the line waits in the queue.
      </p>
      <label className="label" htmlFor="pr-cat-name">Item name <span className="req">*</span></label>
      <input
        id="pr-cat-name" className="input" maxLength={NAME_MAX} value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="label" htmlFor="pr-cat-desc" style={{ marginTop: 10 }}>
        Description <span className="text-fg-3">(optional)</span>
      </label>
      <textarea
        id="pr-cat-desc" className="textarea" value={description}
        placeholder="Brand, size, grade — anything that identifies the item"
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="fs-11" style={{ marginTop: 4, textAlign: "right", color: description.length > DESCRIPTION_MAX ? "var(--danger)" : "var(--fg-4)" }}>
        {description.length}/{DESCRIPTION_MAX}
      </div>
      {error && <div role="alert" className="guide danger" style={{ marginTop: 10 }}><div>{error}</div></div>}
    </PrModal>
  );
}
