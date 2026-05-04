jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {},
}), { virtual: true });

jest.mock("@/services/rfq", () => ({
  handleUploadFile: jest.fn(),
  persistMagicSearchJob: jest.fn(),
}), { virtual: true });

import {
  checkBidExpired,
  parseIstWallTimeToEpoch,
  formatRemainingDuration,
} from "@/utils/sharedFunctions";

// Pricing math (calculateTotal / handleNormalize / normalizeFlatQuotationData)
// has been moved to the backend pricing engine. Their tests now live in
// workwise-hospitality-backend/tests/services/pricingEngine.test.js
// and tests/services/quoteCompareService.test.js.

describe("IST bid deadline helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("parses IST wall-clock datetimes consistently", () => {
    const epoch = parseIstWallTimeToEpoch("2026-04-09 11:00:00");
    expect(epoch).toBe(new Date("2026-04-09T05:30:00.000Z").getTime());
  });

  it("treats bid_end_date as locked until the IST deadline has passed", () => {
    jest.setSystemTime(new Date("2026-04-09T05:30:00.000Z")); // exactly 11:00 IST
    expect(checkBidExpired("2026-04-09 11:00:00")).toBe(false);

    jest.setSystemTime(new Date("2026-04-09T05:30:01.000Z"));
    expect(checkBidExpired("2026-04-09 11:00:00")).toBe(true);
  });

  it("formats remaining time in a compact readable form", () => {
    const remaining = (((1 * 24) + 2) * 60 + 15) * 60 * 1000;
    expect(formatRemainingDuration(remaining)).toBe("1d 2h 15m");
    expect(formatRemainingDuration(45 * 1000)).toBe("1m");
  });
});
