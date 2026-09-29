/* Plain-language copy for a failed dashboard request.
 *
 * Cards used to print whatever the transport said ("Network Error",
 * "timeout of 30000ms exceeded"). Users can act on "can't reach the server"
 * or "no access"; they can't act on an axios string. The raw detail still
 * goes to the console for whoever is debugging.
 *
 * Accepts the shape services/dashboard.js rejects with
 * ({ message, status, network, code, detail }) and falls back to the
 * shared API-error reader for anything else. */
import { getApiErrorMessage } from "@/utils/apiError";

export const ERROR_COPY = {
  network: "Can't reach the server right now. Check your connection and retry.",
  timeout: "The server took too long to respond. Please retry.",
  server: "The server couldn't load this right now. Please retry.",
  forbidden: "You don't have access to this for the selected business units.",
};

const TIMEOUT_RE = /timeout|ECONNABORTED|ETIMEDOUT/i;
const NETWORK_RE = /network error|failed to fetch|ERR_NETWORK|ECONNREFUSED/i;

export const dashboardErrorMessage = (err, fallback) => {
  const status = Number(err?.status || err?.response?.status || err?.message?.response?.status) || null;
  const code = err?.code || err?.message?.code || "";
  const detail = [err?.detail, typeof err?.message === "string" ? err.message : err?.message?.message, code]
    .filter(Boolean)
    .join(" ");

  let copy;
  if (TIMEOUT_RE.test(detail)) copy = ERROR_COPY.timeout;
  else if (err?.network || (!status && NETWORK_RE.test(detail))) copy = ERROR_COPY.network;
  else if (status === 401 || status === 403) copy = ERROR_COPY.forbidden;
  else if (status && status >= 500) copy = ERROR_COPY.server;

  if (copy) {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("[dashboard] request failed:", status || "no response", detail || err);
    }
    return copy;
  }
  // 4xx with a server-written message (validation etc.) is worth showing.
  return getApiErrorMessage(err, fallback);
};

export default dashboardErrorMessage;
