import axiosInstance from "@/lib/axios";

export const HomeBannerService = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/cms/home-banner/1`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const HomeLists1Service = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/cms/get-cms-data/1`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};
