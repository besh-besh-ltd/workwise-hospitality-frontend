// All money math is now sourced from the backend engine. The API response
// (GET /rfq/quote-compare/:id) attaches `engine` to each quote_details row
// and `comparison` + `aggregates` to each product. This module is now a
// thin selector layer — it shapes the engine output into rows/columns the
// matrices render, but does no arithmetic of its own.

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const normalized = String(value).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  const num = normalized ? Number(normalized[0]) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const pick = (...values) => values.find((value) => value !== undefined && value !== null);

const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

export const getQuoteDetails = (quote) => {
  if (!quote) return null;
  const details =
    Array.isArray(quote.quote_details)
      ? quote.quote_details[0] || null
      : quote.quote_details && typeof quote.quote_details === "object"
      ? quote.quote_details
      : null;

  return details ? { ...quote, ...details } : quote;
};

export const getVendorId = (quote) => {
  const details = getQuoteDetails(quote);
  return pick(
    quote?.created_by,
    quote?.quote_details?.created_by,
    details?.created_by,
    quote?.vendor_id,
    details?.vendor_id
  );
};

export const getVendorDetails = (quote, product = null) => {
  const details = getQuoteDetails(quote);
  const fromQuote = pick(
    quote?.vendor_details,
    quote?.quote_details?.vendor_details,
    details?.vendor_details
  );

  const normalized = Array.isArray(fromQuote) ? fromQuote[0] : fromQuote;
  if (normalized) return normalized;

  const vendorId = getVendorId(quote);
  if (!vendorId || !product?.all_vendors) return null;

  return (
    product.all_vendors.find((vendor) => String(vendor.id) === String(vendorId)) ||
    null
  );
};

export const getVendorName = (quote, product = null) => {
  const vendor = getVendorDetails(quote, product) || {};
  return vendor.organization_name || vendor.name || vendor.email || "Unknown Vendor";
};

export const isRegretQuote = (quote) => {
  const details = getQuoteDetails(quote);
  return quote?.is_regret == 1 || quote?.quote_details?.is_regret == 1 || details?.is_regret == 1;
};

export const getQuantityFromProduct = (product, details = null) => {
  const quantity = pick(
    product?.product_details?.[0]?.rfq_details?.find((spec) => spec.title === "Quantity")?.value,
    product?.product_specs?.find((spec) => spec.title === "Quantity")?.value,
    details?.rfq_details?.find((spec) => spec.title === "Quantity")?.value,
    details?.quantity,
    product?.quantity
  );

  return toNumber(quantity);
};

export const getSpecValue = (product, key) => {
  return pick(
    product?.product_specs?.find((spec) => spec.title === key)?.value,
    product?.product_details?.[0]?.rfq_details?.find((spec) => spec.title === key)?.value,
    ""
  );
};

export const getQuotePrice = (quote) => {
  const details = getQuoteDetails(quote);
  return toNumber(pick(quote?.unit_price, details?.unit_price));
};

// `normalizeFilter` is accepted for back-compat but unused — the API already
// reflects normalisation when the caller passed normalize=1.
//
// Prefers `engine_grand_total` (per-line subtotal + quote-level global charges
// like TCS), so every comparison view — per-product matrix, category-wise
// matrix, overall cost matrix, vendor totals, L1/finalized totals — stays
// consistent and matches the per-vendor row header on the negotiation modal
// and the Vendor Quote Breakup modal. Falls back to the engine line total
// (no globals) and finally to the persisted total_price for legacy responses.
export const getQuoteTotal = (product, quote, _normalizeFilter = false) => {
  const details = getQuoteDetails(quote) || {};
  const fromGrand = toNumber(details.engine_grand_total ?? quote?.engine_grand_total);
  if (fromGrand > 0) return fromGrand;
  const fromEngine = toNumber(details.engine?.total ?? quote?.engine_total);
  if (fromEngine > 0) return fromEngine;
  return toNumber(pick(details.total_price, quote?.total_price));
};

export const getMissingCostParts = () => {
  return [];
};

export const getPaymentTermsText = (quote) => {
  const details = getQuoteDetails(quote) || {};
  const globalDetail = pick(details?.global_payment_term?.[0]?.details, details?.global_payment_term, "");
  const terms = Array.isArray(details?.payment_terms) ? details.payment_terms : [];

  const termText = terms
    .map((term) => {
      const label = term.comment
        ? term.comment
        : `${term.type || ""}${term.days ? ` ${term.days} days` : ""}`.trim();
      const pct = term.value != null ? ` (${term.value}%)` : "";
      return `${label}${pct}`.trim();
    })
    .filter(Boolean)
    .join(", ");

  return [globalDetail, termText].filter(Boolean).join("\n") || "--";
};

