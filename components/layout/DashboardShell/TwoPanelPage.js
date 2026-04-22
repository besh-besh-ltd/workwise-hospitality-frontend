import React, { useEffect, useLayoutEffect } from "react";
import { useTwoPanelContext } from "./TwoPanelContext";
import styles from "./DashboardShell.module.css";

// useLayoutEffect on client, useEffect on server (SSR safe)
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const TwoPanelPage = ({
  title,
  subtitle,
  sidebar,
  actions,
  filters,
  onMobileSidebarToggle,
  mobileSidebarOpen = false,
  mobileToggleLabel = "Select from list",
  children,
}) => {
  const { setSubSidebar, setMobileRfqToggle } = useTwoPanelContext();

  // useLayoutEffect so the sub-sidebar is set before the browser paints,
  // preventing a flash of expanded nav items in the collapsed rail.
  useIsomorphicLayoutEffect(() => {
    setSubSidebar(sidebar);
    return () => setSubSidebar(null);
  }, [sidebar]);

  useIsomorphicLayoutEffect(() => {
    if (onMobileSidebarToggle) {
      setMobileRfqToggle({
        callback: onMobileSidebarToggle,
        label: mobileToggleLabel,
        isOpen: mobileSidebarOpen,
      });
    }
    return () => setMobileRfqToggle(null);
  }, [onMobileSidebarToggle, mobileToggleLabel, mobileSidebarOpen]);

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
