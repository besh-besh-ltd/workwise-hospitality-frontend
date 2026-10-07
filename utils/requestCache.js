// Module-level promise cache for read-only reference data (units, country
// codes, charge names, departments) and for de-duplicating identical requests
// issued concurrently (permissions/bulk).
//
// Why: these lists were fetched once PER COMPONENT — CommonFormInput fetched
// /general/country-codes once per phone field, and a page with four widgets
// asking for the same permissions issued four identical POSTs in the same
// tick. The data does not change within a page view.
//
// Two primitives:
//   cachedRequest(key, fetcher, { ttlMs })  — share the promise (in flight AND
//                                             settled) for ttlMs. A rejection is
//                                             evicted so the next caller retries.
//   dedupeInFlight(key, fetcher)            — share the promise only while it is
//                                             in flight; nothing is kept after it
//                                             settles (for data that must stay
//                                             fresh per page load, e.g. RBAC).
//
// Tenant safety: callers whose data depends on WHO is asking pass
// `sessionScopeKey()` into the key. It folds in the auth token and the
// hospitality company/hotel context the axios interceptor sends, so a logout,
// a different user, or a company/hotel switch can never be served another
// session's entry — the key simply changes. clearRequestCache() is there for
// explicit resets (and tests).
//
// Callers get their own deep copy of a settled value, so a component that
// mutates the response (push/sort on response.data) cannot corrupt what the
// next component receives.

import storageInstance from "@/utils/storageInstance";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";

export const DEFAULT_TTL_MS = 10 * 60 * 1000;

const cache = new Map(); // key -> { promise, expiresAt }
const inFlight = new Map(); // key -> promise

const clone = (value) => {
  if (value == null || typeof value !== "object") return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
};

export const sessionScopeKey = () => {
  if (typeof window === "undefined") return "ssr";
  const token = storageInstance.getStorage("token") || "";
  const ctx = getStoredHospitalityContext() || {};
  // The tail of the token is enough to tell sessions apart; there is no need
  // to keep a second full copy of the bearer token in memory.
  return `${String(token).slice(-24)}|${ctx.companyId ?? ""}|${ctx.hotelId ?? ""}`;
};

export const cachedRequest = (key, fetcher, { ttlMs = DEFAULT_TTL_MS } = {}) => {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise.then(clone);

  const promise = Promise.resolve().then(fetcher);
  const entry = { promise, expiresAt: now + ttlMs };
  cache.set(key, entry);
  promise.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return promise.then(clone);
};

export const dedupeInFlight = (key, fetcher) => {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = Promise.resolve().then(fetcher);
  inFlight.set(key, promise);
  const release = () => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  };
  promise.then(release, release);
  return promise;
};

// Drop every cached entry whose key starts with `prefix` (e.g. after a create
// or delete on that resource).
export const invalidateRequestCache = (prefix) => {
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

export const clearRequestCache = () => {
  cache.clear();
  inFlight.clear();
};
