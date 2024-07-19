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
                `/users/buyer-subscription-payment`,
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
                `/users/buyer-coupon-check`,
                payload
            );
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
}