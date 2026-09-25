// Group rate contract — the create wizard's rules, as plain functions.

import {
  buStepComplete,
  nextLeadHotelId,
  hotelSplitTotal,
  hotelSplitValid,
  buildScopePayload,
  buildItemsPayload,
  splitFromItems,
  uncoveredHotelIds,
  hotelCode,
  coveredHotelsLabel,
} from "./groupArc";

describe("buStepComplete", () => {
  test("a single-hotel contract needs a hotel and a department", () => {
    expect(buStepComplete({ isGroup: false, hotelId: 3, departmentId: 9 })).toBe(true);
    expect(buStepComplete({ isGroup: false, hotelId: 3, departmentId: null })).toBe(false);
  });

  test("a group needs at least two hotels, a lead among them, and a department", () => {
    expect(buStepComplete({ isGroup: true, hotelId: 3, groupHotelIds: [3, 4], departmentId: 9 })).toBe(true);
    expect(buStepComplete({ isGroup: true, hotelId: 3, groupHotelIds: [3], departmentId: 9 })).toBe(false);
    expect(buStepComplete({ isGroup: true, hotelId: 5, groupHotelIds: [3, 4], departmentId: 9 })).toBe(false);
    expect(buStepComplete({ isGroup: true, hotelId: 3, groupHotelIds: [3, 4], departmentId: null })).toBe(false);
  });
});

describe("nextLeadHotelId", () => {
  const hotels = [
    { id: 3, name: "Goa" },
    { id: 4, name: "Head Office", is_head_office: true },
    { id: 5, name: "Delhi" },
  ];

  test("keeps a lead the buyer chose while it is still selected", () => {
    expect(nextLeadHotelId({ currentLeadId: 5, selectedIds: [3, 4, 5], hotels, userChoseLead: true })).toBe(5);
  });

  test("otherwise suggests the Head Office as soon as it is selected, over an automatic pick", () => {
    expect(nextLeadHotelId({ currentLeadId: 3, selectedIds: [3, 4], hotels, userChoseLead: false })).toBe(4);
    expect(nextLeadHotelId({ currentLeadId: 9, selectedIds: [3, 4], hotels, userChoseLead: true })).toBe(4);
  });

  test("otherwise keeps the automatic pick, else the first selected hotel, or none", () => {
    expect(nextLeadHotelId({ currentLeadId: 5, selectedIds: [3, 5], hotels })).toBe(5);
    expect(nextLeadHotelId({ currentLeadId: null, selectedIds: [5, 3], hotels })).toBe(5);
    expect(nextLeadHotelId({ currentLeadId: 3, selectedIds: [], hotels })).toBeNull();
  });
});

describe("per-hotel quantity split", () => {
  test("totals the entered quantities, ignoring blanks", () => {
    expect(hotelSplitTotal({ 3: "400", 4: "", 5: "250.5" })).toBe(650.5);
  });

  test("is valid when every entry is blank or zero-or-more, for covered hotels, and something is ordered", () => {
    expect(hotelSplitValid({ 3: "400", 4: "" }, [3, 4])).toBe(true);
    expect(hotelSplitValid({ 3: "0", 4: "" }, [3, 4])).toBe(false);
    expect(hotelSplitValid({ 3: "-1", 4: "5" }, [3, 4])).toBe(false);
    expect(hotelSplitValid({ 3: "abc" }, [3, 4])).toBe(false);
    expect(hotelSplitValid({ 9: "5" }, [3, 4])).toBe(false);
  });
});

describe("payloads", () => {
  test("a single-hotel scope is sent as before, flagged not-group", () => {
    expect(buildScopePayload({ isGroup: false, hotelId: 3, groupHotelIds: [3, 4], departmentId: 9 }))
      .toEqual({ is_group: false, hotel_id: 3, department_id: 9 });
  });

  test("a group scope sends the lead hotel and every covered hotel, in id order", () => {
    expect(buildScopePayload({ isGroup: true, hotelId: 4, groupHotelIds: [4, 3], departmentId: 9 }))
      .toEqual({ is_group: true, hotel_id: 4, hotel_ids: [3, 4], department_id: 9 });
  });

  test("single-hotel items carry one indicative quantity", () => {
    expect(buildItemsPayload({
      isGroup: false, selectedItemIds: [11],
      itemSpecs: { 11: "white" }, itemQtys: { 11: "12" }, itemUoms: { 11: "pcs" },
    })).toEqual([{ product_variant_id: 11, spec_text: "white", indicative_qty: 12, uom: "pcs", sample_required: false }]);
  });

  test("group items carry a quantity per covered hotel (blank → 0) and no client total", () => {
    expect(buildItemsPayload({
      isGroup: true, selectedItemIds: [11], groupHotelIds: [3, 4],
      itemSpecs: { 11: "white" }, itemUoms: { 11: "pcs" }, hotelQtys: { 11: { 3: "400", 4: "" } },
    })).toEqual([{
      product_variant_id: 11, spec_text: "white", uom: "pcs", sample_required: false,
      hotel_qtys: [{ hotel_id: 3, qty: 400 }, { hotel_id: 4, qty: 0 }],
    }]);
  });

  test("a sample requirement is carried per item, group or not", () => {
    const [single] = buildItemsPayload({
      isGroup: false, selectedItemIds: [11], itemQtys: { 11: "12" }, itemSamples: { 11: true },
    });
    const [group] = buildItemsPayload({
      isGroup: true, selectedItemIds: [11], groupHotelIds: [3], hotelQtys: { 11: { 3: "400" } }, itemSamples: { 11: true },
    });
    expect(single.sample_required).toBe(true);
    expect(group.sample_required).toBe(true);
  });

  test("splitFromItems rebuilds the wizard's split from a saved draft", () => {
    expect(splitFromItems([
      { product_variant_id: 11, hotel_qtys: [{ hotel_id: 3, indicative_qty: 400 }, { hotel_id: 4, indicative_qty: 0 }] },
      { product_variant_id: 12 },
    ])).toEqual({ 11: { 3: "400", 4: "0" } });
  });
});

describe("uncoveredHotelIds", () => {
  test("names the selected hotels no eligible vendor serves", () => {
    const vendors = [{ id: 1, hotel_ids: [3] }, { id: 2, hotel_ids: [3, 5] }];
    expect(uncoveredHotelIds(vendors, [3, 4, 5])).toEqual([4]);
  });
});

describe("hotel labels", () => {
  test("hotelCode abbreviates a hotel name", () => {
    expect(hotelCode("Goa Beach Resort")).toBe("GBR");
    expect(hotelCode("Mumbai")).toBe("MUM");
    expect(hotelCode("")).toBe("—");
  });

  test("coveredHotelsLabel lists the lead hotel first", () => {
    expect(coveredHotelsLabel([
      { name: "Mumbai Suites" }, { name: "Goa Resort", is_lead: true },
    ])).toBe("Goa Resort (lead), Mumbai Suites");
  });
});
