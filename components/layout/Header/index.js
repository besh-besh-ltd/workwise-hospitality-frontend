"use client";
import { getProfile, getUserDetails } from "@/services/Auth";
import { getMyPermissions } from "@/services/rbac";
import storageInstance from "@/utils/storageInstance";
import { faBell, faUser, faMessage } from "@fortawesome/free-regular-svg-icons";
import { faGear, faSignOut } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import DropdownMenu from "@/components/shared/DropdownMenu";
import HospitalityContextModal from "@/components/hospitality/HospitalityContextModal";
import {
  getStoredHospitalityContext,
  setStoredHospitalityContext,
  subscribeHospitalityContext,
} from "@/utils/hospitalityContext";
import { getMyHospitalityContexts } from "@/services/hospitality";

const initialMainNavs = [
  "/",
  "/aboutus",
  "/contactus",
  "/for-vendors",
  "/vendor/all",
  "/hotel-vendor",
  // "/IEW-2025",
  "/solutions",
  "/blogs",
  "/validate-otp",
  "/forget-password",
  "/privacypolicy",
  "/terms-of-use",
  "/products",
  "/dashboard/vendor/inquiries-details",
  "/dashboard/buyer/rfq-management-vendor/vendor-profile",
  "/newHomePageDesign",
  // New pages for comprehensive navigation
  "/ai-tools",
  "/ai-tools/boq-simplification",
  "/ai-tools/cost-estimation",
  "/ai-tools/tender-summary",
  "/ai-tools/technical-summary",
  "/insights",
  "/insights/events",
  "/insights/news",
  "/insights/procurement-guide",
  "/insights/ai-procurement",
  "/insights/epc-trends",
  "/modules",
  "/modules/boq",
  "/modules/rfq",
  "/modules/payments",
  "/modules/evaluation",
  "/modules/negotiation",
  "/modules/vendors",
  "/work-with-us",
  "/work-with-us/TeamTimeline",
  "/work-with-us/careers",
];

const roleMenus = {
  admin: [
    // this is buyer company admin
    {
      href: "/dashboard/admin/editprofile",
      label: "Profile",
      targetMenu: "popup",
    },
    {
      href: "/dashboard/admin",
      label: "Dashboard",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/admin/project-management/project-management",
      label: "Project Management",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/admin/account-management/manage-accounts",
      label: "User Management",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/admin/hospitality-manager",
      label: "Hospitality Network",
      targetMenu: "nav",
    },
    // { href: "/dashboard/admin/account-management/create-account", label: "RFQ management" },
  ],
  buyer: [ // procurment person 
    { href: "/dashboard/buyer", label: "Dashboard", targetMenu: "nav" },
    { href: "/vendor/all", label: "Search Vendor", targetMenu: "nav" },
    {
      href: "/dashboard/buyer/rfq-management",
      label: "RFQ management",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/technical-evaluation",
      label: "Technical Evaluation",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/quote-compare",
      label: "Quote Comparison",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/purchase-order",
      label: "Purchase Orders",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/editprofile",
      label: "Profile",
      targetMenu: "popup",
    },
   {
      href: "/dashboard/buyer/project-management",
      label: "Project Management",
      targetMenu: "popup",
    },
    {
      href: "/dashboard/buyer/vendor-management",
      label: "Vendor Management",
      targetMenu: "popup",
    },

  ],
  "management": [ // procurment person 
    { href: "/dashboard/management", label: "Dashboard", targetMenu: "nav" },
    { href: "/vendor/all", label: "Search Vendor", targetMenu: "nav" },
    {
      href: "/dashboard/buyer/rfq-management",
      label: "RFQ management",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/technical-evaluation",
      label: "Technical Evaluation",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/quote-compare",
      label: "Quote Comparison",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/arc-committee",
      label: "ARC Committee",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/purchase-order",
      label: "Purchase Orders",
      targetMenu: "nav",
    },
        {
      href: "/dashboard/management/editprofile",
      label: "Profile",
      targetMenu: "popup",
    },
      {
      href: "/dashboard/management/project-management",
      label: "Project Management",
      targetMenu: "popup",
    },
    {
      href: "/dashboard/buyer/vendor-management",
      label: "Vendor Management",
      targetMenu: "popup",
    },
  ],
  finance: [
    {
      href: "/dashboard/finance/editprofile",
      label: "Profile",
      targetMenu: "popup",
    },
    { href: "/dashboard/finance", label: "Dashboard", targetMenu: "popup" },
    {
      href: "/dashboard/buyer/quote-compare",
      label: "Quote Comparison",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/buyer/purchase-order",
      label: "Purchase Orders",
      targetMenu: "nav",
    },
  ],
  engineering: [
    {
      href: "/dashboard/engineering/editprofile",
      label: "Profile",
      targetMenu: "popup",
    },
    { href: "/dashboard/engineering", label: "Dashboard", targetMenu: "popup" },
    {
      href: "/dashboard/buyer/technical-evaluation",
      label: "Technical Evaluation",
      targetMenu: "nav",
    },
  ],
  vendor: [
    {
      href: "/dashboard/vendor/editprofile",
      label: "Profile",
      targetMenu: "popup",
    },
    {
      href: "/dashboard/vendor/product-management",
      label: "Product Management",
      targetMenu: "nav",
    },
    // { href: "/dashboard/vendor/product-review", label: "Product Review" },
    {
      href: "/dashboard/vendor/inquiries-received",
      label: "Received Inquiries",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/vendor/reviews-ratings",
      label: "Reviews & Ratings",
      targetMenu: "nav",
    },
    {
      href: "/dashboard/vendor/order-book",
      label: "Order Book",
      targetMenu: "nav",
    },
  ],
};

