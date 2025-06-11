import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";
import storageInstance from "@/utils/storageInstance";

export const BookaCall = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/users/book-demo`, values);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};


export const LoginService = (values, confirm) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/users/login?conform=${confirm}`, values);
			storageInstance.setStorage("token", response.token);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const RegisterService = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let mobile = values.mobile;
			if (values.mobile && values.countryCode) {
				const cleanMobile = values.mobile.replace(/^\+\d+\-/, '').trim();
				mobile = `${values.countryCode}-${cleanMobile}`.substring(0, 15);
			}
			
			let response = await axiosInstance.post(
				`/users/company-registration`,
				{
					...values,
					mobile: mobile,
					user_type: values.register_as || "3" // Default to vendor (3) if not specified
				}
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getUserDetails = () => {
	let token = storageInstance.getStorage("token");
	return parseJwt(token);
};

const parseJwt = (token) => {
	if (!token) {
		return;
	}
	const base64Url = token.split(".")[1];
	const base64 = base64Url.replace("-", "+").replace("_", "/");
	// return JSON.parse(window.atob(base64));
	const payload = JSON.parse(window.atob(base64));
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
        return;
    }
    
    return payload;
};

export const getProfile = (token=null) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/get-profile${token==null ? `` : `?token=`+ token}`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const updateProfile = (values, user_id) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.put(
				`/users/update-user-detail/`,
				values
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const updatecompany = (values, user_id) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.put(
				`/users/update-company-detail`,
				values
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const changePasswordService = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/users/change-password`, values);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const forgetPasswordService = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(
				`/users/forgot-password-otp-send`,
				values
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const forgetPasswordValiationService = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(
				`/users/forgot-password-otp-authenticate`,
				values
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const handleChangeProfilePicture = (file) => {
	let payload = {};
	payload.file = file;
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosFormData.post(
				`${process.env.NEXT_PUBLIC_API_URL}/users/update-profile-image`,
				payload
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const handleSocialLogin = (payload, confirm) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(
				`${process.env.NEXT_PUBLIC_API_URL}/users/social-login?conform=${confirm}`,
				payload
			);
			storageInstance.setStorage("token", response.token);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getVendorApproveList = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/vendorapprove-list`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const handleUploadFiles = (files, type) => {
	const payload = new FormData();
	files.forEach((file, i) => {
		payload.append(`file`, file, file.name);
	});
	payload.append(`doc_type`, type);
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosFormData.post(
				`${process.env.NEXT_PUBLIC_API_URL}/users/upload-file`,
				payload
			);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getProfileDocuments = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/get-profile-documents`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const SWSubscribe = (payload) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/users/notifications/subscribe`,JSON.stringify(payload));
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getReviews = (payload) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/vendor-review-list`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getCommunicaitonList = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/communication-settings-list`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};
export const getCommunicaitonSettings = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/communication-settings`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const setCommunicaitonSettings = (payload) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/users/communication-settings`,payload);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};


export const getDashboardData = (payload) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/users/get-dashboard-data`, payload);
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

  export const deleteSpoc = (spocId) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.delete(`users/delete-spoc/${spocId}`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
  }

export const createBuyerCompanyUser = (values) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.post(`/users/create-buyer-company-user`, values);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getCompanyUsers = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/company-users`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getUserProjectsByUserId = (userId) => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/projects/user/${userId}/projects`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};

export const getBuyerAccountLimits = () => {
	return new Promise(async (resolve, reject) => {
		try {
			let response = await axiosInstance.get(`/users/buyer-account-limits`);
			resolve(response);
		} catch (error) {
			reject({ message: error });
		}
	});
};
export const updateUserAccount = (userId, accountData) => {
    return new Promise(async (resolve, reject) => {
        try {
            const payload = {
                user_id: userId,
                name: accountData.name,
                email: accountData.email,
                mobile: accountData.mobile,
                status: accountData.status === "active" ? 1 : 0
            };
            
            if (accountData.role) {
                payload.user_type = Number(accountData.role);
            }
            
            let response = await axiosInstance.put(`users/update-user-detail`, payload);
            resolve(response);
        } catch (error) {
            reject({ message: error });
        }
    });
};


