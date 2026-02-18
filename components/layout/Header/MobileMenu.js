import Link from "next/link";
import { BsPerson, BsBoxArrowRight } from "react-icons/bs";
import styles from "./Header.module.css";

const MobileMenu = ({
  isOpen,
  menuItems,
  pathname,
  user,
  currentUserType,
  dashboardHref,
  onLogout,
  onClose,
}) => {
  if (!isOpen || !user) return null;

  const navItems = menuItems?.filter((m) => m.targetMenu === "nav") || [];

  return (
    <div className={styles.mobileOverlay}>
      <div className={styles.mobileUserSection}>
        <div className={styles.mobileUserAvatar}>
          {user?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div>
          <div className={styles.mobileUserName}>{user?.name || "User"}</div>
          <div className={styles.mobileUserRole}>{currentUserType}</div>
        </div>
      </div>

      <nav className={styles.mobileNav}>
        <ul className={styles.mobileNavList}>
          {navItems.map((item) => (
            <li key={item.href} className={pathname === item.href ? "active" : ""}>
              <Link href={item.href} onClick={onClose}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.mobileDivider} />

      <nav className={styles.mobileNav}>
        <ul className={styles.mobileNavList}>
          <li>
            <Link href={dashboardHref} onClick={onClose}>
              <BsPerson style={{ marginRight: 8, verticalAlign: -2 }} />
              My Account
            </Link>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onLogout(e);
              }}
            >
              <BsBoxArrowRight style={{ marginRight: 8, verticalAlign: -2 }} />
              Logout
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default MobileMenu;
