// All money math now comes from the backend engine via the
// GET /rfq/quote-compare/:id endpoint. This module reads engine output
// from the API response — it does no arithmetic of its own.

const parseNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const isRegretQuote = (quote) => {
  if (!quote) return false;
  const details = Array.isArray(quote.quote_details)
    ? quote.quote_details[0]
    : quote.quote_details;

  return (
    quote.is_regret == 1 ||
    quote?.quote_details?.is_regret == 1 ||
    details?.is_regret == 1
  );
};

const getQuoteDetails = (quote) => {
  if (!quote) return null;
  if (Array.isArray(quote.quote_details)) return quote.quote_details[0] || null;
  if (quote.quote_details && typeof quote.quote_details === "object") {
    return quote.quote_details;
  }
  return quote;
};

const getQuantity = (product, details) => {
  const fromProductDetails = parseNumber(
    product?.product_details?.[0]?.rfq_details?.find((spec) => spec.title === "Quantity")?.value
  );
  if (fromProductDetails > 0) return fromProductDetails;

  const fromSpecs = parseNumber(
    product?.product_specs?.find((spec) => spec.title === "Quantity")?.value
  );
  if (fromSpecs > 0) return fromSpecs;

  const fromDetailSpecs = parseNumber(
    details?.rfq_details?.find((spec) => spec.title === "Quantity")?.value
  );
  if (fromDetailSpecs > 0) return fromDetailSpecs;

  const fromDetails = parseNumber(details?.quantity);
  if (fromDetails > 0) return fromDetails;

  return 0;
};

// `normalizeFilter` is preserved in the signature for back-compat but unused —
// the API response already reflects normalisation when the caller hit the
// endpoint with normalize=1.
const getQuoteTotal = (product, quote, _normalizeFilter) => {
  const details = getQuoteDetails(quote);
  if (!details) return 0;
  const fromEngine = parseNumber(details.engine?.total ?? quote?.engine_total);
  if (fromEngine > 0) return fromEngine;
  return parseNumber(details.total_price || quote?.total_price);
};

const hasMissingCosts = (quote) => {
  const details = getQuoteDetails(quote);
  if (!details) return false;

  const freightPrice = parseNumber(details.freight_price);
  const packagePrice = parseNumber(details.package_price);
  return freightPrice === 0 || packagePrice === 0;
};

const isFinalizedQuote = (product, quote) => {
  if (!quote) return false;
  if (quote.finalization) return true;

  const details = getQuoteDetails(quote);
  const vendorId = quote.created_by || details?.created_by;
  if (!vendorId) return false;

  const vendor = (product?.all_vendors || []).find(
    (item) => String(item.id) === String(vendorId)
  );

  return !!vendor?.is_finalized;
};

// Server pre-computes baseline_total from last_purchase_rate / last_quote_rate.
const getBaselineTotal = (product) =>
  parseNumber(product?.aggregates?.baseline_total);

const getProductCategory = (product) => {
  const details = product?.product_details?.[0] || {};
  return (
    details.category_name ||
    details.category ||
    details.product_category ||
    details.parent_category_name ||
    "Uncategorized"
  );
};

export const buildQuoteCompareViewModel = (quotes = [], normalizeFilter = false) => {
  const vendorSet = new Set();
  let l1Total = 0;
  let finalizedTotal = 0;
  let baselineTotal = 0;
  let regretsCount = 0;
  let missingCostQuotes = 0;

  const categories = {};
  const productSummaries = [];

  quotes.forEach((product) => {
    const productQuotes = Array.isArray(product?.quotations) ? product.quotations : [];
    const eligibleQuotes = [];

    (product?.all_vendors || []).forEach((vendor) => {
      if (vendor?.id) vendorSet.add(String(vendor.id));
    });

    productQuotes.forEach((quote) => {
      const details = getQuoteDetails(quote);
      const vendorId = quote?.created_by || details?.created_by;
      if (vendorId) vendorSet.add(String(vendorId));

      const isRegret = isRegretQuote(quote);
      if (isRegret) {
        regretsCount += 1;
        return;
      }

      const total = getQuoteTotal(product, quote, normalizeFilter);
      if (total <= 0) return;

      if (hasMissingCosts(quote)) missingCostQuotes += 1;

      eligibleQuotes.push({
        quote,
        total,
        vendorName:
          details?.vendor_details?.organization_name ||
          details?.vendor_details?.name ||
          details?.vendor_details?.email ||
          "Unknown Vendor",
      });
    });

    eligibleQuotes.sort((a, b) => a.total - b.total);

    if (eligibleQuotes.length > 0) {
      l1Total += eligibleQuotes[0].total;
    }

    const finalizedQuote = eligibleQuotes.find((entry) => isFinalizedQuote(product, entry.quote));
    if (finalizedQuote) {
      finalizedTotal += finalizedQuote.total;
    }

    baselineTotal += getBaselineTotal(product);

    const category = getProductCategory(product);
    if (!categories[category]) categories[category] = [];
    categories[category].push(product);

    productSummaries.push({
      productId: product.id,
      topVendors: eligibleQuotes.slice(0, 2).map((entry, index) => ({
        rank: `L${index + 1}`,
        vendorName: entry.vendorName,
        total: entry.total,
      })),
      quoteCount: eligibleQuotes.length,
      regretCount: productQuotes.filter((quote) => isRegretQuote(quote)).length,
    });
  });

  const savings = baselineTotal > 0 ? baselineTotal - l1Total : 0;

  return {
    metrics: {
      productsCount: quotes.length,
      vendorsCount: vendorSet.size,
      l1Total,
      finalizedTotal,
      baselineTotal,
      savings,
      regretsCount,
      missingCostQuotes,
    },
    categoryGroups: categories,
    productSummaries,
  };
};

export default buildQuoteCompareViewModel;
