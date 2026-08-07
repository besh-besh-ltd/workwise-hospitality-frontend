import {
  resolveNotificationTarget,
  navigateToNotification,
} from "@/utils/notificationNavigation";

// The origin is injected rather than stubbed onto window: jsdom's
// window.location is non-configurable, and a pure function is easier to reason
// about than a mutated global.
//
// Both shapes matter in production. Rows written before the link registry carry
// fully-qualified https://hospitality.letsworkwise.com URLs; rows written after
// it are root-relative.
const PROD = "https://hospitality.letsworkwise.com";
const LOCAL = "http://localhost:3000";

describe("resolveNotificationTarget", () => {
  it("treats a relative path as in-app navigation", () => {
    expect(resolveNotificationTarget("/dashboard/buyer/rate-contracts/12", PROD)).toEqual({
      internal: true,
      href: "/dashboard/buyer/rate-contracts/12",
    });
  });

  it("keeps query and hash on a relative path", () => {
    expect(
      resolveNotificationTarget(
        "/dashboard/buyer/quote-comparison?rfq=359&focus=approval",
        PROD
      )
    ).toEqual({
      internal: true,
      href: "/dashboard/buyer/quote-comparison?rfq=359&focus=approval",
    });
  });

  it("strips a same-origin absolute URL back to a client-side route", () => {
    // On the production host a legacy absolute URL must still route
    // client-side rather than forcing a full page reload.
    expect(
      resolveNotificationTarget(`${PROD}/dashboard/buyer/purchase-orders/61`, PROD)
    ).toEqual({ internal: true, href: "/dashboard/buyer/purchase-orders/61" });
  });

  it("treats a genuinely different origin as an external jump", () => {
    // This is the staging/local trap: a row written on production points at
    // production, so opening it from localhost leaves the environment.
    const target = resolveNotificationTarget(
      `${PROD}/dashboard/buyer/purchase-orders/61`,
      LOCAL
    );
    expect(target.internal).toBe(false);
    expect(target.href).toBe(`${PROD}/dashboard/buyer/purchase-orders/61`);
  });

  it("keeps a relative path in-app regardless of which environment renders it", () => {
    // The reason the registry emits relative paths: the same row works
    // everywhere instead of pinning users to one host.
    for (const origin of [PROD, LOCAL]) {
      expect(resolveNotificationTarget("/dashboard/buyer/purchase-orders/61", origin)).toEqual({
        internal: true,
        href: "/dashboard/buyer/purchase-orders/61",
      });
    }
  });

  it("refuses a bare domain with no path", () => {
    // Eight backend call sites stored the site root, so clicking the
    // notification threw the user out to the marketing page.
    expect(resolveNotificationTarget(PROD, PROD)).toBeNull();
    expect(resolveNotificationTarget(`${PROD}/`, PROD)).toBeNull();
  });

  it("refuses empty and non-string input", () => {
    expect(resolveNotificationTarget(null, PROD)).toBeNull();
    expect(resolveNotificationTarget("", PROD)).toBeNull();
    expect(resolveNotificationTarget("   ", PROD)).toBeNull();
    expect(resolveNotificationTarget(undefined, PROD)).toBeNull();
    expect(resolveNotificationTarget(42, PROD)).toBeNull();
  });

  it("refuses an unparseable value rather than navigating blindly", () => {
    // `new URL("not a url", origin)` resolves happily to "/not%20a%20url",
    // which would land the user on a 404 instead of doing nothing.
    expect(resolveNotificationTarget("not a url", PROD)).toBeNull();
    expect(resolveNotificationTarget("javascript:alert(1)", PROD)).toBeNull();
  });
});

describe("navigateToNotification", () => {
  it("routes in-app targets through the Next router", () => {
    const router = { push: jest.fn() };
    const navigated = navigateToNotification(
      router,
      "/dashboard/buyer/material-requisitions/7",
      PROD
    );

    expect(navigated).toBe(true);
    expect(router.push).toHaveBeenCalledWith("/dashboard/buyer/material-requisitions/7");
  });

  it("does not navigate when there is no usable target", () => {
    const router = { push: jest.fn() };
    expect(navigateToNotification(router, null, PROD)).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("does not navigate for a bare-domain action_url", () => {
    const router = { push: jest.fn() };
    expect(navigateToNotification(router, PROD, PROD)).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });
});
