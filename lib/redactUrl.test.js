// redactUrl: what telemetry (OpenTelemetry logs, the error boundary) may record
// of the page URL. The site-rep receive link carries a credential in #t= or ?t=.

import { redactUrl } from "./redactUrl";

test.each([
  ["https://x.io/receive/token#t=s3cret", "https://x.io/receive/token"],
  ["https://x.io/receive/token?t=s3cret", "https://x.io/receive/token"],
  ["https://x.io/receive/token?t=s3cret&rfq=7&po=52&token=s3cret", "https://x.io/receive/token?rfq=7&po=52"],
  ["https://x.io/vendor/network/accept-invite#token=s3cret", "https://x.io/vendor/network/accept-invite"],
  ["https://x.io/p?a=1#section", "https://x.io/p?a=1"],
  ["https://x.io/p?a=1&t2=keep", "https://x.io/p?a=1&t2=keep"],
  ["https://x.io/p", "https://x.io/p"],
])("%s", (input, expected) => {
  expect(redactUrl(input)).toBe(expected);
});

test("a token nested in another param is redacted, the rest kept", () => {
  const out = redactUrl("https://x.io/login?next=%2Freceive%2Ftoken%3Ft%3Ds3cret&lang=en");
  expect(out).not.toContain("s3cret");
  expect(out).toContain("lang=en");
});

test("anything that is not a string becomes an empty string", () => {
  expect(redactUrl(undefined)).toBe("");
  expect(redactUrl(null)).toBe("");
});
