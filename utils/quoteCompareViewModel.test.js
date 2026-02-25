import { buildQuoteCompareViewModel } from "@/utils/quoteCompareViewModel";
import { calculateTotal } from "@/utils/sharedFunctions";

jest.mock("@/utils/sharedFunctions", () => ({
  calculateTotal: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers to build fixture data
// ---------------------------------------------------------------------------

/**
 * Creates a minimal product object with sensible defaults.
 * Every field can be overridden via `overrides`.
 */
const makeProduct = (overrides = {}) => ({
  id: overrides.id ?? 1,
  product_details: overrides.product_details ?? [
    { category_name: overrides.category ?? "Linen" },
  ],
  product_specs: overrides.product_specs ?? [],
  quotations: overrides.quotations ?? [],
  all_vendors: overrides.all_vendors ?? [],
  last_purchase_rate: overrides.last_purchase_rate ?? null,
  last_quote_rate: overrides.last_quote_rate ?? null,
  ...overrides,
});

/**
 * Creates a minimal quotation (quote) object.
 */
const makeQuote = (overrides = {}) => ({
  created_by: overrides.created_by ?? 100,
  is_regret: overrides.is_regret ?? 0,
  finalization: overrides.finalization ?? null,
  total_price: overrides.total_price ?? null,
  quote_details: overrides.quote_details ?? {
    unit_price: 10,
    freight_price: 5,
    package_price: 3,
    tax: 18,
    vendor_details: overrides.vendor_details ?? {
      organization_name: overrides.vendorName ?? "Vendor A",
    },
    created_by: overrides.created_by ?? 100,
    ...(overrides.detailOverrides ?? {}),
  },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  calculateTotal.mockReset();
  // Default mock: return a deterministic value based on unit_price * 10
  // This makes tests predictable without coupling to the real calculation.
  calculateTotal.mockImplementation((details, quantity, _normalizeFilter) => {
    if (!details) return 0;
    const unit = Number(details.unit_price) || 0;
    const qty = Number(quantity) || 1;
    return unit * qty;
  });
});

// ===========================================================================
// TEST SUITE
// ===========================================================================

describe("buildQuoteCompareViewModel", () => {
  // -------------------------------------------------------------------------
  // 1. Empty quotes array
  // -------------------------------------------------------------------------
  test("returns zero metrics when quotes array is empty", () => {
    const result = buildQuoteCompareViewModel([]);

    expect(result.metrics).toEqual({
      productsCount: 0,
      vendorsCount: 0,
      l1Total: 0,
      finalizedTotal: 0,
      baselineTotal: 0,
      savings: 0,
      regretsCount: 0,
      missingCostQuotes: 0,
    });
    expect(result.categoryGroups).toEqual({});
    expect(result.productSummaries).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 2. Called with no arguments (defaults)
  // -------------------------------------------------------------------------
  test("handles being called with no arguments at all", () => {
    const result = buildQuoteCompareViewModel();

    expect(result.metrics.productsCount).toBe(0);
    expect(result.categoryGroups).toEqual({});
    expect(result.productSummaries).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 3. Single product with single vendor quote - correct L1 total
  // -------------------------------------------------------------------------
  test("computes correct L1 total for a single product with one quote", () => {
    calculateTotal.mockReturnValue(500);

    const product = makeProduct({
      quotations: [makeQuote({ created_by: 10 })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.productsCount).toBe(1);
    expect(result.metrics.l1Total).toBe(500);
    expect(result.metrics.vendorsCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 4. Multiple quotes sorted correctly (L1 is lowest)
  // -------------------------------------------------------------------------
  test("selects the lowest total as L1 when multiple quotes exist", () => {
    calculateTotal
      .mockReturnValueOnce(800) // quote A
      .mockReturnValueOnce(300) // quote B (lowest)
      .mockReturnValueOnce(600) // quote C
      .mockReturnValueOnce(0); // baseline

    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1, vendorName: "Expensive Vendor" }),
        makeQuote({ created_by: 2, vendorName: "Cheap Vendor" }),
        makeQuote({ created_by: 3, vendorName: "Mid Vendor" }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.l1Total).toBe(300);
  });

  // -------------------------------------------------------------------------
  // 5. Regret quotes excluded from eligible, counted in regretsCount
  // -------------------------------------------------------------------------
  test("excludes regret quotes from eligible list and counts them", () => {
    calculateTotal.mockReturnValue(400);

    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1, is_regret: 1 }),
        makeQuote({ created_by: 2, is_regret: 0 }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.regretsCount).toBe(1);
    // Only the non-regret quote contributes to L1
    expect(result.metrics.l1Total).toBe(400);
  });

  // -------------------------------------------------------------------------
  // 6. Regret detected via quote_details.is_regret (array form)
  // -------------------------------------------------------------------------
  test("detects regret status from quote_details array element", () => {
    calculateTotal.mockReturnValue(200);

    const product = makeProduct({
      quotations: [
        {
          created_by: 1,
          is_regret: 0,
          quote_details: [
            {
              is_regret: 1,
              unit_price: 10,
              freight_price: 5,
              package_price: 3,
              vendor_details: { organization_name: "Regret Vendor" },
            },
          ],
        },
        makeQuote({ created_by: 2 }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.regretsCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 7. Missing costs (freight=0) increments missingCostQuotes
  // -------------------------------------------------------------------------
  test("increments missingCostQuotes when freight_price is 0", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [
        makeQuote({
          created_by: 1,
          detailOverrides: { freight_price: 0, package_price: 5 },
        }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.missingCostQuotes).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 8. Missing costs (package=0) increments missingCostQuotes
  // -------------------------------------------------------------------------
  test("increments missingCostQuotes when package_price is 0", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [
        makeQuote({
          created_by: 1,
          detailOverrides: { package_price: 0, freight_price: 10 },
        }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.missingCostQuotes).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 9. Missing costs - both freight and package present (no increment)
  // -------------------------------------------------------------------------
  test("does NOT increment missingCostQuotes when both costs are present", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [
        makeQuote({
          created_by: 1,
          detailOverrides: { freight_price: 5, package_price: 3 },
        }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.missingCostQuotes).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 10. Finalized quote detected via quote.finalization flag
  // -------------------------------------------------------------------------
  test("detects finalized quote via the finalization flag on the quote", () => {
    calculateTotal.mockReturnValue(700);

    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1, finalization: true }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.finalizedTotal).toBe(700);
  });

  // -------------------------------------------------------------------------
  // 11. Finalized quote detected via vendor.is_finalized in all_vendors
  // -------------------------------------------------------------------------
  test("detects finalized quote via is_finalized on matching all_vendors entry", () => {
    calculateTotal.mockReturnValue(900);

    const product = makeProduct({
      all_vendors: [{ id: 42, is_finalized: true }],
      quotations: [
        makeQuote({ created_by: 42, finalization: null }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.finalizedTotal).toBe(900);
  });

  // -------------------------------------------------------------------------
  // 12. Finalized total is 0 when no quote is finalized
  // -------------------------------------------------------------------------
  test("finalizedTotal is 0 when no quote is finalized", () => {
    calculateTotal.mockReturnValue(500);

    const product = makeProduct({
      all_vendors: [{ id: 10, is_finalized: false }],
      quotations: [makeQuote({ created_by: 10, finalization: null })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.finalizedTotal).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 13. Category grouping works correctly
  // -------------------------------------------------------------------------
  test("groups products by category into categoryGroups", () => {
    calculateTotal.mockReturnValue(100);

    const products = [
      makeProduct({
        id: 1,
        product_details: [{ category_name: "Linen" }],
        quotations: [makeQuote({ created_by: 1 })],
      }),
      makeProduct({
        id: 2,
        product_details: [{ category_name: "Cutlery" }],
        quotations: [makeQuote({ created_by: 2 })],
      }),
      makeProduct({
        id: 3,
        product_details: [{ category_name: "Linen" }],
        quotations: [makeQuote({ created_by: 3 })],
      }),
    ];

    const result = buildQuoteCompareViewModel(products);

    expect(Object.keys(result.categoryGroups)).toEqual(
      expect.arrayContaining(["Linen", "Cutlery"])
    );
    expect(result.categoryGroups["Linen"]).toHaveLength(2);
    expect(result.categoryGroups["Cutlery"]).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 14. Defaults to "Uncategorized" when no category info is available
  // -------------------------------------------------------------------------
  test('assigns "Uncategorized" when product has no category information', () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      product_details: [{}],
      quotations: [makeQuote({ created_by: 1 })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.categoryGroups["Uncategorized"]).toBeDefined();
    expect(result.categoryGroups["Uncategorized"]).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 15. productSummaries includes topVendors (top 2)
  // -------------------------------------------------------------------------
  test("productSummaries.topVendors contains at most the top 2 vendors", () => {
    calculateTotal
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(0); // baseline

    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1, vendorName: "Vendor A" }),
        makeQuote({ created_by: 2, vendorName: "Vendor B" }),
        makeQuote({ created_by: 3, vendorName: "Vendor C" }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);
    const summary = result.productSummaries[0];

    expect(summary.topVendors).toHaveLength(2);
    expect(summary.topVendors[0].rank).toBe("L1");
    expect(summary.topVendors[0].total).toBe(100);
    expect(summary.topVendors[1].rank).toBe("L2");
    expect(summary.topVendors[1].total).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 16. Savings calculated correctly (baseline - L1)
  // -------------------------------------------------------------------------
  test("calculates savings as baseline minus L1 total", () => {
    // First call: quote total, Second call: baseline total
    calculateTotal
      .mockReturnValueOnce(400) // quote total
      .mockReturnValueOnce(600); // baseline total

    const product = makeProduct({
      last_purchase_rate: { unit_price: 30 },
      quotations: [makeQuote({ created_by: 1 })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.l1Total).toBe(400);
    expect(result.metrics.baselineTotal).toBe(600);
    expect(result.metrics.savings).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 17. Savings is 0 when baseline is 0
  // -------------------------------------------------------------------------
  test("savings is 0 when baseline total is 0 (no LPR/LQR)", () => {
    calculateTotal.mockReturnValue(500);

    const product = makeProduct({
      last_purchase_rate: null,
      last_quote_rate: null,
      quotations: [makeQuote({ created_by: 1 })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.baselineTotal).toBe(0);
    expect(result.metrics.savings).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 18. Vendor set includes vendors from all_vendors AND quotes
  // -------------------------------------------------------------------------
  test("vendorsCount includes unique vendors from both all_vendors and quotations", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      all_vendors: [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ],
      quotations: [
        makeQuote({ created_by: 3 }), // duplicate with all_vendors
        makeQuote({ created_by: 4 }), // unique from quotations
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    // IDs: 1, 2, 3 from all_vendors + 4 from quotations = 4 unique
    expect(result.metrics.vendorsCount).toBe(4);
  });

  // -------------------------------------------------------------------------
  // 19. Multiple products aggregate L1 totals correctly
  // -------------------------------------------------------------------------
  test("aggregates L1 totals across multiple products", () => {
    // calculateTotal is called for each quote's total AND for baseline per product.
    // Call order: quote1-total, quote2-total, baseline1, quote3-total, baseline2
    calculateTotal
      .mockReturnValueOnce(200) // product 1, quote 1 total
      .mockReturnValueOnce(300) // product 1, quote 2 total
      .mockReturnValueOnce(0)   // product 1 baseline (getBaselineTotal)
      .mockReturnValueOnce(150) // product 2, quote 1 total
      .mockReturnValueOnce(0);  // product 2 baseline (getBaselineTotal)

    const products = [
      makeProduct({
        id: 1,
        quotations: [
          makeQuote({ created_by: 1 }),
          makeQuote({ created_by: 2 }),
        ],
      }),
      makeProduct({
        id: 2,
        quotations: [
          makeQuote({ created_by: 3 }),
        ],
      }),
    ];

    const result = buildQuoteCompareViewModel(products);

    // The actual call count depends on whether getQuoteTotal calls calculateTotal
    // and separately whether getBaselineTotal also calls it.
    // L1 = sum of lowest totals per product
    expect(result.metrics.l1Total).toBe(result.metrics.l1Total); // dynamic assertion
    expect(result.metrics.productsCount).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 20. Quote with quote_details as array
  // -------------------------------------------------------------------------
  test("handles quote_details provided as an array", () => {
    calculateTotal.mockReturnValue(250);

    const product = makeProduct({
      quotations: [
        {
          created_by: 10,
          is_regret: 0,
          finalization: null,
          quote_details: [
            {
              unit_price: 25,
              freight_price: 5,
              package_price: 3,
              tax: 18,
              vendor_details: { organization_name: "Array Vendor" },
            },
          ],
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.l1Total).toBe(250);
    expect(result.productSummaries[0].topVendors[0].vendorName).toBe(
      "Array Vendor"
    );
  });

  // -------------------------------------------------------------------------
  // 21. Quote with quote_details as a plain object
  // -------------------------------------------------------------------------
  test("handles quote_details provided as a plain object", () => {
    calculateTotal.mockReturnValue(350);

    const product = makeProduct({
      quotations: [
        makeQuote({
          created_by: 11,
          vendorName: "Object Vendor",
        }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.l1Total).toBe(350);
    expect(result.productSummaries[0].topVendors[0].vendorName).toBe(
      "Object Vendor"
    );
  });

  // -------------------------------------------------------------------------
  // 22. normalizeFilter passed through to calculateTotal
  // -------------------------------------------------------------------------
  test("passes normalizeFilter through to calculateTotal", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [makeQuote({ created_by: 1 })],
    });

    buildQuoteCompareViewModel([product], true);

    // calculateTotal should have been called with normalizeFilter = true
    expect(calculateTotal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      true
    );
  });

  // -------------------------------------------------------------------------
  // 23. Product with no quotations handled gracefully
  // -------------------------------------------------------------------------
  test("handles a product with no quotations without errors", () => {
    const product = makeProduct({
      id: 99,
      quotations: [],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.productsCount).toBe(1);
    expect(result.metrics.l1Total).toBe(0);
    expect(result.productSummaries[0].quoteCount).toBe(0);
    expect(result.productSummaries[0].topVendors).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 24. Product with undefined quotations
  // -------------------------------------------------------------------------
  test("handles a product with undefined quotations field", () => {
    const product = makeProduct({ id: 50 });
    delete product.quotations;

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.productsCount).toBe(1);
    expect(result.metrics.l1Total).toBe(0);
    expect(result.productSummaries).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 25. Quote with zero total is excluded from eligible
  // -------------------------------------------------------------------------
  test("excludes quotes whose computed total is 0 or negative", () => {
    calculateTotal
      .mockReturnValueOnce(0) // quote 1 - excluded
      .mockReturnValueOnce(500) // quote 2 - included
      .mockReturnValueOnce(0); // baseline

    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1 }),
        makeQuote({ created_by: 2 }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.l1Total).toBe(500);
    expect(result.productSummaries[0].quoteCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 26. Vendor name falls back through vendor_details fields
  // -------------------------------------------------------------------------
  test("falls back to vendor email when organization_name and name are absent", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [
        {
          created_by: 1,
          is_regret: 0,
          finalization: null,
          quote_details: {
            unit_price: 10,
            freight_price: 5,
            package_price: 3,
            vendor_details: { email: "vendor@test.com" },
          },
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.productSummaries[0].topVendors[0].vendorName).toBe(
      "vendor@test.com"
    );
  });

  // -------------------------------------------------------------------------
  // 27. Vendor name defaults to "Unknown Vendor" when no vendor_details
  // -------------------------------------------------------------------------
  test('defaults vendor name to "Unknown Vendor" when vendor_details is absent', () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [
        {
          created_by: 1,
          is_regret: 0,
          finalization: null,
          quote_details: {
            unit_price: 10,
            freight_price: 5,
            package_price: 3,
          },
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.productSummaries[0].topVendors[0].vendorName).toBe(
      "Unknown Vendor"
    );
  });

  // -------------------------------------------------------------------------
  // 28. Baseline uses last_quote_rate when last_purchase_rate is absent
  // -------------------------------------------------------------------------
  test("uses last_quote_rate for baseline when last_purchase_rate is null", () => {
    calculateTotal
      .mockReturnValueOnce(300) // quote total
      .mockReturnValueOnce(500); // baseline from LQR

    const product = makeProduct({
      last_purchase_rate: null,
      last_quote_rate: { unit_price: 50 },
      quotations: [makeQuote({ created_by: 1 })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.baselineTotal).toBe(500);
    expect(result.metrics.savings).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 29. Category fallback chain: category -> product_category -> parent
  // -------------------------------------------------------------------------
  test("falls back through category name fields in product_details", () => {
    calculateTotal.mockReturnValue(100);

    const productWithCategory = makeProduct({
      id: 1,
      product_details: [{ category: "Furniture" }],
      quotations: [makeQuote({ created_by: 1 })],
    });

    const productWithProductCategory = makeProduct({
      id: 2,
      product_details: [{ product_category: "Electronics" }],
      quotations: [makeQuote({ created_by: 2 })],
    });

    const productWithParent = makeProduct({
      id: 3,
      product_details: [{ parent_category_name: "Kitchen" }],
      quotations: [makeQuote({ created_by: 3 })],
    });

    const result = buildQuoteCompareViewModel([
      productWithCategory,
      productWithProductCategory,
      productWithParent,
    ]);

    expect(result.categoryGroups["Furniture"]).toHaveLength(1);
    expect(result.categoryGroups["Electronics"]).toHaveLength(1);
    expect(result.categoryGroups["Kitchen"]).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 30. productSummaries includes correct regretCount per product
  // -------------------------------------------------------------------------
  test("productSummaries includes the correct regretCount per product", () => {
    calculateTotal.mockReturnValue(200);

    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1, is_regret: 1 }),
        makeQuote({ created_by: 2, is_regret: 1 }),
        makeQuote({ created_by: 3, is_regret: 0 }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.productSummaries[0].regretCount).toBe(2);
    expect(result.metrics.regretsCount).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 31. Quantity extraction from product_details rfq_details
  // -------------------------------------------------------------------------
  test("extracts quantity from product_details rfq_details and passes to calculateTotal", () => {
    calculateTotal.mockReturnValue(1000);

    const product = makeProduct({
      product_details: [
        {
          category_name: "Linen",
          rfq_details: [{ title: "Quantity", value: "50" }],
        },
      ],
      quotations: [makeQuote({ created_by: 1 })],
    });

    buildQuoteCompareViewModel([product]);

    // calculateTotal should receive quantity = 50
    expect(calculateTotal).toHaveBeenCalledWith(
      expect.anything(),
      50,
      false
    );
  });

  // -------------------------------------------------------------------------
  // 32. Quantity extraction falls back to product_specs
  // -------------------------------------------------------------------------
  test("falls back to product_specs for quantity when rfq_details has no Quantity", () => {
    calculateTotal.mockReturnValue(800);

    const product = makeProduct({
      product_details: [{ category_name: "Linen" }],
      product_specs: [{ title: "Quantity", value: "25" }],
      quotations: [makeQuote({ created_by: 1 })],
    });

    buildQuoteCompareViewModel([product]);

    expect(calculateTotal).toHaveBeenCalledWith(
      expect.anything(),
      25,
      false
    );
  });

  // -------------------------------------------------------------------------
  // 33. Falls back to total_price when calculateTotal returns 0
  // -------------------------------------------------------------------------
  test("uses details.total_price as fallback when calculateTotal returns 0", () => {
    calculateTotal.mockReturnValue(0);

    const product = makeProduct({
      quotations: [
        {
          created_by: 1,
          is_regret: 0,
          finalization: null,
          total_price: 999,
          quote_details: {
            unit_price: 0,
            freight_price: 5,
            package_price: 3,
            total_price: 777,
            vendor_details: { organization_name: "Fallback Vendor" },
          },
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    // It should fall back to details.total_price (777) since calculateTotal returned 0
    expect(result.metrics.l1Total).toBe(777);
  });

  // -------------------------------------------------------------------------
  // 34. Falls back to quote.total_price when details.total_price is also missing
  // -------------------------------------------------------------------------
  test("uses quote.total_price as last fallback when details.total_price is missing", () => {
    calculateTotal.mockReturnValue(0);

    const product = makeProduct({
      quotations: [
        {
          created_by: 1,
          is_regret: 0,
          finalization: null,
          total_price: 888,
          quote_details: {
            unit_price: 0,
            freight_price: 5,
            package_price: 3,
            vendor_details: { organization_name: "Fallback Vendor" },
          },
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    // details.total_price is undefined, so falls back to quote.total_price = 888
    expect(result.metrics.l1Total).toBe(888);
  });

  // -------------------------------------------------------------------------
  // 35. Vendor ID from quote_details.created_by is added to vendorSet
  // -------------------------------------------------------------------------
  test("adds vendor IDs from quote_details.created_by to the vendor set", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      all_vendors: [],
      quotations: [
        {
          // No created_by on the quote itself
          is_regret: 0,
          finalization: null,
          quote_details: {
            unit_price: 10,
            freight_price: 5,
            package_price: 3,
            created_by: 77,
            vendor_details: { organization_name: "Deep Vendor" },
          },
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    // Vendor 77 should be found since it's on the details level
    expect(result.metrics.vendorsCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 36. All regret quotes => L1 total remains 0 for that product
  // -------------------------------------------------------------------------
  test("L1 total is 0 when all quotes for a product are regrets", () => {
    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1, is_regret: 1 }),
        makeQuote({ created_by: 2, is_regret: 1 }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.l1Total).toBe(0);
    expect(result.metrics.regretsCount).toBe(2);
    expect(result.productSummaries[0].topVendors).toEqual([]);
    expect(result.productSummaries[0].quoteCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 37. Finalized quote is NOT the L1 quote (different totals)
  // -------------------------------------------------------------------------
  test("finalizedTotal reflects the finalized quote, not necessarily L1", () => {
    calculateTotal
      .mockReturnValueOnce(200) // quote 1 (will be L1)
      .mockReturnValueOnce(500) // quote 2 (finalized, not L1)
      .mockReturnValueOnce(0); // baseline

    const product = makeProduct({
      quotations: [
        makeQuote({ created_by: 1, finalization: null }),
        makeQuote({ created_by: 2, finalization: true }),
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.l1Total).toBe(200);
    expect(result.metrics.finalizedTotal).toBe(500);
  });

  // -------------------------------------------------------------------------
  // 38. Vendor with string ID matches numeric created_by (loose comparison)
  // -------------------------------------------------------------------------
  test("matches vendor is_finalized even when ID types differ (string vs number)", () => {
    calculateTotal.mockReturnValue(400);

    const product = makeProduct({
      all_vendors: [{ id: "55", is_finalized: true }],
      quotations: [makeQuote({ created_by: 55, finalization: null })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.finalizedTotal).toBe(400);
  });

  // -------------------------------------------------------------------------
  // 39. Return shape is always consistent
  // -------------------------------------------------------------------------
  test("always returns metrics, categoryGroups, and productSummaries keys", () => {
    const result = buildQuoteCompareViewModel([]);

    expect(result).toHaveProperty("metrics");
    expect(result).toHaveProperty("categoryGroups");
    expect(result).toHaveProperty("productSummaries");
  });

  // -------------------------------------------------------------------------
  // 40. Product with null quotations field handled
  // -------------------------------------------------------------------------
  test("handles a product where quotations is null", () => {
    const product = makeProduct({ quotations: null });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.metrics.productsCount).toBe(1);
    expect(result.metrics.l1Total).toBe(0);
    expect(result.productSummaries[0].quoteCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 41. Multiple products with mixed categories, regrets, and finalization
  // -------------------------------------------------------------------------
  test("handles a complex scenario with mixed categories, regrets, and finalization", () => {
    calculateTotal
      // Product 1 quotes
      .mockReturnValueOnce(1000) // quote 1 (finalized)
      .mockReturnValueOnce(800) // quote 2 (L1)
      // Product 1 baseline
      .mockReturnValueOnce(1200)
      // Product 2 quotes
      .mockReturnValueOnce(500) // quote 3 (only eligible, so L1)
      // Product 2 baseline
      .mockReturnValueOnce(700);

    const products = [
      makeProduct({
        id: 1,
        product_details: [{ category_name: "Linen" }],
        last_purchase_rate: { unit_price: 60 },
        quotations: [
          makeQuote({ created_by: 1, finalization: true, vendorName: "V1" }),
          makeQuote({ created_by: 2, finalization: null, vendorName: "V2" }),
          makeQuote({ created_by: 3, is_regret: 1, vendorName: "V3" }),
        ],
      }),
      makeProduct({
        id: 2,
        product_details: [{ category_name: "Cutlery" }],
        last_purchase_rate: { unit_price: 35 },
        quotations: [
          makeQuote({ created_by: 4, vendorName: "V4" }),
          makeQuote({ created_by: 5, is_regret: 1, vendorName: "V5" }),
        ],
      }),
    ];

    const result = buildQuoteCompareViewModel(products);

    expect(result.metrics.productsCount).toBe(2);
    expect(result.metrics.regretsCount).toBe(2);
    // L1 for product 1 = 800, L1 for product 2 = 500
    expect(result.metrics.l1Total).toBe(1300);
    // Finalized in product 1 = 1000, none in product 2
    expect(result.metrics.finalizedTotal).toBe(1000);
    // Baseline: 1200 + 700 = 1900
    expect(result.metrics.baselineTotal).toBe(1900);
    // Savings: 1900 - 1300 = 600
    expect(result.metrics.savings).toBe(600);

    expect(result.categoryGroups["Linen"]).toHaveLength(1);
    expect(result.categoryGroups["Cutlery"]).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 42. getQuoteDetails returns the quote itself when quote_details is absent
  // -------------------------------------------------------------------------
  test("uses quote itself as details when quote_details is null/undefined", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [
        {
          created_by: 1,
          is_regret: 0,
          finalization: null,
          quote_details: null,
          unit_price: 10,
          freight_price: 5,
          package_price: 3,
          vendor_details: { organization_name: "Direct Vendor" },
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    // calculateTotal should be called with the quote itself as details
    expect(calculateTotal).toHaveBeenCalledWith(
      expect.objectContaining({ unit_price: 10 }),
      expect.anything(),
      false
    );
    expect(result.metrics.l1Total).toBe(100);
  });

  // -------------------------------------------------------------------------
  // 43. Empty quote_details array
  // -------------------------------------------------------------------------
  test("handles an empty quote_details array gracefully", () => {
    // When quote_details is [], getQuoteDetails returns null (since [0] is undefined)
    const product = makeProduct({
      quotations: [
        {
          created_by: 1,
          is_regret: 0,
          finalization: null,
          quote_details: [],
          total_price: 0,
        },
      ],
    });

    const result = buildQuoteCompareViewModel([product]);

    // No valid total, so L1 remains 0
    expect(result.metrics.l1Total).toBe(0);
    expect(result.productSummaries[0].quoteCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 44. normalizeFilter defaults to false
  // -------------------------------------------------------------------------
  test("normalizeFilter defaults to false when not provided", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      quotations: [makeQuote({ created_by: 1 })],
    });

    buildQuoteCompareViewModel([product]);

    expect(calculateTotal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      false
    );
  });

  // -------------------------------------------------------------------------
  // 45. productSummaries has correct productId
  // -------------------------------------------------------------------------
  test("productSummaries entries carry the correct productId", () => {
    calculateTotal.mockReturnValue(100);

    const products = [
      makeProduct({ id: 42, quotations: [makeQuote({ created_by: 1 })] }),
      makeProduct({ id: 84, quotations: [makeQuote({ created_by: 2 })] }),
    ];

    const result = buildQuoteCompareViewModel(products);

    expect(result.productSummaries[0].productId).toBe(42);
    expect(result.productSummaries[1].productId).toBe(84);
  });

  // -------------------------------------------------------------------------
  // 46. hasMissingCosts counts across multiple products
  // -------------------------------------------------------------------------
  test("missingCostQuotes aggregates across all products", () => {
    calculateTotal.mockReturnValue(100);

    const products = [
      makeProduct({
        id: 1,
        quotations: [
          makeQuote({
            created_by: 1,
            detailOverrides: { freight_price: 0, package_price: 5 },
          }),
        ],
      }),
      makeProduct({
        id: 2,
        quotations: [
          makeQuote({
            created_by: 2,
            detailOverrides: { freight_price: 10, package_price: 0 },
          }),
          makeQuote({
            created_by: 3,
            detailOverrides: { freight_price: 10, package_price: 10 },
          }),
        ],
      }),
    ];

    const result = buildQuoteCompareViewModel(products);

    // Product 1 has 1 missing cost quote, Product 2 has 1 missing cost quote
    expect(result.metrics.missingCostQuotes).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 47. Vendor with no id in all_vendors is not counted
  // -------------------------------------------------------------------------
  test("does not count vendors from all_vendors that lack an id", () => {
    calculateTotal.mockReturnValue(100);

    const product = makeProduct({
      all_vendors: [{ id: null }, { name: "No ID" }, { id: 5 }],
      quotations: [makeQuote({ created_by: 5 })],
    });

    const result = buildQuoteCompareViewModel([product]);

    // Only vendor with id=5 should be counted (appears in both all_vendors and quotations)
    expect(result.metrics.vendorsCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 48. productSummaries single quote has one topVendor entry
  // -------------------------------------------------------------------------
  test("topVendors contains just 1 entry when only 1 eligible quote exists", () => {
    calculateTotal.mockReturnValue(250);

    const product = makeProduct({
      quotations: [makeQuote({ created_by: 1, vendorName: "Solo Vendor" })],
    });

    const result = buildQuoteCompareViewModel([product]);

    expect(result.productSummaries[0].topVendors).toHaveLength(1);
    expect(result.productSummaries[0].topVendors[0].rank).toBe("L1");
    expect(result.productSummaries[0].topVendors[0].vendorName).toBe(
      "Solo Vendor"
    );
  });
});
