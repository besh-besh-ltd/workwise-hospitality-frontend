jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {},
}), { virtual: true });

import {
  fyStartYearOf,
  fyLabel,
  currentFy,
  fyToRange,
  fyOptions,
  currentFyRange,
  defaultFyState,
  FY_START_YEAR,
} from "@/utils/financialYear";

describe("financialYear helpers", () => {
  describe("fyStartYearOf", () => {
    it("returns the current year for dates in Apr–Dec", () => {
      expect(fyStartYearOf(new Date("2026-06-24"))).toBe(2026);
    });
    it("returns the previous year for dates in Jan–Mar", () => {
      expect(fyStartYearOf(new Date("2026-03-31"))).toBe(2025);
    });
    it("returns the current year for 1 Apr exactly (start of new FY)", () => {
      expect(fyStartYearOf(new Date("2026-04-01"))).toBe(2026);
    });
    it("handles January (month 0 → previous year)", () => {
      expect(fyStartYearOf(new Date("2025-01-15"))).toBe(2024);
    });
  });

  describe("fyLabel", () => {
    it("labels 2026 as 2026-27", () => {
      expect(fyLabel(2026)).toBe("2026-27");
    });
    it("zero-pads the two-digit year portion", () => {
      expect(fyLabel(2009)).toBe("2009-10");
    });
    it("wraps century correctly (e.g. 1999 → 1999-00)", () => {
      expect(fyLabel(1999)).toBe("1999-00");
    });
  });

  describe("currentFy", () => {
    it("returns 2026-27 for a date in June 2026", () => {
      expect(currentFy(new Date("2026-06-24"))).toBe("2026-27");
    });
    it("returns 2025-26 for a date in March 2026", () => {
      expect(currentFy(new Date("2026-03-31"))).toBe("2025-26");
    });
  });

  describe("fyToRange", () => {
    it("converts a label string to from/to dates", () => {
      expect(fyToRange("2026-27")).toEqual({ from: "2026-04-01", to: "2027-03-31" });
    });
    it("converts a numeric start year to from/to dates", () => {
      expect(fyToRange(2026)).toEqual({ from: "2026-04-01", to: "2027-03-31" });
    });
    it("returns empty strings for garbage input", () => {
      expect(fyToRange("garbage")).toEqual({ from: "", to: "" });
    });
    it("returns empty strings for non-finite input", () => {
      expect(fyToRange(NaN)).toEqual({ from: "", to: "" });
    });
  });

  describe("fyOptions", () => {
    const opts = fyOptions(new Date("2026-06-24"));
    it("returns newest FY first", () => {
      expect(opts[0].value).toBe("2026-27");
    });
    it("returns FY_START_YEAR as the last option", () => {
      expect(opts[opts.length - 1].value).toBe(`${FY_START_YEAR}-${String(FY_START_YEAR + 1).slice(-2).padStart(2, "0")}`);
    });
    it("returns 4 options from 2023-24 to 2026-27", () => {
      expect(opts.length).toBe(4);
    });
    it("each option has value, label, startYear shape", () => {
      opts.forEach((o) => {
        expect(typeof o.value).toBe("string");
        expect(o.label.startsWith("FY ")).toBe(true);
        expect(typeof o.startYear).toBe("number");
      });
    });
  });

  describe("currentFyRange (default applied window)", () => {
    it("returns the current FY's from/to range", () => {
      expect(currentFyRange(new Date("2026-06-24"))).toEqual({ from: "2026-04-01", to: "2027-03-31" });
    });
    it("uses the previous FY for a Jan–Mar date", () => {
      expect(currentFyRange(new Date("2026-03-31"))).toEqual({ from: "2025-04-01", to: "2026-03-31" });
    });
  });

  describe("defaultFyState (default selection)", () => {
    it("pre-selects the current financial year in fy mode", () => {
      expect(defaultFyState(new Date("2026-06-24"))).toEqual({ mode: "fy", fy: "2026-27", from: "", to: "" });
    });
    it("uses the previous FY for a Jan–Mar date", () => {
      expect(defaultFyState(new Date("2026-02-10"))).toEqual({ mode: "fy", fy: "2025-26", from: "", to: "" });
    });
  });
});
