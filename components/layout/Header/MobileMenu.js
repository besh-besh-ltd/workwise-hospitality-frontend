import Link from "next/link";
import { BsPerson, BsBoxArrowRight, BsHouseDoor, BsGrid3X3Gap, BsXLg } from "react-icons/bs";
import styles from "./Header.module.css";

const MobileMenu = ({
  isOpen,
  isPublicPage,
  isDashboard,
  websiteMenu,
  roleMenu,
  pathname,
  user,
  currentUserType,
  onNavAction,
  onLogout,
  onLoginClick,
  onBookCallClick,
  onClose,
  hasPendingApproval,
}) => {
  if (!isOpen) return null;

  const dashNavItems = roleMenu?.filter((m) => m.targetMenu === "nav") || [];
  const dashPopupItems = roleMenu?.filter((m) => m.targetMenu === "popup") || [];

  return (
    <>
      {/* Backdrop */}
      <div className={styles.mobileBackdrop} onClick={onClose} />

      <div className={styles.mobileDrawer}>
        {/* Close header */}
        <div className={styles.mobileDrawerHeader}>
          <span className={styles.mobileDrawerTitle}>Menu</span>
          <button className={styles.mobileCloseBtn} onClick={onClose} aria-label="Close menu">
            <BsXLg size={16} />
          </button>
        </div>

        {/* User card — show when logged in */}
        {user && user.name && (
          <div className={styles.mobileUserCard}>
            <div className={styles.mobileUserAvatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.mobileUserName}>{user.name}</div>
              <div className={styles.mobileUserRole}>{currentUserType}</div>
            </div>
          </div>
        )}

        {/* Scrollable nav area */}
        <div className={styles.mobileDrawerBody}>

          {/* Section label for navigation */}
          {((isPublicPage && websiteMenu?.length > 0) || (isDashboard && dashNavItems.length > 0)) && (
            <div className={styles.mobileSectionLabel}>Navigation</div>
          )}

          {/* Public page navigation */}
          {isPublicPage && websiteMenu && websiteMenu.length > 0 && (
            <nav>
              {websiteMenu.map((item) => {
                const isActive = pathname === item.href;
                return item.href ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span key={item.label} className={styles.mobileNavItem}>{item.label}</span>
                );
              })}
            </nav>
          )}

          {/* Dashboard navigation */}
          {isDashboard && dashNavItems.length > 0 && (
            <nav>
              {dashNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
                    onClick={onClose}
                  >
                    {item.label}
                    {hasPendingApproval?.(item.href) && (
                      <span className={styles.inlineApprovalDot} />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Dashboard popup menu items */}
          {isDashboard && dashPopupItems.length > 0 && (
            <>
              <div className={styles.mobileSectionLabel}>Account</div>
              <nav>
                {dashPopupItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {/* Auth actions for public pages when not logged in */}
          {isPublicPage && !user && (
            <>
              <div className={styles.mobileSectionLabel}>Get Started</div>
              <nav>
                <a href="#" className={styles.mobileNavItem} onClick={(e) => { e.preventDefault(); onLoginClick?.(); }}>
                  <BsPerson size={16} style={{ marginRight: 10, opacity: 0.6 }} />
                  Login / Register
                </a>
                <a href="#" className={styles.mobileNavItem} onClick={(e) => { e.preventDefault(); onBookCallClick?.(); }}>
                  <BsGrid3X3Gap size={14} style={{ marginRight: 10, opacity: 0.6 }} />
                  Book a Call
                </a>
              </nav>
            </>
          )}
        </div>

        {/* Footer actions — always at bottom */}
        {user && (
          <div className={styles.mobileDrawerFooter}>
            {isPublicPage && (
              <Link href="/dashboard" className={styles.mobileFooterBtn} onClick={onClose}>
                <BsHouseDoor size={15} />
                Dashboard
              </Link>
            )}
            <a
              href="#"
              className={`${styles.mobileFooterBtn} ${styles.mobileFooterBtnDanger}`}
              onClick={(e) => { e.preventDefault(); onLogout?.(e); }}
            >
              <BsBoxArrowRight size={15} />
              Logout
            </a>
          </div>
        )}
      </div>
    </>
  );
};

export default MobileMenu;
