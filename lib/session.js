import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "ihg_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // a working day — long enough for a demo

const secretKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Loud rather than silently insecure: an unsigned session would mean the
    // login gate could be forged by anyone who can set a cookie.
    throw new Error("SESSION_SECRET is not set — refusing to issue a session.");
  }
  return new TextEncoder().encode(secret);
};

/** Signs { personaId } into a JWT for the session cookie. */
export const createSessionToken = async (personaId) =>
  new SignJWT({ personaId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

/** Returns the payload, or null if the token is missing, forged or expired. */
export const readSessionToken = async (token) => {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload?.personaId ? payload : null;
  } catch (_) {
    return null;
  }
};

/**
 * Host-scoped on purpose — no Domain attribute, so the cookie stays on
 * ihg.letsworkwise.com and can never ride along to the main site.
 */
export const sessionCookie = (token) =>
  [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
    process.env.NODE_ENV === "production" ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");

export const clearedCookie = () =>
  [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    process.env.NODE_ENV === "production" ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
