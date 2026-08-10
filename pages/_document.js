import { Html, Head, Main, NextScript } from "next/document";

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
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
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
