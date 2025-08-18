"use client";
import { getUserDetails } from "@/services/Auth";
import storageInstance from "@/utils/storageInstance";
import { faBell, faUser, faMessage } from "@fortawesome/free-regular-svg-icons";
import { faGear, faSignOut } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import LoginContainer from "@/components/AuthContainer/LoginContainer";
import DropdownMenu from "@/components/shared/DropdownMenu";

const initialMainNavs = [
  "/",
  "/aboutus",
  "/contactus",
  "/for-vendors",
  "/IEW-2025",
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
  "/who-we-serve",
  "/who-we-serve/Stakeholder",
  "/who-we-serve/IndustryPage",
  "/why-workwise",
  "/why-workwise/TrustSecurity",
  "/why-workwise/our-story",
  "/why-workwise/success-stories",
  "/earn-with-us",
  "/earn-with-us/EarnWithUs",
  "/pricing",
  "/pricing/pilot",
  "/pilot-project",
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
      href: "/dashboard/admin/approval-management",
      label: "PO Approval Hierarchy",
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
      { label: "Stakeholders", href: "/who-we-serve/Stakeholder" },
      { label: "Industries We Serve", href: "/who-we-serve/IndustryPage" },
      { 
        label: "Disciplines We Cover", 
        type: "nested-dropdown",
        options: [
          { label: "Civil", href: "/solutions/civil" },
          { label: "Mechanical", href: "/solutions/mechanical" },
          { label: "Electrical", href: "/solutions/electrical" },
          { label: "Chemical", href: "/solutions/chemical" },
          { label: "Fire Engineering", href: "/solutions/fire-engineering" },
        ]
      },
    ]
  },
  { 
    label: "Why Workwise", 
    type: "dropdown",
    options: [
      { label: "Customer Success Stories", href: "/why-workwise/success-stories" },
      { label: "Trust & Security", href: "/why-workwise/TrustSecurity" },
      { label: "Our Story", href: "/why-workwise/our-story" },
    ]
  },
  { 
    label: "Tools", 
    type: "dropdown",
    options: [
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
      { label: "Blogs", href: "https://blog.letsworkwise.com/", external: true },
      { label: "Events", href: "/insights/events" },
      { label: "Procurement Guide for Project & Purchase Managers", href: "/insights/procurement-guide" },
      { label: "AI in Procurement – Use Cases", href: "/insights/ai-procurement" },
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
      { label: "Buyer Pricing (Success based model)", href: "/pricing", action: "buyer-pricing" },
      { label: "Supplier Plans (Subscription tiers)", href: "/pricing", action: "supplier-pricing" },
              { label: "Claim Pilot Project Access for Free", href: "/pilot-project" },

    ]
  },
];

