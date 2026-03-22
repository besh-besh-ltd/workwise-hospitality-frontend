import reducer from "./slice";
import { persistStore, persistReducer } from "redux-persist";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

const { configureStore } = require("@reduxjs/toolkit");

// Next.js SSR-safe storage — noop on the server, real localStorage on the client
const createNoopStorage = () => ({
  getItem() { return Promise.resolve(null); },
  setItem(_key, value) { return Promise.resolve(value); },
  removeItem() { return Promise.resolve(); },
});

const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["userProfile"],
};

const persistedReducer = persistReducer(persistConfig, reducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);
