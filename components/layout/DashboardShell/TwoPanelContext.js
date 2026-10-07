import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Lets <TwoPanelPage> place its sub-sidebar content (e.g. RFQListSidebar)
 * inside <DashboardShell>'s combined sidebar container.
 *
 * The page does NOT hand its sidebar element up as state. It registers that a
 * sub-sidebar exists (a count, changed only on mount/unmount) and portals the
 * element into the DOM slot the shell renders. Pushing the element itself
 * into shell state re-rendered the shell on every page render — the element
 * is new each time — which on busy pages (technical evaluation) cascaded into
 * "Maximum update depth exceeded".
 *
 * When a sub-sidebar is registered, the nav rail collapses to icons-only and
 * the sub-sidebar fills the remaining width — all inside one unified sidebar.
 */
export const TwoPanelContext = createContext({
  registerSubSidebar: () => () => {},
  subSidebarNode: null,
  setMobileRfqToggle: () => {},
});

export const useTwoPanelContext = () => useContext(TwoPanelContext);

/** Shell-side state for the two-panel contract. */
export const useTwoPanelHost = () => {
  const [subSidebarCount, setSubSidebarCount] = useState(0);
  const [subSidebarNode, setSubSidebarNode] = useState(null);
  const [mobileRfqToggle, setMobileRfqToggle] = useState(null);

  // A count, not a boolean: during a route change the next page can mount
  // its sub-sidebar before the previous page's cleanup runs.
  const registerSubSidebar = useCallback(() => {
    setSubSidebarCount((c) => c + 1);
    return () => setSubSidebarCount((c) => Math.max(0, c - 1));
  }, []);

  const ctx = useMemo(
    () => ({ registerSubSidebar, subSidebarNode, setMobileRfqToggle }),
    [registerSubSidebar, subSidebarNode]
  );

  return {
    ctx,
    hasSubSidebar: subSidebarCount > 0,
    subSidebarRef: setSubSidebarNode,
    mobileRfqToggle,
  };
};
