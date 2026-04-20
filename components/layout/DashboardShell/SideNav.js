import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { LogOut, User, Key, ChevronDown, Menu } from "lucide-react";
import { roleMenus } from "@/components/layout/Header/headerConfig";
import usePendingApprovalIndicators from "@/hooks/usePendingApprovalIndicators";
import SideNavItem from "./SideNavItem";
import { getNavIcon } from "./navIcons";
import styles from "./DashboardShell.module.css";

const SideNav = ({
  user,
  currentUserType,
  subSidebar,
  onLogoutRequest,
  onOpenMobileNav,
  mobileRfqToggle,
}) => {
  const router = useRouter();
  const { pathname } = router;
  const userProfile = useSelector((state) => state.userProfile);

  const hasSubSidebar = !!subSidebar;

  const { hasPendingApproval } = usePendingApprovalIndicators({
    enabled: !!user,
  });

  // Profile popover state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const popoverPortalRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (
        profileRef.current && !profileRef.current.contains(e.target) &&
        (!popoverPortalRef.current || !popoverPortalRef.current.contains(e.target))
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  useEffect(() => { setProfileOpen(false); }, [pathname]);


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

  const profileHref = useMemo(() => {
    const menu = roleMenus[currentUserType] || [];
    const profileItem = menu.find(m => m.targetMenu === "popup" && m.icon === "person");
    return profileItem?.href || `/dashboard/${currentUserType}/editprofile`;
  }, [currentUserType]);

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const userName = user?.name || "User";
  const userEmail = user?.email || "";

  // Business unit count
  const allMappings = userProfile?.hospitality_mappings || [];
  const seenBUs = new Set();
  allMappings.forEach((m) => {
    if (m?.hospitality_hotel_id != null) seenBUs.add(m.hospitality_hotel_id);
  });
  const buCount = seenBUs.size;


  return (
    <>
      {/* Mobile top bar — only visible on mobile */}
      <div className={styles.mobileTopBar}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={onOpenMobileNav}
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        <span className={styles.mobileTopBarLogo}>Workwise</span>
        {mobileRfqToggle}
      </div>

      <aside className={`${styles.sidebar} ${hasSubSidebar ? styles.sidebarWithSub : styles.sidebarExpanded}`}>
        <div className={`${styles.rail} ${hasSubSidebar ? styles.railCollapsed : styles.railExpanded}`}>
          {/* Header — Profile */}
          <div className={`${styles.railHeader} ${hasSubSidebar ? styles.railHeaderCollapsed : styles.railHeaderExpanded}`}>
            {hasSubSidebar ? (
              <div ref={profileRef} className={styles.compactProfileWrap}>
                <button
                  type="button"
                  className={styles.compactProfileBtn}
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <span className={styles.sidebarProfileAvatarWrap}>
                    <span className={styles.sidebarProfileAvatar}>{initial}</span>
                    <span className={styles.onlineDot} />
                  </span>
                </button>
                {profileOpen && typeof document !== "undefined" && createPortal(
                  <div ref={popoverPortalRef} className={styles.compactProfilePopover} style={{
                    position: "fixed",
                    top: profileRef.current?.getBoundingClientRect()?.bottom + 6 || 60,
                    left: profileRef.current?.getBoundingClientRect()?.left || 8,
                  }}>
                    <div className={styles.popoverHeaderCompact}>
                      <div className={styles.popoverUserName}>{userName}</div>
                      <div className={styles.popoverUserContext}>{buCount > 0 ? `${buCount} Business Unit${buCount > 1 ? "s" : ""}` : userEmail}</div>
                    </div>
                    <div className={styles.popoverDivider} />
                    <div className={styles.popoverSection}>
                      <Link href={profileHref} className={styles.popoverItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.popoverItemIcon}><User size={15} strokeWidth={1.6} /></span>
                        Profile
                      </Link>
                      <Link href={`/change-password?redirect_url=${typeof window !== "undefined" ? window.location.pathname : "/"}`} className={styles.popoverItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.popoverItemIcon}><Key size={15} strokeWidth={1.6} /></span>
                        Change Password
                      </Link>
                    </div>
                    <div className={styles.popoverDivider} />
                    <div className={styles.popoverSection}>
                      <button type="button" className={`${styles.popoverItem} ${styles.popoverItemLogout}`} onClick={() => { setProfileOpen(false); onLogoutRequest?.(); }}>
                        <span className={styles.popoverItemIcon}><LogOut size={15} strokeWidth={1.6} /></span>
                        Logout
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            ) : (
              <div ref={profileRef} className={styles.headerProfileWrap}>
                <button
                  type="button"
                  className={`${styles.sidebarProfileBtn} ${profileOpen ? styles.sidebarProfileBtnOpen : ""}`}
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <span className={styles.sidebarProfileAvatarWrap}>
                    <span className={styles.sidebarProfileAvatar}>{initial}</span>
                    <span className={styles.onlineDot} />
                  </span>
                  <span className={styles.sidebarProfileName}>{userName}</span>
                  <ChevronDown size={13} strokeWidth={2} className={styles.sidebarProfileChevron} />
                </button>

                {profileOpen && (
                  <div className={styles.sidebarProfilePopoverDown}>
                    <div className={styles.popoverHeaderCompact}>
                      <div className={styles.popoverUserName}>{userName}</div>
                      <div className={styles.popoverUserContext}>{buCount > 0 ? `${buCount} Business Unit${buCount > 1 ? "s" : ""}` : userEmail}</div>
                    </div>
                    <div className={styles.popoverDivider} />
                    <div className={styles.popoverSection}>
                      <Link href={profileHref} className={styles.popoverItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.popoverItemIcon}><User size={15} strokeWidth={1.6} /></span>
                        Profile
                      </Link>
                      <Link href={`/change-password?redirect_url=${typeof window !== "undefined" ? window.location.pathname : "/"}`} className={styles.popoverItem} onClick={() => setProfileOpen(false)}>
                        <span className={styles.popoverItemIcon}><Key size={15} strokeWidth={1.6} /></span>
                        Change Password
                      </Link>
                    </div>
                    <div className={styles.popoverDivider} />
                    <div className={styles.popoverSection}>
                      <button type="button" className={`${styles.popoverItem} ${styles.popoverItemLogout}`} onClick={() => { setProfileOpen(false); onLogoutRequest?.(); }}>
                        <span className={styles.popoverItemIcon}><LogOut size={15} strokeWidth={1.6} /></span>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav className={`${styles.railNav} ${hasSubSidebar ? styles.railNavCollapsed : styles.railNavExpanded}`}>
            {hasSubSidebar ? (
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
          <div className={`${styles.railFooter} ${hasSubSidebar ? styles.railFooterCollapsed : styles.railFooterExpanded}`}>
            <button
              type="button"
              className={hasSubSidebar ? styles.logoutBtnCompact : styles.logoutBtn}
              onClick={onLogoutRequest}
            >
              <LogOut size={hasSubSidebar ? 18 : 16} strokeWidth={1.6} />
              {!hasSubSidebar && <span>Logout</span>}
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
