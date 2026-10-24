// The member accept-invite page is first served with ?token= in its URL. The
// <meta name="referrer"> in its <Head> only lands after the client mounts, so the
// server must send Referrer-Policy: no-referrer with the page itself. The same
// holds for the site-rep receive link (/receive/token?t=…), whose token is a
// receiving credential.
//
// Legacy site-rep links (/dashboard/buyer/purchase-order/grn?…&token=…) are
// redirected on the server: a client-side redirect would race the Layout's
// vendor-token exchange, which takes any ?token= on a /dashboard path.

const nextConfig = require("../../next.config.js");
const { matchHas, prepareDestination } = require("next/dist/shared/lib/router/utils/prepare-destination");

const headerFor = (rules, path, key) => {
  const rule = rules.find((r) => r.source === path);
  return rule?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
};

test("accept-invite is served with Referrer-Policy: no-referrer", async () => {
  expect(typeof nextConfig.headers).toBe("function");
  const rules = await nextConfig.headers();
  expect(headerFor(rules, "/vendor/network/accept-invite", "Referrer-Policy")).toBe("no-referrer");
});

test("the site-rep receive page is served with Referrer-Policy: no-referrer", async () => {
  const rules = await nextConfig.headers();
  expect(headerFor(rules, "/receive/token", "Referrer-Policy")).toBe("no-referrer");
});

test("no other page gets the policy from these rules", async () => {
  const rules = await nextConfig.headers();
  const withPolicy = rules.filter((r) => r.headers.some((h) => h.key.toLowerCase() === "referrer-policy"));
  expect(withPolicy.map((r) => r.source)).toEqual(["/vendor/network/accept-invite", "/receive/token"]);
});

describe("legacy site-rep GRN links", () => {
  const legacyRule = async () =>
    (await nextConfig.redirects()).find((r) => r.source === "/dashboard/buyer/purchase-order/grn");
  const req = { headers: {}, cookies: {} };

  test("redirect on the server to /receive/token, temporarily", async () => {
    expect(await legacyRule()).toEqual({
      source: "/dashboard/buyer/purchase-order/grn",
      has: [{ type: "query", key: "token", value: "(?<tok>.+)" }],
      destination: "/receive/token?t=:tok",
      permanent: false,
    });
  });

  test("carry the token as ?t= (Next's own matcher), and leave token-less visits alone", async () => {
    const rule = await legacyRule();
    const query = { rfq: "7", po: "52", token: "Zk3pQ9wXr7Lm2Nv8Bt4Yc6Hd1Js5Fg0Ka-_Ue9Ti3Ro" };
    const params = matchHas(req, query, rule.has, []);
    expect(params).toEqual({ tok: query.token });
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false, destination: rule.destination, params, query,
    });
    expect(parsedDestination.pathname).toBe("/receive/token");
    expect(parsedDestination.query.t).toBe(query.token);
    expect(matchHas(req, { rfq: "7", po: "52" }, rule.has, [])).toBe(false);
  });

  test("the existing redirect is untouched", async () => {
    const rules = await nextConfig.redirects();
    expect(rules).toContainEqual({
      source: "/dashboard/vendor/reviews-ratings",
      destination: "/dashboard/vendor/subscription",
      permanent: true,
    });
  });
});
