// The member accept-invite page is first served with ?token= in its URL. The
// <meta name="referrer"> in its <Head> only lands after the client mounts, so the
// server must send Referrer-Policy: no-referrer with the page itself.

const nextConfig = require("../../next.config.js");

const headerFor = (rules, path, key) => {
  const rule = rules.find((r) => r.source === path);
  return rule?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
};

test("accept-invite is served with Referrer-Policy: no-referrer", async () => {
  expect(typeof nextConfig.headers).toBe("function");
  const rules = await nextConfig.headers();
  expect(headerFor(rules, "/vendor/network/accept-invite", "Referrer-Policy")).toBe("no-referrer");
});

test("no other page gets the policy from this rule", async () => {
  const rules = await nextConfig.headers();
  const withPolicy = rules.filter((r) => r.headers.some((h) => h.key.toLowerCase() === "referrer-policy"));
  expect(withPolicy.map((r) => r.source)).toEqual(["/vendor/network/accept-invite"]);
});
