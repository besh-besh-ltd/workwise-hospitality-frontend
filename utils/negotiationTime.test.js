/**
 * @jest-environment node
 *
 * No DOM here — this is a pure formatter, and the node environment starts
 * faster and keeps the zone plumbing simple.
 */

// negotiationTime.test.js — the one formatter, pinned.
//
// THE BUG THIS FILE EXISTS FOR (ticket 1):
//
//   tbl_negotiation_rounds.end_date is `timestamp without time zone` holding
//   UTC, and dbConn.js:31 hands it to Node as a bare unlabelled string —
//   "2026-08-13 07:00:00". `moment(that)` and `new Date(that)` both read it as
//   LOCAL wall clock and print the digits straight back. On the approval page
//   that rendered 07:00 AM for a deadline that is 12:30 PM IST — while the
//   SAME screen, two inches higher, rendered created_at correctly through a
//   private parser it did not share.
//
// WHY THE TEST ENVIRONMENT HID IT: jest.config.js pins no TZ. Under UTC (which
// is what CI and a naive `npx jest` on a US machine give you) reading a UTC
// string as local time is a NO-OP, so every one of these assertions passes
// against the broken code. The backend has a written warning about exactly
// this class (backend/CLAUDE.md, "Timezone: your local Postgres does not match
// production"); the frontend had no equivalent, and this is its twin.
//
// So every assertion here is written to hold IN EVERY ZONE, and the suite is
// run from the shell under at least two:
//
//   TZ=Asia/Kolkata   npx jest utils/negotiationTime
//   TZ=Asia/Singapore npx jest utils/negotiationTime      # EAST of IST
//   TZ=UTC            npx jest utils/negotiationTime      # production's zone
//
// EAST matters. Per backend/CLAUDE.md the error in this class is
// `5h30m − viewer_offset`, so it CHANGES SIGN east of IST rather than
// shrinking. A one-zone test is not a test.
//
// Why the matrix is at the SHELL and not a loop in this file: assigning
// process.env.TZ mid-run does not re-point Date inside a Jest worker
// (measured, both environments, Node 22). An in-process zone loop would run N
// identical iterations in one zone and pass against code wrong in the other
// N-1 — worse than no test at all. See THE ZONE TEST block.

import {
  NEGOTIATION_TIMEZONE,
  parseNegotiationTime,
  formatNegotiationDate,
  formatNegotiationDateTime,
  formatNegotiationDeadline,
  negotiationRelative,
  localDateTimeInputMin,
  parseLocalDateTimeInput,
  formatUtcDateTime,
} from "@/utils/negotiationTime";

// THE production row behind ticket 1: RFQ #536147, round 914.
const NAIVE_UTC = "2026-08-13 07:00:00";
const AS_ISO_Z = "2026-08-13T07:00:00.000Z";
const AS_IST_OFFSET = "2026-08-13T12:30:00+05:30";
const RENDERED = "13 Aug 2026, 12:30 PM";

describe("parseNegotiationTime — one instant, three spellings", () => {
  it("reads a bare database timestamp as UTC, not as local wall clock", () => {
    // The single assertion the whole ticket reduces to. Under TZ=Asia/Kolkata
    // the broken reading yields 01:30 UTC; this must be 07:00 UTC.
    expect(parseNegotiationTime(NAIVE_UTC).toISOString()).toBe(AS_ISO_Z);
  });

  it("is idempotent on an ISO instant — the backend now sends these", () => {
    // Layer 1 of the fix labels these server-side. Both shapes have to work:
    // a cached response or an older client can still carry the naive form.
    expect(parseNegotiationTime(AS_ISO_Z).toISOString()).toBe(AS_ISO_Z);
  });

  it("honours an explicit offset as written", () => {
    expect(parseNegotiationTime(AS_IST_OFFSET).toISOString()).toBe(AS_ISO_Z);
  });

  it("passes a Date through, and refuses what it cannot read", () => {
    const d = new Date(AS_ISO_Z);
    expect(parseNegotiationTime(d)).toBe(d);
    expect(parseNegotiationTime(null)).toBeNull();
    expect(parseNegotiationTime("")).toBeNull();
    expect(parseNegotiationTime("not a date")).toBeNull();
    expect(parseNegotiationTime(new Date("nope"))).toBeNull();
  });
});

