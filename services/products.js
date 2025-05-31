import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

export const searchProducts = (values, type = "products") => {
  if (type == "products") {
    let payload = {
      cat_id: values.cat_id,
      product_name: values.search_key,
      approve_by: values.approved_by,
    };

    return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.post(
          `/products/product-search`,
          payload
        );
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
  } else {
    let payload = {
      cat_id: values.cat_id,
      product_name: values.search_key,
      approve_by: values.approved_by,
    };

    return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.post(
          `/products/vendor-list`,
          payload
        );
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
  }
};

export const searchProductsV2 = (values, type = "products") => {
  if (type == "products") {
    let payload = {
      category_id: values.cat_id,
      search_key: values.search_key,
      vendor_name: values.vendor_name,
      include_variants: true
    };

    return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.post(`/rfq/search-product`, payload);
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
  } else {
    let payload = {
      category_id: values.cat_id,
      search_key: values.search_key,
      approved_by_id: values.approved_by,
      state: values.state == 0 ? "" : values.state,
      city: values.city == 0 ? "" : values.city,
      country: values.country == 0 ? "" : values.country,
      turnOver: values.turnOver,
      vendorType: values.vendorType,
      prevWorkedWith: values.prevWorkedWith,
      vendor_name: values.vendor_name,
      myVendorType: values?.myVendorType?.value ?? "",
      include_variants: true,
      productMakes: values?.selectedMakes?.map((item) => item.make_name),
    };

    return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.post(`/rfq/search-vendor`, payload);
        
        if (values.search_key && (!response?.data?.length || response?.data?.length < 3)) {
          try {
            const variantVendorsResponse = await axiosInstance.post(`/rfq/search-variant-vendors`, {
              search_key: values.search_key
            });
            
            if (variantVendorsResponse?.data?.length > 0) {
              const existingVendorIds = new Set(response.data.map(v => v.id));
              const newVendors = variantVendorsResponse.data.filter(v => !existingVendorIds.has(v.vendor_id));
              
              if (newVendors.length > 0) {
                const formattedVariantVendors = newVendors.map(mapping => ({
                  id: mapping.vendor_id,
                  name: mapping.vendor_name || mapping.vendor_display_name || "Unknown Vendor",
                  email: mapping.vendor_email || "",
                  mobile: mapping.vendor_phone || "",
                  organization_name: mapping.vendor_name || mapping.vendor_display_name || "",
                  from_variant_mapping: true,
                  variant_id: mapping.variant_id,
                  variant_name: mapping.variant_name || "",
                  mapping_id: mapping.mapping_id || mapping.id
                }));
                
                response.data = [...response.data, ...formattedVariantVendors];
              }
            }
          } catch (variantError) {
            console.error("Error fetching variant vendor data:", variantError);
          }
        }
        
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
  }
};

export const searchVariantMappings = (searchTerm) => {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Date.now();
      
      const response = await axiosInstance.post(
        `/rfq/search-variant-products`, 
        { search_key: searchTerm }
      );
      
      if (response?.data?.data) {
        resolve({
          status: 200,
          data: response.data.data
        });
      } else if (response?.data) {
        resolve({
          status: 200,
          data: response.data
        });
      } else {
        resolve({
          status: 200,
          data: []
        });
      }
    } catch (error) {
      console.error("Error searching variant mappings:", error);
      resolve({
        status: 200,
        data: []
      });
    }
  });
};

export const searchVendorsByVariant = (searchTerm) => {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Date.now();
      
      const response = await axiosInstance.post(
        `/rfq/search-variant-vendors`,
        { search_key: searchTerm }
      );
      
      if (response?.data?.data) {
        resolve({
          status: 200,
          data: response.data.data
        });
      } else if (response?.data) {
        resolve({
          status: 200,
          data: response.data
        });
      } else {
        resolve({
          status: 200,
          data: []
        });
      }
    } catch (error) {
      console.error("Error searching vendors by variant:", error);
      resolve({
        status: 200,
        data: []
      });
    }
  });
};

