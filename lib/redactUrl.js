import { stripTokenParams } from "./analytics";

/**
 * A URL that is safe to put in telemetry (OpenTelemetry logs, the error
 * boundary): the #fragment dropped whole (fragments are client state, and the
 * site-rep receive link /receive/token#t=… carries its credential there), every
 * `t` / `token` query param removed, and any token still nested in another
 * param or URL-encoded replaced by REDACTED (lib/analytics stripTokenParams).
 * Anything that is not a string becomes "".
 */
export function redactUrl(url) {
  if (typeof url !== "string") return "";
  const hashAt = url.indexOf("#");
  return stripTokenParams(hashAt >= 0 ? url.slice(0, hashAt) : url);
}

export default redactUrl;
