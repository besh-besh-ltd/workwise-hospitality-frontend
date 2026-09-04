import { useRef, useEffect } from "react";
import Link from "next/link";
import {
  BsPerson, BsFolder2, BsPeople, BsKey, BsBoxArrowRight,
  BsChevronDown, BsGrid, BsGear,
} from "react-icons/bs";
import styles from "./Header.module.css";

const iconMap = {
  person: BsPerson,
  folder: BsFolder2,
  people: BsPeople,
  grid: BsGrid,
  gear: BsGear,
};

const UserMenu = ({
  user,
  userBusinessUnits,
  roleMenu,
  hiddenNavItems,
  pathname,
  isOpen,
  onToggle,
  onLogout,
  onClose,
  hasPendingApproval,
}) => {
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const popupItems = roleMenu?.filter((m) => m.targetMenu === "popup") || [];
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      {/* Trigger */}
      <button
        type="button"
        className={`${styles.userTrigger} ${isOpen ? styles.userTriggerOpen : ""}`}
        onClick={onToggle}
        id="user_icon-user_menu-header"
      >
        <div className={styles.userAvatar}>{initial}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name || "User"}</span>
          {userBusinessUnits.length > 0 && (
            <span className={styles.userContext}>
              {userBusinessUnits.length === 1
                ? userBusinessUnits[0].hotel_name || userBusinessUnits[0].company_name || ""
                : `${userBusinessUnits.length} Business Units`}
            </span>
          )}
        </div>
        <BsChevronDown className={styles.userChevron} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className={styles.popover}>
          {/* User header */}
          <div className={styles.popoverHeader}>
            <div className={styles.popoverAvatar}>{initial}</div>
            <div>
              <div className={styles.popoverUserName}>{user?.name || "User"}</div>
              {userBusinessUnits.length > 0 && (
                <div className={styles.popoverUserContext}>
                  {userBusinessUnits.length <= 2
                    ? userBusinessUnits.map((bu, i) => (
                        <span key={i}>
                          {bu.hotel_name || bu.company_name}
                          {i < userBusinessUnits.length - 1 ? ", " : ""}
                        </span>
                      ))
                    : `${userBusinessUnits.length} Business Units`}
                </div>
              )}
            </div>
          </div>

          {/* Overflow navigation items (if any) */}
          {hiddenNavItems.length > 0 && (
            <>
              <div className={styles.popoverSection}>
                <div className={styles.popoverSectionLabel}>Navigation</div>
                {hiddenNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.popoverItem} ${pathname === item.href ? styles.popoverItemActive : ""}`}
                    onClick={onClose}
                  >
                    {item.label}
                    {hasPendingApproval?.(item.href) && (
                      <span className={styles.inlineApprovalDot} />
                    )}
                  </Link>
                ))}
              </div>
              <div className={styles.popoverDivider} />
            </>
          )}

          {/* Menu items */}
          <div className={styles.popoverSection}>
            {popupItems.map((item) => {
              const Icon = iconMap[item.icon] || BsPerson;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.popoverItem} ${pathname === item.href ? styles.popoverItemActive : ""}`}
                  onClick={onClose}
                >
                  <span className={styles.popoverItemIcon}><Icon /></span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className={styles.popoverDivider} />

          {/* Footer actions */}
          <div className={styles.popoverSection}>
            <Link
              href={`/change-password?redirect_url=${typeof window !== "undefined" ? window.location.pathname : "/"}`}
              className={`${styles.popoverItem} ${pathname === "/change-password" ? styles.popoverItemActive : ""}`}
              onClick={onClose}
              id="change_password-user_popup-header"
            >
              <span className={styles.popoverItemIcon}><BsKey /></span>
              Change Password
            </Link>
            <button
              type="button"
              className={`${styles.popoverItem} ${styles.popoverItemLogout}`}
              onClick={onLogout}
            >
              <span className={styles.popoverItemIcon}><BsBoxArrowRight /></span>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
