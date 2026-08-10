/**
 * Where a notification sends you, and how.
 *
 * The same twenty lines used to live in three places (the topbar dropdown, the
 * full notifications page, and an unmounted bell component), which is how they
 * drifted apart.
 *
 * Backend rows carry two shapes of `action_url`:
 *   - relative  `/dashboard/buyer/rate-contracts/12`  (current)
 *   - absolute  `https://hospitality.letsworkwise.com/dashboard/...` (legacy)
 *
 * Resolving both against the current origin means a legacy production URL still
 * navigates client-side when you are actually on that host, and only becomes a
 * full page load when the notification genuinely points somewhere else.
 */

/**
 * @param {string} actionUrl raw `action_url` from the API
 * @param {string} [origin] the origin to resolve against; defaults to the
 *        current window. Passed explicitly so this stays a pure function.
 * @returns {{ internal: boolean, href: string } | null}
 */
export const resolveNotificationTarget = (actionUrl, origin) => {
  if (!actionUrl || typeof actionUrl !== "string") return null;

  const raw = actionUrl.trim();
  if (!raw) return null;

  // Only two shapes are meaningful: a root-relative app path, or an absolute
  // http(s) URL. Anything else is rejected outright — `new URL(x, origin)`
  // happily resolves arbitrary text ("not a url" → "/not%20a%20url"), which
  // would send the user to a 404 instead of doing nothing.
  const isAbsolute = /^https?:\/\//i.test(raw);
  if (!isAbsolute && !raw.startsWith("/")) return null;

  // Several legacy call sites stored the bare site root, so clicking the
  // notification threw the user out of the dashboard onto the marketing page.
  if (/^https?:\/\/[^/]+\/?$/i.test(raw)) return null;

  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : null);
  if (!base) return { internal: !isAbsolute, href: raw };

  try {
    const url = new URL(raw, base);
    if (url.origin === base) {
      return { internal: true, href: url.pathname + url.search + url.hash };
    }
    return { internal: false, href: url.href };
  } catch (_) {
    return null;
  }
};

/**
 * Navigate to a notification's target.
 * @param {object} router Next.js router
 * @param {string} actionUrl
 * @returns {boolean} whether a navigation was started
 */
export const navigateToNotification = (router, actionUrl, origin) => {
  const target = resolveNotificationTarget(actionUrl, origin);
  if (!target) return false;

  if (target.internal) {
    router.push(target.href);
  } else {
    window.location.href = target.href;
  }
  return true;
};
