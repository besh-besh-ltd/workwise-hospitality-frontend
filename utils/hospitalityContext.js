import storageInstance from "@/utils/storageInstance";

const STORAGE_KEY = "hospitality_context_selection";
const EVENT_NAME = "hospitality-context-change";

export const getStoredHospitalityContext = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = storageInstance.getStorage(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const setStoredHospitalityContext = (context) => {
  if (!context) {
    storageInstance.removeStorege(STORAGE_KEY);
  } else {
    storageInstance.setStorage(STORAGE_KEY, JSON.stringify(context));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: context,
      })
    );
  }
};

export const subscribeHospitalityContext = (callback) => {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event) => {
    callback(event.detail || null);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};

