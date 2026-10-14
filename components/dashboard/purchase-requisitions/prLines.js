// Line model + validation for the PR create/edit form.
//
// Quantity and price stay strings end to end: they are validated by regex and
// priced only through prFormat.lineValue (BigInt), never Number().

import { formatQty, lineValue } from "./prFormat";

const QTY_RE = /^\d{1,15}(\.\d{1,3})?$/;
const PRICE_RE = /^\d{1,16}(\.\d{1,2})?$/;
const hasNonZeroDigit = (s) => /[1-9]/.test(s);

export const MAX_LINES = 200;
export const SPEC_MAX = 1000;
export const NOTE_MAX = 2000;
export const NAME_MAX = 300;
export const UOM_MAX = 50;

let seq = 0;
const nextKey = () => `l${++seq}`;

const blank = () => ({
  key: nextKey(), id: null, kind: "catalog", product_variant_id: null, label: "", category_id: null, category_title: "",
  free_text_name: "", quantity: "", uom: "", price: "", specification: "", note: "",
  on_contract: false, arc_number: null,
  contract_unverified: false, // the cell re-check could not confirm this line's contract status
});

/** "123.45" for a priced row, else null (an invalid row has no value). */
export const rowValue = (line) =>
  quantityError(line.quantity) || priceError(line.price) ? null : lineValue(line.quantity, line.price);

export const newFreeTextLine = () => ({ ...blank(), kind: "free_text" });

/** A line from a search-items result. */
export const lineFromItem = (item) => ({
  ...blank(),
  product_variant_id: item.variant_id,
  label: item.variant_name || item.product_name || `Item ${item.variant_id}`,
  category_id: item.category_id ?? null,
  category_title: item.category_title || "",
  on_contract: Boolean(item.on_contract),
  arc_number: item.arc_number || null,
});

// The server's NUMERIC text, shown the way a user types it: quantity "2.000"
// -> "2", "0.500" -> "0.5"; price "15000.00" -> "15000" ("1250.50" stays).
const qtyForInput = (v) => (v == null ? "" : formatQty(v) || String(v));
const priceForInput = (v) => (v == null ? "" : String(v).trim().replace(/^(\d+)\.0+$/, "$1"));

/** A line from GET /pr/:id. Keeps the server id so a save sends it back. */
export const lineFromServer = (l) => ({
  ...blank(),
  id: l.id,
  kind: l.line_kind === "free_text" ? "free_text" : "catalog",
  product_variant_id: l.product_variant_id ?? null,
  label: l.variant_name || l.product_name || "",
  category_id: l.category_id ?? null,
  category_title: l.category_title || "",
  free_text_name: l.free_text_name || "",
  quantity: qtyForInput(l.quantity),
  uom: l.uom || "",
  price: priceForInput(l.estimated_unit_price),
  specification: l.specification || "",
  note: l.suggested_vendor_note || "",
});

/** Keep only what a decimal input can legally hold while typing. */
export const cleanDecimal = (v) => String(v).replace(/[^\d.]/g, "").replace(/^(\d*\.?\d*).*$/s, "$1");

export function quantityError(q) {
  const s = String(q ?? "").trim();
  if (!s) return "Enter a quantity";
  if (QTY_RE.test(s)) return hasNonZeroDigit(s) ? null : "Quantity must be more than zero";
  if (/^\d+\.\d{4,}$/.test(s)) return "Use at most 3 decimals";
  return "Enter a valid quantity";
}

export function priceError(p) {
  const s = String(p ?? "").trim();
  if (!s) return "Enter an estimated price";
  if (PRICE_RE.test(s)) {
    if (!hasNonZeroDigit(s)) return "Price must be more than zero";
    if (s.split(".")[0].replace(/^0+/, "").length > 14) return "Price is too large";
    return null;
  }
  if (/^\d+\.\d{3,}$/.test(s)) return "Use at most 2 decimals";
  return "Enter a valid price";
}

/** { field: message } for one line; empty object when the line is fine. */
export function lineErrors(line) {
  const e = {};
  if (line.kind === "free_text") {
    const n = line.free_text_name.trim();
    if (!n) e.name = "Enter the item name";
    else if (n.length > NAME_MAX) e.name = `Use at most ${NAME_MAX} characters`;
    if (!line.category_id) e.category = "Pick a category";
  }
  const u = line.uom.trim();
  if (!u) e.uom = "Enter a unit";
  else if (u.length > UOM_MAX) e.uom = `Use at most ${UOM_MAX} characters`;
  const q = quantityError(line.quantity);
  if (q) e.quantity = q;
  const p = priceError(line.price);
  if (p) e.price = p;
  if (line.specification.length > SPEC_MAX) e.specification = `Keep it within ${SPEC_MAX} characters`;
  if (line.note.length > NOTE_MAX) e.note = `Keep it within ${NOTE_MAX} characters`;
  return e;
}

/** Body line for POST/PUT. An existing server line always carries its id. */
export function lineToPayload(line) {
  const out = {};
  if (line.id) out.id = line.id;
  if (line.kind === "free_text") {
    out.free_text_name = line.free_text_name.trim();
    out.category_id = line.category_id;
  } else {
    out.product_variant_id = line.product_variant_id;
  }
  out.quantity = String(line.quantity).trim();
  out.uom = line.uom.trim();
  out.estimated_unit_price = String(line.price).trim();
  out.specification = line.specification.trim() || null;
  out.suggested_vendor_note = line.note.trim() || null;
  return out;
}

/** Routing-preview line, or null while the line is not priced/identified yet. */
export function lineToPreview(line) {
  if (quantityError(line.quantity) || priceError(line.price)) return null;
  const base = { quantity: line.quantity.trim(), estimated_unit_price: line.price.trim() };
  if (line.kind === "free_text") return line.category_id ? { category_id: line.category_id, ...base } : null;
  return line.product_variant_id ? { product_variant_id: line.product_variant_id, ...base } : null;
}

/** Exact sum of "123.45" strings (BigInt paise); null when there is nothing to add. */
export function sumLineValues(values) {
  const good = values.filter(Boolean);
  if (!good.length) return null;
  const paise = good.reduce((acc, v) => acc + BigInt(v.replace(".", "")), 0n);
  const s = paise.toString().padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}
