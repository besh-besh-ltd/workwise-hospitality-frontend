import { buildEditSnapshotPayload } from './rfqEditSnapshot';

// A product row shaped the way `reshapeRfqForStore` leaves it in Redux after
// /rfq/getRfqById — spec rows under `spec`, vendors under `vendors`.
const product = (over = {}) => ({
  id: 4732,
  product_variant_id: 3192,
  variant: 2,
  name: 'SPLIT AC 2 TR',
  comment: '',
  spec: [
    { title: 'Quantity', value: '4' },
    { title: 'Unit', value: 'pcs' },
  ],
  vendors: [{ user_id: 192 }, { user_id: 195 }],
  qap_file: [],
  spec_file: [],
  datasheet_file: [],
  ...over,
});

const emptyUpdatable = () => ({
  products: { addable: [], deletable: [], updatable: {} },
  vendors: {},
});

const args = (over = {}) => ({
  editRfqId: 701,
  formDataCopy: {
    title: 'ORCHID PASSAROS GOA — AIR CONDITIONING',
    comment: '',
    contact_name: 'Ishan',
    response_email: 'purchase.goa@orchidhotel.com',
    location: 'Goa',
    bid_end_date: '2026-09-15 11:09',
    term_and_condition_files: [],
  },
  fullMobile: '91-9999999999',
  rfqProductsFromStore: [product()],
  selectedTerms: [],
  selectedHotelIds: [30],
  liveUpdatableData: emptyUpdatable(),
  ...over,
});

describe('buildEditSnapshotPayload — product removal', () => {
  it('omits a product the buyer removed so the server deletes it', () => {
    // THE DEFECT (RFQ 536245, 2026-08-26): handleRemoveProductConfirm pushes
    // the id into updatableData.products.deletable and the row disappears from
    // the UI, but the snapshot still carried it — so diffProducts saw the
    // product as present and never removed it. Save reported success and the
    // product came back on the next refetch.
    const live = emptyUpdatable();
    live.products.deletable = [4732];

    const { snapshot } = buildEditSnapshotPayload(
      args({
        rfqProductsFromStore: [product({ id: 4732 }), product({ id: 4733, variant: 3 })],
        liveUpdatableData: live,
      })
    );

    expect(snapshot.products.map((p) => p.id)).toEqual([4733]);
  });

  it('names the removed product in deleted_product_ids', () => {
    // Omission alone is ambiguous — a stale snapshot omits products too. The
    // server only deletes what this list names.
    const live = emptyUpdatable();
    live.products.deletable = [4732];

    const { snapshot } = buildEditSnapshotPayload(
      args({
        rfqProductsFromStore: [product({ id: 4732 }), product({ id: 4733, variant: 3 })],
        liveUpdatableData: live,
      })
    );

    expect(snapshot.deleted_product_ids).toEqual([4732]);
  });

  it('sends an empty deleted_product_ids when the buyer removed nothing', () => {
    // The key must always be present. An absent key is indistinguishable from
    // an old client, and the server has to be able to tell those apart.
    const { snapshot } = buildEditSnapshotPayload(args());

    expect(snapshot.deleted_product_ids).toEqual([]);
    expect(snapshot.products).toHaveLength(1);
  });

  it('matches deletable ids that arrive as strings', () => {
    // updatableData is fed from several places; ids have shown up as strings
    // before (cleanUpdatableData maps them with String()).
    const live = emptyUpdatable();
    live.products.deletable = ['4732'];

    const { snapshot } = buildEditSnapshotPayload(
      args({ rfqProductsFromStore: [product({ id: 4732 })], liveUpdatableData: live })
    );

    expect(snapshot.products).toEqual([]);
    expect(snapshot.deleted_product_ids).toEqual([4732]);
  });

  it('keeps a product the buyer added in this session even while another is removed', () => {
    // A newly added product has no server row yet (id null) and must survive
    // the removal filter — it is an insert, not a deletion candidate.
    const live = emptyUpdatable();
    live.products.deletable = [4732];

    const { snapshot } = buildEditSnapshotPayload(
      args({
        rfqProductsFromStore: [
          product({ id: 4732 }),
          product({ id: null, clientId: 'c1', variant: 0 }),
        ],
        liveUpdatableData: live,
      })
    );

    expect(snapshot.products).toHaveLength(1);
    expect(snapshot.products[0].id).toBeNull();
    expect(snapshot.deleted_product_ids).toEqual([4732]);
  });

  it('never reports an unsaved product as a deletion', () => {
    // Removing a just-added product happens purely in Redux (removeRfqProduct);
    // it has no server row, so naming it in deleted_product_ids would make the
    // server 409 on an id it has never seen.
    const live = emptyUpdatable();
    live.products.deletable = [null, undefined, ''];

    const { snapshot } = buildEditSnapshotPayload(
      args({ rfqProductsFromStore: [product()], liveUpdatableData: live })
    );

    expect(snapshot.deleted_product_ids).toEqual([]);
    expect(snapshot.products).toHaveLength(1);
  });

  it('does not repeat an id that was marked for removal twice', () => {
    const live = emptyUpdatable();
    live.products.deletable = [4732, 4732];

    const { snapshot } = buildEditSnapshotPayload(
      args({ rfqProductsFromStore: [product({ id: 4732 })], liveUpdatableData: live })
    );

    expect(snapshot.deleted_product_ids).toEqual([4732]);
  });
});

