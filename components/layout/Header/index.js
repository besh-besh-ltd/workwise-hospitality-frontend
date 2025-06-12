"use client";
import { getUserDetails } from "@/services/Auth";
import storageInstance from "@/utils/storageInstance";
import { faBell, faUser } from "@fortawesome/free-regular-svg-icons";
import { faGear, faSignOut } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import LoginContainer from "@/components/AuthContainer/LoginContainer";

const initialMainNavs = [
  "/",
  "/aboutus",
  "/contactus",
  "/for-vendors",
  "/IEW-2025",
  "/solutions",
  // "/blogs",
  "/validate-otp",
  "/forget-password",
  "/privacypolicy",
  "/terms-of-use",
  "/products",
  "/dashboard/vendor/inquiries-details",
  "/dashboard/buyer/rfq-management-vendor/vendor-profile",
  "/newHomePageDesign",
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
  "top-management":  [ // procurment person 
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
      href: "/dashboard/vendor/communication-setting",
      label: "Communication Settings",
      targetMenu: "nav",
    },
  ],
};

const websiteMenu = [
  { href: "/", label: "Home" },
  { href: "/aboutus", label: "About Us" },
  { href: "/vendor/all", label: "Find a Vendor" },
  { href: "/solutions", label: "Our Solutions" },
  { href: "/for-vendors", label: "For Vendor" },
  { href: "/contactus", label: "Contact Us" },
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



  const isSticky = () => {
    const scrollTop = window.scrollY;
    const stickyClass = scrollTop >= 50 ? "sticky" : "";
    handleChange(setSticky(stickyClass));
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
        className={`main-header ${sticky} ${menuClass ? "menu-open" : ""}`}
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
                      : currentUserType === "top-management"
                      ? "/dashboard/top-management"
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
                  className=""
                  width={160}
                  height={41}
                  priority={true}
                />
              </Link>
            </div>
            {/* for Login Users only */}

            {(mainNavs.includes(pathname) ||
              (!loggedinUser &&
                (pathname?.startsWith("/vendor") ||
                  pathname?.startsWith("/solutions")))) && (
              <>
                <div className="header-right align-items-center normalMenu">
                  {/* START: website navbar - static pages content */}
                  <nav className="main-menu">
                    <ul>
                      {websiteMenu.map((item) => (
                        <li
                          key={item.href}
                          className={
                            router.pathname === item.href ? "active" : ""
                          }
                        >
                          <Link href={item.href}>{item.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  {/* END: website navbar - static pages content */}

                  {/* {!loggedinUser && !loggedinUser?.name && ( */}
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

                  {/* )} */}
                  <div
                    className={`menu-ctrl ${menuClass ? "button-active" : ""}`}
                  >
                    <label
                      onClick={() => handleChange(setMenuClass(!menuClass))}
                    >
                      <svg
                        width="100"
                        height="100"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          className="line--1"
                          d="M0 40h62c13 0 6 28-4 18L35 35"
                        />
                        <path className="line--2" d="M0 50h70" />
                        <path
                          className="line--3"
                          d="M0 60h62c13 0 6-28-4-18L35 65"
                        />
                      </svg>
                    </label>
                  </div>
                </div>
              </>
            )}

            {loggedinUser && loggedinUser?.name ? (
              <>
                {!mainNavs.includes(pathname) && (
                  <div className="header-right header-center align-items-center forLoggedIn">
                    <nav className="main-menu">
                      {loggedinUser?.name && !mainNavs.includes(pathname) && (
                        <div className="header-right header-center align-items-center forLoggedIn">
                          <nav className="main-menu">
                            <ul className="d-flex justify-content-center w-100">
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

                    <div className="extra-buttons dashboard-area-buttons hideDesktop">
                      <ul>
                        <li
                          className="login"
                          onClick={() => {
                            router.push(
                              `/dashboard/${currentUserType}/editprofile`
                            );
                          }}
                        >
                          <Link href="">
                            {" "}
                            <FontAwesomeIcon icon={faUser} />{" "}
                            <span>My Profile </span>
                          </Link>
                        </li>
                        <li className="signup" onClick={handleLogout}>
                          <Link href="">
                            <FontAwesomeIcon icon={faSignOut} />{" "}
                            <span>Logout</span>
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div
                      className={`menu-ctrl ${
                        menuClass ? "button-active" : ""
                      }`}
                    >
                      <label
                        onClick={() => handleChange(setMenuClass(!menuClass))}
                      >
                        <svg
                          width="100"
                          height="100"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            className="line--1"
                            d="M0 40h62c13 0 6 28-4 18L35 35"
                          />
                          <path className="line--2" d="M0 50h70" />
                          <path
                            className="line--3"
                            d="M0 60h62c13 0 6-28-4-18L35 65"
                          />
                        </svg>
                      </label>
                    </div>
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
                        <li className="">
                          <Link href="/" onClick={handleLogout}>
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
      </header>

      {/* ------------- Auth Modal ------------- */}
      <LoginContainer
        loading={loading}
        setloading={setloading}
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        activeAuthTab={activeAuthTab}
        setActiveAuthTab={setActiveAuthTab}
      />
    </>
  );
};

export default Header;
