jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {},
}), { virtual: true });

jest.mock("@/services/rfq", () => ({
  handleUploadFile: jest.fn(),
  persistMagicSearchJob: jest.fn(),
}), { virtual: true });

import {
  handleNormalize,
  normalizeFlatQuotationData,
  calculateTotal,
  checkBidExpired,
  parseIstWallTimeToEpoch,
  formatRemainingDuration,
} from "@/utils/sharedFunctions";

/**
 * ------------------------------------------------------------------
 * TEST SUITE: handleNormalize
 * Description: Normalizes nested quotation data by:
 *   - Converting absolute to percentage values
 *   - Replacing empty or 0 freight/package with average
 *   - Replacing empty or 0 tax with median
 * ------------------------------------------------------------------
 */
describe("handleNormalize", () => {
  // created by mukul 07-aug-2025
  it("should normalize missing freight/package/tax with average/median values", () => {
    const input = [
      {
        quotations: [
          {
            quote_details: [
              { freight_price: "10", package_price: "20", tax: "5" },
              { freight_price: "", package_price: "", tax: "" },
            ],
          },
        ],
      },
    ];

    const result = handleNormalize(input);

    expect(result[0].quotations[0].quote_details[1].freight_price).toBe(10);
    expect(result[0].quotations[0].quote_details[1].package_price).toBe(20);
    expect(result[0].quotations[0].quote_details[1].tax).toBe(5);
  });
 
    it("should convert absolute to percentage before normalizing", () => {
    const input = [
      {
        rfq_details: [{ title: "Quantity", value: 10 }],
        all_vendors: [{ id: 1, payment_terms: [] }],
        quotations: [
          {
            created_by: 1,
            quote_details: [
              {
                unit_price: 100,
                quantity: 10,
                freight_price: 100,
                freight_mode: "absolute",
                package_price: 200,
                package_mode: "absolute",
                tax: 50,
                tax_mode: "absolute",
              },
              {
                unit_price: 100,
                quantity: 10,
                freight_price: "",
                freight_mode: "percentage",
                package_price: "",
                package_mode: "percentage",
                tax: "",
                tax_mode: "percentage",
              },
            ],
          },
        ],
      },
    ];

    const result = handleNormalize(input);
    const converted = result[0].quotations[0].quote_details[0];
    const normalized = result[0].quotations[0].quote_details[1];

    // 1000 is base = 100 * 10
    // freight = 100 → 10%
    // package = 200 → 20%
    // tax = 50 → 5% of base

    expect(converted.freight_price).toBe(10);
    expect(converted.package_price).toBe(20);
    expect(converted.tax).toBe(5);

    // Now second one should be normalized using avg/median
    expect(normalized.freight_price).toBe(10);
    expect(normalized.package_price).toBe(20);
    expect(normalized.tax).toBe(5);
  });


    it("should ensure all modes are set to 'percentage' after normalization", () => {
    const input = [
      {
        rfq_details: [{ title: "Quantity", value: 5 }],
        quotations: [
          {
            created_by: 1,
            quote_details: [
              {
                unit_price: 100,
                quantity: 5,
                freight_price: 250,
                freight_mode: "absolute",
                package_price: 100,
                package_mode: "absolute",
                tax: 50,
                tax_mode: "absolute",
              },
            ],
          },
        ],
      },
    ];

    const result = handleNormalize(input);
    const detail = result[0].quotations[0].quote_details[0];

    expect(detail.freight_mode).toBe("percentage");
    expect(detail.package_mode).toBe("percentage");
    expect(detail.tax_mode).toBe("percentage");
  });
  
});



/**
 * ------------------------------------------------------------------
 * TEST SUITE: normalizeFlatQuotationData
 * Description: Same logic as handleNormalize, but works with
 *   - Flat quote structure
 *   - No nested quote_details
 * ------------------------------------------------------------------
 */
describe("normalizeFlatQuotationData", () => {
  // ✅ created by mukul 07-aug-2025
  it("should normalize missing freight/package/tax with average/median values", () => {
    const input = [
      {
        quotations: [
          { freight_price: "10", package_price: "20", tax: "5" },
          { freight_price: "", package_price: "", tax: "" },
        ],
      },
    ];

    const result = normalizeFlatQuotationData(input);

    expect(result[0].quotations[1].freight_price).toBe(10);
    expect(result[0].quotations[1].package_price).toBe(20);
    expect(result[0].quotations[1].tax).toBe(5);
  });

  // ✅ created by mukul 13-aug-2025
  it("should convert absolute values to percentage before normalizing", () => {
    const input = [
      {
        quotations: [
          {
            unit_price: 100,
            quantity: 10,
            freight_price: 100,
            freight_mode: "absolute",
            package_price: 200,
            package_mode: "absolute",
            tax: 50,
            tax_mode: "absolute",
          },
          {
            unit_price: 100,
            quantity: 10,
            freight_price: "",
            freight_mode: "percentage",
            package_price: "",
            package_mode: "percentage",
            tax: "",
            tax_mode: "percentage",
          },
        ],
      },
    ];

    const result = normalizeFlatQuotationData(input);
    const converted = result[0].quotations[0]; // absolute → percentage
    const normalized = result[0].quotations[1]; // uses avg/median

    // 100 * 10 = 1000 base
    // freight 100 → 10%
    // package 200 → 20%
    // tax 50 → 5%

    expect(converted.freight_price).toBe(10);
    expect(converted.package_price).toBe(20);
    expect(converted.tax).toBe(5);

    expect(normalized.freight_price).toBe(10);
    expect(normalized.package_price).toBe(20);
    expect(normalized.tax).toBe(5);
  });

  // ✅ created by mukul 13-aug-2025
  it("should ensure all modes are set to 'percentage' after normalization", () => {
    const input = [
      {
        quotations: [
          {
            unit_price: 50,
            quantity: 5,
            freight_price: 25,
            freight_mode: "absolute",
            package_price: 25,
            package_mode: "absolute",
            tax: 25,
            tax_mode: "absolute",
          },
        ],
      },
    ];

    const result = normalizeFlatQuotationData(input);
    const q = result[0].quotations[0];

    expect(q.freight_mode).toBe("percentage");
    expect(q.package_mode).toBe("percentage");
    expect(q.tax_mode).toBe("percentage");
  });
});



