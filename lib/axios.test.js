// The shared axios instance stamps the stored session token on every request,
// unless the caller set Authorization itself (the entity switcher fetches the
// new entity's profile with the new token BEFORE that token is stored).

let mockStoredToken = "tok-stored";
jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: {
    getStorage: (key) => (key === "token" ? mockStoredToken : null),
    setStorage: jest.fn(),
    removeStorege: jest.fn(),
  },
}));
jest.mock("@/utils/hospitalityContext", () => ({ __esModule: true, getStoredHospitalityContext: () => null }));
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { reset: jest.fn() } }));
jest.mock("@/redux/store", () => ({ __esModule: true, store: { dispatch: jest.fn() } }));
jest.mock("@/components/shared/SessionExpiredModal", () => ({ __esModule: true, default: () => null }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { warning: jest.fn(), error: jest.fn() } }));

import axiosInstance from "./axios";

/** An adapter that answers with the headers the request was sent with. */
const echoHeaders = async (config) => ({ data: config.headers, status: 200, statusText: "OK", headers: {}, config });
const sentAuthorization = (headers) => (typeof headers.get === "function" ? headers.get("Authorization") : headers.Authorization);

beforeEach(() => {
  mockStoredToken = "tok-stored";
});

test("a request carries the stored token", async () => {
  const headers = await axiosInstance.get("/users/get-profile", { adapter: echoHeaders });
  expect(sentAuthorization(headers)).toBe("Bearer tok-stored");
});

test("an explicit Authorization header is kept, not replaced by the stored token", async () => {
  const headers = await axiosInstance.get("/users/get-profile", {
    adapter: echoHeaders,
    headers: { Authorization: "Bearer tok-new" },
  });
  expect(sentAuthorization(headers)).toBe("Bearer tok-new");
});

test("no stored token and no explicit header: no Authorization", async () => {
  mockStoredToken = null;
  const headers = await axiosInstance.get("/x", { adapter: echoHeaders });
  expect(sentAuthorization(headers)).toBeFalsy();
});
