import React, { useState } from "react";
import { candidateWhy } from "./routingFormat";

const REFUSAL_LABEL = { DECLINED: "declined", TIMED_OUT: "did not reply in time" };

const joinNames = (names) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/**
 * Why nothing (or not everyone) is suggested, as lines of text. The server leaves out
 * coverage matches that already refused the item (`refused`); the caller leaves out the
 * live assignee (`liveMatches`, with `liveAssignee` saying whether it is pending).
 */
export function candidateNotes({ candidates, ranked, refused, liveMatches, liveAssignee, hasOthers }) {
  if (candidates == null) {
    // No coverage suggestions for this row (e.g. reassigning an accepted item).
    return ranked.length || hasOthers ? [] : ["No other active entity in your network."];
  }
  const notes = [];
  if (liveMatches.length) {
    const names = joinNames(liveMatches.map((c) => c.name));
    notes.push(
      liveAssignee?.status === "ACCEPTED"
        ? `${names} already supplies this.`
        : `Already pending with ${names} — waiting for a reply.`
    );
  }
  if (refused.length) {
    const who = joinNames(refused.map((e) => `${e.name} (${REFUSAL_LABEL[e.reason] || "declined"})`));
    notes.push(
      ranked.length
        ? `Not suggested: ${who}.`
        : `Coverage matches ${who}, so ${refused.length === 1 ? "it is" : "they are"} not suggested.${hasOthers ? " Pick an entity below to send it anyway." : ""}`
    );
  }
  if (!ranked.length && !liveMatches.length && !refused.length) notes.push("No entity's coverage matches this item.");
  return notes;
}

/**
 * Who an item can go to: the server's ranked coverage candidates (best first,
 * each with why it matched), plus any other active member entity for an
 * admin who wants to route outside coverage. The server re-checks eligibility.
 *
 * candidates   [{ vendor_id, name, specificity, preference_rank, covers_all_hotels, hotels_covered }],
 *              or null when the server sent no suggestions for this row
 * excluded     coverage matches the server left out [{ vendor_id, name, reason: DECLINED | TIMED_OUT }]
 * totalHotels  hotels of the item, when known (for "covers 1 of 2 hotels")
 * entities     the org's active member entities [{ vendor_id, name }]
 * excludeIds   vendor ids not to offer (e.g. the current assignee)
 * liveAssignee { name, status: PENDING | ACCEPTED } of the item's live assignment, if any
 * label        the item's name, for accessible labels
 * actionLabel  "Assign" or "Reassign"
 */
export default function RoutingCandidates({ candidates = [], excluded: refused = [], totalHotels, entities = [], excludeIds = [], liveAssignee = null, label, actionLabel = "Assign", busy, onAssign }) {
  const [other, setOther] = useState("");
  const excluded = new Set(excludeIds.map(Number));
  const ranked = (candidates || []).filter((c) => !excluded.has(Number(c.vendor_id)));
  const liveMatches = (candidates || []).filter((c) => excluded.has(Number(c.vendor_id)));
  const rankedIds = new Set(ranked.map((c) => Number(c.vendor_id)));
  const others = entities.filter((e) => !excluded.has(Number(e.vendor_id)) && !rankedIds.has(Number(e.vendor_id)));
  const notes = candidateNotes({
    candidates,
    ranked,
    refused: refused || [],
    liveMatches: liveAssignee ? liveMatches : [],
    liveAssignee,
    hasOthers: others.length > 0,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {notes.map((note) => (
        <div key={note} style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{note}</div>
      ))}
      {ranked.length > 0 && (
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
