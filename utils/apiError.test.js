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
import { getApiErrorMessage, getApiErrorData, getApiFieldErrors } from "./apiError";

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

// Some endpoints put instructions for the UI in the error body — e.g.
// `show_error_modal: true`, which asks for a recovery dialog rather than a
// toast because the change may have been half-applied. The server always sends
// it on a 500, so it arrives as a rejection and the services wrap hides
// `err.response` — the branch reading it was dead. Same two shapes, one reader.
describe("getApiErrorData", () => {
  const withBody = (data) => {
    const err = new AxiosError("Request failed with status code 500", "ERR_BAD_RESPONSE", {}, {});
    err.response = { status: 500, data };
    return err;
  };

  it("reads the error body through the services wrap", () => {
    const body = { status: 3, show_error_modal: true };
    expect(getApiErrorData({ message: withBody(body) })).toEqual(body);
  });

  it("reads the error body from an unwrapped AxiosError", () => {
    const body = { status: 3, show_error_modal: true };
    expect(getApiErrorData(withBody(body))).toEqual(body);
  });

  it("returns null when there is no error body", () => {
    expect(getApiErrorData(new Error("boom"))).toBeNull();
    expect(getApiErrorData(null)).toBeNull();
    expect(getApiErrorData({})).toBeNull();
  });
});

// An API refusal about ONE field — today, an employee code another account
// already holds — names the field so the form can put the sentence under it.
// The body deliberately carries no `errors` object: lib/axios.js toasts every
// key of one, which would say the same thing twice.
describe("getApiFieldErrors", () => {
  const TAKEN = "Employee code EMP0417 is already used by Ravi Menon.";
  const axiosErrorWith = (data, status = 409) => {
    const err = new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", {}, {});
    err.response = { status, data };
    return err;
  };
  const takenBody = { status: 0, code: "EMPLOYEE_CODE_TAKEN", field: "employee_code", message: TAKEN };

  it("reads the field through the services/*.js { message: error } wrap", () => {
    expect(getApiFieldErrors({ message: axiosErrorWith(takenBody) })).toEqual({ employee_code: TAKEN });
  });

  it("reads an unwrapped AxiosError too", () => {
    expect(getApiFieldErrors(axiosErrorWith(takenBody))).toEqual({ employee_code: TAKEN });
  });

  it("returns null for a refusal that names no field", () => {
    expect(getApiFieldErrors({ message: axiosErrorWith({ status: 0, message: "Nope" }) })).toBeNull();
  });

  it("returns null for anything that is not a usable field + sentence", () => {
    expect(getApiFieldErrors(null)).toBeNull();
    expect(getApiFieldErrors(new Error("Network Error"))).toBeNull();
    expect(getApiFieldErrors({ message: axiosErrorWith({ field: "employee_code", message: "" }) })).toBeNull();
    expect(getApiFieldErrors({ message: axiosErrorWith({ field: { x: 1 }, message: TAKEN }) })).toBeNull();
  });
});
