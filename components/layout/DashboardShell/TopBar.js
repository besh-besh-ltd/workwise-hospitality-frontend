import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { Menu, Building2, ChevronDown, Key, LogOut, User, PanelLeftOpen } from "lucide-react";
import { roleMenus } from "@/components/layout/Header/headerConfig";
import storageInstance from "@/utils/storageInstance";
import styles from "./DashboardShell.module.css";

/**
 * Slim top bar — shows:
 *  - Left:  hamburger (mobile) + logo + optional mobile RFQ toggle
 *  - Right: business unit badge (if > 1, with hover tooltip) + profile chip with dropdown
 */
const TopBar = ({
  user,
  currentUserType,
  onOpenMobileNav,
  mobileRfqToggle,
  onLogoutRequest,
}) => {
  const router = useRouter();
  const { pathname } = router;
  const userProfile = useSelector((state) => state.userProfile);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  useEffect(() => { setProfileOpen(false); }, [pathname]);

  // Business units
  const allMappings = userProfile?.hospitality_mappings || [];
  const seen = new Set();
  const uniqueBUs = [];
  for (const m of allMappings) {
    if (!m || m.hospitality_hotel_id == null || !m.hotel_name) continue;
    if (seen.has(m.hospitality_hotel_id)) continue;
    seen.add(m.hospitality_hotel_id);
    uniqueBUs.push(m);
  }
  uniqueBUs.sort((a, b) => (a.hotel_name || "").localeCompare(b.hotel_name || ""));

  const showBuBadge = uniqueBUs.length > 1;
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const userName = user?.name || "User";
  const userEmail = user?.email || "";

  // Derive profile link from role
  const profileHref = useMemo(() => {
    const menu = roleMenus[currentUserType] || [];
    const profileItem = menu.find(m => m.targetMenu === "popup" && m.icon === "person");
    return profileItem?.href || `/dashboard/${currentUserType}/editprofile`;
  }, [currentUserType]);

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarLeft}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={onOpenMobileNav}
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>

        <Link href="/dashboard/buyer" className={styles.topBarLogo} aria-label="Workwise">
          <Image
            src="/assets/images/logo1.png"
            alt="Workwise"
            width={100}
            height={18}
            className={styles.topBarLogoImg}
            priority
          />
        </Link>

        {mobileRfqToggle}
      </div>

      <div className={styles.topBarRight}>
        {showBuBadge && (
          <div className={styles.buBadge}>
            <Building2 size={14} strokeWidth={1.75} className={styles.buBadgeIcon} />
            <span className={styles.buBadgeLabel}>Business Units</span>
            <span className={styles.buBadgeCount}>{uniqueBUs.length}</span>

            <div className={styles.buTooltip}>
              <div className={styles.buTooltipTitle}>Mapped Business Units</div>
              {uniqueBUs.map((bu) => (
                <div key={bu.hospitality_hotel_id} className={styles.buTooltipItem}>
                  <span className={styles.buTooltipDot} />
                  {bu.hotel_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {showBuBadge && <div className={styles.topBarSep} />}

        {/* Profile chip + dropdown */}
        <div style={{ position: "relative" }} ref={profileRef}>
          <button
            type="button"
            className={`${styles.profileChip} ${profileOpen ? styles.profileChipOpen : ""}`}
            onClick={() => setProfileOpen((v) => !v)}
          >
            <span className={styles.profileAvatarWrap}>
              <span className={styles.profileAvatar}>{initial}</span>
              <span className={styles.activeDot} />
            </span>
            <span className={styles.profileInfo}>
              <span className={styles.profileName}>{userName}</span>
              {userEmail && <span className={styles.profileEmail}>{userEmail}</span>}
            </span>
            <ChevronDown size={13} strokeWidth={2} className={styles.profileChevron} />
          </button>

          {profileOpen && (
            <div className={styles.topBarPopover}>
              <div className={styles.popoverHeader}>
                <span className={styles.popoverAvatar}>{initial}</span>
                <div>
                  <div className={styles.popoverUserName}>{userName}</div>
                  {userEmail && <div className={styles.popoverUserContext}>{userEmail}</div>}
                </div>
              </div>
              <div className={styles.popoverSection}>
                <Link
                  href={profileHref}
                  className={styles.popoverItem}
                  onClick={() => setProfileOpen(false)}
                >
                  <span className={styles.popoverItemIcon}>
                    <User size={16} strokeWidth={1.6} />
                  </span>
                  Profile
                </Link>
                <Link
                  href={`/change-password?redirect_url=${typeof window !== "undefined" ? window.location.pathname : "/"}`}
                  className={styles.popoverItem}
                  onClick={() => setProfileOpen(false)}
                >
                  <span className={styles.popoverItemIcon}>
                    <Key size={16} strokeWidth={1.6} />
                  </span>
                  Change Password
                </Link>
              </div>
              <div className={styles.popoverDivider} />
              <div className={styles.popoverSection}>
                <button
                  type="button"
                  className={`${styles.popoverItem} ${styles.popoverItemLogout}`}
                  onClick={() => {
                    setProfileOpen(false);
                    onLogoutRequest?.();
                  }}
                >
                  <span className={styles.popoverItemIcon}>
                    <LogOut size={16} strokeWidth={1.6} />
                  </span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