// Comprehensive website navigation menu structure
const websiteMenu = [
  { 
    label: "Our Offerings", 
    type: "dropdown",
    options: [
      { label: "BOQ Understanding & Simplification", href: "/modules/boq" },
      { label: "RFQ Creation & Management", href: "/modules/rfq" },
      { label: "Supplier Discovery & Vendor Management", href: "/modules/vendors" },
      { label: "Technical & Commercial Evaluation", href: "/modules/evaluation" },
      { label: "Negotiation Management", href: "/modules/negotiation" },
      { label: "PO & Payment Lifecycle Management", href: "/modules/payments" },
    ]
  },
  { 
    label: "Who We Serve", 
    type: "dropdown",
    options: [
      { 
        label: "Stakeholders", 
        type: "nested-dropdown",
        options: [
          { label: "EPCs / Contractors", href: "/who-we-serve/stakeholders/epcs" },
          { label: "Turnkey Project Firms", href: "/who-we-serve/stakeholders/turnkey" },
          { label: "Project Consultants", href: "/who-we-serve/stakeholders/consultants" },
          { label: "Industrial Clients", href: "/who-we-serve/stakeholders/industrial-clients" },
          { label: "Vendors & OEMs", href: "/for-vendors" },
        ]
      },
      { 
        label: "Industries We Serve", 
        type: "nested-dropdown",
        options: [
          { label: "Power", href: "/who-we-serve/industries/power" },
          { label: "Energy", href: "/who-we-serve/industries/energy" },
          { label: "Petrochemical & Chemical", href: "/who-we-serve/industries/petrochemical" },
          { label: "Steel & Cement", href: "/who-we-serve/industries/steel-cement" },
          { label: "Infrastructure", href: "/who-we-serve/industries/infrastructure" },
          { label: "Heavy Engineering & Machine Tools", href: "/who-we-serve/industries/heavy-equipment" },
          { label: "Marine & Mining", href: "/who-we-serve/industries/marine-mining" },
        ]
      },
      { 
        label: "Disciplines We Cover", 
        type: "nested-dropdown",
        options: [
          { label: "Electrical", href: "/solutions/electrical" },
          { label: "Mechanical", href: "/solutions/mechanical" },
          { label: "Civil", href: "/solutions/civil" },
          { label: "HVAC", href: "/solutions/hvac" },
          { label: "Fire & Safety", href: "/solutions/fire-engineering" },
          { label: "Chemical", href: "/solutions/chemical" },
        ]
      },
    ]
  },
  { 
    label: "Tools", 
    type: "dropdown",
    options: [
      { label: "Vendor Discovery", href: "/vendor/all" },
      { label: "BOQ Simplifier", href: "/ai-tools/boq-simplification" },
      { label: "Project Cost Estimator", href: "/ai-tools/cost-estimation" },
      { label: "Tender Summary", href: "/ai-tools/tender-summary" },
      { label: "Technical Document Summary", href: "/ai-tools/technical-summary" },
    ]
  },
  { 
    label: "Insights & Resources", 
    type: "dropdown",
    options: [
      { label: "Blogs", href: "https://letsworkwise.com/blog/", external: true },
      { label: "Events", href: "/insights/events" },
      { label: "Procurement Guide for Project & Purchase Managers", href: "/insights/procurement-guide" },
      { label: "AI in Procurement - Use Cases", href: "javascript:void(0)", upcoming: true },
      { label: "Trends in EPC Procurement", href: "/insights/epc-trends" },
      { label: "Workwise in News", href: "/insights/news" },
    ]
  },
  { 
    label: "Work With Us", 
    type: "dropdown",
    options: [
      { label: "Meet the Team", href: "/work-with-us/TeamTimeline" },
      { label: "We are hiring!", href: "/work-with-us/careers" },
      { label: "Earn With Us", href: "/earn-with-us/EarnWithUs" },
      { label: "Contact Us", href: "/contactus" },
    ]
  },
  { 
    label: "Pricing", 
    type: "dropdown",
    options: [
      { label: "Buyer pricing", href: "/pricing", action: "buyer-pricing" },
      { label: "Supplier plans", href: "/pricing", action: "supplier-pricing" },
              { label: "Claim Pilot Project Access for Free", href: "/pilot-project" },

    ]
  },
];

