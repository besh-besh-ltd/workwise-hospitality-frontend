/**
 * @jest-environment node
 *
 * Reads source files off disk. No DOM, no React.
 */

// techEvalScoring.guard.test.js — THE INVERSE GREP.
//
// "Has a buyer scored this clause?" has exactly one honest answer: buyer_id is
// set on the vendor response, because only the buyer-scoring endpoint writes it.
//
// For a long time the answer was inferred instead, by comparing the response
// row's two timestamps — `response_timestamp !== score_timestamp`. It reads like
// a fair proxy. It is not. Both columns take the same value when the row is
// created, and the vendor re-submit path moves only response_timestamp. So any
// duplicate vendor submission made an unmarked clause look marked, at
// buyer_marks, which defaults to 0.
//
// On RFQ 536405 that recorded a 0% technical FAILURE against a vendor no buyer
// had ever been shown (the grid hides non-bidders), which in turn triggered the
// auto-replacement engine, pulled in a second non-bidder, and froze the RFQ in
// the technical stage with every resubmit returning HTTP 500. Production-wide,
// the inference disagreed with buyer_id on 234 of 2,105 rows: 35 vendor entries
// technically failed without assessment, 9 of them real priced bidders.
//
// The inference had grown into FIVE places across two repos, and grepping for
// `buyer_id` looked reassuring in all of them. This is the grep nobody ran.
//
// WHY NOT ESLINT: this frontend has no eslint configuration at all — only the
// devDependencies — and lint is not in CI. A no-restricted-syntax rule would
// mean introducing a config to a repo that has none and it would still never
// run. A test runs.
//
// THE RULE:
//   BANNED   any comparison between score_timestamp and a response timestamp
//   ALLOWED  reading, selecting, or writing either column on its own
//   ALLOWED  isClauseScored / isVendorFullyScored from utils/techEvalScoring

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const TIMESTAMP_INFERENCE = new RegExp(
  [
    String.raw`score_timestamp[\s\S]{0,80}?(!==?|<>|===)[\s\S]{0,40}?["'\`]?timestamp`,
    String.raw`["'\`]?timestamp["'\`]?[\s\S]{0,40}?(!==?|<>|===)[\s\S]{0,80}?score_timestamp`,
  ].join("|"),
  "i"
);

// Prose about the defect is allowed everywhere — including in the file that
// documents it. Only executable code is scanned.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const SEARCH_DIRS = ["components", "hooks", "utils", "pages", "services", "redux", "lib"];
const SKIP = new Set(["node_modules", ".next", ".git", "coverage", "dist", "build", "public"]);

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|jsx)$/.test(e.name) && !e.name.includes(".test.")) out.push(full);
    }
  };
  for (const d of SEARCH_DIRS) {
    const full = path.join(ROOT, d);
    if (fs.existsSync(full)) walk(full);
  }
  return out;
}

describe("the guard itself", () => {
  // A guard that cannot fail is not a guard.
  it("catches the spelling that shipped in ClauseProductItem", () => {
    expect(
      TIMESTAMP_INFERENCE.test(`      return resp.response_timestamp !== resp.score_timestamp;`)
    ).toBe(true);
  });

  it("catches the spelling that shipped in the submit counter", () => {
    expect(
      TIMESTAMP_INFERENCE.test(
        `            return resp?.score_timestamp && resp.score_timestamp !== resp.response_timestamp;`
      )
    ).toBe(true);
  });

  it("does not fire on the honest signal, or on plain reads and writes", () => {
    expect(TIMESTAMP_INFERENCE.test(`return response?.buyer_id != null;`)).toBe(false);
    expect(TIMESTAMP_INFERENCE.test(`score_timestamp: new Date().toISOString(),`)).toBe(false);
    expect(TIMESTAMP_INFERENCE.test(`const { score_timestamp, response_timestamp } = resp;`)).toBe(false);
  });
});

describe("no frontend code infers a score from timestamp drift", () => {
  it("holds across every source directory", () => {
    const offenders = sourceFiles()
      .filter((f) => TIMESTAMP_INFERENCE.test(stripComments(fs.readFileSync(f, "utf8"))))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it("keeps one definition of the predicate, in utils/techEvalScoring.js", () => {
    // Two copies is how the frontend ended up with a Submit button whose count
    // disagreed with the collapsed list it overwrote.
    const definitions = sourceFiles().filter((f) => {
      if (f.endsWith(path.join("utils", "techEvalScoring.js"))) return false;
      const src = stripComments(fs.readFileSync(f, "utf8"));
      return /const\s+isResponseScored\s*=\s*\(/.test(src)
        || /function\s+isClauseScored\s*\(/.test(src);
    }).map((f) => path.relative(ROOT, f));
    expect(definitions).toEqual([]);
  });
});
