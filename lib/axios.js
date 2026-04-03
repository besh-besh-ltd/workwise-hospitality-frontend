import storageInstance from "@/utils/storageInstance";
import axios from "axios";
import { toast } from "react-toastify";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";
import posthog from 'posthog-js';
import { store } from "@/redux/store";
import { clearUserProfile } from "@/redux/slice";
import React from "react";
import { createRoot } from "react-dom/client";
import SessionExpiredModal from "@/components/shared/SessionExpiredModal";

let sessionExpiredShown = false;

const showSessionExpiredModal = () => {
  if (sessionExpiredShown) return;
  sessionExpiredShown = true;

  // Capture the full current path including query params
  const fullPath = window.location.pathname + window.location.search;

  // Clear auth state
  posthog.reset();
  store.dispatch(clearUserProfile());
  storageInstance.removeStorege("token");
  storageInstance.removeStorege("current-user-type");

  // Mount the modal
  const container = document.createElement('div');
  container.id = 'session-expired-root';
  document.body.appendChild(container);
  const root = createRoot(container);

  const handleRedirect = () => {
    sessionExpiredShown = false;
    root.unmount();
    container.remove();
    const redirectParam = fullPath && fullPath !== '/' ? `?redirect=${encodeURIComponent(fullPath)}` : '';
    window.location.href = `/${redirectParam}`;
  };

  root.render(React.createElement(SessionExpiredModal, { onRedirect: handleRedirect }));
};

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000, // 30 second default timeout for all requests
});
axiosInstance.interceptors.request.use(
  (config) => {
    const token = storageInstance.getStorage("token");
    if (token != null) {
      config.headers.Authorization = "Bearer " + token;
    }
    const hospitalityContext = getStoredHospitalityContext();
    if (hospitalityContext?.companyId) {
      config.headers["X-Hospitality-Company"] = hospitalityContext.companyId;
    }
    if (hospitalityContext?.hotelId) {
      config.headers["X-Hospitality-Hotel"] = hospitalityContext.hotelId;
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

    if (error?.response?.status === 401) {
      showSessionExpiredModal();
      // Swallow the error — don't propagate to callers so no error toasts appear
      return new Promise(() => {});
    }

    // Handle subscription expired (403 with subscription_expired flag)
    if (error?.response?.status === 403 && error?.response?.data?.subscription_expired === true) {
      toast.warning(
        error?.response?.data?.message || "Your subscription has expired. Please renew from your dashboard."
      );
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/dashboard/vendor")) {
        window.location.href = "/dashboard/vendor";
      }
      return Promise.reject(error);
    }

    if (error?.response?.data?.errors) {
      for (const field in error.response.data.errors) {
        if (error.response.data.errors.hasOwnProperty(field)) {
          toast.error(`${error.response.data.errors[field]}`)
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
