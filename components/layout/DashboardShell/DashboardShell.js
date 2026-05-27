import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import posthog from "posthog-js";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { clearUserProfile } from "@/redux/slice";
import { getUserDetails } from "@/services/Auth";
import storageInstance from "@/utils/storageInstance";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import SideNav from "./SideNav";
import TopBar from "./TopBar";
import MobileNav from "./MobileNav";
import { TwoPanelContext } from "./TwoPanelContext";
import styles from "./DashboardShell.module.css";

const DashboardShell = ({ children }) => {
  const router = useRouter();
  const dispatch = useDispatch();

  const [loggedinUser, setLoggedinUser] = useState(null);
  const [currentUserType, setCurrentUserType] = useState("buyer");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleNavToggle = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 992) {
      setMobileNavOpen(true);
    } else {
      setSidebarCollapsed((c) => !c);
    }
  }, []);

  // Sub-sidebar state (set by TwoPanelPage via context)
  const [subSidebar, setSubSidebar] = useState(null);
  const [mobileRfqToggle, setMobileRfqToggle] = useState(null);

  // Load user
  useEffect(() => {
    const user = getUserDetails();
    setLoggedinUser(user?.name ? user : null);
    setCurrentUserType(
      storageInstance.getStorage("current-user-type") || "buyer"
    );
  }, []);

  // Tag body for global style overrides
  useEffect(() => {
    document.body.classList.add("dashboard-route");
    return () => document.body.classList.remove("dashboard-route");
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    const handleRoute = () => setMobileNavOpen(false);
    router.events.on("routeChangeStart", handleRoute);
    return () => router.events.off("routeChangeStart", handleRoute);
  }, [router.events]);

  // Context for TwoPanelPage
  const twoPanelCtx = useMemo(
    () => ({ setSubSidebar, setMobileRfqToggle }),
    []
  );

  // Open the confirmation modal instead of logging out immediately
  const handleLogoutRequest = useCallback(() => {
    setLogoutModalOpen(true);
  }, []);

  // Actual logout (called after user confirms)
  const handleLogoutConfirm = useCallback(() => {
    try { posthog.reset(); } catch (_) {}
    dispatch(clearUserProfile());
    storageInstance.removeStorege("token");
    storageInstance.removeStorege("current-user-type");
    storageInstance.removeStorege("current-user-name");
    storageInstance.removeStorege("current-user-email");
    storageInstance.removeStorege("user-permissions");
    setStoredHospitalityContext(null);
    setLoggedinUser(null);
    setLogoutModalOpen(false);
    router.push("/");
  }, [dispatch, router]);

  // Mobile RFQ toggle button (rendered inside TopBar when TwoPanelPage is active)
  const mobileRfqBtn = mobileRfqToggle ? (
    <button
      type="button"
      className={styles.mobileRfqToggle}
      onClick={mobileRfqToggle.callback}
    >
      {mobileRfqToggle.isOpen
        ? <><PanelLeftClose size={15} strokeWidth={1.75} /> Close Sidebar</>
        : <><PanelLeftOpen size={15} strokeWidth={1.75} /> {mobileRfqToggle.label}</>
      }
    </button>
  ) : null;

  return (
    <TwoPanelContext.Provider value={twoPanelCtx}>
      <div className={styles.shell}>
        <TopBar
          user={loggedinUser}
          currentUserType={currentUserType}
          onNavToggle={handleNavToggle}
          onLogoutRequest={handleLogoutRequest}
          mobileRfqToggle={mobileRfqBtn}
        />
        <div className={styles.body}>
          <SideNav
            user={loggedinUser}
            currentUserType={currentUserType}
            subSidebar={subSidebar}
            collapsed={sidebarCollapsed}
            onLogoutRequest={handleLogoutRequest}
          />
          <div className={styles.main}>
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </div>

      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={loggedinUser}
        currentUserType={currentUserType}
        onLogout={handleLogoutRequest}
      />

      {/* Logout confirmation modal */}
      <ConfirmationModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="Sign out of Workwise?"
        description="You'll need to sign in again to access your dashboard, manage RFQs, and continue your procurement workflows."
        confirmButtonColor="danger"
        confirmButtonText="Sign Out"
        cancelButtonText="Stay Signed In"
      />

    </TwoPanelContext.Provider>
  );
};

export default DashboardShell;
