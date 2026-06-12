import axiosInstance from "@/lib/axios";

// Stateless preview: posts a draft list of line items + global charges to the
// backend and returns engine-computed totals (per-line + grand). Used by
// send-quote and PO-edit to drive their live grand-total displays without
// duplicating the math on the client.
//
// Payload:
//   { items: [{ unit_price, quantity, tax, tax_mode, other_charges? }], global_charges? }
// Response: { lines: [...], grand_subtotal, global_charges_total, grand_total }
export const previewTotals = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post("/pricing/preview", payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// Server-computed quote-compare view model. Returns engine-enriched products
// (each line carries `engine` { base, base_tax, charges, total }), per-product
// comparison stats (bands, freight advantage, lowest), per-vendor totals
// summed across the RFQ, and overall metrics (L1, baseline, savings).
//
// Query params:
//   normalize       — '1' to apply payment-term normalization + peer fill-in
//   freightFilter   — '1' to apply the missing-freight comparison filter
//   rfq_product_id  — optional, filter to a single product
//   include_negotiation — 'true' to include negotiation-round quotes
export const getQuoteComparison = (rfq_id, opts = {}) => {
  const params = new URLSearchParams();
  if (opts.normalize) params.set("normalize", "1");
  if (opts.freightFilter) params.set("freightFilter", "1");
  if (opts.rfq_product_id) params.set("rfq_product_id", opts.rfq_product_id);
  if (opts.include_negotiation) params.set("include_negotiation", "true");
  if (opts.pageSource) params.set("pageSource", opts.pageSource);
  const qs = params.toString();
  const url = `/rfq/quote-compare/${rfq_id}${qs ? `?${qs}` : ""}`;
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(url);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// Flat, prototype-shaped quote-comparison view for the new Quote Comparison
// page. The axios interceptor unwraps response.data, so this resolves to the
// contract object directly:
//   { rfq, vendors[], categories[], products[] (per-cell quote components +
//     engine total + state open|pending|approved|rejected + finalized_vendor +
//     reject_info + lpr + target + round), approval_chain[] }
// opts.freight: true (default, landed incl. freight) | false (base, no freight).
export const getQuoteComparisonView = (rfq_id, opts = {}) => {
  const params = new URLSearchParams();
  // Default landed; send freight=0 only when explicitly disabled.
  if (opts.freight === false) params.set("freight", "0");
  const qs = params.toString();
  const url = `/rfq/quote-comparison-view/${rfq_id}${qs ? `?${qs}` : ""}`;
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(url);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};
