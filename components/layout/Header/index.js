"use client";
import { getUserDetails } from "@/services/Auth";
import storageInstance from "@/utils/storageInstance";
import { faBell, faUser } from "@fortawesome/free-regular-svg-icons";
import { faGear, faSignOut } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import LoginContainer from "@/components/AuthContainer/LoginContainer";

const initialMainNavs = [
  "/",
  "/aboutus",
  "/contactus",
  "/for-vendors",
  // "/for-buyers",
  "/validate-otp",
  "/forget-password",
  "/privacypolicy",
  "/terms-of-use",
  "/products",
  "/dashboard/vendor/inquiries-details",
  "/dashboard/buyer/rfq-management-vendor/vendor-profile"
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user_registered, loggedin } = router.query;
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
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

  // Set State Change
  const handleChange = (setState) => (event) => {
    setState(event);
  };

  useEffect(() => {
    window.addEventListener("scroll", isSticky);
    if (window.scrollY > 100) {
      isSticky();
    }
    return () => {
      window.removeEventListener("scroll", isSticky);
    };
  }, []);

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
  }

  useEffect(() => {
    setUserDetails();
    if (user_registered == 1) {
      toast.success("Now login to get started!");
      handleChange(setActiveAuthTab("login"));
      handleChange(setOpenAuthModal(true));
    }

    if (localStorage.getItem('token') || loggedin == 'true') {
      let revisedNavs = mainNavs.filter((navItem) =>
        navItem != "/products" &&
        navItem != "/dashboard/vendor/inquiries-details" &&
        navItem != "/dashboard/buyer/rfq-management-vendor/vendor-profile");
      setMainNavs(revisedNavs);
    }
    else {
      let revisedNavs = mainNavs.filter((navItem) => (navItem != "/products" || navItem != "/dashboard/vendor/inquiries-details"));
      if (pathname === '/products') {
        revisedNavs.push('/products');
      }
      else if (pathname.includes("/dashboard/vendor/inquiries-details")) {
        revisedNavs.push("/dashboard/vendor/inquiries-details");
      }
      setMainNavs(revisedNavs)
    }

  }, [router]);


  const handleLogout = (e) => {
    e.preventDefault();
    storageInstance.removeStorege("token");
    storageInstance.removeStorege("current-user-type");
    setPopoverVisible(false);
    setLoggedinUser(null);
    setMainNavs(initialMainNavs);
    router.push("/");
  };

  return (
    <>
      <header
        className={`main-header ${sticky} ${menuClass ? "menu-open" : ""}`}
      >
        <div className="container-fluid">
          <div className="header-container">
            <div className="logo">
              <Link href={loggedinUser ? currentUserType === "vendor" ? "/dashboard/vendor" : "/dashboard/buyer" : "/"}>
                <Image
                  src="/assets/images/logo.png"
                  alt="Workwise"
                  width={160}
                  height={41}
                  priority={true}
                />
              </Link>
            </div>
            {/* for Login Users only */}

            {(mainNavs.includes(pathname) || (!loggedinUser && pathname?.startsWith("/vendor"))) && (
              <>
                <div className="header-right align-items-center normalMenu">
                  <nav className="main-menu">
                    <ul>
                      <li
                        className={router.pathname == "/home" ? "active" : ""}
                      >
                        <Link href="/">Home</Link>
                      </li>
                      <li
                        className={
                          router.pathname == "/for-vendors" ? "active" : ""
                        }
                      >
                        <Link href="/for-vendors">For Vendors</Link>
                      </li>
                      <li
                        className={
                          router.pathname == "/aboutus" ? "active" : ""
                        }
                      >
                        <Link href="/aboutus">About Us</Link>
                      </li>
                      {/* <li
												className={
													router.pathname == "/products" ? "active" : ""
												}
											>
												<Link href="/products">Products</Link>
											</li> */}
                      {/* <li
                        className={
                          router.pathname == "/for-buyers" ? "active" : ""
                        }
                      >
                        <Link href="/for-buyers">For Buyers</Link>
                      </li>
 */}
                      {/* <li
                        className={
                          router.pathname == "/for-buyers" ? "active" : ""
                        }
                      >
                        <Link href="/for-buyers">For Buyers</Link>
                      </li> */}
                      <li
                        className={
                          router.pathname == "/contactus" ? "active" : ""
                        }
                      >
                        <Link href="/contactus">Contact Us</Link>
                      </li>

                      {/* <li
                        className={
                          router.pathname == "/login" ? "active login" : "login"
                        }
                      >
                        <Link href="/login">Login</Link>
                      </li>
                      <li
                        className={
                          router.pathname == "/register"
                            ? "active signup"
                            : "signup"
                        }
                      >
                        <Link href="/register">Register</Link>
                      </li> */}
                    </ul>
                  </nav>

                  {/* {!loggedinUser && !loggedinUser?.name && ( */}
                  <div
                    className={`extra-buttons hideDesktop ${loggedinUser && loggedinUser?.name && "hasloggedinuser"
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
                            handleChange(setActiveAuthTab("login"));
                            handleChange(setOpenAuthModal(true));
                          }}
                        >
                          <Link href="javascript:void(0)">
                            {" "}
                            <FontAwesomeIcon icon={faUser} /> <span>Login</span>
                          </Link>
                        </li>
                        <li
                          className="signup"
                          onClick={() => {
                            handleChange(setActiveAuthTab("register"));
                            handleChange(setOpenAuthModal(true));
                          }}
                        >
                          <Link href="javascript:void(0)">
                            <FontAwesomeIcon icon={faGear} />{" "}
                            <span>Register</span>
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
                      {currentUserType == "vendor" && (
                        <ul>
                          <li
                            className={
                              router.pathname ==
                                "/dashboard/vendor/product-management"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/vendor/product-management">
                              Product management
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/vendor/product-review"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/vendor/product-review">
                              Product Review
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/vendor/inquiries-received"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/vendor/inquiries-received">
                              Received inquiries
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/vendor/reviews-ratings"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/vendor/reviews-ratings">
                              Reviews & Ratings
                            </Link>
                          </li>
                          <li
                            className={
                              router.pathname == "/change-password"
                                ? "active hideDesktopItem"
                                : "hideDesktopItem"
                            }
                          >
                            <Link
                              href={`/change-password?redirect_url=${window.location.pathname}`}
                              onClick={() => setPopoverVisible(false)}
                            >
                              Change Password
                            </Link>
                          </li>
                        </ul>
                      )}
                      {currentUserType == "buyer" && (
                        <ul>
                          <li
                            className={
                              router.pathname == "/dashboard/buyer"
                                ? "active hideDesktopItemr"
                                : "hideDesktopItemr"
                            }
                          >
                            <Link href="/dashboard/buyer">Dashboard</Link>
                          </li>
                          <li
                            className={
                              router.pathname == "/products" ? "active " : ""
                            }
                          >
                            <Link href="/vendor/all">Search Vendor</Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/buyer/rfq-management"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/buyer/rfq-management">
                              RFQ management
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/buyer/quote-compare"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/buyer/quote-compare">
                              Compare received quotes
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname == "/dashboard/buyer/technical-evaluation"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/buyer/technical-evaluation">
                              Technical Evaluation
                            </Link>
                          </li>

                          {/* <li
														className={
															router.pathname ==
															"/dashboard/buyer/reviews-ratings"
																? "active"
																: ""
														}
													>
														<Link href="/dashboard/buyer/reviews-ratings">
															Reviews & Ratings r
														</Link>
													</li> */}
                          <li
                            className={
                              router.pathname == "/change-password"
                                ? "active hideDesktopItem"
                                : "hideDesktopItem"
                            }
                          >
                            <Link
                              href={`/change-password?redirect_url=${window.location.pathname}`}
                              onClick={() => setPopoverVisible(false)}
                            >
                              Change Password
                            </Link>
                          </li>
                        </ul>
                      )}
                      {currentUserType == "other" && (
                        <ul>
                          <li
                            className={
                              router.pathname == "/dashboard/buyer"
                                ? "active hideDesktopItem"
                                : "hideDesktopItem"
                            }
                          >
                            <Link href="/dashboard/buyer">Dashboard</Link>
                          </li>

                          <li
                            className={
                              router.pathname == "/products" ? "active " : ""
                            }
                          >
                            <Link href="/vendor/all">Search Vendor</Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/other/rfq-management"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/other/rfq-management">
                              RFQ management
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/other/quote-compare"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/other/quote-compare">
                              Compare received quotes
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/other/product-management"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/other/product-management">
                              Product Management
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/other/product-review"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/other/product-review">
                              Product Review
                            </Link>
                          </li>
                          <li
                            className={
                              router.pathname ==
                                "/dashboard/other/inquiries-received"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/other/inquiries-received">
                              Received inquiries
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname ==
                                "/dashboard/other/reviews-ratings"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/other/reviews-ratings">
                              Reviews & Ratings
                            </Link>
                          </li>

                          <li
                            className={
                              router.pathname == "/change-password"
                                ? "active hideDesktopItem"
                                : "hideDesktopItem"
                            }
                          >
                            <Link
                              href={`/change-password?redirect_url=${window.location.pathname}`}
                              onClick={() => setPopoverVisible(false)}
                            >
                              Change Password
                            </Link>
                          </li>
                        </ul>
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
                            <span>My Profile</span>
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
                      className={`menu-ctrl ${menuClass ? "button-active" : ""
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
                    {currentUserType == "vendor" && (
                      <ul>
                        {/* <li className={router.pathname == "#" ? "active" : ""}>
													<Link href="#">
														<FontAwesomeIcon icon={faBell} />
													</Link>
												</li> */}
                        <li
                          className={
                            router.pathname ==
                              "/dashboard/vendor/communication-setting"
                              ? "active"
                              : ""
                          }
                        >
                          <Link href="/dashboard/vendor/communication-setting">
                            <FontAwesomeIcon icon={faGear} />
                          </Link>
                        </li>
                        <li className="">
                          <Link href="" onClick={handleUserIconClick}>
                            <FontAwesomeIcon icon={faUser} />
                          </Link>
                        </li>
                      </ul>
                    )}
                    {currentUserType == "buyer" && (
                      <ul>
                        {/* <li className={router.pathname == "#" ? "active" : ""}>
													<Link href="#">
														<FontAwesomeIcon icon={faBell} />
													</Link>
												</li> */}
                        {/* <li
													className={
														router.pathname ==
														"/dashboard/buyer/communication-setting"
															? "active"
															: ""
													}
												>
													<Link href="/dashboard/buyer/communication-setting">
														<FontAwesomeIcon icon={faGear} />
													</Link>
												</li> */}
                        <li className="">
                          <Link href="" onClick={handleUserIconClick}>
                            <FontAwesomeIcon icon={faUser} />
                          </Link>
                        </li>
                      </ul>
                    )}
                    {currentUserType == "other" && (
                      <ul>
                        {/* <li className={router.pathname == "#" ? "active" : ""}>
													<Link href="#">
														<FontAwesomeIcon icon={faBell} />
													</Link>
												</li> */}
                        <li
                          className={
                            router.pathname ==
                              "/dashboard/other/communication-setting"
                              ? "active"
                              : ""
                          }
                        >
                          <Link href="/dashboard/other/communication-setting">
                            <FontAwesomeIcon icon={faGear} />
                          </Link>
                        </li>
                        <li className="">
                          <Link href="" onClick={handleUserIconClick}>
                            <FontAwesomeIcon icon={faUser} />
                          </Link>
                        </li>
                      </ul>
                    )}
                  </nav>
                  {popoverVisible && (
                    <div className="popover-account" ref={popoverRef}>
                      <ul className="vertical-links">
                        <li
                          className={
                            router.pathname == `/dashboard/${currentUserType}`
                              ? "active"
                              : ""
                          }
                        >
                          <Link
                            href={`/dashboard/${currentUserType}`}
                            onClick={() => setPopoverVisible(false)}
                          >
                            My Account
                          </Link>
                        </li>
                        <li
                          className={
                            router.pathname ==
                              `/dashboard/${currentUserType}/editprofile`
                              ? "active"
                              : ""
                          }
                        >
                          <Link
                            href={`/dashboard/${currentUserType}/editprofile`}
                            onClick={() => setPopoverVisible(false)}
                          >
                            Edit Profile
                          </Link>
                        </li>
                        {currentUserType === "other" && (
                          <li
                            className={
                              router.pathname ==
                                `/dashboard/${currentUserType}/subscription`
                                ? "active"
                                : ""
                            }
                          >
                            <Link
                              href={`/dashboard/${currentUserType}/subscription`}
                              onClick={() => setPopoverVisible(false)}
                            >
                              Subscription
                            </Link>
                          </li>
                        )}
                        {currentUserType == "vendor" && (
                          <li
                            className={
                              router.pathname ==
                                `/dashboard/${currentUserType}/product-management`
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/vendor/product-management">
                              Product Management
                            </Link>
                          </li>
                        )}
                        {currentUserType == "buyer" && (
                          <>                            
                            <li
                              className={
                                router.pathname ==
                                  `/dashboard/${currentUserType}/rfq-report`
                                  ? "active"
                                  : ""
                              }
                            >
                              <Link href="/dashboard/buyer/rfq-report">
                                RFQ Report
                              </Link>
                            </li>

                            <li
                              className={
                                router.pathname ==
                                  `/dashboard/${currentUserType}/vendor-management`
                                  ? "active"
                                  : ""
                              }
                            >
                              <Link href="/dashboard/buyer/vendor-management">
                                Vendor Management
                              </Link>
                            </li>
                            <li
                              className={
                                router.pathname ==
                                  `/dashboard/${currentUserType}/project-management`
                                  ? "active"
                                  : ""
                              }
                            >
                              <Link href="/dashboard/buyer/project-management">
                                Project Management
                              </Link>
                            </li>
                          </>
                        )}
                        {/* <li className="">
													<Link href="/#">Messages</Link>
												</li> */}
                        {/* <li className="">
													<Link href="/#">Notifications</Link>
												</li> */}
                        {/* <li className="">
													<Link href="/#">Settings</Link>
												</li> */}
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
                        <li
                          className={
                            router.pathname == "/change-password"
                              ? "active"
                              : ""
                          }
                        >
                          <Link
                            href={`/dashboard/buyer/subscription`}
                            onClick={() => setPopoverVisible(false)}
                          >
                            Subscription
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