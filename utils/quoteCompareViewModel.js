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
//
// Prefers `engine_grand_total` (line subtotal + quote-level global charges
// like TCS) so KPI strip metrics — l1Total, finalizedTotal, savings —
// stay consistent with the per-vendor totals shown in every comparison
// matrix and the Vendor Quote Breakup modal. Falls back to engine line
// total, then persisted total_price for legacy responses.
const getQuoteTotal = (product, quote, _normalizeFilter) => {
  const details = getQuoteDetails(quote);
  if (!details) return 0;
  const fromGrand = parseNumber(details.engine_grand_total ?? quote?.engine_grand_total);
  if (fromGrand > 0) return fromGrand;
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

export const buildQuoteCompareViewModel = (quotes = [], normalizeFilter = false, vendorRejections = []) => {
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

  // Approval-progress counters. Derived per-product from QC payload + the
  // PO-rejection list passed in by the page. The four states are mutually
  // exclusive — a product belongs to exactly one bucket so the counts add up
  // to productsCount and the progress bar renders cleanly.
  //
  //   finalized        any vendor in `all_vendors` has is_finalized === true,
  //                    OR any quotation has a finalization record.
  //   po_rejected      product appears in `vendorRejections` (covers both
  //                    PO-rejected-by-vendor and PO-rejected-by-internal-
  //                    approver — backend already ships both via this list).
  //   neg_rejected     vendor-finalization (NEGOTIATION_QUOTE) instance is
  //                    REJECTED or CANCELLED — buyer needs to pick again.
  //   approved         finalized AND (no approval instance OR instance is
  //                    APPROVED).
  //   pending          finalized AND approval instance is PENDING.
  //   remaining        none of the above — vendor not yet picked.
  const isProductFinalized = (p) => {
    if (!p) return false;
    if (Array.isArray(p.all_vendors) && p.all_vendors.some((v) => v && v.is_finalized === true)) {
      return true;
    }
    if (Array.isArray(p.quotations) && p.quotations.some((q) => q && q.finalization != null)) {
      return true;
    }
    return false;
  };
  const productHasPoRejection = (p) => {
    if (!p || !Array.isArray(vendorRejections) || vendorRejections.length === 0) return false;
    return vendorRejections.some((r) =>
      String(r.product_variant_id) === String(p.product_variant_id)
      && String(r.variant) === String(p.variant)
    );
  };
  const productHasNegotiationRejection = (p) => {
    const status = p?.quote_approval_status?.approval_instance?.status;
    return status === 'REJECTED' || status === 'CANCELLED';
  };
  const isProductRejected = (p) => productHasPoRejection(p) || productHasNegotiationRejection(p);
  const isProductApproved = (p) => {
    if (isProductRejected(p)) return false;
    if (!isProductFinalized(p)) return false;
    const status = p?.quote_approval_status?.approval_instance?.status;
    if (!status) return true; // no approval needed
    return status === 'APPROVED';
  };
  const isProductPending = (p) => {
    if (isProductRejected(p)) return false;
    if (!isProductFinalized(p)) return false;
    const status = p?.quote_approval_status?.approval_instance?.status;
    return status === 'PENDING';
  };
  const finalizedProducts = quotes.filter(isProductFinalized).length;
  const approvedProducts = quotes.filter(isProductApproved).length;
  const pendingProducts = quotes.filter(isProductPending).length;
  const rejectedProducts = quotes.filter(isProductRejected).length;

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
      finalizedProducts,
      approvedProducts,
      pendingProducts,
      rejectedProducts,
    },
    categoryGroups: categories,
    productSummaries,
  };
};

export default buildQuoteCompareViewModel;
