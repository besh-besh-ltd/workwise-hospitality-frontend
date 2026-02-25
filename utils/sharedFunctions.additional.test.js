import {
  formatToINRShort,
  textCapitalize,
  formatRFQNumber,
  getEntityLabel,
  getFuturedate,
  formatPrice,
  checkBidExpired,
  extractfileName,
} from "@/utils/sharedFunctions";

/**
 * Mock dependencies that sharedFunctions.js imports at the module level.
 * Even though the functions under test do not call these, the import
 * statements must resolve without error in the test environment.
 */
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  handleUploadFile: jest.fn(),
  persistMagicSearchJob: jest.fn(),
}));

// React hooks are used by the default export (useDebounce).
// They are not exercised in these tests but must be importable.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.fn((init) => [init, jest.fn()]),
  useEffect: jest.fn(),
}));

// ---------------------------------------------------------------
// formatToINRShort
// ---------------------------------------------------------------
describe("formatToINRShort", () => {
  it("formats values >= 10,000,000 as Cr (crore)", () => {
    expect(formatToINRShort(10000000)).toBe("1Cr");
    expect(formatToINRShort(50000000)).toBe("5Cr");
  });

  it("formats fractional crore values with one decimal", () => {
    expect(formatToINRShort(15000000)).toBe("1.5Cr");
    expect(formatToINRShort(32000000)).toBe("3.2Cr");
  });

  it("formats values >= 100,000 as L (lakh)", () => {
    expect(formatToINRShort(100000)).toBe("1L");
    expect(formatToINRShort(500000)).toBe("5L");
  });

  it("formats fractional lakh values with one decimal", () => {
    expect(formatToINRShort(150000)).toBe("1.5L");
    expect(formatToINRShort(320000)).toBe("3.2L");
  });

  it("formats values >= 1,000 as K (thousand)", () => {
    expect(formatToINRShort(1000)).toBe("1K");
    expect(formatToINRShort(9000)).toBe("9K");
  });

  it("formats fractional thousand values with one decimal", () => {
    expect(formatToINRShort(1500)).toBe("1.5K");
    expect(formatToINRShort(3200)).toBe("3.2K");
  });

  it("returns the amount as a string for values below 1,000", () => {
    expect(formatToINRShort(999)).toBe("999");
    expect(formatToINRShort(0)).toBe("0");
    expect(formatToINRShort(50)).toBe("50");
  });
});

// ---------------------------------------------------------------
// textCapitalize
// ---------------------------------------------------------------
describe("textCapitalize", () => {
  it("capitalizes a single word", () => {
    expect(textCapitalize("hello")).toBe("Hello");
  });

  it("splits on hyphens, capitalizes each word, and joins with spaces", () => {
    expect(textCapitalize("foo-bar")).toBe("Foo Bar");
    expect(textCapitalize("one-two-three")).toBe("One Two Three");
  });

  it("returns the original value when input is falsy", () => {
    expect(textCapitalize("")).toBe("");
    expect(textCapitalize(null)).toBe(null);
    expect(textCapitalize(undefined)).toBe(undefined);
  });
});

// ---------------------------------------------------------------
// formatRFQNumber
// ---------------------------------------------------------------
describe("formatRFQNumber", () => {
  it("formats as RFQ when is_tender is false/0", () => {
    expect(formatRFQNumber(123, false)).toBe("RFQ #123");
    expect(formatRFQNumber(456, 0)).toBe("RFQ #456");
  });

  it("formats as Tender when is_tender is true/1", () => {
    expect(formatRFQNumber(789, true)).toBe("Tender #789");
    expect(formatRFQNumber(100, 1)).toBe("Tender #100");
  });

  it("returns empty string when rfq_no is falsy", () => {
    expect(formatRFQNumber(null, true)).toBe("");
    expect(formatRFQNumber(undefined, false)).toBe("");
    expect(formatRFQNumber(0, true)).toBe("");
  });
});

