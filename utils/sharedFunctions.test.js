import {
  handleNormalize,
  normalizeFlatQuotationData,
  calculateTotal,
} from "@/utils/sharedFunctions";

/**
 handleNormalize logic :
   a) for freight, and package prices, it calculates the average of all available values and fills in the missing ones.
  b) for tax, it calculates the median of all available values and fills in the missing ones.

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
});

//  test cases for normalizeFlatQuotationData
describe("normalizeFlatQuotationData", () => {
  // created by mukul 07-aug-2025
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

  // This test checks if the function correctly applies normalization based on payment terms.
  it("should correctly apply normalization based on payment terms", () => {
    const quoteItem = {
      unit_price: 100,
      freight_price: 10,
      package_price: 5,
      tax: 18,
      freight_mode: "percentage",
      package_mode: "percentage",
      tax_mode: "percentage",
      payment_terms: [
        { value: 10, label: "Advance" }, // 0% deduction
        { value: 20, label: "credit", days: "30" }, // 1% deduction
        { value: 70, label: "credit", days: "60" }, // 2% deduction
      ],
    };

    const quantity = 2;

    const result = calculateTotal(quoteItem, quantity, true); // normalizeFilter = true
    expect(result).toBe(267);
  });
});
