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
import Loader from "@/components/shared/Loader";
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      {loading && <Loader />}
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
