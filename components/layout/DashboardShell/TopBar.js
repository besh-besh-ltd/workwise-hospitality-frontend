import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { Menu, Building2, ChevronDown, Key, LogOut, User, PanelLeftOpen, Bell, BellOff } from "lucide-react";
import { roleMenus } from "@/components/layout/Header/headerConfig";
import { toast } from "react-toastify";
import storageInstance from "@/utils/storageInstance";
import { ensurePushSubscription } from "@/utils/pushSubscription";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/Notifications";
import VendorSubscriptionPill from "./VendorSubscriptionPill";
import styles from "./DashboardShell.module.css";

const NOTIF_POLL_MS = 30 * 1000;

const formatNotifTime = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

/**
 * Slim top bar — shows:
 *  - Left:  hamburger (mobile) + logo + optional mobile RFQ toggle
 *  - Right: business unit badge (if > 1, with hover tooltip) + profile chip with dropdown
 */
const TopBar = ({
  user,
  currentUserType,
  onNavToggle,
  mobileRfqToggle,
  onLogoutRequest,
}) => {
  const router = useRouter();
  const { pathname } = router;
  const userProfile = useSelector((state) => state.userProfile);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifItems, setNotifItems] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default"); // 'granted' | 'denied' | 'default' | 'unsupported'
  const [notifEnabling, setNotifEnabling] = useState(false);
  const notifRef = useRef(null);

  const isLoggedIn = useCallback(() => {
    if (typeof window === "undefined") return false;
    return !!storageInstance.getStorage("token");
  }, []);

  const refreshNotifCount = useCallback(async () => {
    if (!isLoggedIn()) return;
    try {
      const resp = await getUnreadCount();
      const c = resp && resp.data && resp.data.count;
      setNotifCount(Number(c) || 0);
    } catch (_) {}
  }, [isLoggedIn]);

  const loadNotifList = useCallback(async () => {
    if (!isLoggedIn()) return;
    setNotifLoading(true);
    try {
      const resp = await listNotifications(1, 20);
      setNotifItems(Array.isArray(resp?.data) ? resp.data : []);
    } catch (_) {
      setNotifItems([]);
    } finally {
      setNotifLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    refreshNotifCount();
    const id = setInterval(refreshNotifCount, NOTIF_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshNotifCount();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refreshNotifCount);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refreshNotifCount);
    };
  }, [refreshNotifCount, isLoggedIn]);

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

  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  // Read the browser-level Notification permission. Done on mount AND when the
  // dropdown opens so a manual change in the browser UI reflects immediately.
  const refreshNotifPermission = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(window.Notification.permission || "default");
  }, []);

  useEffect(() => {
    refreshNotifPermission();
  }, [refreshNotifPermission]);

  // Triggered from the in-dropdown banner. Browsers IGNORE requestPermission()
  // when the user has already 'denied' (it resolves silently to 'denied'), so we
  // surface a clear toast in that case directing them to browser settings.
  const handleEnableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (notifEnabling) return;
    setNotifEnabling(true);
    try {
      const before = window.Notification.permission;
      const result = await window.Notification.requestPermission();
      setNotifPermission(result);
      if (result === "granted") {
        await ensurePushSubscription().catch(() => {});
        toast.success("Notifications enabled. You'll receive instant updates.");
      } else if (before === "denied") {
        toast.error(
          "Notifications are blocked in your browser. Please allow them from the site settings (lock icon in the address bar)."
        );
      } else {
        toast.info("Notifications stay off. You can enable them anytime.");
      }
    } catch (_) {
      // swallow — user can retry from the banner
    } finally {
      setNotifEnabling(false);
    }
  };

  const toggleNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      loadNotifList();
      refreshNotifPermission();
    }
  };

  const handleNotifItemClick = async (n) => {
    if (!n.is_read) {
      setNotifItems((curr) => curr.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x)));
      setNotifCount((c) => Math.max(0, c - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    setNotifOpen(false);
    if (n.action_url) {
      try {
        const url = new URL(n.action_url, window.location.origin);
        if (url.origin === window.location.origin) {
          router.push(url.pathname + url.search + url.hash);
        } else {
          window.location.href = n.action_url;
        }
      } catch (_) {
        router.push(n.action_url);
      }
    }
  };

  const handleNotifMarkAllRead = async () => {
    if (notifCount === 0) return;
    setNotifCount(0);
    setNotifItems((curr) => curr.map((x) => ({ ...x, is_read: 1 })));
    try {
      await markAllNotificationsRead();
    } catch (_) {
      refreshNotifCount();
    }
  };

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
          className={styles.navToggle}
          onClick={onNavToggle}
          aria-label="Toggle navigation"
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
        {currentUserType === "vendor" && <VendorSubscriptionPill />}

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

        {/* Notifications */}
        {isLoggedIn() && (
          <div style={{ position: "relative" }} ref={notifRef}>
            <button
              type="button"
              className={styles.notifBtn}
              onClick={toggleNotif}
              aria-label={`Notifications${notifCount > 0 ? ` — ${notifCount} unread` : ""}`}
            >
              <Bell size={19} strokeWidth={1.5} />
              {/* Tiny indicator dot — count is shown in the dropdown so this
                  stays calm. aria-label on the button carries the actual count
                  for screen readers. */}
              {notifCount > 0 && (
                <span className={styles.notifBadge} aria-hidden="true" />
              )}
            </button>

            {notifOpen && (
              <div className={styles.notifPopover} role="dialog" aria-label="Notifications">
                <div className={styles.notifHead}>
                  <span className={styles.notifTitleRow}>
                    <span className={styles.notifTitle}>Notifications</span>
                    {notifCount > 0 && (
                      <span className={styles.notifCountChip}>
                        {notifCount > 99 ? "99+" : notifCount} new
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleNotifMarkAllRead}
                    disabled={notifCount === 0}
                    className={styles.notifMarkAll}
                  >
                    Mark all read
                  </button>
                </div>

                {notifPermission !== "granted" && notifPermission !== "unsupported" && (
                  <div className={styles.notifDisabledBanner}>
                    <BellOff size={13} className={styles.notifDisabledBannerIc} />
                    <div className={styles.notifDisabledBannerBody}>
                      <strong>
                        {notifPermission === "denied"
                          ? "Notifications are blocked."
                          : "Notifications are turned off."}
                      </strong>{" "}
                      {notifPermission === "denied"
                        ? "Allow them in your browser settings to never miss an update."
                        : "Turn them on to never miss an update."}
                    </div>
                    <button
                      type="button"
                      className={styles.notifDisabledBannerBtn}
                      onClick={handleEnableNotifications}
                      disabled={notifEnabling}
                    >
                      {notifEnabling ? "Enabling…" : "Enable"}
                    </button>
                  </div>
                )}

                <div className={styles.notifList}>
                  {notifLoading && (
                    <>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div className={styles.notifSkelItem} key={i}>
                          <span className={styles.notifSkelDot} />
                          <div className={styles.notifSkelBody}>
                            <span className={styles.notifSkelBar} style={{ width: "62%" }} />
                            <span className={styles.notifSkelBar} style={{ width: "92%", height: 7 }} />
                            <span className={styles.notifSkelBar} style={{ width: "28%", height: 7 }} />
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {!notifLoading && notifItems.length === 0 && (
                    <div className={styles.notifEmpty}>
                      <span className={styles.notifEmptyIc}>
                        <Bell size={16} strokeWidth={1.8} />
                      </span>
                      <span>You&apos;re all caught up.</span>
                    </div>
                  )}

                  {!notifLoading &&
                    notifItems.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotifItemClick(n)}
                        className={`${styles.notifItem} ${!n.is_read ? styles.notifUnread : ""}`}
                      >
                        <span className={styles.notifUnreadDot} aria-hidden />
                        <div className={styles.notifBody}>
                          <div className={styles.notifItemTitle}>{n.title}</div>
                          {n.message && <div className={styles.notifMsg}>{n.message}</div>}
                          <div className={styles.notifTime}>{formatNotifTime(n.created_at)}</div>
                        </div>
                      </button>
                    ))}
                </div>

                {!notifLoading && notifItems.length > 0 && (
                  <div className={styles.notifFooter}>
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setNotifOpen(false)}
                      className={styles.notifViewAll}
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile avatar — opens dropdown */}
        <div style={{ position: "relative" }} ref={profileRef}>
          <button
            type="button"
            className={`${styles.profileAvatarBtn} ${profileOpen ? styles.profileAvatarBtnOpen : ""}`}
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Account"
          >
            {initial}
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
