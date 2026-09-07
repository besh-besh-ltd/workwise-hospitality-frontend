import { itClauses, itLineItems, itVendors, IT_RFQ_ID } from "@/data/ihg/itRfq";

/**
 * The clause × vendor grid for an RFQ, reduced to just the ids.
 *
 * detailRoutes builds the full grouped payload the evaluation screen renders,
 * but writeRoutes cannot import that — detailRoutes already imports the
 * session from writeRoutes, and the two would form a cycle. Only the ids are
 * needed to write marks, so they live here where both sides can reach them.
 *
 * The id arithmetic MUST match detailRoutes.itTechEvalGroups(): a mark is
 * stored against clause_id + vendor_id, so a different formula here would
 * write marks the matrix never reads.
 */

export const itVendorNumericIdFor = (slug) => 7301 + itVendors.findIndex((v) => v.id === slug);

export const techEvalGroupsFor = (rfqId) => {
  if (String(rfqId) !== IT_RFQ_ID) return [];

  const vendors = itVendors.map((v, idx) => ({
    vendor_id: itVendorNumericIdFor(v.id),
    vendor_name: v.name,
    rank: idx + 1,
  }));

  return itLineItems.map((item, idx) => ({
    rfq_product_id: idx + 1,
    product_name: item.name,
    vendors,
    clauses: itClauses.map((c) => ({
      // Unique per product — same formula as itTechEvalGroups().
      clause_id: c.id * 10 + (idx + 1),
      weightage: c.maxMark,
    })),
  }));
};
