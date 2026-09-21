// A rejected service call must never hand a non-string to JSX.
//
// Every function in services/*.js (18 of 22 files, 281 call sites) rejects as
// `reject({ message: error })` — the whole AxiosError wrapped in an object.
// That discards `error.response`, so the usual consumer line
//
//     err?.response?.data?.message || err?.message || "fallback"
//
// resolves to the AxiosError OBJECT, not a string. Rendering it as a React
// child throws `Objects are not valid as a React child (found: [object Error])`,
// which the app-level ErrorBoundary turns into a full-page "Something went
// wrong" — see the vendor Subscription drawer and EditRFQ.
//
// getApiErrorMessage has to read BOTH shapes and always return a string.

import { AxiosError } from "axios";
import { getApiErrorMessage } from "./apiError";

const SERVER_MSG = "One or more selected business units are no longer available.";

const axiosErrorWithBody = (message) => {
  const err = new AxiosError("Request failed with status code 400", "ERR_BAD_REQUEST", {}, {});
  err.response = { status: 400, data: { status: 0, message } };
  return err;
};

describe("getApiErrorMessage", () => {
  it("reads the server message through the services/*.js { message: error } wrap", () => {
    const wrapped = { message: axiosErrorWithBody(SERVER_MSG) };
    expect(getApiErrorMessage(wrapped, "fallback")).toBe(SERVER_MSG);
  });

  it("reads the server message from an unwrapped AxiosError", () => {
    expect(getApiErrorMessage(axiosErrorWithBody(SERVER_MSG), "fallback")).toBe(SERVER_MSG);
  });

  it("falls back to the caller's text when the wrapped error carries no server message", () => {
    const wrapped = { message: new AxiosError("Network Error", "ERR_NETWORK", {}, {}) };
    expect(getApiErrorMessage(wrapped, "Preview failed")).toBe("Preview failed");
  });

  it("passes a plain string message straight through", () => {
    expect(getApiErrorMessage({ message: "Already a string" }, "fallback")).toBe("Already a string");
  });

  it("uses the message of a bare Error", () => {
    expect(getApiErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("falls back for null, undefined and empty input", () => {
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
    expect(getApiErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({}, "fallback")).toBe("fallback");
  });

  // The guarantee the ErrorBoundary depends on.
  it("never returns a non-string, whatever it is handed", () => {
    const nasty = [
      { message: axiosErrorWithBody(SERVER_MSG) },
      { message: new AxiosError("Network Error") },
      { message: { response: { data: { message: { nested: "object" } } } } },
      { message: { toString: null } },
      new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED"),
      { message: 42 },
      { message: [] },
      [],
      0,
      false,
      null,
      undefined,
    ];
    nasty.forEach((input) => {
      expect(typeof getApiErrorMessage(input, "fallback")).toBe("string");
    });
  });
});
