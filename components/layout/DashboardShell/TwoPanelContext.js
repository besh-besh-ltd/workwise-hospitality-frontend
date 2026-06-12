import { createContext, useContext } from "react";

/**
 * Used by <TwoPanelPage> to pass its sub-sidebar content (e.g. RFQListSidebar)
 * UP to <DashboardShell>, which renders it inside the combined sidebar container.
 *
 * When subSidebar is set, the nav rail collapses to icons-only and the sub-sidebar
 * fills the remaining width — all inside one unified sidebar.
 */
export const TwoPanelContext = createContext({
  setSubSidebar: () => {},
  setMobileRfqToggle: () => {},
});

export const useTwoPanelContext = () => useContext(TwoPanelContext);
