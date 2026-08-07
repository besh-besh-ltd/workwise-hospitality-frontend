import axiosInstance from "@/lib/axios";

export const getVapidPublicKey = () => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.get(`/users/notifications/vapid-public-key`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const subscribePush = (subscription) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.post(
				`/users/notifications/push-subscribe`,
				{ subscription }
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const unsubscribePush = (endpoint) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.delete(
				`/users/notifications/push-subscribe`,
				{ data: { endpoint } }
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const listNotifications = (page = 1, limit = 20) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.get(
				`/users/notifications/list?page=${page}&limit=${limit}`
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getUnreadCount = () => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.get(`/users/notifications/unread-count`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

// Called when the bell is opened: everything outstanding counts as seen-in-tray
// so the badge clears, while the unread highlight stays until an item is opened.
// Pass `ids` to deliver only a subset.
export const markNotificationsDelivered = (ids = null) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.post(
				`/users/notifications/mark-delivered`,
				ids ? { ids } : {}
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const markNotificationRead = (id) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.post(
				`/users/notifications/mark-read/${id}`
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const markAllNotificationsRead = () => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.post(
				`/users/notifications/mark-all-read`
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};
