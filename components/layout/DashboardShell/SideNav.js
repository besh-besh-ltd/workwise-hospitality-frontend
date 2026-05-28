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

  // Longest-prefix match wins, so the most specific nav item is the only one
  // highlighted. This keeps "PO Dashboard" (/purchase-orders) from also lighting
  // up on /purchase-orders/tracking, and keeps the top "Dashboard" link active
  // only on its own exact route (a shorter prefix of every sub-page).
  const activeHref = useMemo(() => {
    let best = null;
    navItems.forEach((item) => {
      const h = item.href;
      if (pathname === h || pathname.startsWith(`${h}/`)) {
        if (!best || h.length > best.length) best = h;
      }
    });
    return best;
  }, [navItems, pathname]);

  const isItemActive = (href) => href === activeHref;

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
                    isNew={item.isNew}
                    isLegacy={item.legacy}
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
                        isNew={item.isNew}
                        isLegacy={item.legacy}
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
