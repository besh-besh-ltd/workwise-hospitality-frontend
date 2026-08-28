"use client";
import { getUserDetails } from "@/services/Auth";
import storageInstance from "@/utils/storageInstance";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearUserProfile } from "@/redux/slice";
import { toast } from "react-toastify";
import { BsPerson } from "react-icons/bs";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import DropdownMenu from "@/components/shared/DropdownMenu";
import HospitalityContextModal from "@/components/hospitality/HospitalityContextModal";
import {
  getStoredHospitalityContext,
  setStoredHospitalityContext,
  subscribeHospitalityContext,
} from "@/utils/hospitalityContext";


import usePendingApprovalIndicators from "@/hooks/usePendingApprovalIndicators";
import { initialMainNavs, visibleRoleMenu, websiteMenu, ANNOUNCEMENT_TEXT } from "./headerConfig";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import styles from "./Header.module.css";
import posthog from 'posthog-js';

const Header = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { pathname } = router;
  const { user_registered, loggedin, auth } = router.query;

  // ── UI state ──────────────────────────────────
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("register");
  const [sticky, setSticky] = useState("");
  const [menuClass, setMenuClass] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // ── User state ────────────────────────────────
  const [loggedinUser, setLoggedinUser] = useState(null);
  const [currentUserType, setCurrentUserType] = useState("vendor");
  const [loading, setLoading] = useState(false);
  const [mainNavs, setMainNavs] = useState(initialMainNavs);

  // ── Hospitality state ─────────────────────────
  const [isHospitalityCompany, setIsHospitalityCompany] = useState(false);
  const [hospitalityContexts, setHospitalityContexts] = useState([]);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextLoading] = useState(false);
  const [hospitalityContext, setHospitalityContextState] = useState(
    getStoredHospitalityContext()
  );
  const [userBusinessUnits, setUserBusinessUnits] = useState([]);
  const userProfile = useSelector((state) => state.userProfile);

  // ── Derived state ─────────────────────────────
  const isDashboardPage = useMemo(() => {
    return loggedinUser && loggedinUser?.name &&
      (pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor"));
  }, [loggedinUser, pathname]);

  const isPublicPage = useMemo(() => {
    // If user is logged in and on a dashboard/vendor page, always show dashboard nav
    if (isDashboardPage) return false;
    return mainNavs.includes(pathname) ||
      pathname?.startsWith("/solutions") ||
      pathname?.startsWith("/insights") ||
      pathname?.startsWith("/ai-tools") ||
      pathname?.startsWith("/modules") ||
      pathname?.startsWith("/work-with-us") ||
      pathname?.startsWith("/blogs") ||
      pathname?.startsWith("/for-vendors") ||
      pathname?.startsWith("/contactus") ||
      pathname?.startsWith("/aboutus") ||
      (pathname?.startsWith("/vendor") && !(loggedinUser && loggedinUser?.name)) ||
      pathname === "/";
  }, [pathname, loggedinUser, mainNavs, isDashboardPage]);

  const shouldUseTransparent = () => {
    const isPrivate = pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor");
    return !isPrivate && pathname === "/";
  };

  const { hasPendingApproval } = usePendingApprovalIndicators({
    enabled: !!loggedinUser && !!isDashboardPage,
  });

  const currentRoleMenu = useMemo(
    () => visibleRoleMenu(currentUserType, { isHospitalityCompany }),
    [currentUserType, isHospitalityCompany]
  );

  // ── Subscription guard: redirect from locked pages ──
  useEffect(() => {
    if (!userProfile || currentUserType !== "vendor") return;
    const isHospitalityVendor = userProfile?.is_hospitality == 1;
    const hasValidSub = !!userProfile?.has_valid_hospitality_subscription;
    if (!isHospitalityVendor || hasValidSub) return;

    const lockedRoutes = currentRoleMenu
      ?.filter((item) => item.requiresSubscription)
      ?.map((item) => item.href) || [];

    const isOnLockedRoute = lockedRoutes.some((route) => pathname?.startsWith(route));
    // Also block send-quote, quote (new wizard) and inquiries-details (child routes)
    const isOnChildLockedRoute =
      pathname?.startsWith("/dashboard/vendor/send-quote") ||
      pathname?.startsWith("/dashboard/vendor/quote") ||
      pathname?.startsWith("/dashboard/vendor/inquiries-details");

    if (isOnLockedRoute || isOnChildLockedRoute) {
      toast.warning("Subscription is required to access this page. Please renew your subscription.");
      router.replace("/dashboard/vendor");
    }
  }, [pathname, userProfile, currentUserType, currentRoleMenu]);

  const headerStateClass = useMemo(() => {
    if (isDashboardPage) return styles.alwaysWhite;
    if (pathname === "/") {
      return (menuClass || isScrolled) ? styles.scrolled : styles.transparent;
    }
    return styles.scrolled;
  }, [pathname, menuClass, isScrolled]);

  // ── Helpers ───────────────────────────────────
  const setUserDetails = () => {
    const user = getUserDetails();
    if (user?.name) {
      setLoggedinUser(user);
    } else {
      setLoggedinUser(null);
    }
    setCurrentUserType(storageInstance.getStorage("current-user-type"));
  };

  const handleLogout = (e) => {
    e.preventDefault();
    posthog.reset();
    dispatch(clearUserProfile());
    storageInstance.removeStorege("token");
    storageInstance.removeStorege("current-user-type");
    storageInstance.removeStorege("current-user-name");
    storageInstance.removeStorege("current-user-email");
    storageInstance.removeStorege("user-permissions");
    setStoredHospitalityContext(null);
    setPopoverVisible(false);
    setLoggedinUser(null);
    setMainNavs(initialMainNavs);
    setMenuClass(false);
    router.push("/");
  };

  const handleContextSelect = (selection) => {
    setStoredHospitalityContext(selection);
    setHospitalityContextState(selection);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("hospitalityScopeSelected", "1");
    }
    setContextModalOpen(false);
  };

  const getDashboardHref = () => {
    if (!loggedinUser) return "/";
    const map = {
      vendor: "/dashboard/vendor",
      admin: "/dashboard/admin",
      management: "/dashboard/management",
      engineering: "/dashboard/engineering",
      finance: "/dashboard/finance",
      buyer: "/dashboard/buyer",
    };
    return map[currentUserType] || "/dashboard/buyer";
  };

  // ── Effects ───────────────────────────────────
  useEffect(() => { setMenuClass(false); }, [router]);

  useEffect(() => { setUserDetails(); }, []);

  useEffect(() => {
    const isSticky = () => {
      const scrollTop = window.scrollY;
      setSticky(scrollTop >= 50 ? "sticky" : "");
      const scrolled = scrollTop > 10;
      setIsScrolled(scrolled);
      if (!scrolled && shouldUseTransparent()) {
        document.body.classList.add("at-top");
      } else {
        document.body.classList.remove("at-top");
      }
    };
    window.addEventListener("scroll", isSticky);
    if (window.scrollY > 100) isSticky();
    return () => window.removeEventListener("scroll", isSticky);
  }, [pathname]);

  useEffect(() => {
    setUserDetails();
    if (user_registered == 1) {
      toast.success("Now login to get started!");
      setActiveAuthTab("login");
      setOpenAuthModal(true);
    }
    if (auth === "login") {
      setActiveAuthTab("login");
      setOpenAuthModal(true);
    }
    if (localStorage.getItem("token") || loggedin == "true") {
      const revisedNavs = mainNavs.filter(
        (nav) =>
          nav !== "/products" &&
          nav !== "/dashboard/vendor/inquiries-details" &&
          nav !== "/dashboard/buyer/rfq-management-vendor/vendor-profile"
      );
      setMainNavs(revisedNavs);
    } else {
      let revisedNavs = mainNavs.filter(
        (nav) =>
          nav !== "/products" ||
          nav !== "/dashboard/vendor/inquiries-details"
      );
      if (pathname === "/products") {
        revisedNavs.push("/products");
      } else if (pathname?.includes("/dashboard/vendor/inquiries-details")) {
        revisedNavs.push("/dashboard/vendor/inquiries-details");
      }
      setMainNavs(revisedNavs);
    }
  }, [router, pathname]);

  // Profile + hospitality flag
  useEffect(() => {
    let isMounted = true;
    const hospitalityEnabled = userProfile?.is_hospitality == 1;
    if (loggedinUser) {
      setIsHospitalityCompany(!!hospitalityEnabled);
      if (!hospitalityEnabled) {
        setHospitalityContexts([]);
        setStoredHospitalityContext(null);
        setUserBusinessUnits([]);
      }
      if (hospitalityEnabled) {
        const allMappings = userProfile?.hospitality_mappings || [];
        const seen = new Set();
        const uniqueMappings = allMappings
          .filter((m) => m.hospitality_hotel_id != null)
          .filter((m) => {
            if (seen.has(m.hospitality_hotel_id)) return false;
            seen.add(m.hospitality_hotel_id);
            return true;
          });
        setUserBusinessUnits(uniqueMappings);
      }
    } else {
      setIsHospitalityCompany(false);
    }
    return () => { isMounted = false; };
  }, [loggedinUser, currentUserType, userProfile]);

  // Hospitality context subscription
  useEffect(() => {
    const unsubscribe = subscribeHospitalityContext((context) => {
      setHospitalityContextState(context);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Responsive nav overflow is now handled by DashboardShell on dashboard/vendor routes.
  // This Header only renders on public pages, so no dashboard-nav overflow logic is needed.

  // ── Render ────────────────────────────────────
  return (
    <>
      <header className={`${styles.header} ${headerStateClass} ${sticky ? styles.sticky : ""}`}>
        <div className={styles.headerInner}>
          {/* Logo */}
          <div className={styles.logo}>
            <Link href={getDashboardHref()}>
              <Image
                src="/assets/images/logo1.png"
                alt="Workwise"
                className={`${styles.logoImage} ${(!isScrolled && shouldUseTransparent()) ? styles.logoWhite : ""}`}
                width={160}
                height={20}
                priority
              />
            </Link>
          </div>

          {/* ── Public Navigation ── */}
          {isPublicPage && (
            <div className={`${styles.publicNav} ${styles.hideMobile}`}>
              <nav>
                <ul className={styles.publicNavList}>
                  {websiteMenu.map((item, index) =>
                    item.type === "dropdown" ? (
                      <DropdownMenu
                        key={index}
                        label={item.label}
                        options={item.options}
                        href={item.href}
                        onAction={(action) => {
                          if (action === "open-auth-modal") setOpenAuthModal(true);
                        }}
                      />
                    ) : (
                      <li key={index} className={pathname === item.href ? "active" : ""}>
                        <Link href={item.href}>{item.label}</Link>
                      </li>
                    )
                  )}
                </ul>
              </nav>
            </div>
          )}

          {/* ── Public CTAs ── */}
          {isPublicPage && (
            <div className={`${styles.ctaGroup} ${styles.hideMobile}`}>
              <Link href="/for-vendors" className={styles.btnOutlineCta}>
                For Suppliers
              </Link>
              <button
                type="button"
                className={styles.btnFilledCta}
                onClick={() => {
                  setActiveAuthTab("book-a-call");
                  setOpenAuthModal(true);
                }}
                id="book-a-call-navigation"
              >
                Book a Call
              </button>

              {/* Logged-in user icon on public pages */}
              {loggedinUser && loggedinUser?.name && !(
                pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor")
              ) && (
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={styles.publicUserBtn}
                    onClick={() => setPopoverVisible(!popoverVisible)}
                  >
                    <BsPerson />
                  </button>
                  {popoverVisible && (
                    <UserMenu
                      user={loggedinUser}
                      userBusinessUnits={userBusinessUnits}
                      currentUserType={currentUserType}
                      roleMenu={currentRoleMenu}
                      hiddenNavItems={[]}
                      pathname={pathname}
                      isOpen={true}
                      onToggle={() => setPopoverVisible(false)}
                      onLogout={handleLogout}
                      onClose={() => setPopoverVisible(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dashboard navigation + user menu now live in DashboardShell.
              This Header renders on public pages only. */}

          {/* ── Hamburger ── */}
          {isPublicPage && (
            <button
              type="button"
              className={`${styles.hamburger} ${styles.hideDesktop} ${menuClass ? styles.hamburgerOpen : ""}`}
              onClick={() => setMenuClass(!menuClass)}
              aria-label="Toggle menu"
            >
              <span className={styles.hamburgerBar} />
              <span className={styles.hamburgerBar} />
              <span className={styles.hamburgerBar} />
            </button>
          )}
        </div>

        {/* ── Announcement Bar ── */}
        {isPublicPage && (
          <div className={styles.announcementBar}>
            <div className={styles.announcementTrack}>
              <span className={styles.announcementText}>{ANNOUNCEMENT_TEXT}</span>
              <span className={styles.announcementText}>{ANNOUNCEMENT_TEXT}</span>
            </div>
          </div>
        )}

        {/* ── Mobile Menu ── */}
        <MobileMenu
          isOpen={menuClass}
          isPublicPage={isPublicPage}
          isDashboard={isDashboardPage}
          websiteMenu={websiteMenu}
          roleMenu={currentRoleMenu}
          pathname={pathname}
          user={loggedinUser}
          currentUserType={currentUserType}
          onNavAction={(action) => {
            if (action === "open-auth-modal") setOpenAuthModal(true);
          }}
          onLogout={handleLogout}
          onLoginClick={() => {
            setActiveAuthTab("login");
            setOpenAuthModal(true);
            setMenuClass(false);
          }}
          onBookCallClick={() => {
            setActiveAuthTab("book-a-call");
            setOpenAuthModal(true);
            setMenuClass(false);
          }}
          onClose={() => setMenuClass(false)}
          hasPendingApproval={hasPendingApproval}
        />
      </header>

      {/* ── Modals ── */}
      <LoginContainer
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        activeAuthTab={activeAuthTab}
        setActiveAuthTab={setActiveAuthTab}
        loading={loading}
        setloading={setLoading}
      />
      <HospitalityContextModal
        isOpen={contextModalOpen}
        onClose={() => setContextModalOpen(false)}
        contexts={hospitalityContexts}
        initialSelection={hospitalityContext}
        onSelect={handleContextSelect}
        loading={contextLoading}
      />
    </>
  );
};

export default Header;
