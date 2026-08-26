// Builds the `{ rfq_id, snapshot }` payload that PUT /rfq/update expects when
// editing an existing (published) RFQ.
//
// Extracted from CreateRFQ.js so the producer of the update payload can be
// tested on its own. It was previously a module-private const inside a ~4700
// line component, which is why a missing removal filter reached production
// unnoticed: every backend test hand-built the payload it believed this
// function produced, and nothing ever checked the function itself.
export const buildEditSnapshotPayload = ({
  editRfqId,
  formDataCopy,
  fullMobile,
  rfqProductsFromStore,
  selectedTerms,
  selectedHotelIds,
  liveUpdatableData,
}) => {
  // Products the buyer removed in this session. `handleRemoveProductConfirm`
  // files their row id here and the list stops rendering them; until this
  // filter existed the snapshot still carried them, so the server saw the
  // product as present and the removal was silently dropped.
  //
  // Only persisted rows belong here. A product added in this session has no
  // server row — it is removed straight out of Redux — and naming it would
  // make the server reject an id it has never issued.
  const deletedProductIds = [
    ...new Set(
      (liveUpdatableData?.products?.deletable ?? [])
        .filter((id) => id !== null && id !== undefined && id !== '')
        .map(Number)
        .filter(Number.isFinite)
    ),
  ];
  const isRemoved = (p) => p.id != null && deletedProductIds.includes(Number(p.id));

  const products = (rfqProductsFromStore || []).filter((p) => !isRemoved(p)).map((p) => {
    // Spec rows: array of {title, value} → flat object keyed by title
    const specs = {};
    const specRows = Array.isArray(p.spec) ? p.spec : (p.product_specs || []);
    for (const row of specRows) {
      if (row && row.title != null) specs[row.title] = row.value;
    }
    const vendorList = Array.isArray(p.vendors)
      ? p.vendors
      : Array.isArray(p.vendor_details) ? p.vendor_details : [];
    const vendors = vendorList
      .map((v) => Number(v.user_id ?? v.id))
      .filter((id) => !Number.isNaN(id));
    // Prefer the synchronous delta from updatableDataRef when present —
    // a same-tick saveDraft() after an upload sees fresh URLs there before
    // useSelector has a chance to re-render. "rm" is the sentinel that
    // handleFilesChange writes when an array goes empty.
    const fileOverride = liveUpdatableData?.products?.updatable?.files?.[p.id];
    const pickFiles = (key, fallback) => {
      const delta = fileOverride?.[key];
      if (delta === undefined) return (fallback || []).filter(Boolean);
      if (delta === "rm") return [];
      return Array.isArray(delta) ? delta.filter(Boolean) : (fallback || []).filter(Boolean);
    };
    const files = {
      qap_file: pickFiles("qap_file", p.qap_file),
      spec_file: pickFiles("spec_file", p.spec_file),
      datasheet_file: pickFiles("datasheet_file", p.datasheet_file),
    };
    return {
      id: p.id ?? null,
      clientId: p.clientId,
      product_variant_id: Number(p.product_variant_id ?? p.product_id),
      variant: Number(p.variant) || 0,
      product_name: p.product_details?.[0]?.name || p.name || `Product ${p.id || ''}`,
      comment: p.comment || '',
      specs,
      files,
      vendors,
      tech_eval_clauses: p.tech_eval_clauses || [],
    };
  });

  const snapshot = {
    title: formDataCopy.title ?? '',
    comment: formDataCopy.comment ?? '',
    contact_name: formDataCopy.contact_name ?? '',
    contact_number: fullMobile,
    response_email: formDataCopy.response_email ?? '',
    location: formDataCopy.location ?? '',
    bid_end_date: formDataCopy.bid_end_date ?? '',
    tender_publish_date: formDataCopy.tender_publish_date ?? null,
    tender_fees: formDataCopy.tender_fees ?? null,
    vendor_clarification_date: formDataCopy.vendor_clarification_date ?? null,
    rfq_type: formDataCopy.rfq_type ?? null,
    reverse_auction: Number(formDataCopy.reverse_auction || 0),
    ra_start_date: formDataCopy.ra_start_date ?? null,
    ra_end_date: formDataCopy.ra_end_date ?? null,
    project_id: formDataCopy.project_id != null && formDataCopy.project_id !== ''
      ? Number(formDataCopy.project_id)
      : null,
    is_tender: Number(formDataCopy.is_tender || 0),
    hotel_ids: Array.isArray(selectedHotelIds) && selectedHotelIds.length > 0
      ? selectedHotelIds
      : (Array.isArray(formDataCopy.hotel_ids) ? formDataCopy.hotel_ids : []),
    terms: (selectedTerms || []).map((t) => Number(t.id || t.term_id)).filter(Boolean),
    // T&C attachments — diffed on the backend (applyTermFileChanges).
    // Empty array clears all files; omitting the key would mean "no change".
    term_and_condition_files: Array.isArray(formDataCopy.term_and_condition_files)
      ? formDataCopy.term_and_condition_files.filter(Boolean)
      : [],
    products,
    // Removal is explicit. The server will not delete a product merely because
    // this snapshot omits it — a stale or racing snapshot omits products too,
    // and treating that as intent destroyed two products and 226 vendor
    // mappings on RFQ 536245. Only ids named here are deleted.
    deleted_product_ids: deletedProductIds,
  };

  return { rfq_id: editRfqId, snapshot };
};