describe("rendering — pinned to IST, suffixed on deadlines", () => {
  it("renders the deadline everybody in the negotiation is working to", () => {
    expect(formatNegotiationDateTime(NAIVE_UTC)).toBe(RENDERED);
    // 07:00 is the stored digits. Printing them is the bug, so name it.
    expect(formatNegotiationDateTime(NAIVE_UTC)).not.toMatch(/07:00 AM/);
  });

  it("says IST on a deadline, because a reader in another zone converts wrong", () => {
    // Decision 1: pinned zone + explicit suffix. The vendor's own notification
    // email already quotes the deadline in IST; two people in two zones
    // reading two times off one deadline IS ticket 1 again.
    expect(formatNegotiationDeadline(NAIVE_UTC)).toBe(`${RENDERED} IST`);
    expect(NEGOTIATION_TIMEZONE).toBe("Asia/Kolkata");
  });

  it("gives all three spellings of the instant one rendering", () => {
    for (const raw of [NAIVE_UTC, AS_ISO_Z, AS_IST_OFFSET]) {
      expect(formatNegotiationDateTime(raw)).toBe(RENDERED);
      expect(formatNegotiationDate(raw)).toBe("13 Aug 2026");
    }
  });

  it("CROSSES THE DAY BOUNDARY — 12 Aug 19:30 UTC is 13 Aug in India", () => {
    // The defect NegotiationBanner had: a date-only render off a naive
    // timestamp is wrong by a WHOLE DAY for everything between 18:30 and
    // 23:59 UTC. That is 22% of the clock, every day.
    expect(formatNegotiationDate("2026-08-12 19:30:00")).toBe("13 Aug 2026");
    expect(formatNegotiationDateTime("2026-08-12 19:30:00")).toBe("13 Aug 2026, 01:00 AM");
  });

  it("zero-pads hours and days, so a column of them lines up", () => {
    // changes.md §4: one formatter, one shape. roundDetailModel used to leave
    // the hour unpadded and parentRow left the day unpadded.
    expect(formatNegotiationDateTime("2026-08-12 19:30:00")).toMatch(/\b01:00 AM$/);
    expect(formatNegotiationDate("2026-08-01 12:00:00")).toBe("01 Aug 2026");
  });

  it("renders midnight and noon the way a human reads them", () => {
    // 18:30 UTC = 00:00 IST next day; 06:30 UTC = 12:00 IST.
    expect(formatNegotiationDateTime("2026-08-12 18:30:00")).toBe("13 Aug 2026, 12:00 AM");
    expect(formatNegotiationDateTime("2026-08-13 06:30:00")).toBe("13 Aug 2026, 12:00 PM");
  });

  it("falls back rather than printing Invalid Date", () => {
    expect(formatNegotiationDate(null)).toBe("—");
    expect(formatNegotiationDateTime(undefined)).toBe("—");
    expect(formatNegotiationDeadline("")).toBe("—");
    // The caller picks the fallback: parentRow needs null, not an em dash,
    // because its call sites do `fmtDate(x) || "None pending"`.
    expect(formatNegotiationDate(null, null)).toBeNull();
    expect(formatNegotiationDeadline(null, "None pending")).toBe("None pending");
  });
});

// The zone this process is actually running in, named for the test titles
// below so a matrix run shows two different names in its output.
const PROCESS_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Minutes EAST of UTC. `|| 0` normalises the -0 that negating a zero offset
// produces under TZ=UTC, which toBe() distinguishes from 0.
const PROCESS_OFFSET_MIN = -new Date(AS_ISO_Z).getTimezoneOffset() || 0;

