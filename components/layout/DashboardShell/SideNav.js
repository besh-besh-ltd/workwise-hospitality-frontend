import React, { useMemo } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { LogOut } from "lucide-react";
import { roleMenus } from "@/components/layout/Header/headerConfig";
import usePendingApprovalIndicators from "@/hooks/usePendingApprovalIndicators";
import SideNavItem from "./SideNavItem";
import { getNavIcon } from "./navIcons";
import styles from "./DashboardShell.module.css";

const SideNav = ({
  user,
  currentUserType,
  subSidebar,
  collapsed = false,
  onLogoutRequest,
}) => {
  const router = useRouter();
  const { pathname } = router;
  const userProfile = useSelector((state) => state.userProfile);

  const hasSubSidebar = !!subSidebar;
  const isCompact = hasSubSidebar || collapsed;

  const { hasPendingApproval } = usePendingApprovalIndicators({
    enabled: !!user,
  });


  // Menu config
  const isHospitalityCompany = userProfile?.is_hospitality == 1;
  const isHospitalityVendor = isHospitalityCompany && currentUserType === "vendor";
  const hasValidSub = !!userProfile?.has_valid_hospitality_subscription;
  const isSubLocked = isHospitalityVendor && !hasValidSub;

  const currentRoleMenu = useMemo(() => {
    const baseMenu = roleMenus[currentUserType] || [];
    if (currentUserType === "admin" && !isHospitalityCompany) {
      return baseMenu.filter(
        (item) => item.href !== "/dashboard/admin/hospitality-manager"
      );
    }
    return baseMenu;
  }, [currentUserType, isHospitalityCompany]);

  const navItems = currentRoleMenu.filter((m) => m.targetMenu === "nav");

  const groupedNavItems = useMemo(() => {
    const groups = [];
    let currentSection = null;
    navItems.forEach((item) => {
      const section = item.section || "";
      if (section !== currentSection) {
        groups.push({ section, items: [] });
        currentSection = section;
      }
      groups[groups.length - 1].items.push(item);
    });
    return groups;
  }, [navItems]);

  const isItemActive = (href) => {
    // Dashboard link: exact match only (don't highlight on sub-pages)
    const dashHref = getDashboardHref();
    if (href === dashHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const getDashboardHref = () => {
    const map = {
      vendor: "/dashboard/vendor",
      admin: "/dashboard/admin",
      management: "/dashboard/management",
      engineering: "/dashboard/engineering",
      finance: "/dashboard/finance",
      buyer: "/dashboard/buyer",
    };
    return map[currentUserType] || "/dashboard/buyer";
  };

  return (
    <>
      <aside className={`${styles.sidebar} ${hasSubSidebar ? styles.sidebarWithSub : (collapsed ? styles.sidebarMini : styles.sidebarExpanded)}`}>
        <div className={`${styles.rail} ${isCompact ? styles.railCollapsed : styles.railExpanded}`}>
          {/* Nav items */}
          <nav className={`${styles.railNav} ${isCompact ? styles.railNavCollapsed : styles.railNavExpanded}`}>
            {isCompact ? (
              navItems.map((item) => {
                const Icon = getNavIcon(item.href);
                const locked = isSubLocked && item.requiresSubscription;
                const active = !locked && isItemActive(item.href);
                return (
                  <SideNavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    Icon={Icon}
                    active={active}
                    compact
                    locked={locked}
                    hasPending={!locked && hasPendingApproval(item.href)}
                  />
                );
              })
            ) : (
              groupedNavItems.map((group, gi) => (
                <div key={group.section || gi}>
                  {group.section && (
                    <p className={`${styles.sectionLabel} ${gi === 0 ? styles.sectionLabelFirst : ""}`}>
                      {group.section}
                    </p>
                  )}
                  {group.items.map((item) => {
                    const Icon = getNavIcon(item.href);
                    const locked = isSubLocked && item.requiresSubscription;
                    const active = !locked && isItemActive(item.href);
                    return (
                      <SideNavItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        Icon={Icon}
                        active={active}
                        compact={false}
                        locked={locked}
                        hasPending={!locked && hasPendingApproval(item.href)}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </nav>

          {/* Footer — Logout */}
          <div className={`${styles.railFooter} ${isCompact ? styles.railFooterCollapsed : styles.railFooterExpanded}`}>
            <button
              type="button"
              className={isCompact ? styles.logoutBtnCompact : styles.logoutBtn}
              onClick={onLogoutRequest}
            >
              <LogOut size={16} strokeWidth={2} />
              {!isCompact && <span>Logout</span>}
            </button>
          </div>
        </div>

        {hasSubSidebar && (
          <div className={styles.subSidebar}>
            {subSidebar}
          </div>
        )}
      </aside>
    </>
  );
};

export default SideNav;
