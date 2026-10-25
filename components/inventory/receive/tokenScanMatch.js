import { validGtinCheckDigit } from "@/components/inventory/scan/parseScan";
import { toQ } from "./receiveUtils";

// Scan matching for the site-rep receive link, on the device.
//
// A link cannot call the scan resolve route (it needs a login), so the page
// matches a read against the order's own barcodes (ReceiveContext
// lines[].barcodes). The rules are the server's (backend
// app/services/inventory/scanService.js, lookupItem / itemPayload), so a code
// that resolves for a buyer on this PO resolves here the same way:
//   - our own item QR (/s/i/<id>) is the line's stock item, pack of 1;
//   - a GS1 read is looked up by its GTIN, anything else by the code as read;
//   - an alias matches exactly, then case-insensitively, then as the same
//     EAN/UPC: EAN-8, UPC-A, EAN-13 and GTIN-14 compare as GTIN-14 (zero
//     padded) and a UPC-E is expanded to its UPC-A, on either side;
//   - when the item sits on several lines, the first line with something
//     still open at this hotel wins, else the first line;
//   - when the best match is on two or more DIFFERENT items (the same label
//     keyed in another case, or as UPC-A on one item and UPC-E on another)
//     nothing is guessed: the read is 'ambiguous' and the person picks;
//   - our own dispatch QR (/s/d/<id>) names one of the link's dispatch notes.
// Item codes and variant SKUs are not in the link's context, so they never
// match here (the server matches them for a signed-in buyer).

/**
 * UPC-E (8 digits: number system 0/1, six data digits, check digit) to the
 * UPC-A it zero-suppresses, or null when the code is not a valid UPC-E.
 */
export function upcEToUpcA(code) {
  if (typeof code !== "string" || !/^[01]\d{7}$/.test(code)) return null;
  const [a, b, c, d, e, f] = code.slice(1, 7);
  let body;
  if (f <= "2") body = `${a}${b}${f}0000${c}${d}${e}`;
  else if (f === "3") body = `${a}${b}${c}00000${d}${e}`;
  else if (f === "4") body = `${a}${b}${c}${d}00000${e}`;
  else body = `${a}${b}${c}${d}${e}0000${f}`;
  const upcA = `${code[0]}${body}${code[7]}`;
  return validGtinCheckDigit(upcA) ? upcA : null;
}

/** The UPC-E of a UPC-A that zero-suppresses, else null (inverse of upcEToUpcA). */
export function upcAToUpcE(upcA) {
  if (typeof upcA !== "string" || !/^[01]\d{11}$/.test(upcA)) return null;
  const m = upcA.slice(1, 6);
  const p = upcA.slice(6, 11);
  let data = null;
  if ("012".includes(m[2]) && m.slice(3) === "00" && p.startsWith("00")) data = `${m[0]}${m[1]}${p.slice(2)}${m[2]}`;
  else if (m.slice(3) === "00" && p.startsWith("000")) data = `${m.slice(0, 3)}${p.slice(3)}3`;
  else if (m[4] === "0" && p.startsWith("0000")) data = `${m.slice(0, 4)}${p[4]}4`;
  else if (p.startsWith("0000") && p[4] >= "5") data = `${m}${p[4]}`;
  if (!data) return null;
  const upcE = `${upcA[0]}${data}${upcA[11]}`;
  return upcEToUpcA(upcE) === upcA ? upcE : null;
}

const NUMERIC_ALIAS = /^(\d{8}|\d{12,14})$/;

/**
 * How one numeric read can be stored as an alias (server gtinForms):
 *   keys  GTIN-14 forms, compared with the alias zero-padded to 14;
 *   forms the 8-digit UPC-E of the same product, compared as text.
 */
export function gtinForms(code) {
  if (!NUMERIC_ALIAS.test(code || "")) return { keys: [], forms: [] };
  const keys = new Set([code.padStart(14, "0")]);
  const upcA = code.length === 8 ? upcEToUpcA(code) : null;
  if (upcA) keys.add(upcA.padStart(14, "0"));
  const forms = new Set();
  for (const key of keys) {
    const upcE = key.startsWith("00") ? upcAToUpcE(key.slice(2)) : null;
    if (upcE) forms.add(upcE);
  }
  return { keys: [...keys], forms: [...forms] };
}

