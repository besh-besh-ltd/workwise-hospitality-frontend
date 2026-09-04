import { Html, Head, Main, NextScript } from "next/document";
import brand from "@/data/ihg/brand";

/**
 * The brand palette is injected here rather than hard-coded in CSS, so
 * data/ihg/brand.js stays the single place a re-brand happens. It overrides
 * the tokens the ported stylesheets set, and is emitted last so it wins.
 */
const paletteVars = `:root{
  --navy:${brand.palette.navy};
  --primary:${brand.palette.primary};
  --primary-2:${brand.palette.primary2};
  --primary-soft:${brand.palette.primarySoft};
  --primary-tint:${brand.palette.primaryTint};
  --gold:${brand.palette.gold};
  --gold-soft:${brand.palette.goldSoft};
  --info:${brand.palette.primary};
  --info-soft:${brand.palette.primarySoft};
  --primary-color:${brand.palette.primary};
}`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content={brand.palette.navy} />
        {/* A client demo has no business being indexed. */}
        <meta name="robots" content="noindex, nofollow" />
        <style dangerouslySetInnerHTML={{ __html: paletteVars }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
