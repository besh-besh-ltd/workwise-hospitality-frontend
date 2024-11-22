const { createSlice } = require("@reduxjs/toolkit");
import { getFuturedate } from "@/utils/sharedFunctions";

const initialState = {
  allTerms: [],
  rfq_id: -1,
  rfqProducts: [],
  rfqFormData: {
    is_published: 0,
    comment: "",
    response_email: "",
    contact_name: "",
    contact_number: "",
    company_name: "",
    terms: [],
    term_and_condition_files: [],
    bid_end_date: getFuturedate(),
    rfq_type: "",
    reverse_auction: 1,
    project_id: -1,
    location: "",
  }
};

Array.prototype.insert = function (index, ...items) {
  this.splice(index, 0, ...items);
};

export const rfqProductsSlice = createSlice({
  name: "rfqProducts",
  initialState,
  reducers: {

    intializeRfq: (state, action) => {
      state.rfq_id = action.payload.rfq_id;
      state.rfqFormData = action.payload.rfq_form_data;
      state.rfqProducts = action.payload.rfq_products;
    },

    clearState: (state, action) => {
      return initialState;
    },

    addRfqProduct: (state, action) => {
      let data = {
        product_id: action.payload.product_id,
        // fix here
        datasheet: "",
        qap: "",
        predefined_tds_file: action.payload.pd_tds_file_url ? action.payload.pd_tds_file_url : "",
        predefined_qap_file: action.payload.pd_qap_file_url ? action.payload.pd_qap_file_url : "",
        name: action.payload.product_name,
        variant: action.payload.variant ? action.payload.variant : 0,
        spec: [
          { title: "Size", value: "" },
          { title: "Spec", value: "" },
          { title: "Quantity", value: "" },
          { title: "Unit", value: "" },
        ],
        vendors: [],
        comment: "",
        defaultSelectedVAB: "",
        datasheet_file: [],
        spec_file: [],
        qap_file: [],
        user_selected_predefined_tds: false,
        user_selected_predefined_qap: false,
      };

      // Changes made by Imtiaj [28/08/2024]
      let alreadyExistsProducts = state.rfqProducts.filter(
        (item) => item.product_id == action.payload.product_id
      );

      let maxVariant = 0;
      if (alreadyExistsProducts.length > 0) {
        const maxVariantProduct = alreadyExistsProducts.reduce((max, product) => {
          return (product.variant > max.variant) ? product : max;
        })
        maxVariant = parseInt(maxVariantProduct?.variant) + 1;
      }

      data.variant = maxVariant;
      data.vendors = action.payload.vendors || [];
      state.rfqProducts.push(data)
    },

    removeRfqProduct: (state, action) => {
      const updatedProductList = state.rfqProducts.filter(
        (pitem) => {
          if (pitem.product_id === action.payload.product_id &&
            pitem.variant === action.payload.variant) {
            // Exclude this product
          }
          else return pitem;
        });
        state.rfqProducts = updatedProductList;
    },

    addProductSpecValue: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          if (!item.spec) {
            item.spec = [
              { title: "Size", value: "" },
              { title: "Spec", value: "" },
              { title: "Quantity", value: "" },
              { title: "Unit", value: "" },
            ];
          }
          item.spec.map((specItem) => {
            if (specItem.title == action.payload.title) {
              specItem.value = action.payload.value;
            }
            return specItem;
          });
        }
        return item;
      });
      state.rfqProducts = d;
    },

    addFiles: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          item[action.payload.type].push(action.payload.value);
        }
        return item;
      });
      state.rfqProducts = d;
    },

    removeFiles: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          item[action.payload.type] = item[action.payload.type].filter((file_link) => file_link !== action.payload.value)
        }
        return item;
      });
      state.rfqProducts = d;
    },

    addProductComment: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          item.comment = action.payload.value;
        }
        return item;
      });
      state.rfqProducts = d;
    },

    addVendor: (state, action) => {
      // Changes made by Imtiaj [31/08/2024]
      let alreadyExistsProducts = state.rfqProducts.filter(
        (item) => item.product_id == action.payload.product_id
      );

      let maxVariant = 0;
      if (alreadyExistsProducts.length > 0) {
        const maxVariantProduct = alreadyExistsProducts.reduce((max, product) => {
          return (product.variant > max.variant) ? product : max;
        })
        maxVariant = parseInt(maxVariantProduct?.variant);
      }

      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == maxVariant) {
          if (item.vendors.length > 0) {
            let existsVendor = item.vendors.filter((vendor) => {
              if (vendor.user_id == action.payload.id) {
                return vendor;
              }
            });
            if (existsVendor.length > 0) {
            } else {
              item.vendors.push({
                user_id: action.payload.id,
                name: action.payload.name,
              });
            }
          } else {
            item.vendors.push({
              user_id: action.payload.id,
              name: action.payload.name,
            });
          }
        }
        return item;
      });
      state.rfqProducts = d;
    },

    removeVendor: (state, action) => {
      if (action.payload?.product_id) {
        let updatedProducts = state.rfqProducts.map((product) => {
          if (product.product_id == action.payload.product_id && product.variant == action.payload.variant) {
            let v = product.vendors.filter((vendor) => vendor.user_id != action.payload.vendor_id);
            product.vendors = v;
          }
          return product;
        });
        state.rfqProducts = updatedProducts;
      }
    },

    setAllTerms: (state, action) => {
      let updatedTerms = action.payload.map((termData) => {
        let checked = state.rfqFormData.terms.some((item) => item.id == termData.id);
        return { ...termData, selected: checked }
      })
      state.allTerms = updatedTerms;
    },

    setTermsData: (state, action) => {
      let d = state.allTerms.map((termData) => {
        let checked = action.payload.some((selectedTerm) => selectedTerm.id == termData.id);
        termData.selected = checked;
        return termData;
      })
      state.allTerms = d;
      state.rfqFormData.terms = action.payload;
    },

    setTermFiles: (state, action) => {
      let updatedTermFiles = [];
      if (action.payload.type === "add") {
        updatedTermFiles = [...state.rfqFormData.term_and_condition_files, action.payload.value]
      }
      else {
        updatedTermFiles = state.rfqFormData.term_and_condition_files.filter((file) => file != action.payload.value);
      }
      state.rfqFormData.term_and_condition_files = updatedTermFiles;
    },

    setOtherFormFields: (state, action) => {
      const { field_name, value } = action.payload;
      state.rfqFormData[field_name] = value;
    },

    setSwSubscription: (state, action) => {
      state.swSubscription = action.payload;
    },

    setDefaultVAB: (state, action) => {
      if (action?.payload?.product_id) {
        let updatedProducts = state.rfqProducts.map((product) => {
          if (product.product_id == action.payload.product_id) {
            product.defaultSelectedVAB = action.payload.selectedVbaa;
          }

          return product;
        });
        state.rfqProducts = updatedProducts;
      }
    },

    setUserSelectedDefaultFile: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {

          if (action.payload.file_type == "TDS") {
            item.user_selected_predefined_tds = action.payload.is_selected;
          } else {
            item.user_selected_predefined_qap = action.payload.is_selected;
          }
        }
        return item;
      });
      state.rfqProducts = d;
    },
  },
});

export const {
  intializeRfq,
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
} = rfqProductsSlice.actions;

export default rfqProductsSlice.reducer;
