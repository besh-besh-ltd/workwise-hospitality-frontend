import { roleMenus, visibleRoleMenu } from "./headerConfig";

/**
 * Vendor networks (spec §9). The Network group is for an org admin only,
 * "Assigned to me" for anyone acting as a non-principal entity of a network,
 * and "Set up network" for a LOADED vendor profile (user_type 3) whose network
 * is explicitly null, outside a guest emailed-link session. A vendor with no
 * network must otherwise see exactly the rail it always had.
 */
const NETWORK_ADMIN_HREFS = [
  "/dashboard/vendor/network",
  "/dashboard/vendor/network/entities",
  "/dashboard/vendor/network/team",
  "/dashboard/vendor/network/coverage",
  "/dashboard/vendor/network/routing",
];
const ASSIGNED = "/dashboard/vendor/network/assigned";

const hrefsOf = (menu) => menu.filter((i) => i.targetMenu === "nav").map((i) => i.href);
const labelOf = (menu, href) => menu.find((i) => i.href === href)?.label;

const SETUP = "Set up network";
const vendor = (network) => ({ id: 10, user_type: 3, network });
const principalAdmin = { role: "ORG_ADMIN", is_principal: true, acting_entity_id: 10, actable_entities: [] };
const adminActingAsBranch = { role: "ORG_ADMIN", is_principal: false, acting_entity_id: 11, actable_entities: [] };
const branchMember = { role: "ENTITY_MEMBER", is_principal: false, acting_entity_id: 11, actable_entities: [] };

const rail = (opts) => visibleRoleMenu("vendor", { isHospitalityCompany: true, ...opts });
const hasSetup = (menu) => menu.some((i) => i.label === SETUP);

describe("'Set up network' visibility", () => {
  it("is hidden while the profile is still loading", () => {
    expect(hasSetup(rail({ profile: null }))).toBe(false);
    expect(hasSetup(rail({ profile: undefined }))).toBe(false);
  });

  it("shows for a loaded vendor whose network is null, under Account, linking to the network page", () => {
    const setup = rail({ profile: vendor(null) }).find((i) => i.label === SETUP);
    expect(setup).toBeTruthy();
    expect(setup.href).toBe("/dashboard/vendor/network");
    expect(setup.group).toBe("Account");
  });

  it("is hidden when the profile has no network field at all (undefined is not 'no network')", () => {
    expect(hasSetup(rail({ profile: { id: 10, user_type: 3 } }))).toBe(false);
  });

  it("is hidden once the vendor is in a network", () => {
    for (const network of [principalAdmin, adminActingAsBranch, branchMember]) {
      expect(hasSetup(rail({ profile: vendor(network) }))).toBe(false);
    }
  });

  it("is hidden in a guest emailed-link session", () => {
    expect(hasSetup(rail({ profile: vendor(null), isGuestSession: true }))).toBe(false);
  });

  it("is hidden for a profile that is not a vendor (user_type 3)", () => {
    expect(hasSetup(rail({ profile: { id: 10, user_type: 2, network: null } }))).toBe(false);
  });
});

describe("vendor rail — network visibility", () => {
  it("a vendor with no network sees no network destinations", () => {
    for (const profile of [null, vendor(null)]) {
      const menu = rail({ profile });
      const hrefs = hrefsOf(menu);
      for (const href of [...NETWORK_ADMIN_HREFS.slice(1), ASSIGNED]) expect(hrefs).not.toContain(href);
      expect(menu.some((i) => i.requiresNetworkAdmin || i.requiresNetworkMember)).toBe(false);
    }
  });

  it("a non-network vendor's rail is the legacy rail plus 'Set up network' only", () => {
    const menu = rail({ profile: vendor(null) });
    const legacy = roleMenus.vendor.filter(
      (i) => !i.requiresNetworkAdmin && !i.requiresNetworkMember && !i.requiresNoNetwork
    );
    expect(menu.filter((i) => i.label !== SETUP)).toEqual(legacy);
  });

  it("an org admin acting as the principal sees the Network group but not 'Assigned to me'", () => {
    const menu = rail({ profile: vendor(principalAdmin) });
    const hrefs = hrefsOf(menu);
    for (const href of NETWORK_ADMIN_HREFS) expect(hrefs).toContain(href);
    expect(hrefs).not.toContain(ASSIGNED);
    expect(NETWORK_ADMIN_HREFS.map((h) => labelOf(menu, h))).toEqual([
      "Overview",
      "Entities & seats",
      "Team",
      "Coverage",
      "Routing",
    ]);
    expect(menu.filter((i) => i.requiresNetworkAdmin).every((i) => i.group === "Network")).toBe(true);
  });

  it("an org admin acting as a branch sees both the Network group and 'Assigned to me'", () => {
    const hrefs = hrefsOf(rail({ profile: vendor(adminActingAsBranch) }));
    for (const href of [...NETWORK_ADMIN_HREFS, ASSIGNED]) expect(hrefs).toContain(href);
  });

  it("an entity member sees 'Assigned to me' and no admin destinations", () => {
    const menu = rail({ profile: vendor(branchMember) });
    expect(hrefsOf(menu)).toContain(ASSIGNED);
    expect(labelOf(menu, ASSIGNED)).toBe("Assigned to me");
    expect(menu.some((i) => i.requiresNetworkAdmin)).toBe(false);
  });

  it("network flags never touch the buyer or admin rails", () => {
    for (const role of ["buyer", "admin"]) {
      expect(visibleRoleMenu(role, { isHospitalityCompany: true, profile: vendor(principalAdmin) })).toEqual(
        visibleRoleMenu(role, { isHospitalityCompany: true })
      );
    }
  });
});