describe(`THE ZONE TEST — the render must not move when the reader does (process zone: ${PROCESS_ZONE})`, () => {
  // WHY THIS IS A SHELL-LEVEL MATRIX AND NOT AN in-process LOOP:
  //
  // Assigning process.env.TZ mid-run does NOT re-point Date inside a Jest
  // worker — measured, both under jsdom and under the node environment on
  // Node 22. An in-process `for (const zone of ZONES)` loop therefore runs
  // five identical iterations in ONE zone and passes against code that is
  // wrong in four of them. That is a worse test than none, so the matrix is
  // driven from outside:
  //
  //   TZ=Asia/Kolkata   npx jest utils/negotiationTime      # IST itself
  //   TZ=Asia/Singapore npx jest utils/negotiationTime      # EAST of IST
  //   TZ=UTC            npx jest utils/negotiationTime      # production's zone
  //
  // EAST is the direction that matters. Per backend/CLAUDE.md the error in
  // this bug class is `5h30m − viewer_offset`, so it CHANGES SIGN east of IST
  // rather than shrinking: a formatter that leaks the viewer's zone is 5h30m
  // out in London, 2h30m out in Singapore and 3h30m out THE OTHER WAY in
  // Tokyo. A UTC-only run signs off all three.
  //
  // Everything in this block is written to be TRUE IN EVERY ZONE, so whichever
  // zone the runner picks, the assertions mean the same thing.

  it(`renders the IST wall clock while the viewer sits at UTC${PROCESS_OFFSET_MIN >= 0 ? "+" : "-"}${Math.abs(PROCESS_OFFSET_MIN)}min`, () => {
    // THE assertion of the whole file. Under TZ=Asia/Singapore a viewer-zone
    // renderer would say 15:00; under TZ=UTC, 07:00. Both are the bug.
    expect(formatNegotiationDateTime(NAIVE_UTC)).toBe(RENDERED);
    expect(formatNegotiationDeadline(NAIVE_UTC)).toBe(`${RENDERED} IST`);
    expect(formatNegotiationDate("2026-08-12 19:30:00")).toBe("13 Aug 2026");
    expect(parseNegotiationTime(NAIVE_UTC).toISOString()).toBe(AS_ISO_Z);
  });

  it("agrees with the platform's own tz database for Asia/Kolkata", () => {
    // The helper does a fixed +05:30 arithmetic shift rather than an Intl
    // lookup (IST has no DST, and arithmetic is identical under every runner
    // and locale). This cross-checks that shortcut against ICU, in whatever
    // zone the process happens to be — so an arithmetic slip cannot hide
    // behind a zone that happens to cancel it out.
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "short", year: "numeric",
      // hourCycle, NOT hour12. `hour12: true` leaves the CYCLE to ICU, and
      // en-GB resolves it to h11 on some ICU builds — where 12:30 PM formats
      // its hour as "00", not "12". That made this cross-check fail in CI
      // while passing locally, on a value the formatter renders correctly.
      // The ambiguity was in the test's own reference, not in the helper.
      hour: "2-digit", minute: "2-digit", hourCycle: "h12",
    }).formatToParts(new Date(AS_ISO_Z));
    const get = (t) => parts.find((p) => p.type === t)?.value;

    expect(formatNegotiationDate(NAIVE_UTC)).toBe(`${get("day")} ${get("month")} ${get("year")}`);
    expect(formatNegotiationDateTime(NAIVE_UTC)).toContain(`${get("hour")}:${get("minute")}`);
    expect(formatNegotiationDateTime(NAIVE_UTC)).toMatch(
      new RegExp(`${get("dayPeriod").replace(/[^A-Za-z]/g, "")}$`, "i")
    );
  });

  it("checks the day boundary against ICU too — the whole-day error", () => {
    const istDay = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
    }).format(new Date("2026-08-12T19:30:00Z"));
    // "13 Aug 2026" in both spellings.
    expect(formatNegotiationDate("2026-08-12 19:30:00")).toBe(istDay.replace(/,/g, ""));
  });
});