export const getPreviousQuote = (quote) => {
  const previous = Array.isArray(quote?.previous_quotes) ? quote.previous_quotes : [];
  return previous.length > 0 ? previous[0] : null;
};

export const sortProductQuotes = (product, quotations = [], normalizeFilter = false) => {
  if (!Array.isArray(quotations)) return [];

  return [...quotations].sort((a, b) => {
    const aRegret = isRegretQuote(a);
    const bRegret = isRegretQuote(b);

    if (aRegret && !bRegret) return 1;
    if (!aRegret && bRegret) return -1;

    const aPrice = getQuotePrice(a);
    const bPrice = getQuotePrice(b);

    if (aPrice > 0 && bPrice <= 0) return -1;
    if (aPrice <= 0 && bPrice > 0) return 1;
    if (aPrice <= 0 && bPrice <= 0) return 0;

    const aTotal = getQuoteTotal(product, a, normalizeFilter);
    const bTotal = getQuoteTotal(product, b, normalizeFilter);

    if (aTotal !== bTotal) return aTotal - bTotal;

    const aTime = new Date(pick(a?.timestamp, a?.quote_details?.timestamp, "1970-01-01")).getTime();
    const bTime = new Date(pick(b?.timestamp, b?.quote_details?.timestamp, "1970-01-01")).getTime();
    return aTime - bTime;
  });
};

// Pull the engine-computed subtotal for a named charge on this line. Falls
// back to 0 if the charge isn't present in the engine breakdown — never
// recomputes locally.
const getChargeEffectiveValue = (details = {}, chargeType = "freight", _quantity = 1) => {
  const charges = details.engine?.charges || [];

  if (chargeType === "gst") {
    return toNumber(details.engine?.base_tax);
  }

  // Match by canonical name. "freight" / "packaging" map to "Freight" /
  // "Packaging" entries the engine produced (either explicit other_charges
  // or synthesised from legacy flat fields by quoteCompareService).
  const wantedName = chargeType === "freight"
    ? "freight"
    : chargeType === "packaging"
    ? "packaging"
    : String(chargeType).toLowerCase();

  const match = charges.find((c) => (c.name || "").toLowerCase() === wantedName);
  return toNumber(match?.subtotal);
};

// Collect unique charge names across all quotations
export const collectChargeNames = (columns) => {
  const otherChargeNames = new Set();
  const globalChargeNames = new Set();
  columns.forEach(col => {
    const otherCharges = col.details?.other_charges || [];
    otherCharges.forEach(c => { if (c.name) otherChargeNames.add(c.name); });
    const globalCharges = col.details?.global_charges || col.quote?.global_charges || [];
    globalCharges.forEach(c => { if (c.name) globalChargeNames.add(c.name); });
  });
  return { otherChargeNames: [...otherChargeNames], globalChargeNames: [...globalChargeNames] };
};

// Selector: pulls the server-computed comparison bands for this product.
// `metricKeys` filters which metrics to return (basePrice/subtotal/gst/total/delivery).
const buildRowComparativeStats = (product, metricKeys = []) => {
  const apiBands = product?.comparison?.bands || {};
  const stats = {};
  metricKeys.forEach((metricKey) => {
    const fromApi = apiBands[metricKey];
    stats[metricKey] = fromApi || { min: 0, max: 0, bands: {}, normalizedScores: {} };
  });
  return stats;
};

// Selector: server already tie-tolerance-flagged the freight-advantage vendors.
const getFreightAdvantageVendorIds = (product) =>
  product?.comparison?.freight_advantage_vendor_ids || [];

const getRiskFlagsByVendor = (columns = []) => {
  const flags = {};

  columns.forEach((column) => {
    flags[column.vendorId] = {
      missingCost: column.missingParts.length > 0,
      regret: !!column.isRegret,
      noPrice: toNumber(column.price) <= 0,
      incomplete: column.missingParts.length > 0 || column.isRegret || toNumber(column.price) <= 0,
    };
  });

  return flags;
};

