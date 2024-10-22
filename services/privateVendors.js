import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

export const addPrivateVendor = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(`users/buyer-private-vendor`, payload);
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
};

export const addBulkPrivateVendors = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosFormData.post(`users/buyer-excel-add-vendor`, payload);
            resolve(response);
        } catch (error) {
            reject({ message: error });
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

export const privateVendorList = () => {
    return new Promise(async (resolve, reject) => {
      try {
        let response = await axiosInstance.get(
        //   `users/buyer-private-vendor?limit=${limit}&page=${page}`
            `users/buyer-private-vendor`
        );
        resolve(response);
      } catch (error) {
        reject({ message: error });
      }
    });
  };


  export const editSpoc = (payload,spocId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.put(`users/update-spoc/${spocId}`, payload);
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
  }

  export const addSpoc = (payload) => {
    return new Promise(async (resolve, reject)=> {
        try{
            let response = await axiosInstance.post(`users/add-spoc`,payload);
            resolve(response);
        } catch (error){
            reject({message: error});
        }
    })
  }
  
