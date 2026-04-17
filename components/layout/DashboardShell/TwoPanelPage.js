import React, { useEffect } from "react";
import { useTwoPanelContext } from "./TwoPanelContext";
import styles from "./DashboardShell.module.css";

/**
 * Layout wrapper for pages with a secondary panel (e.g. RFQ list sidebar).
 *
 * Instead of rendering the sidebar in the page content, it passes it UP
 * to DashboardShell via TwoPanelContext. The shell renders it inside the
 * combined sidebar container (rail + sub-sidebar).
 *
 * The page content renders full-width since the sub-sidebar is inside the shell.
 *
 * Props:
 *  - title:              page H1 text
 *  - subtitle:           optional subtitle
 *  - sidebar:            ReactNode — the sub-sidebar (e.g. <RFQListSidebar />)
 *  - actions:            optional ReactNode in header-right
 *  - onMobileSidebarToggle: optional callback to open sidebar drawer on mobile
 *  - mobileToggleLabel:  text for mobile toggle button
 *  - children:           page content
 */
const TwoPanelPage = ({
  title,
  subtitle,
  sidebar,
  actions,
  onMobileSidebarToggle,
  mobileToggleLabel = "Select from list",
  children,
}) => {
  const { setSubSidebar, setMobileRfqToggle } = useTwoPanelContext();

  // Pass the sub-sidebar content to the shell on mount, clear on unmount
  useEffect(() => {
    setSubSidebar(sidebar);
    return () => setSubSidebar(null);
  }, [sidebar]);

  // Pass mobile toggle callback to shell for rendering in topbar
  useEffect(() => {
    if (onMobileSidebarToggle) {
      setMobileRfqToggle({ callback: onMobileSidebarToggle, label: mobileToggleLabel });
    }
    return () => setMobileRfqToggle(null);
  }, [onMobileSidebarToggle, mobileToggleLabel]);

  return (
    <div className={styles.pageRoot}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.pageActions}>{actions}</div>}
        </div>
      </header>
      {children}
    </div>
  );
};

export default TwoPanelPage;
