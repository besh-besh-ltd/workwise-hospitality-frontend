import axiosInstance from "@/lib/axios";

export const contactUsFormService = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/cms/contact-us`, values);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const registerInterestService = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/cms/register-interest`, values);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};
