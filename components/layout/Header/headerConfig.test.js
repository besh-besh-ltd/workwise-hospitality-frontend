import { roleMenus, visibleRoleMenu } from "./headerConfig";

/**
 * The hospitality-only rule used to be `href !== "/dashboard/admin/hospitality-manager"`
 * copied into SideNav, MobileNav and Header. Adding a second hospitality-only
 * destination to the admin rail therefore silently leaked it to
 * non-hospitality admins in all three places. These lock the rule down in one.
 */
describe("visibleRoleMenu", () => {
  it("hides every hospitality-only destination from a non-hospitality admin", () => {
    const menu = visibleRoleMenu("admin", { isHospitalityCompany: false });
    expect(menu.some((i) => i.hospitalityOnly)).toBe(false);
    expect(menu.map((i) => i.href)).not.toContain("/dashboard/admin/hospitality-manager");
    expect(menu.map((i) => i.href)).not.toContain("/dashboard/admin/approvals");
  });

  it("shows the whole rail to a hospitality admin", () => {
    const menu = visibleRoleMenu("admin", { isHospitalityCompany: true });
    expect(menu).toEqual(roleMenus.admin);
  });

  it("treats a missing hospitality flag as non-hospitality", () => {
    expect(visibleRoleMenu("admin")).toEqual(
      visibleRoleMenu("admin", { isHospitalityCompany: false })
    );
  });

  it("leaves non-admin rails alone", () => {
    for (const role of ["buyer", "vendor"]) {
      expect(visibleRoleMenu(role, { isHospitalityCompany: false })).toEqual(roleMenus[role]);
    }
  });

  it("returns an empty rail for an unknown role rather than throwing", () => {
    expect(visibleRoleMenu("nobody", { isHospitalityCompany: true })).toEqual([]);
  });
});

describe("admin rail", () => {
  const nav = roleMenus.admin.filter((i) => i.targetMenu === "nav");

  it("gives Approvals its own destination", () => {
    // It used to be reachable only by drilling company -> unit -> Set
    // Hierarchy, which is why mis-configured approval chains went unnoticed.
    expect(nav.map((i) => i.label)).toContain("Approvals");
  });

  it("has no duplicate hrefs or labels", () => {
    const hrefs = nav.map((i) => i.href);
    const labels = nav.map((i) => i.label);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps the paths that other code navigates to by string", () => {
    // LoginContainer pushes to hospitality-manager on login;
    // ProcessScopeErrorBanner deep-links into approval-hierarchy.
    expect(nav.map((i) => i.href)).toContain("/dashboard/admin/hospitality-manager");
  });
});