const Header = () => {
  const router = useRouter();

  const { pathname } = router;
  const { user_registered, loggedin, auth } = router.query;
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("register");
  const [sticky, setSticky] = useState("");
  const [menuClass, setMenuClass] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const popoverRef = useRef(null);
  const [loggedinUser, setLoggedinUser] = useState(null);
  const [currentUserType, setcurrentUserType] = useState("vendor");
  const [loading, setloading] = useState(false);
  const [mainNavs, setMainNavs] = useState(initialMainNavs);
  const [isHospitalityCompany, setIsHospitalityCompany] = useState(false);
  const [hospitalityContexts, setHospitalityContexts] = useState([]);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [hospitalityContext, setHospitalityContextState] = useState(
    getStoredHospitalityContext()
  );

  const togglePopover = () => {
    setPopoverVisible(!popoverVisible);
  };

  const handleUserIconClick = (event) => {
    event.preventDefault(); // Prevent the default behavior (scroll to top)
    togglePopover(); // Toggle the visibility of the popover
  };

  const handleClickOutside = (event) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target)) {
      setPopoverVisible(false);
    }
  };

  // Set State Change
  const handleChange = (setState) => (event) => {
    setState(event);
  };

  // determine if current route should use transparent header at the very top
  const shouldUseTransparent = () => {
    const isPrivate = pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor");
    return !isPrivate && (pathname === "/");
  };

  const isSticky = () => {
    const scrollTop = window.scrollY;
    const stickyClass = scrollTop >= 50 ? "sticky" : "";
    const scrolled = scrollTop > 10;
    handleChange(setSticky(stickyClass));
    setIsScrolled(scrolled);
    // Only add the at-top helper when we are on a page that uses transparent header
    if (!scrolled && shouldUseTransparent()) {
      document.body.classList.add("at-top");
    } else {
      document.body.classList.remove("at-top");
    }
  };

  const setUserDetails = () => {
    const user = getUserDetails();
    if (user?.name) {
      setLoggedinUser(user);
    } else {
      setLoggedinUser(null);
    }
    setcurrentUserType(storageInstance.getStorage("current-user-type"));
  };

  const handleLogout = (e) => {
    e.preventDefault();
    storageInstance.removeStorege("token");
    storageInstance.removeStorege("current-user-type");
    storageInstance.removeStorege("user-permissions");
    setStoredHospitalityContext(null);
    setPopoverVisible(false);
    setLoggedinUser(null);
    setMainNavs(initialMainNavs);
    router.push("/");
  };

  const loadHospitalityContextData = async () => {
    setContextLoading(true);
    try {
      const response = await getMyHospitalityContexts();
      const list = response?.data?.data || response?.data || [];
      setHospitalityContexts(list);
    } catch (error) {
      setHospitalityContexts([]);
    } finally {
      setContextLoading(false);
    }
  };

  const handleOpenContextModal = () => {
    if (!hospitalityContexts.length) {
      loadHospitalityContextData();
    }
    setContextModalOpen(true);
  };

  const handleContextSelect = (selection) => {
    setStoredHospitalityContext(selection);
    setHospitalityContextState(selection);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("hospitalityScopeSelected", "1");
    }
    setContextModalOpen(false);
  };

  useEffect(() => {
    setMenuClass(false);
  }, [router]);

  useEffect(() => {
    setUserDetails();
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", isSticky);
    if (window.scrollY > 100) {
      isSticky();
    }
    return () => {
      window.removeEventListener("scroll", isSticky);
    };
  }, []);

  useEffect(() => {
    setUserDetails();
    if (user_registered == 1) {
      toast.success("Now login to get started!");
      handleChange(setActiveAuthTab("login"));
      handleChange(setOpenAuthModal(true));
    }

    // Open login modal directly when ?auth=login is present
    if (auth === 'login') {
      handleChange(setActiveAuthTab('login'));
      handleChange(setOpenAuthModal(true));
    }

    if (localStorage.getItem("token") || loggedin == "true") {
      let revisedNavs = mainNavs.filter(
        (navItem) =>
          navItem != "/products" &&
          navItem != "/dashboard/vendor/inquiries-details" &&
          navItem != "/dashboard/buyer/rfq-management-vendor/vendor-profile"
      );
      setMainNavs(revisedNavs);
    } else {
      let revisedNavs = mainNavs.filter(
        (navItem) =>
          navItem != "/products" ||
          navItem != "/dashboard/vendor/inquiries-details"
      );
      if (pathname === "/products") {
        revisedNavs.push("/products");
      } else if (pathname?.includes("/dashboard/vendor/inquiries-details")) {
        revisedNavs.push("/dashboard/vendor/inquiries-details");
      }
      setMainNavs(revisedNavs);
    }
  }, [router, pathname]);

  useEffect(() => {
    let isMounted = true;
    const fetchHospitalityFlag = async () => {
      try {
        const response = await getProfile();
        if (!isMounted) return;
        const profile = response?.data;
        const hospitalityEnabled =
          profile?.is_hospitality == 1;
        setIsHospitalityCompany(!!hospitalityEnabled);
        if (!hospitalityEnabled) {
          setHospitalityContexts([]);
          setStoredHospitalityContext(null);
        }

        // Fetch and store user permissions after profile is fetched (skip for vendors)
        // Vendors (user_type 3) don't need permissions
        if (profile?.user_type !== 3) {
          try {
            const permissionsResponse = await getMyPermissions();
            if (!isMounted) return;
            if (permissionsResponse?.data?.data) {
              storageInstance.setStorageObj("user-permissions", permissionsResponse.data.data);
            }
          } catch (permissionsError) {
            // Silently fail if permissions fetch fails (e.g., 403 for vendors or other users)
            console.error("Failed to fetch user permissions:", permissionsError);
          }
        }
      } catch (error) {
        if (isMounted) {
          setIsHospitalityCompany(false);
          setHospitalityContexts([]);
          setStoredHospitalityContext(null);
        }
      }
    };

    if (loggedinUser) {
      fetchHospitalityFlag();
    } else {
      setIsHospitalityCompany(false);
    }

    return () => {
      isMounted = false;
    };
  }, [loggedinUser, currentUserType]);

  // Hospitality scope selection via global modal is now disabled.
  // Hotel / scope is selected via per-page filters instead.
  useEffect(() => {
    // no-op: keep hook to avoid removing existing logic structure
  }, [isHospitalityCompany]);

  useEffect(() => {
    // no-op: prevent auto-opening hospitality context modal
  }, [hospitalityContexts, hospitalityContext]);

  useEffect(() => {
    const unsubscribe = subscribeHospitalityContext((context) => {
      setHospitalityContextState(context);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const currentRoleMenu = useMemo(() => {
    const baseMenu = roleMenus[currentUserType] || [];
    if (currentUserType === "admin" && !isHospitalityCompany) {
      return baseMenu.filter(
        (item) => item.href !== "/dashboard/admin/hospitality-manager"
      );
    }
    return baseMenu;
  }, [currentUserType, isHospitalityCompany]);

  // Hospitality scope button removed - hotel selection is now done via filters on each page
  const showHospitalityScopeButton = false;

  return (
    <>
      <header
        className={`main-header ${sticky} ${menuClass ? "menu-open" : ""} ${(() => {
          const isPrivate = pathname?.startsWith("/dashboard");
          if (isPrivate ) {
            return "always-white"; // never transparent for logged-in areas
          }
          if (pathname === "/") {
            // Force non-transparent header when mobile menu is open to match scrolled styling
            return (menuClass || isScrolled) ? "scrolled hero-page" : "transparent hero-page";
          }
          return "scrolled"; // default public pages are white
        })()}`}
      >
        <div className="container-fluid">
          <div className="header-container">
            <div className="logo">
              <Link
                href={
                  loggedinUser
                    ? currentUserType === "vendor"
                      ? "/dashboard/vendor"
                      : currentUserType === "admin"
                      ? "/dashboard/admin"
                      : currentUserType === "management"
                      ? "/dashboard/management"
                      : currentUserType === "engineering"
                      ? "/dashboard/engineering"
                      : currentUserType === "finance"
                      ? "/dashboard/finance"
                      : "/dashboard/buyer"
                    : "/"
                }
              >
                <Image
                  src="/assets/images/logo1.png"
                  alt="Workwise"
                  className={`logo-image ${(!isScrolled && shouldUseTransparent()) ? "logo-white" : ""}`}
                  width={160}
                  height={20}
                  priority={true}
                />
              </Link>
            </div>

            {/* Website Navigation - Show for public pages and all users */}
            {(mainNavs.includes(pathname) ||
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
              pathname === "/") && (
              <>
                <div className="header-right align-items-center normalMenu">
                  {/* START: website navbar - static pages content */}
                  <nav className="main-menu">
                    <ul>
                                            {websiteMenu.map((item, index) => (
                        item.type === 'dropdown' ? (
                          <DropdownMenu
                            key={index}
                            label={item.label}
                            options={item.options}
                            href={item.href}
                            onAction={(action) => {
                              if (action === 'open-auth-modal') {
                                setOpenAuthModal(true);
                              }
                            }}
                          />
                        ) : (
                          <li
                            key={index}
                            className={router.pathname === item.href ? 'active' : ''}
                          >
                             <Link href={item.href}>{item.label}</Link>
                          </li>
                        )
                      ))}
                    </ul>
                  </nav>
                  {/* END: website navbar - static pages content */}

                  {/* Supplier CTA Button - show on desktop too */}
                  <div className="supplier-cta d-none d-md-block">
                    <Link href="/for-vendors" className="btn-supplier">
                      For Suppliers
                    </Link>
                  </div>

                  {/* Logged-in profile icon on public navbar*/}
                  {loggedinUser && loggedinUser?.name && !(
                    pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor")
                  ) && (
                    <div className="header-right align-items-center forLoggedIn hidemobile">
                      <nav className="main-menu">
                        <ul>
                          <li className="">
                            <Link href="" onClick={handleUserIconClick}>
                              <FontAwesomeIcon icon={faUser} style={{ fontSize: 'calc(1em + 5px)' }} />
                            </Link>
                          </li>
                        </ul>
                      </nav>

                      {popoverVisible && (
                        <div className="popover-account" ref={popoverRef}>
                          <ul className="vertical-links">
                            {currentRoleMenu
                              ?.filter((menuType) => menuType.targetMenu == "popup")
                              ?.map((item) => (
                                <li
                                  key={item.href}
                                  className={pathname === item.href ? "active" : ""}
                                >
                                  <Link
                                    href={item.href}
                                    onClick={() => setPopoverVisible(false)}
                                  >
                                    {item.label}
                                  </Link>
                                </li>
                              ))}

                            <li
                              className={
                                router.pathname == "/change-password" ? "active" : ""
                              }
                            >
                              <Link
                                href={`/change-password?redirect_url=${window.location.pathname}`}
                                onClick={() => setPopoverVisible(false)}
                              >
                                Change Password
                              </Link>
                            </li>

                            <li>
                              <Link
                                href=""
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleLogout(e);
                                }}
                              >
                                Logout
                              </Link>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`extra-buttons hideDesktop ${
                      loggedinUser && loggedinUser?.name && "hasloggedinuser"
                    }`}
                  >
                    {/* FOR LOGGED IN */}
                    {loggedinUser && loggedinUser?.name && (
                      <ul>
                        <li
                          className="login"
                          onClick={() => {
                            router.push(`/dashboard/${currentUserType}`);
                          }}
                          id="my_account-user_menu-header"
                        >
                          <Link href="">
                            {" "}
                            <FontAwesomeIcon icon={faUser} />{" "}
                            <span>My Account</span>
                          </Link>
                        </li>
                        <li className="signup" onClick={handleLogout} id="logout_mobile-user_menu-header">
                          <Link href="">
                            <FontAwesomeIcon icon={faSignOut} />{" "}
                            <span>Logout</span>
                          </Link>
                        </li>
                      </ul>
                    )}

                    {/* FOR NON LOGGED IN  */}
                    {!loggedinUser && !loggedinUser?.name && (
                      <ul>
                       {false && ( <li
                          className="login"
                          onClick={() => {
                            handleChange(setActiveAuthTab('login'));
                            handleChange(setOpenAuthModal(true));
                          }}
                        >
                          <Link href="javascript:void(0)">
                            Login
                          </Link>
                        </li>
                        )}
                        {/* Mobile-only: show For Suppliers instead of Book a Call */}
                        <li className="signup d-block d-md-none">
                          <Link href="/for-vendors" className="btn-supplier" style={{ color: '#000' }}>
                            For Suppliers
                          </Link>
                        </li>
                        
                          <li
                            className="signup book-call d-none d-md-block"
                            onClick={() => {
                              handleChange(setActiveAuthTab('book-a-call'));
                              handleChange(setOpenAuthModal(true));
                            }}
                          >
                            <Link
                              id="book-a-call-navigation"
                              href="javascript:void(0)"
                              style={{ width: "fit-content", fontSize: "14px" }}
                            >
                              Book a Call
                            </Link>
                          </li>
                        
                      </ul>
                    )}
                  </div>
                </div>

                {/* Mobile Menu Toggle */}
                <div className={`menu-ctrl ${menuClass ? "button-active" : ""} ${(!isScrolled && shouldUseTransparent() && !menuClass) ? 'menu-ctrl-transparent' : ''}`} style={{ marginLeft: '8px' }}>
                  <label
                    htmlFor="menu-toggle"
                    onClick={() => setMenuClass(!menuClass)}
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </label>
                </div>
              </>
            )}

            {/* Logged-in User Navigation - Show for dashboard and user-specific pages */}
            {loggedinUser && loggedinUser?.name && (pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor")) ? (
              <>
                {!mainNavs.includes(pathname) && (
                  <div className="header-right header-center align-items-center forLoggedIn">
                    <nav className="main-menu">
                      <ul className="d-flex justify-content-start w-100">
                        {currentRoleMenu
                          ?.filter(
                            (menuType) => menuClass || menuType.targetMenu == "nav"
                          )
                          ?.map((item) => (
                            <li
                              key={item.href}
                              className={
                                pathname === item.href ? "active" : ""
                              }
                            >
                              <Link href={item.href}>{item.label}</Link>
                            </li>
                          ))}
                      </ul>
                    </nav>
                  </div>
                )}

                <div className="header-right align-items-center forLoggedIn hidemobile">
                  <nav className="main-menu">
                    <ul className="d-flex align-items-center">
                      {showHospitalityScopeButton && (
                        <li className="me-3">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm fw-semibold"
                            style={{ color: "#0f6cff", borderColor: "#0f6cff", backgroundColor: "white" }}
                            onClick={handleOpenContextModal}
                          >
                            {hospitalityContext
                              ? `${hospitalityContext.companyName}${
                                  hospitalityContext.hotelId
                                    ? " / " + hospitalityContext.hotelName
                                    : ""
                                }`
                              : "Select Hospitality Scope"}
                          </button>
                        </li>
                      )}
                      <li className="">
                        <Link href="" onClick={handleUserIconClick} id="user_icon-user_menu-header">
                          <FontAwesomeIcon icon={faUser} style={{ fontSize: 'calc(1em + 5px)' }} />
                        </Link>
                      </li>
                    </ul>
                  </nav>

                  {popoverVisible && (
                    <div className="popover-account" ref={popoverRef}>
                      <ul className="vertical-links">
                        {currentRoleMenu
                          ?.filter((menuType) => menuType.targetMenu == "popup")
                          ?.map((item) => (
                            <li
                              key={item.href}
                              className={pathname === item.href ? "active" : ""}
                            >
                              <Link
                                href={item.href}
                                onClick={() => setPopoverVisible(false)}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}

                        <li
                          className={
                            router.pathname == "/change-password"
                              ? "active"
                              : ""
                          }
                        >
                          <Link
                            href={`/change-password?redirect_url=${window.location.pathname}`}
                            onClick={() => setPopoverVisible(false)}
                            id="change_password-user_popup-header"
                          >
                            Change Password
                          </Link>
                        </li>

                        <li>
                          <Link
                            href=""
                            onClick={(e) => {
                              e.preventDefault();
                              handleLogout(e);
                            }}
                          >
                            Logout
                          </Link>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Announcement bar for marquee scroll */}
        {(mainNavs.includes(pathname) ||
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
          pathname === "/") && (
            <div
              className="announcement-wrapper"
              style={{
                background: 'linear-gradient(90deg, #FFF1B8 0%, #FFD666 100%)',
                borderBottom: '1px solid rgba(0,0,0,0.06)'
              }}
            >

              <marquee className="pt-1">
                <strong className=" " style={{fontWeight: '600' }}>
                  Now expanding Internationally - meet us at Intersec Dubai 2026 from 12-14 January, Stand no. SR-D24, Dubai World Trade Centre
                </strong>
              </marquee>
            </div>
          )}


        {/* Mobile Menu */}
        {menuClass && (
            mainNavs.includes(pathname) ||
            pathname?.startsWith("/solutions") ||
            pathname?.startsWith("/insights") ||
            pathname?.startsWith("/modules") ||
            pathname?.startsWith("/work-with-us") ||
            pathname?.startsWith("/blogs") ||
            pathname?.startsWith("/for-vendors") ||
            pathname?.startsWith("/contactus") ||
            pathname?.startsWith("/aboutus")||
            pathname?.startsWith("/ai-tools")
          ) && (
          <div className="mobile-menu">
            <nav className="main-menu" style={{ color: '#fff' }}>
              <ul>
                {websiteMenu.map((item, index) => (
                  <li key={index}>
                    {item.type === 'dropdown' ? (
                      <DropdownMenu
                        label={item.label}
                        options={item.options}
                        href={item.href}
                        forceMobile={true}
                        onAction={(action) => {
                          if (action === 'open-auth-modal') {
                            setOpenAuthModal(true);
                          }
                        }}
                      />
                    ) : (
                      <Link href={item.href} style={{ color: '#fff' }}>{item.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            {!loggedinUser && (
              <div className="mobile-actions">
                <Link
                  href="javascript:void(0)"
                  className="action-btn login"
                  onClick={() => {
                    handleChange(setActiveAuthTab('login'));
                    handleChange(setOpenAuthModal(true));
                  }}
                >
                  Login
                </Link>
                <Link
                  href="javascript:void(0)"
                  className="action-btn book-call"
                  onClick={() => {
                    handleChange(setActiveAuthTab('book-a-call'));
                    handleChange(setOpenAuthModal(true));
                  }}
                >
                  Book a Call
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Mobile Menu for Logged-in Users */}
        {menuClass && loggedinUser && loggedinUser?.name && (pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor")) && (
          <div className="mobile-menu">
            <nav className="main-menu">
              <ul>
                {currentRoleMenu
                  ?.filter((menuType) => menuType.targetMenu == "nav")
                  ?.map((item) => (
                    <li
                      key={item.href}
                      className={pathname === item.href ? "active" : ""}
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </li>
                  ))}
                <li>
                  <Link href={`/dashboard/${currentUserType}`}>
                    <FontAwesomeIcon icon={faUser} /> My Account
                  </Link>
                </li>
                <li>
                  <Link href="javascript:void(0)" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faSignOut} /> Logout
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </header>

      {/* Removed sticky mobile CTA in favor of actions inside hamburger menu */}



      {/* Auth Modal */}
      <LoginContainer
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        activeAuthTab={activeAuthTab}
        setActiveAuthTab={setActiveAuthTab}
        loading={loading}
        setloading={setloading}
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