describe("localDateTimeInputMin — the ONE thing here that is deliberately local", () => {
  // Inventory rows 16-18. `new Date().toISOString().slice(0,16)` is UTC; the
  // control it constrains reads and writes LOCAL wall clock. On an Indian
  // buyer's machine that floor sits 5h30m in the past, so the browser happily
  // accepts a deadline that has already gone.
  it("is the viewer's wall clock, not UTC", () => {
    const min = localDateTimeInputMin();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const expected =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    expect(min).toBe(expected);
  });

  it("is NOT the UTC slice — the exact expression it replaced", () => {
    // Under any non-UTC zone these must differ; under UTC they coincide and
    // the assertion is skipped rather than faked.
    const utcSlice = new Date().toISOString().slice(0, 16);
    if (new Date().getTimezoneOffset() !== 0) {
      expect(localDateTimeInputMin()).not.toBe(utcSlice);
    } else {
      expect(localDateTimeInputMin()).toBe(utcSlice);
    }
  });

  it("shape matches what <input type=datetime-local> accepts", () => {
    expect(localDateTimeInputMin()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("takes an offset, for 'at least five minutes out'", () => {
    const now = localDateTimeInputMin();
    const later = localDateTimeInputMin(48 * 3600 * 1000);
    expect(later > now).toBe(true);
  });
});

describe("parseLocalDateTimeInput — the inverse, and why it is a separate function", () => {
  // THE SEAM TICKET 1 FELL THROUGH. StepReview receives formData.end_date in
  // two shapes: "2026-08-13T12:30" (a LOCAL wall clock, from the wizard's
  // datetime-local control) and "2026-08-13 07:00:00" (a UTC INSTANT, from the
  // API). One parser for both is the bug. Two named shapes, two parsers.
  it("reads a datetime-local value as LOCAL, which is what the control means", () => {
    // `new Date(y, m, d, h, min)` IS the local-wall-clock constructor, so this
    // expectation is correct in every zone. Under TZ=Asia/Kolkata it resolves
    // to 07:00Z — the exact instant the wizard has always sent, and the one
    // the fix must not disturb.
    expect(parseLocalDateTimeInput("2026-08-13T12:30").getTime()).toBe(
      new Date(2026, 7, 13, 12, 30, 0, 0).getTime()
    );
    if (PROCESS_ZONE === "Asia/Calcutta" || PROCESS_ZONE === "Asia/Kolkata") {
      expect(parseLocalDateTimeInput("2026-08-13T12:30").toISOString()).toBe(AS_ISO_Z);
    }
  });

  it("disagrees with parseNegotiationTime on the same string — deliberately", () => {
    const asWallClock = parseLocalDateTimeInput("2026-08-13T12:30").getTime();
    const asInstant = parseNegotiationTime("2026-08-13T12:30").getTime();
    // The gap IS the viewer's offset: 5h30m in Mumbai, 8h in Singapore, and
    // ZERO under UTC — which is precisely why running this suite only under
    // UTC would let the two functions be merged without anyone noticing.
    expect(asInstant - asWallClock).toBe(PROCESS_OFFSET_MIN * 60 * 1000);
    if (PROCESS_OFFSET_MIN !== 0) {
      expect(asInstant).not.toBe(asWallClock);
    }
  });

  it("round-trips with localDateTimeInputMin", () => {
    const min = localDateTimeInputMin();
    const back = parseLocalDateTimeInput(min);
    expect(back).toBeInstanceOf(Date);
    // Same minute, to the minute the control's precision allows.
    expect(Math.abs(back.getTime() - Date.now())).toBeLessThan(60 * 1000);
  });

  it("refuses empty and unparseable input", () => {
    expect(parseLocalDateTimeInput("")).toBeNull();
    expect(parseLocalDateTimeInput(null)).toBeNull();
    expect(parseLocalDateTimeInput("not a date")).toBeNull();
  });
});

describe("formatUtcDateTime — the one place negotiation shows UTC on purpose", () => {
  it("tells the buyer what the server will store, under the control they typed in", () => {
    // Whatever zone the buyer is in, the hint must show the UTC fields of the
    // instant their local entry denotes — never the local fields relabelled
    // "UTC", which is what a `moment(x).utc()` on the wrong shape produced.
    const typed = parseLocalDateTimeInput("2026-08-13T12:30");
    const iso = typed.toISOString(); // 2026-08-13T07:00…Z in IST
    expect(formatUtcDateTime(typed)).toBe(
      `${iso.slice(8, 10)} Aug ${iso.slice(0, 4)}, ${iso.slice(11, 16)} UTC`
    );
    if (PROCESS_ZONE === "Asia/Calcutta" || PROCESS_ZONE === "Asia/Kolkata") {
      expect(formatUtcDateTime(typed)).toBe("13 Aug 2026, 07:00 UTC");
    }
  });

  it("is 07:00 UTC, not the doubly-wrong 01:30 the wizard hint used to compute", () => {
    // `moment(apiValue).utc()` on a naive UTC string read it as local FIRST
    // and then converted — 07:00 became 01:30 under IST. The hint is
    // wizard-only now, but the function itself must be correct on an instant
    // too. Zone-independent: both inputs denote the same instant everywhere.
    expect(formatUtcDateTime(NAIVE_UTC)).toBe("13 Aug 2026, 07:00 UTC");
    expect(formatUtcDateTime(AS_ISO_Z)).toBe("13 Aug 2026, 07:00 UTC");
    expect(formatUtcDateTime(AS_IST_OFFSET)).toBe("13 Aug 2026, 07:00 UTC");
  });

  it("falls back on junk", () => {
    expect(formatUtcDateTime(null)).toBe("—");
    expect(formatUtcDateTime("nope", "n/a")).toBe("n/a");
  });
});

describe("negotiationRelative", () => {
  const NOW = Date.parse(AS_ISO_Z);

  it("counts from the instant, not from the digits", () => {
    expect(negotiationRelative(NAIVE_UTC, NOW + 3 * 86400000)).toBe("3 days ago");
    expect(negotiationRelative(NAIVE_UTC, NOW - 3 * 86400000)).toBe("in 3 days");
  });

  it("picks a unit a human would use, and singularises", () => {
    expect(negotiationRelative(NAIVE_UTC, NOW - 30 * 60000)).toBe("in 30 minutes");
    expect(negotiationRelative(NAIVE_UTC, NOW - 4 * 3600000)).toBe("in 4 hours");
    expect(negotiationRelative(NAIVE_UTC, NOW - 86400000)).toBe("in 1 day");
  });

  it("returns null — not a string — when there is nothing to say", () => {
    // Callers render `rel && <span>{rel}</span>`; an em dash would render an
    // empty pill.
    expect(negotiationRelative(null)).toBeNull();
    expect(negotiationRelative("garbage")).toBeNull();
  });
});
