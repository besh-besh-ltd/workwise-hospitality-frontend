// Guest (emailed-link) sessions are recognised from the token's own `guest`
// claim (backend jwtHelper.signGuestAccessToken).

jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { getStorage: jest.fn() },
}));

import storageInstance from "@/utils/storageInstance";
import { isGuestSession } from "./guestSession";

const jwt = (payload) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.s`;
const withToken = (token) => storageInstance.getStorage.mockImplementation((k) => (k === "token" ? token : null));

test("a guest token is a guest session", () => {
  withToken(jwt({ sub: "x", guest: true, name: "Vendor ü" }));
  expect(isGuestSession()).toBe(true);
});

test("a normal login token is not", () => {
  withToken(jwt({ sub: "x", user: true }));
  expect(isGuestSession()).toBe(false);
});

test("no token or an unreadable token is not", () => {
  withToken(null);
  expect(isGuestSession()).toBe(false);
  withToken("not-a-jwt");
  expect(isGuestSession()).toBe(false);
  withToken("a.%%%.b");
  expect(isGuestSession()).toBe(false);
});
