import React, { useState } from "react";
import { candidateWhy } from "./routingFormat";

/**
 * Who an item can go to: the server's ranked coverage candidates (best first,
 * each with why it matched), plus any other active member entity for an
 * admin who wants to route outside coverage. The server re-checks eligibility.
 *
 * candidates   [{ vendor_id, name, specificity, preference_rank, covers_all_hotels, hotels_covered }]
 * totalHotels  hotels of the item, when known (for "covers 1 of 2 hotels")
 * entities     the org's active member entities [{ vendor_id, name }]
 * excludeIds   vendor ids not to offer (e.g. the current assignee)
 * label        the item's name, for accessible labels
 * actionLabel  "Assign" or "Reassign"
 */
export default function RoutingCandidates({ candidates = [], totalHotels, entities = [], excludeIds = [], label, actionLabel = "Assign", busy, onAssign }) {
  const [other, setOther] = useState("");
  const excluded = new Set(excludeIds.map(Number));
  const ranked = candidates.filter((c) => !excluded.has(Number(c.vendor_id)));
  const rankedIds = new Set(ranked.map((c) => Number(c.vendor_id)));
  const others = entities.filter((e) => !excluded.has(Number(e.vendor_id)) && !rankedIds.has(Number(e.vendor_id)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ranked.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>No entity's coverage matches this item.</div>
      ) : (
        <ul aria-label={`Suggested entities for ${label}`} style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {ranked.map((c, i) => (
            <li key={c.vendor_id} className="flex items-center justify-between gap-3" style={{ fontSize: 13 }}>
              <span>
                <strong style={{ color: "var(--fg)" }}>{c.name}</strong>
                {i === 0 && <span className="pill success" style={{ marginLeft: 6 }}>Best match</span>}
                <span style={{ display: "block", fontSize: 12, color: "var(--fg-3)" }}>{candidateWhy(c, totalHotels)}</span>
              </span>
              <button
                type="button"
                className={`btn btn-sm ${i === 0 ? "btn-blue" : "btn-secondary"}`}
                disabled={busy}
                aria-label={`${actionLabel} to ${c.name}`}
                onClick={() => onAssign(c.vendor_id)}
              >
                {actionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
          <select
            className="select"
            aria-label={`Other entity for ${label}`}
            value={other}
            onChange={(e) => setOther(e.target.value)}
            style={{ maxWidth: 260 }}
          >
            <option value="">Another entity…</option>
            {others.map((e) => (
              <option key={e.vendor_id} value={e.vendor_id}>{e.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy || !other}
            aria-label={`${actionLabel} to the selected entity`}
            onClick={() => onAssign(Number(other))}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
