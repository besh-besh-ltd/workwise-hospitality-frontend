// Group rate contract — the create wizard's rules, kept as plain functions so
// the wizard stays readable and the rules are testable on their own.
//
// A group rate contract covers two or more hotels of one company. One of them
// is the LEAD hotel (the Head Office when it is selected): it runs the tender
// and the approvals. Each item carries the quantity every covered hotel
// expects; the server stores the item total as their sum.

export const MIN_GROUP_HOTELS = 2;

const ids = (list) => [...new Set((list || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
const sortedIds = (list) => ids(list).sort((a, b) => a - b);

/** Is the Business unit step complete? */
export function buStepComplete({ isGroup, hotelId, groupHotelIds = [], departmentId }) {
  if (!departmentId) return false;
  if (!isGroup) return !!hotelId;
  const selected = ids(groupHotelIds);
  return selected.length >= MIN_GROUP_HOTELS && selected.includes(Number(hotelId));
}

/**
 * The lead hotel after the selection changes.
 *
 *   1. a lead the buyer explicitly chose stays while it is still selected;
 *   2. otherwise the Head Office, as soon as it is selected (PRD: HO leads when
 *      the company has one);
 *   3. otherwise the current automatic pick while still selected;
 *   4. otherwise the first selected hotel.
 */
export function nextLeadHotelId({ currentLeadId, selectedIds = [], hotels = [], userChoseLead = false }) {
  const selected = ids(selectedIds);
  if (selected.length === 0) return null;
  const current = Number(currentLeadId);
  if (userChoseLead && selected.includes(current)) return current;
  const headOffice = hotels.find((h) => h.is_head_office && selected.includes(Number(h.id)));
  if (headOffice) return Number(headOffice.id);
  if (selected.includes(current)) return current;
  return selected[0];
}

const isBlank = (v) => v === "" || v === null || v === undefined;

/** Sum of the quantities entered for an item, blanks ignored. */
export function hotelSplitTotal(split = {}) {
  return Object.values(split || {}).reduce((sum, v) => (isBlank(v) ? sum : sum + Number(v)), 0);
}

/**
 * Every entry is blank or a number ≥ 0, only covered hotels appear, and the
 * item is ordered somewhere.
 */
export function hotelSplitValid(split = {}, hotelIds = []) {
  const covered = new Set(ids(hotelIds));
  const entries = Object.entries(split || {});
  for (const [hotelId, value] of entries) {
    if (!covered.has(Number(hotelId))) return false;
    if (isBlank(value)) continue;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return false;
  }
  return hotelSplitTotal(split) > 0;
}

/** The scope part of the draft payload. */
export function buildScopePayload({ isGroup, hotelId, groupHotelIds = [], departmentId }) {
  if (!isGroup) return { is_group: false, hotel_id: hotelId, department_id: departmentId };
  return { is_group: true, hotel_id: hotelId, hotel_ids: sortedIds(groupHotelIds), department_id: departmentId };
}

/**
 * The items part of the draft payload. A group item sends a quantity for every
 * covered hotel (blank → 0) and no total — the server derives it.
 */
export function buildItemsPayload({
  isGroup, selectedItemIds = [], itemSpecs = {}, itemQtys = {}, itemUoms = {}, hotelQtys = {}, groupHotelIds = [],
}) {
  return selectedItemIds.map((id) => {
    const base = { product_variant_id: id, spec_text: itemSpecs[id] || "", uom: itemUoms[id] || null };
    if (!isGroup) return { ...base, indicative_qty: Number(itemQtys[id]) || 0 };
    const split = hotelQtys[id] || {};
    return {
      ...base,
      hotel_qtys: sortedIds(groupHotelIds).map((hotelId) => ({ hotel_id: hotelId, qty: Number(split[hotelId]) || 0 })),
    };
  });
}

/** { [variantId]: { [hotelId]: "qty" } } from a saved draft's items. */
export function splitFromItems(items = []) {
  const out = {};
  for (const item of items || []) {
    if (!Array.isArray(item.hotel_qtys) || item.hotel_qtys.length === 0) continue;
    out[item.product_variant_id] = Object.fromEntries(
      item.hotel_qtys.map((q) => [q.hotel_id, String(q.indicative_qty)])
    );
  }
  return out;
}

/** Selected hotels that no eligible vendor serves. */
export function uncoveredHotelIds(vendors = [], hotelIds = []) {
  const served = new Set((vendors || []).flatMap((v) => (v.hotel_ids || []).map(Number)));
  return ids(hotelIds).filter((id) => !served.has(id));
}

/** A short code for a hotel name: "Goa Beach Resort" → "GBR". */
export function hotelCode(name) {
  const parts = String(name || "").replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}

/** "Goa Resort (lead), Mumbai Suites" — the lead hotel first. */
export function coveredHotelsLabel(hotels = []) {
  const list = (hotels || []).slice().sort((a, b) => Number(!!b.is_lead) - Number(!!a.is_lead));
  return list.map((h) => (h.is_lead ? `${h.name} (lead)` : h.name)).join(", ");
}
