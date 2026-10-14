// Map a free-text PR line to a catalog item (POST /pr/:id/lines/:lineId/map).
//
// The search is the one the requester would have seen: GET /pr/search-items
// with the line's hotel and the PR's department (the buyer passes through on
// pr.convert). Items on an active rate contract can't be picked — they are
// bought through a Material Requisition — and the server refuses them too.
// Render inside the page's .main-body so the arc_v2 form styles apply.

import { useState } from "react";
import Link from "next/link";
import { searchItems, mapLine } from "@/services/pr";
import { materialRequisitionCreate } from "@/components/dashboard/shared/dashboardLinks";
import { PrModal } from "./PrReasonModal";
import { useTypeahead } from "./PrLineEditor";
import { useGuardedSubmit } from "./prQueueShared";

const QUERY_MAX = 100;
const MIN_CHARS = 2;

const listStyle = {
  marginTop: 8, maxHeight: 300, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8,
};

export default function MapVariantModal({ line, onClose, onMapped, onStale }) {
  const [q, setQ] = useState(() => String(line.free_text_name || line.item_name || "").trim().slice(0, QUERY_MAX));
  const [picked, setPicked] = useState(null);
  const { busy, error, run } = useGuardedSubmit({ onStale });

  const { results, loading } = useTypeahead(
    (term) => searchItems({ hotel_id: Number(line.hotel_id), department_id: Number(line.department_id), q: term, limit: 25 })
      .then((res) => res?.data?.items || []),
    q,
  );
  const remapping = line.progress === "in_pool" && line.effective_variant_id;

  const submit = () => {
    if (!picked) return;
    run(() => mapLine(line.pr_id, line.line_id, picked.variant_id), {
      onSuccess: (res) => onMapped(res?.message || "Line mapped"),
    });
  };

  return (
    <PrModal
      title="Map to a catalog item"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className="btn btn-blue" disabled={!picked || busy} onClick={submit}>
            {busy ? "Working…" : "Map to this item"}
          </button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
        {line.pr_number} line {line.line_no} was requested as <strong>{line.free_text_name || line.item_name}</strong>.
        {" "}Pick the catalog item it means so it can go into an RFQ.
        {remapping ? <> It is currently mapped to <strong>{line.item_name}</strong>.</> : null}
      </p>
      <input
        className="input"
        autoFocus
        aria-label="Search catalog items"
        placeholder="Search the catalog by item name…"
        maxLength={QUERY_MAX}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim().length < MIN_CHARS ? (
        <div className="help-text" style={{ marginTop: 6 }}>Type at least {MIN_CHARS} characters.</div>
      ) : loading ? (
        <div className="help-text" style={{ marginTop: 6 }}>Searching…</div>
      ) : results.length === 0 ? (
        <div className="help-text" style={{ marginTop: 6 }}>
          Nothing in the catalog matches. If the item really isn't there, request a catalog item instead.
        </div>
      ) : (
        <div role="listbox" aria-label="Catalog matches" style={listStyle}>
          {results.map((it) => {
            const disabled = Boolean(it.on_contract);
            const chosen = picked?.variant_id === it.variant_id;
            const choose = () => { if (!disabled) setPicked(it); };
            return (
              <div
                key={it.variant_id}
                data-testid={`map-result-${it.variant_id}`}
                role="option"
                tabIndex={disabled ? -1 : 0}
                aria-selected={chosen ? "true" : "false"}
                aria-disabled={disabled ? "true" : "false"}
                onClick={choose}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } }}
                style={{
                  padding: "9px 12px", borderBottom: "1px solid var(--border)",
                  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
                  background: chosen ? "var(--primary-soft)" : undefined,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{it.variant_name}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                  {it.category_title}
                  {it.product_name && it.product_name !== it.variant_name ? ` · ${it.product_name}` : ""}
                </div>
                {disabled && (
                  <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 3 }}>
                    <span>On contract {it.arc_number} — </span>
                    <Link href={materialRequisitionCreate()} onClick={(e) => e.stopPropagation()}>raise an MR</Link>
                    <span> instead</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {picked && (
        <div className="help-text" style={{ marginTop: 8 }}>
          Selected: <strong>{picked.variant_name}</strong>
        </div>
      )}
      {error && <div role="alert" className="guide danger" style={{ marginTop: 10 }}><div>{error}</div></div>}
    </PrModal>
  );
}
