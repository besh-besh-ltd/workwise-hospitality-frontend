const { createSlice } = require("@reduxjs/toolkit");

const initialState = {
  swSubscription: null,
  allTerms: [],
  rfqProducts: [],
  rfqVendors: [],
  rfqFormData: {
    is_published: 1,
    comment: "",
    response_email: "",
    contact_name: "",
    contact_number: "",
    location: "",
    bid_end_date: "",
    company_name: "",
  },
  rfqObjData: {
    terms: [],
    ownTerm: "",
  },
};

Array.prototype.insert = function (index, ...items) {
  this.splice(index, 0, ...items);
};

export const rfqProductsSlice = createSlice({
  name: "rfqProducts",
  initialState,
  reducers: {
    addRfqProduct: (state, action) => {
      let data = {
        product_id: action.payload.product_id,
        predefined_tds_file: action.payload.pd_tds_file_url ? action.payload.pd_tds_file_url : "",
        predefined_qap_file: action.payload.pd_qap_file_url ? action.payload.pd_qap_file_url : "",
        name: action.payload.product_name,
        variant: action.payload.variant ? action.payload.variant : 0,
        spec: [
          {
            title: "Size",
            value: "",
          },
          {
            title: "Spec",
            value: "",
          },
          {
            title: "Quantity",
            value: "",
          },
          {
            title: "Unit",
            value: "",
          },
        ],
        vendors: [],
        comment: "",
        defaultSelectedVAB: "",
        datasheet: "0",
        datasheet_file: "",
        spec_file: "",
        qap: "0",
        qap_file: "",
        user_selected_predefined_tds: false,
        user_selected_predefined_qap: false,
      };

      // Changes made by Imtiaj [28/08/2024]
      let alreadyExistsProducts = state.rfqProducts.filter(
        (item) => item.product_id == action.payload.product_id
      );

      let maxVariant = 0, vendorList = [];
      if (alreadyExistsProducts.length > 0) {
        const maxVariantProduct = alreadyExistsProducts.reduce((max, product) => {
          return (product.variant > max.variant) ? product : max;
        })
        maxVariant = parseInt(maxVariantProduct?.variant) + 1;
      }

      data.variant = maxVariant;
      if(data.vendors.length != 0) {
        vendorList = action.payload.vendors.filter((vendor)=> vendor.selected === true)
      }
      data.vendors = vendorList;
      state.rfqProducts.push(data)

      // if (true) {
      //   // removing condition for varient integration [ranit 27-05-24] alreadyExistsProduct.length <= 0        
      //   const maxVariantProduct = alreadyExistsProducts.reduce((max, product)=> {
      //     return (product.variant > max.variant) ? product : max;
      //   })

      //   data.variant = maxVariantProduct.variant + 1;
      //   data.vendors = action.payload?.vendors?.length > 0 ? action.payload?.vendors : [];
      //   state.rfqProducts.push(data)
      // }
    },

    removeRfqProduct: (state, action) => {

      let remainingProducts = state.rfqProducts.filter((pitem) => {
        if (
          pitem.product_id == action.payload.product_id &&
          pitem.variant == action.payload.variant
        ) {

        } else {
          return pitem;
        }
      });
      state.rfqProducts = remainingProducts;
    },

    addProductSpecValue: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          if (item.spec.length > 0) {
            item.spec.map((specItem) => {
              if (specItem.title == action.payload.title) {
                specItem.value = action.payload.value;
              }
              return specItem;
            });
          }
        }
        return item;
      });
      state.rfqProducts = d;
    },
    addFiles: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          item[action.payload.type] = action.payload.value;
        }
        return item;
      });
      state.rfqProducts = d;
    },
    addComment: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          item.comment = action.payload.value;
        }
        return item;
      });
      state.rfqProducts = d;
    },
    addDatasheet: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          item.datasheet = action.payload.value;
        }
        return item;
      });
      state.rfqProducts = d;
    },
    addQAP: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {
          item.qap = action.payload.value;
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
    setRfqFormData: (state, action) => {
      state.rfqFormData = action.payload;
    },
    clearState: (state, action) => {
      state.rfqFormData = initialState.rfqFormData;
      state.rfqProducts = initialState.rfqProducts;
      state.rfqVendors = initialState.rfqVendors;
    },
    setSwSubscription: (state, action) => {
      state.swSubscription = action.payload;
    },
    removeVendor: (state, action) => {
      if (action?.payload?.product_id) {

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
    setCustomTerms: (state, action) => {
      state.rfqObjData.terms = action.payload;
    },
    setCustomTermsText: (state, action) => {
      state.rfqObjData.ownTerm = action.payload;
      state.rfqFormData.comment = action.payload
    },
    setCompanyName: (state, action) => {
      state.rfqFormData.company_name = action.payload
    },
    setLocation: (state, action) => {
      state.rfqFormData.location = action.payload
    },
    setBidEndDate: (state, action) => {
      state.rfqFormData.bid_end_date = action.payload
    },
    setAllTerms: (state, action) => {
      state.allTerms = action.payload
    },
    setUserSelectedDefaultFile: (state, action) => {
      let d = state.rfqProducts.map((item) => {
        if (item.product_id == action.payload.product_id && item.variant == action.payload.variant) {

          if (action.payload.file_type == "TDS") {
            item.user_selected_predefined_tds = action.payload.is_selected;
          } else {
            item.user_selected_predefined_qap = action.payload.is_selected;
          }
          // if (item.spec.length > 0) {
          //   item.spec.map((specItem) => {
          //     if (specItem.title == action.payload.title) {
          //       specItem.value = action.payload.value;
          //     }
          //     return specItem;
          //   });
          // }
        }
        return item;
      });
      state.rfqProducts = d;
    },
  },
});
export const {
  addRfqProduct,
  addProductSpec,
  addProductSpecValue,
  addFiles,
  addComment,
  addDatasheet,
  addVendor,
  setRfqFormData,
  clearState,
  addQAP,
  removeRfqProduct,
  setSwSubscription,
  removeVendor,
  setDefaultVAB,
  setCustomTerms,
  setCustomTermsText,
  setCompanyName,
  setLocation,
  setBidEndDate,
  setAllTerms,
  setUserSelectedDefaultFile
} = rfqProductsSlice.actions;

export default rfqProductsSlice.reducer;
