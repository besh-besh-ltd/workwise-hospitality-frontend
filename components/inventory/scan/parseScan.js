// What did the scanner read? The client-side twin of the backend's
// app/services/inventory/scanService.js parsing (keep the two in step).
//
// The server does the authoritative resolve; this only classifies a read so a
// screen can act before the round trip (e.g. prefill batch/expiry from a GS1
// code) and so every source sends the same cleaned-up string:
//   - our own QR labels:  /s/<t>/<id>, with or without a host (t: i p g d);
//   - GS1 element strings: AIM ]C1 / ]d2 / ]e0 / ]Q3 / ]J1 prefix, a leading
//     GS (FNC1), the human-readable "(01)…(17)…" form, or a bare "01…" string
//     with a valid GTIN check digit (the camera returns GS1 as plain text with
//     GS separators and no AIM prefix);
//   - anything else is a plain code (EAN/UPC, item code, SKU), trimmed, with a
//     non-GS1 AIM identifier (]E0, ]C0 …) dropped.

const GS = "\x1d";

// Fixed (`len`) or variable (`max`, ended by GS or the end) application identifiers.
const AI_2 = {
  "00": { len: 18 }, "01": { len: 14 }, "02": { len: 14 },
  10: { max: 20 }, 11: { len: 6 }, 12: { len: 6 }, 13: { len: 6 }, 15: { len: 6 },
  16: { len: 6 }, 17: { len: 6 }, 20: { len: 2 }, 21: { max: 20 }, 22: { max: 20 },
  30: { max: 8 }, 37: { max: 8 },
};
const AI_3 = {
  240: { max: 30 }, 241: { max: 30 }, 250: { max: 30 }, 251: { max: 30 }, 254: { max: 20 },
  400: { max: 30 }, 401: { max: 30 }, 403: { max: 30 },
};

function aiAt(s, pos) {
  const four = s.slice(pos, pos + 4);
  if (/^3[1-6]\d\d$/.test(four)) return { ai: four, len: 6 };
  const three = s.slice(pos, pos + 3);
  if (/^41[0-7]$/.test(three)) return { ai: three, len: 13 };
  if (AI_3[three]) return { ai: three, ...AI_3[three] };
  const two = s.slice(pos, pos + 2);
  if (AI_2[two]) return { ai: two, ...AI_2[two] };
  return null;
}

/** GS1 mod-10 check digit over every digit but the last. */
export function validGtinCheckDigit(digits) {
  if (!/^\d{8,14}$/.test(digits)) return false;
  let sum = 0;
  for (let i = digits.length - 2, w = 3; i >= 0; i -= 1, w = 4 - w) sum += Number(digits[i]) * w;
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

const lastDayOfMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// YYMMDD → 'YYYY-MM-DD'; day 00 = last day of the month; GS1 sliding-window century.
function gs1Date(yymmdd, now = new Date()) {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  let dd = Number(yymmdd.slice(4, 6));
  const current = now.getUTCFullYear();
  const diff = yy - (current % 100);
  const century = Math.floor(current / 100) + (diff >= 51 ? -1 : diff <= -50 ? 1 : 0);
  const year = century * 100 + yy;
  if (mm < 1 || mm > 12) return null;
  const last = lastDayOfMonth(year, mm);
  if (dd === 0) dd = last;
  if (dd > last) return null;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

const GS1_PREFIX = /^\](C1|e0|d2|Q3|J1)/;
const ANY_AIM_PREFIX = /^\][A-Za-z][0-9A-Za-z]/;
const PAREN_FORM = /^(\(\d{2,4}\)[^()]*)+$/;
// Leading whitespace, trailing CR/LF/tab/space (scanner suffixes). GS (\x1d)
// is not whitespace to a JS regex, so a leading FNC1 survives.
const trimScan = (raw) => raw.replace(/^[\s]+|[\r\n\t ]+$/g, "");

/**
 * Parse a GS1 element string.
 * @returns {{gtin:string, batch:string|null, expiry:string|null, serial:string|null}|null}
 */
export function parseGs1(code) {
  if (typeof code !== "string") return null;
  let s = trimScan(code);
  if (!s) return null;

  if (GS1_PREFIX.test(s)) s = s.slice(3);
  else if (s.startsWith(GS)) s = s.slice(1);
  else if (PAREN_FORM.test(s)) s = s.replace(/\((\d{2,4})\)/g, `${GS}$1`).slice(1);
  else if (!(/^01\d{14}/.test(s) && validGtinCheckDigit(s.slice(2, 16)))) return null;

  const out = { gtin: null, batch: null, expiry: null, serial: null };
  let pos = 0;
  while (pos < s.length) {
    if (s[pos] === GS) {
      pos += 1;
      continue;
    }
    const rule = aiAt(s, pos);
    if (!rule) break;
    pos += rule.ai.length;
    let value;
    if (rule.len) {
      value = s.slice(pos, pos + rule.len);
      if (value.length < rule.len || value.includes(GS)) break;
      pos += rule.len;
    } else {
      const end = s.indexOf(GS, pos);
      value = end === -1 ? s.slice(pos) : s.slice(pos, end);
      pos = end === -1 ? s.length : end + 1;
    }
    if (rule.ai === "01") {
      if (!/^\d{14}$/.test(value)) break;
      out.gtin = value;
    } else if (rule.ai === "10") out.batch = value || null;
    else if (rule.ai === "17") out.expiry = gs1Date(value);
    else if (rule.ai === "21") out.serial = value || null;
  }
  return out.gtin ? out : null;
}

const SHORT_URL = /^(?:https?:\/\/[^/\s]+)?\/s\/([pgidPGID])\/(\d+)\/?(?:[?#].*)?$/;

/**
 * Classify one read.
 * @returns {{type:'short_url', t:'p'|'g'|'i'|'d', id:number, code:string}
 *   | {type:'gs1', gs1:{gtin, batch, expiry, serial}, code:string}
 *   | {type:'plain', code:string}
 *   | null}  null for an empty read.
 * `code` is what to send to the server: the trimmed read (GS1 keeps its
 * prefix and separators, the server parses it again).
 */
export function parseScan(raw) {
  if (typeof raw !== "string") return null;
  const code = trimScan(raw);
  if (!code) return null;

  const short = SHORT_URL.exec(code);
  if (short) {
    const id = Number(short[2]);
    if (Number.isSafeInteger(id) && id > 0) return { type: "short_url", t: short[1].toLowerCase(), id, code };
  }

  const gs1 = parseGs1(code);
  if (gs1) return { type: "gs1", gs1, code };

  const plain = ANY_AIM_PREFIX.test(code) ? code.slice(3).trim() : code;
  return plain ? { type: "plain", code: plain } : null;
}

export default parseScan;
