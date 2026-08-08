import {
  isQuantityValid,
  isUnitValid,
  readSpec,
  missingFields,
  isProductComplete,
  findIncompleteProducts,
  describeIncomplete,
} from './productCompleteness';

describe('isQuantityValid', () => {
  it.each(['1', '10', '0.5', '.5', '12.750', '+7', '  25  ', '1.'])(
    'accepts %p',
    (value) => expect(isQuantityValid(value)).toBe(true)
  );

  it.each(['0', '0.0', '-5', 'ten', '', '   ', 'NA', null, undefined, '10abc', '1e3'])(
    'rejects %p',
    (value) => expect(isQuantityValid(value)).toBe(false)
  );

  it('enforces the 0.1 floor the edit path has always applied', () => {
    // Both submit routes now share this. No production row sits between 0 and
    // 0.1, so nothing that used to save stops saving.
    expect(isQuantityValid('0.1')).toBe(true);
    expect(isQuantityValid('.1')).toBe(true);
    expect(isQuantityValid('0.05')).toBe(false);
    expect(isQuantityValid('0.09999')).toBe(false);
  });

  it("rejects '1,000' rather than silently reading it as 1", () => {
    // parseFloat('1,000') === 1. Accepting this would put 1 on the purchase
    // order when the buyer meant 1000, which is worse than a validation error.
    expect(isQuantityValid('1,000')).toBe(false);
  });

  it('accepts a number as well as a string', () => {
    expect(isQuantityValid(25)).toBe(true);
    expect(isQuantityValid(0)).toBe(false);
  });
});

describe('isUnitValid', () => {
  it.each(['g', 'm', 'L', 'KG', 'NOS', 'sq ft'])('accepts %p — one character is a unit', (value) =>
    expect(isUnitValid(value)).toBe(true)
  );

  it.each(['', '   ', 'NA', 'n/a', 'NIL', 'none', '-', '--', null, undefined])(
    'rejects placeholder %p',
    (value) => expect(isUnitValid(value)).toBe(false)
  );
});

describe('readSpec', () => {
  it('finds a spec regardless of the title case it was stored under', () => {
    expect(readSpec({ product_specs: [{ title: 'quantity', value: '5' }] }, 'Quantity')).toBe('5');
    expect(readSpec({ product_specs: [{ title: 'UNIT', value: 'KG' }] }, 'Unit')).toBe('KG');
  });

  it('reads the server shape, the Redux shape and the snapshot shape', () => {
    expect(readSpec({ product_specs: [{ title: 'Quantity', value: '1' }] }, 'Quantity')).toBe('1');
    expect(readSpec({ spec: [{ title: 'Quantity', value: '2' }] }, 'Quantity')).toBe('2');
    expect(readSpec({ specs: { Quantity: '3' } }, 'Quantity')).toBe('3');
  });

  it('falls back to a direct property but never to an object', () => {
    expect(readSpec({ quantity: '9' }, 'Quantity')).toBe('9');
    // product.spec is the container, not the value — returning it would smush
    // every spec into the field.
    expect(readSpec({ quantity: { nested: true } }, 'Quantity')).toBe('');
  });

  it('returns empty string when the product has nothing', () => {
    expect(readSpec({}, 'Quantity')).toBe('');
    expect(readSpec(null, 'Unit')).toBe('');
  });
});

describe('missingFields', () => {
  it('is empty for a product with a quantity and a single-letter unit', () => {
    const product = { product_specs: [{ title: 'Quantity', value: '10' }, { title: 'Unit', value: 'g' }] };
    expect(missingFields(product)).toEqual([]);
    expect(isProductComplete(product)).toBe(true);
  });

  it('names both fields when the product is empty', () => {
    expect(missingFields({})).toEqual(['Quantity', 'Unit']);
  });

  it('names only the field that is actually wrong', () => {
    expect(
      missingFields({ product_specs: [{ title: 'Quantity', value: '0' }, { title: 'Unit', value: 'KG' }] })
    ).toEqual(['Quantity']);
    expect(
      missingFields({ product_specs: [{ title: 'Quantity', value: '4' }, { title: 'Unit', value: 'NA' }] })
    ).toEqual(['Unit']);
  });
});

describe('findIncompleteProducts', () => {
  const complete = {
    id: 1,
    name: 'Ceramic Tile',
    product_specs: [{ title: 'Quantity', value: '10' }, { title: 'Unit', value: 'NOS' }],
  };
  const noUnit = {
    id: 2,
    name: 'Bath Towel',
    product_specs: [{ title: 'Quantity', value: '5' }, { title: 'Unit', value: '' }],
  };

  it('returns only the products at fault', () => {
    const found = findIncompleteProducts([complete, noUnit]);
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Bath Towel');
    expect(found[0].missing).toEqual(['Unit']);
  });

  it('is empty when everything is filled in', () => {
    expect(findIncompleteProducts([complete])).toEqual([]);
  });

  it('handles no products at all', () => {
    expect(findIncompleteProducts()).toEqual([]);
    expect(findIncompleteProducts([])).toEqual([]);
  });

  it('prefers the catalogue name and falls back to the id', () => {
    expect(findIncompleteProducts([{ id: 7, product_details: [{ name: 'Steel Rod' }] }])[0].name)
      .toBe('Steel Rod');
    expect(findIncompleteProducts([{ id: 7 }])[0].name).toBe('Product 7');
  });

  it('describes them for a message', () => {
    expect(describeIncomplete(findIncompleteProducts([noUnit]))).toBe('Bath Towel (unit)');
    expect(describeIncomplete(findIncompleteProducts([{ id: 3, name: 'Soap' }])))
      .toBe('Soap (quantity and unit)');
  });
});
