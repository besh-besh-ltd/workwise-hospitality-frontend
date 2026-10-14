import "@testing-library/jest-dom";
import {
  formatINR, formatQty, lineValue, errorCopy, ERROR_COPY,
  STATUS_LABEL, PROGRESS_LABEL, HEADER_PROGRESS_LABEL,
} from "./prFormat";

describe("formatINR", () => {
  test("Indian grouping, exact paise", () => {
    expect(formatINR("1250000.75")).toBe("₹12,50,000.75");
    expect(formatINR("100000")).toBe("₹1,00,000");
    expect(formatINR("100000.00")).toBe("₹1,00,000");
    expect(formatINR("0.5")).toBe("₹0.50");
    expect(formatINR(1250000.75)).toBe("₹12,50,000.75");
  });
  test("very large values stay exact (no float)", () => {
    expect(formatINR("125000000.75")).toBe("₹12,50,00,000.75");
    expect(formatINR("99999999999999.99")).toBe("₹9,99,99,99,99,99,999.99");
  });
  test("empty values", () => {
    expect(formatINR(null)).toBe("—");
    expect(formatINR(undefined)).toBe("—");
    expect(formatINR("")).toBe("—");
    expect(formatINR("abc")).toBe("—");
  });
});

describe("formatQty", () => {
  test("strips trailing zeros", () => {
    expect(formatQty("0.500")).toBe("0.5");
    expect(formatQty("12.000")).toBe("12");
    expect(formatQty("10")).toBe("10");
    expect(formatQty("100.250")).toBe("100.25");
    expect(formatQty(3)).toBe("3");
    expect(formatQty(null)).toBe("");
  });
});

describe("lineValue", () => {
  test("exact paise math with half-up rounding", () => {
    expect(lineValue("0.125", "8.00")).toBe("1.00");
    expect(lineValue("3", "33.33")).toBe("99.99");
    expect(lineValue("1250000.75", "1")).toBe("1250000.75");
    expect(lineValue("0.5", "1250000.75")).toBe("625000.38");
    expect(lineValue("0.001", "0.50")).toBe("0.00");
    expect(lineValue("0.005", "1")).toBe("0.01");
  });
  test("large values", () => {
    expect(lineValue("1000000000000", "99999999999999.99")).toBe("99999999999999990000000000.00");
  });
  test("incomplete input yields null", () => {
    expect(lineValue("", "1")).toBeNull();
    expect(lineValue("1", undefined)).toBeNull();
    expect(lineValue("x", "1")).toBeNull();
  });
});

describe("labels", () => {
  test("cover every enum value", () => {
    ["draft", "in_review", "pending_approval", "returned", "approved", "rejected", "cancelled"]
      .forEach((s) => expect(STATUS_LABEL[s]).toBeTruthy());
    ["pending", "in_pool", "needs_mapping", "awaiting_catalog", "in_sourcing", "ordered", "closed", "cancelled"]
      .forEach((s) => expect(PROGRESS_LABEL[s]).toBeTruthy());
    ["in_queue", "partly_in_sourcing", "in_sourcing", "partly_ordered", "ordered", "completed"]
      .forEach((s) => expect(HEADER_PROGRESS_LABEL[s]).toBeTruthy());
  });
});

describe("errorCopy", () => {
  test("maps PR codes", () => {
    expect(errorCopy({ response: { data: { code: "PR_NO_POLICY" } } })).toBe(ERROR_COPY.PR_NO_POLICY);
    expect(errorCopy({ response: { data: { code: "PR_STATE_CONFLICT", message: "x" } } })).toBe(ERROR_COPY.PR_STATE_CONFLICT);
  });
  test("reads a service-wrapped error and a bare {code}", () => {
    expect(errorCopy({ message: { response: { data: { code: "PR_UNIT_MISMATCH" } } } })).toBe(ERROR_COPY.PR_UNIT_MISMATCH);
    expect(errorCopy({ code: "PR_HOTEL_MISMATCH" })).toBe(ERROR_COPY.PR_HOTEL_MISMATCH);
  });
  test("generic endpoint {status:3, message} falls back to message", () => {
    expect(errorCopy({ response: { data: { status: 3, message: "Not allowed here" } } })).toBe("Not allowed here");
    expect(errorCopy({ status: 3, message: "Plain body" })).toBe("Plain body");
  });
  test("unknown code uses server message", () => {
    expect(errorCopy({ response: { data: { code: "PR_VALIDATION", message: "Title is required" } } })).toBe("Title is required");
  });
  test("network error and empty input give a safe string", () => {
    expect(errorCopy({ isAxiosError: true, message: "Network Error" })).toMatch(/network|connection/i);
    expect(typeof errorCopy(undefined)).toBe("string");
    expect(errorCopy(undefined).length).toBeGreaterThan(0);
  });
});
