import React, { useEffect, useState } from "react";
import Header from "./Header";
// import Footer from "./Footer";
import { getCmsData } from "@/services/cms";
import { useDispatch } from "react-redux";
import { setSwSubscription } from "@/redux/slice";
import { SWSubscribe } from "@/services/Auth";
import { useRouter } from "next/router";
import Head from "next/head";
import PushPermissionPrompt from "@/components/shared/PushPermissionPrompt";
// import Footer from "./Footer/newFooter";

const Layout = (props) => {
  const [cmsdata, setCmsdata] = useState([]);
  const [showModal, setshowModal] = useState(false);
  const [fromType, setFromType] = useState();
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .then((registration) => {
        if (typeof window !== "undefined" && Notification.permission === "granted") {
          registration.pushManager
            .getSubscription()
            .then((sub) => sub && dispatch(setSwSubscription(sub)))
            .catch(() => {});
        }
      })
      .catch((err) => console.warn("SW registration failed", err));
  }, [dispatch]);

  /* REMOVED UN-USED CALL TO CMS DATA API */
  // useEffect(() => {
  //   getCmsSections();
  // }, []);

  const getCmsSections = () => {
    getCmsData(0)
      .then((response) => {
        if (response.data.length > 0) {
          setCmsdata(response.data);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const handleContainerClick = (event) => {
    const target = event.target;
    //console.log(target.tagName);
    // Check if the clicked element is a button
    if (
      (target.tagName === "BUTTON" || target.tagName === "A") &&
      target.classList.contains("btn-popup-form")
      // GET Data Value
    ) {
      // console.error("target==>>", event.target.getAttribute("data-value"));
      setFromType(event.target.getAttribute("data-value"));
      event.preventDefault();
      setshowModal(true);
    }
  };


  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    checkLoginStatus();

    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === null) {
        checkLoginStatus();
      }
    };

    const handleLoginEvent = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginStatusChanged', handleLoginEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStatusChanged', handleLoginEvent);
    };
  }, [router]);

  const isStaticPage = router.pathname === '/hotel-vendor' || router.pathname === '/';
  const isVendorCoCPage = router.pathname === '/vendor-coc';
  const isVendorTnCPage = router.pathname === '/vendor-tnc';
  const isVendorRegistrationPage = router.pathname === '/vendor-registration';
  const shouldHideNavbarFooter = isStaticPage || isVendorCoCPage || isVendorTnCPage || isVendorRegistrationPage;

  return (
    <>

    {/*  set canonical tag accros all the pages */}
      <Head>
        <link rel="canonical" href={`https://letsworkwise.com${router.asPath}`} />
      </Head>

      <div className="min-vh-100 d-flex flex-column" onClick={handleContainerClick}>
        {!shouldHideNavbarFooter && <Header />}
        {/* Home-only announcement bar just below navbar */}
        <main className="flex-grow-1 ">{props.children}</main>
        {/* {!shouldHideNavbarFooter && <Footer />} */}
        {isLoggedIn && <PushPermissionPrompt />}
      </div>
    </>
  );
};

export default Layout;
