import storageInstance from "@/utils/storageInstance";
import axios from "axios";
import { toast } from "react-toastify";

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});
axiosInstance.interceptors.request.use(
  (config) => {
    const token = storageInstance.getStorage("token");
    if (token != null) {
      config.headers.Authorization = "Bearer " + token;
    }
    return config;
  },
  (error) => {
    Promise.reject(error);
  }
);
axiosInstance.interceptors.response.use(
  function (response) {
    return response.data;
  },
  function (error) {
   
    if (error.response.status === 401) {
      storageInstance.removeStorege("token");
      let {pathname} =window.location
       window.location.href = "/?redirect="+window.btoa(pathname);
    } else {
		
      if (error?.response?.data?.errors) {
        
        for (const field in error.response.data.errors) {
         
          if (error.response.data.errors.hasOwnProperty(field)) {
            toast.error(`${error.response.data.errors[field]}`)
          }
        }
      }
    }
    // return error;
    return Promise.reject(error);
  }
);

export default axiosInstance;
