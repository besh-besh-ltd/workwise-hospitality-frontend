// P0 REGRESSION — negotiationHelpers must not reference an unimported identifier.
//
// THE OUTAGE. Creating a negotiation round crashed the whole page the moment a
// complete end date was entered: "Something went wrong", ReferenceError:
// parseLocalDateTimeInput is not defined, thrown from CreateRoundPage's tree.
//
// `toUtcEndDate` here was rewritten to call `parseLocalDateTimeInput`, and the
// import was never added. It went unnoticed because:
//
//   * `toUtcEndDate` is only reached once `formData.end_date` is TRUTHY
//     (useCreateRoundState's `endDateUtc` memo short-circuits on empty), so the
//     wizard renders perfectly until the user finishes typing the date — the
//     last action before submitting;
//   * no unit test called `toUtcEndDate`;
//   * the timestamp guard test bans bare `moment(`/`new Date(`, which this
//     change *satisfied* — it was clean by that measure while being broken;
//   * and the repo has NO ESLint config, so `no-undef` — which catches this in
//     one second — never ran.
//
// The last point is the real lesson: this class is invisible to every check we
// had. This test is the cheap stand-in until lint exists.

import * as helpers from "./negotiationHelpers";

describe("negotiationHelpers — every identifier it uses is actually defined", () => {
  it("toUtcEndDate converts a local wall clock without throwing", () => {
    // The exact call the wizard makes when the end-date field is completed.
    // Pre-fix this threw ReferenceError and took the page down.
    expect(() => helpers.toUtcEndDate("2026-08-25T15:30")).not.toThrow();
  });

  it("toUtcEndDate reads the input as LOCAL, not UTC", () => {
    // 15:30 IST is 10:00 UTC. Reading the string as UTC would store 15:30 and
    // push the vendor's deadline 5h30m late — the bug this helper exists to
    // prevent, so the conversion is asserted, not just the absence of a throw.
    const iso = helpers.toUtcEndDate("2026-08-25T15:30");
    expect(new Date(iso).getTime()).toBe(new Date("2026-08-25T15:30").getTime());
  });

  it("returns null for empty or unparseable input rather than throwing", () => {
    expect(helpers.toUtcEndDate("")).toBeNull();
    expect(helpers.toUtcEndDate(null)).toBeNull();
    expect(helpers.toUtcEndDate("not-a-date")).toBeNull();
  });
});