export const buildProductComparisonModel = ({
  product,
  quotations,
  originalQuotations,
  normalizeFilter = false,
  freightFilter = false,
  negotiationRoundQuotes = [],
  activeRound = null,
  quoteApprovalStatus = null,
  is_tender = false,
}) => {
  const sorted = sortProductQuotes(product, quotations, normalizeFilter);
  let pricedRank = 0;

  const selectedQuoteIds = quoteApprovalStatus?.metadata?.selected_quotes?.map((entry) => entry.quote_id) || [];
  const approvalStatus = quoteApprovalStatus?.approval_instance?.status;

  const columns = sorted.map((quote) => {
    const details = getQuoteDetails(quote) || {};
    const vendorId = getVendorId(quote);
    const isRegret = isRegretQuote(quote);
    const price = getQuotePrice(quote);
    const total = getQuoteTotal(product, quote, normalizeFilter);
    const original = (originalQuotations || []).find(
      (entry) => String(entry.quote_id) === String(quote.quote_id)
    );

    const roundQuote = Array.isArray(negotiationRoundQuotes)
      ? negotiationRoundQuotes.find(
          (entry) =>
            String(entry.vendor_id) === String(vendorId) &&
            String(entry.rfq_product_id) === String(product?.id)
        )
      : null;

    const isQuoteSelectedForApproval = selectedQuoteIds.includes(quote?.quote_id);
    const isArcSelected =
      is_tender &&
      quoteApprovalStatus?.metadata?.selected_quotes?.some(
        (entry) => String(entry.vendor_id) === String(vendorId)
      ) &&
      approvalStatus === "APPROVED";

    let rank = "--";
    if (!isRegret && price > 0) {
      pricedRank += 1;
      rank = `L${pricedRank}`;
    }

    return {
      quote,
      details,
      vendorId,
      vendorName: getVendorName(quote, product),
      isRegret,
      price,
      total,
      quantity: getQuantityFromProduct(product, details),
      rank,
      previous: getPreviousQuote(quote),
      missingParts: getMissingCostParts(original || quote, freightFilter),
      roundQuote,
      activeRound,
      isQuoteSelectedForApproval,
      approvalStatus,
      isArcSelected,
      isFinalized:
        !!quote?.finalization ||
        !!product?.all_vendors?.find(
          (vendor) => String(vendor.id) === String(vendorId) && vendor.is_finalized
        ),
      isLowest: !!quote?.is_lowest,
      delivery: pick(details.delivery_period, quote?.delivery_period, ""),
      comment: details.comment || quote?.comment || quote?.global_comment || "",
      documentFiles: pick(details.document_files, quote?.document_files, []),
      termsFiles: pick(details.global_document_files, quote?.global_document_files, []),
      paymentTermsText: getPaymentTermsText({ ...quote, ...details }),
      targetPrice: pick(
        quote?.quote_details?.latest_target_price,
        details?.latest_target_price,
        ""
      ),
      titleText: isQuoteSelectedForApproval
        ? `Quote ${
            approvalStatus === "PENDING"
              ? "pending approval"
              : approvalStatus === "APPROVED"
              ? "approved"
              : "rejected"
          }`
        : roundQuote
        ? `This quote was submitted for Round ${activeRound?.round_number || ""}`
        : "",
    };
  });

  const eligible = columns.filter((column) => !column.isRegret && column.price > 0);
  const lowestQuote = eligible.length > 0 ? eligible[0].quote : null;

  const { otherChargeNames, globalChargeNames } = collectChargeNames(columns);

  const metricKeys = [
    "basePrice",
    "subtotal",
    "gst",
    "total",
    "delivery",
  ];

  const rowComparativeStats = buildRowComparativeStats(product, metricKeys);
  const freightAdvantageVendorIds = getFreightAdvantageVendorIds(product);
  const riskFlags = getRiskFlagsByVendor(columns);

  return {
    product,
    columns,
    lowestQuote,
    rowComparativeStats,
    freightAdvantageVendorIds,
    riskFlags,
    otherChargeNames,
    globalChargeNames,
  };
};

export const getCategoryLabel = (product) => {
  return pick(
    product?.product_details?.[0]?.category_name,
    product?.product_details?.[0]?.category,
    product?.product_details?.[0]?.product_category,
    "Uncategorized"
  );
};

