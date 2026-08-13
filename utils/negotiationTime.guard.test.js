/**
 * @jest-environment node
 *
 * Reads source files off disk. No DOM, no React.
 */

// negotiationTime.guard.test.js — THE INVERSE GREP.
//
// This is the test that stops ticket #5.
//
// Four independent copies of the same three-line "naive DB timestamps are UTC"
// parser grew in the negotiation tree, each with a near-identical comment, none
// shared. Grepping for `moment.utc|parseAsUTC` returned about twenty correct
// hits and the area LOOKED fixed. It was not: the bug lived in the fourteen
// places where none of those tokens appeared and the code simply called
// `moment(raw)` or `new Date(raw)` — which read a naive UTC string as local
// wall clock and printed a 12:30 PM IST deadline as 07:00 AM.
//
// Nobody ran the inverse grep. Three previous tickets in this area were closed
// by fixing ONE render expression, because a PR diff shows you a file and this
// bug lives at the seam between two. This file is the inverse grep, wired to
// the thing that actually runs.
//
// WHY NOT ESLINT: the frontend has NO eslint configuration at all — no
// .eslintrc*, no eslint.config.*, no `eslintConfig` key — only the
// devDependencies. `npm run lint` drops into next's interactive "how would you
// like to configure ESLint?" prompt and configures nothing, and lint is not in
// CI. A no-restricted-syntax rule would mean introducing a whole config to a
// repo that has none, surfacing a large backlog of unrelated violations, and
// still never running. A test runs.
//
// THE RULE, and what it deliberately does NOT ban:
//
//   BANNED   formatDisplayDate(...)      opposite contract — "parse as local",
//                                        right for its 78 other call sites,
//                                        wrong for every negotiation timestamp
//   BANNED   new Date(<arg>)             the naive-as-local read itself
//   BANNED   moment(<arg>)               ditto
//   BANNED   .toLocaleDateString/TimeString  renders in the viewer's zone
//
//   ALLOWED  new Date() / moment()       zero-arg: "now" has no zone problem
//   ALLOWED  moment.utc(<arg>)           an explicit, correct parse. These
//                                        render in the VIEWER's zone rather
//                                        than pinned IST (NegotiationColumnCell,
//                                        NegotiationModal, RoundApprovalsList)
//                                        which is a deliberate scope call, not
//                                        a timezone bug — see changes.md §5.
//                                        Worth a follow-up; not this ticket.
//   ALLOWED  Number(x).toLocaleString()  money formatting, not dates.
//
// Everything banned has a replacement in utils/negotiationTime.js. If you are
// here because this test failed: import the helper, do not add an exemption.

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

// The negotiation surfaces. Directories are walked; single files are the two
// negotiation renderers that live outside a negotiation directory and were
// missed by every previous sweep for exactly that reason.
const TARGETS = [
  "components/dashboard/buyer/negotiation",
  "components/dashboard/rate-contracts/buyer/negotiation",
  "components/dashboard/rate-contracts/vendor/VendorArcNegotiationBanner.js",
  "components/dashboard/buyer/manageRFQ/NegotiationRoundsModal.js",
  // Vendor-side RFQ negotiation renderers. Added in review: all three read
  // round.end_date and all three sat outside every target above, which is the
  // "wrong glob" version of the very miss this guard exists to prevent.
  // ProductNegotiationBadge is live (send-quote.js + the buyer's
  // ProductComparisonTab); the other two are orphans today but are the obvious
  // things to re-mount, and a guard that only covers mounted files invites the
  // next regression.
  "components/dashboard/vendor/ProductNegotiationBadge.js",
  "components/dashboard/vendor/VendorNegotiationInfo.js",
  "components/dashboard/vendor/NegotiationRoundBanner.js",
];

/** Every .js/.jsx under a target, tests excluded. */
function collect(target) {
  const abs = path.join(ROOT, target);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [abs];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = path.join(abs, entry.name);
    if (entry.isDirectory()) out.push(...collect(path.relative(ROOT, child)));
    else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\.(js|jsx)$/.test(entry.name)) out.push(child);
  }
  return out;
}

/**
 * Blank out comments and string/template literals, preserving offsets so line
 * numbers still line up. Without this the file's OWN explanation of the bug
 * ("`moment(formData.end_date)` read the API's naive UTC…") reports as a
 * violation, and the guard gets weakened to shut it up.
 */
function stripNonCode(src) {
  const out = src.split("");
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== "\n") out[k] = " ";
  };
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === "//") {
      const end = src.indexOf("\n", i);
      blank(i, end === -1 ? src.length : end);
      i = end === -1 ? src.length : end;
    } else if (two === "/*") {
      const end = src.indexOf("*/", i + 2);
      blank(i, end === -1 ? src.length : end + 2);
      i = end === -1 ? src.length : end + 2;
    } else if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
      const quote = src[i];
      let j = i + 1;
      while (j < src.length && src[j] !== quote) j += src[j] === "\\" ? 2 : 1;
      blank(i + 1, j);
      i = j + 1;
    } else {
      i++;
    }
  }
  return out.join("");
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/** A `new Date(` / `moment(` whose parenthesis does not immediately close. */
function callsWithArgument(code, token) {
  const hits = [];
  const re = new RegExp(token, "g");
  let m;
  while ((m = re.exec(code))) {
    const rest = code.slice(m.index + m[0].length);
    if (!/^\s*\)/.test(rest)) hits.push(m.index);
  }
  return hits;
}