const Header = () => {
  const router = useRouter();

  const { pathname } = router;
  const { user_registered, loggedin } = router.query;
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
    setPopoverVisible(false);
    setLoggedinUser(null);
    setMainNavs(initialMainNavs);
    router.push("/");
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

  return (
    <>
      <header
        className={`main-header ${sticky} ${menuClass ? "menu-open" : ""} ${(() => {
          const isPrivate = pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor");
          if (isPrivate || (loggedinUser && loggedinUser?.name)) {
            return "always-white"; // never transparent for logged-in areas
          }
          if (pathname === "/") {
            return isScrolled ? "scrolled hero-page" : "transparent hero-page";
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
                  height={41}
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
              pathname?.startsWith("/who-we-serve") ||
              pathname?.startsWith("/why-workwise") ||
              pathname?.startsWith("/earn-with-us") ||
              pathname?.startsWith("/pricing") ||
              pathname?.startsWith("/blogs") ||
              pathname?.startsWith("/for-vendors") ||
              pathname?.startsWith("/contactus") ||
              pathname?.startsWith("/aboutus") ||
               pathname?.startsWith("/ai-tools") ||
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
                        >
                          <Link href="">
                            {" "}
                            <FontAwesomeIcon icon={faUser} />{" "}
                            <span>My Account</span>
                          </Link>
                        </li>
                        <li className="signup" onClick={handleLogout}>
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
                        <li
                          className="login"
                          onClick={() => {
                            handleChange(setOpenAuthModal(true));
                          }}
                        >
                          <Link href="javascript:void(0)">
                            Login
                          </Link>
                        </li>
                        {/* Mobile-only: show For Suppliers instead of Book a Call */}
                        <li className="signup d-block d-md-none">
                          <Link href="/for-vendors" className="btn-supplier" style={{ color: '#000' }}>
                            For Suppliers
                          </Link>
                        </li>
                        <li
                          className="signup book-call d-none d-md-block"
                          onClick={() => {
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
                <div className={`menu-ctrl ${menuClass ? "button-active" : ""}`}>
                  <label
                    htmlFor="menu-toggle"
                    onClick={() => setMenuClass(!menuClass)}
                    className={(!isScrolled && shouldUseTransparent()) ? 'menu-ctrl-transparent' : ''}
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
                      {loggedinUser?.name && !mainNavs.includes(pathname) && (
                        <div className="header-right header-center align-items-center forLoggedIn">
                          <nav className="main-menu">
                            <ul className="d-flex justify-content-start w-100">
                              {roleMenus[currentUserType]
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
                    </nav>
                  </div>
                )}

                <div className="header-right align-items-center forLoggedIn hidemobile">
                  <nav className="main-menu">
                    <ul>
                      <li className="">
                        <Link href="" onClick={handleUserIconClick}>
                          <FontAwesomeIcon icon={faUser} />
                        </Link>
                      </li>
                    </ul>
                  </nav>

                  {popoverVisible && (
                    <div className="popover-account" ref={popoverRef}>
                      <ul className="vertical-links">
                        {roleMenus[currentUserType]
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

        {/* Mobile Menu */}
        {menuClass && (
            mainNavs.includes(pathname) ||
            pathname?.startsWith("/solutions") ||
            pathname?.startsWith("/insights") ||
            pathname?.startsWith("/modules") ||
            pathname?.startsWith("/work-with-us") ||
            pathname?.startsWith("/who-we-serve") ||
            pathname?.startsWith("/why-workwise") ||
            pathname?.startsWith("/earn-with-us") ||
            pathname?.startsWith("/pricing") ||
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
                <li>
                  <Link href="/for-vendors" className="btn-supplier-mobile" style={{ color: '#fff' }}>
                    For Suppliers
                  </Link>
                </li>
                {!loggedinUser && (
                  <>
                    <li className="mobile-login">
                      <Link href="javascript:void(0)" onClick={() => window.open('https://letsworkwise.com/?user_registered=1', '_blank')} style={{ color: '#fff' }}>
                        Login
                      </Link>
                    </li>
                    {/* Hide Book a Call in mobile menu; For Suppliers CTA is present above */}
                  </>
                )}
              </ul>
            </nav>
          </div>
        )}

        {/* Mobile Menu for Logged-in Users */}
        {menuClass && loggedinUser && loggedinUser?.name && (pathname?.startsWith("/dashboard") || pathname?.startsWith("/vendor")) && (
          <div className="mobile-menu">
            <nav className="main-menu">
              <ul>
                {roleMenus[currentUserType]
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

      {/* Sticky Mobile CTA */}
      {!loggedinUser && !pathname?.startsWith("/vendor") && (
        <div className="sticky-mobile-cta">
          <Link href="javascript:void(0)" onClick={() => window.open('https://letsworkwise.com/?user_registered=1', '_blank')}>
            <FontAwesomeIcon icon={faMessage} />
          </Link>
        </div>
      )}



      {/* Auth Modal */}
      <LoginContainer
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        activeAuthTab={activeAuthTab}
        setActiveAuthTab={setActiveAuthTab}
        loading={loading}
        setloading={setloading}
      />
    </>
  );
};

export default Header;