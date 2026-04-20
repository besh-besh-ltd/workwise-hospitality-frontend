import React, { useEffect } from "react";
import { useTwoPanelContext } from "./TwoPanelContext";
import styles from "./DashboardShell.module.css";

const TwoPanelPage = ({
  title,
  subtitle,
  sidebar,
  actions,
  filters,
  onMobileSidebarToggle,
  mobileToggleLabel = "Select from list",
  children,
}) => {
  const { setSubSidebar, setMobileRfqToggle } = useTwoPanelContext();

  useEffect(() => {
    setSubSidebar(sidebar);
    return () => setSubSidebar(null);
  }, [sidebar]);

  useEffect(() => {
    if (onMobileSidebarToggle) {
      setMobileRfqToggle({ callback: onMobileSidebarToggle, label: mobileToggleLabel });
    }
    return () => setMobileRfqToggle(null);
  }, [onMobileSidebarToggle, mobileToggleLabel]);

  return (
    <div className={styles.pageRoot}>
      {/* Fixed top: header + filters */}
      <div className={styles.pageTopSection}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderRow}>
            <div>
              <h1 className={styles.pageTitle}>{title}</h1>
              {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
            </div>
            {actions && <div className={styles.pageActions}>{actions}</div>}
          </div>
        </header>
        {filters}
      </div>

      {/* Scrollable content */}
      <div className={styles.pageScrollSection}>
        {children}
      </div>
    </div>
  );
};

export default TwoPanelPage;
