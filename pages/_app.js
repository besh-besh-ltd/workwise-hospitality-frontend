// import '@/styles/globals.css'

// export default function App({ Component, pageProps }) {
//   return <Component {...pageProps} />
// }

import Layout from "../components/layout";
import "bootstrap/dist/css/bootstrap.min.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "@/styles/style.scss";
import "react-toastify/dist/ReactToastify.css";
// import Font Awesome CSS
import "@fortawesome/fontawesome-svg-core/styles.css";

import { config } from "@fortawesome/fontawesome-svg-core";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Loader from "@/components/shared/Loader";
import { ToastContainer } from "react-toastify";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Providers } from "@/redux/provider";
import LogRocket from 'logrocket';
import storageInstance from "@/utils/storageInstance";
import Script from "next/script";
import Head from "next/head";
import * as Sentry from "@sentry/nextjs";


// Tell Font Awesome to skip adding the CSS automatically
// since it's already imported above
config.autoAddCss = false;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isLogRocketInitialized = useRef(false);
  
  useEffect(() => {
  const handleStart = () => setLoading(true);
  const handleComplete = () => {
    setTimeout(() => {
      setLoading(false);
    }, 300);

    // ✅ Freshchat hiding logic here
    if (router?.pathname?.startsWith("/dashboard")) {
      if (window.fcWidget) {
        window.fcWidget.destroy(); // removes widget and script DOM nodes
      }
    } else {
      // If widget is already initialized, show it
      if (window.fcWidget) {
        window.fcWidget.show();
      }
    }
  };

  router.events.on("routeChangeStart", handleStart);
  router.events.on("routeChangeComplete", handleComplete);
  router.events.on("routeChangeError", handleComplete);

  return () => {
    router.events.off("routeChangeStart", handleStart);
    router.events.off("routeChangeComplete", handleComplete);
    router.events.off("routeChangeError", handleComplete);
  };
}, [router]);


  useEffect(() => {

    // initialize log rocket only in prod mode
    if (process.env.NEXT_PUBLIC_ENV === 'production') {
      // Identify user if available
      const userId = storageInstance.getStorage('current-user-name') || 'not_auth_user';
      LogRocket.identify(userId);

      // record user session
      if (!isLogRocketInitialized.current) {
        LogRocket.init(process.env.NEXT_PUBLIC_LOG_ROCKET_KEY, {
          dom: {
            inputSanitizer: true, // Mask input fields
          },
        });
        isLogRocketInitialized.current = true;
      }
    }

    const handleStart = () => setLoading(true);
    const handleComplete = () => {
      setTimeout(() => {
        setLoading(false);
      }, 300);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);


  return (
    <Sentry.ErrorBoundary fallback={<div>Something went wrong</div>}>
      {/* Only load Google tag managerin production */}
      <Head />

      <ToastContainer style={{ zIndex: 10000 }} />
      {loading && <Loader />}
      <Providers>
        <GoogleOAuthProvider clientId="866474332918-fi599o8btdrikvi9ieq7pqksngvh2mlv.apps.googleusercontent.com">
          <Layout>
            {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
              <Script
                id="recaptcha-v3"
                src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
                strategy="afterInteractive"
              />
            )}

            {/* Only load Google Analytics and tag manager script in production */}
            {process.env.NEXT_PUBLIC_ENV == 'production' && (
              <>
                <Script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID}`}
                ></Script>

                <Script id='google-analytics'> {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID}');
                  `}
                </Script>
              </>
            )}

         {/* Load FreshChat only if NOT on dashboard routes */}
         {!router?.pathname?.startsWith("/dashboard") && (
           <Script
             id="freshchat-loader"
             src="//in.fw-cdn.com/32510222/1385154.js"
             strategy="afterInteractive"
             onLoad={() => {
               console.log("FreshChat loaded");
             }}
             data-chat="true"
           />
         )}

            <Component {...pageProps} />

          </Layout>
        </GoogleOAuthProvider>
      </Providers>
    </Sentry.ErrorBoundary>
  );
}
