// import '@/styles/globals.css'

// export default function App({ Component, pageProps }) {
//   return <Component {...pageProps} />
// }

import { initOtel } from '@/lib/otel';
if (typeof window !== 'undefined') {
  initOtel();
}

import ErrorBoundary from "@/components/shared/ErrorBoundary";
import Layout from "../components/layout";
import "bootstrap/dist/css/bootstrap.min.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "@/styles/style.scss";
import "@/styles/utilities.css";
import "@/styles/arc_v2.css";
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
import WizardChat from "../components/shared/WizardChat/WizardChat";


// Tell Font Awesome to skip adding the CSS automatically
// since it's already imported above
config.autoAddCss = false;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  // phase: 'idle' | 'loading' | 'complete'
  const [barPhase, setBarPhase] = useState('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressTimer = null;
    let completeTimer = null;
    let safetyTimer = null;

    const cleanup = () => {
      if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
      if (completeTimer) { clearTimeout(completeTimer); completeTimer = null; }
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    };

    const handleStart = (url, { shallow } = {}) => {
      if (shallow) return;
      cleanup();
      setBarPhase('loading');
      setProgress(15);

      progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
            return 90;
          }
          return Math.min(prev + (prev < 50 ? 8 : prev < 75 ? 4 : 1), 90);
        });
      }, 200);

      safetyTimer = setTimeout(() => {
        cleanup();
        setProgress(100);
        setBarPhase('complete');
      }, 6000);
    };

    const handleComplete = () => {
      cleanup();
      setProgress(100);
      setBarPhase('complete');
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
      cleanup();
    };
  }, [router]);

  // When phase becomes 'complete', wait for the bar to finish animating to 100%, then reset
  useEffect(() => {
    if (barPhase !== 'complete') return;
    const timer = setTimeout(() => {
      setBarPhase('idle');
      setProgress(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [barPhase]);

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

      <ToastContainer
        style={{ zIndex: 2147483646 }}
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        draggable={false}
        pauseOnHover
      />

      {/* YouTube-style top progress bar */}
      <style jsx>{`
        .route-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          height: 3.5px;
          background: linear-gradient(90deg, #2E5BA8, #4a7fd4, #2E5BA8);
          z-index: 99999;
          box-shadow: 0 0 8px rgba(46, 91, 168, 0.5);
          pointer-events: none;
        }
      `}</style>
      <div
        className="route-progress-bar"
        style={{
          width: barPhase === 'idle' ? '0%' : `${progress}%`,
          opacity: barPhase === 'idle' ? 0 : 1,
          transition: barPhase === 'idle' ? 'none' : 'width 0.2s ease, opacity 0.3s ease',
        }}
      />

      <ErrorBoundary>
        <Providers>
          <GoogleOAuthProvider clientId="866474332918-fi599o8btdrikvi9ieq7pqksngvh2mlv.apps.googleusercontent.com">
            <Layout>
              <Component {...pageProps} />

            </Layout>
          </GoogleOAuthProvider>
        </Providers>
        <WizardChat />
      </ErrorBoundary>
    </PostHogProvider>
  );
}
