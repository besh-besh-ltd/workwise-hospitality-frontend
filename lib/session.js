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
/**
 * `Secure` follows the actual connection, not NODE_ENV.
 *
 * A production build served over plain HTTP — which is exactly what the QA box
 * is — sets Secure, and the browser then silently refuses to store the cookie.
 * Login returns 200, no session is kept, and the gate bounces straight back to
 * the login screen with no error anywhere. Read the proxy's forwarded protocol
 * instead, so TLS deployments still get Secure and QA still works.
 */
export const isSecureRequest = (req) => {
  const proto = req?.headers?.["x-forwarded-proto"] || "";
  if (proto) return String(proto).split(",")[0].trim() === "https";
  return !!req?.connection?.encrypted;
};

export const sessionCookie = (token, secure = false) =>
  [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");

export const clearedCookie = (secure = false) =>
  [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