describe('buildEditSnapshotPayload — mapping the rest of the RFQ', () => {
  it('returns the rfq_id alongside the snapshot', () => {
    expect(buildEditSnapshotPayload(args()).rfq_id).toBe(701);
  });

  it('flattens spec rows into an object keyed by title', () => {
    const { snapshot } = buildEditSnapshotPayload(args());
    expect(snapshot.products[0].specs).toEqual({ Quantity: '4', Unit: 'pcs' });
  });

  it('reduces vendors to their user ids', () => {
    const { snapshot } = buildEditSnapshotPayload(args());
    expect(snapshot.products[0].vendors).toEqual([192, 195]);
  });

  it('reads server-shaped products that use product_specs and vendor_details', () => {
    const { snapshot } = buildEditSnapshotPayload(
      args({
        rfqProductsFromStore: [
          {
            id: 9,
            product_variant_id: 3192,
            variant: 0,
            name: 'X',
            product_specs: [{ title: 'Unit', value: 'nos' }],
            vendor_details: [{ user_id: 7 }],
          },
        ],
      })
    );

    expect(snapshot.products[0].specs).toEqual({ Unit: 'nos' });
    expect(snapshot.products[0].vendors).toEqual([7]);
  });

  it('applies the live file delta over the stored file list', () => {
    const live = emptyUpdatable();
    live.products.updatable.files = { 4732: { qap_file: ['https://s3/new.pdf'] } };

    const { snapshot } = buildEditSnapshotPayload(
      args({
        rfqProductsFromStore: [product({ qap_file: ['https://s3/old.pdf'] })],
        liveUpdatableData: live,
      })
    );

    expect(snapshot.products[0].files.qap_file).toEqual(['https://s3/new.pdf']);
  });

  it('clears a file bucket when the live delta is the "rm" sentinel', () => {
    const live = emptyUpdatable();
    live.products.updatable.files = { 4732: { spec_file: 'rm' } };

    const { snapshot } = buildEditSnapshotPayload(
      args({
        rfqProductsFromStore: [product({ spec_file: ['https://s3/spec.pdf'] })],
        liveUpdatableData: live,
      })
    );

    expect(snapshot.products[0].files.spec_file).toEqual([]);
  });

  it('drops the file delta of a product that was removed', () => {
    // Nothing should reference a product that is no longer in the snapshot.
    const live = emptyUpdatable();
    live.products.deletable = [4732];
    live.products.updatable.files = { 4732: { qap_file: ['https://s3/new.pdf'] } };

    const { snapshot } = buildEditSnapshotPayload(
      args({ rfqProductsFromStore: [product()], liveUpdatableData: live })
    );

    expect(snapshot.products).toEqual([]);
  });

  it('prefers the explicit hotel selection over the form copy', () => {
    const { snapshot } = buildEditSnapshotPayload(
      args({ selectedHotelIds: [30, 31], formDataCopy: { ...args().formDataCopy, hotel_ids: [99] } })
    );
    expect(snapshot.hotel_ids).toEqual([30, 31]);
  });

  it('survives a null product list', () => {
    const { snapshot } = buildEditSnapshotPayload(args({ rfqProductsFromStore: null }));
    expect(snapshot.products).toEqual([]);
    expect(snapshot.deleted_product_ids).toEqual([]);
  });
});
