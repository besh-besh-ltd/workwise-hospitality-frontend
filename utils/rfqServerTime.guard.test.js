/**
 * @jest-environment node
 *
 * Reads source files off disk. No DOM, no React.
 */

// THE INVERSE GREP, narrowed to the RFQ management surfaces.
//
// negotiationTime.guard.test.js already does this for the negotiation tree, and
// it bans `moment(<arg>)` outright — correct there, because every timestamp on
// a negotiation surface is a naive UTC one.
//
// That blanket rule CANNOT be pointed at manageRFQ. Two conventions live here:
//
//   IST wall clocks   bid_end_date, tender_publish_date,
//                     vendor_clarification_date, ra_start_date, ra_end_date —
//                     typed by a buyer into a local control and stored exactly
//                     as typed. `moment(raw)` is the RIGHT read for these, and
//                     "fixing" them would move every quote deadline in the
//                     product 5h30m late.
//
//   UTC wall clocks   `timestamp` — CURRENT_TIMESTAMP on a UTC server, handed
//                     back as a raw string by the OID-1114 type parser in
//                     dbConn.js. Reading it as local renders it 5h30m early.
//
// So this guard is not "no moment()". It is: a naive-UTC server timestamp must
// never reach a formatter that parses as local. That is exactly the defect
// reported on RFQ 968 — where the Created tile showed 03:00 PM (the scheduled
// publish time) for an RFQ created at 01:29 PM, and the fallback path would
// have shown 07:59 AM.

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

// Walked in full. Orphans included deliberately: manageRFQ/Item.js is unmounted
// today, and a guard that only covers mounted files invites the regression the
// moment someone re-mounts it.
const TARGETS = ["components/dashboard/buyer/manageRFQ"];

/** Fields that come off a `timestamp without time zone` column as naive UTC. */
const UTC_NAIVE_FIELDS = ["timestamp"];

/** Formatters that parse a naive string in the viewer's local zone. */
const LOCAL_PARSERS = ["moment", "new Date", "fmtDate", "fmtDateTime", "formatDisplayDate"];

function collect(target) {
  const abs = path.join(ROOT, target);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [abs];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) out.push(...collect(path.relative(ROOT, full)));
    else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Strip line and block comments so prose about the bug is not read as code. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Remove the sanctioned wrapper before looking for violations.
 *
 * `moment(parseNegotiationTime(x.timestamp))` is the CORRECT shape, but a naive
 * scan sees `moment(` … `.timestamp` and calls it a violation. Drop the wrapper
 * (and what it wraps) first, so only a bare field reaching a local parser is
 * left to find.
 */
function dropSanctionedWrappers(code) {
  return code.replace(/parseNegotiationTime\s*\([^()]*\)/g, "SAFE");
}

const files = TARGETS.flatMap(collect);

describe("RFQ management surfaces — a naive-UTC timestamp never parsed as local", () => {
  it("has files to check (a renamed directory must fail loudly, not silently pass)", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("no local-parsing formatter is handed a server timestamp", () => {
    const violations = [];

    for (const file of files) {
      const code = dropSanctionedWrappers(stripComments(fs.readFileSync(file, "utf8")));
      code.split("\n").forEach((line, i) => {
        for (const parser of LOCAL_PARSERS) {
          // `parser(` … `)` on one line, containing a UTC-naive field name.
          const re = new RegExp(`\\b${parser.replace(" ", "\\s+")}\\s*\\(([^)]*)\\)`, "g");
          let m;
          while ((m = re.exec(line)) !== null) {
            const arg = m[1];
            if (UTC_NAIVE_FIELDS.some((f) => new RegExp(`\\.${f}\\b`).test(arg))) {
              violations.push(
                `${path.relative(ROOT, file)}:${i + 1}  ${parser}(${arg.trim()})`
              );
            }
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("the detector actually fires — a planted violation is caught", () => {
    const planted = 'const x = fmtDate(data.timestamp);';
    const code = stripComments(planted);
    const re = /\bfmtDate\s*\(([^)]*)\)/g;
    const m = re.exec(code);
    expect(m).not.toBeNull();
    expect(/\.timestamp\b/.test(m[1])).toBe(true);
  });

  it("the sanctioned wrapper is not mistaken for a violation", () => {
    const good = dropSanctionedWrappers("moment(parseNegotiationTime(data.timestamp)).format('x')");
    expect(good).not.toMatch(/\.timestamp/);
    // …but the bare call it exists to catch still is.
    const bad = dropSanctionedWrappers("moment(data.timestamp).format('x')");
    expect(bad).toMatch(/\.timestamp/);
  });

  it("comments explaining the bug are not read as code", () => {
    const code = stripComments("// never write moment(data.timestamp) here\n/* nor fmtDate(data.timestamp) */\nconst ok = 1;");
    expect(code).not.toMatch(/\.timestamp/);
  });
});
