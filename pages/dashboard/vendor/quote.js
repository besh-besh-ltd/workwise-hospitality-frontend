// New send-quote wizard (prototype-driven redesign).
// Mounted at /dashboard/vendor/quote — kept side-by-side with the legacy
// /dashboard/vendor/send-quote route so the product team can A/B compare
// before we delete the old page.
import React from "react";
import Head from "next/head";
import SendQuoteWizard from "@/components/dashboard/vendor/quoteWizard/SendQuoteWizard";

const QuotePage = () => {
  return (
    <>
      <Head>
        <title>Workwise | Send Quote</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;450;500;600;700&display=swap"
        />
      </Head>
      <SendQuoteWizard />
    </>
  );
};

export default QuotePage;
