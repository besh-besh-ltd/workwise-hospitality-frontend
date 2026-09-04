import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { ChevronDown, LogOut, Search, X } from "lucide-react";
import { visibleRoleMenu } from "@/components/layout/Header/headerConfig";
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

  const { pendingCountFor } = usePendingApprovalIndicators({
    enabled: !!user,
  });

  // Menu config
  const isHospitalityCompany = userProfile?.is_hospitality == 1;
  const isHospitalityVendor = isHospitalityCompany && currentUserType === "vendor";
  const hasValidSub = !!userProfile?.has_valid_hospitality_subscription;
  const isSubLocked = isHospitalityVendor && !hasValidSub;

  // Total action-required count for a module section (so a collapsed module
  // still surfaces "you have N to act on" on its header).
  const sectionPendingCount = useCallback(
    (items) => (items || []).reduce((sum, it) => {
      const locked = isSubLocked && it.requiresSubscription;
      return sum + (locked ? 0 : pendingCountFor(it.href));
    }, 0),
    [pendingCountFor, isSubLocked]
  );

  const currentRoleMenu = useMemo(
    () => visibleRoleMenu(currentUserType, { isHospitalityCompany }),
    [currentUserType, isHospitalityCompany]
  );

  const navItems = currentRoleMenu.filter((m) => m.targetMenu === "nav");

  // Three-level grouping: phase (item.group) → module section (item.section) →
  // links. A phase renders a non-interactive header; a section renders the
  // existing collapsible micro-label; a null section drops its items straight
  // under the phase (for single-link modules like Notifications).
  const phaseGroups = useMemo(() => {
    const phases = [];
    navItems.forEach((item) => {
      const phase = item.group || null;
      let pg = phases[phases.length - 1];
      if (!pg || pg.phase !== phase) {
        pg = { phase, sections: [] };
        phases.push(pg);
      }
      const section = item.section || "";
      let sec = pg.sections[pg.sections.length - 1];
      if (!sec || sec.section !== section) {
        sec = { section, items: [] };
        pg.sections.push(sec);
      }
      sec.items.push(item);
    });
    return phases;
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
                    pendingCount={locked ? 0 : pendingCountFor(item.href)}
                  />
                );
              })
            ) : (
              (() => {
                // While searching, filter items and drop empty sections + phases.
                const visiblePhases = phaseGroups
                  .map((pg) => ({
                    ...pg,
                    sections: pg.sections
                      .map((s) => ({
                        ...s,
                        items: isSearching ? s.items.filter((it) => matchesQuery(it.label)) : s.items,
                      }))
                      .filter((s) => s.items.length > 0),
                  }))
                  .filter((pg) => pg.sections.length > 0);

                if (isSearching && visiblePhases.length === 0) {
                  return (
                    <div className={styles.navSearchEmpty}>
                      No matches for &ldquo;{searchQuery.trim()}&rdquo;
                    </div>
                  );
                }

                let phaseSeen = false;
                const renderNavItem = (item) => {
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
                      pendingCount={locked ? 0 : pendingCountFor(item.href)}
                    />
                  );
                };
                const renderSection = (group, key) => {
                  const isCollapsed = !isSearching && group.section
                    ? collapsedSections.has(group.section)
                    : false;
                  const secCount = group.section ? sectionPendingCount(group.items) : 0;
                  return (
                    <div key={key} className={styles.sectionGroup}>
                      {group.section ? (
                        <button
                          type="button"
                          className={styles.sectionToggle}
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
                          {secCount > 0 && isCollapsed && (
                            <span className={styles.navActionPill} title={`${secCount} awaiting your action`}>
                              {secCount > 9 ? "9+" : secCount}
                            </span>
                          )}
                        </button>
                      ) : null}
                      {!isCollapsed && (
                        <div className={styles.sectionItems}>{group.items.map(renderNavItem)}</div>
                      )}
                    </div>
                  );
                };

                return visiblePhases.map((pg, pi) => {
                  const phaseHeader = pg.phase ? (() => {
                    const first = !phaseSeen;
                    phaseSeen = true;
                    return (
                      <div className={`${styles.phaseHeader} ${first ? styles.phaseHeaderFirst : ""}`}>
                        {pg.phase}
                      </div>
                    );
                  })() : null;
                  // A phase with a single named module just repeats itself
                  // (Contracts → Rate Contracts), so drop the module label and
                  // list its links straight under the phase header.
                  const single = pg.phase && pg.sections.length === 1 && pg.sections[0].section;
                  return (
                    <div key={pg.phase || `phase-${pi}`} className={styles.phaseGroup}>
                      {phaseHeader}
                      {single
                        ? <div className={styles.sectionItems}>{pg.sections[0].items.map(renderNavItem)}</div>
                        : pg.sections.map((sec, si) => renderSection(sec, sec.section || `s-${pi}-${si}`))}
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
