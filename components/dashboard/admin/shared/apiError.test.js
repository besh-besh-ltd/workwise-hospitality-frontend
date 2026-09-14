// The admin screens throw away the server's sentence and say "Failed to …".
//
// Reported against duplicate role assignment: the backend does its half
// properly — rbacModel.js raises DUPLICATE_ROLE_SCOPE, usersController.js
// returns 409 with "This role assignment already exists for this user." — and
// the frontend never reads it. `grep DUPLICATE_ROLE_SCOPE frontend/` returned
// zero hits. The admin saw "Failed to update user" and had no idea what to do
// differently.
//
// The handler it landed in already special-cased three sibling codes to get
// their real message; this one fell past them to a generic fallback. Naming
// codes one at a time is what produced that gap, so this resolves the message
// generically: the server's sentence if there is one, the caller's fallback
// if there is not.

import { apiErrorMessage } from "./apiError";

// Services in this codebase reject with `{ message: error }` where `error` is
// the axios error — so the payload sits under `.message.response.data`, not
// the `.response.data` you would expect. Both shapes reach these handlers.
const serviceReject = (data) => ({ message: { response: { data } } });
const axiosRaw = (data) => ({ response: { data } });

describe("apiErrorMessage", () => {
  it("returns the server's sentence from a service rejection", () => {
    const err = serviceReject({
      status: 0,
      code: "DUPLICATE_ROLE_SCOPE",
      message: "This role assignment already exists for this user.",
    });
    expect(apiErrorMessage(err, "Failed to update user")).toBe(
      "This role assignment already exists for this user."
    );
  });

  it("returns the server's sentence from a raw axios error", () => {
    const err = axiosRaw({ message: "That person cannot approve for this business unit" });
    expect(apiErrorMessage(err, "fallback")).toBe(
      "That person cannot approve for this business unit"
    );
  });

  it("falls back when the server sent no message", () => {
    expect(apiErrorMessage(axiosRaw({ status: 0 }), "Failed to update user")).toBe(
      "Failed to update user"
    );
  });

  it("falls back on a network error with no response at all", () => {
    expect(apiErrorMessage(new Error("Network Error"), "Failed to update user")).toBe(
      "Failed to update user"
    );
  });

  it("falls back rather than surfacing an empty or blank message", () => {
    expect(apiErrorMessage(axiosRaw({ message: "" }), "fallback")).toBe("fallback");
    expect(apiErrorMessage(axiosRaw({ message: "   " }), "fallback")).toBe("fallback");
  });

  it("survives null and undefined", () => {
    expect(apiErrorMessage(null, "fallback")).toBe("fallback");
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("exposes the code so a caller can still branch on it", () => {
    const err = serviceReject({ code: "DUPLICATE_ROLE_SCOPE", message: "…" });
    expect(apiErrorMessage.codeOf(err)).toBe("DUPLICATE_ROLE_SCOPE");
    expect(apiErrorMessage.codeOf(new Error("boom"))).toBeNull();
  });
});
