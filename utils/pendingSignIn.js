// A one-shot hand-off from a page that just made an account usable (the vendor-network
// invite acceptance) to the sign-in modal: who should sign in and what to tell them.
// Kept in sessionStorage, never in the URL, and removed as soon as it is read.

const KEY = "pending-sign-in";

/** Stores { email, message } for the next sign-in modal of this tab. */
export function setPendingSignIn({ email, message }) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ email: email || "", message: message || "" }));
  } catch (_) {
    /* storage unavailable: the modal simply opens empty */
  }
}

/** Reads and clears the pending sign-in: { email, message } or null. */
export function takePendingSignIn() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw == null) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? { email: String(parsed.email || ""), message: String(parsed.message || "") } : null;
  } catch (_) {
    return null;
  }
}
