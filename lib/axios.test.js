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

// Task 26: a rate-contract request the server refuses to an emailed-link guest session
// (403 GUEST_SESSION) is noted for the rate-contract sign-in notice; nothing else is.
describe("rate-contract guest refusals", () => {
  const { isArcGuestRefused, clearArcGuestRefusal } = jest.requireActual("@/utils/arcGuestRefusal");
  const failWith = (status, data) => async (config) => {
    const err = new Error(`Request failed with status code ${status}`);
    err.config = config;
    err.response = { status, data, headers: {}, config };
    throw err;
  };

  afterEach(() => clearArcGuestRefusal());

  test("a GUEST_SESSION 403 from /arc-v2/ is noted, and the caller still gets the rejection", async () => {
    await expect(
      axiosInstance.get("/arc-v2/vendor/active", { adapter: failWith(403, { status: 0, reason: "GUEST_SESSION" }) })
    ).rejects.toMatchObject({ response: { status: 403 } });
    expect(isArcGuestRefused()).toBe(true);
  });

  test("a GUEST_SESSION 403 outside rate contracts, or another 403 on them, is not", async () => {
    await expect(
      axiosInstance.get("/vendor-network/org", { adapter: failWith(403, { status: 0, reason: "GUEST_SESSION" }) })
    ).rejects.toBeTruthy();
    await expect(
      axiosInstance.get("/arc-v2/vendor/contracts/7", { adapter: failWith(403, { status: 0, message: "Not the contracted vendor" }) })
    ).rejects.toBeTruthy();
    expect(isArcGuestRefused()).toBe(false);
  });
});
