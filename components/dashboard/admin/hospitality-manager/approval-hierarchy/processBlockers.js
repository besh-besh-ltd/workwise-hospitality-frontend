import { stageLabel } from "./stageLabels";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * One sentence for a refused process deactivation/delete (409 PROCESS_IN_USE).
 * Zero-count parts are omitted; hotel names are deduped, max 3 then "+k more".
 */
export const formatProcessBlockers = (processName, blockers = {}) => {
  const parts = [];

  const policies = blockers.policies || [];
  if (policies.length) {
    const hotels = [...new Set(policies.map((p) => p.hotel_name).filter(Boolean))];
    const shown = hotels.slice(0, 3).join(", ");
    const more = hotels.length > 3 ? `, +${hotels.length - 3} more` : "";
    const types = [...new Set(policies.map((p) => stageLabel(p.entity_type)))];
    const where = hotels.length ? ` (${shown}${more})` : ` (${types.join(", ")})`;
    parts.push(`still used by ${plural(policies.length, "workflow", "workflows")}${where}`);
  }

  const rfqCount = blockers.open_rfq_count ?? (blockers.open_rfqs || []).length;
  if (rfqCount > 0) {
    const nos = (blockers.open_rfqs || []).slice(0, 3).map((r) => r.rfq_no).filter(Boolean);
    parts.push(`${plural(rfqCount, "open RFQ", "open RFQs")}${nos.length ? ` (${nos.join(", ")})` : ""}`);
  }
  if (blockers.pending_instances > 0) {
    parts.push(plural(blockers.pending_instances, "pending approval", "pending approvals"));
  }
  if (blockers.open_arcs > 0) parts.push(plural(blockers.open_arcs, "open ARC", "open ARCs"));
  if (blockers.role_grants > 0) parts.push(plural(blockers.role_grants, "role grant", "role grants"));

  if (!parts.length) return null;
  // First part already reads "still used by…"; the rest are joined with "; ".
  const [first, ...rest] = parts;
  const body = first.startsWith("still used by") ? [first, ...rest] : [`still used by ${first}`, ...rest];
  return `Can't deactivate "${processName}": ${body.join("; ")}.`;
};
