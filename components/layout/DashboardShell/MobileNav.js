import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { X, LogOut, KeyRound } from "lucide-react";
import { roleMenus } from "@/components/layout/Header/headerConfig";
import usePendingApprovalIndicators from "@/hooks/usePendingApprovalIndicators";
import { getNavIcon } from "./navIcons";
import styles from "./DashboardShell.module.css";

/**
 * Mobile / narrow-viewport drawer. Renders the role-based nav
 * plus account items. Slides in from the left.
 */
const MobileNav = ({ open, onClose, user, currentUserType, onLogout }) => {
  const router = useRouter();
  const { pathname } = router;
  const userProfile = useSelector((state) => state.userProfile);

  const isHospitalityCompany = userProfile?.is_hospitality == 1;
  const isHospitalityVendor = isHospitalityCompany && currentUserType === "vendor";
  const hasValidSub = !!userProfile?.has_valid_hospitality_subscription;
  const isSubLocked = isHospitalityVendor && !hasValidSub;
  const { pendingCountFor } = usePendingApprovalIndicators({ enabled: !!user });

  const currentRoleMenu = useMemo(() => {
    const baseMenu = roleMenus[currentUserType] || [];
    if (currentUserType === "admin" && !isHospitalityCompany) {
      return baseMenu.filter(
        (item) => item.href !== "/dashboard/admin/hospitality-manager"
      );
    }
    return baseMenu;
  }, [currentUserType, isHospitalityCompany]);

  if (!open) return null;

  const navItems = currentRoleMenu.filter((m) => m.targetMenu === "nav");
  const popupItems = currentRoleMenu.filter((m) => m.targetMenu === "popup");
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div className={styles.mobileBackdrop} onClick={onClose} />
      <aside className={styles.mobileDrawer}>
        <div className={styles.mobileDrawerHeader}>
          <span className={styles.mobileDrawerTitle}>Menu</span>
          <button
            type="button"
            className={styles.mobileCloseBtn}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {user && user.name && (
          <div className={styles.mobileUserCard}>
            <div className={styles.mobileUserAvatar}>{initial}</div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.mobileUserName}>{user.name}</div>
              <div className={styles.mobileUserRole}>{currentUserType}</div>
            </div>
          </div>
        )}

        <div className={styles.mobileDrawerBody}>
          {navItems.length > 0 && (() => {
            // Group into procure-to-pay phases → module sections, mirroring the
            // desktop rail so the mobile drawer reads the same way.
            const phases = [];
            navItems.forEach((item) => {
              const phase = item.group || null;
              let pg = phases[phases.length - 1];
              if (!pg || pg.phase !== phase) { pg = { phase, sections: [] }; phases.push(pg); }
              const section = item.section || "";
              let sec = pg.sections[pg.sections.length - 1];
              if (!sec || sec.section !== section) { sec = { section, items: [] }; pg.sections.push(sec); }
              sec.items.push(item);
            });
            const renderItem = (item) => {
              const Icon = getNavIcon(item.href);
              const locked = isSubLocked && item.requiresSubscription;
              if (locked) {
                return (
                  <span key={item.href} className={styles.mobileNavItem} style={{ opacity: 0.5, cursor: "not-allowed" }}>
                    <Icon size={16} strokeWidth={1.75} />
                    {item.label}
                  </span>
                );
              }
              const pending = pendingCountFor(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.mobileNavItem} ${isActive(item.href) ? styles.mobileNavItemActive : ""}`}
                  onClick={onClose}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  {item.label}
                  {pending > 0 && (
                    <span className={styles.navActionPill} title={`${pending} awaiting your action`}>{pending > 9 ? "9+" : pending}</span>
                  )}
                </Link>
              );
            };
            return phases.map((pg, pi) => {
              // Single-module phase (e.g. Contracts → Rate Contracts) is
              // redundant — show its links straight under the phase label.
              const single = pg.phase && pg.sections.length === 1 && pg.sections[0].section;
              return (
                <React.Fragment key={pg.phase || `phase-${pi}`}>
                  <div className={styles.mobileSectionLabel}>{pg.phase || "Navigation"}</div>
                  <nav>
                    {single
                      ? pg.sections[0].items.map(renderItem)
                      : pg.sections.map((sec, si) => (
                          <React.Fragment key={sec.section || `sec-${si}`}>
                            {sec.section ? (
                              <div style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9a9aa2", padding: "10px 14px 2px" }}>
                                {sec.section}
                              </div>
                            ) : null}
                            {sec.items.map(renderItem)}
                          </React.Fragment>
                        ))}
                  </nav>
                </React.Fragment>
              );
            });
          })()}

          {popupItems.length > 0 && (
            <>
              <div className={styles.mobileSectionLabel}>Account</div>
              <nav>
                {popupItems.map((item) => {
                  const Icon = getNavIcon(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.mobileNavItem} ${isActive(item.href) ? styles.mobileNavItemActive : ""}`}
                      onClick={onClose}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        {user && (
          <div className={styles.mobileDrawerFooter}>
            <Link
              href={`/change-password?redirect_url=${typeof window !== "undefined" ? window.location.pathname : "/"}`}
              className={styles.mobileFooterBtn}
              onClick={onClose}
            >
              <KeyRound size={15} strokeWidth={1.75} />
              Password
            </Link>
            <button
              type="button"
              className={`${styles.mobileFooterBtn} ${styles.mobileFooterBtnDanger}`}
              onClick={(e) => {
                onClose?.();
                onLogout?.(e);
              }}
            >
              <LogOut size={15} strokeWidth={1.75} />
              Logout
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default MobileNav;