export const vendorProductList = (limit, page, productName, vendorApprove) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `products/vendor-product-list?limit=${limit}&page=${page}&productName=${productName}&vendorApprove=${vendorApprove}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// export const approvedProductList = () => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       let response = await axiosInstance.get(`products/approved-product-list`);
//       resolve(response);
//     } catch (error) {
//       reject({ message: error });
//     }
//   });
// };

export const approvedProductList = (limit = 10, page = 1, searchString, vendorApprove, vendorId, isFeatured) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response;
      let url = `products/approved-product-list?limit=${limit}&page=${page}`;

      const queryParams = [];

      if(searchString){
        queryParams.push(`productName=${searchString}`);
      }
      if(vendorApprove){
        queryParams.push(`vendorApprove=${vendorApprove}`);
      }
      if(vendorId){
        queryParams.push(`vendorId=${vendorId}`);
      }
      if(isFeatured){
        queryParams.push(`isFeatured=${isFeatured}`);
      }
      if (queryParams.length > 0) {
        url += `&${queryParams.join('&')}`;
      }

      response = await axiosInstance.get(url);
      resolve(response);
    } catch (error) {
      reject({ error });
    }
  });
}

export const addProducts = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_API_URL}/products/vendor-product-add`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const exportRfq = (month, year) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(
        `rfq/rfq-list?download=true`,
        { month: month, year: year },
        {
          responseType: "blob", // Set responseType to 'blob' to receive binary data
        }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const exportProduct = (
  limit,
  page,
  productName,
  vendorApprove,
  product_ids,
  downloadAll
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `products/vendor-product-list?limit=${limit}&page=${page}&productName=${productName}&vendorApprove=${vendorApprove}&download=true&product_ids=${product_ids}&downloadAll=${downloadAll}`,
        {
          responseType: "blob", // Set responseType to 'blob' to receive binary data
        }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const updateProducts = (payload, id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.put(
        `${process.env.NEXT_PUBLIC_API_URL}/products/vendor-product-edit/${id}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const productDetails = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/products/vendor-product-details/${id}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const singleProductDetails = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/products/product-details/${id}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const productDelete = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/products/vendor-product-delete/${id}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const rfqReport = (month, year) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(
        `${process.env.NEXT_PUBLIC_API_URL}/rfq/rfq-report`,
        { month: month, year: year }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const parentCategoryList = (slug) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/products/parent-category-list?slug=${slug}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const productListByCategory = (cat_id, page = 1, limit = 200) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/products/product-list-by-category?cat_id=${cat_id}&page=${page}&limit=${limit}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getAllCategories = (page = 1, limit = 10) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/product/category-list?page=${page}&limit=${limit}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getSubCategory = ({parent_id}) => { 
  return new Promise (async (resolve , reject)=>{
    try {
      let response = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/product/category-list/?parent_id=${parent_id}`
      )
      resolve(response.data)
    } catch (err) {
      reject({message : err})
    }
  })
}

export const getProductByProductIdOrCategoryId = ({product_id , category_id}) =>{
  return new Promise (async (resolve , reject)=>{
    try {
     
      const queryParam = category_id 
      ? `category_id=${category_id}` 
      : `product_id=${product_id}`;
      let response  = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/products/products-search-by-name-or-category?${queryParam}`
      );
       resolve(response.data)
    } catch (error) {
      reject(error)
    }
  })
}


export const getProductByProductAndCategorySlug = (productSlug) =>{
  return new Promise (async (resolve , reject)=>{
    try {
     
      let response  = await axiosInstance.get(
        `${process.env.NEXT_PUBLIC_API_URL}/products/products-by-name-category-slug?productSlug=${productSlug}`
      );
       resolve(response.data)
    } catch (error) {
      reject(error)
    }
  })
}


/** 
 * Fetches the product make list from the API.
 * Endpoint: /api/v1/products/product-make-list
 * @returns {Promise<Object>} The response data from the API.
 */
export const getProductMakeList = (variant_id) => {
  return new Promise((resolve, reject) => {
    axiosInstance.get(`${process.env.NEXT_PUBLIC_API_URL}/products/product-make-list?variant_id=${variant_id}`)
      .then(response => resolve(response.data))
      .catch(error => reject(error));
  });
};
