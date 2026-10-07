import { roleMenus, visibleRoleMenu } from "./headerConfig";

/**
 * Vendor networks (spec §9). The Network group is for an org admin only,
 * "Assigned to me" for anyone acting as a non-principal entity of a network,
 * and "Set up network" for a vendor who is in no network at all. A vendor with
 * no network must otherwise see exactly the rail it always had.
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

const principalAdmin = { role: "ORG_ADMIN", is_principal: true, acting_entity_id: 10, actable_entities: [] };
const adminActingAsBranch = { role: "ORG_ADMIN", is_principal: false, acting_entity_id: 11, actable_entities: [] };
const branchMember = { role: "ENTITY_MEMBER", is_principal: false, acting_entity_id: 11, actable_entities: [] };

describe("vendor rail — network visibility", () => {
  it("a vendor with no network sees no network destinations, only 'Set up network'", () => {
    for (const network of [null, undefined]) {
      const menu = visibleRoleMenu("vendor", { isHospitalityCompany: true, network });
      const hrefs = hrefsOf(menu);
      for (const href of [...NETWORK_ADMIN_HREFS.slice(1), ASSIGNED]) expect(hrefs).not.toContain(href);
      const setup = menu.find((i) => i.label === "Set up network");
      expect(setup).toBeTruthy();
      expect(setup.href).toBe("/dashboard/vendor/network");
      expect(setup.group).toBe("Account");
      // Nothing labelled as the admin Overview leaks through either.
      expect(menu.some((i) => i.requiresNetworkAdmin || i.requiresNetworkMember)).toBe(false);
    }
  });

  it("a non-network vendor's rail is the legacy rail plus 'Set up network' only", () => {
    const menu = visibleRoleMenu("vendor", { isHospitalityCompany: true, network: null });
    const legacy = roleMenus.vendor.filter(
      (i) => !i.requiresNetworkAdmin && !i.requiresNetworkMember && !i.requiresNoNetwork
    );
    expect(menu.filter((i) => i.label !== "Set up network")).toEqual(legacy);
  });

  it("an org admin acting as the principal sees the Network group but not 'Assigned to me'", () => {
    const menu = visibleRoleMenu("vendor", { isHospitalityCompany: true, network: principalAdmin });
    const hrefs = hrefsOf(menu);
    for (const href of NETWORK_ADMIN_HREFS) expect(hrefs).toContain(href);
    expect(hrefs).not.toContain(ASSIGNED);
    expect(menu.some((i) => i.label === "Set up network")).toBe(false);
    expect(NETWORK_ADMIN_HREFS.map((h) => labelOf(menu, h))).toEqual([
      "Overview",
      "Entities",
      "Team",
      "Coverage",
      "Routing",
    ]);
    expect(menu.filter((i) => i.requiresNetworkAdmin).every((i) => i.group === "Network")).toBe(true);
  });

  it("an org admin acting as a branch sees both the Network group and 'Assigned to me'", () => {
    const hrefs = hrefsOf(visibleRoleMenu("vendor", { isHospitalityCompany: true, network: adminActingAsBranch }));
    for (const href of [...NETWORK_ADMIN_HREFS, ASSIGNED]) expect(hrefs).toContain(href);
  });

  it("an entity member sees 'Assigned to me' and no admin destinations", () => {
    const menu = visibleRoleMenu("vendor", { isHospitalityCompany: true, network: branchMember });
    const hrefs = hrefsOf(menu);
    expect(hrefs).toContain(ASSIGNED);
    expect(labelOf(menu, ASSIGNED)).toBe("Assigned to me");
    expect(menu.some((i) => i.requiresNetworkAdmin)).toBe(false);
    expect(menu.some((i) => i.label === "Set up network")).toBe(false);
  });

  it("network flags never touch the buyer or admin rails", () => {
    for (const role of ["buyer", "admin"]) {
      expect(visibleRoleMenu(role, { isHospitalityCompany: true, network: principalAdmin })).toEqual(
        visibleRoleMenu(role, { isHospitalityCompany: true })
      );
    }
  });
});