const buildVendorTotals = (products, vendor, normalizeFilter = false) => {
  const totals = { total: 0, base: 0, freight: 0, packaging: 0, tax: 0 };
  const deliveryDays = [];

  products.forEach((product) => {
    const quote = (product.quotations || []).find(
      (entry) =>
        String(entry.created_by) === String(vendor.id) &&
        entry.id != null &&
        !isRegretQuote(entry)
    );

    if (!quote) return;

    const details = getQuoteDetails(quote) || {};
    const quantity = getQuantityFromProduct(product, details) || 1;

    totals.total += getQuoteTotal(product, quote, normalizeFilter);
    totals.base += toNumber(details.unit_price) * quantity;
    totals.freight += getChargeEffectiveValue(details, "freight", quantity);
    totals.packaging += getChargeEffectiveValue(details, "packaging", quantity);
    totals.tax += getChargeEffectiveValue(details, "gst", quantity);

    const delivery = toNumber(details.delivery_period);
    if (delivery > 0) deliveryDays.push(delivery);
  });

  return { totals, deliveryDays };
};

const buildCategoryGroups = (products) => {
  const grouped = {};
  products.forEach((product) => {
    const category = getCategoryLabel(product);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(product);
  });
  return grouped;
};

export const buildCategoryComparisonModel = (
  products = [],
  originalProducts = [],
  normalizeFilter = false,
  freightFilter = false
) => {
  const first = products[0] || {};
  const vendors = Array.isArray(first.all_vendors) ? [...first.all_vendors] : [];

  const vendorsWithTotals = vendors.map((vendor) => {
    const { totals, deliveryDays } = buildVendorTotals(products, vendor, normalizeFilter);

    // global_comment is quote-level (one per vendor per RFQ); pull it off any
    // of this vendor's submitted quotes so the Category "Comments" footer row
    // can render it without depending on all_vendors carrying the field.
    let globalComment = "";
    let lineComment = "";
    for (const product of products) {
      const quote = (product.quotations || []).find(
        (q) => String(q.created_by) === String(vendor.id)
      );
      if (!quote) continue;
      if (!globalComment && quote.global_comment) globalComment = quote.global_comment;
      if (!lineComment && quote.comment) lineComment = quote.comment;
      if (globalComment) break;
    }

    return {
      ...vendor,
      ...totals,
      deliveryDays,
      displayName: vendor.organization_name || vendor.name || vendor.email || "Unknown Vendor",
      global_comment: globalComment,
      comment: lineComment,
    };
  });

  const sortedVendors = vendorsWithTotals
    .filter((v) => v.total > 0)
    .sort((a, b) => a.total - b.total);

  const grouped = buildCategoryGroups(products);

  let l1Total = 0;
  let finalizedTotal = 0;

  const rows = products.map((product) => {
    const quantity = getSpecValue(product, "Quantity");
    const unit = getSpecValue(product, "Unit");
    const productName = pick(
      product?.product_details?.[0]?.name,
      product?.product_details?.[0]?.product_name,
      "-"
    );
    const size = getSpecValue(product, "Size");
    const spec = getSpecValue(product, "Spec");

    const vendorCells = sortedVendors.map((vendor, index) => {
      const quote = (product.quotations || []).find(
        (entry) => String(entry.created_by) === String(vendor.id)
      );
      const details = getQuoteDetails(quote) || {};
      const originalProduct = originalProducts.find(
        (entry) =>
          String(entry.product_variant_id) === String(product.product_variant_id) &&
          String(entry.variant) === String(product.variant)
      );
      const originalQuote = originalProduct?.quotations?.find(
        (entry) => String(entry.created_by) === String(vendor.id)
      );

      const isRegret = quote ? isRegretQuote(quote) : false;
      const total = quote && !isRegret ? getQuoteTotal(product, quote, normalizeFilter) : 0;
      const missingParts = quote && !isRegret ? getMissingCostParts(originalQuote || quote, freightFilter) : [];

      return {
        vendor,
        quote,
        details,
        isRegret,
        total,
        missingParts,
        rank: `L${index + 1}`,
        isFinalized: !!product?.all_vendors?.find(
          (entry) => String(entry.id) === String(vendor.id) && entry.is_finalized
        ),
      };
    });

    const eligible = vendorCells
      .filter((cell) => cell.quote && !cell.isRegret && cell.total > 0)
      .sort((a, b) => a.total - b.total);

    if (eligible[0]) l1Total += eligible[0].total;

    const finalizedCell = vendorCells.find((cell) => cell.isFinalized && cell.total > 0);
    if (finalizedCell) finalizedTotal += finalizedCell.total;

    const rowComparativeStats = {
      total: buildRowComparativeStats(product, ["total"]).total,
    };

    return {
      product,
      category: getCategoryLabel(product),
      productName,
      spec,
      size,
      quantity,
      unit,
      sellingPrice: toNumber(getSpecValue(product, "total_price")),
      targetPrice: toNumber(product.latest_target_price),
      lastPurchaseRate: product.last_purchase_rate,
      lastQuoteRate: product.last_quote_rate,
      vendorCells,
      rowComparativeStats,
    };
  });

  return {
    vendors: sortedVendors,
    categoryGroups: grouped,
    rows,
    l1Total,
    finalizedTotal,
  };
};

