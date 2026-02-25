/**
 * Comprehensive tests for the rfqProductsSlice Redux reducer.
 *
 * The slice manages all state related to RFQ/Tender creation, including
 * products, specs, vendors, files, terms, and form metadata.
 */

// Mock the shared utility before importing the slice so that the module-level
// call to getFuturedate() inside initialState receives the fixed value.
jest.mock("@/utils/sharedFunctions", () => ({
  getFuturedate: jest.fn(() => "2026-03-27"),
}));

import reducer, {
  intializeRfq,
  setStoreLoading,
  clearState,
  addRfqProduct,
  removeRfqProduct,
  addProductSpecValue,
  addFiles,
  removeFiles,
  addProductComment,
  addVendor,
  removeVendor,
  setAllTerms,
  setTermsData,
  setTermFiles,
  setOtherFormFields,
  setSwSubscription,
  setDefaultVAB,
  setUserSelectedDefaultFile,
} from "@/redux/slice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a fresh copy of the initial state.  We derive it by running the
 * reducer with `undefined` state and a dummy action so that Redux Toolkit
 * returns the initialState defined inside the slice.
 */
const getInitialState = () => reducer(undefined, { type: "@@INIT" });

/**
 * Builds a minimal product payload accepted by addRfqProduct.
 */
const makeProductPayload = (overrides = {}) => ({
  product_id: 101,
  product_name: "Steel Rod",
  pd_tds_file_url: "",
  pd_qap_file_url: "",
  variant: 0,
  vendors: [],
  ...overrides,
});

/**
 * Returns a state that already contains one product (product_id 101, variant 0)
 * so that actions targeting a specific product can be tested conveniently.
 */
