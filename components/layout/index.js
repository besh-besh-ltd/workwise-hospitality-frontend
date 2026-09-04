import React, { useEffect, useState, useRef } from "react";
import Header from "./Header";
import DashboardShell from "./DashboardShell";
// import Footer from "./Footer";
import { getCmsData } from "@/services/cms";
import { useDispatch } from "react-redux";
import { setSwSubscription, setUserProfile } from "@/redux/slice";
import { SWSubscribe, verifyVendorToken, getProfile } from "@/services/Auth";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast } from "react-toastify";
import GuestAccessModal from "@/components/shared/GuestAccessModal";
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
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestExpiresIn, setGuestExpiresIn] = useState(1800);
  const [tokenExchangeLoading, setTokenExchangeLoading] = useState(false);
  const tokenExchangeAttempted = useRef(false);

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

  // Vendor token → JWT auto-login
  // When a vendor arrives via email link with ?token=... and is not
  // logged in, exchange the token for a short-lived JWT so they get
  // a normal dashboard experience (sidebar, nav, full access).
  useEffect(() => {
    if (tokenExchangeAttempted.current) return;
    const urlToken = router.query.token;
    if (!urlToken) return;

    const existingJwt = localStorage.getItem('token');
    if (existingJwt) return; // Already logged in — skip

    const isDashboardPath = router.pathname?.startsWith('/dashboard');
    if (!isDashboardPath) return; // Only on dashboard routes

    tokenExchangeAttempted.current = true;
    setTokenExchangeLoading(true);

    (async () => {
      try {
        // Axios interceptor unwraps response.data, so res = { status: 1, data: { token, user, ... } }
        const res = await verifyVendorToken(urlToken);
        if (!res || res.status !== 1 || !res.data?.token) {
          toast.error("Invalid or expired access link.");
          router.push("/");
          return;
        }

        const { token: jwt, user, expires_in } = res.data;

        // Store session — same keys as normal login
        localStorage.setItem('token', jwt);
        localStorage.setItem('current-user-type', 'vendor');
        localStorage.setItem('current-user-name', user.name || '');
        localStorage.setItem('current-user-email', user.email || '');
        localStorage.setItem('guest-session', 'true');

        // Fetch full profile and dispatch to Redux — same as normal login.
        // Vendor dashboard and other pages depend on userProfile in Redux.
        try {
          const profileRes = await getProfile();
          dispatch(setUserProfile(profileRes.data));
        } catch (_) {}

        // Trigger login status update
        setIsLoggedIn(true);
        setGuestExpiresIn(expires_in || 1800);
        setShowGuestModal(true);

        // Clean token from URL
        const { token: _removed, ...restQuery } = router.query;
        router.replace(
          { pathname: router.pathname, query: restQuery },
          undefined,
          { shallow: true }
        );
      } catch (err) {
        console.error("Token exchange failed:", err);
        toast.error("Failed to verify access link. Please try logging in.");
        router.push("/");
      } finally {
        setTokenExchangeLoading(false);
      }
    })();
  }, [router.query.token]);

  const isStaticPage = router.pathname === '/';
  const isVendorCoCPage = router.pathname === '/vendor-coc';
  const isVendorTnCPage = router.pathname === '/vendor-tnc';
  const isVendorRegistrationPage = router.pathname === '/vendor-registration';
  const shouldHideNavbarFooter = isStaticPage || isVendorCoCPage || isVendorTnCPage || isVendorRegistrationPage;

  // Use the new global DashboardShell for all logged-in dashboard/vendor routes.
  // Public/marketing pages (and anonymous visits to /vendor/*) continue to use
  // the existing top Header.
  const isDashboardPath =
    router.pathname?.startsWith('/dashboard') || router.pathname?.startsWith('/vendor');
  const isDashboardRoute = isDashboardPath && isLoggedIn;

  return (
    <>

    {/*  set canonical tag accros all the pages */}
      <Head>
        <link rel="canonical" href={`https://letsworkwise.com${router.asPath}`} />
      </Head>

      <div className="min-vh-100 d-flex flex-column" onClick={handleContainerClick}>
        {tokenExchangeLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
            <div className="spinner-border text-primary" role="status" style={{ width: '2rem', height: '2rem', borderWidth: '2.5px' }} />
            <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Verifying access...</span>
          </div>
        ) : shouldHideNavbarFooter ? (
          <main className="flex-grow-1 ">{props.children}</main>
        ) : isDashboardRoute ? (
          <DashboardShell>{props.children}</DashboardShell>
        ) : (
          <>
            <Header />
            <main className="flex-grow-1 ">{props.children}</main>
          </>
        )}
        {/* {!shouldHideNavbarFooter && <Footer />} */}
        {isLoggedIn && <PushPermissionPrompt />}
      </div>

      {showGuestModal && (
        <GuestAccessModal
          expiresIn={guestExpiresIn}
          onDismiss={() => setShowGuestModal(false)}
        />
      )}
    </>
  );
};

export default Layout;
