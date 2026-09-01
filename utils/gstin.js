// GSTIN handling shared by the vendor quote surfaces (the RFQ quote wizard and
// the ARC contract quote page).
//
// Both store the value per-quote — tbl_quotes.gstin and tbl_arc_quote
// .gstin_used — so both used to present an empty box on every new request even
// though the platform already holds the vendor's GSTIN on their company
// profile. Vendors read the blank box as "the GSTIN I entered was lost" and
// could not tell whether they had ever supplied one. The rule below is the
// single answer to that, so the two surfaces cannot drift apart.

// Canonical 15-char GSTIN: 2-digit state + 10-char PAN + entity digit + 'Z' +
// checksum. Optional field, so an empty value is valid.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const normalizeGstin = (v) => String(v ?? "").trim().toUpperCase();

export const isValidGstin = (v) => {
  const clean = normalizeGstin(v);
  return !clean || GSTIN_PATTERN.test(clean);
};

/**
 * Decide what belongs in the GSTIN box when a quote form loads.
 *
 * SEED, NEVER OVERRIDE. `stored` — what this quote already carries — always
 * wins, including when it is malformed: a delivery-location GSTIN legitimately
 * differs from the head-office one, and a bad value must stay on screen to be
 * corrected rather than be silently replaced.
 *
 * Only a WELL-FORMED profile GSTIN is offered. 18 of 422 production vendor
 * profiles hold junk in that column (truncated to 14 characters, a stray
 * leading ':', one literal password); seeding one would put a value the vendor
 * never typed into the box and then fail validation against it.
 *
 * @param {{stored?: string|null, profile?: string|null}} input
 * @returns {{value: string, fromProfile: boolean}} `fromProfile` drives the
 *   "prefilled from your company profile" hint — the vendor's actual question
 *   was "did I fill this in?", so the origin has to be visible.
 */
export const seedGstin = ({ stored, profile } = {}) => {
  const storedClean = String(stored ?? "").trim();
  if (storedClean) return { value: stored, fromProfile: false };

  const profileClean = normalizeGstin(profile);
  if (profileClean && isValidGstin(profileClean)) {
    return { value: profileClean, fromProfile: true };
  }
  return { value: "", fromProfile: false };
};
