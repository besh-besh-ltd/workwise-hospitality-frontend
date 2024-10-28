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


// Tell Font Awesome to skip adding the CSS automatically
// since it's already imported above
config.autoAddCss = false;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isLogRocketInitialized = useRef(false);

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
    <>
      {/* Only load Google tag managerin production */}
      <Head>
        {process.env.NEXT_PUBLIC_ENV == "production" && (
          <>
            {/* Google Tag Manager Script */}
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID});`,
              }}
            />            
          </>
        )}
      </Head>

      <ToastContainer style={{ zIndex: 10000 }} />
      {loading && <Loader />}
      <Providers>
        <GoogleOAuthProvider clientId="866474332918-fi599o8btdrikvi9ieq7pqksngvh2mlv.apps.googleusercontent.com">
          <Layout>
            {/* Only load Google Analytics and tag manager script in production */}
            {process.env.NEXT_PUBLIC_ENV == 'production' && (
              <>
                {/* <!-- Google Tag Manager (noscript) --> */}
                <noscript>
                  <iframe
                    src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID}`}
                    height="0"
                    width="0"
                    style={{ display: "none", visibility: "hidden" }}
                  ></iframe>
                </noscript>
                {/* <!-- End Google Tag Manager (noscript) --> */}

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

            <Component {...pageProps} />

          </Layout>
        </GoogleOAuthProvider>
      </Providers>
    </>
  );
}
