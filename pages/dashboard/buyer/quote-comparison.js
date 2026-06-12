import React from "react";
import Head from "next/head";
import QuoteComparison from "@/components/dashboard/buyer/quoteComparison/QuoteComparison";

const QuoteComparisonPage = () => {
  return (
    <>
      <Head>
        <title>Workwise | Quote Comparison</title>
      </Head>
      <QuoteComparison />
    </>
  );
};

export default QuoteComparisonPage;
