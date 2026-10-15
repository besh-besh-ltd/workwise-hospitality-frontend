// A vendor-network person (user_type 11) signs in by email like a vendor and
// acts as a vendor entity, so the login persona is 'vendor' (spec §4.2).

jest.mock("@react-oauth/google", () => ({ __esModule: true, useGoogleLogin: () => jest.fn() }));

import { personaFor } from "./LandingAuth";

test("user_type 11 (network member) lands as a vendor", () => {
  expect(personaFor({ user_type: 11 })).toBe("vendor");
  expect(personaFor({ user_type: "11" })).toBe("vendor");
});

test("existing personas are unchanged", () => {
  expect(personaFor({ user_type: 3 })).toBe("vendor");
  expect(personaFor({ user_type: 2 })).toBe("buyer");
  expect(personaFor({ user_type: 2, is_company_admin: true })).toBe("admin");
  expect(personaFor({ user_type: 99 })).toBeUndefined();
});
