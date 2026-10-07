import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const { registerSubSidebar, subSidebarNode, setMobileRfqToggle } = useTwoPanelContext();
  const hasSidebar = !!sidebar;

  // useLayoutEffect so the sidebar slot exists before the browser paints,
  // preventing a flash of expanded nav items in the collapsed rail. Depends on
  // presence only — the sidebar element itself is new on every render and is
  // rendered through the portal below, never pushed into shell state.
  useIsomorphicLayoutEffect(() => {
    if (!hasSidebar) return undefined;
    return registerSubSidebar();
  }, [hasSidebar, registerSubSidebar]);

  // Pages pass an inline arrow here; route it through a ref so a new function
  // identity on each render doesn't re-publish the toggle to the shell.
  const toggleRef = useRef(onMobileSidebarToggle);
  toggleRef.current = onMobileSidebarToggle;
  const hasToggle = !!onMobileSidebarToggle;
  const stableToggle = useCallback((...args) => toggleRef.current?.(...args), []);

  useIsomorphicLayoutEffect(() => {
    if (!hasToggle) return undefined;
    setMobileRfqToggle({
      callback: stableToggle,
      label: mobileToggleLabel,
      isOpen: mobileSidebarOpen,
    });
    return () => setMobileRfqToggle(null);
  }, [hasToggle, stableToggle, mobileToggleLabel, mobileSidebarOpen, setMobileRfqToggle]);

  return (
    <div className={styles.pageRoot}>
      {hasSidebar && subSidebarNode && createPortal(sidebar, subSidebarNode)}

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
