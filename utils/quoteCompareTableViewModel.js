import { calculateTotal } from "@/utils/sharedFunctions";

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

export const getQuoteTotal = (product, quote, normalizeFilter = false) => {
  const details = getQuoteDetails(quote) || {};
  const calcBase = { ...details, ...quote };
  const quantity = getQuantityFromProduct(product, details) || toNumber(calcBase.quantity) || 1;
  const total = toNumber(calculateTotal(calcBase, quantity, normalizeFilter));

  if (total > 0) return total;
  return toNumber(pick(calcBase.total_price, quote?.total_price));
};

export const getMissingCostParts = (quote, freightFilter = false) => {
  const details = getQuoteDetails(quote) || {};
  const parts = [];

  const packageValue = toNumber(pick(details.package_price, quote?.package_price));
  const freightValue = toNumber(pick(details.freight_price, quote?.freight_price));

  if (packageValue === 0) parts.push("Package");
  if (!freightFilter && freightValue === 0) parts.push("Freight");

  return parts;
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
  return previous.length > 0 ? previous[previous.length - 1] : null;
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

const getChargeEffectiveValue = (details = {}, chargeType = "freight", quantity = 1) => {
  const unitPrice = toNumber(details.unit_price);
  const subtotal = unitPrice * toNumber(quantity || 1);

  if (chargeType === "freight") {
    const value = toNumber(details.freight_price);
    return details.freight_mode === "percentage" ? (subtotal * value) / 100 : value;
  }

  if (chargeType === "packaging") {
    const value = toNumber(details.package_price);
    return details.package_mode === "percentage" ? (subtotal * value) / 100 : value;
  }

  if (chargeType === "gst") {
    const value = toNumber(details.tax);
    return details.tax_mode === "percentage" ? (subtotal * value) / 100 : value;
  }

  return toNumber(details[chargeType]);
};

const metricValueResolvers = {
  basePrice: (column) => toNumber(column.details?.unit_price),
  subtotal: (column) => toNumber(column.details?.unit_price) * toNumber(column.quantity),
  packaging: (column) => getChargeEffectiveValue(column.details, "packaging", column.quantity),
  freight: (column) => getChargeEffectiveValue(column.details, "freight", column.quantity),
  gst: (column) => getChargeEffectiveValue(column.details, "gst", column.quantity),
  total: (column) => toNumber(column.total),
  target: (column) => toNumber(column.targetPrice),
  delivery: (column) => toNumber(column.delivery),
};

const buildRowComparativeStats = (columns = [], metricKeys = []) => {
  const stats = {};

  metricKeys.forEach((metricKey) => {
    const resolver = metricValueResolvers[metricKey];
    if (!resolver) return;

    const candidates = columns
      .filter((column) => !column.isRegret && column.price > 0)
      .map((column) => ({
        vendorId: column.vendorId,
        value: toNumber(resolver(column)),
      }))
      .filter((entry) => entry.value > 0);

    if (candidates.length === 0) {
      stats[metricKey] = {
        min: 0,
        max: 0,
        bands: {},
        normalizedScores: {},
      };
      return;
    }

    const min = Math.min(...candidates.map((entry) => entry.value));
    const max = Math.max(...candidates.map((entry) => entry.value));
    const spread = Math.max(max - min, 1);

    const bands = {};
    const normalizedScores = {};

    candidates.forEach((entry) => {
      const normalized = clamp((entry.value - min) / spread, 0, 1);
      normalizedScores[entry.vendorId] = normalized;

      if (entry.value <= min * 1.01) {
        bands[entry.vendorId] = "best";
      } else if (normalized <= 0.4) {
        bands[entry.vendorId] = "competitive";
      } else if (normalized >= 0.8) {
        bands[entry.vendorId] = "high";
      } else {
        bands[entry.vendorId] = "neutral";
      }
    });

    stats[metricKey] = {
      min,
      max,
      bands,
      normalizedScores,
    };
  });

  return stats;
};

const getFreightAdvantageVendorIds = (columns = []) => {
  const eligible = columns
    .filter((column) => !column.isRegret && column.price > 0 && column.missingParts.length === 0)
    .map((column) => ({
      vendorId: column.vendorId,
      freightCost: getChargeEffectiveValue(column.details, "freight", column.quantity),
    }))
    .filter((entry) => entry.freightCost > 0);

  if (eligible.length === 0) return [];

  const minFreight = Math.min(...eligible.map((entry) => entry.freightCost));
  const tolerance = minFreight * 1.01;

  return eligible
    .filter((entry) => entry.freightCost <= tolerance)
    .map((entry) => entry.vendorId);
};

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
      comment: pick(details.comment, quote?.comment, quote?.global_comment, ""),
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

  const metricKeys = [
    "basePrice",
    "subtotal",
    "packaging",
    "freight",
    "gst",
    "total",
    "target",
    "delivery",
  ];

  const rowComparativeStats = buildRowComparativeStats(columns, metricKeys);
  const freightAdvantageVendorIds = getFreightAdvantageVendorIds(columns);
  const riskFlags = getRiskFlagsByVendor(columns);

  return {
    product,
    columns,
    lowestQuote,
    rowComparativeStats,
    freightAdvantageVendorIds,
    riskFlags,
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

    return {
      ...vendor,
      ...totals,
      deliveryDays,
      displayName: vendor.organization_name || vendor.name || vendor.email || "Unknown Vendor",
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
      total: buildRowComparativeStats(
        vendorCells.map((cell) => ({
          ...cell,
          price: cell.total > 0 ? 1 : 0,
          vendorId: cell.vendor.id,
        })),
        ["total"]
      ).total,
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
      total: buildRowComparativeStats(
        eligible.map((entry) => ({
          ...entry,
          price: 1,
        })),
        ["total"]
      ).total,
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
