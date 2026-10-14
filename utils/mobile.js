/**
 * One definition of how a user's mobile is stored and read back.
 *
 * Stored form: "<country code>-<number>", e.g. "+91-9876500001", in
 * tbl_users.mobile, which is varchar(15). The backend applies the same rules
 * (backend app/helper/mobile.js); keep the two in step.
 *
 * This replaces three hand-written parsers that each read "the part before
 * the first hyphen" as the country code. On a bare "9876500001" — 87 users
 * were bulk-imported that way — the self-profile page took the whole number
 * as the code and saved "9876500001-". The admin modal then read THAT as code
 * "9876500001" with a blank number; the country picker had no such option, so
 * it quietly showed a valid-looking code instead; the admin typed the number
 * and the form sent "9876500001-9876500001", 21 characters, which the database
 * refused. The admin saw "An internal error has occurred".
 *
 * So: only "+" followed by 1-6 digits is ever a country code. Six, because the
 * picker offers +441481, +441534, +441624 and +90392.
 */

export const DEFAULT_COUNTRY_CODE = "+91";
/** tbl_users.mobile is varchar(15). */
export const MOBILE_MAX_LENGTH = 15;
export const COUNTRY_CODE_PATTERN = /^\+\d{1,6}$/;
export const MOBILE_MIN_DIGITS = 8;
/** "+91-" is 4 characters, so 11 digits is the most a 2-digit code can hold. */
export const MOBILE_MAX_DIGITS = 11;

/** Digits only, without the domestic trunk prefix (a leading 0). */
export const mobileDigits = (value) =>
  String(value ?? "").replace(/\D/g, "").replace(/^0+/, "");

/**
 * Split a stored mobile into the two form fields, whatever shape it is in.
 * Returns `{ countryCode, mobileNumber }` — the shape every caller already uses.
 */
export const parseMobile = (stored) => {
  const s = String(stored ?? "").trim();
  if (!s) return { countryCode: DEFAULT_COUNTRY_CODE, mobileNumber: "" };

  const withCode = s.match(/^(\+\d{1,6})(?:[\s-]+(.*))?$/);
  if (withCode) {
    return { countryCode: withCode[1], mobileNumber: mobileDigits(withCode[2]) };
  }
  // Bare ("9876500001"), trailing-hyphen ("9876500001-") or anything else
  // without a recognisable code: the digits are the number, the code is the
  // default. Never promote the number itself to a country code.
  return { countryCode: DEFAULT_COUNTRY_CODE, mobileNumber: mobileDigits(s) };
};

/**
 * Join the two form fields into the stored form. A country code that is not
 * one falls back to the default rather than being glued in front of the
 * number. A blank number gives "" — never a bare "+91-".
 */
export const formatMobile = (countryCode, mobileNumber) => {
  const code = String(countryCode ?? "").trim();
  const digits = mobileDigits(mobileNumber);
  if (!digits) return "";
  return `${COUNTRY_CODE_PATTERN.test(code) ? code : DEFAULT_COUNTRY_CODE}-${digits}`;
};

/** True when the joined value fits the column. */
export const fitsMobileColumn = (countryCode, mobileNumber) =>
  formatMobile(countryCode, mobileNumber).length <= MOBILE_MAX_LENGTH;

/**
 * For forms whose number field also accepts a typed code (registration allows
 * "+91 98765 00001"). A code the user typed wins over the picker — it is what
 * they actually wrote.
 *
 * Registration used to strip a typed code only when a HYPHEN followed it, then
 * cut the result to 15 characters to fit the column. "+91 98765 00001" kept its
 * code, became "+91-+91 98765 00001", and was cut to "+91-+91 98765 0" — a
 * wrong number stored without a word to anyone. Two users lost digits this way.
 */
export const toStoredMobile = (countryCode, typed) => {
  const value = String(typed ?? "").trim();
  if (value.startsWith("+")) {
    const parsed = parseMobile(value);
    return formatMobile(parsed.countryCode, parsed.mobileNumber);
  }
  return formatMobile(countryCode, value);
};
