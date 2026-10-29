// The upload instance's error interceptor. A network error (offline, CORS,
// a dropped connection) has no `response`, and the caller must still get the
// original error, not "Cannot read properties of undefined (reading 'status')".

jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { getStorage: () => "tok", setStorage: jest.fn(), removeStorege: jest.fn() },
}));
jest.mock("@/redux/store", () => ({ __esModule: true, store: { dispatch: jest.fn() } }));
jest.mock("@/redux/slice", () => ({ __esModule: true, clearUserProfile: jest.fn(() => ({ type: "clear" })) }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { error: jest.fn() } }));

import axiosFormData from "./axiosFormData";
import { toast } from "react-toastify";

const networkError = async (config) => {
  const err = new Error("Network Error");
  err.config = config;
  err.code = "ERR_NETWORK";
  throw err;
};

const failWith = (status, data) => async (config) => {
  const err = new Error(`Request failed with status code ${status}`);
  err.config = config;
  err.response = { status, data, headers: {}, config };
  throw err;
};

test("a network error reaches the caller as itself", async () => {
  await expect(axiosFormData.post("/po/1/send-back", new FormData(), { adapter: networkError })).rejects.toMatchObject({
    message: "Network Error",
    code: "ERR_NETWORK",
  });
});

test("a server error still toasts its field errors and rejects", async () => {
  await expect(
    axiosFormData.post("/po/1/send-back", new FormData(), { adapter: failWith(400, { errors: { files: "Too big" } }) })
  ).rejects.toMatchObject({ response: { status: 400 } });
  expect(toast.error).toHaveBeenCalledWith("Too big");
});