const stateWithOneProduct = () => {
  const base = getInitialState();
  return reducer(base, addRfqProduct(makeProductPayload()));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("rfqProductsSlice reducer", () => {
  // -----------------------------------------------------------------------
  // Initialization sanity check
  // -----------------------------------------------------------------------
  it("should return the initial state when called with undefined state", () => {
    const state = getInitialState();

    expect(state.storeLoading).toBe(false);
    expect(state.allTerms).toEqual([]);
    expect(state.rfq_id).toBe(-1);
    expect(state.rfqProducts).toEqual([]);
    expect(state.rfqFormData.is_published).toBe(0);
    expect(state.rfqFormData.bid_end_date).toBe("2026-03-27 23:59:00");
    expect(state.rfqFormData.ra_end_date).toBe("2026-03-27");
    expect(state.rfqFormData.reverse_auction).toBe(1);
    expect(state.rfqFormData.project_id).toBe(-1);
    expect(state.rfqFormData.hospitality_company_id).toBeNull();
    expect(state.rfqFormData.hotel_id).toBeNull();
    expect(state.rfqFormData.department_id).toBeNull();
    expect(state.rfqFormData.process_id).toBeNull();
    expect(state.rfqFormData.title).toBe("");
  });

  // -----------------------------------------------------------------------
  // intializeRfq
  // -----------------------------------------------------------------------
  describe("intializeRfq", () => {
    it("should set rfq_id, rfqFormData, and rfqProducts from payload", () => {
      const formData = { is_published: 1, comment: "Test", title: "My RFQ" };
      const products = [{ product_id: 1, name: "Pipe" }];
      const state = reducer(
        getInitialState(),
        intializeRfq({
          rfq_id: 42,
          rfq_form_data: formData,
          rfq_products: products,
        })
      );

      expect(state.rfq_id).toBe(42);
      expect(state.rfqFormData).toEqual(formData);
      expect(state.rfqProducts).toEqual(products);
    });

    it("should overwrite previous rfq_id and products", () => {
      let state = reducer(
        getInitialState(),
        intializeRfq({
          rfq_id: 1,
          rfq_form_data: { title: "First" },
          rfq_products: [{ product_id: 10 }],
        })
      );
      state = reducer(
        state,
        intializeRfq({
          rfq_id: 2,
          rfq_form_data: { title: "Second" },
          rfq_products: [],
        })
      );

      expect(state.rfq_id).toBe(2);
      expect(state.rfqFormData.title).toBe("Second");
      expect(state.rfqProducts).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // clearState
  // -----------------------------------------------------------------------
  describe("clearState", () => {
    it("should reset state back to initialState", () => {
      const initial = getInitialState();
      let state = reducer(initial, setStoreLoading(true));
      state = reducer(state, addRfqProduct(makeProductPayload()));
      // Verify state was mutated
      expect(state.storeLoading).toBe(true);
      expect(state.rfqProducts.length).toBe(1);

      state = reducer(state, clearState());
      expect(state.storeLoading).toBe(false);
      expect(state.rfqProducts).toEqual([]);
      expect(state.rfq_id).toBe(-1);
    });
  });

  // -----------------------------------------------------------------------
  // setStoreLoading
  // -----------------------------------------------------------------------
  describe("setStoreLoading", () => {
    it("should set storeLoading to true", () => {
      const state = reducer(getInitialState(), setStoreLoading(true));
      expect(state.storeLoading).toBe(true);
    });

    it("should set storeLoading to false", () => {
      let state = reducer(getInitialState(), setStoreLoading(true));
      state = reducer(state, setStoreLoading(false));
      expect(state.storeLoading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // addRfqProduct
  // -----------------------------------------------------------------------
  describe("addRfqProduct", () => {
    it("should add a product with variant 0 when no duplicate exists", () => {
      const state = stateWithOneProduct();
      expect(state.rfqProducts).toHaveLength(1);

      const product = state.rfqProducts[0];
      expect(product.product_id).toBe(101);
      expect(product.variant).toBe(0);
      expect(product.name).toBe("Steel Rod");
      expect(product.spec).toEqual([
        { title: "Size", value: "" },
        { title: "Spec", value: "" },
        { title: "Quantity", value: "" },
        { title: "Unit", value: "" },
      ]);
      expect(product.vendors).toEqual([]);
      expect(product.comment).toBe("");
      expect(product.defaultSelectedVAB).toBe("");
      expect(product.datasheet_file).toEqual([]);
      expect(product.spec_file).toEqual([]);
      expect(product.qap_file).toEqual([]);
      expect(product.user_selected_predefined_tds).toBe(false);
      expect(product.user_selected_predefined_qap).toBe(false);
    });

    it("should auto-increment variant for duplicate product_id", () => {
      let state = stateWithOneProduct();
      state = reducer(state, addRfqProduct(makeProductPayload()));
      state = reducer(state, addRfqProduct(makeProductPayload()));

      expect(state.rfqProducts).toHaveLength(3);
      expect(state.rfqProducts[0].variant).toBe(0);
      expect(state.rfqProducts[1].variant).toBe(1);
      expect(state.rfqProducts[2].variant).toBe(2);
    });

    it("should not conflict variants across different product_ids", () => {
      let state = stateWithOneProduct(); // product_id 101, variant 0
      state = reducer(
        state,
        addRfqProduct(makeProductPayload({ product_id: 202, product_name: "Cement" }))
      );

      expect(state.rfqProducts).toHaveLength(2);
      expect(state.rfqProducts[1].product_id).toBe(202);
      expect(state.rfqProducts[1].variant).toBe(0);
    });

    it("should assign predefined file URLs when provided", () => {
      const state = reducer(
        getInitialState(),
        addRfqProduct(
          makeProductPayload({
            pd_tds_file_url: "https://cdn.example.com/tds.pdf",
            pd_qap_file_url: "https://cdn.example.com/qap.pdf",
          })
        )
      );
      const product = state.rfqProducts[0];
      expect(product.predefined_tds_file).toBe("https://cdn.example.com/tds.pdf");
      expect(product.predefined_qap_file).toBe("https://cdn.example.com/qap.pdf");
    });

    it("should attach vendors from payload", () => {
      const vendors = [{ user_id: 10, name: "Vendor A" }];
      const state = reducer(
        getInitialState(),
        addRfqProduct(makeProductPayload({ vendors }))
      );
      expect(state.rfqProducts[0].vendors).toEqual(vendors);
    });
  });

  // -----------------------------------------------------------------------
  // removeRfqProduct
  // -----------------------------------------------------------------------
  describe("removeRfqProduct", () => {
    it("should remove the product matching product_id and variant", () => {
      let state = stateWithOneProduct();
      state = reducer(
        state,
        removeRfqProduct({ product_id: 101, variant: 0 })
      );
      expect(state.rfqProducts).toHaveLength(0);
    });

    it("should only remove the correct variant, leaving others intact", () => {
      let state = stateWithOneProduct();
      state = reducer(state, addRfqProduct(makeProductPayload())); // variant 1
      expect(state.rfqProducts).toHaveLength(2);

      state = reducer(state, removeRfqProduct({ product_id: 101, variant: 0 }));
      expect(state.rfqProducts).toHaveLength(1);
      expect(state.rfqProducts[0].variant).toBe(1);
    });

    it("should do nothing when no matching product exists", () => {
      const state = stateWithOneProduct();
      const next = reducer(
        state,
        removeRfqProduct({ product_id: 999, variant: 0 })
      );
      expect(next.rfqProducts).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // addProductSpecValue
  // -----------------------------------------------------------------------
  describe("addProductSpecValue", () => {
    it("should update an existing spec title with a new value", () => {
      const state = reducer(
        stateWithOneProduct(),
        addProductSpecValue({
          product_id: 101,
          variant: 0,
          title: "Size",
          value: "12mm",
        })
      );
      const spec = state.rfqProducts[0].spec;
      expect(spec.find((s) => s.title === "Size").value).toBe("12mm");
    });

    it("should add a new spec entry when title does not exist", () => {
      const state = reducer(
        stateWithOneProduct(),
        addProductSpecValue({
          product_id: 101,
          variant: 0,
          title: "Color",
          value: "Red",
        })
      );
      const spec = state.rfqProducts[0].spec;
      expect(spec).toHaveLength(5);
      expect(spec[4]).toEqual({ title: "Color", value: "Red" });
    });

    it("should not affect products with a different product_id", () => {
      let state = stateWithOneProduct();
      state = reducer(
        state,
        addRfqProduct(makeProductPayload({ product_id: 202, product_name: "Cement" }))
      );
      state = reducer(
        state,
        addProductSpecValue({
          product_id: 101,
          variant: 0,
          title: "Size",
          value: "8mm",
        })
      );
      // Product 202 should remain untouched.
      const cement = state.rfqProducts.find((p) => p.product_id === 202);
      expect(cement.spec.find((s) => s.title === "Size").value).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // addFiles
  // -----------------------------------------------------------------------
  describe("addFiles", () => {
    it("should push a file to the correct file array on the matching product", () => {
      const state = reducer(
        stateWithOneProduct(),
        addFiles({
          product_id: 101,
          variant: 0,
          type: "datasheet_file",
          value: "https://cdn.example.com/datasheet.pdf",
        })
      );
      expect(state.rfqProducts[0].datasheet_file).toEqual([
        "https://cdn.example.com/datasheet.pdf",
      ]);
    });

    it("should append to an existing file array", () => {
      let state = stateWithOneProduct();
      state = reducer(
        state,
        addFiles({
          product_id: 101,
          variant: 0,
          type: "spec_file",
          value: "file1.pdf",
        })
      );
      state = reducer(
        state,
        addFiles({
          product_id: 101,
          variant: 0,
          type: "spec_file",
          value: "file2.pdf",
        })
      );
      expect(state.rfqProducts[0].spec_file).toEqual(["file1.pdf", "file2.pdf"]);
    });
  });

  // -----------------------------------------------------------------------
  // removeFiles
  // -----------------------------------------------------------------------
  describe("removeFiles", () => {
    it("should remove the specified file from the matching product", () => {
      let state = stateWithOneProduct();
      state = reducer(
        state,
        addFiles({
          product_id: 101,
          variant: 0,
          type: "qap_file",
          value: "qap1.pdf",
        })
      );
      state = reducer(
        state,
        addFiles({
          product_id: 101,
          variant: 0,
          type: "qap_file",
          value: "qap2.pdf",
        })
      );
      state = reducer(
        state,
        removeFiles({
          product_id: 101,
          variant: 0,
          type: "qap_file",
          value: "qap1.pdf",
        })
      );
      expect(state.rfqProducts[0].qap_file).toEqual(["qap2.pdf"]);
    });

    it("should leave the array unchanged if the file does not exist", () => {
      let state = stateWithOneProduct();
      state = reducer(
        state,
        addFiles({
          product_id: 101,
          variant: 0,
          type: "datasheet_file",
          value: "a.pdf",
        })
      );
      state = reducer(
        state,
        removeFiles({
          product_id: 101,
          variant: 0,
          type: "datasheet_file",
          value: "nonexistent.pdf",
        })
      );
      expect(state.rfqProducts[0].datasheet_file).toEqual(["a.pdf"]);
    });
  });

  // -----------------------------------------------------------------------
  // addProductComment
  // -----------------------------------------------------------------------
  describe("addProductComment", () => {
    it("should set the comment on the matching product", () => {
      const state = reducer(
        stateWithOneProduct(),
        addProductComment({
          product_id: 101,
          variant: 0,
          value: "Urgent requirement",
        })
      );
      expect(state.rfqProducts[0].comment).toBe("Urgent requirement");
    });

    it("should overwrite an existing comment", () => {
      let state = reducer(
        stateWithOneProduct(),
        addProductComment({
          product_id: 101,
          variant: 0,
          value: "First comment",
        })
      );
      state = reducer(
        state,
        addProductComment({
          product_id: 101,
          variant: 0,
          value: "Updated comment",
        })
      );
      expect(state.rfqProducts[0].comment).toBe("Updated comment");
    });
  });

  // -----------------------------------------------------------------------
  // addVendor
  // -----------------------------------------------------------------------
  describe("addVendor", () => {
    it("should add a vendor to the highest-variant product", () => {
      const state = reducer(
        stateWithOneProduct(),
        addVendor({ product_id: 101, id: 55, name: "Vendor X" })
      );
      expect(state.rfqProducts[0].vendors).toEqual([
        { user_id: 55, name: "Vendor X" },
      ]);
    });

    it("should prevent duplicate vendors (same user_id)", () => {
      let state = reducer(
        stateWithOneProduct(),
        addVendor({ product_id: 101, id: 55, name: "Vendor X" })
      );
      state = reducer(
        state,
        addVendor({ product_id: 101, id: 55, name: "Vendor X" })
      );
      expect(state.rfqProducts[0].vendors).toHaveLength(1);
    });

    it("should add vendor to the highest variant when multiple variants exist", () => {
      let state = stateWithOneProduct(); // variant 0
      state = reducer(state, addRfqProduct(makeProductPayload())); // variant 1

      state = reducer(
        state,
        addVendor({ product_id: 101, id: 77, name: "Vendor Y" })
      );

      // Vendor should be on variant 1 (the highest), not variant 0.
      expect(state.rfqProducts[0].vendors).toEqual([]); // variant 0
      expect(state.rfqProducts[1].vendors).toEqual([
        { user_id: 77, name: "Vendor Y" },
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // removeVendor
  // -----------------------------------------------------------------------
  describe("removeVendor", () => {
    it("should remove a vendor by vendor_id from the matching product", () => {
      let state = reducer(
        stateWithOneProduct(),
        addVendor({ product_id: 101, id: 55, name: "Vendor X" })
      );
      state = reducer(
        state,
        addVendor({ product_id: 101, id: 66, name: "Vendor Z" })
      );
      state = reducer(
        state,
        removeVendor({ product_id: 101, variant: 0, vendor_id: 55 })
      );
      expect(state.rfqProducts[0].vendors).toEqual([
        { user_id: 66, name: "Vendor Z" },
      ]);
    });

    it("should do nothing when payload has no product_id", () => {
      let state = reducer(
        stateWithOneProduct(),
        addVendor({ product_id: 101, id: 55, name: "Vendor X" })
      );
      const next = reducer(state, removeVendor({}));
      expect(next.rfqProducts[0].vendors).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // setAllTerms
  // -----------------------------------------------------------------------
  describe("setAllTerms", () => {
    it("should set allTerms with selected=false when no terms in rfqFormData", () => {
      const terms = [
        { id: 1, name: "Payment Terms" },
        { id: 2, name: "Delivery Terms" },
      ];
      const state = reducer(getInitialState(), setAllTerms(terms));

      expect(state.allTerms).toHaveLength(2);
      expect(state.allTerms[0]).toEqual({ id: 1, name: "Payment Terms", selected: false });
      expect(state.allTerms[1]).toEqual({ id: 2, name: "Delivery Terms", selected: false });
    });

    it("should mark terms as selected when their id matches rfqFormData.terms", () => {
      let state = getInitialState();
      // Pre-set some selected terms in the form data.
      state = reducer(
        state,
        setOtherFormFields({ field_name: "terms", value: [{ id: 2, name: "Delivery Terms" }] })
      );
      state = reducer(
        state,
        setAllTerms([
          { id: 1, name: "Payment Terms" },
          { id: 2, name: "Delivery Terms" },
          { id: 3, name: "Warranty Terms" },
        ])
      );

      expect(state.allTerms[0].selected).toBe(false);
      expect(state.allTerms[1].selected).toBe(true);
      expect(state.allTerms[2].selected).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // setTermsData
  // -----------------------------------------------------------------------
  describe("setTermsData", () => {
    it("should store cleaned terms in rfqFormData.terms and update allTerms selection", () => {
      // First populate allTerms
      let state = reducer(
        getInitialState(),
        setAllTerms([
          { id: 1, name: "Payment Terms" },
          { id: 2, name: "Delivery Terms" },
          { id: 3, name: "Warranty Terms" },
        ])
      );

      // Now select terms 1 and 3
      state = reducer(
        state,
        setTermsData([
          { id: 1, name: "Payment Terms" },
          { id: 3, name: "Warranty Terms" },
        ])
      );

      expect(state.rfqFormData.terms).toEqual([
        { id: 1, name: "Payment Terms" },
        { id: 3, name: "Warranty Terms" },
      ]);
      expect(state.allTerms[0].selected).toBe(true);  // id 1
      expect(state.allTerms[1].selected).toBe(false);  // id 2
      expect(state.allTerms[2].selected).toBe(true);  // id 3
    });

    it("should derive name from term_content when name is absent", () => {
      let state = reducer(
        getInitialState(),
        setAllTerms([{ id: 5, name: "Legacy" }])
      );
      state = reducer(
        state,
        setTermsData([{ id: 5, term_content: "Legacy Term" }])
      );
      expect(state.rfqFormData.terms[0].name).toBe("Legacy Term");
    });

    it("should fall back to content[0].title for name resolution", () => {
      let state = reducer(
        getInitialState(),
        setAllTerms([{ id: 6, name: "Content" }])
      );
      state = reducer(
        state,
        setTermsData([{ id: 6, content: [{ title: "From content" }] }])
      );
      expect(state.rfqFormData.terms[0].name).toBe("From content");
    });

    it("should fall back to Term {id} when all name sources are missing", () => {
      let state = reducer(
        getInitialState(),
        setAllTerms([{ id: 7, name: "Seven" }])
      );
      state = reducer(state, setTermsData([{ id: 7 }]));
      expect(state.rfqFormData.terms[0].name).toBe("Term 7");
    });
  });

  // -----------------------------------------------------------------------
  // setTermFiles
  // -----------------------------------------------------------------------
  describe("setTermFiles", () => {
    it("should add a term file when type is 'add'", () => {
      const state = reducer(
        getInitialState(),
        setTermFiles({ type: "add", value: "terms_v1.pdf" })
      );
      expect(state.rfqFormData.term_and_condition_files).toEqual(["terms_v1.pdf"]);
    });

    it("should remove a term file when type is not 'add'", () => {
      let state = reducer(
        getInitialState(),
        setTermFiles({ type: "add", value: "terms_v1.pdf" })
      );
      state = reducer(
        state,
        setTermFiles({ type: "add", value: "terms_v2.pdf" })
      );
      state = reducer(
        state,
        setTermFiles({ type: "remove", value: "terms_v1.pdf" })
      );
      expect(state.rfqFormData.term_and_condition_files).toEqual(["terms_v2.pdf"]);
    });
  });

  // -----------------------------------------------------------------------
  // setOtherFormFields
  // -----------------------------------------------------------------------
  describe("setOtherFormFields", () => {
    it("should update a single field using field_name/value payload", () => {
      const state = reducer(
        getInitialState(),
        setOtherFormFields({ field_name: "rfq_type", value: "open" })
      );
      expect(state.rfqFormData.rfq_type).toBe("open");
    });

    it("should merge an object payload into rfqFormData", () => {
      const state = reducer(
        getInitialState(),
        setOtherFormFields({
          contact_name: "John",
          contact_number: "1234567890",
        })
      );
      expect(state.rfqFormData.contact_name).toBe("John");
      expect(state.rfqFormData.contact_number).toBe("1234567890");
      // Other fields should remain intact.
      expect(state.rfqFormData.rfq_type).toBe("");
    });

    it("should update hospitality context fields", () => {
      const state = reducer(
        getInitialState(),
        setOtherFormFields({
          field_name: "hospitality_company_id",
          value: 5,
        })
      );
      expect(state.rfqFormData.hospitality_company_id).toBe(5);
    });

    it("should update tender-specific fields", () => {
      let state = reducer(
        getInitialState(),
        setOtherFormFields({ field_name: "is_tender", value: 1 })
      );
      state = reducer(
        state,
        setOtherFormFields({ field_name: "tender_fees", value: 500 })
      );
      expect(state.rfqFormData.is_tender).toBe(1);
      expect(state.rfqFormData.tender_fees).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // setDefaultVAB
  // -----------------------------------------------------------------------
  describe("setDefaultVAB", () => {
    it("should set defaultSelectedVAB on the matching product", () => {
      const state = reducer(
        stateWithOneProduct(),
        setDefaultVAB({ product_id: 101, selectedVbaa: "VAB-A" })
      );
      expect(state.rfqProducts[0].defaultSelectedVAB).toBe("VAB-A");
    });

    it("should do nothing when payload has no product_id", () => {
      const state = reducer(stateWithOneProduct(), setDefaultVAB({}));
      expect(state.rfqProducts[0].defaultSelectedVAB).toBe("");
    });

    it("should update all variants of the same product_id", () => {
      let state = stateWithOneProduct(); // variant 0
      state = reducer(state, addRfqProduct(makeProductPayload())); // variant 1

      state = reducer(
        state,
        setDefaultVAB({ product_id: 101, selectedVbaa: "VAB-B" })
      );

      // The reducer matches on product_id only (not variant), so both get updated.
      expect(state.rfqProducts[0].defaultSelectedVAB).toBe("VAB-B");
      expect(state.rfqProducts[1].defaultSelectedVAB).toBe("VAB-B");
    });
  });

  // -----------------------------------------------------------------------
  // setUserSelectedDefaultFile
  // -----------------------------------------------------------------------
  describe("setUserSelectedDefaultFile", () => {
    it("should set user_selected_predefined_tds when file_type is TDS", () => {
      const state = reducer(
        stateWithOneProduct(),
        setUserSelectedDefaultFile({
          product_id: 101,
          variant: 0,
          file_type: "TDS",
          is_selected: true,
        })
      );
      expect(state.rfqProducts[0].user_selected_predefined_tds).toBe(true);
      expect(state.rfqProducts[0].user_selected_predefined_qap).toBe(false);
    });

    it("should set user_selected_predefined_qap when file_type is QAP", () => {
      const state = reducer(
        stateWithOneProduct(),
        setUserSelectedDefaultFile({
          product_id: 101,
          variant: 0,
          file_type: "QAP",
          is_selected: true,
        })
      );
      expect(state.rfqProducts[0].user_selected_predefined_qap).toBe(true);
      expect(state.rfqProducts[0].user_selected_predefined_tds).toBe(false);
    });

    it("should toggle selection flags independently", () => {
      let state = reducer(
        stateWithOneProduct(),
        setUserSelectedDefaultFile({
          product_id: 101,
          variant: 0,
          file_type: "TDS",
          is_selected: true,
        })
      );
      state = reducer(
        state,
        setUserSelectedDefaultFile({
          product_id: 101,
          variant: 0,
          file_type: "QAP",
          is_selected: true,
        })
      );
      expect(state.rfqProducts[0].user_selected_predefined_tds).toBe(true);
      expect(state.rfqProducts[0].user_selected_predefined_qap).toBe(true);

      // Now deselect TDS only
      state = reducer(
        state,
        setUserSelectedDefaultFile({
          product_id: 101,
          variant: 0,
          file_type: "TDS",
          is_selected: false,
        })
      );
      expect(state.rfqProducts[0].user_selected_predefined_tds).toBe(false);
      expect(state.rfqProducts[0].user_selected_predefined_qap).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // setSwSubscription (bonus coverage)
  // -----------------------------------------------------------------------
  describe("setSwSubscription", () => {
    it("should set swSubscription on state", () => {
      const sub = { endpoint: "https://push.example.com", keys: { p256dh: "abc" } };
      const state = reducer(getInitialState(), setSwSubscription(sub));
      expect(state.swSubscription).toEqual(sub);
    });
  });

  // -----------------------------------------------------------------------
  // Cross-cutting / integration-style tests
  // -----------------------------------------------------------------------
  describe("complex workflows", () => {
    it("should handle a full product lifecycle: add, spec, file, comment, vendor, remove", () => {
      let state = getInitialState();

      // Add product
      state = reducer(state, addRfqProduct(makeProductPayload()));
      expect(state.rfqProducts).toHaveLength(1);

      // Set spec
      state = reducer(
        state,
        addProductSpecValue({ product_id: 101, variant: 0, title: "Size", value: "10mm" })
      );
      expect(state.rfqProducts[0].spec.find((s) => s.title === "Size").value).toBe("10mm");

      // Add file
      state = reducer(
        state,
        addFiles({ product_id: 101, variant: 0, type: "datasheet_file", value: "ds.pdf" })
      );
      expect(state.rfqProducts[0].datasheet_file).toHaveLength(1);

      // Add comment
      state = reducer(
        state,
        addProductComment({ product_id: 101, variant: 0, value: "Handle with care" })
      );
      expect(state.rfqProducts[0].comment).toBe("Handle with care");

      // Add vendor
      state = reducer(state, addVendor({ product_id: 101, id: 1, name: "V1" }));
      expect(state.rfqProducts[0].vendors).toHaveLength(1);

      // Remove product
      state = reducer(state, removeRfqProduct({ product_id: 101, variant: 0 }));
      expect(state.rfqProducts).toHaveLength(0);
    });

    it("should preserve form data across product mutations", () => {
      let state = getInitialState();
      state = reducer(
        state,
        setOtherFormFields({ field_name: "title", value: "Office Supplies RFQ" })
      );
      state = reducer(state, addRfqProduct(makeProductPayload()));
      state = reducer(state, removeRfqProduct({ product_id: 101, variant: 0 }));

      expect(state.rfqFormData.title).toBe("Office Supplies RFQ");
    });
  });
});
