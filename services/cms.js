import axiosInstance from "@/lib/axios";

// CMS marketing endpoints (`/cms/*`) were retired alongside the
// admin-panel CMS module. Only general dropdown utilities (states,
// cities, countries, country codes) and the vendor-dashboard endpoint
// remain in active use across hospitality dashboard pages.

export const getStates = (country_id) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/general/states/${country_id}`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getCities = (state_id) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`general/cities/${state_id}`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getVendorDashboardData = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/vendor-dashboard-data`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getCountries = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`general/countries`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getCountryCodes = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`general/country-codes`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};
