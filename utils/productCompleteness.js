/**
 * When is a product's quantity/unit good enough to submit an RFQ.
 *
 * There were three different answers to this question in the app and a fourth
 * on the server, and they disagreed. That is the whole of the client ticket:
 * the Review step said every product had a quantity and a unit, submit came
 * back with "Some products are missing quantity or unit", and both were
 * reporting their own rule honestly.
 *
 * The disagreements that actually bit:
 *
 *   - The server rejected any unit shorter than two characters, so 'g', 'm'
 *     and 'L' failed while the UI showed them as filled in.
 *   - The UI used parseFloat, which reads '10abc' as 10 and '1,000' as 1, so
 *     it accepted quantities the server then rejected.
 *   - The UI matched spec titles case-sensitively against 'Quantity'/'Unit',
 *     and some rows are written lowercase, so those read as absent.
 *
 * These predicates are the single client-side answer, and they mirror the SQL
 * in rfqModel.checkRFQCompletion line for line. Change one, change the other.
 */

// Not units — placeholders people type when they have nothing to say.
const UNIT_PLACEHOLDERS = new Set(['NA', 'N/A', 'NIL', 'NONE', 'NULL', '-', '--']);

// Optional leading '+', then digits with an optional fraction, or a bare
// fraction ('.5'). Deliberately no thousands separators: parseFloat('1,000')
// is 1 everywhere downstream, so accepting it would turn a typo into a 1000x
// error on a purchase order rather than a validation message.
const NUMERIC = /^\+?(\d+(\.\d*)?|\.\d+)$/;

const asText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

export const isQuantityValid = (value) => {
  const text = asText(value);
  if (!NUMERIC.test(text)) return false;
  return Number.parseFloat(text) > 0;
};

export const isUnitValid = (value) => {
  const text = asText(value);
  if (text === '') return false;
  return !UNIT_PLACEHOLDERS.has(text.toUpperCase());
};

/**
 * Pull a spec value off a product by title, case-insensitively, accepting the
 * several shapes a product carries depending on which screen built it:
 * `product_specs` (server), `spec` (Redux), or a direct `quantity`/`unit` key.
 */
export const readSpec = (product, title) => {
  const wanted = String(title).toLowerCase();

  const rows = Array.isArray(product?.product_specs)
    ? product.product_specs
    : Array.isArray(product?.spec)
    ? product.spec
    : Array.isArray(product?.specs)
    ? product.specs
    : null;

  if (rows) {
    const hit = rows.find(
      (row) => String(row?.title ?? row?.label ?? '').trim().toLowerCase() === wanted
    );
    if (hit) return hit.value ?? hit.val ?? '';
  }

  // `specs` as a flat object keyed by title, the shape the snapshot payload uses.
  if (product?.specs && !Array.isArray(product.specs) && typeof product.specs === 'object') {
    for (const [key, value] of Object.entries(product.specs)) {
      if (key.trim().toLowerCase() === wanted) return value;
    }
  }

  const direct = product?.[wanted];
  if (direct !== undefined && direct !== null && typeof direct !== 'object') return direct;

  return '';
};

/** What this product is missing, if anything. Empty array means it is fine. */
export const missingFields = (product) => {
  const missing = [];
  if (!isQuantityValid(readSpec(product, 'Quantity'))) missing.push('Quantity');
  if (!isUnitValid(readSpec(product, 'Unit'))) missing.push('Unit');
  return missing;
};

export const isProductComplete = (product) => missingFields(product).length === 0;

/**
 * Every incomplete product, with its name, so the caller can say which rows
 * need attention instead of "some products".
 */
export const findIncompleteProducts = (products = []) =>
  (products || [])
    .map((product) => ({ product, missing: missingFields(product) }))
    .filter((entry) => entry.missing.length > 0)
    .map(({ product, missing }) => ({
      product,
      missing,
      name:
        product?.product_details?.[0]?.name ||
        product?.name ||
        `Product ${product?.id ?? product?.product_id ?? ''}`.trim(),
    }));

/** "Ceramic Tile (quantity), Bath Towel (unit)" — for a toast. */
export const describeIncomplete = (incomplete = []) =>
  incomplete
    .map(({ name, missing }) => `${name} (${missing.join(' and ').toLowerCase()})`)
    .join(', ');