export const buildOverallCostModel = (
  products = [],
  originalProducts = [],
  normalizeFilter = false,
  freightFilter = false
) => {
  let maxRanks = 0;
  let incompleteCount = 0;
  let regretOnlyProducts = 0;
  let finalizedTotal = 0;

  const rows = products.map((product, rowIndex) => {
    const productName = pick(
      product?.product_details?.[0]?.name,
      product?.product_details?.[0]?.product_name,
      "-"
    );
    const size = getSpecValue(product, "Size");
    const spec = getSpecValue(product, "Spec");
    const quantity = getSpecValue(product, "Quantity");
    const unit = getSpecValue(product, "Unit");

    const allQuotes = Array.isArray(product.quotations) ? product.quotations : [];

    const eligible = allQuotes
      .filter((quote) => quote.id != null && !isRegretQuote(quote))
      .map((quote) => {
        const details = getQuoteDetails(quote) || {};
        const total = getQuoteTotal(product, quote, normalizeFilter);
        const vendorId = getVendorId(quote);
        const originalProduct = originalProducts[rowIndex] || product;
        const originalQuote = (originalProduct.quotations || []).find(
          (entry) => String(entry.created_by) === String(vendorId)
        );
        const missingParts = getMissingCostParts(originalQuote || quote, freightFilter);

        if (missingParts.length > 0) incompleteCount += 1;

        const isFinalized = !!product?.all_vendors?.find(
          (vendor) => String(vendor.id) === String(vendorId) && vendor.is_finalized
        );

        if (isFinalized && total > 0) finalizedTotal += total;

        return {
          quote,
          details,
          vendorId,
          vendorName: getVendorName(quote, product),
          total,
          missingParts,
          isLowest: !!quote.is_lowest,
          isFinalized,
        };
      })
      .sort((a, b) => a.total - b.total);

    if (eligible.length === 0 && allQuotes.some((quote) => isRegretQuote(quote))) {
      regretOnlyProducts += 1;
    }

    maxRanks = Math.max(maxRanks, eligible.length);

    const rowComparativeStats = {
      total: buildRowComparativeStats(product, ["total"]).total,
    };

    return {
      product,
      productName,
      size,
      spec,
      quantity,
      unit,
      rankedQuotes: eligible,
      rowComparativeStats,
    };
  });

  const columnSums = Array.from({ length: maxRanks }).map((_, rank) => {
    return rows.reduce((sum, row) => {
      const entry = row.rankedQuotes[rank];
      return sum + (entry ? toNumber(entry.total) : 0);
    }, 0);
  });

  return {
    rows,
    maxRanks,
    columnSums,
    l1Total: columnSums[0] || 0,
    l2Total: columnSums[1] || 0,
    incompleteCount,
    regretOnlyProducts,
    finalizedTotal,
  };
};

export const buildComparisonContextTables = ({
  quotes = [],
  originalQuotes = [],
  normalizeFilter = false,
  freightFilter = false,
  productNegotiationData = {},
}) => {
  const productById = {};

  (quotes || []).forEach((product) => {
    const model = buildProductComparisonModel({
      product,
      quotations: product.quotations || [],
      originalQuotations:
        originalQuotes.find((entry) => String(entry.id) === String(product.id))?.quotations ||
        product.quotations ||
        [],
      normalizeFilter,
      freightFilter,
      negotiationRoundQuotes: productNegotiationData?.[product.id]?.roundQuotes || [],
      activeRound: productNegotiationData?.[product.id]?.activeRound || null,
    });

    productById[product.id] = {
      rowComparativeStats: model.rowComparativeStats,
      freightAdvantage: model.freightAdvantageVendorIds,
      riskFlags: model.riskFlags,
    };
  });

  return {
    productById,
  };
};
