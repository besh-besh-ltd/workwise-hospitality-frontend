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

// Filters are sent to the server, not applied to the returned page: filtering a
// 20-row buffer client-side makes "Unread" mean "unread among the most recent
// 20", which is not what the tab says.
export const listNotifications = (page = 1, limit = 20, { category, unreadOnly } = {}) => {
	return new Promise(async (resolve, reject) => {
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(limit) });
			if (category && category !== "all") params.set("category", category);
			if (unreadOnly) params.set("unread", "1");
			const response = await axiosInstance.get(
				`/users/notifications/list?${params.toString()}`
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

// Clear a single item you have dealt with. Soft delete server-side — the row
// stays as the audit record that this person was asked to act.
export const dismissNotification = (id) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.post(
				`/users/notifications/dismiss/${id}`
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

// Undo for a misclick. Does not reset delivery — the badge stays cleared.
export const markNotificationUnread = (id) => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.post(
				`/users/notifications/mark-unread/${id}`
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getNotificationCategories = () => {
	return new Promise(async (resolve, reject) => {
		try {
			const response = await axiosInstance.get(`/users/notifications/categories`);
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
