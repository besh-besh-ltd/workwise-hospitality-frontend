// A seat payment Razorpay has taken but the server has not yet confirmed.
//
// The checkout handler is the only moment the browser holds the payment ids.
// If /seats/verify-payment fails there (network, 5xx) and nothing replays it,
// the seats stay pending and, once the 30-minute order window passes, the admin
// could be charged again for a new order. So the ids are kept here, per org and
// per browser, until verify succeeds or definitively refuses them. The backend
// verify is replay-safe (an already-paid order answers already_paid).
//
// Nothing secret is stored: these are the same ids the browser sends to verify.

const keyFor = (orgId) => `vn-seat-verify:${orgId}`;

export function readPendingSeatVerify(orgId) {
  if (orgId == null || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(orgId));
    const payload = raw ? JSON.parse(raw) : null;
    return payload?.razorpay_order_id && payload?.razorpay_payment_id && payload?.razorpay_signature ? payload : null;
  } catch (_) {
    return null;
  }
}

export function savePendingSeatVerify(orgId, payload) {
  if (orgId == null || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(orgId), JSON.stringify({ org_id: orgId, ...payload, at: new Date().toISOString() }));
  } catch (_) {
    // Storage full or blocked: the handler still tries verify once.
  }
}

export function clearPendingSeatVerify(orgId) {
  if (orgId == null || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(orgId));
  } catch (_) {
    // ignore
  }
}

/** A refusal the server will repeat on every replay (bad signature, not found…). */
export const isDefinitiveRefusal = (err) => {
  const status = err?.response?.status;
  return Number.isInteger(status) && status >= 400 && status < 500;
};