/**
    Calculation_steps:
     base = 100 * 2 = 200, qty * base price
     freight = 200 * 10% = 20, freight price is 10% of base
     packaging = 200 * 5% = 10, package price is 5% of base
     subtotal = 200 + 20 + 10 = 230
     tax = 230 * 18% = 41.4
     total = 230 + 41.4 = 271.4 => Math.round = 271
     */
describe("calculateTotal", () => {
  // Calculates total including % freight, % packaging, and % tax – Computes total price by adding percentage-based freight and packaging to the base, then applying percentage-based tax.
  // created by mukul 07-aug-2025
  it("should correctly calculate total price including freight, packaging, and tax", () => {
    const quoteItem = {
      unit_price: 100,
      freight_price: 10, // 10% of base
      package_price: 5, // 5% of base
      tax: 18, // 18% on total_with_fpt
      freight_mode: "percentage",
      package_mode: "percentage",
      tax_mode: "percentage",
    };

    const quantity = 2;

    const result = calculateTotal(quoteItem, quantity);
    expect(result).toBe(271);
  });

  // Calculates total without freight, packaging, and tax – Confirms that total equals unit_price × quantity when all extras are zero.
    // created by mukul 07-aug-2025
  it("should correctly calculate total price without freight, packaging, and tax", () => {
    const quoteItem = {
      unit_price: 10,
      freight_price: 0, // 10% of base
      package_price: 0, // 5% of base
      tax: 0, // 18% on total_with_fpt
      freight_mode: "percentage",
      package_mode: "percentage",
      tax_mode: "percentage",
    };

    const quantity = 5;

    const result = calculateTotal(quoteItem, quantity);
    expect(result).toBe(50);
  });

  // Calculates total with payment term deductions (percentage mode) – Applies deductions based on payment term days to a total that includes % freight, % packaging, and % tax.
  // created by mukul 13-aug-2025
  it("should correctly apply normalization based on payment terms", () => {
    const quoteItem = {
      unit_price: 1000,
      freight_price: 10,
      package_price: 20,
      tax: 10,
      freight_mode: "percentage",
      package_mode: "percentage",
      tax_mode: "percentage",
      payment_terms: [
        { value: 10, type: "advance" }, // 0% deduction
        { value: 20, type: "credit", days: "30" }, // 1% deduction
        { value: 70, type: "credit", days: "60" }, // 2% deduction
      ],
    };

    const quantity = 1;

    const result = calculateTotal(quoteItem, quantity, true); // normalizeFilter = true
    expect(result).toBe(1407);
  });

  // should correctly apply normalization based on payment terms without freight, tax, packaging Tests that payment term deductions are still applied correctly even when freight, packaging, and tax are zero.
  // created by mukul 13-aug-2025
   it("should correctly apply normalization based on payment terms without freight, tax, packging", () => {
    const quoteItem = {
      unit_price: 10,
      freight_price: 0,
      package_price: 0,
      tax: 0,
      freight_mode: "percentage",
      package_mode: "percentage",
      tax_mode: "percentage",
      payment_terms: [
        { value: 12, type: "advance" }, // 0% deduction
        { value: 10, type: "credit", days: "30" }, // 1% deduction
        { value: 77, type: "other", days: "60" }, // 2% deduction
      ],
    };

    const quantity = 5;

    const result = calculateTotal(quoteItem, quantity, true); // normalizeFilter = true
    expect(result).toBe(50);
  });

  // Verifies normalization when payment terms cover less than 100%, Scenario: 25% credit @ 30 days (1% discount) + 75% without discount
  // created by mukul 13-aug-2025
   it("applies partial payment-term normalization and adds leftover without discount", () => {
    const quoteItem = {
      unit_price: 1000,
      freight_price: 8,
      package_price: 0,
      tax: 0,
      freight_mode: "percentage",
      package_mode: "percentage",
      tax_mode: "percentage",
      payment_terms: [
        { value: 25, type: "credit", days: "30" }, // 1% deduction
      ],
    };

    const quantity = 5;

    const result = calculateTotal(quoteItem, quantity, true); // normalizeFilter = true
    expect(result).toBe(5387);
  });

});

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