function violationsIn(file) {
  const src = fs.readFileSync(file, "utf8");
  const code = stripNonCode(src);
  const rel = path.relative(ROOT, file);
  const found = [];
  const add = (index, rule, snippet) =>
    found.push(`${rel}:${lineOf(src, index)}  ${rule}  ${snippet.trim()}`);
  const snippetAt = (index) => {
    const start = src.lastIndexOf("\n", index) + 1;
    const end = src.indexOf("\n", index);
    return src.slice(start, end === -1 ? undefined : end);
  };

  for (const index of callsWithArgument(code, "\\bnew Date\\(")) {
    add(index, "new Date(<arg>)  → parseNegotiationTime()", snippetAt(index));
  }
  // (?<!\.) keeps `moment.utc(` out — an explicit, correct parse.
  for (const index of callsWithArgument(code, "(?<![.\\w])moment\\(")) {
    add(index, "moment(<arg>)    → parseNegotiationTime()", snippetAt(index));
  }
  let m;
  const fdd = /\bformatDisplayDate\s*\(/g;
  while ((m = fdd.exec(code))) {
    add(m.index, "formatDisplayDate → formatNegotiationDateTime()", snippetAt(m.index));
  }
  const loc = /\.toLocale(Date|Time)String\s*\(/g;
  while ((m = loc.exec(code))) {
    add(m.index, "toLocale*String  → formatNegotiationDateTime()", snippetAt(m.index));
  }
  return found;
}

const FILES = TARGETS.flatMap(collect);

describe("the inverse grep — no negotiation surface parses a timestamp by hand", () => {
  it("finds the negotiation trees at all (a guard that scans nothing is worse than none)", () => {
    // The failure mode this exists for: someone moves or renames a directory,
    // TARGETS silently matches zero files, and the guard goes permanently
    // green while the tree it was watching drifts.
    expect(FILES.length).toBeGreaterThan(20);
    for (const target of TARGETS) {
      expect({ target, found: collect(target).length > 0 }).toEqual({ target, found: true });
    }
  });

  it("has zero hand-rolled timestamp reads across every negotiation surface", () => {
    const all = FILES.flatMap(violationsIn);
    // toEqual([]) rather than toHaveLength(0): the diff then PRINTS every
    // offending file:line and the line itself, so the failure is a worklist.
    expect(all).toEqual([]);
  });

  it("the exemptions are real — moment.utc and zero-arg now are not flagged", () => {
    // Guards the guard. If stripNonCode or the lookbehind regressed into
    // flagging these, someone would "fix" ~10 correct call sites.
    const sample = [
      'const isExpired = moment.utc(round.end_date).isBefore(moment());',
      'const now = new Date();',
      'const label = moment.utc(x).local().format("DD/MM/YYYY");',
      'return "₹" + Math.round(Number(n)).toLocaleString("en-IN");',
    ].join("\n");
    const code = stripNonCode(sample);
    expect(callsWithArgument(code, "\\bnew Date\\(")).toEqual([]);
    expect(callsWithArgument(code, "(?<![.\\w])moment\\(")).toEqual([]);
    expect(code).not.toMatch(/\.toLocale(Date|Time)String\s*\(/);
  });

  it("the guard actually bites — the four banned shapes are all detected", () => {
    // The other half of the same statement. A scanner that finds nothing
    // because its regexes are broken looks identical to a clean tree.
    const sample = [
      'const a = new Date(round.end_date);',
      'const b = moment(formData.end_date).format("DD MMM YYYY · hh:mm A");',
      'const c = formatDisplayDate(round.end_date, { includeTime: true });',
      'const d = new Date(iso).toLocaleDateString("en-IN");',
    ].join("\n");
    const code = stripNonCode(sample);
    expect(callsWithArgument(code, "\\bnew Date\\(")).toHaveLength(2);
    expect(callsWithArgument(code, "(?<![.\\w])moment\\(")).toHaveLength(1);
    expect(code).toMatch(/\bformatDisplayDate\s*\(/);
    expect(code).toMatch(/\.toLocaleDateString\s*\(/);
  });

  it("comments and strings are not code — the files explaining the bug stay clean", () => {
    const sample = [
      '// THE ticket-1 line. `moment(formData.end_date)` read the API naive UTC',
      '/* was: new Date(iso).toLocaleString("en-IN", …) */',
      'const msg = "call formatDisplayDate(x) instead";',
    ].join("\n");
    const code = stripNonCode(sample);
    expect(callsWithArgument(code, "\\bnew Date\\(")).toEqual([]);
    expect(callsWithArgument(code, "(?<![.\\w])moment\\(")).toEqual([]);
    expect(code).not.toMatch(/\bformatDisplayDate\s*\(/);
    // …and offsets are preserved, so reported line numbers are real.
    expect(code.split("\n")).toHaveLength(3);
  });

  it("every negotiation surface that renders a timestamp imports the ONE helper", () => {
    // The positive half. Zero violations is also what an empty directory
    // looks like; this proves the helper is genuinely in use across the tree
    // rather than that nobody renders a date any more.
    const importers = FILES.filter((f) =>
      /from ["']@\/utils\/negotiationTime["']/.test(fs.readFileSync(f, "utf8"))
    );
    expect(importers.length).toBeGreaterThanOrEqual(8);
  });
});
