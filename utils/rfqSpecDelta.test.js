import { specDeltaKey, isUnsavedSpecKey } from './rfqSpecDelta';

describe('specDeltaKey', () => {
  it('uses the real row id for a saved product', () => {
    expect(specDeltaKey({ id: 4271, product_id: 13850, variant: 0 })).toBe('4271');
  });

  it('never returns the string "undefined" for an unsaved product', () => {
    // The whole defect: `${undefined}` as an object key.
    expect(specDeltaKey({ product_id: 13850, variant: 0 })).not.toBe('undefined');
  });

  it('gives two different unsaved products two different keys', () => {
    // Both were added in this session and neither has a server row yet. Under
    // the old keying they collided and one product's quantity was lost.
    const a = specDeltaKey({ product_id: 13703, variant: 0 });
    const b = specDeltaKey({ product_id: 13357, variant: 0 });
    expect(a).not.toBe(b);
  });

  it('separates two variants of the same catalogue item', () => {
    expect(specDeltaKey({ product_id: 13270, variant: 0 }))
      .not.toBe(specDeltaKey({ product_id: 13270, variant: 1 }));
  });

  it('is stable across calls so repeated edits land in one bucket', () => {
    const product = { product_id: 13703, variant: 2 };
    expect(specDeltaKey(product)).toBe(specDeltaKey({ ...product }));
  });

  it('treats id 0 and empty string as unsaved rather than as a row id', () => {
    expect(isUnsavedSpecKey(specDeltaKey({ id: '', product_id: 1, variant: 0 }))).toBe(true);
  });

  it('reads product_variant_id when the product uses the server field name', () => {
    expect(specDeltaKey({ product_variant_id: 999, variant: 1 })).toBe('new:999:1');
  });

  it('survives a product with nothing on it at all', () => {
    expect(typeof specDeltaKey({})).toBe('string');
    expect(typeof specDeltaKey(null)).toBe('string');
  });
});

describe('isUnsavedSpecKey', () => {
  it('distinguishes a synthetic key from a real row id', () => {
    expect(isUnsavedSpecKey('new:13703:0')).toBe(true);
    expect(isUnsavedSpecKey('4271')).toBe(false);
  });

  it('a synthetic key is not a number, so the server-side deletable filter skips it', () => {
    // The server does `deletable.includes(parseInt(key))`; a deletable list
    // holds real ids, and parseInt('new:...') is NaN, which matches nothing.
    expect(Number.isNaN(parseInt('new:13703:0', 10))).toBe(true);
  });
});
