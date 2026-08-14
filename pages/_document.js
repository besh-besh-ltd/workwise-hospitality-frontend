import { Html, Head, Main, NextScript } from "next/document";
import SiteMeta from "@/components/seo/SiteMeta";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="keywords"
          content="procurement, tender, rfq, buyer, vendor"
        ></meta>
        {/* Link-preview tags. Server-rendered here because _document is the
            only part of the tree that survives the PersistGate gate in
            redux/provider.js — see components/seo/SiteMeta.js. */}
        <SiteMeta />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        ></link>
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&family=Caveat:wght@500;600&display=swap"
          rel="stylesheet"
        ></link>
        {/* Display face for the landing page. Scoped to .lh-page in CSS so it
            never leaks into the dashboard, which stays on Geist. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap"
          rel="stylesheet"
        ></link>
        <link rel="icon" href="/fabicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FAF7F1" />
      </Head>

      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
