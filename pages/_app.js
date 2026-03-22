// import '@/styles/globals.css'

// export default function App({ Component, pageProps }) {
//   return <Component {...pageProps} />
// }

import { initOtel } from '@/lib/otel';
if (typeof window !== 'undefined') {
  initOtel();
}

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
import { ToastContainer } from "react-toastify";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Providers } from "@/redux/provider";
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import storageInstance from "@/utils/storageInstance";
import { getUserDetails } from "@/services/Auth";
import Head from "next/head";


// Tell Font Awesome to skip adding the CSS automatically
// since it's already imported above
config.autoAddCss = false;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const completeTimerRef = useRef(null);

  const safetyTimerRef = useRef(null);

  useEffect(() => {
    const cleanupAll = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (completeTimerRef.current) { clearTimeout(completeTimerRef.current); completeTimerRef.current = null; }
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
    };

    const handleStart = () => {
      cleanupAll();
      setProgress(15);
      setVisible(true);

      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 90;
          }
          const increment = prev < 50 ? 8 : prev < 75 ? 4 : 1;
          return Math.min(prev + increment, 90);
        });
      }, 200);

      // Safety: auto-complete if routeChangeComplete never fires (e.g., shallow routing)
      safetyTimerRef.current = setTimeout(() => {
        handleComplete();
      }, 5000);
    };

    const handleComplete = () => {
      cleanupAll();
      setProgress(100);
      completeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
      cleanupAll();
    };
  }, [router]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        defaults: '2026-01-30',
      });
      const user = getUserDetails();
      const userType = storageInstance.getStorage('current-user-type');
      const email = storageInstance.getStorage('current-user-email');
      if (user?.sub) {
        posthog.identify(String(user.sub), {
          name: user.name,
          email: email || undefined,
          user_type: userType || undefined,
        });
      }
    }
  }, []);


  return (
    <PostHogProvider client={posthog}>
      <Head />

      <ToastContainer style={{ zIndex: 10000 }} />

      {/* YouTube-style top progress bar */}
      {visible && (
        <>
          <style jsx>{`
            .route-progress-bar {
              position: fixed;
              top: 0;
              left: 0;
              height: 3.5px;
              background: linear-gradient(90deg, #2E5BA8, #4a7fd4, #2E5BA8);
              z-index: 99999;
              transition: width 0.2s ease;
              box-shadow: 0 0 8px rgba(46, 91, 168, 0.5);
            }
          `}</style>
          <div
            className="route-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </>
      )}

      <Providers>
        <GoogleOAuthProvider clientId="866474332918-fi599o8btdrikvi9ieq7pqksngvh2mlv.apps.googleusercontent.com">
          <Layout>
            <Component {...pageProps} />

          </Layout>
        </GoogleOAuthProvider>
      </Providers>
    </PostHogProvider>
  );
}
