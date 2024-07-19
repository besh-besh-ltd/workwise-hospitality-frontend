"use client";
import AuthModal from "@/components/modal/AuthModal";
import LoginWithOtherDeviceModal from "@/components/modal/LoginWithOtherDeviceModal";
import {
  LoginService,
  SWSubscribe,
  getUserDetails,
  handleSocialLogin,
} from "@/services/Auth";
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
import { useSelector } from "react-redux";
import { useGoogleLogin } from "@react-oauth/google";

const mainNavs = [
  "/",
  "/aboutus",
  "/contactus",
  "/for-vendors",
  "/for-buyers",
  //"/products",
  "/validate-otp",
  "/forget-password",
  "/privacypolicy",
  "/terms-of-use",
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { type, user_registered, redirect } = router.query;
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState("login");
  const [sticky, setSticky] = useState("");
  const [menuClass, setMenuClass] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const popoverRef = useRef(null);
  const [loggedinUser, setLoggedinUser] = useState(null);
  const [currentUserType, setcurrentUserType] = useState("buyer");
  const [loading, setloading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginWith, setLoginWith] = useState("");

  const handleClose = () => {
    setShowModal(false);
    setLoginWith("");
  };
  const handleOtherDeviceLoginModalOpen = () => {
    setShowModal(true);
  };
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

  useEffect(() => {
    const user = getUserDetails();
    if (user?.name) {
      setLoggedinUser(user);
    } else {
      setLoggedinUser(null);
    }
    setcurrentUserType(storageInstance.getStorage("current-user-type"));

    if (user_registered == 1) {
      toast.success("Now login to get started!");
      handleChange(setActiveAuthTab("login"));
      handleChange(setOpenAuthModal(true));
    }
  }, [router]);

  const handleLogout = (e) => {
    e.preventDefault();
    storageInstance.removeStorege("token");
    //storageInstance.removeStorege("current-user-type");
    setPopoverVisible(false);
    router.push("/");
  };

  const swSubscription = useSelector((data) => data.swSubscription);

  const loginSubmitHandler = (values, isFromOtherModal = false) => {
    setloading(true);
    LoginService(values, isFromOtherModal)
      .then((response) => {
        if (isFromOtherModal) {
          handleClose();
        }
        // subscribe to SW
        SWSubscribe({ subscription: swSubscription, token: response.token })
          .then((res) => {
            console.log("PUSH SENT");
          })
          .catch((err) => {});
        setloading(false);
        toast.success(response.message, {
          position: "top-center",
        });

        let userType = "";
        if (response.user_detail[0].user_type == 2) {
          userType = "buyer";
        } else if (response.user_detail[0].user_type == 3) {
          userType = "vendor";
        } else if (response.user_detail[0].user_type == 4) {
          userType = "other";
        }
        storageInstance.setStorage("current-user-type", userType);

        handleChange(setOpenAuthModal(false));
        if (redirect && redirect != "") {
          router.push(window.atob(redirect));
          return;
        } else {
          if (userType == "buyer") {
            router.push(`/products`);
          } else {
            router.push(`/dashboard/${userType}`);
          }
        }
        //router.push(`/dashboard`);
      })
      .catch((error) => {
        setloading(false);
        if (
          error?.message?.response?.status === 400 &&
          error?.message?.response?.data?.status === 4
        ) {
          toast.error(error?.message?.response?.data?.message, {
            position: "top-center",
          });
          setTimeout(() => {
            handleChange(setOpenAuthModal(false));
          }, 2000);

          setTimeout(() => {
            setLoginWith("email");
            handleOtherDeviceLoginModalOpen();
          }, 1000);
        } else if (error?.message?.response?.data) {
          toast.error(error?.message?.response?.data?.message, {
            position: "top-center",
          });
        }

        if (error?.response?.status === 400) {
        } else {
          toast.error(error?.message, {
            position: "top-center",
          });
        }
      });
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleSocialLogin(
        {
          login_type: "google",
          access_token: tokenResponse.access_token,
        },
        loginWith ? true : false
      )
        .then((response) => {
          if (loginWith === "google") {
            handleClose();
          }
          // subscribe to SW
          SWSubscribe({ subscription: swSubscription, token: response.token })
            .then((res) => {
              console.log("PUSH SENT");
            })
            .catch((err) => {});
          setloading(false);
          toast.success(response.message, {
            position: "top-center",
          });
          console.log(response, "response *");
          console.log(response?.profile?.user_type, "response type *");

          let userType = "";
          if (response?.profile?.user_type == 2) {
            userType = "buyer";
          } else if (response?.profile?.user_type == 3) {
            userType = "vendor";
          }
          storageInstance.setStorage("current-user-type", userType);
          handleChange(setOpenAuthModal(false));
          if (userType == "buyer") {
            router.push(`/products`);
          } else {
            router.push(`/dashboard/${userType}`);
          }
        })
        .catch((error) => {
          setloading(false);
          if (
            error?.message?.response?.status === 400 &&
            error?.message?.response?.data?.status === 4
          ) {
            toast.error(error?.message?.response?.data?.message, {
              position: "top-center",
            });
            setTimeout(() => {
              handleChange(setOpenAuthModal(false));
            }, 2000);

            setTimeout(() => {
              setLoginWith("google");
              handleOtherDeviceLoginModalOpen();
            }, 1000);
          } else if (error?.message?.response?.data) {
            toast.error(error?.message?.response?.data?.message, {
              position: "top-center",
            });
          }
        });
    },
    onError: (error) => {
      setloading(false);
    },
  });

  return (
    <>
      <header
        className={`main-header ${sticky} ${menuClass ? "menu-open" : ""}`}
      >
        <div className="container-fluid">
          <div className="header-container">
            <div className="logo">
              <Link href="/">
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

            {mainNavs.includes(pathname) && (
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
                      <li
                        className={
                          router.pathname == "/for-buyers" ? "active" : ""
                        }
                      >
                        <Link href="/for-buyers">For Buyers</Link>
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
                          router.pathname == "/contactus" ? "active" : ""
                        }
                      >
                        <Link href="/contactus">Contact Us</Link>
                      </li>

                      <li
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
                      </li>
                    </ul>
                  </nav>

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
                            <Link href="/products">Search Vendor</Link>
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
                              router.pathname == "/dashboard/buyer/subscription"
                                ? "active"
                                : ""
                            }
                          >
                            <Link href="/dashboard/buyer/subscription">
                              Subscription
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
                            <Link href="/products">Search Vendor</Link>
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
      <AuthModal
        showModal={openAuthModal}
        closeModal={() => {
          handleChange(setOpenAuthModal(false));
        }}
        activeTab={activeAuthTab}
        setActiveTab={handleChange(setActiveAuthTab)}
        setEmail={setEmail}
        setPassword={setPassword}
        loading={loading}
        setloading={setloading}
        loginSubmitHandler={loginSubmitHandler}
        loginWithGoogle={loginWithGoogle}
      />
      <LoginWithOtherDeviceModal
        show={showModal}
        onHide={handleClose}
        email={email}
        password={password}
        loginSubmitHandler={loginSubmitHandler}
        loginWithGoogle={loginWithGoogle}
        loginWith={loginWith}
      />
    </>
  );
};

export default Header;
