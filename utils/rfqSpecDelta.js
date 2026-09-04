/**
 * The key a product's pending spec edits are filed under before they are saved.
 *
 * The edit buffer is an object keyed by `tbl_rfq_products.id`:
 *
 *     updatableData.products.updatable.specs[product.id] = { product_id, variant, Quantity, Unit }
 *
 * A product that was just added to the RFQ has no row on the server yet, so
 * `product.id` is undefined and every one of them files under the same key —
 * the literal string "undefined". Two new products therefore share one bucket:
 * the second overwrites the first's product_id/variant, and the first
 * product's quantity is dropped on the floor before the request is even sent.
 *
 * The buyer sees the quantity they typed (it is still in Redux) and the server
 * sees no spec row for that product, which is precisely the "Review shows a
 * quantity but submit says it is missing" report.
 *
 * The server resolves each entry by the `product_id` + `variant` carried INSIDE
 * the value, not by this key, so any key that is unique per product is correct.
 * Saved products keep their real id — the deletable filter on the server is a
 * numeric id match and must keep working.
 */
export const specDeltaKey = (product) => {
  if (product?.id !== undefined && product?.id !== null && product.id !== '') {
    return String(product.id);
  }
  // Unsaved: identify by what the server will resolve it by anyway.
  const variantId = product?.product_id ?? product?.product_variant_id ?? 'x';
  const variant = product?.variant ?? 0;
  return `new:${variantId}:${variant}`;
};

/** True for a key minted above for a product that has no server row yet. */
export const isUnsavedSpecKey = (key) => String(key).startsWith('new:');
