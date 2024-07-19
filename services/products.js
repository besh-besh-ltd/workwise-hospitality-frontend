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
      approved_by_id: values.approved_by,
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
    };

    return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.post(`/rfq/search-vendor`, payload);
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
  }
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

export const approvedProductList = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`products/approved-product-list`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addProducts = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(
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
      let response = await axiosFormData.put(
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
