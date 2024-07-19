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
