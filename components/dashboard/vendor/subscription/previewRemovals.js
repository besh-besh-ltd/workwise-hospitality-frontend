// Does this preview take anything away from the vendor?
//
// Must agree with the server's `hasRemovals` in modifySubscription: categories,
// sub-categories (including ones cascaded out by removing their parent) and
// business units all count. Sub-categories are free, but cost is not a stand-in
// for consent — a removal the vendor has not confirmed is refused either way.

export const hasRemovals = (diff) =>
  (diff?.removed_categories?.length || 0) +
    (diff?.removed_subcategories?.length || 0) +
    (diff?.cascaded_subcategories?.length || 0) +
    (diff?.removed_hotels?.length || 0) >
  0;

export default hasRemovals;
