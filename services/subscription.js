import axiosInstance from "@/lib/axios";


export const loadScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

export const getSubscriptionList = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.get(`/cms/subscription-list`);
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const proceedToSubscription = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/users/subscription-payment`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const testRazorPayEndpoint = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/users/test-razorpay-webhook`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const applyCoupon = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/users/coupon-check`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const hospitalitySubscriptionPayment = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/hospitality/subscription-payment`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const getVendorSubscriptionStatus = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.get(
                `/hospitality/vendor/subscription-status`
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const renewHospitalitySubscription = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/hospitality/renew-subscription`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const verifyHospitalityPayment = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/hospitality/verify-payment`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

// WH-74: Vendor self-service subscription management

export const getVendorSubscriptionSummary = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.get(
                `/hospitality/vendor/subscription-summary`
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const previewSubscriptionModification = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/hospitality/vendor/subscription/preview`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const modifySubscription = (payload) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/hospitality/vendor/subscription/modify`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const extendSubscription = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.post(
                `/hospitality/vendor/subscription/extend`
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const downloadPaymentDocument = (paymentId, type = 'invoice') => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.get(
                `/hospitality/vendor/subscription/download/${paymentId}?type=${type}`,
                { responseType: 'blob' }
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}

export const getVendorPaymentHistory = (limit = 50, offset = 0) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = await axiosInstance.get(
                `/hospitality/vendor/subscription/payment-history?limit=${limit}&offset=${offset}`
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}