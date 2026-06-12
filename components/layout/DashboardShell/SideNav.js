import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { ChevronDown, LogOut, Search, X } from "lucide-react";
import { roleMenus } from "@/components/layout/Header/headerConfig";
import usePendingApprovalIndicators from "@/hooks/usePendingApprovalIndicators";
import SideNavItem from "./SideNavItem";
import { getNavIcon } from "./navIcons";
import styles from "./DashboardShell.module.css";

const COLLAPSED_SECTIONS_KEY = "ww:sidebar:collapsedSections";

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

  // Per-section collapse state, persisted across navigations. Only applies in
  // the expanded rail; the icon-only rail always shows everything.
  const [collapsedSections, setCollapsedSections] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      return new Set();
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        COLLAPSED_SECTIONS_KEY,
        JSON.stringify(Array.from(collapsedSections))
      );
    } catch (_) {}
  }, [collapsedSections]);

  const toggleSection = useCallback((section) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // Sidebar nav search — filters items by label. While searching, all sections
  // are force-expanded and any group with no matches is hidden.
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  // ⌘/Ctrl+K focuses the search input.
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Reset search on route change so the nav settles back to normal after click.
  useEffect(() => {
    const close = () => setSearchQuery("");
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

  const matchesQuery = useCallback(
    (label) => (label || "").toLowerCase().includes(trimmedQuery),
    [trimmedQuery]
  );

  return (
    <>
      <aside className={`${styles.sidebar} ${hasSubSidebar ? styles.sidebarWithSub : (collapsed ? styles.sidebarMini : styles.sidebarExpanded)}`}>
        <div className={`${styles.rail} ${isCompact ? styles.railCollapsed : styles.railExpanded}`}>
          {/* Search — expanded rail only. ⌘/Ctrl+K to focus. */}
          {!isCompact && (
            <div className={styles.navSearch}>
              <Search size={13} strokeWidth={2.2} className={styles.navSearchIcon} />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className={styles.navSearchInput}
                aria-label="Search navigation"
              />
              {isSearching ? (
                <button
                  type="button"
                  className={styles.navSearchClear}
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={11} strokeWidth={2.4} />
                </button>
              ) : (
                <span className={styles.navSearchKbd}>
                  <span className={styles.navSearchKbdGlyph}>⌘</span>
                  <span className={styles.navSearchKbdGlyph}>K</span>
                </span>
              )}
            </div>
          )}

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
              (() => {
                // While searching, filter items and skip whole groups with no matches.
                const visibleGroups = groupedNavItems
                  .map((group) => ({
                    ...group,
                    items: isSearching
                      ? group.items.filter((it) => matchesQuery(it.label))
                      : group.items,
                  }))
                  .filter((group) => group.items.length > 0);

                if (isSearching && visibleGroups.length === 0) {
                  return (
                    <div className={styles.navSearchEmpty}>
                      No matches for &ldquo;{searchQuery.trim()}&rdquo;
                    </div>
                  );
                }

                return visibleGroups.map((group, gi) => {
                  // Searching expands every section so the matches are visible.
                  const isCollapsed = !isSearching && group.section
                    ? collapsedSections.has(group.section)
                    : false;
                  return (
                    <div key={group.section || gi} className={styles.sectionGroup}>
                      {group.section ? (
                        <button
                          type="button"
                          className={`${styles.sectionToggle} ${gi === 0 ? styles.sectionLabelFirst : ""}`}
                          onClick={() => toggleSection(group.section)}
                          aria-expanded={!isCollapsed}
                          disabled={isSearching}
                        >
                          <ChevronDown
                            size={11}
                            strokeWidth={2.4}
                            className={`${styles.sectionChev} ${isCollapsed ? styles.sectionChevCollapsed : ""}`}
                          />
                          <span className={styles.sectionLabelText}>{group.section}</span>
                        </button>
                      ) : null}
                      {!isCollapsed && (
                        <div className={styles.sectionItems}>
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
                      )}
                    </div>
                  );
                });
              })()
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
