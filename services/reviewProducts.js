import axiosInstance from "@/lib/axios";

export const addProductsReviewAPI = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `${process.env.NEXT_PUBLIC_API_URL}/products/vendor-product-accept-review`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
};

export const reviewProductListAPI = (limit, page) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.get(
                `/products/vendor-product-list-review?limit=${limit}&page=${page}`
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
};