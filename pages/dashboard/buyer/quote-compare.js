import React from "react";
import QuoteComparePage from "@/components/dashboard/buyer/quote-compare";
import Head from "next/head";
const QuoteCompare = () => {
    return (
        <>
            <Head>
                <title>Workwise | Quote Compare</title>
            </Head>
            <QuoteComparePage />
        </>
    )
}

export default QuoteCompare;