// ---------------------------------------------------------------
// getEntityLabel
// ---------------------------------------------------------------
describe("getEntityLabel", () => {
  it("returns 'RFQ' for non-tender, singular", () => {
    expect(getEntityLabel(false)).toBe("RFQ");
    expect(getEntityLabel(0)).toBe("RFQ");
  });

  it("returns 'RFQs' for non-tender, plural", () => {
    expect(getEntityLabel(false, true)).toBe("RFQs");
    expect(getEntityLabel(0, true)).toBe("RFQs");
  });

  it("returns 'Tender' for tender, singular", () => {
    expect(getEntityLabel(true)).toBe("Tender");
    expect(getEntityLabel(1)).toBe("Tender");
  });

  it("returns 'Tenders' for tender, plural", () => {
    expect(getEntityLabel(true, true)).toBe("Tenders");
    expect(getEntityLabel(1, true)).toBe("Tenders");
  });
});

// ---------------------------------------------------------------
// getFuturedate
// ---------------------------------------------------------------
describe("getFuturedate", () => {
  let realDate;

  beforeEach(() => {
    // Override Date so that new Date() returns a fixed point in time.
    // We construct the anchor from local components to avoid UTC/local
    // timezone drift that can cause off-by-one issues with toISOString().
    realDate = global.Date;
    const FIXED_NOW = new realDate(2026, 1, 25, 12, 0, 0); // Feb 25, 2026 noon local

    class MockDate extends realDate {
      constructor(...args) {
        if (args.length === 0) {
          super(FIXED_NOW.getTime());
        } else {
          super(...args);
        }
      }
    }
    MockDate.now = () => FIXED_NOW.getTime();
    global.Date = MockDate;
  });

  afterEach(() => {
    global.Date = realDate;
  });

  it("returns a date 30 days in the future by default", () => {
    // 30 days from Feb 25, 2026 = Mar 27, 2026
    expect(getFuturedate()).toBe("2026-03-27");
  });

  it("returns a date N days in the future when days is specified", () => {
    expect(getFuturedate(7)).toBe("2026-03-04");
    expect(getFuturedate(1)).toBe("2026-02-26");
  });

  it("returns today when 0 is passed", () => {
    expect(getFuturedate(0)).toBe("2026-02-25");
  });
});

// ---------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------
describe("formatPrice", () => {
  it("formats a number as INR currency with two decimal places", () => {
    const result = formatPrice(1000);
    // Intl.NumberFormat en-IN uses the rupee sign
    expect(result).toContain("1,000.00");
  });

  it("formats zero correctly", () => {
    const result = formatPrice(0);
    expect(result).toContain("0.00");
  });

  it("formats decimal values correctly", () => {
    const result = formatPrice(99.5);
    expect(result).toContain("99.50");
  });
});

// ---------------------------------------------------------------
// checkBidExpired
// ---------------------------------------------------------------
describe("checkBidExpired", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-25T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns true when current date is after the bid end date", () => {
    expect(checkBidExpired("2026-02-20")).toBe(true);
    expect(checkBidExpired("2025-12-31")).toBe(true);
  });

  it("returns false when current date is before the bid end date", () => {
    expect(checkBidExpired("2026-03-01")).toBe(false);
    expect(checkBidExpired("2027-01-01")).toBe(false);
  });

  it("returns false when bid_end_date is falsy", () => {
    expect(checkBidExpired(null)).toBe(false);
    expect(checkBidExpired(undefined)).toBe(false);
    expect(checkBidExpired("")).toBe(false);
  });
});

// ---------------------------------------------------------------
// extractfileName
// ---------------------------------------------------------------
describe("extractfileName", () => {
  it("extracts the last segment after the final slash", () => {
    expect(extractfileName("https://cdn.example.com/uploads/2026/doc.pdf")).toBe("doc.pdf");
    expect(extractfileName("/files/images/photo.png")).toBe("photo.png");
  });

  it("returns the string itself when there are no slashes", () => {
    expect(extractfileName("report.xlsx")).toBe("report.xlsx");
  });

  it("returns undefined for falsy input (optional chaining)", () => {
    expect(extractfileName(null)).toBeUndefined();
    expect(extractfileName(undefined)).toBeUndefined();
  });
});
