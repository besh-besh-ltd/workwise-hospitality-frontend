import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { LogOut } from "lucide-react";
import { roleMenus } from "@/components/layout/Header/headerConfig";
import usePendingApprovalIndicators from "@/hooks/usePendingApprovalIndicators";
import SideNavItem from "./SideNavItem";
import { getNavIcon } from "./navIcons";
import styles from "./DashboardShell.module.css";

/**
 * Combined sidebar: nav rail + sub-sidebar slot.
 * Footer has a simple logout button (no popover — profile lives in TopBar now).
 */
const SideNav = ({
  user,
  currentUserType,
  subSidebar,
  onLogoutRequest,
}) => {
  const router = useRouter();
  const { pathname } = router;
  const userProfile = useSelector((state) => state.userProfile);

  const hasSubSidebar = !!subSidebar;

  const { hasPendingApproval } = usePendingApprovalIndicators({
    enabled: !!user,
  });

  // Tooltip for compact logout button
  const [logoutTooltipVisible, setLogoutTooltipVisible] = useState(false);
  const [logoutTooltipPos, setLogoutTooltipPos] = useState({ left: 0, top: 0 });
  const logoutBtnRef = useRef(null);

  const showLogoutTooltip = useCallback(() => {
    if (!logoutBtnRef.current) return;
    const rect = logoutBtnRef.current.getBoundingClientRect();
    setLogoutTooltipPos({ left: rect.right + 10, top: rect.top + rect.height / 2 });
    setLogoutTooltipVisible(true);
  }, []);
  const hideLogoutTooltip = useCallback(() => setLogoutTooltipVisible(false), []);

  // Derive menu items
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

  const isItemActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

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

  // Portal tooltip for compact logout
  const logoutTooltip = hasSubSidebar && typeof document !== "undefined"
    ? createPortal(
        <span
          className={styles.navTooltip}
          style={{
            left: logoutTooltipPos.left,
            top: logoutTooltipPos.top,
            transform: "translateY(-50%)",
            opacity: logoutTooltipVisible ? 1 : 0,
          }}
        >
          Logout
        </span>,
        document.body
      )
    : null;

  return (
    <aside className={`${styles.sidebar} ${hasSubSidebar ? styles.sidebarWithSub : styles.sidebarExpanded}`}>
      {/* ── Nav rail ── */}
      <div className={`${styles.rail} ${hasSubSidebar ? styles.railCollapsed : styles.railExpanded}`}>
        {/* Header: greeting when expanded, logo mark when collapsed */}
        <div className={`${styles.railHeader} ${hasSubSidebar ? styles.railHeaderCollapsed : styles.railHeaderExpanded}`}>
          {hasSubSidebar ? (
            <Link href={getDashboardHref()} className={styles.logoLink} aria-label="Workwise">
              <span className={styles.logoMark}>W</span>
            </Link>
          ) : (
            <div className={styles.greeting}>
              <span className={styles.greetingWave}>👋</span>
              <div className={styles.greetingText}>
                <span className={styles.greetingLine}>Welcome back,</span>
                <span className={styles.greetingName}>{user?.name || "there"}!</span>
              </div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className={`${styles.railNav} ${hasSubSidebar ? styles.railNavCollapsed : styles.railNavExpanded}`}>
          {navItems.map((item) => {
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
                compact={hasSubSidebar}
                locked={locked}
                hasPending={!locked && hasPendingApproval(item.href)}
              />
            );
          })}
        </nav>

        {/* Footer: simple logout button */}
        <div className={`${styles.railFooter} ${hasSubSidebar ? styles.railFooterCollapsed : styles.railFooterExpanded}`}>
          {hasSubSidebar ? (
            /* Compact: icon-only logout with tooltip */
            <>
              <button
                ref={logoutBtnRef}
                type="button"
                className={styles.logoutBtnCompact}
                onClick={onLogoutRequest}
                onMouseEnter={showLogoutTooltip}
                onMouseLeave={hideLogoutTooltip}
                aria-label="Logout"
              >
                <LogOut size={18} strokeWidth={1.6} />
              </button>
              {logoutTooltip}
            </>
          ) : (
            /* Expanded: full logout button with label */
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={onLogoutRequest}
            >
              <LogOut size={16} strokeWidth={1.6} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-sidebar (RFQ list / tab nav, rendered via context) ── */}
      {hasSubSidebar && (
        <div className={styles.subSidebar}>
          {subSidebar}
        </div>
      )}
    </aside>
  );
};

export default SideNav;