/** 0 exact, 1 same letters in another case, 2 the same EAN/UPC, null no match. */
const aliasRank = (alias, code, { keys, forms }) => {
  if (alias == null) return null;
  const a = String(alias);
  if (a === code) return 0;
  if (a.toLowerCase() === code.toLowerCase()) return 1;
  if (forms.includes(a)) return 2;
  if (NUMERIC_ALIAS.test(a) && keys.includes(a.padStart(14, "0"))) return 2;
  return null;
};

const hasOpen = (line) => toQ(line?.openAtHotel) > 0;

/** Of the lines carrying this stock item, the first with something open, else the first. */
const lineForItem = (lines, invItemId) => {
  const onItem = lines.filter((l) => l.invItemId != null && Number(l.invItemId) === Number(invItemId));
  return onItem.find(hasOpen) || onItem[0] || null;
};

/**
 * Match one parsed read (parseScan) against this order's lines and the link's
 * dispatch notes. Returns one of
 *   {kind:'item', code, item:{poLineId, invItemId, packFactor}, gs1}
 *   {kind:'ambiguous', code, candidates:[{poLineId, invItemId, packFactor}], gs1}
 *   {kind:'dispatch', code, dispatch (the context's dispatch, or null), gs1:null}
 *   {kind:'unknown', code, gs1}
 */
export const resolveOnOrder = (parsed, lines = [], dispatches = []) => {
  const code = parsed?.code ? String(parsed.code) : "";
  const gs1 = parsed?.gs1 || null;
  const unknown = { kind: "unknown", code, gs1 };
  if (!code) return unknown;
  const itemOn = (line, packFactor) => ({
    poLineId: line.poLineId,
    invItemId: line.invItemId ?? null,
    packFactor: Number(packFactor) > 0 ? Number(packFactor) : 1,
  });
  const hit = (line, packFactor) => ({ kind: "item", code, item: itemOn(line, packFactor), gs1 });

  if (parsed.type === "short_url") {
    // Our own item label: the stock item itself, one unit.
    if (parsed.t === "i") {
      const line = lineForItem(lines, parsed.id);
      return line ? hit(line, 1) : unknown;
    }
    // Our dispatch QR: one of this link's dispatch notes, or not on its way here.
    if (parsed.t === "d") {
      const dispatch = (dispatches || []).find((d) => String(d?.id) === String(parsed.id)) || null;
      return { kind: "dispatch", code, dispatch, gs1: null };
    }
    return unknown;
  }

  const lookup = gs1?.gtin ? String(gs1.gtin) : code;
  const numeric = gtinForms(lookup);
  // Every alias at the best rank, in line then alias order.
  let bestRank = null;
  let hits = [];
  lines.forEach((line) => {
    (line.barcodes || []).forEach((b) => {
      const rank = aliasRank(b?.code, lookup, numeric);
      if (rank == null) return;
      if (bestRank == null || rank < bestRank) {
        bestRank = rank;
        hits = [];
      }
      if (rank === bestRank) hits.push({ line, packFactor: b.packFactor });
    });
  });
  if (hits.length === 0) return unknown;

  // One pick per stock item (a line with no stock item is its own item).
  const itemKey = (line) => (line.invItemId != null ? `i:${Number(line.invItemId)}` : `l:${line.poLineId}`);
  const byItem = new Map();
  for (const h of hits) if (!byItem.has(itemKey(h.line))) byItem.set(itemKey(h.line), h);
  const picks = [...byItem.values()].map((h) => {
    if (h.line.invItemId == null) return itemOn(h.line, h.packFactor);
    // The item may sit on several lines: the open one takes it, with its own alias's pack.
    const line = lineForItem(lines, h.line.invItemId) || h.line;
    const onLine = hits.find((x) => x.line === line);
    return itemOn(line, onLine ? onLine.packFactor : h.packFactor);
  });
  if (picks.length > 1) return { kind: "ambiguous", code, candidates: picks, gs1 };
  return { kind: "item", code, item: picks[0], gs1 };
};
